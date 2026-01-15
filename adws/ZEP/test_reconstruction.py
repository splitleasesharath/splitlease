#!/usr/bin/env python3
import json

# Simulate the raw output
test_lines = [
    '''MCP server 'supabase-live' requires authentication using: /mcp auth supabase-liveMCP server 'supabase-dev' requires authentication using: /mcp auth supabase-dev{"type":"init","timestamp":"2026-01-14T15:35:06.387Z","session_id":"ed9aa835-0fe7-4e91-ae95-02d221de7d42","model":"gemini-3-flash-preview"}''',
    '''{"type":"message","timestamp":"2026-01-14T15:35:06.389Z","role":"user","content":"Say hello"}''',
    '''{"type":"message","timestamp":"2026-01-14T15:35:09.491Z","role":"assistant","content":"Hello! I'm ready to assist","delta":true}''',
    '''{"type":"message","timestamp":"2026-01-14T15:35:09.510Z","role":"assistant","content":" you with your project. Please provide your first command.","delta":true}''',
    '''{"type":"result","timestamp":"2026-01-14T15:35:09.541Z","status":"success","stats":{"total_tokens":15194}}'''
]

print("Testing JSONL parsing and reconstruction...")
print("=" * 60)

messages = []
for line_num, line in enumerate(test_lines, 1):
    line = line.strip()
    if not line:
        continue
    try:
        data = json.loads(line)
        messages.append(data)
        print(f"Line {line_num}: ✓ Parsed {data.get('type')}")
    except json.JSONDecodeError:
        if '{"type":' in line:
            try:
                json_start = line.find('{"type":')
                json_data = line[json_start:]
                data = json.loads(json_data)
                messages.append(data)
                print(f"Line {line_num}: ✓ Parsed {data.get('type')} (with prefix)")
            except Exception as e:
                print(f"Line {line_num}: ✗ Failed: {e}")
        else:
            print(f"Line {line_num}: ⊗ Skipped")

print(f"\nTotal messages: {len(messages)}")
print("=" * 60)

# Test reconstruction
reconstructed_text = ""
session_id = None

print("\nReconstruction process:")
for i, msg in enumerate(messages, 1):
    msg_type = msg.get("type")
    role = msg.get("role")
    
    if msg_type == "init":
        session_id = msg.get("session_id")
        print(f"  {i}. Init message (session: {session_id[:8]}...)")
        continue

    if msg_type == "message" and role == "assistant":
        content = msg.get("content")
        if isinstance(content, str):
            reconstructed_text += content
            print(f"  {i}. Assistant message: added {len(content)} chars")
            print(f"      Content: {repr(content)}")
        else:
            print(f"  {i}. Assistant message: content is not a string ({type(content)})")
    elif msg_type == "message":
        print(f"  {i}. {role or 'Unknown'} message (skipped)")
    else:
        print(f"  {i}. {msg_type} message (skipped)")

print("\n" + "=" * 60)
print(f"Final reconstructed text ({len(reconstructed_text)} chars):")
print(repr(reconstructed_text))
print("\nRendered:")
print(reconstructed_text)
