"""
MCP Session Configuration - Single source of truth for MCP session → URL mapping

Each MCP Playwright session is pre-authenticated for a specific domain.
Using a session with the wrong domain will cause authentication failures.

CRITICAL: These mappings are immutable. Do not change without re-authenticating
all affected user data directories.
"""

from typing import Dict, Literal
from dataclasses import dataclass


McpSessionName = Literal[
    "playwright-host-live",
    "playwright-host-dev",
    "playwright-guest-live",
    "playwright-guest-dev"
]


@dataclass(frozen=True)
class McpSessionConfig:
    """Immutable configuration for an MCP Playwright session."""

    session_name: McpSessionName
    base_url: str
    environment: Literal["live", "dev"]
    auth_type: Literal["host", "guest"]
    user_data_dir: str

    def get_full_url(self, path: str) -> str:
        """Build full URL for a page path.

        Args:
            path: Page path (e.g., "/guest-proposals")

        Returns:
            Full URL (e.g., "https://split.lease/guest-proposals")
        """
        if not path.startswith('/'):
            path = f"/{path}"
        return f"{self.base_url}{path}"


# =============================================================================
# MCP SESSION REGISTRY - IMMUTABLE CONFIGURATION
# =============================================================================
# WARNING: These URLs are tied to authentication sessions. Changing a URL
# requires re-authenticating the corresponding user data directory.

MCP_SESSIONS: Dict[McpSessionName, McpSessionConfig] = {
    "playwright-host-live": McpSessionConfig(
        session_name="playwright-host-live",
        base_url="https://split.lease",
        environment="live",
        auth_type="host",
        user_data_dir="C:\\Users\\Split Lease\\AppData\\Local\\ms-playwright\\mcp-chrome-host-live"
    ),
    "playwright-host-dev": McpSessionConfig(
        session_name="playwright-host-dev",
        base_url="http://localhost:8010",
        environment="dev",
        auth_type="host",
        user_data_dir="C:\\Users\\Split Lease\\AppData\\Local\\ms-playwright\\mcp-chrome-host-dev"
    ),
    "playwright-guest-live": McpSessionConfig(
        session_name="playwright-guest-live",
        base_url="https://split.lease",
        environment="live",
        auth_type="guest",
        user_data_dir="C:\\Users\\Split Lease\\AppData\\Local\\ms-playwright\\mcp-chrome-guest-live"
    ),
    "playwright-guest-dev": McpSessionConfig(
        session_name="playwright-guest-dev",
        base_url="http://localhost:8010",
        environment="dev",
        auth_type="guest",
        user_data_dir="C:\\Users\\Split Lease\\AppData\\Local\\ms-playwright\\mcp-chrome-guest-dev"
    ),
}


def get_session_config(session_name: str) -> McpSessionConfig:
    """Get configuration for an MCP session.

    Args:
        session_name: MCP session name (e.g., "playwright-host-live")

    Returns:
        McpSessionConfig for the session

    Raises:
        KeyError: If session name is not recognized
    """
    if session_name not in MCP_SESSIONS:
        raise KeyError(f"Unknown MCP session: {session_name}. "
                      f"Valid sessions: {list(MCP_SESSIONS.keys())}")
    return MCP_SESSIONS[session_name]


def get_url_for_session(session_name: str, path: str) -> str:
    """Get the correct URL for a session and path.

    This is the PRIMARY function for URL construction. Always use this
    instead of building URLs manually.

    Args:
        session_name: MCP session name
        path: Page path (e.g., "/guest-proposals")

    Returns:
        Full URL with correct base for the session

    Raises:
        KeyError: If session name is not recognized
    """
    config = get_session_config(session_name)
    return config.get_full_url(path)


def validate_session_url_binding(session_name: str, url: str) -> bool:
    """Validate that a URL matches the session's expected base URL.

    Use this to catch bugs where code attempts to navigate a session
    to the wrong domain.

    Args:
        session_name: MCP session name
        url: Full URL to validate

    Returns:
        True if URL matches session's base URL

    Raises:
        KeyError: If session name is not recognized
    """
    config = get_session_config(session_name)
    return url.startswith(config.base_url)
