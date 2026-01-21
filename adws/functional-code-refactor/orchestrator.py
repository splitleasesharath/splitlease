#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "psutil>=5.9.0", "google-genai", "tree-sitter>=0.23.0", "tree-sitter-javascript>=0.23.0", "tree-sitter-typescript>=0.23.0"]
# ///

"""
ADW Simplified FP Refactor Orchestrator - Unified Implementation Pipeline

Simplified orchestration pipeline that eliminates chunk-based parsing:
- Uses /prime + /ralph-loop for persistent audit session
- Single implementation phase (no chunk-by-chunk processing)
- File tracking via git diff (no chunk parsing)
- Deferred validation with file-based ValidationBatch

Workflow:
1. AUDIT: Claude Opus with /prime + /ralph-loop creates implementation plan
2. GRAPH: Run graph algorithms for dependency context (injected into audit)
3. IMPLEMENT: Single Claude session implements entire plan
4. VALIDATE: Build + visual regression
5. COMMIT/RESET: All-or-nothing based on validation result

Usage:
    uv run orchestrator.py <target_path> [--audit-type TYPE]

Example:
    uv run orchestrator.py app/src/logic
    uv run orchestrator.py app/src/logic --audit-type performance
"""

import sys
import argparse
import subprocess
import logging
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Set

# Add adws to path
sys.path.insert(0, str(Path(__file__).parent))

from modules.agent import prompt_claude_code
from modules.data_types import AgentPromptRequest
from modules.run_logger import create_run_logger, RunLogger
from modules.dev_server import DevServerManager
from modules.graph_algorithms import (
    GraphAnalysisResult,
    build_simple_graph,
    analyze_graph,
)
from modules.deferred_validation import (
    ValidationResult,
    OrchestrationResult,
    run_deferred_validation,
    create_validation_batch_from_files,
)
from modules.ast_dependency_analyzer import analyze_dependencies
from modules.scoped_git_ops import create_refactor_scope, get_modified_files_from_git
from code_audit import run_code_audit_and_plan
from modules.webhook import notify_started, notify_in_progress, notify_success, notify_failure


def _cleanup_browser_processes(logger: RunLogger, silent: bool = False) -> None:
    """Kill ALL Playwright/Chrome processes to prevent MCP session conflicts.

    Args:
        logger: RunLogger instance
        silent: If True, don't log the cleanup step
    """
    import platform
    import os

    if platform.system() != "Windows":
        # Unix-like cleanup - aggressive
        subprocess.run(["pkill", "-f", "chrome"], capture_output=True)
        subprocess.run(["pkill", "-f", "chromium"], capture_output=True)
        subprocess.run(["pkill", "-f", "playwright"], capture_output=True)
        subprocess.run(["pkill", "-f", "node.*playwright"], capture_output=True)
        return

    # Windows - aggressive cleanup matching kill_browsers.ps1
    try:
        # Step 1: Kill ALL Chrome/Chromium/Edge processes
        subprocess.run(
            ["powershell", "-Command",
             "Get-Process -Name chrome, chromium, msedge -ErrorAction SilentlyContinue | "
             "Stop-Process -Force -ErrorAction SilentlyContinue"],
            capture_output=True, timeout=15
        )

        # Step 2: Kill node/npx processes (MCP servers)
        subprocess.run(
            ["powershell", "-Command",
             "Get-Process -Name node, npx -ErrorAction SilentlyContinue | "
             "Stop-Process -Force -ErrorAction SilentlyContinue"],
            capture_output=True, timeout=10
        )

        # Give processes time to terminate
        time.sleep(2)

        # Step 3: Clean up ALL Playwright MCP lock files
        local_app_data = os.environ.get("LOCALAPPDATA", "")
        mcp_dirs = [
            Path(local_app_data) / "ms-playwright" / "mcp-chrome-host-live",
            Path(local_app_data) / "ms-playwright" / "mcp-chrome-host-dev",
            Path(local_app_data) / "ms-playwright" / "mcp-chrome-guest-live",
            Path(local_app_data) / "ms-playwright" / "mcp-chrome-guest-dev",
            Path.home() / ".playwright-mcp",
            Path.cwd() / ".playwright-mcp",
        ]

        for mcp_dir in mcp_dirs:
            for lock_name in ["SingletonLock", "SingletonSocket", "SingletonCookie"]:
                lock_path = mcp_dir / lock_name
                if lock_path.exists():
                    lock_path.unlink(missing_ok=True)
                # Also check Default subdirectory
                default_lock = mcp_dir / "Default" / lock_name
                if default_lock.exists():
                    default_lock.unlink(missing_ok=True)

        if not silent:
            logger.step("Browser cleanup complete", notify=False)
    except Exception as e:
        if not silent:
            logger.step(f"Browser cleanup warning: {e}", notify=False)


def implement_full_plan(
    plan_file: Path,
    project_root: Path,
    adws_dir: Path,
    logger: RunLogger
) -> bool:
    """Implement the entire plan in a single Claude session.

    Instead of parsing chunks and implementing one-by-one, this function
    hands the complete plan to Claude and lets it implement all changes
    in a single persistent session.

    Args:
        plan_file: Path to the implementation plan markdown file
        project_root: Project root directory
        adws_dir: adws/ directory (Claude's working directory)
        logger: RunLogger for output

    Returns:
        True if implementation succeeded, False otherwise
    """
    logger.log("  Invoking Claude to implement full plan...")

    # Read the plan file to provide context
    plan_content = plan_file.read_text(encoding='utf-8')

    # Path relative from adws/ for Claude
    plan_path_from_adws = f"../{plan_file.relative_to(project_root)}"

    prompt = f"""/ralph-loop:ralph-loop

You have an implementation plan to execute. The plan is at: {plan_path_from_adws}

## Plan Content

{plan_content}

## Your Task

Implement ALL changes described in the plan above. For each file listed:

1. **Read** the current file content
2. **Locate** the code section to modify (match the "Current Code" block)
3. **Replace** with the "Refactored Code" block EXACTLY as shown
4. **Verify** the file was modified correctly by reading it back

## Rules

- Follow the **Implementation Order** specified in the plan
- Do NOT skip any files
- Do NOT commit changes (we validate first)
- Do NOT run build commands
- If a file doesn't exist or code doesn't match, report the error and continue

## On Completion

When all files are implemented, output:
```
IMPLEMENTATION COMPLETE
Files modified: [count]
```

Begin implementation now.
"""

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    agent_dir = project_root / "adws" / "agents" / "implementation" / f"full_plan_{timestamp}"
    agent_dir.mkdir(parents=True, exist_ok=True)
    output_file = agent_dir / "raw_output.jsonl"

    request = AgentPromptRequest(
        prompt=prompt,
        adw_id=f"implement_plan_{timestamp}",
        agent_name="plan_implementor",
        model="sonnet",  # Use sonnet for implementation speed
        output_file=str(output_file),
        working_dir=str(adws_dir),
        dangerously_skip_permissions=True
    )

    response = prompt_claude_code(request)

    if not response.success:
        logger.log(f"  [FAIL] Implementation failed: {response.output[:200]}")
        return False

    logger.log("  [OK] Implementation session completed")
    return True


def main():
    parser = argparse.ArgumentParser(description="ADW Simplified FP Refactor Orchestrator")
    parser.add_argument("target_path", help="Path to audit (e.g., app/src/logic)")
    parser.add_argument("--audit-type", default="general", help="Type of audit (default: general)")
    parser.add_argument("--skip-visual", action="store_true", help="Skip visual regression testing")
    parser.add_argument("--slack-channel", default="test-bed", help="Slack channel for notifications (default: test-bed)")
    parser.add_argument("--no-slack", action="store_true", help="Disable Slack notifications")
    parser.add_argument("--use-gemini", action="store_true", help="Use Gemini instead of Claude for visual checks")

    args = parser.parse_args()

    # Directory structure:
    # - project_root: Split Lease directory (for file operations, git, dev server)
    # - adws_dir: adws/ directory (where Claude runs for separate context/memory)
    script_dir = Path(__file__).parent.resolve()
    adws_dir = script_dir.parent  # adws/ - Claude's working directory
    project_root = adws_dir.parent  # Project root: Split Lease

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    logger = create_run_logger("simplified_fp_refactor", timestamp, project_root)

    # Track timing and metrics
    start_time = time.time()
    phase_durations: Dict[str, float] = {}
    orchestration_result: Optional[OrchestrationResult] = None

    # Track success for final notification
    run_success = False
    dev_server = None
    graph_result: Optional[GraphAnalysisResult] = None
    dep_context = None
    modified_files: Set[str] = set()

    # Clean up zombie browser processes before starting
    _cleanup_browser_processes(logger)

    try:
        # =====================================================================
        # PHASE 1: AUDIT (Claude Opus with /prime + /ralph-loop)
        # =====================================================================
        phase_start = time.time()
        logger.phase_start("PHASE 1: CODE AUDIT (Claude Opus + /prime + /ralph-loop)")
        logger.step(f"Target: {args.target_path}")
        logger.step(f"Audit type: {args.audit_type}")

        # Webhook: Notify pipeline started
        notify_started("FP Refactor (Simplified)", details=f"Target: {args.target_path}")

        plan_file_relative, graph_result = run_code_audit_and_plan(
            args.target_path,
            args.audit_type,
            project_root,
            adws_dir
        )
        plan_file = project_root / plan_file_relative

        if not plan_file.exists():
            logger.phase_complete("PHASE 1: CODE AUDIT", success=False, error="Plan file not created")
            sys.exit(1)

        logger.step(f"Implementation plan created: {plan_file_relative}")
        phase_durations["audit"] = time.time() - phase_start
        logger.phase_complete("PHASE 1: CODE AUDIT", success=True)

        # =====================================================================
        # PHASE 1.5: GRAPH ANALYSIS (for dependency context - already done in audit)
        # =====================================================================
        phase_start = time.time()
        logger.phase_start("PHASE 1.5: GRAPH ANALYSIS")

        if graph_result is None:
            logger.step("Running graph analysis...")
            try:
                absolute_target = project_root / args.target_path
                dep_context = analyze_dependencies(str(absolute_target))
                simple_graph = build_simple_graph(dep_context)
                graph_result = analyze_graph(simple_graph)
            except Exception as e:
                logger.step(f"Warning: Graph analysis failed: {e}")

        if graph_result:
            logger.step(f"Transitive reduction: {graph_result.edge_reduction_pct:.0%} edges removed")
            logger.step(f"Cycles detected: {graph_result.cycle_count}")
            logger.step(f"Topological levels: {graph_result.level_count}")
        else:
            logger.step("No graph analysis available")

        phase_durations["graph"] = time.time() - phase_start
        logger.phase_complete("PHASE 1.5: GRAPH ANALYSIS", success=True)

        # =====================================================================
        # PHASE 2: DEV SERVER SETUP
        # =====================================================================
        phase_start = time.time()
        logger.phase_start("PHASE 2: DEV SERVER SETUP")

        if (project_root / "app").exists():
            app_dir = project_root / "app"
        elif (project_root.parent / "app").exists():
            app_dir = project_root.parent / "app"
        else:
            app_dir = project_root

        dev_logger = logging.getLogger("dev_server")
        dev_logger.setLevel(logging.INFO)
        if not dev_logger.handlers:
            handler = logging.StreamHandler()
            handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
            dev_logger.addHandler(handler)

        dev_server = DevServerManager(app_dir, dev_logger)
        dev_server.start()  # Actually start the dev server on port 8010
        phase_durations["setup"] = time.time() - phase_start
        logger.phase_complete("PHASE 2: DEV SERVER SETUP", success=True)

        # =====================================================================
        # PHASE 3: IMPLEMENT FULL PLAN (Single Session)
        # =====================================================================
        phase_start = time.time()
        logger.phase_start("PHASE 3: IMPLEMENTING FULL PLAN (Single Session)")

        # Create scoped tracker for rollback
        # NOTE: Don't use base_path here because get_modified_files_from_git() returns
        # complete relative paths (e.g., "adws/functional-code-refactor/modules/agent.py")
        # that should NOT have a base path prepended
        refactor_scope = create_refactor_scope(project_root, base_path="")

        # Implement the entire plan in one session
        implementation_success = implement_full_plan(plan_file, project_root, adws_dir, logger)

        if not implementation_success:
            logger.phase_complete("PHASE 3: IMPLEMENTATION", success=False, error="Implementation failed")

            # Build final result
            orchestration_result = OrchestrationResult(
                success=False,
                phase_reached="implement",
                total_chunks=0,
                chunks_implemented=0,
                topological_levels=graph_result.level_count if graph_result else 0,
                cycles_detected=graph_result.cycle_count if graph_result else 0,
                edge_reduction_pct=graph_result.edge_reduction_pct if graph_result else 0,
                total_duration_seconds=time.time() - start_time,
                phase_durations=phase_durations,
                errors=["Implementation failed"],
                plan_path=str(plan_file_relative)
            )
            logger.log(orchestration_result.to_summary())
            run_success = False

        else:
            # Get modified files from git diff (instead of chunk tracking)
            modified_files = get_modified_files_from_git(project_root)
            logger.step(f"Files modified: {len(modified_files)}")

            # Track files in refactor scope for potential rollback
            refactor_scope.track_files(list(modified_files))

            phase_durations["implement"] = time.time() - phase_start
            logger.phase_complete("PHASE 3: IMPLEMENTATION", success=True)

            # Webhook: Notify implementation complete
            notify_in_progress("Implementation", details=f"{len(modified_files)} files modified")

            # =================================================================
            # PHASE 4: DEFERRED VALIDATION
            # =================================================================
            phase_start = time.time()
            logger.phase_start("PHASE 4: DEFERRED VALIDATION")

            # Get reverse dependencies for page tracing
            reverse_deps = {}
            if dep_context is None:
                try:
                    absolute_target = project_root / args.target_path
                    dep_context = analyze_dependencies(str(absolute_target))
                    reverse_deps = dep_context.reverse_dependencies
                except Exception:
                    pass

            # Build validation batch from file paths (not chunks)
            validation_batch = create_validation_batch_from_files(
                modified_files,
                reverse_deps
            )

            # Run deferred validation
            effective_slack_channel = None if args.no_slack else args.slack_channel
            validation_result = run_deferred_validation(
                validation_batch,
                project_root,
                logger,
                skip_visual=args.skip_visual,
                slack_channel=effective_slack_channel,
                use_claude=not args.use_gemini
            )

            phase_durations["validate"] = time.time() - phase_start

            if validation_result.success:
                # ============================================================
                # SUCCESS: Commit all changes
                # ============================================================
                logger.log("[PASS] All validation passed")

                commit_msg = (
                    f"refactor: Implement FP improvements in {args.target_path}\n\n"
                    f"Files modified: {len(modified_files)}\n"
                    f"Topological levels: {graph_result.level_count if graph_result else 'N/A'}\n"
                    f"Edge reduction: {graph_result.edge_reduction_pct:.0%}" if graph_result else ""
                )

                subprocess.run(["git", "add", "."], cwd=project_root, check=False)
                subprocess.run(["git", "commit", "-m", commit_msg.strip()], cwd=project_root, check=False)

                logger.phase_complete("PHASE 4: DEFERRED VALIDATION", success=True)
                run_success = True

                # Webhook: Notify success
                notify_success("FP Refactor", details=f"{len(modified_files)} files committed")

                # Build final result
                orchestration_result = OrchestrationResult(
                    success=True,
                    phase_reached="validate",
                    total_chunks=len(modified_files),  # Use file count instead of chunk count
                    chunks_implemented=len(modified_files),
                    topological_levels=graph_result.level_count if graph_result else 0,
                    cycles_detected=graph_result.cycle_count if graph_result else 0,
                    edge_reduction_pct=graph_result.edge_reduction_pct if graph_result else 0,
                    total_duration_seconds=time.time() - start_time,
                    phase_durations=phase_durations,
                    plan_path=str(plan_file_relative)
                )

            else:
                # ============================================================
                # FAIL: Reset modified files, preserve other changes
                # ============================================================
                logger.log(f"[FAIL] Validation failed with {len(validation_result.errors)} errors")

                # SCOPED RESET: Only reset refactored files
                logger.log(refactor_scope.summarize())
                refactor_scope.reset_scoped(logger)

                logger.phase_complete("PHASE 4: DEFERRED VALIDATION", success=False,
                                     error=f"{len(validation_result.errors)} errors")
                run_success = False

                # Webhook: Notify failure
                notify_failure("FP Refactor", error=f"{len(validation_result.errors)} validation errors")

                # Build final result
                orchestration_result = OrchestrationResult(
                    success=False,
                    phase_reached="validate",
                    total_chunks=len(modified_files),
                    chunks_implemented=len(modified_files),
                    topological_levels=graph_result.level_count if graph_result else 0,
                    cycles_detected=graph_result.cycle_count if graph_result else 0,
                    edge_reduction_pct=graph_result.edge_reduction_pct if graph_result else 0,
                    total_duration_seconds=time.time() - start_time,
                    phase_durations=phase_durations,
                    errors=[e.message for e in validation_result.errors[:10]],
                    plan_path=str(plan_file_relative)
                )

        # =====================================================================
        # PHASE 5: SUMMARY
        # =====================================================================
        if orchestration_result:
            logger.summary(
                total_chunks=orchestration_result.total_chunks,
                chunks_implemented=orchestration_result.chunks_implemented,
                topological_levels=orchestration_result.topological_levels,
                cycles_detected=orchestration_result.cycles_detected,
                edge_reduction_pct=f"{orchestration_result.edge_reduction_pct:.0%}",
                total_duration=f"{orchestration_result.total_duration_seconds:.1f}s",
                success=orchestration_result.success
            )

            logger.log(f"\n{orchestration_result.to_summary()}")

            # Send final result to Slack
            try:
                from modules.slack_client import create_slack_client_from_env
                slack_client = create_slack_client_from_env(default_channel=args.slack_channel)
                slack_msg = orchestration_result.to_slack_message()
                slack_response = slack_client.send_message(text=slack_msg)
                if slack_response.ok:
                    logger.log("[Slack] Final result notification sent")
                elif slack_response.error:
                    logger.log(f"[Slack] Failed to send: {slack_response.error}")
            except Exception as slack_err:
                logger.log(f"[Slack] Failed to send notification: {slack_err}")

    except Exception as e:
        logger.error(e, context="Orchestrator crashed")

        # Webhook: Notify crash
        notify_failure("FP Refactor", error=str(e)[:100])

        # Build error result
        orchestration_result = OrchestrationResult(
            success=False,
            phase_reached="error",
            total_chunks=0,
            chunks_implemented=0,
            topological_levels=0,
            cycles_detected=0,
            edge_reduction_pct=0,
            total_duration_seconds=time.time() - start_time,
            phase_durations=phase_durations,
            errors=[str(e)]
        )

        sys.exit(1)
    finally:
        if dev_server and dev_server.is_running():
            dev_server.stop()
        logger.finalize(success=run_success)


if __name__ == "__main__":
    main()
