# PROMPT TEMPLATE: Conversation Logger & Slack Notifier

## Overview
This prompt template enables an AI assistant to capture a complete conversation, save it as a timestamped log file with metadata, generate a clickable Google Drive link, and send a condensed summary to a Slack webhook.

Run this each time you're asked to, even if it was previously run/done. Start fresh on each call.
---

## Complete Prompt Template

```
I want you to:

1. Summarize our entire conversation including all context, technical details, and outcomes

2. Save the complete conversation as a timestamped log file with the following specifications:
   - Retrieve the path using PowerShell: `$env:googleDrivePath`
   - Construct full path: `$env:googleDrivePath` + `!Agent Context and Tools\SL1\Claude Logs\{{ date }}_conversation_session-{{ session_id }}.md`
   - Filename format: {{ date }}_conversation_session-{{ session_id }}.md (e.g., 2025-10-21_conversation_session-goodbye-command.md)
   - Include metadata: timestamp, hostname, session ID, model name
   - Format: Comprehensive Markdown documentation

3. Generate Google Drive shareable link:
   - Use Python script: C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py
   - Pass the full file path as argument
   - Script returns clickable Google Drive URL

4. Create a condensed summary and send it to this Slack webhook:
   - Webhook URL: Retrieve using PowerShell `$env:tiny-task-agent`
   - Message format (JSON):
     ```json
     {
       "text": "<short summary of task done>\n<{{ google_drive_url }}|{{ filename }}>\n*Host:* {{ hostname }}"
     }
     ```
   - CRITICAL: NO EMOJIS, keep summary ultra-concise
```

---

## Detailed Implementation Guide

### STEP 1: Gather System Information

**Tool Calls Required:**

#### 1.1 Get Current Timestamp (Date Only)
```powershell
Get-Date -Format 'yyyy-MM-dd'
```

#### 1.2 Get Hostname
```powershell
hostname
```

#### 1.3 Get Google Drive Path(Use single quotes to run. This is run on Windows through git bash)
```powershell '$env:googleDrivePath'
```

**Variables Generated:**
- `$date`: e.g., `2025-10-15` (YYYY-MM-DD format only)
- `$hostname`: e.g., `SPLIT-LEASE-6`
- `$session_id`: Custom identifier based on conversation topic (e.g., `goodbye-command`, `slack-webhook`)
- `$google_drive_path`: Retrieved from powershell `$env:googleDrivePath` environment variable

---

### STEP 2: Create Comprehensive Conversation Log

**Tool Call: Write**

**Construct File Path:**
1. Retrieve Google Drive path: powershell `$env:googleDrivePath` (from STEP 1.3)
2. Append: `!Agent Context and Tools\SL1\Claude Logs\{{ date }}_conversation_session-{{ session_id }}.md`
3. Final path format: `$env:googleDrivePath!Agent Context and Tools\SL1\Claude Logs\{{ date }}_conversation_session-{{ session_id }}.md`

**Example:**
If `$env:googleDrivePath` = `C:\Users\Split Lease\splitleaseteam\`, then full path is:
```
C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL1\Claude Logs\2025-10-21_conversation_session-goodbye-command.md
```

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

### STEP 3: Wait for Google Drive Sync

**Tool Call: Bash**

```powershell
# Wait 5 seconds for Google Drive Desktop to sync the file
Start-Sleep -Seconds 5
```

**Why this is needed:**
- Google Drive Desktop syncs files asynchronously
- 5 seconds is typically enough for small markdown files
- Ensures file is available in Drive before searching

---

### STEP 4: Get Google Drive Shareable Link

**Tool Call: Bash**

**Script Location:** `C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py` (Fixed location)

**Command:**
```powershell
python "C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py" "$env:googleDrivePath!Agent Context and Tools\SL1\Claude Logs\{{ date }}_conversation_session-{{ session_id }}.md"
```

**IMPORTANT:** The command uses `$env:googleDrivePath` which PowerShell will expand to the actual path before passing to Python.

**How it works:**
1. Takes the full local file path as input
2. Extracts filename from path
3. Authenticates with Google Drive API (using cached token)
4. Searches Drive for file by name
5. Returns shareable webViewLink
6. Output: `https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk`

**Example:**
```powershell
# Full command (PowerShell expands $env:googleDrivePath before execution)
python "C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py" "$env:googleDrivePath!Agent Context and Tools\SL1\Claude Logs\2025-10-15_conversation_session-slack-webhook.md"

# Actual path passed to Python after expansion (example):
# C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL1\Claude Logs\2025-10-15_conversation_session-slack-webhook.md

# Output
https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view?usp=drivesdk
```

---

### STEP 5: Create Condensed Summary JSON for Slack

**Tool Call: Write**

**Temporary File Path:**
```
C:\Users\Split Lease\.claude\condensed_summary.json
```

**JSON Template (with Google Drive clickable link):**

```json
{
  "text": "<short summary of task done>\n<{{ google_drive_url }}|{{ filename }}>\n*Host:* {{ hostname }}"
}
```


### STEP 6: Send Summary to Slack Webhook

**Tool Call: Bash**

**Command:**
```bash
curl -X POST -H "Content-Type: application/json" --data @"C:\Users\Split Lease\.claude\condensed_summary.json" $env:tiny_task_agent
```

**Expected Response:**
```
ok
```

**If you receive `ok`:** Success - Message delivered to Slack with clickable Google Drive link

**If you receive `invalid_payload`:** JSON formatting issue - check escaping

---

## Google Drive Link Script Details

**Script:** `C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py` (Fixed location)

**What it does:**
- Authenticates with Google Drive API (OAuth2)
- Searches for file by filename
- Returns shareable Google Drive URL
- Handles token caching for fast subsequent runs

**Setup (one-time):**
1. Credentials configured: `C:\Users\Split Lease\.claude\google-drive-tools\credentials.json`
2. First run opens browser for authentication
3. Token saved to: `C:\Users\Split Lease\.claude\google-drive-tools\token.pickle`
4. Future runs use cached token (no browser needed)

**Portability:**
- Script location is fixed: `C:\Users\Split Lease\.claude\google-drive-tools\`
- Same on all computers (not synced via Google Drive)
- Log files use %googleDrivePath% environment variable for consistent location
- Token may need re-authentication on new computers
- Token valid for ~6 months if unused, auto-refreshes when used

**Usage:**
```powershell
python "C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py" "<FULL_FILE_PATH>"
```

**File Path Requirements:**
- Works for any file in Google Drive (any mount point)
- File MUST exist locally
- File MUST be synced to Google Drive (wait 5 seconds after creation)

**Output:**
- Stdout: Google Drive URL only (clean for scripting)
- Stderr: Error messages (if any)

---

## Key Reminders

**Paths & Environment:**
- **CRITICAL:** Always retrieve the path using `$env:googleDrivePath` in PowerShell - never hardcode or guess the path
- **Log path construction:** `$env:googleDrivePath` + `!Agent Context and Tools\SL1\Claude Logs\`
- **Script location (fixed):** `C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py`

**Google Drive Script:**
- First run requires browser authentication (one-time setup)
- Subsequent runs use cached token: `C:\Users\Split Lease\.claude\google-drive-tools\token.pickle`
- Script outputs ONLY the URL (clean for scripting)
- **Wait 5 seconds** after creating file before getting Drive link (use `Start-Sleep -Seconds 5`)

**Slack & Formatting:**
- **NO EMOJIS** in Slack messages
- **Slack message format (JSON only):** `{"text": "<summary>\n<url|filename>\n*Host:* hostname"}`
- **Clickable links format:** `<drive_url|filename>`
- **Use file-based JSON** (not inline) to avoid escaping issues

**Commands:**
- **Use PowerShell syntax** for all commands (not bash)

---

## Troubleshooting

### "File not found in Google Drive"
- Wait 5 seconds for sync using `Start-Sleep -Seconds 5` (already built into workflow)
- Check file exists locally at the path using %googleDrivePath% variable
- Verify Google Drive Desktop is running and syncing

### "Authentication failed"
- Delete `C:\Users\Split Lease\.claude\google-drive-tools\token.pickle`
- Run script manually to re-authenticate
- Browser will open for login

### "Script not found"
- Verify: `C:\Users\Split Lease\.claude\google-drive-tools\get_drive_link.py` exists
- Check Python is installed: `python --version`

### "Cannot write file" or "Path not found"
- **Cause:** `$env:googleDrivePath` environment variable not set or path not properly retrieved
- **Fix:**
  - Run STEP 1.3 to retrieve `$env:googleDrivePath` first
  - Verify environment variable exists: `$env:googleDrivePath` in PowerShell
  - Ensure the retrieved path is properly concatenated with the rest of the file path
  - Ensure Google Drive Desktop is installed and folder structure exists

### Slack link not clickable
- Verify URL format: `<https://drive.google.com/file/d/ID/view|filename>`
- Check no spaces in URL
- Ensure proper JSON escaping

---
