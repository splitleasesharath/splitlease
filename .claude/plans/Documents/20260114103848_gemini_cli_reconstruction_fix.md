# Gemini CLI Response Reconstruction Fix

**Date**: 2026-01-14  
**Status**: ✅ RESOLVED  
**Files Modified**: `adws/adw_modules/agent.py`

## Problem

The Gemini CLI prompt agent (`adws/adw_gemini_prompt_agent.py`) was not displaying any output, even though the Gemini CLI was successfully returning responses in the JSONL output file.

## Root Cause

The issue had two parts:

### 1. MCP Authentication Warnings Prefix
The Gemini CLI outputs MCP authentication warnings that run together with the first JSON message on the same line:

```
MCP server 'supabase-live' requires authentication using: /mcp auth supabase-liveMCP server 'supabase-dev' requires authentication using: /mcp auth supabase-dev{"type":"init",...}
```

The JSONL parser was failing because it expected pure JSON lines.

### 2. Missing Result Field
The Gemini CLI returns a result message like:

```json
{"type":"result","timestamp":"...","status":"success","stats":{...}}
```

But it **does NOT include a `"result"` field** with the actual response text. Instead, the response is streamed as multiple assistant messages with `delta: true`:

```json
{"type":"message","role":"assistant","content":"Hello","delta":true}
{"type":"message","role":"assistant","content":", Gemini here.","delta":true}
```

The code was checking `if result_message:` which was true (a result message existed), then trying to extract `result_message.get("result", "")`, which returned an empty string because the field didn't exist.

## Solution

### Part 1: Robust JSONL Parsing
Modified `parse_jsonl_output()` to handle lines with prefixed warnings:

```python
for line in f:
    line = line.strip()
    if not line:
        continue
    try:
        # Standard path: try to parse line as pure JSON
        data = json.loads(line)
        messages.append(data)
    except json.JSONDecodeError:
        # Robust path: handles warnings/messages prefixed to JSON
        if '{"type":' in line:
            json_start = line.find('{"type":')
            json_data = line[json_start:]
            data = json.loads(json_data)
            messages.append(data)
```

### Part 2: Check for Result Field
Changed the condition from:
```python
if result_message:
```

To:
```python
if result_message and "result" in result_message:
```

This ensures that if a result message exists but doesn't contain the `"result"` field, the code falls through to the reconstruction logic.

### Part 3: Message Reconstruction
The existing reconstruction logic (added earlier) successfully handles Gemini CLI streaming:

```python
reconstructed_text = ""
for msg in messages:
    if msg.get("type") == "message" and msg.get("role") == "assistant":
        content = msg.get("content")
        if isinstance(content, str):
            reconstructed_text += content
```

## Testing

Verified with multiple prompts:

```bash
✅ uv run adws/adw_gemini_prompt_agent.py "Say hello in 3 words"
   → Output: "Hello, Gemini here."

✅ uv run adws/adw_gemini_prompt_agent.py "List 5 benefits of functional programming"
   → Output: [Full formatted list with 5 points]
```

## Files Changed

- `adws/adw_modules/agent.py`
  - `parse_jsonl_output()`: Added robust parsing for prefixed warnings
  - `prompt_claude_code()`: Changed result_message check to require "result" field
  - Existing reconstruction logic now properly executes

## Commits

1. `9c5be703`: Initial improvements (robust parsing, model name fixes)
2. `e8cd6d6e`: Final fix (result field check)

## Impact

- ✅ Gemini CLI agent now correctly displays all responses
- ✅ Handles MCP authentication warnings gracefully  
- ✅ Works with streaming delta messages
- ✅ No breaking changes to Claude Code CLI behavior
