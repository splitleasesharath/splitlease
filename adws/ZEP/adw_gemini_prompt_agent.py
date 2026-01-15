#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "google-genai"]
# ///

"""
ADW Gemini Prompt Agent
Directly interface with the Gemini CLI Agent with custom prompts.

Usage:
  uv run adws/adw_gemini_prompt_agent.py "Your prompt here"
"""

import sys
import os
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add current directory to path so we can import adw_modules
# This script is in adws/, and adw_modules is a subdirectory.
sys.path.append(str(Path(__file__).parent))

# Import the core agent module
from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest

def main():
    if len(sys.argv) < 2:
        print("Usage: uv run adws/adw_gemini_prompt_agent.py \"Your prompt here\"")
        sys.exit(1)
        
    prompt = sys.argv[1]
    
    # Check for Gemini API key
    if not os.getenv("GEMINIAPIKEY") and not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINIAPIKEY not found in environment variables.")
        sys.exit(1)

    # Force Gemini provider
    os.environ["ADW_PROVIDER"] = "gemini"
    os.environ["STRICT_GEMINI"] = "true"

    print(f"\n--- Gemini Prompt Agent (CLI Mode) ---")
    print(f"Model: gemini-3-flash-preview")
    print(f"Prompt: {prompt}")
    print(f"---------------------------\n")

    # Use a temporary file for JSONL output
    with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as tmp:
        output_file = tmp.name

    try:
        # Create request
        request = AgentPromptRequest(
            prompt=prompt,
            adw_id="prompt_agent",
            agent_name="gemini_cli",
            model="sonnet", # Will map to default base model (gemini-3-flash-preview)
            dangerously_skip_permissions=True,
            output_file=output_file,
            working_dir=str(Path.cwd())
        )

        # Call the agent (now routes to Gemini CLI)
        response = prompt_claude_code(request)

        if response.success:
            print(response.output)
        else:
            print(f"Error: {response.output}")
            sys.exit(1)
            
    except Exception as e:
        print(f"Exception occurred: {e}")
        sys.exit(1)
    finally:
        # Debug: Print file content
        if os.path.exists(output_file):
            print(f"\n--- DEBUG: RAW OUTPUT ({output_file}) ---")
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    print(f.read())
            except Exception as e:
                print(f"Error reading output file: {e}")
            print(f"---------------------------------------\n")
            
        # Clean up
        if os.path.exists(output_file):
            try:
                os.remove(output_file)
            except:
                pass
    
    print(f"\n---------------------------")

if __name__ == "__main__":
    main()
