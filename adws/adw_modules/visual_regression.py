"""
Visual Regression Module - Compares Dev vs Live using Playwright MCP

Supports concurrent LIVE vs DEV comparison using dual MCP sessions:
- playwright-host-live / playwright-host-dev for host pages
- playwright-guest-live / playwright-guest-dev for guest pages

Automatic retry on rate limits with provider switching.
"""

import os
import json
import time
import re
from pathlib import Path
from typing import Dict, Any, Optional
from .agent import prompt_claude_code
from .data_types import AgentPromptRequest


LIVE_BASE_URL = "https://split.lease"
DEV_BASE_URL = "http://localhost"


def check_visual_parity(
    page_path: str,
    mcp_session: Optional[str] = None,
    mcp_session_dev: Optional[str] = None,
    auth_type: str = "public",
    port: int = 8010,
    max_retries: int = 3,
    use_claude: bool = False,
    concurrent: bool = False
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

    Returns:
        Dict with "visualParity" ("PASS"/"FAIL"), "issues", and "consoleErrors"
    """
    session_info = f"LIVE:{mcp_session or 'public'}, DEV:{mcp_session_dev or 'public'}" if concurrent else f"Session:{mcp_session}"
    print(f"  [Visual Check] Comparing {page_path} ({session_info})")

    # Build appropriate prompt based on concurrent mode
    if concurrent and mcp_session and mcp_session_dev:
        prompt = _build_concurrent_prompt(page_path, mcp_session, mcp_session_dev, port)
    else:
        prompt = _build_sequential_prompt(page_path, mcp_session, port)

    timestamp_dir = Path(__file__).parent.parent / "agents" / "visual_check"
    timestamp_dir.mkdir(parents=True, exist_ok=True)
    output_file = timestamp_dir / f"visual_check_{os.urandom(4).hex()}.jsonl"

    # Determine provider based on use_claude flag or environment
    if use_claude:
        original_strict_gemini = os.environ.get("STRICT_GEMINI")
        original_adw_provider = os.environ.get("ADW_PROVIDER")
        os.environ["STRICT_GEMINI"] = "false"
        os.environ["ADW_PROVIDER"] = "claude"
        model = "sonnet"
        provider_name = "Claude"
    else:
        original_strict_gemini = None
        original_adw_provider = None
        model = "sonnet"
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
                    return {
                        "visualParity": "FAIL",
                        "issues": [f"{provider_name} quota exhausted after {max_retries} retries."],
                        "consoleErrors": [],
                        "retryable": True
                    }

            if not response.success:
                return {
                    "visualParity": "FAIL",
                    "issues": [f"Visual check agent failed: {response.output}"],
                    "consoleErrors": []
                }

            # Success - parse JSON from response
            try:
                json_match = re.search(r'\{.*\}', response.output, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group(0))
                else:
                    return {
                        "visualParity": "FAIL",
                        "issues": ["Could not parse JSON from visual check response"],
                        "explanation": response.output
                    }
            except json.JSONDecodeError as e:
                return {
                    "visualParity": "FAIL",
                    "issues": [f"Error parsing visual check response: {str(e)}"],
                    "explanation": response.output
                }

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

    return {
        "visualParity": "FAIL",
        "issues": ["Unexpected error in visual check"],
        "consoleErrors": []
    }


def _build_sequential_prompt(page_path: str, mcp_session: Optional[str], port: int) -> str:
    """Build prompt for sequential (single session) visual check."""
    prompt_template_path = Path(__file__).parent.parent / "prompts" / "visual_check_gemini.txt"
    if prompt_template_path.exists():
        prompt_template = prompt_template_path.read_text(encoding='utf-8')
        return prompt_template.format(
            page_path=page_path,
            mcp_session=mcp_session or "none",
            auth_type="protected" if mcp_session else "public",
            port=port
        )
    else:
        return f"""Compare the refactored version of {page_path} against live production.

1. Navigate to LIVE: {LIVE_BASE_URL}{page_path}
2. Take screenshot
3. Navigate to DEV: {DEV_BASE_URL}:{port}{page_path}
4. Take screenshot
5. Compare visually

Return JSON: {{"visualParity": "PASS"|"FAIL", "issues": [], "explanation": ""}}
"""


def _build_concurrent_prompt(
    page_path: str,
    mcp_live: str,
    mcp_dev: str,
    port: int
) -> str:
    """
    Build prompt for concurrent dual-session visual check.

    This prompt instructs the agent to use TWO MCP sessions simultaneously:
    - mcp_live session navigates to LIVE (split.lease)
    - mcp_dev session navigates to DEV (localhost)

    Both screenshots are captured before comparison to ensure state parity.
    """
    return f"""# Concurrent Visual Parity Check

## Objective
Compare {page_path} between LIVE and DEV environments using parallel MCP sessions.

## MCP Sessions
- **LIVE Session**: `{mcp_live}` → {LIVE_BASE_URL}{page_path}
- **DEV Session**: `{mcp_dev}` → {DEV_BASE_URL}:{port}{page_path}

## Instructions

### Step 1: Concurrent Navigation
Use BOTH MCP sessions to navigate simultaneously:

**{mcp_live}** (LIVE):
```
mcp__{mcp_live}__browser_navigate
url: {LIVE_BASE_URL}{page_path}
```

**{mcp_dev}** (DEV):
```
mcp__{mcp_dev}__browser_navigate
url: {DEV_BASE_URL}:{port}{page_path}
```

### Step 2: Wait for Load
Wait 2 seconds for both pages to fully render.

### Step 3: Concurrent Screenshots
Take screenshots from BOTH sessions:

**{mcp_live}** (LIVE):
```
mcp__{mcp_live}__browser_take_screenshot
filename: parity_LIVE_{page_path.replace('/', '_')}.png
```

**{mcp_dev}** (DEV):
```
mcp__{mcp_dev}__browser_take_screenshot
filename: parity_DEV_{page_path.replace('/', '_')}.png
```

### Step 4: Visual Comparison
Compare the two screenshots for:
- Layout consistency
- Text content matching
- Color/styling parity
- Component positioning
- Missing or extra elements

### Step 5: Return Result
Return a JSON object:

```json
{{
    "visualParity": "PASS" | "FAIL",
    "issues": ["List any visual differences found"],
    "explanation": "Brief summary of comparison",
    "screenshots": {{
        "live": "parity_LIVE_{page_path.replace('/', '_')}.png",
        "dev": "parity_DEV_{page_path.replace('/', '_')}.png"
    }}
}}
```

## Important
- PASS if pages are visually identical or have only minor acceptable differences
- FAIL if there are significant layout shifts, missing elements, or broken styling
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
