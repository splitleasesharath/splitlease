# invoke-claude-chrome

**Description**: Invoke Claude Code CLI with Chrome integration for browser automation tasks.

**Usage**: `/invoke-claude-chrome <prompt>`

**Examples**:
- `/invoke-claude-chrome Open split.lease`
- `/invoke-claude-chrome Open split.lease/search`
- `/invoke-claude-chrome Take a screenshot of the homepage`
- `/invoke-claude-chrome Click the sign-in button and fill the login form`

---

## What This Skill Does

This skill executes the Claude Code CLI with the `--chrome` flag to enable browser automation using Claude's built-in Playwright MCP integration. It runs in non-interactive mode (`--print`) to capture the output for programmatic use.

---

## Command Pattern

```bash
claude --chrome --print "<user_prompt>"
```

**Flags**:
- `--chrome`: Enable Claude in Chrome integration (browser automation via Playwright MCP)
- `--print`: Non-interactive mode - print response and exit (useful for automation)
- `"<user_prompt>"`: The task you want Claude to perform in the browser

---

## How It Works

1. **Launches Chrome** with Claude Code integration
2. **Executes the prompt** using Claude's browser automation capabilities
3. **Returns the output** to stdout (captured for logging/processing)
4. **Exits** when the task completes

---

## Permission System

**First Run**: Claude will ask permission to navigate to new domains. Accept and add to the permitted list for future automation.

**Permitted Sites**: Once a domain is whitelisted, subsequent runs will execute without prompts.

**Override Permissions** (use with caution):
```bash
claude --chrome --print --permission-mode dontAsk "<prompt>"
```

---

## Integration with ADW

This skill encodes the working pattern discovered for `adw_claude_browser.py`. The ADW workflow uses this exact command structure:

```python
# In adw_modules/agent.py
subprocess.run(
    [CLAUDE_PATH, "--chrome", "--print", user_prompt],
    capture_output=True,
    text=True,
    encoding='utf-8'
)
```

---

## Environment Requirements

**Required**:
- Claude Code CLI installed and in PATH
- `CLAUDE_CODE_PATH` set in `.env` (defaults to `claude`)
- Chrome browser installed

**Optional**:
- `--permission-mode dontAsk` for fully automated workflows
- `--timeout` flag for long-running browser tasks

---

## Examples

### Basic Navigation
```bash
/invoke-claude-chrome Open github.com
```

### Multi-Step Interaction
```bash
/invoke-claude-chrome Navigate to split.lease/search, select Monday and Tuesday, then click search
```

### Screenshot Capture
```bash
/invoke-claude-chrome Take a screenshot of the current page and save it
```

### Form Automation
```bash
/invoke-claude-chrome Fill the search form with location "New York" and budget range "$1000-$2000"
```

---

## Technical Notes

- **Model**: Uses default model (sonnet) unless `--model` flag is specified
- **Output Format**: Text by default, use `--output-format json` for structured output
- **Session Persistence**: Disabled by default in `--print` mode
- **Working Directory**: Executes from current directory context
- **Timeout**: Default 2 minutes, configurable with `--timeout` parameter

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "CLI not installed" error | Verify `CLAUDE_CODE_PATH` in `.env` is set to `claude` |
| Permission prompts blocking automation | Accept and add domain to permitted list, or use `--permission-mode dontAsk` |
| Chrome not launching | Ensure Chrome is installed and accessible in PATH |
| Timeout on long tasks | Increase timeout: add `timeout=120000` to subprocess call (ms) |

---

## Related Files

- **ADW Integration**: `adws/adw_claude_browser.py`
- **Core Logic**: `adws/adw_modules/agent.py` (line 343: `prompt_claude_code()`)
- **Environment Config**: `.env` (line 10: `CLAUDE_CODE_PATH`)
- **Health Check**: `adws/adw_tests/health_check.py`

---

**Created**: 2026-01-10
**Version**: 1.0
**Status**: Active
