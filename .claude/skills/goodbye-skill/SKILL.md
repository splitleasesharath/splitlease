# Goodbye Skill

**Purpose:** Document session with conversation log, Google Drive link, and Slack notification. Auto-resets commit counter.

**When to use:** When stopping work after 20+ commits OR manually when user requests session documentation.

---

## Execution Steps

### Step 1: Get System Information

Use Bash tool to get required information:

```bash
# Get current date (YYYY-MM-DD format)
powershell -Command "Get-Date -Format 'yyyy-MM-dd'"

# Get hostname
hostname
```

Store these values as:
- `DATE`: The date string (e.g., `2026-01-07`)
- `HOSTNAME`: The machine name (e.g., `SPLIT-LEASE-6`)

---

### Step 2: Read Session Context

You have access to the conversation transcript through the session context. Extract key information:
- Major topics discussed
- Tasks completed
- Issues resolved
- Files modified

---

### Step 3: Create Conversation Log

**File Location:**
```
%googleDrivePath%!Agent Context and Tools\SL1\Claude Logs\{DATE}_conversation_session-{SESSION_ID}.md
```

**Filename Pattern:**
```
{DATE}_conversation_session-{SESSION_ID}.md
```
Example: `2026-01-07_conversation_session-auto-goodbye.md`

**Content Structure:**
```markdown
# Conversation Log

**Session ID:** {SESSION_ID}
**Date:** {DATE}
**Hostname:** {HOSTNAME}
**Model:** Claude Sonnet 4.5

---

## Session Summary

### Topics Covered
- {List major topics}

### Tasks Completed
- {List completed tasks}

### Files Modified
- {List key files changed}

---

## Detailed Transcript

{Include relevant conversation details}

---

*End of Conversation Log*
```

Use the **Write** tool to create this file.

---

### Step 4: Wait for Google Drive Sync

Use Bash tool:
```bash
sleep 5
```

This ensures the file is synced to Google Drive before getting the link.

---

### Step 5: Get Google Drive Shareable Link

Use the skill's built-in Python script:

```bash
python ".claude/skills/goodbye-skill/get_drive_link.py" "{FULL_PATH_TO_LOG_FILE}"
```

The script will output a shareable Google Drive URL. Store this as `DRIVE_URL`.

**Note:** The script uses shared credentials from `.claude/google-drive-tools/` for authentication.

---

### Step 6: Post to Slack

Create a temporary JSON file for the Slack webhook:

**File:** `.claude/condensed_summary.json`

**Content:**
```json
{
  "text": "Session documented after {COMMIT_COUNT} commits.\n<{DRIVE_URL}|{FILENAME}>\n*Host:* {HOSTNAME}"
}
```

Use the **Write** tool to create this file.

Then send to Slack webhook:
```bash
curl -X POST -H "Content-Type: application/json" --data @".claude/condensed_summary.json" "$SLACK_WEBHOOK_URL"
```

**Note**: Set `SLACK_WEBHOOK_URL` environment variable with your Slack incoming webhook URL.

Expected response: `ok`

---

### Step 7: Reset Commit Counter

**CRITICAL:** After successfully documenting the session, reset the commit counter:

Use the **Write** tool to write `0` to `.claude/commit_count.txt`:

```
0
```

This resets the counter for the next 20 commits.

---

### Step 8: Confirm Completion

Report to the user:
```
✅ Session documented successfully!
   📄 Log: {FILENAME}
   🔗 Drive: {DRIVE_URL}
   📢 Slack: Notification sent
   🔄 Counter: Reset to 0
```

---

## Error Handling

### Google Drive Path Not Found
- Check that `%googleDrivePath%` environment variable is set
- Verify Google Drive is running and synced

### Drive Link Script Failed
- Verify script exists at `.claude/skills/goodbye-skill/get_drive_link.py`
- Check that file was created successfully before running script
- May need to re-authenticate (delete `.claude/google-drive-tools/token.pickle` and run script manually once)
- Ensure credentials exist at `.claude/google-drive-tools/credentials.json`

### Slack Webhook Failed
- Verify webhook URL is correct
- Check network connectivity
- Ensure JSON is properly formatted

### Don't Reset Counter on Failure
If any critical step fails (log creation, Drive link, Slack), **DO NOT** reset the counter. This ensures the workflow will be retried on the next stop.

---

## Quick Reference

**Environment Variables:**
- `%googleDrivePath%`: Base path to Google Drive

**File Paths:**
- Log: `%googleDrivePath%!Agent Context and Tools\SL1\Claude Logs\{DATE}_conversation_session-{SESSION_ID}.md`
- Counter: `.claude/commit_count.txt`
- Temp JSON: `.claude/condensed_summary.json`
- Drive script: `.claude/skills/goodbye-skill/get_drive_link.py`
- Drive credentials: `.claude/google-drive-tools/credentials.json`
- Drive token: `.claude/google-drive-tools/token.pickle`

**Slack Webhook:**
```bash
# Set via environment variable
export SLACK_WEBHOOK_URL="your_webhook_url_here"
```

---

## Integration with Commit Tracker

This skill is automatically invoked when the commit counter reaches 20. The stop hook will display a message asking you to run `/goodbye`, which triggers this skill.

The workflow:
1. User makes 20 commits
2. Stop hook detects count >= 20
3. Stop hook tells Claude: "Run /goodbye to document"
4. Claude runs this skill
5. Skill documents session and resets counter
6. User can stop normally

---

**Version:** 1.0
**Last Updated:** 2026-01-07
