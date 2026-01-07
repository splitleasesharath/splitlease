#!/usr/bin/env python3
"""
Stop hook: Commit Tracker - Auto-instructs goodbye-skill
Checks commit count and tells Claude to run goodbye-skill when >= 20.
"""

import json
import sys
from pathlib import Path


def read_commit_count():
    """Read current commit count from file."""
    counter_file = Path(".claude/commit_count.txt")
    if not counter_file.exists():
        return 0
    try:
        return int(counter_file.read_text().strip())
    except (ValueError, FileNotFoundError):
        return 0


def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        # Get current commit count
        commit_count = read_commit_count()

        # Check if we've hit the threshold
        if commit_count >= 20:
            # Instruct Claude to run goodbye-skill
            print("\n" + "="*60, file=sys.stderr)
            print("🎯 COMMIT THRESHOLD REACHED!", file=sys.stderr)
            print("="*60, file=sys.stderr)
            print(f"\n📊 You've made {commit_count} commits in this session.", file=sys.stderr)
            print("\n⚠️  AUTOMATIC ACTION REQUIRED:", file=sys.stderr)
            print("   Please run the goodbye-skill to document this session.", file=sys.stderr)
            print("   (The goodbye-skill will handle everything and reset the counter)", file=sys.stderr)
            print("\n" + "="*60 + "\n", file=sys.stderr)
        else:
            # Just show current progress
            print(f"📊 Commit count: {commit_count}/20 (goodbye auto-triggers at 20)", file=sys.stderr)

        # Always allow stopping (exit 0)
        sys.exit(0)

    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception as e:
        # Handle any other errors gracefully - don't block stopping
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
