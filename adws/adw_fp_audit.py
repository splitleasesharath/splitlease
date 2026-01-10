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
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Add adws to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.agent import run_claude_code_session


def run_fp_audit(target_path: str, severity: str) -> dict:
    """Run FP audit script and return violations."""
    print(f"\n{'='*60}")
    print("PHASE: FP AUDIT")
    print(f"{'='*60}")
    print(f"Target: {target_path}")
    print(f"Severity filter: {severity}")

    audit_script = Path(".claude/skills/functional-code/scripts/fp_audit.py")

    if not audit_script.exists():
        raise FileNotFoundError(f"FP audit script not found: {audit_script}")

    # Run audit and output JSON
    output_file = Path("agents/fp_audit_violations.json")
    output_file.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        "python",
        str(audit_script),
        target_path,
        "--output", "json",
        "--severity", severity,
        "--file", str(output_file)
    ]

    print(f"\nRunning: {' '.join(cmd)}")

    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"❌ Audit failed: {result.stderr}")
        sys.exit(1)

    print(result.stdout)

    # Load violations
    with open(output_file, 'r') as f:
        violations = json.load(f)

    print(f"\n✅ Found {len(violations)} violations")

    return {
        "violations": violations,
        "output_file": str(output_file)
    }


def create_fp_refactor_plan(audit_results: dict, working_dir: Path) -> str:
    """Use Claude Code with /functional-code skill to create refactoring plan."""
    print(f"\n{'='*60}")
    print("PHASE: PLAN CREATION")
    print(f"{'='*60}")

    violations = audit_results["violations"]
    violations_file = audit_results["output_file"]

    # Generate timestamp for plan file
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    plan_file = f".claude/plans/New/{timestamp}_fp_refactor_plan.md"

    # Group violations by file
    by_file = {}
    for v in violations:
        file_path = v["file_path"]
        if file_path not in by_file:
            by_file[file_path] = []
        by_file[file_path].append(v)

    # Sort files by violation count
    sorted_files = sorted(by_file.items(), key=lambda x: len(x[1]), reverse=True)

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    plan_file = f".claude/plans/New/{timestamp}_fp_refactor_plan.md"

    # Create prompt for Claude Code
    prompt = f"""I need you to create a chunk-based refactoring plan to fix functional programming violations.

**Context:**
- Automated FP audit found {len(violations)} violations
- Violations documented in: {violations_file}
- Files ranked by violation count (highest first)

**Top 5 Files Needing Refactoring:**
"""

    for i, (file_path, file_violations) in enumerate(sorted_files[:5], 1):
        prompt += f"\n{i}. {file_path} ({len(file_violations)} violations)\n"

        by_type = {}
        for v in file_violations:
            vtype = v["violation_type"]
            if vtype not in by_type:
                by_type[vtype] = []
            by_type[vtype].append(v)

        for vtype, viols in by_type.items():
            prompt += f"   - {vtype.replace('_', ' ').title()}: {len(viols)} instances\n"

    prompt += f"""

**Your Task:**
1. Load the /functional-code skill
2. Read the violations JSON: {violations_file}
3. Create a chunk-based refactoring plan at: {plan_file}

**CRITICAL: Each violation = ONE CHUNK**

Use this structure:

```markdown
# Functional Programming Refactoring Plan

Date: {datetime.now().strftime('%Y-%m-%d')}
Total Violations: {len(violations)}
Target: {violations_file}

---

## 🔴 CHUNK 1: Replace .push() in counterofferWorkflow.js:156

**File:** workflows/proposals/counterofferWorkflow.js
**Line:** 156
**Violation:** MUTATING_METHOD - Using .push() to mutate array
**Severity:** 🔴 High

**Current Code:**
```javascript
const changes = []
if (priceChanged) {{
  changes.push({{ field: 'price', old: originalPrice, new: newPrice }})
}}
```

**Refactored Code:**
```javascript
const changes = [
  priceChanged && {{ field: 'price', old: originalPrice, new: newPrice }}
].filter(Boolean)
```

**Why This Matters:**
Mutation makes testing harder. Declarative array construction is more predictable.

**Testing:**
- [ ] Run unit tests for counteroffer workflow
- [ ] Verify proposal changes are tracked correctly

---

## 🔴 CHUNK 2: [Next violation...]

---

[Continue for all {len(violations)} violations]
```

**FORMATTING RULES:**
1. One chunk = one violation = one atomic fix
2. Use `---` to separate chunks clearly
3. Number chunks sequentially (CHUNK 1, 2, 3...)
4. Include emoji severity: 🔴 High, 🟡 Medium, 🟢 Low
5. Show complete before/after code (no truncation)
6. Include file path, line number, violation type in header
7. Add testing checklist per chunk
8. Keep chunks independent (fixable in any order)

**Important:**
- Each chunk should take 5-10 minutes to implement
- Provide EXACT code, not pseudocode
- Line numbers must match the violations JSON
"""

    # Run Claude Code session
    agent_dir = working_dir / "agents" / "fp_planner"
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

    # Run FP audit
    audit_results = run_fp_audit(args.target_path, args.severity)

    # Create refactoring plan using Claude Code
    plan_file = create_fp_refactor_plan(audit_results, working_dir)

    print(f"\n{'='*60}")
    print("✅ FP AUDIT COMPLETE")
    print(f"{'='*60}")
    print(f"Violations: {len(audit_results['violations'])}")
    print(f"Violations JSON: {audit_results['output_file']}")
    print(f"Plan: {plan_file}")
    print(f"\nNext step:")
    print(f"  uv run adw_fp_implement.py")


if __name__ == "__main__":
    main()
