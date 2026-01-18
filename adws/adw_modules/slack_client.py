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
    ts: Optional[str] = None  # Message timestamp (thread ID)
    channel: Optional[str] = None  # Channel ID
    error: Optional[str] = None
    file_id: Optional[str] = None
    file_permalink: Optional[str] = None


class SlackClient:
    """
    Slack Web API client with file upload support.

    Uses SLACK_BOT_TOKEN from environment for authentication.
    """

    def __init__(self, bot_token: Optional[str] = None, default_channel: Optional[str] = None):
        """
        Initialize Slack client.

        Args:
            bot_token: Slack Bot OAuth Token (xoxb-...). Uses SLACK_BOT_TOKEN env if not provided.
            default_channel: Default channel for messages.
        """
        self.bot_token = bot_token or os.environ.get("SLACK_BOT_TOKEN")
        self.default_channel = default_channel or os.environ.get("SLACK_DEFAULT_CHANNEL")
        self._client = None

    def _get_client(self):
        """Lazy-load the Slack WebClient."""
        if self._client is None:
            if not self.bot_token:
                raise ValueError(
                    "SLACK_BOT_TOKEN not set. Get it from "
                    "https://api.slack.com/apps → Your App → OAuth & Permissions"
                )
            try:
                from slack_sdk import WebClient
                self._client = WebClient(token=self.bot_token)
            except ImportError:
                raise ImportError(
                    "slack_sdk not installed. Run: pip install slack_sdk"
                )
        return self._client

    def send_message(
        self,
        text: str,
        channel: Optional[str] = None,
        thread_ts: Optional[str] = None
    ) -> SlackResponse:
        """
        Send a text message to a channel.

        Args:
            text: Message text (supports markdown)
            channel: Channel name or ID (uses default if not provided)
            thread_ts: Thread timestamp to reply in thread

        Returns:
            SlackResponse with message timestamp
        """
        target_channel = channel or self.default_channel
        if not target_channel:
            return SlackResponse(ok=False, error="No channel specified")

        try:
            client = self._get_client()
            result = client.chat_postMessage(
                channel=target_channel,
                text=text,
                thread_ts=thread_ts
            )
            return SlackResponse(
                ok=result.get("ok", False),
                ts=result.get("ts"),
                channel=result.get("channel"),
                error=result.get("error")
            )
        except Exception as e:
            return SlackResponse(ok=False, error=str(e))

    def upload_file(
        self,
        file_path: str,
        channel: Optional[str] = None,
        thread_ts: Optional[str] = None,
        title: Optional[str] = None,
        initial_comment: Optional[str] = None
    ) -> SlackResponse:
        """
        Upload a file to Slack using the 3-step external upload flow.
        Required for reliable thread sharing in some slack-sdk versions.

        Args:
            file_path: Path to the file to upload
            channel: Channel name or ID
            thread_ts: Thread timestamp to upload in thread
            title: Optional title for the file
            initial_comment: Optional comment to accompany the file

        Returns:
            SlackResponse with file information
        """
        target_channel = channel or self.default_channel
        if not target_channel:
            return SlackResponse(ok=False, error="No channel specified")

        path = Path(file_path)
        if not path.exists():
            return SlackResponse(ok=False, error=f"File not found: {file_path}")

        try:
            import urllib.request
            client = self._get_client()

            # Step 1: Get upload URL
            get_url = client.files_getUploadURLExternal(
                filename=path.name,
                length=path.stat().st_size
            )
            upload_url = get_url['upload_url']
            file_id = get_url['file_id']

            # Step 2: Upload file content
            with open(path, 'rb') as f:
                req = urllib.request.Request(upload_url, data=f.read(), method='POST')
                req.add_header('Content-Type', 'application/octet-stream')
                urllib.request.urlopen(req)

            # Step 3: Complete upload and share to channel/thread
            complete = client.files_completeUploadExternal(
                files=[{'id': file_id, 'title': title or path.name}],
                channel_id=target_channel,
                thread_ts=thread_ts,
                initial_comment=initial_comment
            )

            # Extract file info from response
            file_info = complete.get('files', [{}])[0] if complete.get('files') else {}

            return SlackResponse(
                ok=complete.get("ok", False),
                error=complete.get("error"),
                file_id=file_info.get("id"),
                file_permalink=file_info.get("permalink")
            )
        except Exception as e:
            error_msg = str(e)
            # Provide helpful hints for common errors
            if "not_in_channel" in error_msg:
                error_msg += f" → Invite bot to {target_channel} with /invite @BotName"
            elif "channel_not_found" in error_msg:
                error_msg += f" → Channel '{target_channel}' not found"
            return SlackResponse(ok=False, error=error_msg)

    def upload_screenshot(
        self,
        screenshot_path: str,
        channel: Optional[str] = None,
        thread_ts: Optional[str] = None,
        title: Optional[str] = None,
        comment: Optional[str] = None
    ) -> SlackResponse:
        """
        Upload a screenshot to Slack (convenience method).

        Args:
            screenshot_path: Path to the screenshot file
            channel: Channel name or ID
            thread_ts: Thread timestamp to upload in thread
            title: Optional title for the screenshot
            comment: Optional comment to accompany the screenshot

        Returns:
            SlackResponse with file information
        """
        return self.upload_file(
            file_path=screenshot_path,
            channel=channel,
            thread_ts=thread_ts,
            title=title,
            initial_comment=comment
        )


def create_slack_client_from_env(default_channel: Optional[str] = None) -> SlackClient:
    """
    Create a SlackClient using environment variables.

    Expects SLACK_BOT_TOKEN to be set.
    Optionally uses SLACK_DEFAULT_CHANNEL.

    Args:
        default_channel: Override default channel

    Returns:
        Configured SlackClient instance
    """
    return SlackClient(default_channel=default_channel)


# =============================================================================
# PARITY CHECK NOTIFICATION HELPERS
# =============================================================================

def notify_parity_check_result(
    page_path: str,
    result: str,
    live_screenshot: Optional[str] = None,
    dev_screenshot: Optional[str] = None,
    channel: Optional[str] = None,
    issues: Optional[list] = None
) -> Dict[str, Any]:
    """
    Send parity check result to Slack with screenshots in thread.

    Args:
        page_path: The page path that was checked (e.g., "/search")
        result: "PASS", "FAIL", or "BLOCKED"
        live_screenshot: Path to LIVE screenshot (optional)
        dev_screenshot: Path to DEV screenshot (optional)
        channel: Slack channel (uses SLACK_DEFAULT_CHANNEL if not provided)
        issues: List of issues found (for FAIL results)

    Returns:
        Dict with notification status
    """
    try:
        client = create_slack_client_from_env(default_channel=channel)
    except (ValueError, ImportError) as e:
        return {"ok": False, "error": str(e), "skipped": True}

    # Build status emoji and message
    if result == "PASS":
        emoji = "✅"
        status_text = "PASS"
    elif result == "BLOCKED":
        emoji = "⚠️"
        status_text = "BLOCKED"
    else:
        emoji = "❌"
        status_text = "FAIL"

    # Build message text
    message = f"{emoji} Parity Check: `{page_path}` → *{status_text}*"

    # Add issues if present
    if issues and result != "PASS":
        issue_text = "\n".join(f"  • {issue}" for issue in issues[:3])
        if len(issues) > 3:
            issue_text += f"\n  ...and {len(issues) - 3} more"
        message += f"\n{issue_text}"

    # Send main message
    msg_response = client.send_message(text=message, channel=channel)

    if not msg_response.ok:
        return {
            "ok": False,
            "error": msg_response.error,
            "message_sent": False
        }

    # Use the returned channel ID and thread_ts for file uploads
    thread_ts = msg_response.ts
    channel_id = msg_response.channel

    # Upload screenshots as thread replies
    screenshots_uploaded = []

    if live_screenshot and Path(live_screenshot).exists():
        live_result = client.upload_screenshot(
            screenshot_path=live_screenshot,
            channel=channel_id,
            thread_ts=thread_ts,
            title="LIVE"
        )
        screenshots_uploaded.append({
            "type": "live",
            "ok": live_result.ok,
            "error": live_result.error
        })

    if dev_screenshot and Path(dev_screenshot).exists():
        dev_result = client.upload_screenshot(
            screenshot_path=dev_screenshot,
            channel=channel_id,
            thread_ts=thread_ts,
            title="DEV"
        )
        screenshots_uploaded.append({
            "type": "dev",
            "ok": dev_result.ok,
            "error": dev_result.error
        })

    return {
        "ok": True,
        "message_sent": True,
        "thread_ts": thread_ts,
        "channel": channel_id,
        "screenshots": screenshots_uploaded
    }
