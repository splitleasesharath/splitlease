"""
Visual Regression Module - Compares Dev vs Live using Gemini + Playwright MCP
"""

import os
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional
from .agent import prompt_claude_code
from .data_types import AgentPromptRequest


def check_visual_parity(
    page_path: str,
    mcp_session: Optional[str] = None,
    auth_type: str = "public",
    port: int = 8010
) -> Dict[str, Any]:
    """
    Use Gemini 3 Flash + Playwright MCP to compare refactored page vs live.

    Args:
        page_path: The URL path to check (e.g., "/search")
        mcp_session: The MCP session name (e.g., "playwright-host")
        auth_type: "public", "host", "guest", etc.
        port: The dev server port

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
        # Fallback
        prompt = f"""Compare the refactored version of {page_path} against live production.
...
"""

    # We use Gemini 3 Flash for implementation/visual check tasks
    # In agent.py, model="sonnet" maps to GEMINI_BASE_MODEL (gemini-3-flash)
    # when provider="gemini".
    
    timestamp = Path(__file__).parent.parent / "agents" / "visual_check"
    timestamp.mkdir(parents=True, exist_ok=True)
    output_file = timestamp / f"visual_check_{os.urandom(4).hex()}.jsonl"

    request = AgentPromptRequest(
        prompt=prompt,
        adw_id="visual_check",
        agent_name="visual_verifier",
        model="sonnet",  # Maps to gemini-3-flash-preview via GEMINI_BASE_MODEL
        output_file=str(output_file),
        dangerously_skip_permissions=True,
        mcp_session=mcp_session
    )

    # Note: The agent.py doesn't currently support passing mcp_session to prompt_claude_code
    # for the gemini provider in a way that maps to the CLI flag.
    # I might need to adjust agent.py or handle it here if I want to pass --mcp-session.
    # However, the user's plan showed:
    # response = prompt_gemini_agent(prompt=prompt, mcp_session=mcp_session)
    # But gemini_agent.py doesn't have mcp_session in prompt_gemini_agent either.
    
    # If the environment is set up such that the gemini CLI can be called with --mcp-session,
    # I should update agent.py to support it.

    response = prompt_claude_code(request)

    if not response.success:
        return {
            "visualParity": "FAIL",
            "issues": [f"Visual check agent failed: {response.output}"],
            "consoleErrors": []
        }

    # Try to extract JSON from response
    try:
        # Look for JSON in the output
        import re
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
