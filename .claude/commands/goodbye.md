# PROMPT TEMPLATE: Conversation Logger & Slack Notifier

## Overview
This prompt template enables an AI assistant to capture a complete conversation, save it as a timestamped log file with metadata, generate a clickable Google Drive link, and send a condensed summary to a Slack webhook.

Run this each time you're asked to, even if it was previously run/done. Start fresh on each call.

---

## CRITICAL: Path & Variable Handling

**NEVER use environment variables directly in commands.** Always:
1. FETCH the value first using a dedicated command
2. STORE the literal value returned
3. USE that literal value to construct paths

Environment variables like `$env:googleDrivePath` do NOT expand properly when passed through bash or mixed shell contexts.

---

## Complete Prompt Template

```
I want you to:

1. Summarize our entire conversation including all context, technical details, and outcomes

2. FIRST, gather all paths by running these commands and storing the LITERAL output:
   - Date: `powershell -Command "Get-Date -Format 'yyyy-MM-dd'"` → store as DATE
   - Hostname: `hostname` → store as HOSTNAME
   - Google Drive path: `powershell -Command '$env:googleDrivePath'` → store as GDRIVE_PATH
   - User profile: `powershell -Command '$env:USERPROFILE'` → store as USER_HOME
   - Slack webhook: `printenv | grep -i tiny` → extract URL, store as SLACK_URL

3. THEN, construct full paths using the literal values:
   - Log file: {GDRIVE_PATH}_Agent Context and Tools\SL1\Claude Logs\{DATE}_conversation_session-{session_id}.md
   - Python script: {USER_HOME}/.claude/google-drive-tools/get_drive_link.py
   - JSON temp file: {USER_HOME}/.claude/condensed_summary.json

4. Save the conversation log using the Write tool with the constructed path

5. Wait 5 seconds for Google Drive sync, then get shareable link using:
   python "{USER_HOME}/.claude/google-drive-tools/get_drive_link.py" "{LOG_FILE_PATH}"

6. Create condensed summary JSON and send to Slack using curl with the SLACK_URL
```

---

## Detailed Implementation Guide

### STEP 1: Gather System Information (FETCH ALL VALUES FIRST)

**IMPORTANT:** Run ALL these commands FIRST and store the literal output values. Do NOT use environment variable references in later commands.

**Tool Calls Required (run in parallel):**

#### 1.1 Get Current Date
```bash
powershell -Command "Get-Date -Format 'yyyy-MM-dd'"
```
→ Store output as `DATE` (e.g., `2025-10-15`)

#### 1.2 Get Hostname
```bash
hostname
```
→ Store output as `HOSTNAME` (e.g., `Split-Lease-1`)

#### 1.3 Get Google Drive Path
```bash
powershell -Command '$env:googleDrivePath'
```
→ Store output as `GDRIVE_PATH` (e.g., `%USERPROFILE%\My Drive (splitleaseteam@gmail.com)\`)

**NOTE:** Use single quotes around `'$env:...'` to prevent bash from interpreting the `$` before PowerShell receives it.

#### 1.4 Get User Profile Path

**Option A (recommended):** Extract from GDRIVE_PATH
The GDRIVE_PATH typically starts with `%USERPROFILE%\...`, so you can extract USER_HOME from it:
```
GDRIVE_PATH = %USERPROFILE%\My Drive (splitleaseteam@gmail.com)\
USER_HOME   = %USERPROFILE%  (extract the first 3 path segments)
```

**Option B:** Direct PowerShell command (use single quotes!)
```bash
powershell -Command '$env:USERPROFILE'
```

**Option C:** If Option B fails, try escaping:
```bash
powershell -Command "\$env:USERPROFILE"
```

→ Store output as `USER_HOME` (e.g., `%USERPROFILE%`)

#### 1.5 Get Slack Webhook URL
```bash
printenv | grep -i tiny
```
→ Extract the URL value after `=`, store as `SLACK_URL`
→ Note: Variable name is `tiny-task-agent` (lowercase with hyphens), NOT `TINYTASKAGENT`
→ Example output: `tiny-task-agent=https://hooks.slack.com/services/...`

**Variables After STEP 1:**
| Variable | Example Value |
|----------|---------------|
| `DATE` | `2025-10-15` |
| `HOSTNAME` | `Split-Lease-1` |
| `GDRIVE_PATH` | `%USERPROFILE%\My Drive (splitleaseteam@gmail.com)\` |
| `USER_HOME` | `%USERPROFILE%` |
| `SLACK_URL` | `https://hooks.slack.com/services/...` |
| `SESSION_ID` | `goodbye-command` (based on conversation topic) |

---

### STEP 2: Construct Full Paths (Using Literal Values)

**Now construct paths by concatenating the literal values:**

#### Log File Path
```
{GDRIVE_PATH}_Agent Context and Tools\SL1\Claude Logs\{DATE}_conversation_session-{SESSION_ID}.md
```
**Example:**
```
%USERPROFILE%\My Drive (splitleaseteam@gmail.com)\_Agent Context and Tools\SL1\Claude Logs\2025-10-15_conversation_session-goodbye-command.md
```

#### Python Script Path (use forward slashes for bash compatibility)
```
{USER_HOME}/.claude/google-drive-tools/get_drive_link.py
```
**Example:**
```
%USERPROFILE%/.claude/google-drive-tools/get_drive_link.py
```

#### JSON Temp File Path
```
{USER_HOME}/.claude/condensed_summary.json
```
**Example:**
```
%USERPROFILE%/.claude/condensed_summary.json
```

---

### STEP 3: Create Comprehensive Conversation Log

**Tool Call: Write**

Use the constructed LOG_FILE_PATH from STEP 2.

**File Structure Template:**

```markdown
# Conversation Log

**Session ID:** [SESSION_ID]
**Date:** [YYYY-MM-DD]
**Hostname:** [HOSTNAME]
**Model:** [MODEL_NAME]

---

## Conversation Summary

### Original Intent
[Brief description of what the user wanted to accomplish]

---

## Phase 1: [Phase Name]

**User Message 1:**
> [User's exact message]

**Assistant Response:**
[Detailed summary of assistant's response, including:
- Actions taken
- Tools used
- Results
- Any insights shared]

---

## Phase 2: [Phase Name]

[Continue for each distinct phase of the conversation]

### Attempt 1: [Success/Failed]
**Command:**
```bash
[Exact command used]
```

**Result:** [Result description]

**Issue Identified (if failed):** [What went wrong]

### Attempt 2: [Success/Failed]
**Command:**
```bash
[Exact command used]
```

**Result:** [Result description]

**Fix Applied:** [How the issue was resolved]

---

## Key Technical Learnings

### 1. [Learning Topic]
- **Problem:** [Description]
- **Solution:** [Description]
- **Format/Pattern:** [Code or pattern example]

### 2. [Learning Topic]
- **Problem:** [Description]
- **Solution:** [Description]
- **Benefit:** [Why this approach is better]

---

## Tools & Technologies Used

1. **[Tool Name]** - [Purpose]
2. **[Tool Name]** - [Purpose]
[Continue for all tools used]

---

## Outcomes Summary

**[Outcome 1]:** [Description]
**[Outcome 2]:** [Description]
**[Outcome 3]:** [Description]

---

## File Metadata

- **Full Path:** `[FULL_FILE_PATH]`
- **Format:** Markdown
- **Size:** [Size estimate]
- **Encoding:** UTF-8

---

*End of Conversation Log*
```

---

### STEP 4: Wait for Google Drive Sync

**Tool Call: Bash**

```bash
powershell -Command "Start-Sleep -Seconds 5"
```

**Why this is needed:**
- Google Drive Desktop syncs files asynchronously
- 5 seconds is typically enough for small markdown files
- Ensures file is available in Drive before searching

---

### STEP 5: Get Google Drive Shareable Link

**Tool Call: Bash**

**Use the literal paths from STEP 2. Use forward slashes for bash compatibility.**

**Command Template:**
```bash
python "{USER_HOME}/.claude/google-drive-tools/get_drive_link.py" "{LOG_FILE_PATH_WITH_FORWARD_SLASHES}"
```

**Example with literal values:**
```bash
python "%USERPROFILE%/.claude/google-drive-tools/get_drive_link.py" "%USERPROFILE%/My Drive (splitleaseteam@gmail.com)/_Agent Context and Tools/SL1/Claude Logs/2025-10-15_conversation_session-goodbye-command.md"
```

**How it works:**
1. Takes the full local file path as input
2. Extracts filename from path
3. Authenticates with Google Drive API (using cached token)
4. Searches Drive for file by name
5. Returns shareable webViewLink
6. Output: `https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk`

→ Store output as `DRIVE_URL`

---

### STEP 6: Create Condensed Summary JSON for Slack

**Tool Call: Read first (required), then Edit**

**File Path (use literal USER_HOME):**
```
{USER_HOME}/.claude/condensed_summary.json
```

**Example:**
```
%USERPROFILE%/.claude/condensed_summary.json
```

**JSON Content:**
```json
{
  "text": "<short summary of task done>\n<{DRIVE_URL}|{FILENAME}>\n*Host:* {HOSTNAME}"
}
```

**Example with literal values:**
```json
{
  "text": "Session logged: /goodbye command executed\n<https://drive.google.com/file/d/1abc123/view?usp=drivesdk|2025-10-15_conversation_session-goodbye-command.md>\n*Host:* Split-Lease-1"
}
```

---

### STEP 7: Send Summary to Slack Webhook

**Tool Call: Bash**

**Use the literal SLACK_URL from STEP 1 and JSON file path from STEP 2.**

**Command Template:**
```bash
curl -X POST -H "Content-Type: application/json" --data-binary @"{JSON_FILE_PATH}" "{SLACK_URL}"
```

**Example with literal values:**
```bash
curl -X POST -H "Content-Type: application/json" --data-binary @"%USERPROFILE%/.claude/condensed_summary.json" "{YOUR_SLACK_WEBHOOK_URL}"
```

**Expected Response:**
```
ok
```

**If you receive `ok`:** Success - Message delivered to Slack with clickable Google Drive link

**If you receive `invalid_payload`:** JSON formatting issue - check escaping

---

## Google Drive Link Script Details

**Script Location:** `{USER_HOME}/.claude/google-drive-tools/get_drive_link.py`

**What it does:**
- Authenticates with Google Drive API (OAuth2)
- Searches for file by filename
- Returns shareable Google Drive URL
- Handles token caching for fast subsequent runs

**Setup (one-time):**
1. Credentials configured: `{USER_HOME}/.claude/google-drive-tools/credentials.json`
2. First run opens browser for authentication
3. Token saved to: `{USER_HOME}/.claude/google-drive-tools/token.pickle`
4. Future runs use cached token (no browser needed)

**Portability:**
- Script location is fixed: `{USER_HOME}/.claude/google-drive-tools/`
- Same on all computers (not synced via Google Drive)
- Log files location varies per machine (based on GDRIVE_PATH)
- Token may need re-authentication on new computers
- Token valid for ~6 months if unused, auto-refreshes when used

**Usage:**
```bash
python "{USER_HOME}/.claude/google-drive-tools/get_drive_link.py" "{FULL_FILE_PATH}"
```

**File Path Requirements:**
- Works for any file in Google Drive (any mount point)
- Use forward slashes in paths for bash compatibility
- File MUST exist locally
- File MUST be synced to Google Drive (wait 5 seconds after creation)

**Output:**
- Stdout: Google Drive URL only (clean for scripting)
- Stderr: Error messages (if any)

---

## Key Reminders

**Path & Variable Handling (CRITICAL):**
- **NEVER** use environment variables like `$env:googleDrivePath` directly in bash commands
- **ALWAYS** fetch values first with dedicated commands, store literal output
- **THEN** construct paths by concatenating literal values
- Use **forward slashes** in paths when running bash/curl commands

**Slack Webhook:**
- Variable name is `tiny-task-agent` (lowercase with hyphens)
- Find it with: `printenv | grep -i tiny`
- **NO EMOJIS** in Slack messages
- **Slack message format (JSON only):** `{"text": "<summary>\n<url|filename>\n*Host:* hostname"}`
- **Clickable links format:** `<drive_url|filename>`
- **Use file-based JSON** with `--data-binary @filepath` to avoid escaping issues

**Google Drive Script:**
- First run requires browser authentication (one-time setup)
- Subsequent runs use cached token
- Script outputs ONLY the URL (clean for scripting)
- **Wait 5 seconds** after creating file before getting Drive link

---

## Troubleshooting

### "Environment variable not expanding" or `:VARNAME not recognized`
- **Cause:** Bash interprets `$` before PowerShell receives the command
- **Symptoms:** Error like `:USERPROFILE : The term ':USERPROFILE' is not recognized`
- **Fix Options:**
  1. Use single quotes: `powershell -Command '$env:VAR'` (prevents bash expansion)
  2. Escape the dollar sign: `powershell -Command "\$env:VAR"`
  3. For USERPROFILE: Extract from GDRIVE_PATH (e.g., `%USERPROFILE%` from `%USERPROFILE%\My Drive...`)

### "File not found in Google Drive"
- Wait 5 seconds for sync (already built into workflow)
- Check file exists locally at the constructed path
- Verify Google Drive Desktop is running and syncing

### "Authentication failed"
- Delete `{USER_HOME}/.claude/google-drive-tools/token.pickle`
- Run script manually to re-authenticate
- Browser will open for login

### "Script not found"
- Fetch USER_HOME first: `powershell -Command '$env:USERPROFILE'`
- Verify script exists at: `{USER_HOME}/.claude/google-drive-tools/get_drive_link.py`
- Check Python is installed: `python --version`

### "Cannot write file" or "Path not found"
- **Cause:** Path not properly constructed from fetched values
- **Fix:**
  - Run STEP 1 to fetch all values first
  - Construct paths by concatenating literal values
  - Ensure Google Drive Desktop is installed and folder structure exists

### Slack link not clickable
- Verify URL format: `<https://drive.google.com/file/d/ID/view|filename>`
- Check no spaces in URL
- Ensure proper JSON escaping

---
