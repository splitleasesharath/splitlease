#!/usr/bin/env python3
"""
Stop hook: Commit Tracker - Shows commit count progress
Tracks the number of commits made during a session.
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

        # Show current progress
        print(f"📊 Commit count: {commit_count}", file=sys.stderr)

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
