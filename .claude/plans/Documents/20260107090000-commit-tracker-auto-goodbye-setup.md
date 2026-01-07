# Commit Tracker & Auto-Goodbye Hook System

**Created:** 2026-01-07
**Updated:** 2026-01-07 (Refactored to auto-instruct architecture)
**Status:** ✅ Operational
**Purpose:** Automatically document sessions after 20 commits

---

## Overview

This system automatically tracks local git commits and instructs Claude to run the `/goodbye` skill when you reach 20 commits. The skill creates conversation logs, uploads them to Google Drive, sends notifications to Slack, and resets the counter - all automatically.

---

## Architecture (Refactored)

```
┌──────────────────────────────────────────────────────────────┐
│                     COMMIT TRACKING SYSTEM                    │
│                    (Auto-Instruct Pattern)                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Git Commit                                                  │
│      ↓                                                       │
│  .git/hooks/post-commit                                      │
│      ↓                                                       │
│  Increment .claude/commit_count.txt                          │
│      ↓                                                       │
│  Counter: 1, 2, 3... 19, 20                                 │
│      ↓                                                       │
│  When count >= 20:                                          │
│      ↓                                                       │
│  .claude/hooks/commit_tracker_stop.py (on stop)             │
│      ↓                                                       │
│  INSTRUCTS CLAUDE: "Run /goodbye to document"                │
│      ↓                                                       │
│  Claude sees message and runs /goodbye skill                 │
│      ↓                                                       │
│  /goodbye skill (.claude/skills/goodbye/SKILL.md):          │
│    1. Create conversation log in Google Drive                │
│    2. Get shareable Drive link (via get_drive_link.py)       │
│    3. Post to Slack with clickable link                      │
│    4. Reset counter to 0                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key Design Pattern:** The stop hook doesn't execute the workflow - it just tells Claude what to do. The `/goodbye` skill handles all logic. This avoids code duplication and makes the skill reusable.

---

## Components

### 1. Git Post-Commit Hook
**File:** [.git/hooks/post-commit](.git/hooks/post-commit)
**Purpose:** Increments commit counter after every commit
**Behavior:**
- Runs automatically after `git commit`
- Reads `.claude/commit_count.txt`
- Increments by 1
- Writes back to file
- Prints current count

**Output Example:**
```
Commit counter: 15 (goodbye triggers at 20)
```

### 2. Commit Counter File
**File:** [.claude/commit_count.txt](.claude/commit_count.txt)
**Purpose:** Persistent storage for commit count
**Format:** Single integer (e.g., `15`)

### 3. Stop Hook (Auto-Instruct)
**File:** [.claude/hooks/commit_tracker_stop.py](.claude/hooks/commit_tracker_stop.py)
**Purpose:** Instructs Claude to run /goodbye when threshold is reached
**Trigger:** When Claude stops (end of session)
**Behavior:**
- Reads commit count
- If < 20: Shows progress message
- If >= 20: Prints instruction message for Claude to run /goodbye

**Simplified Design:** No workflow logic here - just detection and instruction!

### 4. Goodbye Skill
**File:** [.claude/skills/goodbye/SKILL.md](.claude/skills/goodbye/SKILL.md)
**Purpose:** Execute complete goodbye workflow and reset counter
**Invocation:** `/goodbye` command (manual or auto-triggered by stop hook)
**Steps:**
1. Get system info (date, hostname)
2. Create conversation log in Google Drive
3. Wait 5 seconds for sync
4. Get shareable Drive link
5. Post to Slack with clickable link
6. **Reset commit counter to 0**

**This is where all the workflow logic lives!**

### 5. Hook Registration
**File:** [.claude/hooks.json](.claude/hooks.json)
**Purpose:** Registers stop hook with Claude Code
**Config:**
```json
{
  "stop": [
    {
      "name": "commit_tracker",
      "path": ".claude/hooks/commit_tracker_stop.py",
      "description": "Tracks commits and auto-instructs /goodbye at 20 commits"
    }
  ]
}
```

---

## Goodbye Workflow (Automated)

When commit count reaches 20, the stop hook automatically:

### Step 1: Get System Info
- Date: `YYYY-MM-DD` format
- Hostname: Machine name (e.g., `SPLIT-LEASE-6`)
- Session ID: From Claude session data

### Step 2: Create Conversation Log
- **Location:** `%googleDrivePath%!Agent Context and Tools\SL1\Claude Logs\`
- **Filename:** `YYYY-MM-DD_conversation_session-{session_id}.md`
- **Content:**
  - Session metadata (ID, date, model, commit count)
  - Full conversation transcript (JSONL format)

### Step 3: Get Google Drive Link
- **Script:** `C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py`
- **Wait:** 5 seconds for Google Drive sync
- **Output:** Shareable Drive URL

### Step 4: Send to Slack
- **Webhook:** `https://hooks.slack.com/services/TM545C1T7/B09HFGZNVQV/...`
- **Message Format:**
  ```
  Session documented after 20 commits.
  <drive_url|filename>
  *Host:* hostname
  ```
- **Clickable Link:** Slack format `<url|text>`

### Step 5: Reset Counter
- Sets `.claude/commit_count.txt` back to `0`
- Ready for next 20 commits

---

## How It Works in Practice

### Normal Session (< 20 commits)
```bash
$ git commit -m "feat: add feature"
Commit counter: 5 (goodbye triggers at 20)

$ # Continue working...

$ git commit -m "fix: bug fix"
Commit counter: 6 (goodbye triggers at 20)

# When Claude stops:
📊 Commit count: 6/20 (goodbye auto-triggers at 20)
```

### Threshold Reached (20 commits) - Auto-Instruct Pattern
```bash
$ git commit -m "refactor: cleanup"
Commit counter: 20 (goodbye triggers at 20)

# When Claude tries to stop:

============================================================
🎯 COMMIT THRESHOLD REACHED!
============================================================

📊 You've made 20 commits in this session.

⚠️  AUTOMATIC ACTION REQUIRED:
   Please run the /goodbye skill to document this session.
   (The /goodbye skill will handle everything and reset the counter)

============================================================

# Claude sees this message and automatically runs:

/goodbye

# The /goodbye skill then executes:

📅 Getting system info...
📄 Creating conversation log...
⏳ Waiting for Google Drive sync...
🔗 Getting shareable Drive link...
📢 Posting to Slack...
🔄 Resetting commit counter...

✅ Session documented successfully!
   📄 Log: 2026-01-07_conversation_session-abc123.md
   🔗 Drive: https://drive.google.com/file/d/...
   📢 Slack: Notification sent
   🔄 Counter: Reset to 0
```

---

## Testing

### Test 1: Post-Commit Hook ✅
```bash
$ git commit -m "test: check counter"
Commit counter: 1 (goodbye triggers at 20)

$ cat .claude/commit_count.txt
1
```
**Result:** Counter increments correctly

### Test 2: Stop Hook (Manual)
```bash
$ echo '{"session_id": "test", "transcript_path": "test.jsonl"}' | python .claude/hooks/commit_tracker_stop.py
📊 Commit count: 1/20 (goodbye auto-triggers at 20)
```
**Result:** Hook runs without errors when count < 20

### Test 3: Full Workflow (When Count = 20)
**To test:** Make 19 more commits, then stop Claude
**Expected:** Auto-goodbye workflow executes, Slack notification sent, counter resets

---

## Troubleshooting

### Counter Not Incrementing
**Symptoms:** Commit happens but counter stays at same value
**Causes:**
- Post-commit hook not executable
- Hook script has errors

**Fix:**
```bash
chmod +x .git/hooks/post-commit
cat .git/hooks/post-commit  # Verify content
```

### Stop Hook Not Running
**Symptoms:** No commit count message when Claude stops
**Causes:**
- `hooks.json` not configured
- Stop hook not executable
- Python errors in script

**Fix:**
```bash
chmod +x .claude/hooks/commit_tracker_stop.py
cat .claude/hooks.json  # Verify registration
python .claude/hooks/commit_tracker_stop.py < test_input.json  # Manual test
```

### Google Drive Link Fails
**Symptoms:** "Failed to get Drive link" error
**Causes:**
- `get_drive_link.py` not found
- Google Drive not synced
- Token expired

**Fix:**
1. Verify script exists: `C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py`
2. Test manually: `python get_drive_link.py "path\to\file.md"`
3. Re-authenticate if needed (delete `token.pickle`)

### Slack Notification Fails
**Symptoms:** "Slack notification may have failed"
**Causes:**
- Webhook URL invalid
- Network issues
- JSON formatting errors

**Fix:**
1. Test webhook manually:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"text":"test"}' \
     https://hooks.slack.com/services/...
   ```
2. Check Slack channel for messages
3. Verify no typos in webhook URL

### Counter Stuck at High Number
**Symptoms:** Counter at 25+ but goodbye didn't run
**Cause:** Previous goodbye workflow failed
**Fix:**
1. Run `/goodbye` manually
2. Reset counter: `echo "0" > .claude/commit_count.txt`

---

## Manual Override

### Manually Trigger Goodbye
```bash
/goodbye
```

### Manually Reset Counter
```bash
echo "0" > .claude/commit_count.txt
```

### Manually Check Counter
```bash
cat .claude/commit_count.txt
```

### Disable Tracking (Temporary)
```bash
# Rename hooks.json to disable
mv .claude/hooks.json .claude/hooks.json.disabled

# Restore to re-enable
mv .claude/hooks.json.disabled .claude/hooks.json
```

---

## File Locations

| Component | Path |
|-----------|------|
| Git post-commit hook | `.git/hooks/post-commit` |
| Commit counter | `.claude/commit_count.txt` |
| Stop hook (Python) | `.claude/hooks/commit_tracker_stop.py` |
| Hook registration | `.claude/hooks.json` |
| **Goodbye skill** | **`.claude/skills/goodbye/SKILL.md`** |
| Drive link script | `C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py` |
| Conversation logs | `%googleDrivePath%!Agent Context and Tools\SL1\Claude Logs\` |
| Slack webhook | `https://hooks.slack.com/services/TM545C1T7/B09HFGZNVQV/...` |

---

## Benefits

✅ **Automatic Documentation**: Never forget to document important sessions
✅ **Commit-Based Trigger**: Documents after meaningful work (20 commits)
✅ **Auto-Instruct Pattern**: Claude automatically runs /goodbye when instructed by stop hook
✅ **Slack Integration**: Team notifications with clickable links
✅ **Google Drive Storage**: Persistent, searchable logs
✅ **Transparent**: Shows progress on every commit
✅ **Resilient**: Retries on failure (counter not reset until success)
✅ **Reusable Skill**: /goodbye can be run manually anytime, not just at 20 commits
✅ **Clean Architecture**: Hook detects, skill executes (separation of concerns)
✅ **No Code Duplication**: All workflow logic in one place (the skill)

---

## Future Enhancements

**Potential improvements:**
- Configurable threshold (ENV variable for count)
- Richer summaries (parse transcript for key changes)
- Multiple Slack channels based on project type
- Weekly/monthly rollup reports
- Integration with task tracking systems

---

**Version:** 1.0
**Last Updated:** 2026-01-07
**Status:** ✅ Production Ready
