#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "google-genai"]
# ///

import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINIAPIKEY") or os.getenv("GEMINI_API_KEY")

if not api_key:
    print("ERROR: GEMINIAPIKEY not found.")
    exit(1)

client = genai.Client(api_key=api_key)

print("Listing available models...")
try:
    for model in client.models.list():
        # Check for generate_content in supported_actions
        # Python SDK uses snake_case for attributes
        actions = getattr(model, 'supported_actions', [])
        print(f"Model: {model.name} (Actions: {actions})")
except Exception as e:
    print(f"Error: {e}")
