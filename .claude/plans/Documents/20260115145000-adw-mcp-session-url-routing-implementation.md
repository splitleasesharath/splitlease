# ADW MCP Session URL Routing Implementation Plan

**Document ID:** `20260115145000-adw-mcp-session-url-routing-implementation`
**Created:** 2026-01-15 14:50:00
**Status:** NEW - Awaiting Implementation
**Related Analysis:** [20260115134500-adw-orchestrator-run-failure-analysis.md](./20260115134500-adw-orchestrator-run-failure-analysis.md)

---

## Executive Summary

This document provides a detailed implementation plan to fix the ADW orchestrator's MCP session URL routing. The core issue is that MCP Playwright sessions do not have configured base URLs, causing:

1. **Guest/Host sessions navigating to wrong environments** - e.g., `playwright-guest-live` navigating to `localhost` instead of `split.lease`
2. **Authentication failures** - Sessions pre-authenticated for one domain being used for another
3. **Visual parity check failures** - DEV/LIVE comparisons failing due to URL mismatches

### Correct Routing Matrix

| MCP Session | Environment | Base URL | User Data Directory |
|------------|-------------|----------|---------------------|
| `playwright-host-live` | Production | `https://split.lease` | `mcp-chrome-host-live` |
| `playwright-host-dev` | Development | `http://localhost:8010` | `mcp-chrome-host-dev` |
| `playwright-guest-live` | Production | `https://split.lease` | `mcp-chrome-guest-live` |
| `playwright-guest-dev` | Development | `http://localhost:8010` | `mcp-chrome-guest-dev` |

---

## Problem Analysis

### Root Cause 1: Hardcoded URL Constants

**File:** [visual_regression.py:21-22](../../adws/adw_modules/visual_regression.py#L21-L22)

```python
LIVE_BASE_URL = "https://split.lease"
DEV_BASE_URL = "http://localhost"  # Missing port!
```

**Issues:**
1. `DEV_BASE_URL` lacks port specification - appended later as `:8010`
2. These constants are used directly in prompts without MCP session awareness
3. The concurrent prompt builder doesn't enforce session-to-URL binding

### Root Cause 2: Prompt Doesn't Enforce URL-Session Binding

**File:** [visual_regression.py:186-272](../../adws/adw_modules/visual_regression.py#L186-L272)

The `_build_concurrent_prompt()` function constructs URLs like:
```python
**LIVE Session**: `{mcp_live}` → {LIVE_BASE_URL}{page_path}
**DEV Session**: `{mcp_dev}` → {DEV_BASE_URL}:{port}{page_path}
```

The agent receives this as *instructions*, not enforcement. A confused or misbehaving agent could:
- Navigate `playwright-guest-live` to `localhost:8010`
- Navigate `playwright-host-dev` to `split.lease`

### Root Cause 3: No URL Validation in page_classifier.py

**File:** [page_classifier.py](../../adws/adw_modules/page_classifier.py)

The `PageInfo` dataclass stores `mcp_live` and `mcp_dev` session names but no associated URLs. The URL binding exists only in documentation/comments, not enforced in code.

### Root Cause 4: Authentication Session Mismatch

Each MCP session has a separate user data directory:
- `mcp-chrome-host-live` - Authenticated for `split.lease` as HOST
- `mcp-chrome-host-dev` - Authenticated for `localhost:8010` as HOST
- `mcp-chrome-guest-live` - Authenticated for `split.lease` as GUEST
- `mcp-chrome-guest-dev` - Authenticated for `localhost:8010` as GUEST

If a session navigates to the wrong domain, the authentication cookies won't match, causing:
- Redirect to login page
- Session appears "logged out"
- Visual parity check blocked

---

## Implementation Plan

### Phase 1: Create MCP Session Configuration Module

**New File:** `adws/adw_modules/mcp_config.py`

Create a centralized configuration that maps MCP sessions to their correct base URLs.

```python
"""
MCP Session Configuration - Single source of truth for MCP session → URL mapping

Each MCP Playwright session is pre-authenticated for a specific domain.
Using a session with the wrong domain will cause authentication failures.

CRITICAL: These mappings are immutable. Do not change without re-authenticating
all affected user data directories.
"""

from typing import Dict, Literal, NamedTuple
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


def get_session_pair_for_page(page_path: str, auth_type: str) -> tuple:
    """Get the (live_session, dev_session) pair for a page.

    Args:
        page_path: Page path (e.g., "/guest-proposals")
        auth_type: "host", "guest", "shared", or "public"

    Returns:
        Tuple of (live_session_name, dev_session_name)
        Returns (None, None) for public pages
    """
    if auth_type == "public":
        return (None, None)

    if auth_type in ("host", "shared"):
        return ("playwright-host-live", "playwright-host-dev")

    if auth_type == "guest":
        return ("playwright-guest-live", "playwright-guest-dev")

    raise ValueError(f"Unknown auth_type: {auth_type}")


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
```

### Phase 2: Update visual_regression.py

**File:** [visual_regression.py](../../adws/adw_modules/visual_regression.py)

#### Change 2.1: Import MCP config

```python
# Add after existing imports (line ~18)
from .mcp_config import (
    get_session_config,
    get_url_for_session,
    validate_session_url_binding,
    MCP_SESSIONS
)
```

#### Change 2.2: Remove hardcoded URL constants

```python
# DELETE these lines (21-22):
# LIVE_BASE_URL = "https://split.lease"
# DEV_BASE_URL = "http://localhost"
```

#### Change 2.3: Update `_build_concurrent_prompt()`

Replace the entire function (lines 186-272) with:

```python
def _build_concurrent_prompt(
    page_path: str,
    mcp_live: str,
    mcp_dev: str,
    port: int  # Kept for backwards compatibility but ignored - URL from config
) -> str:
    """
    Build prompt for concurrent dual-session visual check.

    URLs are derived from MCP session configuration, NOT from parameters.
    This ensures sessions always navigate to their authenticated domains.
    """
    # Get URLs from configuration - NEVER build manually
    live_config = get_session_config(mcp_live)
    dev_config = get_session_config(mcp_dev)

    live_url = live_config.get_full_url(page_path)
    dev_url = dev_config.get_full_url(page_path)

    return f"""# Concurrent Visual Parity Check

## Objective
Compare {page_path} between LIVE and DEV environments using parallel MCP sessions.

## CRITICAL: Session-URL Binding
Each MCP session is authenticated for a SPECIFIC domain. Using the wrong URL
will cause authentication failures. The bindings below are MANDATORY:

| Session | MUST Navigate To | Environment |
|---------|------------------|-------------|
| `{mcp_live}` | `{live_config.base_url}` | LIVE (Production) |
| `{mcp_dev}` | `{dev_config.base_url}` | DEV (Development) |

⚠️ DO NOT navigate `{mcp_live}` to localhost or `{mcp_dev}` to split.lease!

## Instructions

### Step 1: Navigate LIVE Environment
Use `{mcp_live}` session (authenticated for {live_config.base_url}):

```
mcp__{mcp_live.replace('-', '_')}__browser_navigate
url: {live_url}
```

### Step 2: Navigate DEV Environment
Use `{mcp_dev}` session (authenticated for {dev_config.base_url}):

```
mcp__{mcp_dev.replace('-', '_')}__browser_navigate
url: {dev_url}
```

### Step 3: Wait for Load
Wait 2-3 seconds for both pages to fully render.

### Step 4: Take Screenshots

**LIVE Screenshot** (using {mcp_live}):
```
mcp__{mcp_live.replace('-', '_')}__browser_take_screenshot
filename: parity_LIVE{page_path.replace('/', '_')}.png
```

**DEV Screenshot** (using {mcp_dev}):
```
mcp__{mcp_dev.replace('-', '_')}__browser_take_screenshot
filename: parity_DEV{page_path.replace('/', '_')}.png
```

### Step 5: Visual Comparison
Compare the two screenshots for:
- Layout consistency
- Text content matching
- Color/styling parity
- Component positioning
- Missing or extra elements

### Step 6: Return Result
Return a JSON object:

```json
{{
    "visualParity": "PASS" | "FAIL" | "BLOCKED",
    "issues": ["List any visual differences or access problems"],
    "explanation": "Brief summary of comparison",
    "screenshots": {{
        "live": "parity_LIVE{page_path.replace('/', '_')}.png",
        "dev": "parity_DEV{page_path.replace('/', '_')}.png"
    }},
    "urls_checked": {{
        "live": "{live_url}",
        "dev": "{dev_url}"
    }}
}}
```

## Result Guidelines
- **PASS**: Pages are visually identical or have only minor acceptable differences
- **FAIL**: Significant layout shifts, missing elements, or broken styling
- **BLOCKED**: Unable to access one or both environments (auth failure, connection refused)
- Ignore dynamic content like timestamps, user-specific data, or loading states
"""
```

#### Change 2.4: Update `_build_sequential_prompt()`

Update the fallback prompt to use configuration:

```python
def _build_sequential_prompt(page_path: str, mcp_session: Optional[str], port: int) -> str:
    """Build prompt for sequential (single session) visual check."""
    prompt_template_path = Path(__file__).parent.parent / "prompts" / "visual_check_gemini.txt"

    # Determine URLs from config if session provided
    if mcp_session:
        config = get_session_config(mcp_session)
        base_url = config.base_url
    else:
        base_url = "https://split.lease"  # Default for public pages

    dev_base_url = f"http://localhost:{port}"

    if prompt_template_path.exists():
        prompt_template = prompt_template_path.read_text(encoding='utf-8')
        return prompt_template.format(
            page_path=page_path,
            mcp_session=mcp_session or "none",
            auth_type="protected" if mcp_session else "public",
            port=port,
            live_url=f"{base_url}{page_path}",
            dev_url=f"{dev_base_url}{page_path}"
        )
    else:
        return f"""Compare the refactored version of {page_path} against live production.

1. Navigate to LIVE: {base_url}{page_path}
2. Take screenshot
3. Navigate to DEV: {dev_base_url}{page_path}
4. Take screenshot
5. Compare visually

Return JSON: {{"visualParity": "PASS"|"FAIL", "issues": [], "explanation": ""}}
"""
```

### Phase 3: Update page_classifier.py to Include URLs

**File:** [page_classifier.py](../../adws/adw_modules/page_classifier.py)

#### Change 3.1: Import MCP config

```python
# Add after existing imports (line ~18)
from .mcp_config import get_url_for_session, MCP_SESSIONS
```

#### Change 3.2: Add URL helper to PageInfo

```python
# Add method to PageInfo dataclass (after line 45)
    def get_live_url(self) -> Optional[str]:
        """Get the LIVE URL for this page."""
        if self.mcp_live:
            return get_url_for_session(self.mcp_live, self.path)
        return f"https://split.lease{self.path}"

    def get_dev_url(self, port: int = 8010) -> str:
        """Get the DEV URL for this page."""
        if self.mcp_dev:
            return get_url_for_session(self.mcp_dev, self.path)
        return f"http://localhost:{port}{self.path}"
```

#### Change 3.3: Add URL validation function

```python
# Add after get_summary_stats() (line ~365)

def validate_page_session_urls(page_path: str) -> Dict[str, Any]:
    """
    Validate that a page's MCP sessions have correct URL bindings.

    Args:
        page_path: Page path to validate

    Returns:
        Dict with validation results
    """
    page = get_page_info(page_path)
    if not page:
        return {"valid": False, "error": f"Unknown page: {page_path}"}

    results = {"valid": True, "page": page_path, "checks": []}

    if page.mcp_live:
        live_config = MCP_SESSIONS.get(page.mcp_live)
        if live_config:
            expected_env = "live"
            actual_env = live_config.environment
            check = {
                "session": page.mcp_live,
                "expected_env": expected_env,
                "actual_env": actual_env,
                "base_url": live_config.base_url,
                "valid": actual_env == expected_env
            }
            results["checks"].append(check)
            if not check["valid"]:
                results["valid"] = False

    if page.mcp_dev:
        dev_config = MCP_SESSIONS.get(page.mcp_dev)
        if dev_config:
            expected_env = "dev"
            actual_env = dev_config.environment
            check = {
                "session": page.mcp_dev,
                "expected_env": expected_env,
                "actual_env": actual_env,
                "base_url": dev_config.base_url,
                "valid": actual_env == expected_env
            }
            results["checks"].append(check)
            if not check["valid"]:
                results["valid"] = False

    return results
```

### Phase 4: Add Pre-Navigation Health Check

**File:** [visual_regression.py](../../adws/adw_modules/visual_regression.py)

Add a function to verify both environments are accessible before starting comparison:

```python
# Add after imports section

import requests
from urllib.parse import urlparse

def verify_environment_accessibility(
    live_url: str,
    dev_url: str,
    timeout: int = 5
) -> Dict[str, Any]:
    """
    Verify both LIVE and DEV environments are accessible before visual comparison.

    Args:
        live_url: Full LIVE URL to check
        dev_url: Full DEV URL to check
        timeout: Request timeout in seconds

    Returns:
        Dict with accessibility status for both environments
    """
    results = {
        "live": {"accessible": False, "status_code": None, "error": None},
        "dev": {"accessible": False, "status_code": None, "error": None},
        "can_proceed": False
    }

    # Check LIVE
    try:
        resp = requests.head(live_url, timeout=timeout, allow_redirects=False)
        results["live"]["status_code"] = resp.status_code
        # 200, 301, 302 are acceptable (redirects may be auth-related)
        results["live"]["accessible"] = resp.status_code < 500
    except requests.exceptions.ConnectionError as e:
        results["live"]["error"] = f"Connection refused: {str(e)}"
    except requests.exceptions.Timeout:
        results["live"]["error"] = f"Timeout after {timeout}s"
    except Exception as e:
        results["live"]["error"] = str(e)

    # Check DEV
    try:
        resp = requests.head(dev_url, timeout=timeout, allow_redirects=False)
        results["dev"]["status_code"] = resp.status_code
        results["dev"]["accessible"] = resp.status_code < 500
    except requests.exceptions.ConnectionError as e:
        results["dev"]["error"] = f"Connection refused: {str(e)}"
    except requests.exceptions.Timeout:
        results["dev"]["error"] = f"Timeout after {timeout}s"
    except Exception as e:
        results["dev"]["error"] = str(e)

    # Can only proceed if BOTH are accessible
    results["can_proceed"] = (
        results["live"]["accessible"] and
        results["dev"]["accessible"]
    )

    return results
```

#### Change 4.2: Update `check_visual_parity()` to use health check

Add before the retry loop in `check_visual_parity()`:

```python
# Add after session_info line (around line 51)

# Pre-flight check: Verify both environments are accessible
if concurrent and mcp_session and mcp_session_dev:
    live_config = get_session_config(mcp_session)
    dev_config = get_session_config(mcp_session_dev)
    live_url = live_config.get_full_url(page_path)
    dev_url = dev_config.get_full_url(page_path)

    accessibility = verify_environment_accessibility(live_url, dev_url)

    if not accessibility["can_proceed"]:
        issues = []
        if not accessibility["live"]["accessible"]:
            issues.append(f"LIVE environment unreachable: {accessibility['live']['error'] or 'status ' + str(accessibility['live']['status_code'])}")
        if not accessibility["dev"]["accessible"]:
            issues.append(f"DEV environment unreachable: {accessibility['dev']['error'] or 'status ' + str(accessibility['dev']['status_code'])}")

        return {
            "visualParity": "BLOCKED",
            "issues": issues,
            "consoleErrors": [],
            "accessibility": accessibility
        }
```

### Phase 5: Add HTTP Readiness Check to dev_server.py

**File:** [dev_server.py](../../adws/adw_modules/dev_server.py)

The current `is_port_8010_responding()` only checks TCP socket connectivity. Vite may bind the port before being ready to serve HTTP requests.

#### Change 5.1: Add HTTP readiness check

```python
# Add after is_port_8010_responding() function (line 35)

def is_dev_server_http_ready(timeout: int = 2) -> bool:
    """Check if dev server is ready to serve HTTP requests.

    More reliable than socket check - actually makes an HTTP request
    to verify Vite is fully initialized.

    Args:
        timeout: Request timeout in seconds

    Returns:
        True if HTTP request succeeds, False otherwise
    """
    import requests

    try:
        # Request the root path - Vite should respond even without content
        resp = requests.get("http://localhost:8010/", timeout=timeout)
        # Any 2xx or 3xx response means server is ready
        return resp.status_code < 400
    except requests.exceptions.ConnectionError:
        return False
    except requests.exceptions.Timeout:
        return False
    except Exception:
        return False
```

#### Change 5.2: Update server startup to use HTTP check

In `restart_dev_server_on_port_8010()`, replace the socket check loop:

```python
# Replace lines 99-105 with:

    # Wait for server to be HTTP-ready (max 60 seconds)
    # First wait for port, then wait for HTTP
    max_wait = 60
    port_ready_at = None

    for i in range(max_wait):
        if port_ready_at is None and is_port_8010_responding():
            port_ready_at = i
            logger.info(f"Port 8010 responding after {i+1}s, waiting for HTTP ready...")

        if port_ready_at is not None and is_dev_server_http_ready():
            logger.info(f"Dev server HTTP-ready (took {i+1}s total, {i - port_ready_at}s after port)")
            print(f"Dev server running at http://localhost:8010")
            return process

        time.sleep(1)
```

### Phase 6: Update Orchestrator to Validate URLs

**File:** [adw_unified_fp_orchestrator.py](../../adws/adw_unified_fp_orchestrator.py)

Add validation before visual parity checks to catch misconfigurations early.

#### Change 6.1: Import MCP config

```python
# Add after existing imports
from adw_modules.mcp_config import (
    get_session_config,
    get_url_for_session,
    validate_session_url_binding
)
```

#### Change 6.2: Add URL validation before visual check

In the visual parity section (around line 321), add validation:

```python
# Add before calling check_visual_parity()

# Validate session-URL bindings before proceeding
if mcp_live and mcp_dev:
    live_config = get_session_config(mcp_live)
    dev_config = get_session_config(mcp_dev)

    logger.info(f"  MCP Session URLs:")
    logger.info(f"    LIVE: {mcp_live} → {live_config.base_url}")
    logger.info(f"    DEV:  {mcp_dev} → {dev_config.base_url}")

    # Sanity check: live should point to production, dev to localhost
    if "localhost" in live_config.base_url:
        logger.error(f"CONFIGURATION ERROR: {mcp_live} points to localhost!")
        raise ValueError(f"Live session {mcp_live} has localhost URL")

    if "split.lease" in dev_config.base_url:
        logger.error(f"CONFIGURATION ERROR: {mcp_dev} points to production!")
        raise ValueError(f"Dev session {mcp_dev} has production URL")
```

---

## Testing Plan

### Test 1: MCP Config Module Unit Tests

Create `adws/tests/test_mcp_config.py`:

```python
"""Unit tests for MCP session configuration."""

import pytest
from adw_modules.mcp_config import (
    get_session_config,
    get_url_for_session,
    validate_session_url_binding,
    get_session_pair_for_page,
    MCP_SESSIONS
)


class TestMcpConfig:
    """Test MCP session configuration."""

    def test_all_sessions_have_config(self):
        """All 4 expected sessions should be configured."""
        expected = [
            "playwright-host-live",
            "playwright-host-dev",
            "playwright-guest-live",
            "playwright-guest-dev"
        ]
        for session in expected:
            assert session in MCP_SESSIONS

    def test_live_sessions_point_to_production(self):
        """Live sessions should have split.lease URLs."""
        for name, config in MCP_SESSIONS.items():
            if "-live" in name:
                assert "split.lease" in config.base_url
                assert config.environment == "live"

    def test_dev_sessions_point_to_localhost(self):
        """Dev sessions should have localhost URLs."""
        for name, config in MCP_SESSIONS.items():
            if "-dev" in name:
                assert "localhost" in config.base_url
                assert config.environment == "dev"

    def test_get_url_for_session(self):
        """URL construction should use correct base."""
        assert get_url_for_session("playwright-host-live", "/search") == "https://split.lease/search"
        assert get_url_for_session("playwright-host-dev", "/search") == "http://localhost:8010/search"
        assert get_url_for_session("playwright-guest-live", "/guest-proposals") == "https://split.lease/guest-proposals"
        assert get_url_for_session("playwright-guest-dev", "/guest-proposals") == "http://localhost:8010/guest-proposals"

    def test_validate_session_url_binding(self):
        """URL validation should catch mismatches."""
        # Correct bindings
        assert validate_session_url_binding("playwright-host-live", "https://split.lease/search")
        assert validate_session_url_binding("playwright-host-dev", "http://localhost:8010/search")

        # Incorrect bindings
        assert not validate_session_url_binding("playwright-host-live", "http://localhost:8010/search")
        assert not validate_session_url_binding("playwright-host-dev", "https://split.lease/search")

    def test_get_session_pair_for_page(self):
        """Session pairs should match auth type."""
        assert get_session_pair_for_page("/search", "public") == (None, None)
        assert get_session_pair_for_page("/host-proposals", "host") == ("playwright-host-live", "playwright-host-dev")
        assert get_session_pair_for_page("/guest-proposals", "guest") == ("playwright-guest-live", "playwright-guest-dev")
        assert get_session_pair_for_page("/messages", "shared") == ("playwright-host-live", "playwright-host-dev")
```

### Test 2: Integration Test - Visual Parity with Correct URLs

Manual verification steps:

1. Start dev server: `bun run dev`
2. Ensure host/guest accounts are logged in to both environments
3. Run a single visual parity check for a guest page:
   ```python
   from adw_modules.visual_regression import check_visual_parity

   result = check_visual_parity(
       "/guest-proposals",
       mcp_session="playwright-guest-live",
       mcp_session_dev="playwright-guest-dev",
       concurrent=True
   )
   print(result)
   ```
4. Verify `urls_checked` in result shows correct base URLs

### Test 3: Health Check Verification

```python
from adw_modules.visual_regression import verify_environment_accessibility

# With dev server running
result = verify_environment_accessibility(
    "https://split.lease/guest-proposals",
    "http://localhost:8010/guest-proposals"
)
print(result)
# Expected: {"can_proceed": True, "live": {"accessible": True}, "dev": {"accessible": True}}

# With dev server stopped
result = verify_environment_accessibility(
    "https://split.lease/guest-proposals",
    "http://localhost:8010/guest-proposals"
)
print(result)
# Expected: {"can_proceed": False, "dev": {"accessible": False, "error": "Connection refused"}}
```

---

## Migration Steps

### Step 1: Create MCP Config Module
1. Create `adws/adw_modules/mcp_config.py` with the configuration code
2. Run unit tests to verify configuration

### Step 2: Update visual_regression.py
1. Add imports
2. Remove hardcoded constants
3. Replace `_build_concurrent_prompt()`
4. Add health check function
5. Update `check_visual_parity()` to use health check

### Step 3: Update page_classifier.py
1. Add imports
2. Add URL helper methods to PageInfo
3. Add validation function

### Step 4: Update dev_server.py
1. Add HTTP readiness check function
2. Update server startup to use HTTP check

### Step 5: Update Orchestrator
1. Add imports
2. Add URL validation before visual checks

### Step 6: Test Full Pipeline
1. Run orchestrator on a small refactoring task
2. Verify visual parity checks use correct URLs
3. Verify authentication works for both environments

---

## Rollback Plan

If issues arise:

1. **Revert mcp_config.py changes**: Delete the new module
2. **Restore visual_regression.py**: Git checkout the original file
3. **Restore page_classifier.py**: Git checkout the original file
4. **Restore dev_server.py**: Git checkout the original file

The changes are isolated to the `adws/` directory and don't affect the main application.

---

## Success Criteria

1. **No URL misrouting**: Visual parity checks always navigate sessions to their correct domains
2. **Early failure detection**: Health check catches connection issues before agent invocation
3. **Clear error messages**: Blocked checks include specific URLs that failed
4. **HTTP readiness**: Dev server waits for HTTP ready, not just port binding
5. **Validated configuration**: Orchestrator logs show correct session→URL mappings

---

## Files Referenced

| File | Purpose | Changes |
|------|---------|---------|
| [adws/adw_modules/mcp_config.py](../../adws/adw_modules/mcp_config.py) | **NEW** - MCP session configuration | Create new module |
| [adws/adw_modules/visual_regression.py](../../adws/adw_modules/visual_regression.py) | Visual parity checking | Import config, update prompts, add health check |
| [adws/adw_modules/page_classifier.py](../../adws/adw_modules/page_classifier.py) | Page auth mapping | Add URL helpers, validation |
| [adws/adw_modules/dev_server.py](../../adws/adw_modules/dev_server.py) | Dev server management | Add HTTP readiness check |
| [adws/adw_unified_fp_orchestrator.py](../../adws/adw_unified_fp_orchestrator.py) | Main orchestrator | Add URL validation logging |
| [.mcp.json](../../.mcp.json) | MCP server config | Reference only (no changes) |

---

## Appendix: MCP Session Authentication Setup

For reference, the MCP sessions need to be authenticated manually before use:

### Host Account Setup (split.lease)
1. Launch `playwright-host-live` browser
2. Navigate to `https://split.lease/login`
3. Log in with host credentials
4. Close browser - session persists in user data directory

### Host Account Setup (localhost)
1. Launch `playwright-host-dev` browser
2. Start dev server (`bun run dev`)
3. Navigate to `http://localhost:8010/login`
4. Log in with host credentials
5. Close browser

### Guest Account Setup (split.lease)
1. Launch `playwright-guest-live` browser
2. Navigate to `https://split.lease/login`
3. Log in with guest credentials
4. Close browser

### Guest Account Setup (localhost)
1. Launch `playwright-guest-dev` browser
2. Start dev server (`bun run dev`)
3. Navigate to `http://localhost:8010/login`
4. Log in with guest credentials
5. Close browser

---

*Document created for ADW orchestrator MCP session URL routing implementation.*
