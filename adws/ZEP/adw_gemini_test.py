#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "google-genai"]
# ///

"""
ADW Gemini Test - GenAI SDK Edition
Standalone script to test Gemini Agent using the new Google GenAI SDK.

Usage:
  uv run adws/adw_gemini_test.py [prompt]
"""

import sys
import os
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Force Gemini provider
os.environ["ADW_PROVIDER"] = "gemini"
os.environ["STRICT_GEMINI"] = "true"

# Ensure GEMINIAPIKEY is available
if not os.getenv("GEMINIAPIKEY"):
    print("ERROR: GEMINIAPIKEY not found in .env file.")
    print("Please add 'GEMINIAPIKEY=your_key_here' to your .env file.")
    sys.exit(1)

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest

def main():
    # Use provided prompt or a default test prompt that exercises a tool
    prompt = sys.argv[1] if len(sys.argv) > 1 else "List the files in the current directory, read the content of README.md, and then tell me what this project is about."
    
    print(f"\n{'='*60}")
    print(f"ADW Gemini Agent Test (GenAI SDK - Gemini 3 Flash Exclusive)")
    print(f"Prompt: {prompt}")
    print(f"{'='*60}\n")

    # Use a temporary file for JSONL output consistency with Claude
    with tempfile.NamedTemporaryFile(suffix=".jsonl", delete=False) as tmp:
        output_file = tmp.name

    # Create request
    # Note: prompt_claude_code will now route to Gemini automatically
    # because of the global defaults set in adw_modules/agent.py
    request = AgentPromptRequest(
        prompt=prompt,
        adw_id="exclusive_test",
        agent_name="gemini_agent",
        model="sonnet", # Will map to gemini-3-flash-preview automatically
        dangerously_skip_permissions=True,
        output_file=output_file,
        working_dir=str(Path.cwd())
    )

        print("Invoking Gemini AGENT Core (GenAI SDK)...")
        response = prompt_claude_code(request)

        print(f"\n{'='*60}")
        if response.success:
            print("Gemini response:")
            print(f"{'='*60}\n")
            print(response.output)
        else:
            print("Gemini Agent execution failed!")
            print(f"{'='*60}\n")
            print(f"Error: {response.output}")
            
    finally:
        # Clean up the temporary file
        if os.path.exists(output_file):
            os.remove(output_file)
    
    print(f"\n{'='*60}\n")
    sys.exit(0 if response.success else 1)

if __name__ == "__main__":
    main()
