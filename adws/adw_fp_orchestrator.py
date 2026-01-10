#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW FP Orchestrator - Full FP Refactoring Workflow Automation

Orchestrates the complete FP refactoring process:
1. Run FP audit (adw_fp_audit.py)
2. For each chunk in the plan:
   a. Implement the chunk (adw_fp_implement.py with chunk filter)
   b. Validate with browser (adw_claude_browser.py)
   c. If validation passes → git commit
   d. If validation fails → git reset --hard, skip to next chunk
3. Send status updates to SHARATHPLAYGROUND webhook

Usage: uv run adw_fp_orchestrator.py [target_path] [--severity high|medium|all]

Example:
    uv run adw_fp_orchestrator.py app/src/logic --severity high
"""

import sys
import argparse
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass
from datetime import datetime

# Add adws to path
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.webhook import (
    notify_started,
    notify_in_progress,
    notify_success,
    notify_failure,
    notify_rollback
)
from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest


@dataclass
class ChunkData:
    """Represents a single refactoring chunk."""
    number: int
    title: str
    file_path: str
    line_number: Optional[str]  # Can be "123" or "123-456"
    current_code: str
    refactored_code: str
    testing_steps: List[str]
    raw_content: str  # Full chunk markdown for reference


@dataclass
class OrchestratorState:
    """Tracks orchestrator progress."""
    plan_file: Path
    total_chunks: int
    completed_chunks: int = 0
    failed_chunks: int = 0
    skipped_chunks: int = 0
    current_chunk: Optional[int] = None


def extract_chunks_from_plan(plan_file: Path) -> List[ChunkData]:
    """Extract individual chunks from the refactoring plan.

    Args:
        plan_file: Path to the markdown plan file

    Returns:
        List of ChunkData objects, one per chunk

    # TODO(human): Implement chunk extraction logic
    # The plan file has chunks separated by `---` horizontal rules.
    # Each chunk has:
    # - Header: `## 🔴 CHUNK N: [title]`
    # - File path: `**File:** path/to/file.js`
    # - Line number: `**Line:** 123` or `**Lines:** 123-456`
    # - Current code: ```javascript ... ```
    # - Refactored code: ```javascript ... ```
    # - Testing: - [ ] checkboxes
    #
    # Consider:
    # - Should we skip chunks with all checkboxes marked `[x]`?
    # - Should we validate chunk structure before returning?
    # - How to handle malformed chunks?
    """
    pass


def run_audit_phase(target_path: str, severity: str, working_dir: Path) -> Path:
    """Run FP audit and generate plan.

    Args:
        target_path: Path to audit
        severity: Severity filter
        working_dir: Working directory

    Returns:
        Path to generated plan file
    """
    notify_started(
        step="FP Audit",
        details=f"Auditing {target_path} for {severity} severity violations"
    )

    print(f"\n{'='*60}")
    print("PHASE 1: FP AUDIT")
    print(f"{'='*60}")

    # Import and run adw_fp_audit logic
    from adw_fp_audit import run_fp_audit_and_plan

    try:
        plan_file = run_fp_audit_and_plan(target_path, severity, working_dir)

        notify_success(
            step="FP Audit",
            details=f"Plan generated: {plan_file}",
            metadata={"target": target_path, "severity": severity}
        )

        return working_dir / plan_file

    except Exception as e:
        notify_failure(
            step="FP Audit",
            error=str(e),
            details=f"Failed to generate plan for {target_path}"
        )
        raise


def implement_chunk(chunk: ChunkData, plan_file: Path, working_dir: Path) -> bool:
    """Implement a single refactoring chunk using Claude Code.

    Args:
        chunk: Chunk to implement
        plan_file: Path to plan file
        working_dir: Working directory

    Returns:
        True if implementation succeeded, False otherwise
    """
    notify_in_progress(
        step=f"Implementing Chunk {chunk.number}",
        details=chunk.title,
        metadata={
            "file": chunk.file_path,
            "line": chunk.line_number
        }
    )

    print(f"\n{'='*60}")
    print(f"IMPLEMENTING CHUNK {chunk.number}: {chunk.title}")
    print(f"{'='*60}")
    print(f"File: {chunk.file_path}")
    print(f"Line: {chunk.line_number}")

    # Create prompt for Claude Code to implement THIS chunk only
    prompt = f"""Implement ONLY chunk {chunk.number} from the FP refactoring plan.

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
2. Locate the current code at line {chunk.line_number}
3. Replace it with the refactored code EXACTLY as shown
4. Do NOT make any other changes to the file
5. Do NOT implement any other chunks

**Verification:**
After making the change, confirm:
- The file compiles/runs without errors
- The change matches the refactored code exactly
"""

    agent_dir = working_dir / "agents" / f"fp_chunk_{chunk.number}"
    agent_dir.mkdir(parents=True, exist_ok=True)
    output_file = agent_dir / "raw_output.jsonl"

    request = AgentPromptRequest(
        prompt=prompt,
        adw_id=f"fp_chunk_{chunk.number}",
        agent_name=f"fp_implementor_chunk_{chunk.number}",
        model="opus",
        output_file=str(output_file),
        working_dir=str(working_dir),
        dangerously_skip_permissions=True
    )

    try:
        response = prompt_claude_code(request)

        if not response.success:
            notify_failure(
                step=f"Chunk {chunk.number} Implementation",
                error=response.output,
                details=chunk.title
            )
            return False

        notify_success(
            step=f"Chunk {chunk.number} Implementation",
            details=f"Code refactored in {chunk.file_path}"
        )
        return True

    except Exception as e:
        notify_failure(
            step=f"Chunk {chunk.number} Implementation",
            error=str(e),
            details=chunk.title
        )
        return False


def validate_with_browser(chunk: ChunkData, working_dir: Path) -> bool:
    """Validate chunk changes using browser automation.

    Args:
        chunk: Chunk that was just implemented
        working_dir: Working directory

    Returns:
        True if validation passed, False if site is broken
    """
    notify_in_progress(
        step=f"Validating Chunk {chunk.number}",
        details="Running browser validation"
    )

    print(f"\n{'='*60}")
    print(f"VALIDATING CHUNK {chunk.number} WITH BROWSER")
    print(f"{'='*60}")

    # Construct validation prompt for browser
    # Extract the page/component name from file path
    file_parts = Path(chunk.file_path).parts
    page_name = "the site"

    if "pages" in file_parts:
        page_idx = file_parts.index("pages")
        if page_idx + 1 < len(file_parts):
            page_name = file_parts[page_idx + 1].replace("Page", "").replace(".jsx", "")

    validation_prompt = f"""I just refactored code in {chunk.file_path} (line {chunk.line_number}).

Please validate that the change didn't break the site:

1. Navigate to http://localhost:8000 (dev server should be running)
2. Navigate to the {page_name} page if applicable
3. Check for:
   - No console errors
   - Page renders correctly
   - Interactive elements work
   - No obvious visual regressions

Report ONLY if you find errors. If everything works, just say "VALIDATION PASSED".

If you find errors, describe:
- What broke
- Error messages in console
- Visual issues

DO NOT try to fix anything - just report the status.
"""

    # Import and run adw_claude_browser logic
    from adw_claude_browser import run_claude_browser
    import logging

    logger = logging.getLogger("fp_orchestrator")

    try:
        success, output = run_claude_browser(validation_prompt, logger)

        if not success:
            notify_failure(
                step=f"Chunk {chunk.number} Validation",
                error="Browser automation failed",
                details=output
            )
            return False

        # Check if validation passed
        if "VALIDATION PASSED" in output.upper():
            notify_success(
                step=f"Chunk {chunk.number} Validation",
                details="No errors detected"
            )
            return True
        else:
            notify_failure(
                step=f"Chunk {chunk.number} Validation",
                error="Site broken after refactoring",
                details=output
            )
            return False

    except Exception as e:
        notify_failure(
            step=f"Chunk {chunk.number} Validation",
            error=str(e),
            details="Validation error"
        )
        return False


def commit_chunk(chunk: ChunkData, working_dir: Path) -> bool:
    """Commit the chunk changes to git.

    Args:
        chunk: Chunk to commit
        working_dir: Working directory

    Returns:
        True if commit succeeded
    """
    import subprocess

    notify_in_progress(
        step=f"Committing Chunk {chunk.number}",
        details=chunk.title
    )

    commit_message = f"""refactor(fp): {chunk.title}

Chunk {chunk.number} - {chunk.file_path}:{chunk.line_number}

Applied functional programming refactoring:
{chunk.title}

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
"""

    try:
        # Stage changes
        subprocess.run(
            ["git", "add", chunk.file_path],
            cwd=working_dir,
            check=True,
            capture_output=True
        )

        # Commit
        subprocess.run(
            ["git", "commit", "-m", commit_message],
            cwd=working_dir,
            check=True,
            capture_output=True
        )

        notify_success(
            step=f"Chunk {chunk.number} Committed",
            details=f"Changes saved to git history"
        )
        return True

    except subprocess.CalledProcessError as e:
        notify_failure(
            step=f"Chunk {chunk.number} Commit",
            error=e.stderr.decode() if e.stderr else str(e),
            details="Git commit failed"
        )
        return False


def rollback_chunk(chunk: ChunkData, working_dir: Path) -> bool:
    """Rollback chunk changes using git reset.

    Args:
        chunk: Chunk to rollback
        working_dir: Working directory

    Returns:
        True if rollback succeeded
    """
    import subprocess

    notify_rollback(
        step=f"Rolling back Chunk {chunk.number}",
        details=f"Validation failed - reverting {chunk.file_path}"
    )

    try:
        # Hard reset to discard changes
        subprocess.run(
            ["git", "reset", "--hard", "HEAD"],
            cwd=working_dir,
            check=True,
            capture_output=True
        )

        print(f"✅ Rolled back chunk {chunk.number}")
        return True

    except subprocess.CalledProcessError as e:
        notify_failure(
            step=f"Chunk {chunk.number} Rollback",
            error=e.stderr.decode() if e.stderr else str(e),
            details="Git rollback failed"
        )
        return False


def process_chunks(chunks: List[ChunkData], plan_file: Path, working_dir: Path) -> OrchestratorState:
    """Process all chunks in sequence.

    Args:
        chunks: List of chunks to process
        plan_file: Path to plan file
        working_dir: Working directory

    Returns:
        Final orchestrator state
    """
    state = OrchestratorState(
        plan_file=plan_file,
        total_chunks=len(chunks)
    )

    notify_started(
        step="Chunk Processing",
        details=f"Processing {len(chunks)} chunks sequentially"
    )

    print(f"\n{'='*60}")
    print("PHASE 2: CHUNK PROCESSING")
    print(f"{'='*60}")
    print(f"Total chunks: {len(chunks)}")

    for chunk in chunks:
        state.current_chunk = chunk.number

        print(f"\n{'─'*60}")
        print(f"CHUNK {chunk.number}/{len(chunks)}")
        print(f"{'─'*60}")

        # Step 1: Implement chunk
        if not implement_chunk(chunk, plan_file, working_dir):
            print(f"⚠️  Chunk {chunk.number} implementation failed, skipping")
            state.skipped_chunks += 1
            continue

        # Step 2: Validate with browser
        validation_passed = validate_with_browser(chunk, working_dir)

        # Step 3: Commit or rollback
        if validation_passed:
            if commit_chunk(chunk, working_dir):
                state.completed_chunks += 1
                print(f"✅ Chunk {chunk.number} COMPLETED")
            else:
                # Commit failed - try to rollback
                rollback_chunk(chunk, working_dir)
                state.failed_chunks += 1
                print(f"❌ Chunk {chunk.number} FAILED (commit error)")
        else:
            # Validation failed - rollback
            rollback_chunk(chunk, working_dir)
            state.skipped_chunks += 1
            print(f"⏭️  Chunk {chunk.number} SKIPPED (validation failed)")

    return state


def main():
    parser = argparse.ArgumentParser(description="ADW FP Orchestrator")
    parser.add_argument("target_path", nargs='?', default="app/src/logic",
                        help="Path to audit (default: app/src/logic)")
    parser.add_argument("--severity", choices=["high", "medium", "all"], default="high",
                        help="Severity filter (default: high)")

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print("ADW FP ORCHESTRATOR")
    print(f"{'='*60}")

    working_dir = Path.cwd()

    notify_started(
        step="FP Orchestrator Started",
        details=f"Target: {args.target_path}, Severity: {args.severity}"
    )

    try:
        # Phase 1: Run audit and generate plan
        plan_file = run_audit_phase(args.target_path, args.severity, working_dir)

        # Extract chunks from plan
        print(f"\n{'='*60}")
        print("EXTRACTING CHUNKS FROM PLAN")
        print(f"{'='*60}")

        chunks = extract_chunks_from_plan(plan_file)
        print(f"✅ Extracted {len(chunks)} chunks")

        # Phase 2: Process chunks
        state = process_chunks(chunks, plan_file, working_dir)

        # Final summary
        print(f"\n{'='*60}")
        print("✅ FP ORCHESTRATOR COMPLETE")
        print(f"{'='*60}")
        print(f"Total chunks: {state.total_chunks}")
        print(f"Completed: {state.completed_chunks}")
        print(f"Skipped: {state.skipped_chunks}")
        print(f"Failed: {state.failed_chunks}")

        notify_success(
            step="FP Orchestrator Complete",
            details=f"{state.completed_chunks}/{state.total_chunks} chunks applied",
            metadata={
                "completed": state.completed_chunks,
                "skipped": state.skipped_chunks,
                "failed": state.failed_chunks
            }
        )

    except Exception as e:
        notify_failure(
            step="FP Orchestrator",
            error=str(e),
            details="Orchestrator failed"
        )
        print(f"\n❌ Orchestrator failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
