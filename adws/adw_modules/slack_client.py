"""
Slack Web API Client for Visual Parity Checks

Provides file upload capabilities using Slack's Web API (not webhooks).
Mirrors the functionality of the TypeScript slack-api package.

Requires: pip install slack_sdk
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass


@dataclass
class SlackResponse:
    """Response from a Slack API call."""
    ok: bool
    ts: Optional[str] = None
    channel: Optional[str] = None
    error: Optional[str] = None
    file_id: Optional[str] = None
    file_permalink: Optional[str] = None


class SlackClient:
    """Slack Web API client with file upload support."""

    def __init__(self, bot_token: Optional[str] = None, default_channel: Optional[str] = None):
        self.bot_token = bot_token or os.environ.get("SLACK_BOT_TOKEN")
        self.default_channel = default_channel or os.environ.get("SLACK_DEFAULT_CHANNEL")
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.bot_token:
                raise ValueError("SLACK_BOT_TOKEN not set")
            from slack_sdk import WebClient
            self._client = WebClient(token=self.bot_token)
        return self._client

    def send_message(self, text: str, channel: Optional[str] = None, thread_ts: Optional[str] = None) -> SlackResponse:
        target_channel = channel or self.default_channel
        if not target_channel:
            return SlackResponse(ok=False, error="No channel specified")
        try:
            client = self._get_client()
            result = client.chat_postMessage(channel=target_channel, text=text, thread_ts=thread_ts)
            return SlackResponse(ok=result.get("ok", False), ts=result.get("ts"), channel=result.get("channel"), error=result.get("error"))
        except Exception as e:
            return SlackResponse(ok=False, error=str(e))

    def upload_file(self, file_path: str, channel: Optional[str] = None, thread_ts: Optional[str] = None, title: Optional[str] = None, initial_comment: Optional[str] = None) -> SlackResponse:
        target_channel = channel or self.default_channel
        if not target_channel:
            return SlackResponse(ok=False, error="No channel specified")
        path = Path(file_path)
        if not path.exists():
            return SlackResponse(ok=False, error=f"File not found: {file_path}")
        try:
            client = self._get_client()
            result = client.files_upload_v2(channel=target_channel, file=str(path), filename=path.name, title=title or path.name, initial_comment=initial_comment, thread_ts=thread_ts)
            file_info = result.get("file", {})
            if not file_info and "files" in result:
                file_info = result["files"][0] if result["files"] else {}
            return SlackResponse(ok=result.get("ok", False), error=result.get("error"), file_id=file_info.get("id"), file_permalink=file_info.get("permalink"))
        except Exception as e:
            return SlackResponse(ok=False, error=str(e))

    def upload_screenshot(self, screenshot_path: str, channel: Optional[str] = None, thread_ts: Optional[str] = None, title: Optional[str] = None, comment: Optional[str] = None) -> SlackResponse:
        return self.upload_file(file_path=screenshot_path, channel=channel, thread_ts=thread_ts, title=title, initial_comment=comment)


def create_slack_client_from_env(default_channel: Optional[str] = None) -> SlackClient:
    return SlackClient(default_channel=default_channel)


def notify_parity_check_result(
    page_path: str,
    result: str,
    live_screenshot: Optional[str] = None,
    dev_screenshot: Optional[str] = None,
    channel: Optional[str] = None,
    issues: Optional[list] = None
) -> Dict[str, Any]:
    """Send parity check result to Slack with screenshots in thread."""
    try:
        client = create_slack_client_from_env(default_channel=channel)
    except (ValueError, ImportError) as e:
        return {"ok": False, "error": str(e), "skipped": True}

    # Build status emoji and message
    if result == "PASS":
        emoji = "✅"
    elif result == "BLOCKED":
        emoji = "⚠️"
    else:
        emoji = "❌"

    message = f"{emoji} Parity Check: `{page_path}` → *{result}*"

    if issues and result != "PASS":
        issue_text = "\n".join(f"  • {issue}" for issue in issues[:3])
        if len(issues) > 3:
            issue_text += f"\n  ...and {len(issues) - 3} more"
        message += f"\n{issue_text}"

    msg_response = client.send_message(text=message, channel=channel)

    if not msg_response.ok:
        return {"ok": False, "error": msg_response.error, "message_sent": False}

    thread_ts = msg_response.ts
    channel_id = msg_response.channel
    screenshots_uploaded = []

    if live_screenshot and Path(live_screenshot).exists():
        live_result = client.upload_screenshot(screenshot_path=live_screenshot, channel=channel_id, thread_ts=thread_ts, title="LIVE")
        screenshots_uploaded.append({"type": "live", "ok": live_result.ok, "error": live_result.error})

    if dev_screenshot and Path(dev_screenshot).exists():
        dev_result = client.upload_screenshot(screenshot_path=dev_screenshot, channel=channel_id, thread_ts=thread_ts, title="DEV")
        screenshots_uploaded.append({"type": "dev", "ok": dev_result.ok, "error": dev_result.error})

    return {"ok": True, "message_sent": True, "thread_ts": thread_ts, "channel": channel_id, "screenshots": screenshots_uploaded}
