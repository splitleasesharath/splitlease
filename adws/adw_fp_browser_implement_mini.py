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
import logging
from pathlib import Path
from datetime import datetime

# Add adws to path
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.webhook import notify_success, notify_failure
from adw_modules.run_logger import RunLogger
from adw_modules.config import PRODUCTION_BASE_URL
from adw_modules.dev_server_manager import DevServerManager
from adw_modules.chunk_validation import validate_chunk_with_retry
from adw_modules.validation_parser import ValidationResult

# Import chunk processing functions from the full orchestrator
from adw_fp_audit_browser_implement_orchestrator import (
    ChunkData,
    OrchestratorState,
    extract_chunks_from_plan,
    implement_chunk,
    commit_chunk,
    rollback_chunk
)


def determine_page_path(chunk: ChunkData) -> str:
    """Determine which page path to test for this chunk.

    Priority:
    1. chunk.affected_pages (from plan, if not "AUTO")
    2. Inferred from chunk.file_path (file path analysis)
    3. Default to "/" (homepage)

    Args:
        chunk: Chunk being validated

    Returns:
        Page path starting with / (e.g., "/search", "/view-split-lease")
    """
    # If plan specifies affected pages
    if chunk.affected_pages and chunk.affected_pages.upper() != "AUTO":
        # Parse first page from comma-separated list
        page_urls = [url.strip() for url in chunk.affected_pages.split(',')]
        primary_page = page_urls[0]
        return primary_page

    # Otherwise infer from file path
    return infer_page_from_file_path(chunk.file_path)


def infer_page_from_file_path(file_path: str) -> str:
    """Infer page path from file path.

    Args:
        file_path: File path like "app/src/islands/pages/SearchPage.jsx"

    Returns:
        Page path like "/search"
    """
    file_path_lower = file_path.lower()

    # Page mapping based on file names
    page_mapping = {
        "searchpage": "/search",
        "viewsplitleasepage": "/view-split-lease",
        "accountprofilepage": "/account-profile",
        "listingdashboardpage": "/listing-dashboard",
        "hostproposalspage": "/host-proposals",
        "guestproposalspage": "/guest-proposals",
        "selflistingpage": "/self-listing",
        "favoritelistingspage": "/favorite-listings",
        "faqpage": "/faq",
        "messagespage": "/messages",
        "editlistingpage": "/edit-listing",
        "helppage": "/help-center",
        "homepage": "/",
    }

    # Check for page component matches
    for page_key, page_path in page_mapping.items():
        if page_key in file_path_lower:
            return page_path

    # Shared components - default to page that uses them most
    shared_component_mapping = {
        "loggedinavatar": "/account-profile",
        "hostscheduleselector": "/self-listing",
        "searchscheduleselector": "/search",
        "createproposalflow": "/view-split-lease",
        "googlemap": "/search",
        "pricingeditsection": "/edit-listing",
    }

    for component_key, page_path in shared_component_mapping.items():
        if component_key in file_path_lower:
            return page_path

    # Data files - map to pages that use them
    data_file_mapping = {
        "helpcenterdata": "/help-center",
        "faqdata": "/faq",
    }

    for data_key, page_path in data_file_mapping.items():
        if data_key in file_path_lower:
            return page_path

    # Logic files - default to homepage (they affect multiple pages)
    if "/logic/" in file_path_lower:
        return "/"

    # Unknown - default to homepage
    return "/"


def process_chunks_mini(chunks: list, plan_file: Path, working_dir: Path, dev_server: DevServerManager, logger) -> OrchestratorState:
    """Process all chunks in sequence (mini version without audit).

    Args:
        chunks: List of chunks to process
        plan_file: Path to plan file
        working_dir: Working directory
        dev_server: Dev server manager instance (NOT started - will start per chunk)
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
        print(f"CHUNK {chunk.number}/{len(chunks)}: {chunk.title}")
        print(f"{'-'*60}")
        print(f"File: {chunk.file_path}:{chunk.line_number}")

        logger.log(f"Starting Chunk {chunk.number}/{len(chunks)}: {chunk.title}", to_stdout=False)
        logger.log(f"File: {chunk.file_path}:{chunk.line_number}", to_stdout=False)

        # Step 1: Implement chunk
        if not implement_chunk(chunk, plan_file, working_dir):
            print(f"  Chunk {chunk.number} implementation failed, skipping")
            logger.log(f"Chunk {chunk.number} implementation FAILED - skipping", to_stdout=False)
            state.skipped_chunks += 1
            continue

        logger.log(f"Chunk {chunk.number} implementation succeeded", to_stdout=False)
        print(f"[OK] Implementation complete")

        # Step 2: Start dev server for this chunk
        print(f"\n[START] Starting dev server for validation...")
        logger.log_section(f"DEV SERVER - CHUNK {chunk.number}", to_stdout=False)

        try:
            port, base_url = dev_server.start()
            print(f"[OK] Dev server running at {base_url}")
            logger.log(f"Dev server started: {base_url}", to_stdout=False)
        except Exception as e:
            print(f"[FAIL] Dev server failed to start: {e}")
            logger.log(f"Dev server startup FAILED: {e}", to_stdout=False)
            state.failed_chunks += 1
            continue

        try:
            # Step 3: Determine which page to test
            page_path = determine_page_path(chunk)
            logger.log(f"Testing page: {page_path}", to_stdout=False)

            # Build full URLs
            localhost_url = dev_server.get_url(page_path)
            production_url = f"{PRODUCTION_BASE_URL}{page_path}"

            print(f"\n[TEST] Validating changes:")
            print(f"   Localhost:  {localhost_url}")
            print(f"   Production: {production_url}")

            logger.log(f"Localhost URL: {localhost_url}", to_stdout=False)
            logger.log(f"Production URL: {production_url}", to_stdout=False)

            # Step 4: Validate with browser (with retry logic built-in)
            additional_context = {}
            if chunk.affected_pages and chunk.affected_pages.upper() != "AUTO":
                page_urls = [url.strip() for url in chunk.affected_pages.split(',')]
                if len(page_urls) > 1:
                    additional_context["additional_pages"] = page_urls[1:]

            validation_passed, result = validate_chunk_with_retry(
                localhost_url,
                production_url,
                chunk.number,
                chunk.title,
                chunk.file_path,
                chunk.line_number,
                working_dir,
                logger,
                additional_context
            )

            # Step 5: Commit or rollback based on validation result
            if validation_passed:
                logger.log(f"Chunk {chunk.number} validation PASSED", to_stdout=False)
                print(f"\n[OK] Validation PASSED")
                print(f"   Verdict: {result.verdict}")
                print(f"   Confidence: {result.confidence}%")
                print(f"   Summary: {result.summary}")

                if commit_chunk(chunk, working_dir):
                    state.completed_chunks += 1
                    print(f"[OK] Chunk {chunk.number} COMPLETED (committed to git)")
                    logger.log(f"Chunk {chunk.number} COMPLETED - committed to git", to_stdout=False)
                else:
                    # Commit failed - try to rollback
                    rollback_chunk(chunk, working_dir)
                    state.failed_chunks += 1
                    print(f"[FAIL] Chunk {chunk.number} FAILED (commit error)")
                    logger.log(f"Chunk {chunk.number} FAILED - commit error, rolled back", to_stdout=False)
            else:
                # Validation failed - rollback
                logger.log(f"Chunk {chunk.number} validation FAILED - rolling back", to_stdout=False)
                print(f"\n[FAIL] Validation FAILED")
                print(f"   Verdict: {result.verdict}")
                print(f"   Confidence: {result.confidence}%")
                print(f"   Summary: {result.summary}")

                if result.differences:
                    print(f"   Differences ({len(result.differences)}):")
                    for diff in result.differences:
                        print(f"     - [{diff.severity.upper()}] {diff.type}: {diff.description}")

                rollback_chunk(chunk, working_dir)
                state.skipped_chunks += 1
                print(f"  Chunk {chunk.number} SKIPPED (rolled back)")
                logger.log(f"Chunk {chunk.number} SKIPPED - validation failed, rolled back", to_stdout=False)

        finally:
            # CRITICAL: Stop dev server after each chunk to release the port
            print(f"\n[STOP] Stopping dev server (releasing port {dev_server.port})...")
            logger.log(f"Stopping dev server for Chunk {chunk.number}", to_stdout=False)
            dev_server.stop()
            print(f"[OK] Port {port} released")
            logger.log(f"Dev server stopped, port released", to_stdout=False)

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

    print(f"\n{'='*60}")
    print("ADW FP MINI ORCHESTRATOR")
    print(f"{'='*60}")
    print(f"Plan file: {args.plan_file}")
    if args.chunks:
        print(f"Chunks filter: {args.chunks}")

    # Convert plan file to absolute path
    plan_file = Path(args.plan_file).resolve()

    # Derive working_dir from plan file path
    # Plan file is at: <working_dir>/.claude/plans/New/<filename>
    # Levels: <filename> -> New -> plans -> .claude -> <working_dir>
    # So working_dir is 4 levels up from the plan file
    working_dir = plan_file.parent.parent.parent.parent

    # Initialize logger AFTER deriving working_dir so it uses correct path
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    log_dir = working_dir / "adws" / "adw_run_logs"
    logger = RunLogger(log_dir, "fp_mini_orchestrator", timestamp)

    logger.log(f"Plan file: {args.plan_file}", to_stdout=False)
    if args.chunks:
        logger.log(f"Chunks filter: {args.chunks}", to_stdout=False)
    logger.log(f"Derived working_dir: {working_dir}", to_stdout=False)

    # Validate plan file exists
    if not plan_file.exists():
        print(f"\n[FAIL] Plan file not found: {plan_file}")
        logger.log_error(
            FileNotFoundError(f"Plan file not found: {plan_file}"),
            context="Plan file validation"
        )
        logger.finalize()
        sys.exit(1)

    print(f"[OK] Plan file found: {plan_file.name}")
    print(f"[OK] Working directory: {working_dir}")
    logger.log(f"Plan file validated: {plan_file.name}", to_stdout=False)
    logger.log(f"Working directory: {working_dir}", to_stdout=False)

    # Start dev server ONCE before processing chunks
    dev_server = None

    try:
        # Extract chunks from plan
        print(f"\n{'='*60}")
        print("EXTRACTING CHUNKS FROM PLAN")
        print(f"{'='*60}")

        logger.log_section("EXTRACTING CHUNKS FROM PLAN", to_stdout=False)
        chunks = extract_chunks_from_plan(plan_file)
        print(f"[OK] Extracted {len(chunks)} chunks")
        logger.log(f"Extracted {len(chunks)} chunks", to_stdout=False)

        # Filter chunks if --chunks argument provided
        if args.chunks:
            requested_chunks = [int(x.strip()) for x in args.chunks.split(',')]
            chunks = [c for c in chunks if c.number in requested_chunks]
            print(f"[TEST] Filtered to {len(chunks)} chunks: {requested_chunks}")
            logger.log(f"Filtered to {len(chunks)} chunks: {requested_chunks}", to_stdout=False)

            if not chunks:
                print(f"\n[FAIL] No chunks matched filter: {requested_chunks}")
                logger.log(f"No chunks matched filter: {requested_chunks}", to_stdout=False)
                print("Available chunks:")
                all_chunks = extract_chunks_from_plan(plan_file)
                for c in all_chunks:
                    chunk_info = f"Chunk {c.number}: {c.title}"
                    print(f"  - {chunk_info}")
                    logger.log(chunk_info, to_stdout=False)
                logger.finalize()
                sys.exit(1)

        # CREATE DEV SERVER MANAGER (but don't start yet - will start per chunk)
        # Create a simple logger for dev server manager
        dev_logger = logging.getLogger("dev_server")
        dev_logger.setLevel(logging.INFO)
        if not dev_logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
            dev_logger.addHandler(handler)

        # Dev server must run from app/ directory
        app_dir = working_dir / "app"
        if not app_dir.exists():
            raise RuntimeError(f"app/ directory not found at: {app_dir}")

        dev_server = DevServerManager(app_dir, dev_logger)
        logger.log(f"Dev server manager created (will start per chunk)", to_stdout=False)

        # Process chunks (each chunk will start/stop dev server)
        logger.log_section("CHUNK PROCESSING", to_stdout=False)
        logger.log(f"Processing {len(chunks)} chunks", to_stdout=False)

        state = process_chunks_mini(chunks, plan_file, working_dir, dev_server, logger)

        # Final summary
        print(f"\n{'='*60}")
        print("MINI ORCHESTRATOR COMPLETE")
        print(f"{'='*60}")
        print(f"Total chunks: {state.total_chunks}")
        print(f"[OK] Completed: {state.completed_chunks}")
        print(f"  Skipped: {state.skipped_chunks}")
        print(f"[FAIL] Failed: {state.failed_chunks}")

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
        print(f"\n[FAIL] Mini orchestrator failed: {e}")
        logger.log_error(e, context="Main mini orchestrator loop")
        logger.finalize()
        sys.exit(1)

    finally:
        # ALWAYS stop dev server in finally block
        if dev_server is not None and dev_server.is_running():
            print(f"\n{'='*60}")
            print("STOPPING DEV SERVER")
            print(f"{'='*60}")
            logger.log_section("DEV SERVER CLEANUP", to_stdout=False)
            dev_server.stop()
            print("[OK] Dev server stopped")
            logger.log("Dev server stopped", to_stdout=False)


if __name__ == "__main__":
    main()
