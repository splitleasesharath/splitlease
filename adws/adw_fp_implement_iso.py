#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv"]
# ///

"""
ADW FP Implement (Isolated) - Functional Programming Refactoring Executor

Implements FP refactoring plan created by adw_fp_audit_iso.py.
Uses /functional-code skill to guide implementation.

Usage: uv run adw_fp_implement_iso.py <adw-id> [--priority 1|2|3|all]

This workflow:
1. Validates existing worktree from audit phase
2. Loads refactoring plan from .claude/plans/New/
3. Invokes /functional-code skill in Claude Code
4. Implements fixes priority-by-priority
5. Commits changes with detailed changelog

Example:
    uv run adw_fp_implement_iso.py abc12345 --priority 1
    uv run adw_fp_implement_iso.py abc12345 --priority all
"""

import argparse
import sys
from pathlib import Path

# Add adws to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.data_types import ADWState
from adw_modules.state import load_state, save_state
from adw_modules.worktree_ops import validate_worktree_exists
from adw_modules.git_ops import commit_and_push
from adw_modules.agent import run_claude_code_session


def validate_prerequisites(adw_id: str) -> tuple[ADWState, Path]:
    """Validate that audit phase completed successfully."""
    print(f"\n{'='*60}")
    print("PHASE: VALIDATION")
    print(f"{'='*60}")

    # Load state
    state = load_state(adw_id)
    if not state:
        print(f"❌ No state found for ADW {adw_id}")
        print("Run adw_fp_audit_iso.py first")
        sys.exit(1)

    # Validate worktree
    working_dir = Path(state.worktree_path)
    if not validate_worktree_exists(working_dir):
        print(f"❌ Worktree not found: {working_dir}")
        sys.exit(1)

    # Validate plan exists
    if not state.plan_file:
        print("❌ No plan file in state")
        print("Run adw_fp_audit_iso.py first")
        sys.exit(1)

    plan_path = working_dir / state.plan_file
    if not plan_path.exists():
        print(f"❌ Plan file not found: {plan_path}")
        sys.exit(1)

    print(f"✅ ADW ID: {adw_id}")
    print(f"✅ Worktree: {working_dir}")
    print(f"✅ Plan: {state.plan_file}")

    return state, working_dir


def implement_fp_fixes(adw_id: str, chunk_range: str, plan_file: str, working_dir: Path) -> dict:
    """Use Claude Code with /functional-code skill to implement fixes."""
    print(f"\n{'='*60}")
    print("PHASE: IMPLEMENTATION")
    print(f"{'='*60}")
    print(f"Chunk range: {chunk_range}")

    # Parse chunk range
    if chunk_range == "all":
        chunk_instruction = "Implement ALL chunks in sequential order"
    elif "-" in chunk_range:
        start, end = chunk_range.split("-")
        chunk_instruction = f"Implement chunks {start} through {end} ONLY"
    else:
        chunk_instruction = f"Implement ONLY chunk {chunk_range}"

    # Create prompt for Claude Code
    prompt = f"""I need you to implement the functional programming refactoring plan chunk-by-chunk.

**Context:**
- Refactoring plan: {plan_file}
- Target chunks: {chunk_instruction}
- Use /functional-code skill for FP guidance

**Your Task:**
1. Load the /functional-code skill
2. Read the refactoring plan: {plan_file}
3. {chunk_instruction}

**IMPLEMENTATION WORKFLOW (Per Chunk):**

For each chunk in your range:

1. **Read the chunk header** to understand:
   - File path
   - Line number
   - Violation type
   - Severity

2. **Read the actual source file** at the specified location

3. **Locate the exact code** mentioned in "Current Code" section

4. **Apply the refactoring** from "Refactored Code" section:
   - Make ONLY the changes specified
   - Preserve surrounding code exactly
   - Match indentation and style
   - Keep function signatures unchanged unless explicitly stated

5. **Mark the chunk as done** by checking the testing checkboxes in the plan

6. **Move to next chunk** (if in range)

**CRITICAL RULES:**

- ✅ Fix ONLY chunks in your assigned range
- ✅ Work sequentially (CHUNK 1, then CHUNK 2, etc.)
- ✅ Make changes EXACTLY as specified in "Refactored Code"
- ✅ Update the plan file by checking off [ ] → [x] as you complete testing items
- ❌ DO NOT make additional refactorings beyond the chunk
- ❌ DO NOT skip chunks in your range
- ❌ DO NOT combine multiple chunks into one change

**Implementation Guidelines:**

**IMMUTABILITY Fixes:**
- Replace `.push(item)` with `[...arr, item]`
- Replace `.sort()` with `toSorted()` or `[...arr].sort()`
- Replace `arr[i] = val` with `arr.map((v, idx) => idx === i ? val : v)`

**EFFECTS AT EDGES Fixes:**
- Remove `console.log/warn/error` from calculators/rules/processors
- If logging is essential, return error data instead:
  ```javascript
  // Before
  console.error('Failed:', error)
  return null

  // After
  return {{ success: false, error: 'Failed: ...' }}
  ```

**DECLARATIVE STYLE Fixes:**
- Replace simple loops with `map/filter/reduce`:
  ```javascript
  // Before
  const results = []
  for (let i = 0; i < items.length; i++) {{
    if (items[i].active) results.push(items[i].name)
  }}

  // After
  const results = items
    .filter(item => item.active)
    .map(item => item.name)
  ```

**ERRORS AS VALUES Fixes:**
- Replace validation exceptions with Result types:
  ```javascript
  // Before
  if (!isValid(email)) {{
    throw new Error('Invalid email')
  }}

  // After
  if (!isValid(email)) {{
    return {{ valid: false, error: 'Invalid email' }}
  }}
  ```

**Important:**
- Make ONLY the changes specified in the plan
- Do not refactor additional code beyond the violations
- Preserve existing function signatures unless the plan says otherwise
- Test each change individually if possible
- Mark checkboxes in the plan as you complete them

**After implementation:**
Create a summary file at: agents/{adw_id}/fp_implementation_summary.md

Include:
- Files modified
- Violations fixed (by type)
- Any issues encountered
- Remaining violations (if priority != all)
"""

    # Run Claude Code session
    agent_dir = working_dir / "agents" / adw_id / "fp_implementor"
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
    summary_file = working_dir / "agents" / adw_id / "fp_implementation_summary.md"

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
        if 'violations fixed:' in line.lower():
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
    parser = argparse.ArgumentParser(description="ADW FP Implement - Execute refactoring plan")
    parser.add_argument("adw_id", help="ADW ID from adw_fp_audit_iso.py")
    parser.add_argument("--chunks", dest="chunk_range", default="1",
                        help="Which chunks to implement: '1' (single), '1-5' (range), or 'all' (default: 1)")

    args = parser.parse_args()

    print(f"\n{'='*60}")
    print("ADW FP IMPLEMENT (ISOLATED)")
    print(f"{'='*60}")
    print(f"ADW ID: {args.adw_id}")

    # Validate prerequisites
    state, working_dir = validate_prerequisites(args.adw_id)

    # Implement FP fixes
    results = implement_fp_fixes(
        args.adw_id,
        args.chunk_range,
        state.plan_file,
        working_dir
    )

    # Commit changes
    print(f"\n{'='*60}")
    print("PHASE: COMMIT")
    print(f"{'='*60}")

    chunk_label = f"Chunk {args.chunk_range}" if args.chunk_range != "all" else "All chunks"

    commit_message = f"""refactor(fp): implement FP fixes - {chunk_label}

ADW ID: {args.adw_id}
Violations fixed: {results['violations_fixed']}
Files modified: {len(results['files_modified'])}

Implemented functional programming refactoring plan to address
violations identified by FP audit.

Changes:
"""

    for file in results['files_modified'][:10]:  # Limit to 10 files in message
        commit_message += f"- {file}\n"

    if len(results['files_modified']) > 10:
        commit_message += f"- ... and {len(results['files_modified']) - 10} more\n"

    commit_message += f"""
Plan: {state.plan_file}
Summary: {results.get('summary_file', 'N/A')}

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"""

    commit_and_push(
        commit_message=commit_message,
        cwd=working_dir
    )

    print(f"\n{'='*60}")
    print("✅ FP IMPLEMENTATION COMPLETE")
    print(f"{'='*60}")
    print(f"ADW ID: {args.adw_id}")
    print(f"Chunks: {args.chunk_range}")
    print(f"Violations fixed: {results['violations_fixed']}")
    print(f"Files modified: {len(results['files_modified'])}")
    print(f"Worktree: {working_dir}")

    if args.chunk_range != "all":
        if "-" in args.chunk_range:
            end_chunk = int(args.chunk_range.split("-")[1])
            next_chunk = end_chunk + 1
        else:
            next_chunk = int(args.chunk_range) + 1

        print(f"\nNext step (optional):")
        print(f"  uv run adw_fp_implement_iso.py {args.adw_id} --chunks {next_chunk}")
        print(f"  Or continue with range: --chunks {next_chunk}-{next_chunk + 4}")
        print(f"  Or do all remaining: --chunks all")


if __name__ == "__main__":
    main()
