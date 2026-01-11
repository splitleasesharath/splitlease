#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW FP Browser Implement Mini Orchestrator

Skips the audit step and accepts a pre-existing plan file path.
Focuses on implementation + browser validation loop.

This mini orchestrator:
1. Accepts a plan file path as argument
2. For each chunk in the plan:
   a. Implement the chunk
   b. Validate in browser
   c. If validation passes -> git commit
   d. If validation fails -> git reset --hard and skip to next chunk
3. Send status updates to SHARATHPLAYGROUND webhook

Usage:
    uv run adw_fp_browser_implement_mini.py <plan_file_path> [--chunks 1,2,3]

Example:
    uv run adw_fp_browser_implement_mini.py .claude/plans/New/20250111123456_fp_refactor_plan.md
    uv run adw_fp_browser_implement_mini.py .claude/plans/New/20250111123456_fp_refactor_plan.md --chunks 5,6,7
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime

# Add adws to path
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.webhook import notify_success, notify_failure, notify_in_progress
from adw_modules.run_logger import create_run_logger

# Import chunk processing functions from the full orchestrator
from adw_fp_audit_browser_implement_orchestrator import (
    ChunkData,
    OrchestratorState,
    extract_chunks_from_plan,
    implement_chunk,
    validate_with_browser,
    commit_chunk,
    rollback_chunk
)


def process_chunks_mini(chunks: list, plan_file: Path, working_dir: Path, logger) -> OrchestratorState:
    """Process all chunks in sequence (mini version without audit).

    Args:
        chunks: List of chunks to process
        plan_file: Path to plan file
        working_dir: Working directory
        logger: RunLogger instance for logging

    Returns:
        Final orchestrator state
    """
    state = OrchestratorState(
        plan_file=plan_file,
        total_chunks=len(chunks)
    )

    print(f"\n{'='*60}")
    print("CHUNK PROCESSING")
    print(f"{'='*60}")
    print(f"Total chunks: {len(chunks)}")

    for chunk in chunks:
        state.current_chunk = chunk.number

        print(f"\n{'-'*60}")
        print(f"CHUNK {chunk.number}/{len(chunks)}")
        print(f"{'-'*60}")

        logger.log(f"Starting Chunk {chunk.number}/{len(chunks)}: {chunk.title}", to_stdout=False)
        logger.log(f"File: {chunk.file_path}:{chunk.line_number}", to_stdout=False)

        # Step 1: Implement chunk
        if not implement_chunk(chunk, plan_file, working_dir):
            print(f"  Chunk {chunk.number} implementation failed, skipping")
            logger.log(f"Chunk {chunk.number} implementation FAILED - skipping", to_stdout=False)
            state.skipped_chunks += 1
            continue

        logger.log(f"Chunk {chunk.number} implementation succeeded", to_stdout=False)

        # Step 2: Validate with browser
        logger.log(f"Validating Chunk {chunk.number} with browser", to_stdout=False)
        validation_passed = validate_with_browser(chunk, working_dir, logger)

        # Step 3: Commit or rollback
        if validation_passed:
            logger.log(f"Chunk {chunk.number} validation PASSED", to_stdout=False)
            if commit_chunk(chunk, working_dir):
                state.completed_chunks += 1
                print(f"✅ Chunk {chunk.number} COMPLETED")
                logger.log(f"Chunk {chunk.number} COMPLETED - committed to git", to_stdout=False)
            else:
                # Commit failed - try to rollback
                rollback_chunk(chunk, working_dir)
                state.failed_chunks += 1
                print(f"❌ Chunk {chunk.number} FAILED (commit error)")
                logger.log(f"Chunk {chunk.number} FAILED - commit error, rolled back", to_stdout=False)
        else:
            # Validation failed - rollback
            logger.log(f"Chunk {chunk.number} validation FAILED - rolling back", to_stdout=False)
            rollback_chunk(chunk, working_dir)
            state.skipped_chunks += 1
            print(f"⏭️  Chunk {chunk.number} SKIPPED (validation failed)")
            logger.log(f"Chunk {chunk.number} SKIPPED - validation failed", to_stdout=False)

    return state


def main():
    parser = argparse.ArgumentParser(
        description="Mini FP Orchestrator - Skip audit, use existing plan file"
    )
    parser.add_argument(
        "plan_file",
        type=str,
        help="Path to the FP refactoring plan file (e.g., .claude/plans/New/20250111123456_fp_refactor_plan.md)"
    )
    parser.add_argument(
        "--chunks",
        type=str,
        default=None,
        help="Comma-separated chunk numbers to process (e.g., '1' or '1,3,5'). Default: all chunks"
    )

    args = parser.parse_args()

    # Initialize logger
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    logger = create_run_logger("fp_mini_orchestrator", timestamp)

    print(f"\n{'='*60}")
    print("ADW FP MINI ORCHESTRATOR")
    print(f"{'='*60}")
    print(f"Plan file: {args.plan_file}")
    if args.chunks:
        print(f"Chunks filter: {args.chunks}")

    logger.log(f"Plan file: {args.plan_file}", to_stdout=False)
    if args.chunks:
        logger.log(f"Chunks filter: {args.chunks}", to_stdout=False)

    # Convert plan file to absolute path
    plan_file = Path(args.plan_file).resolve()

    # Derive working_dir from plan file path
    # Plan file is at: <working_dir>/.claude/plans/New/<filename>
    # So working_dir is 3 levels up from the plan file
    working_dir = plan_file.parent.parent.parent

    logger.log(f"Derived working_dir: {working_dir}", to_stdout=False)

    # Validate plan file exists
    if not plan_file.exists():
        print(f"\n❌ Plan file not found: {plan_file}")
        logger.log_error(
            FileNotFoundError(f"Plan file not found: {plan_file}"),
            context="Plan file validation"
        )
        logger.finalize()
        sys.exit(1)

    print(f"✅ Plan file found: {plan_file.name}")
    print(f"✅ Working directory: {working_dir}")
    logger.log(f"Plan file validated: {plan_file.name}", to_stdout=False)
    logger.log(f"Working directory: {working_dir}", to_stdout=False)

    try:
        # Extract chunks from plan
        print(f"\n{'='*60}")
        print("EXTRACTING CHUNKS FROM PLAN")
        print(f"{'='*60}")

        logger.log_section("EXTRACTING CHUNKS FROM PLAN", to_stdout=False)
        chunks = extract_chunks_from_plan(plan_file)
        print(f"✅ Extracted {len(chunks)} chunks")
        logger.log(f"Extracted {len(chunks)} chunks", to_stdout=False)

        # Filter chunks if --chunks argument provided
        if args.chunks:
            requested_chunks = [int(x.strip()) for x in args.chunks.split(',')]
            chunks = [c for c in chunks if c.number in requested_chunks]
            print(f"🔍 Filtered to {len(chunks)} chunks: {requested_chunks}")
            logger.log(f"Filtered to {len(chunks)} chunks: {requested_chunks}", to_stdout=False)

            if not chunks:
                print(f"\n❌ No chunks matched filter: {requested_chunks}")
                logger.log(f"No chunks matched filter: {requested_chunks}", to_stdout=False)
                print("Available chunks:")
                all_chunks = extract_chunks_from_plan(plan_file)
                for c in all_chunks:
                    chunk_info = f"Chunk {c.number}: {c.title}"
                    print(f"  - {chunk_info}")
                    logger.log(chunk_info, to_stdout=False)
                logger.finalize()
                sys.exit(1)

        # Process chunks
        logger.log_section("CHUNK PROCESSING", to_stdout=False)
        logger.log(f"Processing {len(chunks)} chunks", to_stdout=False)
        state = process_chunks_mini(chunks, plan_file, working_dir, logger)

        # Final summary
        print(f"\n{'='*60}")
        print("MINI ORCHESTRATOR COMPLETE")
        print(f"{'='*60}")
        print(f"Total chunks: {state.total_chunks}")
        print(f"✅ Completed: {state.completed_chunks}")
        print(f"⏭️  Skipped: {state.skipped_chunks}")
        print(f"❌ Failed: {state.failed_chunks}")

        logger.log_summary(
            total_chunks=state.total_chunks,
            completed=state.completed_chunks,
            skipped=state.skipped_chunks,
            failed=state.failed_chunks,
            plan_file=str(state.plan_file)
        )

        notify_success(
            step=f"Mini orchestrator complete: {state.completed_chunks}/{state.total_chunks} chunks refactored",
            details=None
        )

        logger.finalize()

    except Exception as e:
        notify_failure(
            step="Mini orchestrator crashed",
            error=str(e)[:100]
        )
        print(f"\n❌ Mini orchestrator failed: {e}")
        logger.log_error(e, context="Main mini orchestrator loop")
        logger.finalize()
        sys.exit(1)


if __name__ == "__main__":
    main()
