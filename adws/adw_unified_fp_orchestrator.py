#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "psutil>=5.9.0", "google-genai", "tree-sitter>=0.23.0", "tree-sitter-javascript>=0.23.0", "tree-sitter-typescript>=0.23.0"]
# ///

"""
ADW Unified FP Refactor Orchestrator - Complete Pipeline with Deferred Validation

Enhanced orchestration pipeline with:
- Dependency graph analysis (transitive reduction, cycle detection, topological levels)
- Topology-based chunk ordering (leaf-first)
- Deferred validation (all chunks implemented before single build/visual check)
- Single commit/reset at the end (no per-chunk commits)

Workflow:
1. AUDIT: Claude Opus audits directory with dependency context
2. GRAPH: Run graph algorithms on dependency data
3. PARSE: Extract and topology-sort chunks by level
4. IMPLEMENT: Implement all chunks (syntax check only, no build per chunk)
5. VALIDATE: Single deferred validation (build + optional visual)
6. COMMIT/RESET: All-or-nothing based on validation result

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
import time
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict

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
from adw_modules.graph_algorithms import (
    GraphAnalysisResult,
    build_simple_graph,
    analyze_graph,
)
from adw_modules.topology_sort import (
    topology_sort_chunks_with_graph,
    TopologySortResult,
    get_chunk_level_stats,
)
from adw_modules.deferred_validation import (
    ValidationBatch,
    ValidationResult,
    OrchestrationResult,
    run_deferred_validation,
)
from adw_modules.ast_dependency_analyzer import analyze_dependencies
from adw_modules.scoped_git_ops import RefactorScope, create_refactor_scope
from adw_modules.test_driven_validation import (
    generate_test_suite_for_chunk,
    run_tests_until_predictable,
    run_tests_before_refactor,
    run_tests_after_refactor,
    TestSuite,
)
from adw_code_audit import run_code_audit_and_plan


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


def implement_chunk_syntax_only(
    chunk: ChunkData,
    working_dir: Path,
    logger: RunLogger
) -> bool:
    """Implement a single chunk with syntax validation only (no build check).

    This is the fast path for deferred validation - we rely on syntax
    checking in the prompt and defer full build verification until all
    chunks are implemented.

    Args:
        chunk: ChunkData to implement
        working_dir: Project working directory
        logger: RunLogger for output

    Returns:
        True if implementation succeeded, False on syntax/agent errors
    """
    logger.log(f"    Implementing chunk {chunk.number}: {chunk.title}")

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
3. **BEFORE writing**: Validate the refactored code has valid JavaScript/JSX syntax:
   - Check for balanced braces, brackets, and parentheses
   - Verify all strings are properly closed
   - Confirm JSX tags are properly closed
   - Check import statements are valid
4. Replace the current code with the refactored code EXACTLY as shown.
5. **AFTER writing**: Read the file back and verify the change was applied correctly.
6. Do NOT commit.
7. Do NOT run build commands.

**CRITICAL**: If you detect ANY syntax issues in the refactored code, STOP and report the error instead of writing broken code.
"""
    agent_dir = working_dir / "adws" / "agents" / "implementation" / f"chunk_{chunk.number}"
    agent_dir.mkdir(parents=True, exist_ok=True)
    output_file = agent_dir / "raw_output.jsonl"

    request = AgentPromptRequest(
        prompt=prompt,
        adw_id=f"refactor_chunk_{chunk.number}",
        agent_name="chunk_implementor",
        model="sonnet",
        output_file=str(output_file),
        working_dir=str(working_dir),
        dangerously_skip_permissions=True
    )

    response = prompt_claude_code(request)
    if not response.success:
        logger.log(f"    [FAIL] Chunk {chunk.number} implementation failed: {response.output[:100]}")
        return False

    logger.log(f"    [OK] Chunk {chunk.number} implemented (deferred validation)")
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
    parser.add_argument("--limit", type=int, help="Limit number of chunks to implement")
    parser.add_argument("--audit-type", default="general", help="Type of audit (default: general)")
    parser.add_argument("--skip-visual", action="store_true", help="Skip visual regression testing")
    parser.add_argument("--legacy", action="store_true", help="Use legacy per-chunk validation (slower)")

    args = parser.parse_args()

    # CRITICAL: working_dir must be the PROJECT ROOT (Split Lease - Dev), not adws/
    # This allows Gemini agent to access files in app/, Documentation/, etc.
    script_dir = Path(__file__).parent.resolve()
    working_dir = script_dir.parent  # Project root: Split Lease - Dev

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    logger = create_run_logger("unified_fp_refactor", timestamp, working_dir)

    # Track timing and metrics for OrchestrationResult
    start_time = time.time()
    phase_durations: Dict[str, float] = {}
    orchestration_result: Optional[OrchestrationResult] = None

    # Track success for final notification
    run_success = False
    dev_server = None
    graph_result: Optional[GraphAnalysisResult] = None
    dep_context = None

    # Clean up zombie browser processes before starting
    _cleanup_browser_processes(logger)

    try:
        # =====================================================================
        # PHASE 1: AUDIT (Claude Opus with dependency context)
        # =====================================================================
        phase_start = time.time()
        logger.phase_start("PHASE 1: CODE AUDIT (Claude Opus)")
        logger.step(f"Target: {args.target_path}")
        logger.step(f"Audit type: {args.audit_type}")

        plan_file_relative, graph_result = run_code_audit_and_plan(
            args.target_path,
            args.audit_type,
            working_dir
        )
        plan_file = working_dir / plan_file_relative

        if not plan_file.exists():
            logger.phase_complete("PHASE 1: CODE AUDIT", success=False, error="Plan file not created")
            sys.exit(1)

        logger.step(f"Plan created: {plan_file_relative}")
        phase_durations["audit"] = time.time() - phase_start
        logger.phase_complete("PHASE 1: CODE AUDIT", success=True)

        # =====================================================================
        # PHASE 1.5: GRAPH ANALYSIS (if not already done in audit)
        # =====================================================================
        phase_start = time.time()
        logger.phase_start("PHASE 1.5: GRAPH ANALYSIS")

        if graph_result is None:
            logger.step("Running graph analysis (was skipped in audit)...")
            try:
                # CRITICAL: Resolve target_path relative to working_dir (project root)
                # The orchestrator runs from adws/, but paths like "app/src/logic"
                # must resolve relative to the project root, not adws/
                absolute_target = working_dir / args.target_path
                dep_context = analyze_dependencies(str(absolute_target))
                simple_graph = build_simple_graph(dep_context)
                graph_result = analyze_graph(simple_graph)
            except Exception as e:
                logger.step(f"Warning: Graph analysis failed: {e}")
                logger.step("Proceeding without topological ordering")

        if graph_result:
            logger.step(f"Transitive reduction: {graph_result.edge_reduction_pct:.0%} edges removed")
            logger.step(f"Cycles detected: {graph_result.cycle_count}")
            logger.step(f"Topological levels: {graph_result.level_count}")
        else:
            logger.step("No graph analysis available - using original chunk order")

        phase_durations["graph"] = time.time() - phase_start
        logger.phase_complete("PHASE 1.5: GRAPH ANALYSIS", success=True)

        # =====================================================================
        # PHASE 2: PARSE PLAN & TOPOLOGY SORT
        # =====================================================================
        phase_start = time.time()
        logger.phase_start("PHASE 2: PARSING PLAN & TOPOLOGY SORT")

        page_groups = extract_page_groups(plan_file)
        logger.step(f"Found {len(page_groups)} page groups")

        # Flatten all chunks for topology sort
        all_chunks: List[ChunkData] = []
        for page_path, chunks in page_groups.items():
            all_chunks.extend(chunks)
            logger.step(f"  {page_path}: {len(chunks)} chunks", notify=False)

        # Apply topology sort if we have graph data
        sort_result: Optional[TopologySortResult] = None
        if graph_result:
            sort_result = topology_sort_chunks_with_graph(all_chunks, graph_result)
            stats = get_chunk_level_stats(sort_result)
            logger.step(f"Topology sort: {stats['total_chunks']} chunks across {stats['total_levels']} levels")

            if stats['chunks_in_cycles'] > 0:
                logger.step(f"WARNING: {stats['chunks_in_cycles']} chunks in {stats['cycle_count']} cycle groups - will refactor atomically")

            # Use sorted chunks
            all_chunks = sort_result.sorted_chunks
        else:
            logger.step("Using original chunk order (no graph data)")

        phase_durations["parse"] = time.time() - phase_start
        logger.phase_complete("PHASE 2: PARSING PLAN & TOPOLOGY SORT", success=True)

        # =====================================================================
        # PHASE 3: SETUP DEV SERVER
        # =====================================================================
        phase_start = time.time()
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
        phase_durations["setup"] = time.time() - phase_start
        logger.phase_complete("PHASE 3: DEV SERVER SETUP", success=True)

        # =====================================================================
        # PHASE 4: IMPLEMENT ALL CHUNKS (No per-chunk validation)
        # =====================================================================
        phase_start = time.time()
        logger.phase_start("PHASE 4: IMPLEMENTING ALL CHUNKS (Deferred Validation)")

        chunks_implemented = 0
        implementation_failed = False

        # Apply limit if specified
        chunks_to_process = all_chunks[:args.limit] if args.limit else all_chunks
        total_chunks = len(chunks_to_process)

        # Create scoped tracker for files modified during refactoring
        # This allows us to reset ONLY refactored files on failure, preserving pipeline fixes
        # Pass target_path as base_path so chunk paths get properly resolved
        # (chunks use relative paths like "constants/proposalStatuses.js")
        refactor_scope = create_refactor_scope(working_dir, base_path=args.target_path)

        logger.step(f"Processing {total_chunks} chunks...")

        # Group by level if we have sort result
        if sort_result:
            for level_idx, level_chunks in enumerate(sort_result.levels):
                # Filter to chunks we're processing
                level_chunks_filtered = [c for c in level_chunks if c in chunks_to_process]
                if not level_chunks_filtered:
                    continue

                logger.step(f"Level {level_idx}: {len(level_chunks_filtered)} chunks")

                for chunk in level_chunks_filtered:
                    # Track file in refactor scope BEFORE implementation
                    refactor_scope.track_from_chunk(chunk)

                    success = implement_chunk_syntax_only(chunk, working_dir, logger)
                    if not success:
                        logger.log(f"  [FAIL] Syntax error in chunk {chunk.number}, aborting...")
                        implementation_failed = True
                        break
                    chunks_implemented += 1

                if implementation_failed:
                    break
        else:
            # No topology sort - process in original order
            for chunk in chunks_to_process:
                # Track file in refactor scope BEFORE implementation
                refactor_scope.track_from_chunk(chunk)

                success = implement_chunk_syntax_only(chunk, working_dir, logger)
                if not success:
                    logger.log(f"  [FAIL] Syntax error in chunk {chunk.number}, aborting...")
                    implementation_failed = True
                    break
                chunks_implemented += 1

        phase_durations["implement"] = time.time() - phase_start

        if implementation_failed:
            logger.log(f"Implementation failed at chunk level, resetting...")
            # SCOPED RESET: Only reset refactored files, preserve pipeline fixes
            logger.log(refactor_scope.summarize())
            refactor_scope.reset_scoped(logger)
            logger.phase_complete("PHASE 4: IMPLEMENTATION", success=False, error="Syntax error")

            # Build final result
            orchestration_result = OrchestrationResult(
                success=False,
                phase_reached="implement",
                total_chunks=total_chunks,
                chunks_implemented=chunks_implemented,
                topological_levels=graph_result.level_count if graph_result else 0,
                cycles_detected=graph_result.cycle_count if graph_result else 0,
                edge_reduction_pct=graph_result.edge_reduction_pct if graph_result else 0,
                total_duration_seconds=time.time() - start_time,
                phase_durations=phase_durations,
                errors=["Implementation failed - syntax error"],
                plan_path=str(plan_file_relative)
            )
            logger.log(orchestration_result.to_summary())
            run_success = False

        else:
            logger.step(f"Implemented {chunks_implemented}/{total_chunks} chunks")
            logger.phase_complete("PHASE 4: IMPLEMENTATION", success=True)

            # =================================================================
            # PHASE 5: DEFERRED VALIDATION
            # =================================================================
            phase_start = time.time()
            logger.phase_start("PHASE 5: DEFERRED VALIDATION")

            # Get reverse dependencies for validation batch
            reverse_deps = {}
            if dep_context is None:
                try:
                    # Resolve target_path relative to working_dir (project root)
                    absolute_target = working_dir / args.target_path
                    dep_context = analyze_dependencies(str(absolute_target))
                    reverse_deps = dep_context.reverse_dependencies
                except Exception:
                    pass  # Proceed without reverse deps

            # Build validation batch
            if sort_result:
                validation_batch = ValidationBatch.from_topology_result(
                    sort_result,
                    reverse_deps
                )
            else:
                from adw_modules.deferred_validation import create_validation_batch_from_chunks
                validation_batch = create_validation_batch_from_chunks(
                    chunks_to_process,
                    reverse_deps
                )

            # Run deferred validation
            validation_result = run_deferred_validation(
                validation_batch,
                working_dir,
                logger,
                skip_visual=args.skip_visual
            )

            phase_durations["validate"] = time.time() - phase_start

            if validation_result.success:
                # ============================================================
                # SUCCESS: Commit all changes
                # ============================================================
                logger.log(f"[PASS] All validation passed")

                chunk_ids = ", ".join(str(c.number) for c in chunks_to_process)
                commit_msg = (
                    f"refactor: Implement {chunks_implemented} chunks across "
                    f"{graph_result.level_count if graph_result else 1} levels\n\n"
                    f"Chunks: {chunk_ids}\n"
                    f"Edge reduction: {graph_result.edge_reduction_pct:.0%}\n" if graph_result else ""
                    f"Cycles: {graph_result.cycle_count}\n" if graph_result else ""
                )

                subprocess.run(["git", "add", "."], cwd=working_dir, check=False)
                subprocess.run(["git", "commit", "-m", commit_msg.strip()], cwd=working_dir, check=False)

                logger.phase_complete("PHASE 5: DEFERRED VALIDATION", success=True)
                run_success = True

                # Build final result
                orchestration_result = OrchestrationResult(
                    success=True,
                    phase_reached="validate",
                    total_chunks=total_chunks,
                    chunks_implemented=chunks_implemented,
                    topological_levels=graph_result.level_count if graph_result else 0,
                    cycles_detected=graph_result.cycle_count if graph_result else 0,
                    edge_reduction_pct=graph_result.edge_reduction_pct if graph_result else 0,
                    total_duration_seconds=time.time() - start_time,
                    phase_durations=phase_durations,
                    plan_path=str(plan_file_relative)
                )

            else:
                # ============================================================
                # FAIL: Reset refactored files only, preserve pipeline fixes
                # ============================================================
                logger.log(f"[FAIL] Validation failed with {len(validation_result.errors)} errors")

                # SCOPED RESET: Only reset refactored files, preserve pipeline fixes
                logger.log(refactor_scope.summarize())
                refactor_scope.reset_scoped(logger)

                # Report affected chunks
                if validation_result.affected_chunks:
                    logger.log("Chunks likely causing errors:")
                    for chunk in validation_result.affected_chunks[:5]:
                        logger.log(f"  - Chunk {chunk.number}: {chunk.file_path}")

                logger.phase_complete("PHASE 5: DEFERRED VALIDATION", success=False,
                                     error=f"{len(validation_result.errors)} errors")
                run_success = False

                # Build final result
                orchestration_result = OrchestrationResult(
                    success=False,
                    phase_reached="validate",
                    total_chunks=total_chunks,
                    chunks_implemented=chunks_implemented,
                    topological_levels=graph_result.level_count if graph_result else 0,
                    cycles_detected=graph_result.cycle_count if graph_result else 0,
                    edge_reduction_pct=graph_result.edge_reduction_pct if graph_result else 0,
                    total_duration_seconds=time.time() - start_time,
                    phase_durations=phase_durations,
                    errors=[e.message for e in validation_result.errors[:10]],
                    affected_chunks=[c.number for c in validation_result.affected_chunks],
                    plan_path=str(plan_file_relative)
                )

        # =====================================================================
        # PHASE 6: SUMMARY
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

    except Exception as e:
        logger.error(e, context="Orchestrator crashed")

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
