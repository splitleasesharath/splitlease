#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW Claude Browser (Stateless) - Pure validation worker

This is a stateless browser script that ONLY executes Claude browser commands.
It does NOT manage dev servers - that's the orchestrator's job.

Usage:
  uv run adw_claude_browser_stateless.py "<prompt>"
  uv run adw_claude_browser_stateless.py "@prompt_file.txt"

This script:
1. Reads prompt (from arg or file)
2. Executes: claude --chrome --print "<prompt>"
3. Returns output to stdout
4. Exits with code 0 on success, 1 on failure

Perfect for orchestration where dev server is already running.
"""

import sys
import os
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Claude Code CLI path from environment
CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")


def run_claude_browser_stateless(prompt: str, timeout: int = 600) -> tuple[bool, str]:
    """Execute Claude CLI with Chrome integration (stateless).

    Args:
        prompt: The validation prompt to send to Claude
        timeout: Timeout in seconds (default: 600 = 10 minutes)

    Returns:
        Tuple of (success, output_text)
    """
    cmd = [CLAUDE_PATH, "--chrome", "--print", prompt]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            timeout=timeout,
            errors='replace'  # Handle encoding errors gracefully
        )

        success = result.returncode == 0
        output = result.stdout if success else result.stderr

        return success, output.strip()

    except subprocess.TimeoutExpired:
        return False, f"ERROR: Claude browser command timed out after {timeout}s"
    except FileNotFoundError:
        return False, f"ERROR: Claude CLI not found at: {CLAUDE_PATH}"
    except Exception as e:
        return False, f"ERROR: {str(e)}"


def main():
    """Main entry point."""
    # Parse command line args
    if len(sys.argv) < 2:
        print("Usage: uv run adw_claude_browser_stateless.py \"<prompt>\"", file=sys.stderr)
        print("       uv run adw_claude_browser_stateless.py \"@prompt_file.txt\"", file=sys.stderr)
        sys.exit(1)

    prompt_arg = sys.argv[1]

    # Support reading prompt from file if argument starts with @
    if prompt_arg.startswith('@'):
        prompt_file_path = prompt_arg[1:]  # Remove @ prefix
        try:
            with open(prompt_file_path, 'r', encoding='utf-8') as f:
                prompt_arg = f.read()
        except FileNotFoundError:
            print(f"ERROR: Prompt file not found: {prompt_file_path}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"ERROR: Failed to read prompt file: {e}", file=sys.stderr)
            sys.exit(1)

    # Execute validation
    success, output = run_claude_browser_stateless(prompt_arg)

    # Output result to stdout
    print(output)

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
