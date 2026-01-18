"""
Quick test for Slack integration with visual parity check.

Tests the index page (/) with Slack notifications enabled.

Usage:
    python test_slack_parity.py [channel]

    channel: Optional Slack channel (default: #dev-alerts)

Requires:
    - SLACK_BOT_TOKEN environment variable
    - slack_sdk package: pip install slack_sdk
    - Dev server running on localhost:8010
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from adw_modules.slack_client import SlackClient, notify_parity_check_result


def test_slack_connection(channel: str) -> bool:
    """Test basic Slack connection by sending a test message."""
    print(f"\n=== Testing Slack Connection ===")
    print(f"Channel: {channel}")

    try:
        client = SlackClient()
        result = client.send_message(
            text="🧪 Parity Check Test - Connection verified",
            channel=channel
        )

        if result.ok:
            print(f"✅ Connection successful! Message ts: {result.ts}")
            return True
        else:
            print(f"❌ Connection failed: {result.error}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_parity_notification(channel: str) -> bool:
    """Test the parity check notification function (without actual visual check)."""
    print(f"\n=== Testing Parity Notification ===")

    # Simulate a PASS result
    result = notify_parity_check_result(
        page_path="/",
        result="PASS",
        channel=channel,
        issues=None
    )

    if result.get("ok"):
        print(f"✅ PASS notification sent! Thread: {result.get('thread_ts')}")
    else:
        print(f"❌ Failed: {result.get('error')}")
        return False

    # Simulate a FAIL result with issues
    result = notify_parity_check_result(
        page_path="/search",
        result="FAIL",
        channel=channel,
        issues=["Layout shift detected", "Missing hero image"]
    )

    if result.get("ok"):
        print(f"✅ FAIL notification sent! Thread: {result.get('thread_ts')}")
        return True
    else:
        print(f"❌ Failed: {result.get('error')}")
        return False


def main():
    channel = sys.argv[1] if len(sys.argv) > 1 else "#dev-alerts"

    print("=" * 50)
    print("SLACK PARITY CHECK INTEGRATION TEST")
    print("=" * 50)

    # Check environment
    token = os.environ.get("SLACK_BOT_TOKEN")
    if not token:
        print("\n❌ SLACK_BOT_TOKEN not set in environment!")
        print("   Set it with: $env:SLACK_BOT_TOKEN = 'xoxb-your-token'")
        sys.exit(1)

    print(f"\n✓ SLACK_BOT_TOKEN found (starts with: {token[:10]}...)")

    # Test connection
    if not test_slack_connection(channel):
        print("\n⚠️  Connection test failed. Check your token and channel.")
        sys.exit(1)

    # Test notification
    if not test_parity_notification(channel):
        print("\n⚠️  Notification test failed.")
        sys.exit(1)

    print("\n" + "=" * 50)
    print("✅ All tests passed!")
    print("=" * 50)
    print(f"\nCheck {channel} for the test messages.")


if __name__ == "__main__":
    main()
