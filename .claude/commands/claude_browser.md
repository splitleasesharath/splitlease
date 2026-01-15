# /claude_browser - Launch Claude.ai Browser Session

**Description:** Opens Claude.ai in Chrome using Claude Code's native browser extension, sends a prompt, and captures the response.

**Usage:** `/claude_browser <prompt>`

**Example:** `/claude_browser "Analyze the performance metrics of our API"`

---

## Instructions

You are tasked with using Claude Code's **Chrome extension** to launch a Claude.ai session and interact with it programmatically.

### Prerequisites

The user must have:
1. Claude Code Chrome extension installed (https://code.claude.com/docs/en/chrome)
2. Active Claude.ai session (logged in)
3. Chrome browser open and accessible

### Workflow Steps

**Step 1: Navigate to Claude.ai**

Use your built-in browser capabilities to navigate to https://claude.ai:
- Open a new tab or focus existing Claude.ai tab
- Wait for the page to fully load
- Verify you're on the Claude.ai chat interface

**Step 2: Identify the Chat Input**

Look for the chat input textarea where users type messages:
- It usually has placeholder text like "Talk with Claude..." or "Message Claude..."
- Located at the bottom of the chat interface
- May be a contenteditable div or textarea element

**Step 3: Send the Prompt**

Type the user's prompt into the chat input:
```
{USER_PROMPT_HERE}
```

Submit the message by:
- Pressing Enter/Return, OR
- Clicking the Send button (usually an arrow icon)

**Step 4: Wait for Response**

Claude's response may take 10-30 seconds depending on complexity:
- Watch for the response to start appearing
- Wait until the response is complete (no streaming dots/animation)
- Ensure the full response is visible

**Step 5: Capture the Response**

Extract Claude's response text:
- Find the last message in the conversation (Claude's response)
- Extract the complete text content
- Preserve formatting (code blocks, lists, etc.)

**Step 6: Take Screenshot**

Capture a screenshot of the conversation:
- Include both the user's prompt and Claude's response
- Save to a reasonable location
- Return the screenshot path

### Output Format

Return the response in this exact format:

```
# Claude.ai Response

{claude_response_text}

---
Screenshot: {screenshot_path}
```

---

## Important Notes

1. **Chrome Extension**: You have native browser control through Claude Code's Chrome extension. No external tools needed.

2. **Authentication**: User must be logged into Claude.ai. If you encounter a login screen, inform the user.

3. **Rate Limits**: Be aware of Claude.ai's rate limits. Don't send rapid-fire requests.

4. **Wait Times**: Claude's responses can take time. Be patient and wait for complete responses.

5. **Element Selectors**: If the UI structure has changed, adapt your selectors accordingly.

6. **Error Handling**: If navigation or interaction fails, provide clear error messages.

---

## Example Interaction

**User provides prompt:** "Explain quantum computing in simple terms"

**Your actions:**
1. Navigate to claude.ai
2. Find chat input
3. Type: "Explain quantum computing in simple terms"
4. Click send
5. Wait for response
6. Extract response text
7. Take screenshot
8. Return formatted response

**Expected output:**
```
# Claude.ai Response

Quantum computing is a new type of computing that uses the principles of quantum mechanics...
[full response]

---
Screenshot: agents/{adw_id}/claude_browser/response_screenshot.png
```

---

## Troubleshooting

- **"Can't access browser"**: Ensure Claude Code Chrome extension is installed and enabled
- **"Login required"**: User needs to log into Claude.ai first
- **"Element not found"**: Claude.ai UI may have changed - inspect the page and adapt
- **"Timeout"**: Response took too long - increase wait time or retry
- **"Rate limit"**: Too many requests - wait before retrying
