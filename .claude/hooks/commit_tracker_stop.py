#!/usr/bin/env python3
"""
Stop hook: Commit Tracker & Auto-Goodbye
Counts local commits and auto-runs goodbye workflow when threshold (20) is reached.
"""

import json
import os
import sys
import subprocess
import time
from pathlib import Path
from datetime import datetime


def read_commit_count():
    """Read current commit count from file."""
    counter_file = Path(".claude/commit_count.txt")
    if not counter_file.exists():
        return 0
    try:
        return int(counter_file.read_text().strip())
    except (ValueError, FileNotFoundError):
        return 0


def reset_commit_count():
    """Reset commit counter to 0."""
    counter_file = Path(".claude/commit_count.txt")
    counter_file.write_text("0")


def get_system_info():
    """Get date and hostname for log file naming."""
    date_str = datetime.now().strftime("%Y-%m-%d")
    try:
        hostname = subprocess.check_output("hostname", shell=True, text=True).strip()
    except:
        hostname = "UNKNOWN"
    return date_str, hostname


def create_conversation_log(input_data, date_str, session_id):
    """Create conversation log file in Google Drive location."""
    try:
        # Try Google Drive path (expand environment variable)
        google_drive_base = os.path.expandvars("%googleDrivePath%")
        log_dir = Path(google_drive_base) / "!Agent Context and Tools" / "SL1" / "Claude Logs"

        # Ensure directory exists
        log_dir.mkdir(parents=True, exist_ok=True)

        # Create filename
        log_filename = f"{date_str}_conversation_session-{session_id}.md"
        log_path = log_dir / log_filename

        # Get transcript path from input
        transcript_path = input_data.get("transcript_path")

        # Read transcript if available
        transcript_content = ""
        if transcript_path and Path(transcript_path).exists():
            with open(transcript_path, 'r', encoding='utf-8') as f:
                transcript_lines = f.readlines()
                # Simple formatting - just include the JSONL transcript
                transcript_content = "".join(transcript_lines)

        # Create log content
        log_content = f"""# Conversation Log

**Session ID:** {session_id}
**Date:** {date_str}
**Model:** Claude Sonnet 4.5
**Auto-generated:** Commit tracker (20+ commits)

---

## Conversation Transcript

{transcript_content}

---

*End of Conversation Log*
"""

        # Write log file
        log_path.write_text(log_content, encoding='utf-8')

        return str(log_path), log_filename

    except Exception as e:
        print(f"Error creating log: {e}", file=sys.stderr)
        return None, None


def get_drive_link(log_path):
    """Get Google Drive shareable link using existing Python script."""
    try:
        script_path = Path(r"C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py")

        if not script_path.exists():
            print(f"Drive link script not found: {script_path}", file=sys.stderr)
            return None

        # Wait for Google Drive sync
        time.sleep(5)

        # Run the script
        result = subprocess.check_output(
            ["python", str(script_path), log_path],
            text=True,
            stderr=subprocess.PIPE
        )

        drive_url = result.strip()
        return drive_url if drive_url.startswith("http") else None

    except Exception as e:
        print(f"Error getting Drive link: {e}", file=sys.stderr)
        return None


def send_to_slack(drive_url, filename, hostname, commit_count):
    """Send condensed summary to Slack webhook."""
    try:
        webhook_url = "https://hooks.slack.com/services/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"

        # Create Slack message with clickable link
        message = {
            "text": f"Session documented after {commit_count} commits.\n<{drive_url}|{filename}>\n*Host:* {hostname}"
        }

        # Write JSON to temp file
        temp_json = Path(".claude/condensed_summary.json")
        temp_json.write_text(json.dumps(message), encoding='utf-8')

        # Send to Slack using curl
        result = subprocess.run(
            ["curl", "-X", "POST", "-H", "Content-Type: application/json",
             "--data", f"@{temp_json}", webhook_url],
            capture_output=True,
            text=True
        )

        # Clean up temp file
        temp_json.unlink(missing_ok=True)

        if result.stdout.strip() == "ok":
            return True
        else:
            print(f"Slack response: {result.stdout}", file=sys.stderr)
            return False

    except Exception as e:
        print(f"Error sending to Slack: {e}", file=sys.stderr)
        return False


def run_goodbye_workflow(input_data, commit_count):
    """Execute the complete goodbye workflow."""
    print("\n" + "="*60, file=sys.stderr)
    print("🎯 COMMIT THRESHOLD REACHED (20+ commits)", file=sys.stderr)
    print("="*60, file=sys.stderr)
    print("\nAutomatically running goodbye workflow...\n", file=sys.stderr)

    # Step 1: Get system info
    date_str, hostname = get_system_info()
    session_id = input_data.get("session_id", "auto-goodbye")

    print(f"📅 Date: {date_str}", file=sys.stderr)
    print(f"💻 Host: {hostname}", file=sys.stderr)
    print(f"📊 Commits: {commit_count}\n", file=sys.stderr)

    # Step 2: Create conversation log
    print("Creating conversation log...", file=sys.stderr)
    log_path, log_filename = create_conversation_log(input_data, date_str, session_id)

    if not log_path:
        print("❌ Failed to create log file", file=sys.stderr)
        return False

    print(f"✅ Log created: {log_filename}\n", file=sys.stderr)

    # Step 3: Get Google Drive link
    print("Getting Google Drive link...", file=sys.stderr)
    drive_url = get_drive_link(log_path)

    if not drive_url:
        print("❌ Failed to get Drive link", file=sys.stderr)
        return False

    print(f"✅ Drive link: {drive_url}\n", file=sys.stderr)

    # Step 4: Send to Slack
    print("Sending to Slack...", file=sys.stderr)
    slack_success = send_to_slack(drive_url, log_filename, hostname, commit_count)

    if slack_success:
        print("✅ Slack notification sent\n", file=sys.stderr)
        return True
    else:
        print("⚠️  Slack notification may have failed (check Slack)\n", file=sys.stderr)
        return True  # Still consider success if log was created


def main():
    try:
        # Read JSON input from stdin
        input_data = json.load(sys.stdin)

        # Get current commit count
        commit_count = read_commit_count()

        # Check if we've hit the threshold
        if commit_count >= 20:
            # Run goodbye workflow
            success = run_goodbye_workflow(input_data, commit_count)

            if success:
                # Reset counter after successful goodbye
                reset_commit_count()
                print("✅ Goodbye workflow completed, counter reset to 0\n", file=sys.stderr)
            else:
                print("⚠️  Goodbye workflow failed, please run /goodbye manually\n", file=sys.stderr)
                print("💡 Counter NOT reset - will retry on next stop\n", file=sys.stderr)
        else:
            # Just show current progress
            print(f"📊 Commit count: {commit_count}/20 (goodbye auto-triggers at 20)", file=sys.stderr)

        # Always allow stopping (exit 0)
        sys.exit(0)

    except json.JSONDecodeError:
        # Handle JSON decode errors gracefully
        sys.exit(0)
    except Exception as e:
        # Handle any other errors gracefully - don't block stopping
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)


if __name__ == "__main__":
    main()
