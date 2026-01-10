#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW Claude Browser - AI Developer Workflow for browser-based Claude interactions (No Worktree)

Usage:
  uv run adw_claude_browser.py "<prompt>" [adw-id]

Workflow:
1. Generate ADW ID (or use provided)
2. Execute /claude_browser command with the prompt
3. Capture Claude's response and screenshot
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
from typing import Optional
from dotenv import load_dotenv

from adw_modules.state import ADWState
from adw_modules.utils import setup_logger, check_env_vars, make_adw_id
from adw_modules.data_types import AgentTemplateRequest
from adw_modules.agent import execute_template

# Agent name constant
AGENT_CLAUDE_BROWSER = "claude_browser"


def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

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
    print(f"🚀 ADW Claude Browser - ID: {adw_id}")
    print(f"📝 Prompt: {prompt_arg}")
    print(f"{'='*60}\n")

    # Execute the Claude browser interaction
    logger.info("Launching Claude browser session")
    print("🌐 Launching Claude.ai in Chrome...")
    print("📨 Sending prompt to Claude...\n")

    # Create template request for the /claude_browser command
    request = AgentTemplateRequest(
        agent_name=AGENT_CLAUDE_BROWSER,
        slash_command="/claude_browser",
        args=[prompt_arg],
        adw_id=adw_id,
        working_dir=None,  # Use current directory
    )

    logger.debug(
        f"claude_browser_request: {request.model_dump_json(indent=2, by_alias=True)}"
    )

    # Execute the template
    response = execute_template(request)

    logger.debug(
        f"claude_browser_response: {response.model_dump_json(indent=2, by_alias=True)}"
    )

    # Display results
    print(f"\n{'='*60}")
    if response.success:
        print("✅ Claude browser interaction completed!")
        print(f"{'='*60}\n")
        print(response.output)
        print(f"\n{'='*60}")
        print(f"📁 Output saved to: agents/{adw_id}/{AGENT_CLAUDE_BROWSER}/")
        print(f"{'='*60}\n")
        logger.info("Claude browser interaction completed successfully")
    else:
        print("❌ Claude browser interaction failed!")
        print(f"{'='*60}\n")
        print(f"Error: {response.output}")
        print(f"\n{'='*60}\n")
        logger.error(f"Claude browser interaction failed: {response.output}")
        sys.exit(1)

    # Save final state
    state.save("adw_claude_browser")


if __name__ == "__main__":
    main()
