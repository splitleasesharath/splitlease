#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW Claude Browser Iso - AI Developer Workflow for browser-based Claude interactions

Usage:
  uv run adw_claude_browser_iso.py <issue-number> <prompt> [adw-id]

Workflow:
1. Create isolated worktree (if adw-id not provided)
2. Launch Claude.ai in Chrome browser
3. Send the provided prompt to Claude
4. Capture the response
5. Post results to GitHub issue
6. Commit results in worktree

This is an ENTRY POINT workflow - it creates its own worktree and can be run independently.

Example:
  uv run adw_claude_browser_iso.py 123 "Analyze the performance of our API endpoints"
"""

import sys
import os
import logging
import json
from typing import Optional
from dotenv import load_dotenv

from adw_modules.state import ADWState
from adw_modules.git_ops import commit_changes, finalize_git_operations
from adw_modules.github import (
    fetch_issue,
    make_issue_comment,
    get_repo_url,
    extract_repo_path,
)
from adw_modules.workflow_ops import (
    create_commit,
    format_issue_message,
    ensure_adw_id,
    classify_issue,
    generate_branch_name,
)
from adw_modules.utils import setup_logger, check_env_vars
from adw_modules.data_types import AgentTemplateRequest, AgentPromptResponse
from adw_modules.agent import execute_template
from adw_modules.worktree_ops import (
    create_worktree,
    validate_worktree,
    setup_worktree_environment,
    find_next_available_ports,
)

# Agent name constants
AGENT_CLAUDE_BROWSER = "claude_browser"

def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

    # Parse command line args
    if len(sys.argv) < 3:
        print("Usage: uv run adw_claude_browser_iso.py <issue-number> <prompt> [adw-id]")
        print("\nExample:")
        print('  uv run adw_claude_browser_iso.py 123 "Analyze our API performance"')
        sys.exit(1)

    issue_number = sys.argv[1]
    prompt_arg = sys.argv[2]
    adw_id = sys.argv[3] if len(sys.argv) > 3 else None

    # Ensure we have an ADW ID (generate if needed)
    adw_id = ensure_adw_id(adw_id)

    # Set up logger
    logger = setup_logger(adw_id, "adw_claude_browser_iso")
    logger.info(f"ADW Claude Browser Iso starting - ID: {adw_id}, Issue: {issue_number}")
    logger.info(f"Prompt: {prompt_arg}")

    # Validate environment
    check_env_vars(logger)

    # Try to load existing state or create new one
    state = ADWState.load(adw_id, logger)
    if not state:
        logger.info("Creating new ADW state")
        state = ADWState(adw_id)
        state.update(issue_number=issue_number)

    # Track that this ADW workflow has run
    state.append_adw_id("adw_claude_browser_iso")

    # Post initial status
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id, "ops", f"🚀 Starting Claude Browser workflow\n📝 Prompt: {prompt_arg}"
        ),
    )

    # Get repo information
    try:
        github_repo_url = get_repo_url()
        repo_path = extract_repo_path(github_repo_url)
    except ValueError as e:
        logger.error(f"Error getting repository URL: {e}")
        sys.exit(1)

    # Fetch issue data
    logger.info("Fetching issue data")
    issue = fetch_issue(issue_number, repo_path)

    # Check if we need to create a worktree
    worktree_path = state.get("worktree_path")
    if not worktree_path:
        logger.info("No existing worktree - creating new isolated environment")

        # Generate branch name
        logger.info("Generating branch name")
        branch_name_response = generate_branch_name(issue, adw_id, logger)
        if not branch_name_response[0]:
            logger.error(f"Error generating branch name: {branch_name_response[1]}")
            sys.exit(1)
        branch_name = branch_name_response[0]
        logger.info(f"Generated branch name: {branch_name}")

        # Create worktree
        logger.info(f"Creating worktree for branch: {branch_name}")
        worktree_path, error = create_worktree(adw_id, branch_name, logger)
        if error:
            logger.error(f"Failed to create worktree: {error}")
            make_issue_comment(
                issue_number,
                format_issue_message(adw_id, "ops", f"❌ Failed to create worktree: {error}"),
            )
            sys.exit(1)

        # Allocate ports
        logger.info("Allocating ports for isolated instance")
        backend_port, frontend_port = find_next_available_ports(adw_id)
        logger.info(f"Allocated ports - Backend: {backend_port}, Frontend: {frontend_port}")

        # Set up worktree environment
        setup_worktree_environment(worktree_path, backend_port, frontend_port, logger)

        # Update state
        state.update(
            branch_name=branch_name,
            worktree_path=worktree_path,
            backend_port=backend_port,
            frontend_port=frontend_port,
        )
        state.save("adw_claude_browser_iso")

        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                "ops",
                f"✅ Created isolated worktree\n"
                f"🏠 Path: {worktree_path}\n"
                f"🌿 Branch: {branch_name}\n"
                f"🔌 Ports - Backend: {backend_port}, Frontend: {frontend_port}",
            ),
        )
    else:
        # Validate existing worktree
        valid, error = validate_worktree(adw_id, state)
        if not valid:
            logger.error(f"Worktree validation failed: {error}")
            make_issue_comment(
                issue_number,
                format_issue_message(adw_id, "ops", f"❌ Worktree validation failed: {error}"),
            )
            sys.exit(1)
        logger.info(f"Using existing worktree at: {worktree_path}")

    # Get port information for display
    backend_port = state.get("backend_port", "9100")
    frontend_port = state.get("frontend_port", "9200")

    # Execute the Claude browser interaction
    logger.info("Launching Claude browser session")
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id,
            AGENT_CLAUDE_BROWSER,
            f"🌐 Launching Claude.ai in Chrome\n📨 Sending prompt: {prompt_arg}",
        ),
    )

    # Create template request for the /claude_browser command
    request = AgentTemplateRequest(
        agent_name=AGENT_CLAUDE_BROWSER,
        slash_command="/claude_browser",
        args=[prompt_arg],
        adw_id=adw_id,
        working_dir=worktree_path,
    )

    logger.debug(
        f"claude_browser_request: {request.model_dump_json(indent=2, by_alias=True)}"
    )

    # Execute the template
    response = execute_template(request)

    logger.debug(
        f"claude_browser_response: {response.model_dump_json(indent=2, by_alias=True)}"
    )

    # Check response
    if not response.success:
        logger.error(f"Claude browser interaction failed: {response.output}")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id,
                AGENT_CLAUDE_BROWSER,
                f"❌ Claude browser interaction failed:\n```\n{response.output}\n```",
            ),
        )
        sys.exit(1)

    # Post results
    logger.info("Claude browser interaction completed successfully")
    make_issue_comment(
        issue_number,
        format_issue_message(
            adw_id,
            AGENT_CLAUDE_BROWSER,
            f"✅ Claude browser interaction completed\n\n## Response:\n{response.output}",
        ),
    )

    # Get issue classification from state or classify if needed
    issue_command = state.get("issue_class")
    if not issue_command:
        logger.info("No issue classification in state, running classify_issue")
        issue_command, error = classify_issue(issue, adw_id, logger)
        if error:
            logger.error(f"Error classifying issue: {error}")
            issue_command = "/feature"
            logger.warning("Defaulting to /feature after classification error")
        else:
            state.update(issue_class=issue_command)
            state.save("adw_claude_browser_iso")

    # Create commit message
    logger.info("Creating commit for Claude browser results")
    commit_msg, error = create_commit(
        AGENT_CLAUDE_BROWSER, issue, issue_command, adw_id, logger, worktree_path
    )

    if error:
        logger.error(f"Error creating commit message: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, AGENT_CLAUDE_BROWSER, f"❌ Error creating commit message: {error}"
            ),
        )
        sys.exit(1)

    # Commit the results (in worktree)
    success, error = commit_changes(commit_msg, cwd=worktree_path)

    if not success:
        logger.error(f"Error committing results: {error}")
        make_issue_comment(
            issue_number,
            format_issue_message(
                adw_id, AGENT_CLAUDE_BROWSER, f"❌ Error committing results: {error}"
            ),
        )
        sys.exit(1)

    logger.info(f"Committed results: {commit_msg}")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, AGENT_CLAUDE_BROWSER, "✅ Results committed"),
    )

    # Finalize git operations (push and PR)
    finalize_git_operations(state, logger, cwd=worktree_path)

    logger.info("Claude browser workflow completed successfully")
    make_issue_comment(
        issue_number,
        format_issue_message(adw_id, "ops", "✅ Claude browser workflow completed"),
    )

    # Save final state
    state.save("adw_claude_browser_iso")

    # Post final state summary
    make_issue_comment(
        issue_number,
        f"{adw_id}_ops: 📋 Final state:\n```json\n{json.dumps(state.data, indent=2)}\n```",
    )


if __name__ == "__main__":
    main()
