#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "psutil>=5.9.0", "google-genai", "tree-sitter>=0.23.0", "tree-sitter-javascript>=0.23.0", "tree-sitter-typescript>=0.23.0"]
# ///

"""
ADW Code Audit - Codebase Auditor with Page Tracing and Dependency Analysis

Uses Opus to audit a directory and generate a chunk-based refactoring plan
grouped by affected page. Integrates AST-based dependency analysis to provide:
- High impact summary for LLM context (~100 lines vs 32K)
- Transitive reduction for cleaner dependency graphs
- Cycle detection for atomic refactoring units
- Topological levels for correct refactoring order

Usage: uv run adw_code_audit.py [target_path] [--audit-type general|performance|security]

Example:
    uv run adw_code_audit.py app/src/logic --audit-type performance
"""

import argparse
import sys
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

# Add adws to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from modules.agent import prompt_claude_code
from modules.data_types import AgentPromptRequest
from modules.ast_dependency_analyzer import analyze_dependencies
from modules.graph_algorithms import (
    analyze_graph,
    build_simple_graph,
    GraphAnalysisResult,
)
from modules.high_impact_summary import HighImpactSummary


def run_dependency_analysis(target_path: str, working_dir: Path) -> Tuple[Optional[GraphAnalysisResult], str]:
    """Run AST dependency analysis and graph algorithms.

    Args:
        target_path: Directory to analyze (relative to working_dir)
        working_dir: Project root directory

    Returns:
        Tuple of (GraphAnalysisResult, high_impact_summary_text)
        Returns (None, "") if analysis fails
    """
    try:
        # CRITICAL: Resolve target_path relative to working_dir (project root)
        # The script runs from adws/, but paths like "app/src/logic"
        # must resolve relative to the project root, not adws/
        absolute_target = working_dir / target_path
        print(f"  [AST] Analyzing dependencies in {absolute_target}...")

        # Step 1: AST analysis
        dep_context = analyze_dependencies(str(absolute_target))

        # Step 2: Build simplified graph for algorithms
        simple_graph = build_simple_graph(dep_context)

        # Step 3: Run graph algorithms (transitive reduction, cycle detection, topological levels)
        graph_result = analyze_graph(simple_graph)

        # Step 4: Generate condensed summary
        summary = HighImpactSummary.from_dependency_context(
            dep_context,
            graph_result.cycles,
            graph_result.topological_levels,
            graph_result.edge_reduction_pct
        )

        # Log insights
        print(f"  [Graph] Transitive reduction: {graph_result.edge_reduction_pct:.0%} edges removed")
        print(f"  [Graph] Cycles detected: {graph_result.cycle_count}")
        print(f"  [Graph] Topological levels: {graph_result.level_count}")
        print(f"  [Graph] Files analyzed: {dep_context.total_files}")

        return graph_result, summary.to_prompt_context()

    except Exception as e:
        print(f"  [AST] Warning: Dependency analysis failed: {e}")
        print(f"  [AST] Proceeding without dependency context")
        return None, ""


def run_code_audit_and_plan(
    target_path: str,
    audit_type: str,
    working_dir: Path,
    skip_dependency_analysis: bool = False
) -> Tuple[str, Optional[GraphAnalysisResult]]:
    """Use Opus to audit directory and create refactoring plan grouped by page.

    Args:
        target_path: Path to audit
        audit_type: Type of audit (general, performance, security)
        working_dir: Working directory
        skip_dependency_analysis: If True, skip AST analysis (faster but less context)

    Returns:
        Tuple of (plan_file_path, GraphAnalysisResult)
    """
    print(f"\n{'='*60}")
    print(f"PHASE: CODE AUDIT ({audit_type.upper()}) & PLAN CREATION")
    print(f"{'='*60}")

    # Generate timestamp for output files
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    plan_file = f"adws/adw_plans/{timestamp}_code_refactor_plan.md"
    agent_dir = f"adws/agents/code_audit_{timestamp}"

    # NEW: Pre-compute dependencies with graph algorithms
    graph_result = None
    high_impact_summary = ""

    if not skip_dependency_analysis:
        graph_result, high_impact_summary = run_dependency_analysis(target_path, working_dir)

    # Load prompt from template
    prompt_template_path = Path(__file__).parent / "prompts" / "code_audit_opus.txt"
    if prompt_template_path.exists():
        prompt_template = prompt_template_path.read_text(encoding='utf-8')
        prompt = prompt_template.format(
            target_path=target_path,
            audit_type=audit_type,
            timestamp=timestamp,
            date=datetime.now().strftime('%Y-%m-%d'),
            high_impact_summary=high_impact_summary  # NEW: Inject dependency context
        )
    else:
        # Fallback to hardcoded prompt if file not found
        prompt = f"""/ralph-loop:ralph-loop
Audit the codebase at: {target_path}
Create a chunk-based refactoring plan at: {plan_file}
Group chunks by affected page group.
"""
        # Run Opus session
    output_file = working_dir / agent_dir / "raw_output.jsonl"
    (working_dir / agent_dir).mkdir(parents=True, exist_ok=True)

    print(f"\nStarting Claude Opus audit agent...")
    print(f"Target: {target_path}")
    print(f"Plan will be saved to: {plan_file}")

    # CRITICAL: Disable STRICT_GEMINI mode to allow Claude Opus
    # Save original value and restore after audit
    original_strict_gemini = os.environ.get("STRICT_GEMINI")
    original_adw_provider = os.environ.get("ADW_PROVIDER")

    try:
        # Force Claude provider for audit
        os.environ["STRICT_GEMINI"] = "false"
        os.environ["ADW_PROVIDER"] = "claude"

        request = AgentPromptRequest(
            prompt=prompt,
            adw_id=f"code_audit_{timestamp}",
            agent_name="opus_auditor",
            model="opus",
            output_file=str(output_file),
            working_dir=str(working_dir),
            dangerously_skip_permissions=True
        )

        # Using Claude Opus for comprehensive code audit
        # Opus provides thorough analysis and better chunking organization

        response = prompt_claude_code(request)
    finally:
        # Restore original environment
        if original_strict_gemini is None:
            os.environ.pop("STRICT_GEMINI", None)
        else:
            os.environ["STRICT_GEMINI"] = original_strict_gemini

        if original_adw_provider is None:
            os.environ.pop("ADW_PROVIDER", None)
        else:
            os.environ["ADW_PROVIDER"] = original_adw_provider

    if not response.success:
        print(f"\nAudit failed: {response.output}")
        sys.exit(1)

    print(f"\nAudit completed successfully")

    # Verify plan was created
    plan_path = working_dir / plan_file
    if not plan_path.exists():
        # Sometimes it might be created in a different location or not at all if Claude failed to follow instructions
        print(f"Plan file not found at: {plan_path}")
        # Search for it just in case
        print("Searching for plan file...")
        possible_plans = list(working_dir.glob(f"**/*{timestamp}_code_refactor_plan.md"))
        if possible_plans:
            plan_path = possible_plans[0]
            print(f"Found plan at: {plan_path}")
        else:
            sys.exit(1)

    return str(plan_path.relative_to(working_dir)), graph_result


def main():
    parser = argparse.ArgumentParser(description="ADW Code Audit - Create refactoring plan")
    parser.add_argument("target_path", help="Path to audit")
    parser.add_argument("--audit-type", default="general",
                        help="Type of audit (default: general)")
    parser.add_argument("--skip-deps", action="store_true",
                        help="Skip dependency analysis (faster but less context)")

    args = parser.parse_args()

    # Use current directory as working dir
    working_dir = Path.cwd()

    try:
        plan_file, graph_result = run_code_audit_and_plan(
            args.target_path,
            args.audit_type,
            working_dir,
            skip_dependency_analysis=args.skip_deps
        )
        print(f"\n{'='*60}")
        print("CODE AUDIT COMPLETE")
        print(f"{'='*60}")
        print(f"Plan: {plan_file}")

        if graph_result:
            print(f"\nGraph Analysis:")
            print(f"  - Edge reduction: {graph_result.edge_reduction_pct:.0%}")
            print(f"  - Cycles detected: {graph_result.cycle_count}")
            print(f"  - Topological levels: {graph_result.level_count}")

        print(f"\nNext step:")
        print(f"  uv run adw_code_implement_orchestrator.py {plan_file}")
    except Exception as e:
        print(f"Error during audit: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
