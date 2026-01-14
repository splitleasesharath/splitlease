"""
Visual Regression Module - Compares Dev vs Live using Playwright MCP

Supports both Gemini and Claude providers with automatic retry on rate limits.
"""

import os
import json
import time
import re
from pathlib import Path
from typing import Dict, Any, Optional
from .agent import prompt_claude_code
from .data_types import AgentPromptRequest


def check_visual_parity(
    page_path: str,
    mcp_session: Optional[str] = None,
    auth_type: str = "public",
    port: int = 8010,
    max_retries: int = 3,
    use_claude: bool = False
) -> Dict[str, Any]:
    """
    Use Playwright MCP to compare refactored page vs live.

    Args:
        page_path: The URL path to check (e.g., "/search")
        mcp_session: The MCP session name (e.g., "playwright-host")
        auth_type: "public", "host", "guest", etc.
        port: The dev server port
        max_retries: Maximum retry attempts on rate limit errors
        use_claude: If True, use Claude instead of Gemini (avoids quota issues)

    Returns:
        Dict with "visualParity" ("PASS"/"FAIL"), "issues", and "consoleErrors"
    """
    print(f"  [Visual Check] Comparing {page_path} (Auth: {auth_type}, Session: {mcp_session})")

    # Load prompt from template
    prompt_template_path = Path(__file__).parent.parent / "prompts" / "visual_check_gemini.txt"
    if prompt_template_path.exists():
        prompt_template = prompt_template_path.read_text(encoding='utf-8')
        prompt = prompt_template.format(
            page_path=page_path,
            mcp_session=mcp_session or "none",
            auth_type=auth_type,
            port=port
        )
    else:
        # Fallback prompt
        prompt = f"""Compare the refactored version of {page_path} against live production.

1. Navigate to LIVE: https://split.lease{page_path}
2. Take screenshot
3. Navigate to DEV: http://localhost:{port}{page_path}
4. Take screenshot
5. Compare visually

Return JSON: {{"visualParity": "PASS"|"FAIL", "issues": [], "explanation": ""}}
"""

    timestamp_dir = Path(__file__).parent.parent / "agents" / "visual_check"
    timestamp_dir.mkdir(parents=True, exist_ok=True)
    output_file = timestamp_dir / f"visual_check_{os.urandom(4).hex()}.jsonl"

    # Determine provider based on use_claude flag or environment
    if use_claude:
        # Force Claude provider
        original_strict_gemini = os.environ.get("STRICT_GEMINI")
        original_adw_provider = os.environ.get("ADW_PROVIDER")
        os.environ["STRICT_GEMINI"] = "false"
        os.environ["ADW_PROVIDER"] = "claude"
        model = "sonnet"
        provider_name = "Claude"
    else:
        original_strict_gemini = None
        original_adw_provider = None
        model = "sonnet"  # Maps to gemini-3-flash-preview when STRICT_GEMINI=true
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
                mcp_session=mcp_session
            )

            response = prompt_claude_code(request)

            # Check for rate limit errors
            if not response.success and ("429" in response.output or "quota" in response.output.lower() or "RESOURCE_EXHAUSTED" in response.output):
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 10  # 10s, 20s, 40s
                    print(f"  [Rate Limit] {provider_name} quota hit. Waiting {wait_time}s before retry {attempt + 2}/{max_retries}...")
                    time.sleep(wait_time)
                    # Generate new output file for retry
                    output_file = timestamp_dir / f"visual_check_{os.urandom(4).hex()}.jsonl"
                    continue
                else:
                    # All retries exhausted - suggest using Claude
                    return {
                        "visualParity": "FAIL",
                        "issues": [f"{provider_name} quota exhausted after {max_retries} retries. Try again later or use --use-claude flag."],
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
            except Exception as e:
                return {
                    "visualParity": "FAIL",
                    "issues": [f"Error parsing visual check response: {str(e)}"],
                    "explanation": response.output
                }

    finally:
        # Restore original environment if we modified it
        if use_claude:
            if original_strict_gemini is None:
                os.environ.pop("STRICT_GEMINI", None)
            else:
                os.environ["STRICT_GEMINI"] = original_strict_gemini

            if original_adw_provider is None:
                os.environ.pop("ADW_PROVIDER", None)
            else:
                os.environ["ADW_PROVIDER"] = original_adw_provider

    # Should not reach here, but just in case
    return {
        "visualParity": "FAIL",
        "issues": ["Unexpected error in visual check"],
        "consoleErrors": []
    }
