"""Gemini API agent module using the new google-genai SDK with tool support."""

import os
import glob
import json
import logging
import subprocess
import re
from pathlib import Path
from google import genai
from google.genai import types
from typing import Optional, List, Dict, Any, Union
from dotenv import load_dotenv
from .data_types import AgentPromptResponse, RetryCode

# Load environment variables from adws/.env explicitly
_ADWS_ENV_PATH = Path(__file__).parent.parent / ".env"
load_dotenv(_ADWS_ENV_PATH)

# State file for key rotation (persists across calls)
_KEY_STATE_FILE = Path(__file__).parent.parent / ".gemini_key_state"

# Logger for key rotation tracking
_logger = logging.getLogger("gemini_agent")


def get_gemini_api_key() -> Optional[str]:
    """Get next Gemini API Key using round-robin rotation.

    Alternates between PRIMARY and SECONDARY keys on each call.
    State is persisted to disk for cross-process consistency.
    """
    keys = [
        os.getenv("GEMINIAPIKEY_PRIMARY"),
        os.getenv("GEMINIAPIKEY_SECONDARY"),
    ]

    # Filter out None/empty keys
    available_keys = [(i, k) for i, k in enumerate(keys) if k]

    if not available_keys:
        _logger.error("No Gemini API keys found in environment")
        return None

    if len(available_keys) == 1:
        idx, key = available_keys[0]
        label = "PRIMARY" if idx == 0 else "SECONDARY"
        _logger.info(f"[GEMINI KEY] Using {label} (only key available)")
        return key

    # Read last used index from state file
    try:
        last_index = int(_KEY_STATE_FILE.read_text().strip())
    except (FileNotFoundError, ValueError):
        last_index = 1  # Start with 1 so first rotation gives 0 (PRIMARY)

    # Rotate to next key
    next_index = (last_index + 1) % 2

    # Persist state
    _KEY_STATE_FILE.write_text(str(next_index))

    # Get key and log
    key = keys[next_index]
    label = "PRIMARY" if next_index == 0 else "SECONDARY"
    _logger.info(f"[GEMINI KEY] Rotated to {label}")

    return key

def list_files(path: str = ".") -> str:
    """List files in a directory."""
    try:
        import os
        files = os.listdir(path)
        return "\n".join(files)
    except Exception as e:
        return f"Error listing files: {str(e)}"

def find_files(pattern: str, path: str = ".") -> str:
    """Find files matching a glob pattern recursively."""
    try:
        # glob.glob returns a list of paths
        files = glob.glob(os.path.join(path, pattern), recursive=True)
        if not files:
            return "No files found matching the pattern."
        return "\n".join(files)
    except Exception as e:
        return f"Error finding files: {str(e)}"

def read_file(path: str) -> str:
    """Read a file's content."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

def write_file(path: str, contents: str) -> str:
    """Write contents to a file."""
    try:
        with open(path, "w", encoding="utf-8") as f:
            f.write(contents)
        return f"Successfully wrote to {path}"
    except Exception as e:
        return f"Error writing file: {str(e)}"

def replace_in_file(path: str, old_string: str, new_string: str) -> str:
    """Replace a string in a file with another string."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        if old_string not in content:
            return f"Error: '{old_string}' not found in {path}"
        
        new_content = content.replace(old_string, new_string)
        
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
            
        return f"Successfully replaced text in {path}"
    except Exception as e:
        return f"Error replacing text in file: {str(e)}"

def search_files(pattern: str, path: str = ".") -> str:
    """Search for a regex pattern in files within a directory recursively."""
    try:
        results = []
        regex = re.compile(pattern)
        for root, _, files in os.walk(path):
            for file in files:
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8", errors='ignore') as f:
                        lines = f.readlines()
                        for i, line in enumerate(lines):
                            if regex.search(line):
                                results.append(f"{file_path}:{i+1}: {line.strip()}")
                except Exception:
                    # Skip files that can't be read (binary, etc.)
                    continue
        
        if not results:
            return "No matches found."
        
        # Limit results to avoid token limits
        return "\n".join(results[:500]) 
    except Exception as e:
        return f"Error searching files: {str(e)}"

def run_command(command: str) -> str:
    """Run a shell command."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        return f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
    except Exception as e:
        return f"Error running command: {str(e)}"

def prompt_gemini_agent(
    prompt: str,
    model_name: str = "gemini-3-flash-preview", # Updated default model
    system_instruction: str = """You are a high-performance AI developer agent. 
You have access to tools to interact with the file system and run shell commands.
Your primary goal is to assist with software engineering tasks including:
- Auditing code for best practices (e.g. Functional Programming)
- Implementing refactoring plans
- Running tests and fixing failures
- Generating documentation

If you receive a prompt starting with a slash (e.g. /implement, /test, /review), treat it as a directive to perform that specific action using your tools.
For example:
- /implement plan.md means 'Read plan.md and implement the changes described'
- /test means 'Run the project's test suite and report results'

Always provide a concise summary of your actions before concluding.
""",
) -> AgentPromptResponse:
    """Execute Gemini Agent via the new google-genai SDK with tool support."""
    
    api_key = get_gemini_api_key()
    if not api_key:
        return AgentPromptResponse(
            output="Error: GEMINIAPIKEY not found in environment variables.",
            success=False,
            retry_code=RetryCode.NONE
        )

    try:
        # Initialize the new GenAI client
        client = genai.Client(api_key=api_key)
        
        # Define tools for Gemini
        tools = [
            list_files, 
            read_file, 
            write_file, 
            run_command,
            find_files,
            replace_in_file,
            search_files
        ]

        # Configure the chat with automatic function calling
        config = types.GenerateContentConfig(
            tools=tools,
            system_instruction=system_instruction,
            temperature=0.7,
            top_p=0.95,
            max_output_tokens=8192,
        )

        # Create a chat session
        chat = client.chats.create(
            model=model_name,
            config=config
        )
        
        # Send message and handle tool calls in a loop
        response = chat.send_message(prompt)
        
        # Tool map for execution
        tool_map = {
            "list_files": list_files,
            "read_file": read_file,
            "write_file": write_file,
            "run_command": run_command,
            "find_files": find_files,
            "replace_in_file": replace_in_file,
            "search_files": search_files
        }

        max_iterations = 15 # Increased iterations for complex tasks
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            
            # Check for text response (GenAI SDK warns if non-text parts exist)
            try:
                if response.text:
                    return AgentPromptResponse(
                        output=response.text,
                        success=True,
                        session_id="api_session_" + os.urandom(4).hex()
                    )
            except Exception:
                # response.text might raise if no text part is present
                pass
            
            # Check for function calls
            function_calls = []
            if hasattr(response, 'candidates') and response.candidates:
                for cand in response.candidates:
                    if hasattr(cand.content, 'parts'):
                        for part in cand.content.parts:
                            if hasattr(part, 'function_call') and part.function_call:
                                function_calls.append(part.function_call)
            
            if not function_calls:
                return AgentPromptResponse(
                    output="Error: Gemini API returned an empty response. Check safety filters.",
                    success=False,
                    retry_code=RetryCode.NONE
                )
            
            # Execute function calls and collect responses
            tool_responses = []
            for fc in function_calls:
                tool_func = tool_map.get(fc.name)
                
                if tool_func:
                    try:
                        args = fc.args or {}
                        result = tool_func(**args)
                        tool_responses.append(types.Part.from_function_response(
                            name=fc.name,
                            response={'result': result}
                        ))
                    except Exception as e:
                        tool_responses.append(types.Part.from_function_response(
                            name=fc.name,
                            response={'error': str(e)}
                        ))
                else:
                    tool_responses.append(types.Part.from_function_response(
                        name=fc.name,
                        response={'error': f"Tool '{fc.name}' not found."}
                    ))
            
            # Send tool responses back to model
            response = chat.send_message(tool_responses)
        
        return AgentPromptResponse(
            output="Error: Maximum tool execution iterations reached.",
            success=False,
            retry_code=RetryCode.NONE
        )

    except Exception as e:
        error_str = str(e)
        if "429" in error_str:
            return AgentPromptResponse(
                output=f"Error: Gemini API Rate Limit Exceeded (429). {error_str}",
                success=False,
                retry_code=RetryCode.TIMEOUT_ERROR
            )
        return AgentPromptResponse(
            output=f"Error calling Gemini API: {error_str}",
            success=False,
            retry_code=RetryCode.EXECUTION_ERROR
        )