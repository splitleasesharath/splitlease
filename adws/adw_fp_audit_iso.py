#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv"]
# ///

"""
ADW FP Audit (Isolated) - Functional Programming Codebase Auditor

Runs the functional-code skill's audit script and generates an implementation plan
for fixing FP violations in the codebase.

Usage: uv run adw_fp_audit_iso.py [target_path] [--severity high|medium|all] [adw-id]

This workflow:
1. Creates isolated worktree with unique ports
2. Runs Python FP audit script on target path
3. Invokes /functional-code skill in Claude Code
4. Generates prioritized refactoring plan
5. Commits plan to .claude/plans/New/

Example:
    uv run adw_fp_audit_iso.py app/src/logic --severity high
    uv run adw_fp_audit_iso.py app/src/logic/workflows abc12345
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Add adws to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.data_types import ADWState
from adw_modules.state import load_state, save_state, generate_adw_id
from adw_modules.worktree_ops import create_worktree_with_ports, validate_worktree_exists
from adw_modules.git_ops import commit_and_push
from adw_modules.agent import run_claude_code_session


def run_fp_audit(target_path: str, severity: str, working_dir: Path) -> dict:
    """Run FP audit script and return violations."""
    print(f"\n{'='*60}")
    print("PHASE: FP AUDIT")
    print(f"{'='*60}")
    print(f"Target: {target_path}")
    print(f"Severity filter: {severity}")

    audit_script = working_dir / ".claude/skills/functional-code/scripts/fp_audit.py"

    if not audit_script.exists():
        raise FileNotFoundError(f"FP audit script not found: {audit_script}")

    # Run audit and output JSON
    output_file = working_dir / "agents" / "fp_audit_violations.json"
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

    result = subprocess.run(
        cmd,
        cwd=working_dir,
        capture_output=True,
        text=True
    )

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
        "output_file": str(output_file.relative_to(working_dir))
    }


def create_fp_refactor_plan(audit_results: dict, adw_id: str, working_dir: Path) -> str:
    """Use Claude Code with /functional-code skill to create refactoring plan."""
    print(f"\n{'='*60}")
    print("PHASE: PLAN CREATION")
    print(f"{'='*60}")

    violations = audit_results["violations"]
    violations_file = audit_results["output_file"]

    # Group violations by file
    by_file = {}
    for v in violations:
        file_path = v["file_path"]
        if file_path not in by_file:
            by_file[file_path] = []
        by_file[file_path].append(v)

    # Sort files by violation count (highest first)
    sorted_files = sorted(by_file.items(), key=lambda x: len(x[1]), reverse=True)

    # Create prompt for Claude Code
    prompt = f"""I need you to create a prioritized refactoring plan to fix functional programming violations in the codebase.

**Context:**
- An automated FP audit found {len(violations)} violations
- Violations are documented in: {violations_file}
- Target files ranked by violation count (highest first)

**Top 5 Files Needing Refactoring:**
"""

    for i, (file_path, file_violations) in enumerate(sorted_files[:5], 1):
        prompt += f"\n{i}. {file_path} ({len(file_violations)} violations)\n"

        # Group by violation type
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
1. Load the /functional-code skill for guidance on FP principles
2. Read the violations JSON file: {violations_file}
3. Analyze the violations and prioritize by:
   - Impact on testability (high priority)
   - Violation severity (high > medium > low)
   - Number of violations per file
4. Create a refactoring plan at: .claude/plans/New/{adw_id}_fp_refactor_plan.md

**CRITICAL PLAN STRUCTURE REQUIREMENTS:**

Each violation must be a **DISCRETE, SELF-CONTAINED CHUNK** that can be fixed independently.

Use this structure:

```markdown
# Functional Programming Refactoring Plan

ADW ID: {adw_id}
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
Mutation makes the `changes` array harder to test and reason about. Using declarative array construction is more predictable.

**Testing:**
- [ ] Run unit tests for counteroffer workflow
- [ ] Verify proposal changes are tracked correctly
- [ ] Check that price changes still trigger properly

---

## 🔴 CHUNK 2: Replace .push() in counterofferWorkflow.js:165

**File:** workflows/proposals/counterofferWorkflow.js
**Line:** 165
**Violation:** MUTATING_METHOD - Using .push() to mutate array
**Severity:** 🔴 High

**Current Code:**
```javascript
if (daysChanged) {{
  changes.push({{ field: 'days', old: originalDays, new: newDays }})
}}
```

**Refactored Code:**
```javascript
const changes = [
  priceChanged && {{ field: 'price', old: originalPrice, new: newPrice }},
  daysChanged && {{ field: 'days', old: originalDays, new: newDays }}
].filter(Boolean)
```

**Why This Matters:**
Consolidates all change tracking into a single declarative array construction.

**Testing:**
- [ ] Run unit tests for counteroffer workflow
- [ ] Verify day changes are tracked correctly
- [ ] Check that multiple changes work together

---

## 🟡 CHUNK 3: Remove console.error from extractListingCoordinates.js:46

**File:** processors/listing/extractListingCoordinates.js
**Line:** 46
**Violation:** IO_IN_CORE - I/O operation in core business logic
**Severity:** 🟡 Medium

**Current Code:**
```javascript
catch (error) {{
  console.error('Failed to parse coordinates:', error)
  return null
}}
```

**Refactored Code:**
```javascript
catch (error) {{
  return {{ success: false, error: 'Failed to parse coordinates', details: error.message }}
}}
```

**Why This Matters:**
Core business logic (processors) should not perform I/O like console logging. Return error data instead and let the caller decide how to log.

**Testing:**
- [ ] Run unit tests for coordinate extraction
- [ ] Verify error handling still works
- [ ] Update caller to handle new error format

---

[Continue pattern for all {len(violations)} violations...]

## Implementation Order

Work through chunks sequentially:
1. CHUNK 1 → Test → Commit
2. CHUNK 2 → Test → Commit
3. CHUNK 3 → Test → Commit
...

## References
- Violations JSON: {violations_file}
- FP Principles: /functional-code skill
```

**CRITICAL FORMATTING RULES:**

1. **One chunk = One violation = One atomic fix**
2. **Use horizontal rules (`---`) to separate chunks clearly**
3. **Number each chunk sequentially (CHUNK 1, CHUNK 2, etc.)**
4. **Include emoji severity indicators: 🔴 High, 🟡 Medium, 🟢 Low**
5. **Show complete before/after code (no truncation)**
6. **Include file path, line number, and violation type in chunk header**
7. **Add testing checklist for each chunk**
8. **Keep chunks independent (fixable in any order)**

**Important:**
- Each chunk should be implementable in 5-10 minutes
- No chunk should depend on another chunk being done first
- Provide EXACT code, not pseudocode
- Line numbers must match the violations JSON exactly
"""

    # Run Claude Code session
    agent_dir = working_dir / "agents" / adw_id / "fp_planner"
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

    # Find generated plan
    plan_file = working_dir / ".claude/plans/New" / f"{adw_id}_fp_refactor_plan.md"

    if not plan_file.exists():
        print(f"❌ Plan file not created: {plan_file}")
        sys.exit(1)

    print(f"\n✅ Plan created: {plan_file.relative_to(working_dir)}")

    return str(plan_file.relative_to(working_dir))


def main():
    parser = argparse.ArgumentParser(description="ADW FP Audit - Create refactoring plan")
    parser.add_argument("target_path", nargs='?', default="app/src/logic",
                        help="Path to audit (default: app/src/logic)")
    parser.add_argument("adw_id", nargs='?', help="Resume existing ADW ID")
    parser.add_argument("--severity", choices=["high", "medium", "all"], default="high",
                        help="Filter violations by severity")

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print("ADW FP AUDIT (ISOLATED)")
    print(f"{'='*60}")

    # Generate or use existing ADW ID
    if args.adw_id:
        adw_id = args.adw_id
        print(f"Resuming ADW: {adw_id}")

        # Load existing state
        state = load_state(adw_id)
        if not state:
            print(f"❌ No state found for ADW {adw_id}")
            sys.exit(1)

        working_dir = Path(state.worktree_path)

        # Validate worktree
        if not validate_worktree_exists(working_dir):
            print(f"❌ Worktree not found: {working_dir}")
            sys.exit(1)
    else:
        adw_id = generate_adw_id()
        print(f"Generated ADW ID: {adw_id}")

        # Create isolated worktree
        working_dir, backend_port, frontend_port = create_worktree_with_ports(adw_id)

        print(f"\n✅ Isolated worktree created:")
        print(f"   Path: {working_dir}")
        print(f"   Backend port: {backend_port}")
        print(f"   Frontend port: {frontend_port}")

        # Initialize state
        state = ADWState(
            adw_id=adw_id,
            worktree_path=str(working_dir),
            backend_port=backend_port,
            frontend_port=frontend_port
        )
        save_state(state)

    # Run FP audit
    audit_results = run_fp_audit(args.target_path, args.severity, working_dir)

    # Update state with audit results
    state.plan_file = f".claude/plans/New/{adw_id}_fp_refactor_plan.md"
    save_state(state)

    # Create refactoring plan using Claude Code
    plan_file = create_fp_refactor_plan(audit_results, adw_id, working_dir)

    # Commit plan
    print(f"\n{'='*60}")
    print("PHASE: COMMIT")
    print(f"{'='*60}")

    commit_message = f"""docs(fp): add FP refactoring plan for {args.target_path}

ADW ID: {adw_id}
Violations found: {len(audit_results['violations'])}
Severity filter: {args.severity}

Generated prioritized refactoring plan to address functional programming
violations identified by automated audit.

Plan: {plan_file}
Violations: {audit_results['output_file']}

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"""

    commit_and_push(
        commit_message=commit_message,
        cwd=working_dir
    )

    print(f"\n{'='*60}")
    print("✅ FP AUDIT COMPLETE")
    print(f"{'='*60}")
    print(f"ADW ID: {adw_id}")
    print(f"Plan: {plan_file}")
    print(f"Violations: {len(audit_results['violations'])}")
    print(f"Worktree: {working_dir}")
    print(f"\nNext step:")
    print(f"  uv run adw_fp_implement_iso.py {adw_id}")


if __name__ == "__main__":
    main()
