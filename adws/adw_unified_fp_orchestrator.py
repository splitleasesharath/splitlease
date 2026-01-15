#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "psutil>=5.9.0", "google-genai"]
# ///

"""
ADW Unified FP Refactor Orchestrator - Complete Pipeline

Consolidates:
- Code audit with Claude Opus
- Page-grouped chunk implementation with Gemini Flash
- Visual regression testing with Playwright MCP
- Automated commit/reset based on test results

Workflow:
1. AUDIT: Claude Opus audits directory and creates chunk plan grouped by page
2. FOR EACH PAGE GROUP:
   a. Gemini Flash implements all chunks for that page
   b. Dev server restarts on port 8010
   c. Visual regression check (LIVE vs DEV with Playwright MCP)
   d. PASS -> git commit, FAIL -> git reset
   e. Continue to next page group

Usage:
    uv run adw_unified_fp_orchestrator.py <target_path> [--limit N] [--audit-type TYPE]

Example:
    uv run adw_unified_fp_orchestrator.py app/src/logic --limit 1
    uv run adw_unified_fp_orchestrator.py app/src/logic --audit-type performance
"""

import sys
import argparse
import subprocess
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Optional

# Add adws to path
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.webhook import notify_success, notify_failure
from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest
from adw_modules.run_logger import create_run_logger
from adw_modules.dev_server import DevServerManager
from adw_modules.visual_regression import check_visual_parity
from adw_modules.page_classifier import classify_page, HOST_PAGES, GUEST_PAGES, SHARED_PROTECTED_PAGES
from adw_modules.chunk_parser import extract_page_groups, ChunkData
from adw_code_audit import run_code_audit_and_plan


def implement_chunks_with_gemini(chunks: List[ChunkData], working_dir: Path) -> bool:
    """Implement all chunks in a group using Gemini Flash."""
    for chunk in chunks:
        print(f"  [Implement] Chunk {chunk.number}: {chunk.title}")

        prompt = f"""Implement ONLY chunk {chunk.number} from the refactoring plan.

**Chunk Details:**
- File: {chunk.file_path}
- Line: {chunk.line_number}
- Title: {chunk.title}

**Current Code:**
```javascript
{chunk.current_code}
```

**Refactored Code:**
```javascript
{chunk.refactored_code}
```

**Instructions:**
1. Read the file: {chunk.file_path}
2. Locate the current code.
3. Replace it with the refactored code EXACTLY as shown.
4. Verify the change matches the refactored code.
5. Do NOT commit.
"""
        agent_dir = working_dir / "agents" / "implementation" / f"chunk_{chunk.number}"
        agent_dir.mkdir(parents=True, exist_ok=True)
        output_file = agent_dir / "raw_output.jsonl"

        request = AgentPromptRequest(
            prompt=prompt,
            adw_id=f"refactor_chunk_{chunk.number}",
            agent_name="gemini_implementor",
            model="sonnet",  # Maps to gemini-3-flash-preview via GEMINI_BASE_MODEL
            output_file=str(output_file),
            working_dir=str(working_dir),
            dangerously_skip_permissions=True
        )

        response = prompt_claude_code(request)
        if not response.success:
            print(f"    Error: Implementation failed for chunk {chunk.number}")
            return False

    return True


def get_mcp_session_for_page(page_path: str) -> Optional[str]:
    """Determine MCP session for a page path."""
    if page_path in HOST_PAGES:
        return "playwright-host"
    if page_path in GUEST_PAGES:
        return "playwright-guest"
    if page_path in SHARED_PROTECTED_PAGES:
        return "playwright-host"
    return None


def main():
    parser = argparse.ArgumentParser(description="ADW Unified FP Refactor Orchestrator")
    parser.add_argument("target_path", help="Path to audit (e.g., app/src/logic)")
    parser.add_argument("--limit", type=int, help="Limit number of page groups to process")
    parser.add_argument("--audit-type", default="general", help="Type of audit (default: general)")

    args = parser.parse_args()

    # CRITICAL: working_dir must be the PROJECT ROOT (Split Lease - Dev), not adws/
    # This allows Gemini agent to access files in app/, Documentation/, etc.
    # The orchestrator script is in adws/, so we go up one level.
    script_dir = Path(__file__).parent.resolve()
    working_dir = script_dir.parent  # Project root: Split Lease - Dev

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    logger = create_run_logger("unified_fp_refactor", timestamp, working_dir)

    try:
        # PHASE 1: AUDIT (Claude Opus)
        print(f"\n{'='*60}")
        print("PHASE 1: CODE AUDIT (Claude Opus)")
        print(f"{'='*60}")

        plan_file_relative = run_code_audit_and_plan(args.target_path, args.audit_type, working_dir)
        plan_file = working_dir / plan_file_relative

        if not plan_file.exists():
            print(f"Error: Plan file not found at {plan_file}")
            sys.exit(1)

        print(f"Plan created: {plan_file_relative}")

        # PHASE 2: PARSE PLAN
        print(f"\n{'='*60}")
        print("PHASE 2: PARSING PLAN")
        print(f"{'='*60}")

        page_groups = extract_page_groups(plan_file)
        print(f"Found {len(page_groups)} page groups")

        for page_path, chunks in page_groups.items():
            print(f"  - {page_path}: {len(chunks)} chunks")

        # PHASE 3: SETUP DEV SERVER
        print(f"\n{'='*60}")
        print("PHASE 3: SETTING UP DEV SERVER")
        print(f"{'='*60}")

        # Robust app_dir detection
        if (working_dir / "app").exists():
            app_dir = working_dir / "app"
        elif (working_dir.parent / "app").exists():
            app_dir = working_dir.parent / "app"
        else:
            app_dir = working_dir

        dev_logger = logging.getLogger("dev_server")
        dev_logger.setLevel(logging.INFO)
        if not dev_logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
            dev_logger.addHandler(handler)

        dev_server = DevServerManager(app_dir, dev_logger)

        # PHASE 4: PROCESS PAGE GROUPS
        print(f"\n{'='*60}")
        print("PHASE 4: IMPLEMENTING & TESTING PAGE GROUPS")
        print(f"{'='*60}")

        stats = {"passed": 0, "failed": 0, "total": len(page_groups)}
        count = 0

        for page_path, chunks in page_groups.items():
            if args.limit and count >= args.limit:
                break

            print(f"\n{'='*60}")
            print(f"PAGE GROUP {count+1}/{stats['total']}: {page_path}")
            print(f"Chunks: {len(chunks)}")
            print(f"{'='*60}")

            # 4a. Implement chunks (Gemini Flash)
            success = implement_chunks_with_gemini(chunks, working_dir)
            if not success:
                print("  [FAIL] Implementation failed, resetting...")
                subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
                stats["failed"] += 1
                count += 1

                # Notify failure via webhook
                chunk_ids = ", ".join([str(c.number) for c in chunks])
                notify_failure(
                    step=f"Implementation failed on {page_path}",
                    error=f"Chunks {chunk_ids} failed during Gemini implementation"
                )
                continue

            # 4b. Start dev server
            print("  Starting dev server on port 8010...")
            try:
                port, base_url = dev_server.start()
            except Exception as e:
                print(f"  [FAIL] Dev server failed: {e}")
                subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
                stats["failed"] += 1
                count += 1

                notify_failure(
                    step=f"Dev server failed for {page_path}",
                    error=str(e)
                )
                continue

            try:
                # 4c. Visual regression check
                mcp_session = get_mcp_session_for_page(page_path)
                auth_type = "protected" if mcp_session else "public"

                print(f"  Running visual check...")
                print(f"    MCP Session: {mcp_session or 'public'}")
                print(f"    Auth Type: {auth_type}")

                visual_result = check_visual_parity(
                    page_path=page_path,
                    mcp_session=mcp_session,
                    auth_type=auth_type,
                    port=port
                )

                # 4d. Commit or reset
                if visual_result.get("visualParity") == "PASS":
                    print(f"  [PASS] Visual parity check passed!")
                    chunk_ids = ", ".join([str(c.number) for c in chunks])
                    commit_msg = f"refactor({page_path}): Implement chunks {chunk_ids}\n\n{visual_result.get('explanation', '')}"

                    # Stage all changes
                    subprocess.run(["git", "add", "."], cwd=working_dir, check=False)
                    subprocess.run(["git", "commit", "-m", commit_msg], cwd=working_dir, check=False)

                    stats["passed"] += 1

                    notify_success(
                        step=f"Refactored {page_path}",
                        details=f"Implemented chunks: {chunk_ids}"
                    )
                else:
                    print(f"  [FAIL] Visual parity check failed")
                    if visual_result.get('issues'):
                        print(f"    Issues: {', '.join(visual_result.get('issues'))}")

                    subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
                    stats["failed"] += 1

                    notify_failure(
                        step=f"Visual regression on {page_path}",
                        error=", ".join(visual_result.get('issues', []))
                    )
            finally:
                dev_server.stop()

            count += 1

        # PHASE 5: SUMMARY
        print(f"\n{'='*60}")
        print("ORCHESTRATION COMPLETE")
        print(f"{'='*60}")
        print(f"Total page groups: {stats['total']}")
        print(f"Passed: {stats['passed']}")
        print(f"Failed: {stats['failed']}")

        if args.limit:
            print(f"(Limited to {args.limit} page groups)")

    except Exception as e:
        print(f"\nOrchestrator crashed: {e}")
        import traceback
        traceback.print_exc()
        notify_failure(step="Unified FP Refactor Orchestrator crashed", error=str(e))
        sys.exit(1)
    finally:
        if dev_server.is_running():
            dev_server.stop()
        logger.finalize()


if __name__ == "__main__":
    main()
