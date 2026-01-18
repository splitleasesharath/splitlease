"""
Visual Regression Module - Compares Dev vs Live using Playwright MCP

Supports concurrent LIVE vs DEV comparison using dual MCP sessions:
- playwright-host-live / playwright-host-dev for host pages
- playwright-guest-live / playwright-guest-dev for guest pages

Automatic retry on rate limits with provider switching.
Slack integration for reporting results with screenshots.
"""

import os
import json
import time
import re
import requests
from pathlib import Path
from typing import Dict, Any, Optional
from .agent import prompt_claude_code
from .data_types import AgentPromptRequest
from .mcp_config import get_session_config, get_url_for_session
from .config import get_phase_model
from .slack_client import notify_parity_check_result


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


def check_visual_parity(
    page_path: str,
    mcp_session: Optional[str] = None,
    mcp_session_dev: Optional[str] = None,
    auth_type: str = "public",
    port: int = 8010,
    max_retries: int = 3,
    use_claude: bool = False,
    concurrent: bool = False,
    slack_channel: Optional[str] = None
) -> Dict[str, Any]:
    """
    Use Playwright MCP to compare refactored page vs live.

    Args:
        page_path: The URL path to check (e.g., "/search")
        mcp_session: The MCP session for LIVE (e.g., "playwright-host-live")
        mcp_session_dev: The MCP session for DEV (e.g., "playwright-host-dev")
        auth_type: "public", "host", "guest", "shared"
        port: The dev server port
        max_retries: Maximum retry attempts on rate limit errors
        use_claude: If True, use Claude instead of Gemini
        concurrent: If True, use concurrent capture with dual sessions
        slack_channel: Optional Slack channel for notifications (e.g., "#dev-alerts")

    Returns:
        Dict with "visualParity" ("PASS"/"FAIL"), "issues", and "consoleErrors"
    """
    session_info = f"LIVE:{mcp_session or 'public'}, DEV:{mcp_session_dev or 'public'}" if concurrent else f"Session:{mcp_session}"
    print(f"  [Visual Check] Comparing {page_path} ({session_info})")

    # Helper to send Slack notification with result
    def _notify_slack(result: Dict[str, Any]) -> None:
        if not slack_channel:
            return
        try:
            screenshots = result.get("screenshots", {})
            live_screenshot = screenshots.get("live")
            dev_screenshot = screenshots.get("dev")

            # Try to find screenshots in common locations if not in result
            if not live_screenshot or not dev_screenshot:
                safe_path = page_path.replace('/', '_').strip('_') or 'homepage'
                adws_dir = Path(__file__).parent.parent

                # Search patterns for screenshot files
                search_patterns = [
                    # .playwright-mcp directory (common location)
                    (adws_dir / ".playwright-mcp" / f"live-{safe_path}.png",
                     adws_dir / ".playwright-mcp" / f"dev-{safe_path}.png"),
                    (adws_dir / ".playwright-mcp" / "live-homepage.png",
                     adws_dir / ".playwright-mcp" / "dev-homepage.png"),
                    # Standard parity naming
                    (adws_dir / f"parity_LIVE{page_path.replace('/', '_')}.png",
                     adws_dir / f"parity_DEV{page_path.replace('/', '_')}.png"),
                    # Current working directory
                    (Path.cwd() / f"parity_LIVE{page_path.replace('/', '_')}.png",
                     Path.cwd() / f"parity_DEV{page_path.replace('/', '_')}.png"),
                ]

                for live_candidate, dev_candidate in search_patterns:
                    if not live_screenshot and live_candidate.exists():
                        live_screenshot = str(live_candidate)
                    if not dev_screenshot and dev_candidate.exists():
                        dev_screenshot = str(dev_candidate)
                    if live_screenshot and dev_screenshot:
                        break

            slack_result = notify_parity_check_result(
                page_path=page_path,
                result=result.get("visualParity", "FAIL"),
                live_screenshot=live_screenshot,
                dev_screenshot=dev_screenshot,
                channel=slack_channel,
                issues=result.get("issues")
            )
            if slack_result.get("ok"):
                print(f"  [Slack] Notification sent to {slack_channel}")
            elif slack_result.get("skipped"):
                print(f"  [Slack] Skipped: {slack_result.get('error', 'No token configured')}")
            else:
                print(f"  [Slack] Failed: {slack_result.get('error', 'Unknown error')}")
        except Exception as e:
            print(f"  [Slack] Error sending notification: {e}")

    # Pre-flight check: Verify both environments are accessible before agent invocation
    if concurrent and mcp_session and mcp_session_dev:
        live_config = get_session_config(mcp_session)
        dev_config = get_session_config(mcp_session_dev)
        live_url = live_config.get_full_url(page_path)
        dev_url = dev_config.get_full_url(page_path)

        print(f"  [Pre-flight] Checking accessibility: LIVE={live_url}, DEV={dev_url}")
        accessibility = verify_environment_accessibility(live_url, dev_url)

        if not accessibility["can_proceed"]:
            issues = []
            if not accessibility["live"]["accessible"]:
                error_detail = accessibility['live']['error'] or f"status {accessibility['live']['status_code']}"
                issues.append(f"LIVE environment unreachable: {error_detail}")
            if not accessibility["dev"]["accessible"]:
                error_detail = accessibility['dev']['error'] or f"status {accessibility['dev']['status_code']}"
                issues.append(f"DEV environment unreachable: {error_detail}")

            print(f"  [Pre-flight] BLOCKED: {', '.join(issues)}")
            result = {
                "visualParity": "BLOCKED",
                "issues": issues,
                "consoleErrors": [],
                "accessibility": accessibility
            }
            _notify_slack(result)
            return result

        print(f"  [Pre-flight] Both environments accessible, proceeding with visual check")

    # Build appropriate prompt based on concurrent mode
    if concurrent and mcp_session and mcp_session_dev:
        prompt = _build_concurrent_prompt(page_path, mcp_session, mcp_session_dev, port)
    else:
        prompt = _build_sequential_prompt(page_path, mcp_session, port)

    timestamp_dir = Path(__file__).parent.parent / "agents" / "visual_check"
    timestamp_dir.mkdir(parents=True, exist_ok=True)
    output_file = timestamp_dir / f"visual_check_{os.urandom(4).hex()}.jsonl"

    # Determine provider based on use_claude flag or environment
    # Get configurable model for validation phase
    validation_model = get_phase_model("validation")

    if use_claude:
        original_strict_gemini = os.environ.get("STRICT_GEMINI")
        original_adw_provider = os.environ.get("ADW_PROVIDER")
        os.environ["STRICT_GEMINI"] = "false"
        os.environ["ADW_PROVIDER"] = "claude"
        model = validation_model
        provider_name = "Claude"
    else:
        original_strict_gemini = None
        original_adw_provider = None
        model = validation_model
        provider_name = "Gemini"

    try:
        for attempt in range(max_retries):
            request = AgentPromptRequest(
                prompt=prompt,
                adw_id="visual_check",
                agent_name="visual_verifier",
                model=model,
                output_file=str(output_file),
                dangerously_skip_permissions=True,
                mcp_session=mcp_session  # Primary session
            )

            response = prompt_claude_code(request)

            # Check for rate limit errors
            if not response.success and ("429" in response.output or "quota" in response.output.lower() or "RESOURCE_EXHAUSTED" in response.output):
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 10
                    print(f"  [Rate Limit] {provider_name} quota hit. Waiting {wait_time}s before retry {attempt + 2}/{max_retries}...")
                    time.sleep(wait_time)
                    output_file = timestamp_dir / f"visual_check_{os.urandom(4).hex()}.jsonl"
                    continue
                else:
                    result = {
                        "visualParity": "FAIL",
                        "issues": [f"{provider_name} quota exhausted after {max_retries} retries."],
                        "consoleErrors": [],
                        "retryable": True
                    }
                    _notify_slack(result)
                    return result

            if not response.success:
                result = {
                    "visualParity": "FAIL",
                    "issues": [f"Visual check agent failed: {response.output}"],
                    "consoleErrors": []
                }
                _notify_slack(result)
                return result

            # Success - parse JSON from response
            try:
                output_text = response.output

                # Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
                code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', output_text, re.DOTALL)
                if code_block_match:
                    output_text = code_block_match.group(1)

                # Find JSON object in the output
                json_match = re.search(r'\{.*\}', output_text, re.DOTALL)
                if json_match:
                    result = json.loads(json_match.group(0))
                    _notify_slack(result)
                    return result
                else:
                    # Provide more diagnostic info
                    output_preview = response.output[:500] if response.output else "(empty)"
                    result = {
                        "visualParity": "FAIL",
                        "issues": [f"Could not parse JSON from visual check response. Output preview: {output_preview}"],
                        "explanation": response.output
                    }
                    _notify_slack(result)
                    return result
            except json.JSONDecodeError as e:
                result = {
                    "visualParity": "FAIL",
                    "issues": [f"Error parsing visual check response: {str(e)}"],
                    "explanation": response.output
                }
                _notify_slack(result)
                return result

    finally:
        if use_claude:
            if original_strict_gemini is None:
                os.environ.pop("STRICT_GEMINI", None)
            else:
                os.environ["STRICT_GEMINI"] = original_strict_gemini

            if original_adw_provider is None:
                os.environ.pop("ADW_PROVIDER", None)
            else:
                os.environ["ADW_PROVIDER"] = original_adw_provider

    result = {
        "visualParity": "FAIL",
        "issues": ["Unexpected error in visual check"],
        "consoleErrors": []
    }
    _notify_slack(result)
    return result


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

    # Convert session names to MCP tool format (dashes to underscores)
    mcp_live_tool = mcp_live.replace('-', '_')
    mcp_dev_tool = mcp_dev.replace('-', '_')

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
mcp__{mcp_live_tool}__browser_navigate
url: {live_url}
```

### Step 2: Navigate DEV Environment
Use `{mcp_dev}` session (authenticated for {dev_config.base_url}):

```
mcp__{mcp_dev_tool}__browser_navigate
url: {dev_url}
```

### Step 3: Wait for Load
Wait 2-3 seconds for both pages to fully render.

### Step 4: Take Screenshots

**LIVE Screenshot** (using {mcp_live}):
```
mcp__{mcp_live_tool}__browser_take_screenshot
filename: parity_LIVE{page_path.replace('/', '_')}.png
```

**DEV Screenshot** (using {mcp_dev}):
```
mcp__{mcp_dev_tool}__browser_take_screenshot
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


def get_parity_check_summary(results: list) -> Dict[str, Any]:
    """
    Summarize multiple parity check results.

    Args:
        results: List of parity check result dicts

    Returns:
        Summary dict with counts and issues
    """
    passed = sum(1 for r in results if r.get("visualParity") == "PASS")
    failed = sum(1 for r in results if r.get("visualParity") == "FAIL")

    all_issues = []
    for r in results:
        if r.get("issues"):
            all_issues.extend(r["issues"])

    return {
        "total": len(results),
        "passed": passed,
        "failed": failed,
        "pass_rate": f"{(passed / len(results) * 100):.1f}%" if results else "N/A",
        "issues": all_issues
    }
