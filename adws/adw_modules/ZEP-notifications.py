"""Notification system for overnight batch processing.

Provides Slack webhook integration and GitHub issue commenting
for batch processing status updates.
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

from adw_modules.batch_state import BatchState, IssueStatus


def send_slack_notification(webhook_url: str, message: Dict[str, Any]) -> bool:
    """Send notification to Slack webhook.

    Args:
        webhook_url: Slack incoming webhook URL
        message: Slack message payload (blocks format)

    Returns:
        True if notification sent successfully
    """
    if not webhook_url:
        return False

    try:
        data = json.dumps(message).encode('utf-8')
        request = Request(
            webhook_url,
            data=data,
            headers={'Content-Type': 'application/json'}
        )
        with urlopen(request, timeout=10) as response:
            return response.status == 200
    except (URLError, HTTPError) as e:
        logging.getLogger(__name__).error(f"Slack notification failed: {e}")
        return False


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format."""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}h {minutes}m"


def notify_batch_start(batch_state: BatchState, logger: logging.Logger) -> bool:
    """Notify that batch processing has started.

    Args:
        batch_state: Current batch state
        logger: Logger instance

    Returns:
        True if notification sent successfully
    """
    if not batch_state.config.notification_webhook:
        logger.debug("No notification webhook configured, skipping start notification")
        return False

    message = {
        "text": f"Overnight refactoring started - Batch {batch_state.batch_id}",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Overnight Refactoring Started",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Batch ID:*\n`{batch_state.batch_id}`"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Issues:*\n{batch_state.total_issues}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Parallel Workers:*\n{batch_state.config.parallel_limit}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Model Set:*\n{batch_state.config.model_set}"
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Started at {batch_state.start_time.strftime('%Y-%m-%d %H:%M:%S')}"
                    }
                ]
            }
        ]
    }

    success = send_slack_notification(batch_state.config.notification_webhook, message)
    if success:
        logger.info("Sent batch start notification to Slack")
    return success


def notify_batch_complete(batch_state: BatchState, logger: logging.Logger) -> bool:
    """Notify that batch processing has completed.

    Args:
        batch_state: Final batch state
        logger: Logger instance

    Returns:
        True if notification sent successfully
    """
    if not batch_state.config.notification_webhook:
        logger.debug("No notification webhook configured, skipping completion notification")
        return False

    # Calculate duration
    duration_seconds = 0.0
    if batch_state.end_time and batch_state.start_time:
        duration_seconds = (batch_state.end_time - batch_state.start_time).total_seconds()
    duration_str = format_duration(duration_seconds)

    # Determine status emoji and color
    if batch_state.failed_count == 0:
        status_emoji = ":white_check_mark:"
        header_text = "Overnight Refactoring Complete - All Passed"
        color = "#36a64f"  # green
    elif batch_state.completed_count > 0:
        status_emoji = ":warning:"
        header_text = "Overnight Refactoring Complete - Some Failures"
        color = "#ffc107"  # yellow
    else:
        status_emoji = ":x:"
        header_text = "Overnight Refactoring Failed"
        color = "#dc3545"  # red

    # Build failed issues list
    failed_issues = [
        issue_num for issue_num, result in batch_state.issues.items()
        if result.status == IssueStatus.FAILED
    ]
    failed_text = ", ".join(failed_issues[:5])
    if len(failed_issues) > 5:
        failed_text += f" (+{len(failed_issues) - 5} more)"

    # Build PR list
    prs_created = [
        result.pr_url for result in batch_state.issues.values()
        if result.pr_url
    ]

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": header_text,
                "emoji": True
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Completed:*\n{batch_state.completed_count}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Failed:*\n{batch_state.failed_count}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Duration:*\n{duration_str}"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Batch ID:*\n`{batch_state.batch_id}`"
                }
            ]
        }
    ]

    # Add failed issues section if any
    if failed_issues:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Failed Issues:* {failed_text}"
            }
        })

    # Add PRs created section if any
    if prs_created:
        pr_links = "\n".join([f"<{url}|View PR>" for url in prs_created[:5]])
        if len(prs_created) > 5:
            pr_links += f"\n...and {len(prs_created) - 5} more"
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*PRs Created:*\n{pr_links}"
            }
        })

    # Add dead code findings if any
    total_dead_code = sum(
        len(r.dead_code_found) for r in batch_state.issues.values()
    )
    if total_dead_code > 0:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Dead Code Found:* {total_dead_code} unused exports detected"
            }
        })

    blocks.append({
        "type": "context",
        "elements": [
            {
                "type": "mrkdwn",
                "text": f"Completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            }
        ]
    })

    message = {
        "text": f"{status_emoji} Overnight refactoring completed - {batch_state.completed_count}/{batch_state.total_issues} successful",
        "blocks": blocks
    }

    success = send_slack_notification(batch_state.config.notification_webhook, message)
    if success:
        logger.info("Sent batch completion notification to Slack")
    return success


def notify_batch_failure(
    batch_state: BatchState,
    error: str,
    logger: logging.Logger
) -> bool:
    """Notify that batch processing has failed with an error.

    Args:
        batch_state: Current batch state
        error: Error message
        logger: Logger instance

    Returns:
        True if notification sent successfully
    """
    if not batch_state.config.notification_webhook:
        return False

    message = {
        "text": f":rotating_light: Overnight refactoring batch failed - {batch_state.batch_id}",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Overnight Refactoring Failed",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Error:*\n```{error[:500]}```"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Batch ID:*\n`{batch_state.batch_id}`"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Progress:*\n{batch_state.completed_count}/{batch_state.total_issues}"
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Resume with: `uv run adw_overnight_refactor_iso.py --resume {batch_state.batch_id}`"
                    }
                ]
            }
        ]
    }

    success = send_slack_notification(batch_state.config.notification_webhook, message)
    if success:
        logger.info("Sent batch failure notification to Slack")
    return success


def notify_batch_paused(batch_state: BatchState, logger: logging.Logger) -> bool:
    """Notify that batch processing has been paused due to failure threshold.

    Args:
        batch_state: Current batch state
        logger: Logger instance

    Returns:
        True if notification sent successfully
    """
    if not batch_state.config.notification_webhook:
        return False

    message = {
        "text": f":pause_button: Overnight refactoring paused - {batch_state.consecutive_failures} consecutive failures",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Overnight Refactoring Paused",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"Batch paused after *{batch_state.consecutive_failures}* consecutive failures (threshold: {batch_state.config.failure_threshold})"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Completed:*\n{batch_state.completed_count}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Failed:*\n{batch_state.failed_count}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Remaining:*\n{len(batch_state.get_pending_issues())}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Batch ID:*\n`{batch_state.batch_id}`"
                    }
                ]
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Resume with: `uv run adw_overnight_refactor_iso.py --resume {batch_state.batch_id}`"
                    }
                ]
            }
        ]
    }

    success = send_slack_notification(batch_state.config.notification_webhook, message)
    if success:
        logger.info("Sent batch paused notification to Slack")
    return success


def notify_issue_complete(
    batch_state: BatchState,
    issue_number: str,
    logger: logging.Logger
) -> bool:
    """Notify that a single issue has been processed (optional, for verbose mode).

    Args:
        batch_state: Current batch state
        issue_number: Issue that was processed
        logger: Logger instance

    Returns:
        True if notification sent successfully
    """
    # Only send if explicitly configured for verbose notifications
    # For now, this is a no-op to reduce noise
    return False
