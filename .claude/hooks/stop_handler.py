#!/usr/bin/env python3
"""
Stop Hook Handler - Reads transcript and spawns silent Claude for /goodbye-automated.

Receives JSON from stdin:
{
  "session_id": "abc123",
  "transcript_path": "/path/to/session.jsonl",
  "cwd": "/project/path",
  "hook_event_name": "Stop"
}
"""

import json
import sys
import subprocess
from pathlib import Path


def parse_transcript(transcript_path: str) -> dict:
    """Parse JSONL transcript and extract summary info."""
    messages = []
    user_intent = None
    actions_taken = []
    files_modified = []

    try:
        with open(transcript_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)

                    # Extract user messages for intent
                    if entry.get('role') == 'user':
                        content = entry.get('content', '')
                        if isinstance(content, str) and not user_intent:
                            user_intent = content[:200]  # First user message as intent

                    # Extract assistant tool usage
                    if entry.get('role') == 'assistant':
                        content = entry.get('content', [])
                        if isinstance(content, list):
                            for block in content:
                                if isinstance(block, dict):
                                    if block.get('type') == 'tool_use':
                                        tool_name = block.get('name', '')
                                        if tool_name in ('Write', 'Edit'):
                                            inp = block.get('input', {})
                                            if 'file_path' in inp:
                                                files_modified.append(inp['file_path'])
                                        actions_taken.append(tool_name)
                except json.JSONDecodeError:
                    continue
    except Exception as e:
        return {'error': str(e)}

    # Dedupe and limit
    files_modified = list(dict.fromkeys(files_modified))[:5]
    action_counts = {}
    for a in actions_taken:
        action_counts[a] = action_counts.get(a, 0) + 1

    return {
        'user_intent': user_intent or 'Unknown task',
        'files_modified': files_modified,
        'action_summary': action_counts,
        'total_actions': len(actions_taken)
    }


def create_summary(parsed: dict, session_id: str) -> str:
    """Create a concise summary for handoff."""
    intent = parsed.get('user_intent', 'Unknown')[:100]
    files = parsed.get('files_modified', [])
    actions = parsed.get('action_summary', {})

    file_list = ', '.join([Path(f).name for f in files[:3]]) if files else 'None'
    action_str = ', '.join([f"{k}:{v}" for k, v in list(actions.items())[:3]])

    return f"Session {session_id[:8]}: {intent}... | Files: {file_list} | Actions: {action_str}"


def spawn_goodbye(summary: str, cwd: str):
    """Spawn silent Claude to run /goodbye-automated with context."""
    prompt = f"""Run /goodbye-automated for this completed session.

Session Summary: {summary}

Execute the full goodbye workflow: save conversation log, get Drive link, send to Slack."""

    try:
        # Spawn detached process so it doesn't block
        subprocess.Popen(
            ['claude', '-p', prompt],
            cwd=cwd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW
        )
    except Exception as e:
        # Log error but don't fail the hook
        with open(Path.home() / '.claude' / 'hook_errors.log', 'a') as f:
            f.write(f"spawn_goodbye error: {e}\n")


def main():
    # Read hook input from stdin
    try:
        hook_input = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)  # Silent exit on bad input

    transcript_path = hook_input.get('transcript_path')
    session_id = hook_input.get('session_id', 'unknown')
    cwd = hook_input.get('cwd', '.')

    if not transcript_path or not Path(transcript_path).exists():
        sys.exit(0)  # No transcript, nothing to do

    # Parse and summarize
    parsed = parse_transcript(transcript_path)
    if 'error' in parsed:
        sys.exit(0)

    summary = create_summary(parsed, session_id)

    # Spawn silent Claude for goodbye workflow
    spawn_goodbye(summary, cwd)

    # Output for hook (empty = success)
    print(json.dumps({"continue": True}))


if __name__ == '__main__':
    main()
