#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv"]
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


def create_implementation_prompt(plan_file: Path) -> str:
    """Generate prompt for Claude Code to implement fixes."""
    print(f"\n{'='*60}")
    print("PHASE: GENERATE PROMPT")
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

    # Output prompt to file
    prompt_file = Path("agents/fp_implementor_prompt.txt")
    prompt_file.parent.mkdir(parents=True, exist_ok=True)
    prompt_file.write_text(prompt)

    print(f"📝 Prompt written to: {prompt_file}")

    return str(prompt_file)


def main():
    print(f"\n{'='*60}")
    print("ADW FP IMPLEMENT")
    print(f"{'='*60}")

    # Find latest plan
    plan_file = find_latest_plan()

    # Generate implementation prompt
    prompt_file = create_implementation_prompt(plan_file)

    print(f"\n{'='*60}")
    print("✅ READY TO IMPLEMENT")
    print(f"{'='*60}")
    print(f"Plan: {plan_file}")
    print(f"Prompt: {prompt_file}")
    print(f"\n🤖 Please run this prompt in Claude Code:")
    print(f"\n   claude {prompt_file}")
    print(f"\nExpected outputs:")
    print(f"  - Modified source files with FP fixes")
    print(f"  - agents/fp_implementation_summary.md")
    print(f"  - Updated plan with checkboxes marked")


if __name__ == "__main__":
    main()
