#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW FP Implement - Functional Programming Refactoring Executor

Implements FP refactoring plan created by adw_fp_audit.py.
Uses /functional-code skill to guide implementation.

Usage: uv run adw_fp_implement.py

This workflow:
1. Finds the latest refactoring plan in .claude/plans/New/
2. Invokes /functional-code skill in Claude Code
3. Implements ALL fixes in the plan
4. Outputs implementation summary

Example:
    uv run adw_fp_implement.py
"""

import sys
from pathlib import Path
from datetime import datetime

# Add adws to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.agent import run_claude_code_session


def find_latest_plan() -> Path:
    """Find the most recent FP refactoring plan."""
    print(f"\n{'='*60}")
    print("PHASE: FIND PLAN")
    print(f"{'='*60}")

    plans_dir = Path(".claude/plans/New")

    if not plans_dir.exists():
        print(f"❌ Plans directory not found: {plans_dir}")
        sys.exit(1)

    # Find all FP refactor plans
    fp_plans = list(plans_dir.glob("*_fp_refactor_plan.md"))

    if not fp_plans:
        print("❌ No FP refactoring plans found in .claude/plans/New/")
        print("Run adw_fp_audit.py first to generate a plan")
        sys.exit(1)

    # Sort by modification time, get most recent
    latest_plan = max(fp_plans, key=lambda p: p.stat().st_mtime)

    print(f"✅ Found plan: {latest_plan.name}")
    print(f"   Modified: {datetime.fromtimestamp(latest_plan.stat().st_mtime).strftime('%Y-%m-%d %H:%M:%S')}")

    return latest_plan


def implement_fp_fixes(plan_file: Path, working_dir: Path) -> dict:
    """Use Claude Code to implement fixes from the plan."""
    print(f"\n{'='*60}")
    print("PHASE: IMPLEMENTATION")
    print(f"{'='*60}")

    prompt = f"""I need you to implement the functional programming refactoring plan.

**Context:**
- Refactoring plan: {plan_file}
- Use /functional-code skill for FP guidance

**Your Task:**
1. Load the /functional-code skill
2. Read the refactoring plan: {plan_file}
3. Implement ALL the fixes specified in the plan

**Implementation Rules:**
- Follow the plan EXACTLY as written
- Each chunk in the plan specifies:
  - The file to change
  - The line number
  - The current code
  - The refactored code
- Make ONLY the changes specified
- Do not add additional refactorings
- Update the plan checkboxes as you complete testing items

**After implementation:**
Create a summary file at: agents/fp_implementation_summary.md

Include:
- Total chunks completed
- Files modified (list)
- Violations fixed (count by type)
- Any issues encountered

**Important:**
- Work through chunks sequentially
- Test each file after modification
- Mark testing checkboxes in the plan as you complete them
"""

    # Run Claude Code session
    agent_dir = working_dir / "agents" / "fp_implementor"
    agent_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n🤖 Starting Claude Code session...")
    print(f"Agent output: {agent_dir / 'raw_output.jsonl'}")

    success = run_claude_code_session(
        prompt=prompt,
        agent_dir=agent_dir,
        working_dir=working_dir
    )

    if not success:
        print("❌ Claude Code session failed")
        sys.exit(1)

    # Load implementation summary
    summary_file = working_dir / "agents" / "fp_implementation_summary.md"

    if not summary_file.exists():
        print("⚠️ No implementation summary created")
        return {
            "files_modified": [],
            "violations_fixed": 0
        }

    summary_content = summary_file.read_text()

    print(f"\n✅ Implementation complete")
    print(f"\nSummary:\n{summary_content}")

    # Parse summary (simplified)
    files_modified = []
    violations_fixed = 0

    for line in summary_content.split('\n'):
        if line.startswith('- ') and '.js' in line:
            files_modified.append(line.strip('- ').strip())
        if 'violations fixed:' in line.lower() or 'chunks completed:' in line.lower():
            try:
                violations_fixed = int(line.split(':')[1].strip())
            except:
                pass

    return {
        "files_modified": files_modified,
        "violations_fixed": violations_fixed,
        "summary_file": str(summary_file.relative_to(working_dir))
    }


def main():
    print(f"\n{'='*60}")
    print("ADW FP IMPLEMENT")
    print(f"{'='*60}")

    # Use current directory as working dir
    working_dir = Path.cwd()

    # Find latest plan
    plan_file = find_latest_plan()

    # Implement fixes using Claude Code
    results = implement_fp_fixes(plan_file, working_dir)

    print(f"\n{'='*60}")
    print("✅ FP IMPLEMENTATION COMPLETE")
    print(f"{'='*60}")
    print(f"Plan: {plan_file}")
    print(f"Violations fixed: {results['violations_fixed']}")
    print(f"Files modified: {len(results['files_modified'])}")


if __name__ == "__main__":
    main()
