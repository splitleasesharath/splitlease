"""
Webhook notification module for ADWs.

Provides deterministic status updates to Slack via webhook.
Format: <hostname> says <process> completed/failed
"""

import os
import json
import socket
from typing import Optional, Dict, Any
from dataclasses import dataclass
import urllib.request
import urllib.error


# Get hostname once at module load
HOSTNAME = socket.gethostname()


@dataclass
class WebhookMessage:
    """Slack webhook message."""
    status: str  # "started" | "in_progress" | "success" | "failure" | "rollback"
    step: str  # Current step description
    details: Optional[str] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


def send_slack_notification(message: WebhookMessage) -> bool:
    """Send notification to Slack webhook.

    Format: <hostname> says <step> completed/failed/started

    Args:
        message: WebhookMessage with status and details

    Returns:
        True if notification sent successfully, False otherwise
    """
    webhook_url = os.getenv("SHARATHPLAYGROUND")

    if not webhook_url:
        print("[WARN] SHARATHPLAYGROUND webhook not configured")
        return False

    # Status verb mapping
    status_verb = {
        "started": "started",
        "in_progress": "running",
        "success": "completed",
        "failure": "failed",
        "rollback": "rolled back"
    }

    verb = status_verb.get(message.status, message.status)

    # Build single-line message: <hostname> says <step> <verb>
    text = f"{HOSTNAME} says {message.step} {verb}"

    # Add error snippet on same line if failure
    if message.error and message.status == "failure":
        error_snippet = message.error[:80].replace("\n", " ")
        text += f" - {error_snippet}"

    payload = {"text": text}

    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )

        with urllib.request.urlopen(req, timeout=10) as response:
            if response.status == 200:
                print(f"[Slack] {text}")
                return True
            else:
                print(f"[WARN] Webhook returned {response.status}")
                return False

    except urllib.error.URLError as e:
        print(f"[FAIL] Webhook failed: {e}")
        return False
    except Exception as e:
        print(f"[FAIL] Webhook error: {e}")
        return False


def notify_started(step: str, details: Optional[str] = None) -> bool:
    """Send 'started' notification."""
    return send_slack_notification(WebhookMessage(
        status="started",
        step=step,
        details=details
    ))


def notify_in_progress(step: str, details: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> bool:
    """Send 'in_progress' notification."""
    return send_slack_notification(WebhookMessage(
        status="in_progress",
        step=step,
        details=details,
        metadata=metadata
    ))


def notify_success(step: str, details: Optional[str] = None, metadata: Optional[Dict[str, Any]] = None) -> bool:
    """Send 'success' notification."""
    return send_slack_notification(WebhookMessage(
        status="success",
        step=step,
        details=details,
        metadata=metadata
    ))


def notify_failure(step: str, error: str, details: Optional[str] = None) -> bool:
    """Send 'failure' notification."""
    return send_slack_notification(WebhookMessage(
        status="failure",
        step=step,
        details=details,
        error=error
    ))


def notify_rollback(step: str, details: Optional[str] = None) -> bool:
    """Send 'rollback' notification."""
    return send_slack_notification(WebhookMessage(
        status="rollback",
        step=step,
        details=details
    ))
