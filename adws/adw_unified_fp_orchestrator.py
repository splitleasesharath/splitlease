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

from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest
from adw_modules.run_logger import create_run_logger, RunLogger
from adw_modules.dev_server import DevServerManager
from adw_modules.visual_regression import check_visual_parity
from adw_modules.page_classifier import (
    ALL_PAGES,
    get_page_info,
    get_mcp_sessions_for_page,
)
from adw_modules.concurrent_parity import (
    create_parity_check_plan,
    get_capture_config,
    LIVE_BASE_URL,
    DEV_BASE_URL,
)
from adw_modules.chunk_parser import extract_page_groups, ChunkData
from adw_code_audit import run_code_audit_and_plan


def implement_chunks_with_gemini(chunks: List[ChunkData], working_dir: Path, logger: RunLogger) -> bool:
    """Implement all chunks in a group using Gemini Flash."""
    for chunk in chunks:
        logger.step(f"Implementing chunk {chunk.number}: {chunk.title}")

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
        agent_dir = working_dir / "adws" / "agents" / "implementation" / f"chunk_{chunk.number}"
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
            logger.log(f"    [FAIL] Chunk {chunk.number} implementation failed")
            return False

    return True


def get_concurrent_mcp_sessions(page_path: str) -> tuple:
    """
    Get MCP session pair for concurrent LIVE vs DEV comparison.

    Returns:
        Tuple of (live_session, dev_session) - None for public pages
    """
    return get_mcp_sessions_for_page(page_path)


def main():
    parser = argparse.ArgumentParser(description="ADW Unified FP Refactor Orchestrator")
    parser.add_argument("target_path", help="Path to audit (e.g., app/src/logic)")
    parser.add_argument("--limit", type=int, help="Limit number of page groups to process")
    parser.add_argument("--audit-type", default="general", help="Type of audit (default: general)")

    args = parser.parse_args()

    # CRITICAL: working_dir must be the PROJECT ROOT (Split Lease - Dev), not adws/
    # This allows Gemini agent to access files in app/, Documentation/, etc.
    script_dir = Path(__file__).parent.resolve()
    working_dir = script_dir.parent  # Project root: Split Lease - Dev

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    logger = create_run_logger("unified_fp_refactor", timestamp, working_dir)

    # Track success for final notification
    run_success = False
    dev_server = None

    try:
        # PHASE 1: AUDIT (Claude Opus)
        logger.phase_start("PHASE 1: CODE AUDIT (Claude Opus)")
        logger.step(f"Target: {args.target_path}")
        logger.step(f"Audit type: {args.audit_type}")

        plan_file_relative = run_code_audit_and_plan(args.target_path, args.audit_type, working_dir)
        plan_file = working_dir / plan_file_relative

        if not plan_file.exists():
            logger.phase_complete("PHASE 1: CODE AUDIT", success=False, error="Plan file not created")
            sys.exit(1)

        logger.step(f"Plan created: {plan_file_relative}")
        logger.phase_complete("PHASE 1: CODE AUDIT", success=True)

        # PHASE 2: PARSE PLAN
        logger.phase_start("PHASE 2: PARSING PLAN")

        page_groups = extract_page_groups(plan_file)
        logger.step(f"Found {len(page_groups)} page groups")

        for page_path, chunks in page_groups.items():
            logger.step(f"  {page_path}: {len(chunks)} chunks", notify=False)

        logger.phase_complete("PHASE 2: PARSING PLAN", success=True)

        # PHASE 3: SETUP DEV SERVER
        logger.phase_start("PHASE 3: SETTING UP DEV SERVER")

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
        logger.phase_complete("PHASE 3: DEV SERVER SETUP", success=True)

        # PHASE 4: PROCESS PAGE GROUPS
        logger.phase_start("PHASE 4: IMPLEMENTING & TESTING PAGE GROUPS")

        stats = {"passed": 0, "failed": 0, "total": len(page_groups)}
        count = 0

        for page_path, chunks in page_groups.items():
            if args.limit and count >= args.limit:
                logger.step(f"Limit reached ({args.limit} groups)")
                break

            chunk_ids = ", ".join([str(c.number) for c in chunks])
            logger.step(f"Processing {page_path} (chunks: {chunk_ids})", notify=True)

            # 4a. Implement chunks (Gemini Flash)
            success = implement_chunks_with_gemini(chunks, working_dir, logger)
            if not success:
                logger.log(f"  [FAIL] Implementation failed, resetting...")
                subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
                stats["failed"] += 1
                count += 1
                logger.phase_complete(f"Page {page_path}", success=False, error="Implementation failed")
                continue

            # 4b. Start dev server
            logger.step("Starting dev server...")
            try:
                port, base_url = dev_server.start()
            except Exception as e:
                logger.log(f"  [FAIL] Dev server failed: {e}")
                subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
                stats["failed"] += 1
                count += 1
                logger.phase_complete(f"Page {page_path}", success=False, error=f"Dev server: {e}")
                continue

            try:
                # 4c. Visual regression check (concurrent LIVE vs DEV)
                mcp_live, mcp_dev = get_concurrent_mcp_sessions(page_path)
                page_info = get_page_info(page_path)
                auth_type = page_info.auth_type if page_info else "public"

                logger.step(f"Visual check: LIVE({mcp_live or 'public'}) vs DEV({mcp_dev or 'public'})")

                # For concurrent comparison, we use both sessions
                # The visual_regression module handles the parallel capture
                visual_result = check_visual_parity(
                    page_path=page_path,
                    mcp_session=mcp_live,  # Primary session for LIVE
                    mcp_session_dev=mcp_dev,  # Secondary session for DEV
                    auth_type=auth_type,
                    port=port,
                    concurrent=True  # Enable concurrent capture
                )

                # 4d. Commit or reset
                if visual_result.get("visualParity") == "PASS":
                    logger.log(f"  [PASS] Visual parity OK")
                    commit_msg = f"refactor({page_path}): Implement chunks {chunk_ids}\n\n{visual_result.get('explanation', '')}"

                    subprocess.run(["git", "add", "."], cwd=working_dir, check=False)
                    subprocess.run(["git", "commit", "-m", commit_msg], cwd=working_dir, check=False)

                    stats["passed"] += 1
                    logger.phase_complete(f"Page {page_path}", success=True)
                else:
                    issues = visual_result.get('issues', ['Unknown'])
                    logger.log(f"  [FAIL] Visual parity failed: {', '.join(issues)}")
                    subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir, check=False)
                    stats["failed"] += 1
                    logger.phase_complete(f"Page {page_path}", success=False, error=issues[0][:50])
            finally:
                dev_server.stop()

            count += 1

        # PHASE 5: SUMMARY
        logger.summary(
            total_page_groups=stats['total'],
            passed=stats['passed'],
            failed=stats['failed'],
            limited_to=args.limit or "all"
        )

        run_success = stats['failed'] == 0 and stats['passed'] > 0

    except Exception as e:
        logger.error(e, context="Orchestrator crashed")
        sys.exit(1)
    finally:
        if dev_server and dev_server.is_running():
            dev_server.stop()
        logger.finalize(success=run_success)


if __name__ == "__main__":
    main()
