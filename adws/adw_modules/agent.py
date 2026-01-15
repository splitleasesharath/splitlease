"""Claude Code agent module for executing prompts programmatically."""

import subprocess
import sys
import os
import json
import re
import logging
import time
import shutil
from typing import Optional, List, Dict, Any, Tuple, Final
from dotenv import load_dotenv
from .data_types import (
    AgentPromptRequest,
    AgentPromptResponse,
    AgentTemplateRequest,
    ClaudeCodeResultMessage,
    SlashCommand,
    ModelSet,
    RetryCode,
)
from .gemini_agent import prompt_gemini_agent
from .webhook import notify_failure, notify_in_progress

# Load environment variables
load_dotenv()

# Get Claude Code CLI path from environment
CLAUDE_PATH = os.getenv("CLAUDE_CODE_PATH", "claude")
GEMINI_PATH = os.getenv("GEMINI_CODE_PATH", "gemini")

# Gemini model overrides
GEMINI_BASE_MODEL = os.getenv("GEMINI_BASE_MODEL", "gemini-3-flash-preview")
GEMINI_HEAVY_MODEL = os.getenv("GEMINI_HEAVY_MODEL", "gemini-3-flash-preview")

# Get default provider from environment
ADW_PROVIDER = os.getenv("ADW_PROVIDER", "gemini").lower()

# STRICT MODE: If this is True, the agent will ONLY use Gemini regardless of environment
STRICT_GEMINI = os.getenv("STRICT_GEMINI", "true").lower() == "true"
if STRICT_GEMINI:
    ADW_PROVIDER = "gemini"

# Model selection mapping for slash commands
# Maps each command to its model configuration for base and heavy model sets
SLASH_COMMAND_MODEL_MAP: Final[Dict[SlashCommand, Dict[ModelSet, str]]] = {
    "/classify_issue": {"base": "sonnet", "heavy": "sonnet"},
    "/classify_adw": {"base": "sonnet", "heavy": "sonnet"},
    "/generate_branch_name": {"base": "sonnet", "heavy": "sonnet"},
    "/implement": {"base": "sonnet", "heavy": "opus"},
    "/test": {"base": "sonnet", "heavy": "sonnet"},
    "/resolve_failed_test": {"base": "sonnet", "heavy": "opus"},
    "/test_e2e": {"base": "sonnet", "heavy": "sonnet"},
    "/resolve_failed_e2e_test": {"base": "sonnet", "heavy": "opus"},
    "/review": {"base": "sonnet", "heavy": "sonnet"},
    "/document": {"base": "sonnet", "heavy": "opus"},
    "/commit": {"base": "sonnet", "heavy": "sonnet"},
    "/pull_request": {"base": "sonnet", "heavy": "sonnet"},
    "/chore": {"base": "sonnet", "heavy": "opus"},
    "/bug": {"base": "sonnet", "heavy": "opus"},
    "/feature": {"base": "sonnet", "heavy": "opus"},
    "/patch": {"base": "sonnet", "heavy": "opus"},
    "/claude_browser": {"base": "sonnet", "heavy": "sonnet"},
    "/install_worktree": {"base": "sonnet", "heavy": "sonnet"},
    "/track_agentic_kpis": {"base": "sonnet", "heavy": "sonnet"},
}


def get_model_for_slash_command(
    request: AgentTemplateRequest, default: str = "sonnet"
) -> str:
    """Get the appropriate model for a template request based on ADW state and slash command.

    This function loads the ADW state to determine the model set (base or heavy)
    and returns the appropriate model for the slash command.

    Args:
        request: The template request containing the slash command and adw_id
        default: Default model if not found in mapping

    Returns:
        Model name to use (e.g., "sonnet" or "opus")
    """
    # Import here to avoid circular imports
    from .state import ADWState

    # Load state to get model_set
    model_set: ModelSet = "base"  # Default model set
    state = ADWState.load(request.adw_id)
    if state:
        model_set = state.get("model_set", "base")

    # Get the model configuration for the command
    command_config = SLASH_COMMAND_MODEL_MAP.get(request.slash_command)

    if command_config:
        # Get the model for the specified model set, defaulting to base if not found
        return command_config.get(model_set, command_config.get("base", default))

    return default


def truncate_output(
    output: str, max_length: int = 500, suffix: str = "... (truncated)"
) -> str:
    """Truncate output to a reasonable length for display.

    Special handling for JSONL data - if the output appears to be JSONL,
    try to extract just the meaningful part.

    Args:
        output: The output string to truncate
        max_length: Maximum length before truncation (default: 500)
        suffix: Suffix to add when truncated (default: "... (truncated)")

    Returns:
        Truncated string if needed, original if shorter than max_length
    """
    # Check if this looks like JSONL data
    if output.startswith('{"type":') and '\n{"type":' in output:
        # This is likely JSONL output - try to extract the last meaningful message
        lines = output.strip().split("\n")
        for line in reversed(lines):
            try:
                data = json.loads(line)
                # Look for result message
                if data.get("type") == "result":
                    result = data.get("result", "")
                    if result:
                        return truncate_output(result, max_length, suffix)
                # Look for assistant message
                elif data.get("type") == "assistant" and data.get("message"):
                    content = data["message"].get("content", [])
                    if isinstance(content, list) and content:
                        text = content[0].get("text", "")
                        if text:
                            return truncate_output(text, max_length, suffix)
            except:
                pass
        # If we couldn't extract anything meaningful, just show that it's JSONL
        return f"[JSONL output with {len(lines)} messages]{suffix}"

    # Regular truncation logic
    if len(output) <= max_length:
        return output

    # Try to find a good break point (newline or space)
    truncate_at = max_length - len(suffix)

    # Look for newline near the truncation point
    newline_pos = output.rfind("\n", truncate_at - 50, truncate_at)
    if newline_pos > 0:
        return output[:newline_pos] + suffix

    # Look for space near the truncation point
    space_pos = output.rfind(" ", truncate_at - 20, truncate_at)
    if space_pos > 0:
        return output[:space_pos] + suffix

    # Just truncate at the limit
    return output[:truncate_at] + suffix


def check_agent_installed(provider: str = ADW_PROVIDER) -> Optional[str]:
    """Check if the agent CLI (Claude or Gemini) is installed. Return error message if not."""
    path = GEMINI_PATH if provider == "gemini" else CLAUDE_PATH
    name = "Gemini CLI" if provider == "gemini" else "Claude Code CLI"
    
    # Use shutil.which to verify existence in PATH (handles .cmd/.exe on Windows)
    if not shutil.which(path):
        return f"Error: {name} is not installed or not in PATH. Expected at: {path}"

    try:
        # On Windows, shell=True is often required to execute .cmd/.bat scripts correctly via subprocess
        result = subprocess.run(
            [path, "--version"], 
            capture_output=True, 
            text=True, 
            encoding='utf-8',
            shell=(os.name == 'nt')
        )
        if result.returncode != 0:
            return (
                f"Error: {name} is not installed or returned an error. Expected at: {path}"
            )
    except Exception as e:
        return f"Error: {name} is not installed. Exception: {e}"
    return None


def parse_jsonl_output(
    output_file: str,
) -> Tuple[List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """Parse JSONL output file and return all messages and the result message.

    Returns:
        Tuple of (all_messages, result_message) where result_message is None if not found
    """
    try:
        messages = []
        with open(output_file, "r", encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    # Standard path: try to parse line as pure JSON
                    data = json.loads(line)
                    messages.append(data)
                except json.JSONDecodeError:
                    # Robust path: handles cases where CLI tools output warnings 
                    # or authentication messages prefixed to the JSON stream.
                    if '{"type":' in line:
                        try:
                            json_start = line.find('{"type":')
                            json_data = line[json_start:]
                            data = json.loads(json_data)
                            messages.append(data)
                        except:
                            continue
                    else:
                        # Skip lines that are purely log/warning text
                        continue

            # Find the result message (should be the last one)
            result_message = None
            for message in reversed(messages):
                if message.get("type") == "result":
                    result_message = message
                    break

            return messages, result_message
    except Exception as e:
        return [], None


def convert_jsonl_to_json(jsonl_file: str) -> str:
    """Convert JSONL file to JSON array file.

    Creates a .json file with the same name as the .jsonl file,
    containing all messages as a JSON array.

    Returns:
        Path to the created JSON file
    """
    # Create JSON filename by replacing .jsonl with .json
    json_file = jsonl_file.replace(".jsonl", ".json")

    # Parse the JSONL file
    messages, _ = parse_jsonl_output(jsonl_file)

    # Write as JSON array
    with open(json_file, "w", encoding='utf-8') as f:
        json.dump(messages, f, indent=2)

    return json_file


def get_claude_env() -> Dict[str, str]:
    """Get only the required environment variables for Claude Code execution.

    This is a wrapper around get_safe_subprocess_env() from utils.py for
    backward compatibility. New code should use get_safe_subprocess_env() directly.

    Returns a dictionary containing only the necessary environment variables
    based on .env.sample configuration.
    """
    # Import here to avoid circular imports
    from .utils import get_safe_subprocess_env

    # Use the shared function
    return get_safe_subprocess_env()


def save_prompt(prompt: str, adw_id: str, agent_name: str = "ops") -> None:
    """Save a prompt to the appropriate logging directory."""
    # Extract slash command from prompt
    match = re.match(r"^(/\w+)", prompt)
    if not match:
        return

    slash_command = match.group(1)
    # Remove leading slash for filename
    command_name = slash_command[1:]

    # Create directory structure at project root (parent of adws)
    # __file__ is in adws/adw_modules/, so we need to go up 3 levels to get to project root
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    prompt_dir = os.path.join(project_root, "agents", adw_id, agent_name, "prompts")
    os.makedirs(prompt_dir, exist_ok=True)

    # Save prompt to file
    prompt_file = os.path.join(prompt_dir, f"{command_name}.txt")
    with open(prompt_file, "w", encoding='utf-8') as f:
        f.write(prompt)


def prompt_claude_code_with_retry(
    request: AgentPromptRequest,
    max_retries: int = 3,
    retry_delays: List[int] = None,
) -> AgentPromptResponse:
    """Execute Claude Code with retry logic for certain error types.

    Args:
        request: The prompt request configuration
        max_retries: Maximum number of retry attempts (default: 3)
        retry_delays: List of delays in seconds between retries (default: [1, 3, 5])

    Returns:
        AgentPromptResponse with output and retry code
    """
    if retry_delays is None:
        retry_delays = [1, 3, 5]

    # Ensure we have enough delays for max_retries
    while len(retry_delays) < max_retries:
        retry_delays.append(retry_delays[-1] + 2)  # Add incrementing delays

    last_response = None

    for attempt in range(max_retries + 1):  # +1 for initial attempt
        if attempt > 0:
            # This is a retry
            delay = retry_delays[attempt - 1]
            time.sleep(delay)

        response = prompt_claude_code(request)
        last_response = response

        # Check if we should retry based on the retry code
        if response.success or response.retry_code == RetryCode.NONE:
            # Success or non-retryable error
            return response

        # Check if this is a retryable error
        if response.retry_code in [
            RetryCode.CLAUDE_CODE_ERROR,
            RetryCode.TIMEOUT_ERROR,
            RetryCode.EXECUTION_ERROR,
            RetryCode.ERROR_DURING_EXECUTION,
        ]:
            if attempt < max_retries:
                continue
            else:
                return response

    # Should not reach here, but return last response just in case
    return last_response


def _attempt_claude_fallback(
    request: AgentPromptRequest,
    gemini_error: str,
    original_provider: str,
    original_strict: str
) -> Optional[AgentPromptResponse]:
    """Attempt to fallback to Claude when Gemini fails.

    Args:
        request: Original request to retry with Claude
        gemini_error: Error message from Gemini failure
        original_provider: Original ADW_PROVIDER value to restore
        original_strict: Original STRICT_GEMINI value to restore

    Returns:
        AgentPromptResponse if fallback succeeds, None if fallback is disabled or fails
    """
    # Only fallback if we were using Gemini
    if original_provider != "gemini":
        return None

    # Check if fallback is enabled (can be disabled via environment)
    if os.getenv("DISABLE_GEMINI_FALLBACK", "false").lower() == "true":
        return None

    # Log the fallback attempt
    error_snippet = gemini_error[:80].replace("\n", " ") if gemini_error else "Unknown error"
    print(f"  [Fallback] Gemini failed: {error_snippet}")
    print(f"  [Fallback] Retrying with Claude...")

    # Send Slack notification about fallback
    notify_in_progress(step=f"Gemini failed, falling back to Claude - {error_snippet}")

    try:
        # Temporarily override environment to use Claude
        os.environ["ADW_PROVIDER"] = "claude"
        os.environ["STRICT_GEMINI"] = "false"

        # Create new output file for Claude attempt
        claude_output = request.output_file.replace(".jsonl", "_claude_fallback.jsonl")
        fallback_request = AgentPromptRequest(
            prompt=request.prompt,
            adw_id=request.adw_id,
            agent_name=request.agent_name,
            model=request.model,
            output_file=claude_output,
            dangerously_skip_permissions=request.dangerously_skip_permissions,
            working_dir=request.working_dir,
            mcp_session=request.mcp_session
        )

        # Recursively call prompt_claude_code (now it will use Claude)
        response = prompt_claude_code(fallback_request)

        if response.success:
            print(f"  [Fallback] Claude succeeded")
        else:
            print(f"  [Fallback] Claude also failed: {response.output[:80]}")

        return response

    finally:
        # Restore original environment
        os.environ["ADW_PROVIDER"] = original_provider
        os.environ["STRICT_GEMINI"] = original_strict


def prompt_claude_code(request: AgentPromptRequest) -> AgentPromptResponse:
    """Execute AI agent (Claude or Gemini) with the given prompt configuration.

    Passes the prompt via stdin instead of command-line arguments to avoid
    shell interpretation issues with special characters, JSON, etc.
    This is especially important on Windows when cwd is set.

    Automatic Fallback: If Gemini fails with a retryable error, the function
    will automatically retry with Claude and notify via Slack.
    """

    # Re-check provider and strict mode to ensure we respect late environment changes
    provider = os.getenv("ADW_PROVIDER", ADW_PROVIDER).lower()
    strict_gemini = os.getenv("STRICT_GEMINI", str(STRICT_GEMINI)).lower() == "true"
    if strict_gemini:
        provider = "gemini"

    # Store original values for potential fallback
    original_provider = provider
    original_strict = os.getenv("STRICT_GEMINI", str(STRICT_GEMINI))

    agent_name = "Gemini" if provider == "gemini" else "Claude Code"

    # Check if AI agent CLI is installed
    error_msg = check_agent_installed(provider)
    if error_msg:
        return AgentPromptResponse(
            output=error_msg,
            success=False,
            session_id=None,
            retry_code=RetryCode.NONE,  # Installation error is not retryable
        )

    # Validate prompt is not empty
    if not request.prompt or not request.prompt.strip():
        return AgentPromptResponse(
            output=f"Error: Empty prompt provided to {agent_name}",
            success=False,
            session_id=None,
            retry_code=RetryCode.NONE,
        )

    # Save prompt before execution
    save_prompt(request.prompt, request.adw_id, request.agent_name)

    # Create output directory if needed
    output_dir = os.path.dirname(request.output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    # Build command - use stdin for prompt instead of -p flag
    # This prevents shell interpretation issues with special characters, JSON, etc.
    # especially on Windows when cwd is set
    if provider == "gemini":
        # Always use CLI for Gemini to support MCP and consistent execution
        cmd = [GEMINI_PATH]
        
        # Map Claude models to Gemini if necessary, or just use as provided
        model = request.model
        if model == "sonnet":
            model = os.getenv("GEMINI_BASE_MODEL", GEMINI_BASE_MODEL)
        elif model == "opus":
            model = os.getenv("GEMINI_HEAVY_MODEL", GEMINI_HEAVY_MODEL)
            
        # Fix common incorrect model names from environment
        if model == "gemini-3-flash":
            model = "gemini-3-flash-preview"
        elif model == "gemini-3-pro":
            model = "gemini-3-pro-preview"
            
        cmd.extend(["--model", model])
        cmd.extend(["--output-format", "stream-json"])

        # Add MCP session support for Gemini CLI
        # Use --allowed-mcp-server-names to enable specific MCP server(s)
        if request.mcp_session:
            cmd.extend(["--allowed-mcp-server-names", request.mcp_session])

        # Gemini uses --yolo or --approval-mode=yolo for auto-approval
        if request.dangerously_skip_permissions:
            cmd.append("--yolo")
    else:
        cmd = [CLAUDE_PATH]
        cmd.extend(["--model", request.model])
        cmd.extend(["--output-format", "stream-json"])
        cmd.append("--verbose")

        # Add dangerous skip permissions flag if enabled
        if request.dangerously_skip_permissions:
            cmd.append("--dangerously-skip-permissions")

    # Check for MCP config in working directory
    # Only supported by Claude Code CLI
    if provider != "gemini" and request.working_dir:
        mcp_config_path = os.path.join(request.working_dir, ".mcp.json")
        if os.path.exists(mcp_config_path):
            cmd.extend(["--mcp-config", mcp_config_path])

    # Set up environment with only required variables
    env = get_claude_env()

    try:
        # Open output file for streaming
        with open(request.output_file, "w", encoding='utf-8') as output_f:
            # Execute Claude Code with prompt via stdin (not command-line argument)
            # This avoids all shell argument parsing/escaping issues
            result = subprocess.run(
                cmd,
                input=request.prompt,  # Prompt via stdin (subprocess.PIPE is implicit)
                stdout=output_f,  # Stream directly to file
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                env=env,
                cwd=request.working_dir,  # Use working_dir if provided
                shell=(os.name == 'nt'),  # Required on Windows for npm-installed binaries like gemini.cmd
            )

        if result.returncode == 0:

            # Parse the JSONL file
            messages, result_message = parse_jsonl_output(request.output_file)

            # Convert JSONL to JSON array file
            json_file = convert_jsonl_to_json(request.output_file)

            if result_message:
                # Extract session_id from result message
                session_id = result_message.get("session_id")

                # Check for API-level errors (quota exhausted, rate limits, etc.)
                # These come as {"type":"result","status":"error","error":{...}}
                if result_message.get("status") == "error" and result_message.get("error"):
                    error_obj = result_message.get("error", {})
                    error_msg = error_obj.get("message", "Unknown API error")

                    # Attempt fallback to Claude for API errors (quota, rate limit)
                    fallback_response = _attempt_claude_fallback(
                        request, error_msg, original_provider, original_strict
                    )
                    if fallback_response:
                        return fallback_response

                    return AgentPromptResponse(
                        output=f"{agent_name} API error: {error_msg}",
                        success=False,
                        session_id=session_id,
                        retry_code=RetryCode.CLAUDE_CODE_ERROR,
                    )

                # Check if there was an error in the result
                is_error = result_message.get("is_error", False)
                subtype = result_message.get("subtype", "")

                # Handle error_during_execution case where there's no result field
                if subtype == "error_during_execution":
                    error_msg = f"Error during execution: {agent_name} encountered an error and did not return a result"

                    # Attempt fallback to Claude if Gemini had execution error
                    fallback_response = _attempt_claude_fallback(
                        request, error_msg, original_provider, original_strict
                    )
                    if fallback_response:
                        return fallback_response

                    return AgentPromptResponse(
                        output=error_msg,
                        success=False,
                        session_id=session_id,
                        retry_code=RetryCode.ERROR_DURING_EXECUTION,
                    )

                result_text = result_message.get("result", "")

                # For error cases, truncate the output to prevent JSONL blobs
                if is_error and len(result_text) > 1000:
                    result_text = truncate_output(result_text, max_length=800)

                return AgentPromptResponse(
                    output=result_text,
                    success=not is_error,
                    session_id=session_id,
                    retry_code=RetryCode.NONE,  # No retry needed for successful or non-retryable errors
                )
            else:
                # No result message found, try to reconstruct from assistant messages
                # (Common for Gemini CLI streaming output)
                reconstructed_text = ""
                session_id = None
                
                for msg in messages:
                    # Capture session_id if we see an init message
                    if msg.get("type") == "init":
                        session_id = msg.get("session_id")
                        continue
                        
                    # Look for assistant messages
                    if msg.get("type") == "message" and msg.get("role") == "assistant":
                        # 1. Handle simple content string (legacy/other providers)
                        content = msg.get("content")
                        if isinstance(content, str):
                            reconstructed_text += content
                        
                        # 2. Handle complex message structure with content parts (Gemini CLI)
                        # The structure is: {"type":"message", "message":{"content":[{"text":"..."}]}}
                        inner_msg = msg.get("message")
                        if isinstance(inner_msg, dict):
                            msg_content = inner_msg.get("content")
                            # It could be a list of parts or a string
                            if isinstance(msg_content, list):
                                for part in msg_content:
                                    if isinstance(part, dict) and "text" in part:
                                        reconstructed_text += part["text"]
                            elif isinstance(msg_content, str):
                                reconstructed_text += msg_content
                                
                if reconstructed_text:
                    return AgentPromptResponse(
                        output=reconstructed_text.strip(),
                        success=True,
                        session_id=session_id,
                        retry_code=RetryCode.NONE,
                    )

                # No reconstructed text, try to extract meaningful error
                error_msg = f"No result message found in {agent_name} output"

                # Try to get the last few lines of output for context
                try:
                    with open(request.output_file, "r", encoding='utf-8') as f:
                        lines = f.readlines()
                        if lines:
                            # Get last 5 lines or less
                            last_lines = lines[-5:] if len(lines) > 5 else lines
                            # Try to parse each as JSON to find any error messages
                            for line in reversed(last_lines):
                                try:
                                    data = json.loads(line.strip())
                                    if data.get("type") == "assistant" and data.get(
                                        "message"
                                    ):
                                        # Extract text from assistant message
                                        content = data["message"].get("content", [])
                                        if isinstance(content, list) and content:
                                            text = content[0].get("text", "")
                                            if text:
                                                error_msg = f"{agent_name} output: {text[:500]}"  # Truncate
                                                break
                                except:
                                    pass
                except:
                    pass

                return AgentPromptResponse(
                    output=truncate_output(error_msg, max_length=800),
                    success=False,
                    session_id=None,
                    retry_code=RetryCode.NONE,
                )
        else:
            # Error occurred - stderr is captured, stdout went to file
            stderr_msg = result.stderr.strip() if result.stderr else ""

            # Try to read the output file to check for errors in stdout
            stdout_msg = ""
            error_from_jsonl = None
            try:
                if os.path.exists(request.output_file):
                    # Parse JSONL to find error message
                    messages, result_message = parse_jsonl_output(request.output_file)

                    if result_message and result_message.get("is_error"):
                        # Found error in result message
                        error_from_jsonl = result_message.get("result", "Unknown error")
                    elif messages:
                        # Look for error in last few messages
                        for msg in reversed(messages[-5:]):
                            if msg.get("type") == "assistant" and msg.get(
                                "message", {}
                            ).get("content"):
                                content = msg["message"]["content"]
                                if isinstance(content, list) and content:
                                    text = content[0].get("text", "")
                                    if text and (
                                        "error" in text.lower()
                                        or "failed" in text.lower()
                                    ):
                                        error_from_jsonl = text[:500]  # Truncate
                                        break

                    # If no structured error found, get last line only
                    if not error_from_jsonl:
                        with open(request.output_file, "r", encoding='utf-8') as f:
                            lines = f.readlines()
                            if lines:
                                # Just get the last line instead of entire file
                                stdout_msg = lines[-1].strip()[
                                    :200
                                ]  # Truncate to 200 chars
            except:
                pass

            if error_from_jsonl:
                error_msg = f"{agent_name} error: {error_from_jsonl}"
            elif stdout_msg and not stderr_msg:
                error_msg = f"{agent_name} error: {stdout_msg}"
            elif stderr_msg and not stdout_msg:
                error_msg = f"{agent_name} error: {stderr_msg}"
            elif stdout_msg and stderr_msg:
                error_msg = f"{agent_name} error: {stderr_msg}\nStdout: {stdout_msg}"
            else:
                error_msg = f"{agent_name} error: Command failed with exit code {result.returncode}"

            # Attempt fallback to Claude if Gemini failed
            fallback_response = _attempt_claude_fallback(
                request, error_msg, original_provider, original_strict
            )
            if fallback_response:
                return fallback_response

            # Always truncate error messages to prevent huge outputs
            return AgentPromptResponse(
                output=truncate_output(error_msg, max_length=800),
                success=False,
                session_id=None,
                retry_code=RetryCode.CLAUDE_CODE_ERROR,
            )

    except subprocess.TimeoutExpired:
        error_msg = f"Error: {agent_name} command timed out after 5 minutes"

        # Attempt fallback to Claude if Gemini timed out
        fallback_response = _attempt_claude_fallback(
            request, error_msg, original_provider, original_strict
        )
        if fallback_response:
            return fallback_response

        return AgentPromptResponse(
            output=error_msg,
            success=False,
            session_id=None,
            retry_code=RetryCode.TIMEOUT_ERROR,
        )
    except Exception as e:
        error_msg = f"Error executing {agent_name}: {e}"

        # Attempt fallback to Claude if Gemini had an execution error
        fallback_response = _attempt_claude_fallback(
            request, error_msg, original_provider, original_strict
        )
        if fallback_response:
            return fallback_response

        return AgentPromptResponse(
            output=error_msg,
            success=False,
            session_id=None,
            retry_code=RetryCode.EXECUTION_ERROR,
        )


def execute_template(request: AgentTemplateRequest) -> AgentPromptResponse:
    """Execute a Claude Code template with slash command and arguments.

    This function automatically selects the appropriate model based on:
    1. The slash command being executed
    2. The model_set stored in the ADW state (base or heavy)

    Example:
        request = AgentTemplateRequest(
            agent_name="planner",
            slash_command="/implement",
            args=["plan.md"],
            adw_id="abc12345"
        )
        # If state has model_set="heavy", this will use "opus"
        # If state has model_set="base" or missing, this will use "sonnet"
        response = execute_template(request)
    """
    # Get the appropriate model for this request
    mapped_model = get_model_for_slash_command(request)
    request = request.model_copy(update={"model": mapped_model})

    # Construct prompt from slash command and args
    prompt = f"{request.slash_command} {' '.join(request.args)}"

    # Create output directory with adw_id at project root
    # __file__ is in adws/adw_modules/, so we need to go up 3 levels to get to project root
    project_root = os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    output_dir = os.path.join(
        project_root, "agents", request.adw_id, request.agent_name
    )
    os.makedirs(output_dir, exist_ok=True)

    # Build output file path
    output_file = os.path.join(output_dir, "raw_output.jsonl")

    # Create prompt request with specific parameters
    prompt_request = AgentPromptRequest(
        prompt=prompt,
        adw_id=request.adw_id,
        agent_name=request.agent_name,
        model=request.model,
        dangerously_skip_permissions=True,
        output_file=output_file,
        working_dir=request.working_dir,  # Pass through working_dir
    )

    # Execute with retry logic and return response (prompt_claude_code now handles all parsing)
    return prompt_claude_code_with_retry(prompt_request)
