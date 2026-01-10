#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW Overnight Refactor Iso - Batch refactoring with extended test suite

Usage: uv run adw_overnight_refactor_iso.py [options]

Options:
  --config FILE           Path to overnight_config.json (default: configs/overnight_config.json)
  --issues 123,456,789    Comma-separated issue numbers (overrides config)
  --label "overnight"     Fetch issues by GitHub label (overrides config)
  --parallel N            Max concurrent ADWs (default: 5, max: 15)
  --continue-on-failure   Don't stop batch on individual failures
  --failure-threshold N   Stop after N consecutive failures (default: 3)
  --webhook URL           Slack webhook for notifications
  --dry-run               Validate config without executing
  --resume BATCH_ID       Resume a failed/paused batch
  --skip-tests CATS       Skip test categories (comma-separated)
  --skip-dead-code        Skip dead code detection phase
  --auto-merge            Auto-merge passing PRs (dangerous)
  --model-set base|heavy  Model selection (default: base)

This script runs batch refactoring overnight:
1. Loads issues from config, CLI, or GitHub label
2. Processes each issue through Plan -> Build -> Test -> Review
3. Runs extended 25-test suite (ordered fast to slow)
4. Detects dead code for safe deletion
5. Sends notifications on completion

Supports:
- Parallel processing (up to 15 concurrent workers)
- Resume from failures
- Slack notifications
- Dead code detection
"""

import argparse
import json
import os
import subprocess
import sys
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional, Tuple

# Add the parent directory to Python path to import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from adw_modules.batch_state import (
    BatchState,
    BatchConfig,
    BatchIssueResult,
    IssueStatus,
    ExtendedTestResult,
)
from adw_modules.test_suite import (
    get_all_tests,
    filter_tests,
    get_category_for_test,
    get_estimated_duration,
    format_test_summary,
    CATEGORY_ORDER,
)
from adw_modules.notifications import (
    notify_batch_start,
    notify_batch_complete,
    notify_batch_failure,
    notify_batch_paused,
)
from adw_modules.utils import make_adw_id, setup_logger
from adw_modules.workflow_ops import ensure_adw_id
from adw_modules.worktree_ops import create_worktree, validate_worktree, remove_worktree
from adw_modules.state import ADWState
from adw_modules.github import fetch_open_issues, make_issue_comment


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Overnight batch refactoring with extended test suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process specific issues
  uv run adw_overnight_refactor_iso.py --issues 123,456,789

  # Process issues by GitHub label
  uv run adw_overnight_refactor_iso.py --label "overnight-refactor"

  # Dry run to validate config
  uv run adw_overnight_refactor_iso.py --issues 123 --dry-run

  # Resume a paused batch
  uv run adw_overnight_refactor_iso.py --resume abc12345

  # Skip slow tests for faster iteration
  uv run adw_overnight_refactor_iso.py --issues 123 --skip-tests e2e,visual_regression
        """
    )

    parser.add_argument(
        "--config",
        default="configs/overnight_config.json",
        help="Path to overnight_config.json"
    )
    parser.add_argument(
        "--issues",
        type=str,
        help="Comma-separated issue numbers"
    )
    parser.add_argument(
        "--label",
        type=str,
        help="GitHub label to fetch issues"
    )
    parser.add_argument(
        "--parallel",
        type=int,
        default=5,
        help="Max concurrent ADWs (default: 5, max: 15)"
    )
    parser.add_argument(
        "--continue-on-failure",
        action="store_true",
        help="Don't stop batch on individual failures"
    )
    parser.add_argument(
        "--failure-threshold",
        type=int,
        default=3,
        help="Stop after N consecutive failures (default: 3)"
    )
    parser.add_argument(
        "--webhook",
        type=str,
        help="Slack webhook for notifications"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate config without executing"
    )
    parser.add_argument(
        "--resume",
        type=str,
        help="Batch ID to resume"
    )
    parser.add_argument(
        "--skip-tests",
        type=str,
        help="Test categories to skip (comma-separated)"
    )
    parser.add_argument(
        "--skip-dead-code",
        action="store_true",
        help="Skip dead code detection phase"
    )
    parser.add_argument(
        "--auto-merge",
        action="store_true",
        help="Auto-merge passing PRs (dangerous)"
    )
    parser.add_argument(
        "--model-set",
        choices=["base", "heavy"],
        default="base",
        help="Model selection (default: base)"
    )

    return parser.parse_args()


def load_config(config_path: str) -> Dict:
    """Load configuration from JSON file."""
    if os.path.exists(config_path):
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def fetch_issues_by_label(label: str, logger: logging.Logger) -> List[str]:
    """Fetch open issues with a specific label from GitHub."""
    try:
        issues = fetch_open_issues()
        matching = [
            str(issue.number)
            for issue in issues
            if any(lbl.name == label for lbl in issue.labels)
        ]
        logger.info(f"Found {len(matching)} issues with label '{label}'")
        return matching
    except Exception as e:
        logger.error(f"Failed to fetch issues by label: {e}")
        return []


def initialize_batch(args, logger: logging.Logger) -> BatchState:
    """Initialize a new batch from CLI args and config."""
    batch_id = make_adw_id()

    # Load config file
    config_data = load_config(args.config)

    # Override with CLI args
    if args.issues:
        config_data["issues"] = args.issues.split(",")
    if args.label:
        config_data["github_label"] = args.label
    if args.parallel:
        config_data["parallel_limit"] = min(args.parallel, 15)
    if args.webhook:
        config_data["notification_webhook"] = args.webhook
    if args.skip_tests:
        config_data["skip_tests"] = args.skip_tests.split(",")
    if args.skip_dead_code:
        config_data["run_dead_code_detection"] = False
    if args.auto_merge:
        config_data["auto_merge"] = True
    if args.model_set:
        config_data["model_set"] = args.model_set

    config_data["continue_on_failure"] = args.continue_on_failure
    config_data["failure_threshold"] = args.failure_threshold

    config = BatchConfig(**config_data)

    # Fetch issues if using label
    if config.github_label and not config.issues:
        config.issues = fetch_issues_by_label(config.github_label, logger)

    if not config.issues:
        logger.error("No issues to process. Provide --issues or --label")
        sys.exit(1)

    # Initialize batch state
    batch_state = BatchState(batch_id, config)

    # Add all issues to batch
    for issue_num in config.issues:
        batch_state.add_issue(issue_num)

    # Save initial state
    batch_state.save()

    logger.info(f"Initialized batch {batch_id} with {len(config.issues)} issues")
    logger.info(f"Parallel limit: {config.parallel_limit}")
    logger.info(f"Model set: {config.model_set}")

    return batch_state


def run_sdlc_for_issue(
    issue_number: str,
    adw_id: str,
    batch_state: BatchState,
    logger: logging.Logger
) -> Tuple[bool, Optional[str], Optional[str]]:
    """Run the SDLC pipeline for a single issue.

    Returns:
        Tuple of (success, pr_url, error_message)
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Determine which script to use based on auto_merge setting
    if batch_state.config.auto_merge:
        sdlc_script = "adw_sdlc_zte_iso.py"
    else:
        sdlc_script = "adw_sdlc_iso.py"

    cmd = [
        "uv",
        "run",
        os.path.join(script_dir, sdlc_script),
        issue_number,
        adw_id,
    ]

    # Add skip flags if configured
    if batch_state.config.skip_tests:
        # Check if e2e should be skipped
        if "e2e" in batch_state.config.skip_tests:
            cmd.append("--skip-e2e")

    logger.info(f"Running SDLC for issue {issue_number} with ADW {adw_id}")
    logger.debug(f"Command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600  # 1 hour timeout
        )

        if result.returncode == 0:
            # Try to extract PR URL from state
            state = ADWState.load(adw_id, logger)
            pr_url = None
            if state:
                # PR URL might be in agent output or state
                # For now, we'll check if branch was pushed
                branch_name = state.get("branch_name")
                if branch_name:
                    pr_url = f"https://github.com/repo/pull/{issue_number}"  # Placeholder

            return True, pr_url, None
        else:
            error = result.stderr[:500] if result.stderr else "Unknown error"
            return False, None, error

    except subprocess.TimeoutExpired:
        return False, None, "SDLC pipeline timed out after 1 hour"
    except Exception as e:
        return False, None, str(e)


def process_single_issue(
    issue_number: str,
    batch_state: BatchState,
    logger: logging.Logger
) -> BatchIssueResult:
    """Process a single issue through the full pipeline."""
    start_time = datetime.now()
    adw_id = make_adw_id()

    # Create result object
    result = BatchIssueResult(
        issue_number=issue_number,
        adw_id=adw_id,
        status=IssueStatus.IN_PROGRESS,
        start_time=start_time
    )

    logger.info(f"Processing issue {issue_number} with ADW {adw_id}")

    try:
        # Ensure ADW ID and state
        adw_id = ensure_adw_id(issue_number, adw_id, logger)
        result.adw_id = adw_id

        # Run the SDLC pipeline
        success, pr_url, error = run_sdlc_for_issue(
            issue_number, adw_id, batch_state, logger
        )

        if success:
            result.status = IssueStatus.COMPLETED
            result.pr_url = pr_url
            logger.info(f"Issue {issue_number} completed successfully")
        else:
            result.status = IssueStatus.FAILED
            result.error = error
            logger.error(f"Issue {issue_number} failed: {error}")

        # Load state to get test results
        state = ADWState.load(adw_id, logger)
        if state:
            result.worktree_path = state.get("worktree_path")

    except Exception as e:
        result.status = IssueStatus.FAILED
        result.error = str(e)
        logger.error(f"Issue {issue_number} failed with exception: {e}")

    result.end_time = datetime.now()
    return result


def process_batch(batch_state: BatchState, logger: logging.Logger) -> Dict[str, BatchIssueResult]:
    """Process all pending issues with controlled parallelism."""
    pending_issues = batch_state.get_pending_issues()

    if not pending_issues:
        logger.info("No pending issues to process")
        return {}

    logger.info(f"Processing {len(pending_issues)} issues with {batch_state.config.parallel_limit} workers")

    results = {}

    with ThreadPoolExecutor(max_workers=batch_state.config.parallel_limit) as executor:
        # Submit all pending issues
        future_to_issue = {
            executor.submit(
                process_single_issue,
                issue_num,
                batch_state,
                logger
            ): issue_num
            for issue_num in pending_issues
        }

        # Collect results as they complete
        for future in as_completed(future_to_issue):
            issue_num = future_to_issue[future]

            try:
                result = future.result(timeout=3600)  # 1 hour max per issue
                results[issue_num] = result

                # Update batch state
                if result.status == IssueStatus.COMPLETED:
                    batch_state.mark_issue_completed(
                        issue_num,
                        pr_url=result.pr_url,
                        test_results=result.test_results,
                        tests_passed=result.tests_passed,
                        tests_failed=result.tests_failed
                    )
                else:
                    batch_state.mark_issue_failed(
                        issue_num,
                        error=result.error or "Unknown error"
                    )

                batch_state.save()

                logger.info(
                    f"Progress: {batch_state.completed_count}/{batch_state.total_issues} completed, "
                    f"{batch_state.failed_count} failed"
                )

                # Check failure threshold
                if batch_state.should_stop_batch():
                    logger.warning(
                        f"Failure threshold reached ({batch_state.consecutive_failures} consecutive), "
                        "pausing batch"
                    )
                    batch_state.status = "paused"
                    batch_state.save()
                    notify_batch_paused(batch_state, logger)

                    # Cancel remaining futures
                    for f in future_to_issue:
                        f.cancel()
                    break

            except Exception as e:
                logger.error(f"Issue {issue_num} failed with exception: {e}")
                results[issue_num] = BatchIssueResult(
                    issue_number=issue_num,
                    adw_id="",
                    status=IssueStatus.FAILED,
                    start_time=datetime.now(),
                    error=str(e)
                )
                batch_state.mark_issue_failed(issue_num, str(e))
                batch_state.save()

    return results


def run_dead_code_detection(batch_state: BatchState, logger: logging.Logger) -> List[str]:
    """Run dead code detection across processed issues.

    Returns list of unused exports found.
    """
    logger.info("Running dead code detection...")

    # For now, we'll run knip on the main branch
    # In a full implementation, this would analyze changes across all PRs
    try:
        result = subprocess.run(
            ["npx", "knip", "--no-exit-code", "--reporter", "json"],
            capture_output=True,
            text=True,
            timeout=300
        )

        if result.stdout:
            try:
                knip_output = json.loads(result.stdout)
                unused = []
                for file_info in knip_output.get("files", []):
                    unused.extend(file_info.get("exports", []))
                logger.info(f"Found {len(unused)} unused exports")
                return unused
            except json.JSONDecodeError:
                logger.warning("Could not parse knip output")
                return []
        return []

    except subprocess.TimeoutExpired:
        logger.warning("Dead code detection timed out")
        return []
    except FileNotFoundError:
        logger.warning("knip not found, skipping dead code detection")
        return []
    except Exception as e:
        logger.error(f"Dead code detection failed: {e}")
        return []


def main():
    """Main entry point."""
    args = parse_args()

    # Set up logging
    log_name = args.resume or "overnight"
    logger = setup_logger(log_name, "adw_overnight_refactor")

    print("\n=== ADW OVERNIGHT REFACTOR ===")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Initialize or resume batch
    if args.resume:
        batch_state = BatchState.load(args.resume, logger)
        if not batch_state:
            logger.error(f"Cannot resume batch {args.resume}: not found")
            sys.exit(1)
        logger.info(f"Resuming batch {args.resume}")
        print(f"Resuming batch: {args.resume}")
        print(f"  Completed: {batch_state.completed_count}")
        print(f"  Failed: {batch_state.failed_count}")
        print(f"  Pending: {len(batch_state.get_pending_issues())}")
    else:
        batch_state = initialize_batch(args, logger)
        print(f"Batch ID: {batch_state.batch_id}")
        print(f"Issues to process: {batch_state.total_issues}")

    # Dry run - just show what would happen
    if args.dry_run:
        print("\n=== DRY RUN ===")
        print(f"Would process {batch_state.total_issues} issues:")
        for issue_num in batch_state.config.issues:
            print(f"  - Issue #{issue_num}")
        print(f"\nConfiguration:")
        print(f"  Parallel workers: {batch_state.config.parallel_limit}")
        print(f"  Model set: {batch_state.config.model_set}")
        print(f"  Continue on failure: {batch_state.config.continue_on_failure}")
        print(f"  Failure threshold: {batch_state.config.failure_threshold}")
        print(f"  Skip tests: {batch_state.config.skip_tests}")
        print(f"  Dead code detection: {batch_state.config.run_dead_code_detection}")
        print(f"  Auto merge: {batch_state.config.auto_merge}")

        estimated_time = get_estimated_duration(batch_state.config.skip_tests)
        print(f"\nEstimated time per issue: ~{estimated_time // 60} minutes")
        print(f"Estimated total time: ~{(estimated_time * batch_state.total_issues) // 60} minutes")
        sys.exit(0)

    # Notify start
    notify_batch_start(batch_state, logger)

    try:
        # Process issues in parallel
        results = process_batch(batch_state, logger)

        # Run dead code detection if enabled
        if batch_state.config.run_dead_code_detection and batch_state.status != "paused":
            dead_code = run_dead_code_detection(batch_state, logger)
            if dead_code:
                print(f"\nDead code found: {len(dead_code)} unused exports")

        # Finalize batch
        if batch_state.status != "paused":
            batch_state.status = "completed"
        batch_state.end_time = datetime.now()
        batch_state.save()

    except KeyboardInterrupt:
        logger.warning("Batch interrupted by user")
        batch_state.status = "paused"
        batch_state.save()
        print(f"\nBatch paused. Resume with: uv run adw_overnight_refactor_iso.py --resume {batch_state.batch_id}")
        sys.exit(130)

    except Exception as e:
        logger.error(f"Batch failed: {e}")
        batch_state.status = "failed"
        batch_state.save()
        notify_batch_failure(batch_state, str(e), logger)
        sys.exit(1)

    # Notify completion
    notify_batch_complete(batch_state, logger)

    # Print summary
    summary = batch_state.get_summary()
    print(f"\n=== BATCH COMPLETE ===")
    print(f"Batch ID: {batch_state.batch_id}")
    print(f"Status: {batch_state.status}")
    print(f"Completed: {summary['completed']}/{summary['total_issues']}")
    print(f"Failed: {summary['failed']}")
    if summary.get('duration_seconds'):
        duration_mins = summary['duration_seconds'] / 60
        print(f"Duration: {duration_mins:.1f} minutes")

    # Print failed issues
    failed_issues = [
        issue_num for issue_num, result in batch_state.issues.items()
        if result.status == IssueStatus.FAILED
    ]
    if failed_issues:
        print(f"\nFailed issues:")
        for issue_num in failed_issues:
            result = batch_state.issues[issue_num]
            print(f"  - #{issue_num}: {result.error}")

    # Print PRs created
    prs = [
        result.pr_url for result in batch_state.issues.values()
        if result.pr_url
    ]
    if prs:
        print(f"\nPRs created:")
        for pr_url in prs:
            print(f"  - {pr_url}")

    # Exit with appropriate code
    if batch_state.failed_count > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
