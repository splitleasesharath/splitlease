#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "psutil"]
# ///

"""
ADW Claude Browser - AI Developer Workflow for browser-based Claude interactions (No Worktree)

Usage:
  uv run adw_claude_browser.py "<prompt>" [adw-id]

Workflow:
1. Generate ADW ID (or use provided)
2. Execute Claude CLI with Chrome integration
3. Capture Claude's response
4. Display results

This is a SIMPLIFIED version without worktree creation - runs in current directory.
Perfect for testing and development.

Example:
  uv run adw_claude_browser.py "Analyze the performance of our API endpoints"
  uv run adw_claude_browser.py "Explain React Server Components" abc12345
"""

import sys
import os
import logging
import subprocess
from dotenv import load_dotenv

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars, make_adw_id

# Load environment variables
load_dotenv()

# Get Claude Code CLI path from environment
CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")


def run_claude_browser(prompt: str, logger: logging.Logger, dev_server_process: subprocess.Popen) -> tuple[bool, str]:
    """Execute Claude CLI with Chrome integration.

    Uses the validated pattern: claude --chrome --print "<prompt>"
    Assumes dev server is already running (started before this function).

    Args:
        prompt: The task/prompt to send to Claude
        logger: Logger instance for debugging
        dev_server_process: Running dev server process (not managed by this function)

    Returns:
        Tuple of (success, output_text)
    """
    cmd = [CLAUDE_PATH, "--chrome", "--print", prompt]
    logger.debug(f"Executing command: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            timeout=300  # 5 minute timeout for browser operations
        )

        success = result.returncode == 0
        output = result.stdout if success else result.stderr

        logger.debug(f"Command completed with return code: {result.returncode}")
        return success, output.strip()

    except subprocess.TimeoutExpired:
        logger.error("Claude browser command timed out after 5 minutes")
        return False, "Error: Command timed out after 5 minutes"
    except FileNotFoundError:
        logger.error(f"Claude CLI not found at: {CLAUDE_PATH}")
        return False, f"Error: Claude CLI not found. Check CLAUDE_CODE_PATH in .env"
    except Exception as e:
        logger.error(f"Unexpected error executing Claude browser: {e}")
        return False, f"Error: {str(e)}"


def main():
    """Main entry point."""
    from pathlib import Path
    from adw_modules.dev_server import ensure_dev_server_single_attempt, stop_dev_server

    # Parse command line args
    if len(sys.argv) < 2:
        print("Usage: uv run adw_claude_browser.py \"<prompt>\" [adw-id]")
        print("\nExamples:")
        print('  uv run adw_claude_browser.py "Analyze our API performance"')
        print('  uv run adw_claude_browser.py "Explain React hooks" abc12345')
        sys.exit(1)

    prompt_arg = sys.argv[1]
    adw_id = sys.argv[2] if len(sys.argv) > 2 else make_adw_id()

    # Set up logger
    logger = setup_logger(adw_id, "adw_claude_browser")
    logger.info(f"ADW Claude Browser starting - ID: {adw_id}")
    logger.info(f"Prompt: {prompt_arg}")

    # Validate environment
    check_env_vars(logger)

    # Create or load state (no worktree)
    state = ADWState.load(adw_id, logger)
    if not state:
        logger.info("Creating new ADW state (no worktree)")
        state = ADWState(adw_id)

    # Track that this workflow has run
    state.append_adw_id("adw_claude_browser")
    state.save("adw_claude_browser")

    print(f"\n{'='*60}")
    print(f"ADW Claude Browser - ID: {adw_id}")
    print(f"Prompt: {prompt_arg}")
    print(f"{'='*60}\n")

    # DETERMINISTIC DEV SERVER STARTUP
    # This happens BEFORE agent invocation, outside the agent loop
    working_dir = Path.cwd()
    dev_server_process = None

    try:
        print(f"\n{'='*60}")
        print("PRE-FLIGHT: DEV SERVER CHECK")
        print(f"{'='*60}\n")

        # Ensure dev server is running (single attempt, fail fast)
        dev_server_process = ensure_dev_server_single_attempt(working_dir, 8000, logger)

        print(f"\n{'='*60}")
        print("AGENT INVOCATION")
        print(f"{'='*60}\n")

        # Execute the Claude browser interaction
        logger.info("Launching Claude browser session")
        print("Launching Claude.ai in Chrome...")
        print("Sending prompt to Claude...\n")

        # Execute using validated CLI pattern
        success, output = run_claude_browser(prompt_arg, logger, dev_server_process)

        # Display results
        print(f"\n{'='*60}")
        if success:
            print("Claude browser interaction completed!")
            print(f"{'='*60}\n")
            print(output)
            print(f"\n{'='*60}\n")
            logger.info("Claude browser interaction completed successfully")
        else:
            print("Claude browser interaction failed!")
            print(f"{'='*60}\n")
            print(f"Error: {output}")
            print(f"\n{'='*60}\n")
            logger.error(f"Claude browser interaction failed: {output}")
            sys.exit(1)

        # Save final state
        state.save("adw_claude_browser")

    finally:
        # Clean up dev server
        if dev_server_process:
            print(f"\n{'='*60}")
            print("POST-FLIGHT: DEV SERVER CLEANUP")
            print(f"{'='*60}\n")
            stop_dev_server(dev_server_process, logger)
            print("✓ Dev server stopped")
            print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
