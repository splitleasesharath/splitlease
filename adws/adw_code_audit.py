#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "psutil>=5.9.0", "google-genai"]
# ///

"""
ADW Code Audit - Codebase Auditor with Page Tracing

Uses Opus to audit a directory and generate a chunk-based refactoring plan
grouped by affected page.

Usage: uv run adw_code_audit.py [target_path] [--audit-type general|performance|security]

Example:
    uv run adw_code_audit.py app/src/logic --audit-type performance
"""

import argparse
import sys
import os
from datetime import datetime
from pathlib import Path

# Add adws to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest


def run_code_audit_and_plan(target_path: str, audit_type: str, working_dir: Path) -> str:
    """Use Opus to audit directory and create refactoring plan grouped by page."""
    print(f"\n{'='*60}")
    print(f"PHASE: CODE AUDIT ({audit_type.upper()}) & PLAN CREATION")
    print(f"{'='*60}")

    # Generate timestamp for output files
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    plan_file = f".claude/plans/New/{timestamp}_code_refactor_plan.md"
    agent_dir = f"agents/code_audit_{timestamp}"

    # Load prompt from template
    prompt_template_path = Path(__file__).parent / "prompts" / "code_audit_opus.txt"
    if prompt_template_path.exists():
        prompt_template = prompt_template_path.read_text(encoding='utf-8')
        prompt = prompt_template.format(
            target_path=target_path,
            audit_type=audit_type,
            timestamp=timestamp,
            date=datetime.now().strftime('%Y-%m-%d')
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

    return str(plan_path.relative_to(working_dir))


def main():
    parser = argparse.ArgumentParser(description="ADW Code Audit - Create refactoring plan")
    parser.add_argument("target_path", help="Path to audit")
    parser.add_argument("--audit-type", default="general",
                        help="Type of audit (default: general)")

    args = parser.parse_args()

    # Use current directory as working dir
    working_dir = Path.cwd()

    try:
        plan_file = run_code_audit_and_plan(args.target_path, args.audit_type, working_dir)
        print(f"\n{'='*60}")
        print("CODE AUDIT COMPLETE")
        print(f"{'='*60}")
        print(f"Plan: {plan_file}")
        print(f"\nNext step:")
        print(f"  uv run adw_code_implement_orchestrator.py {plan_file}")
    except Exception as e:
        print(f"Error during audit: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
