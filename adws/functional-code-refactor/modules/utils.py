"""Utility functions for functional-code-refactor module."""

import os
from typing import Dict


def get_safe_subprocess_env() -> Dict[str, str]:
    """Get filtered environment variables safe for subprocess execution.

    Returns only the environment variables needed for ADW workflows based on
    .env.sample configuration. This prevents accidental exposure of sensitive
    credentials to subprocesses.

    Returns:
        Dictionary containing only required environment variables
    """
    # Start with a copy of the parent environment to preserve all system variables
    safe_env_vars = os.environ.copy()

    # Override/ensure specific ADW configuration variables
    github_pat = os.getenv("GITHUB_PAT")
    if github_pat:
        safe_env_vars["GITHUB_PAT"] = github_pat
        safe_env_vars["GH_TOKEN"] = github_pat

    # Claude Code Configuration
    safe_env_vars["CLAUDE_CODE_PATH"] = os.getenv("CLAUDE_CODE_PATH", "claude")
    safe_env_vars["CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR"] = os.getenv(
        "CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR", "true"
    )

    # Gemini Configuration
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GEMINIAPIKEY")
    if gemini_key:
        safe_env_vars["GEMINI_API_KEY"] = gemini_key

    # Agent Cloud Sandbox Environment (optional)
    e2b_key = os.getenv("E2B_API_KEY")
    if e2b_key:
        safe_env_vars["E2B_API_KEY"] = e2b_key

    # Cloudflare tunnel token (optional)
    cf_token = os.getenv("CLOUDFLARED_TUNNEL_TOKEN")
    if cf_token:
        safe_env_vars["CLOUDFLARED_TUNNEL_TOKEN"] = cf_token

    # Python-specific variables
    safe_env_vars["PYTHONUNBUFFERED"] = "1"  # Useful for subprocess output

    # Working directory tracking
    safe_env_vars["PWD"] = os.getcwd()

    return safe_env_vars
