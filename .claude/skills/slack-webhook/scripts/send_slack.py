#!/usr/bin/env python3
"""
Send notifications to Slack via TINYTASKAGENT webhook.

Claude uses this to alert you about things requiring immediate attention.

Usage:
    python send_slack.py <message> [--type TYPE] [--webhook URL]

Arguments:
    message      The notification message
    --type       Message type: info, success, error, warning, urgent (default: info)
    --webhook    Override webhook URL (default: TINYTASKAGENT env var)

Examples:
    python send_slack.py "Deployment complete" --type success
    python send_slack.py "Build failed: missing dependency" --type error
    python send_slack.py "Found security vulnerability in auth.js" --type urgent
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path


def get_webhook_url(override: str = None) -> str:
    """Get webhook URL from override, env var, or .env files."""
    if override:
        return override

    # Check environment variable
    url = os.environ.get('TINYTASKAGENT')
    if url:
        return url

    # Check .env files in common locations
    env_locations = [
        Path.cwd() / '.env',
        Path.home() / '.env',
        Path.cwd() / '.env.local',
    ]

    for env_path in env_locations:
        if env_path.exists():
            try:
                with open(env_path, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith('TINYTASKAGENT='):
                            return line.split('=', 1)[1].strip().strip('"\'')
            except Exception:
                continue

    return None


# Message type prefixes - Claude's voice
PREFIXES = {
    'info': ':information_source:',
    'success': ':white_check_mark:',
    'error': ':x:',
    'warning': ':warning:',
    'urgent': ':rotating_light:',
}


def format_message(message: str, msg_type: str) -> dict:
    """Format notification with type-based emoji prefix."""
    prefix = PREFIXES.get(msg_type, PREFIXES['info'])
    formatted = f"{prefix} *Claude*: {message}"
    return {"text": formatted}


def send_to_slack(webhook_url: str, payload: dict) -> tuple[bool, str]:
    """Send payload to Slack webhook. Returns (success, message)."""
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            webhook_url,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return True, f"Sent ({response.status})"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.reason}"
    except urllib.error.URLError as e:
        return False, f"URL error: {e.reason}"
    except Exception as e:
        return False, f"Error: {str(e)}"


def main():
    parser = argparse.ArgumentParser(description="Claude's Slack notification voice")
    parser.add_argument('message', help='Notification message')
    parser.add_argument('--type', choices=['info', 'success', 'error', 'warning', 'urgent'],
                        default='info', help='Message type (default: info)')
    parser.add_argument('--webhook', help='Override webhook URL (default: TINYTASKAGENT env)')

    args = parser.parse_args()

    webhook_url = get_webhook_url(args.webhook)
    if not webhook_url:
        print("Error: No webhook URL. Set TINYTASKAGENT env var or use --webhook")
        sys.exit(1)

    payload = format_message(args.message, args.type)
    success, result = send_to_slack(webhook_url, payload)

    print(result)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
