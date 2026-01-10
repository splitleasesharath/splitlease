#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW FP Audit - Functional Programming Codebase Auditor

Simple ADW that runs FP audit and generates chunk-based refactoring plan.

Usage: uv run adw_fp_audit.py [target_path] [--severity high|medium|all]

Example:
    uv run adw_fp_audit.py app/src/logic --severity high
"""

import argparse
import sys
from datetime import datetime
from pathlib import Path

# Add adws to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest


def run_fp_audit_and_plan(target_path: str, severity: str, working_dir: Path) -> str:
    """Use Claude Code agent to run FP audit AND create refactoring plan."""
    print(f"\n{'='*60}")
    print("PHASE: FP AUDIT & PLAN CREATION")
    print(f"{'='*60}")

    # Generate timestamp for output files
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    violations_file = f"agents/fp_audit_violations.json"
    plan_file = f".claude/plans/New/{timestamp}_fp_refactor_plan.md"

    # Create prompt for Claude Code agent to do EVERYTHING
    prompt = f"""I need you to audit the codebase for functional programming violations and create a chunk-based refactoring plan.

**Your Task:**

1. **Run the FP audit script:**
   - Use Bash tool to run: `python .claude/skills/functional-code/scripts/fp_audit.py {target_path} --output json --severity {severity} --file {violations_file}`
   - This will generate a JSON file with all violations

2. **Load the /functional-code skill** for FP guidance

3. **Read the violations JSON** at: {violations_file}

4. **Analyze the violations:**
   - Group violations by file to identify high-impact files
   - Count violations by type (MUTATING_METHOD, IO_IN_CORE, IMPERATIVE_LOOP, EXCEPTION_FOR_FLOW)
   - Note severity levels (high, medium, low)
   - Sort files by violation count (highest first)

5. **Create a chunk-based refactoring plan** at: {plan_file}

**CRITICAL: Each violation = ONE CHUNK**

Use this exact structure:

```markdown
# Functional Programming Refactoring Plan

Date: {datetime.now().strftime('%Y-%m-%d')}
Target: {violations_file}
Severity Filter: {severity}

---

## 🔴 CHUNK 1: [Brief description of violation]

**File:** [relative path to file]
**Line:** [line number]
**Violation:** [VIOLATION_TYPE] - [brief explanation]
**Severity:** 🔴 High | 🟡 Medium | 🟢 Low

**Current Code:**
```javascript
[exact current code from the file]
```

**Refactored Code:**
```javascript
[exact replacement code following FP principles]
```

**Why This Matters:**
[1-2 sentences explaining the FP principle being violated and why the fix improves the code]

**Testing:**
- [ ] [Specific test to run]
- [ ] [Verification step]

---

## 🔴 CHUNK 2: [Next violation...]

[Repeat for ALL violations]
```

**FORMATTING RULES:**
1. One chunk = one violation = one atomic fix
2. Use `---` to separate chunks clearly (horizontal rule)
3. Number chunks sequentially (CHUNK 1, 2, 3...)
4. Include emoji severity: 🔴 High, 🟡 Medium, 🟢 Low
5. Show complete before/after code (no truncation, no ellipsis)
6. Include file path, line number, violation type in header
7. Add testing checklist per chunk (2-3 items)
8. Keep chunks independent (can be fixed in any order)

**Important Guidelines:**
- Each chunk should take 5-10 minutes to implement
- Provide EXACT code snippets, not pseudocode
- Line numbers must match the violations JSON exactly
- Show enough surrounding context to locate the code
- For mutations like .push(), show declarative alternatives
- For I/O in core logic, show how to return data instead
- For imperative loops, show map/filter/reduce equivalent
- For exceptions, show Result/Either type pattern

**Example Chunk (for reference):**

---

## 🔴 CHUNK 1: Replace .push() in counterofferWorkflow.js:156

**File:** app/src/logic/workflows/proposals/counterofferWorkflow.js
**Line:** 156
**Violation:** MUTATING_METHOD - Using .push() to mutate array
**Severity:** 🔴 High

**Current Code:**
```javascript
const changes = []
if (priceChanged) {{
  changes.push({{ field: 'price', old: originalPrice, new: newPrice }})
}}
if (datesChanged) {{
  changes.push({{ field: 'dates', old: originalDates, new: newDates }})
}}
```

**Refactored Code:**
```javascript
const changes = [
  priceChanged && {{ field: 'price', old: originalPrice, new: newPrice }},
  datesChanged && {{ field: 'dates', old: originalDates, new: newDates }}
].filter(Boolean)
```

**Why This Matters:**
Mutation makes state unpredictable and testing harder. Declarative array construction clearly shows all possible values upfront, making the code easier to reason about.

**Testing:**
- [ ] Run unit tests for counteroffer workflow
- [ ] Verify proposal changes are tracked correctly
- [ ] Check edge case where no changes occur (empty array)

---
"""

    # Run Claude Code session
    agent_dir = working_dir / "agents" / "fp_planner"
    agent_dir.mkdir(parents=True, exist_ok=True)

    output_file = agent_dir / "raw_output.jsonl"

    print(f"\n🤖 Starting Claude Code agent...")
    print(f"Agent output: {output_file}")
    print(f"\nAgent will:")
    print(f"  1. Run FP audit script on: {target_path}")
    print(f"  2. Analyze violations (severity: {severity})")
    print(f"  3. Create chunk-based plan at: {plan_file}")

    request = AgentPromptRequest(
        prompt=prompt,
        adw_id="fp_audit",
        agent_name="fp_planner",
        model="opus",
        output_file=str(output_file),
        working_dir=str(working_dir),
        dangerously_skip_permissions=True
    )

    response = prompt_claude_code(request)

    if not response.success:
        print(f"\n❌ Claude Code session failed: {response.output}")
        sys.exit(1)

    print(f"\n✅ Claude Code completed successfully")

    # Verify plan was created
    plan_path = working_dir / plan_file

    if not plan_path.exists():
        print(f"❌ Plan file not created: {plan_path}")
        sys.exit(1)

    print(f"\n✅ Plan created: {plan_file}")

    return plan_file


def main():
    parser = argparse.ArgumentParser(description="ADW FP Audit - Create refactoring plan")
    parser.add_argument("target_path", nargs='?', default="app/src/logic",
                        help="Path to audit (default: app/src/logic)")
    parser.add_argument("--severity", choices=["high", "medium", "all"], default="high",
                        help="Filter by severity (default: high)")

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print("ADW FP AUDIT")
    print(f"{'='*60}")

    # Use current directory as working dir
    working_dir = Path.cwd()

    # Run FP audit and create plan using Claude Code agent
    plan_file = run_fp_audit_and_plan(args.target_path, args.severity, working_dir)

    print(f"\n{'='*60}")
    print("✅ FP AUDIT COMPLETE")
    print(f"{'='*60}")
    print(f"Plan: {plan_file}")
    print(f"\nNext step:")
    print(f"  uv run adw_fp_implement.py")


if __name__ == "__main__":
    main()
