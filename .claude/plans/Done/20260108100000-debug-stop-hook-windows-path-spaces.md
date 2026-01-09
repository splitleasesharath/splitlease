# Debug Analysis: Stop Hook Script Error - Windows Path with Spaces

**Created**: 2026-01-08T10:00:00Z
**Status**: Analysis Complete - Pending Implementation
**Severity**: Medium
**Affected Area**: Claude Code Plugin System - ralph-loop stop hook

## 1. System Context (From Onboarding)

### 1.1 Architecture Understanding
- **Architecture Pattern**: Claude Code Plugin System with hook-based extensibility
- **Tech Stack**: Bash shell scripts, JSON configuration, Claude Code hook runner
- **Data Flow**:
  1. Session stop triggers hook runner
  2. Hook runner reads hooks.json from plugin directory
  3. Hook runner substitutes ${CLAUDE_PLUGIN_ROOT} with actual path
  4. Hook runner executes command string
  5. Command fails due to unquoted path containing spaces

### 1.2 Domain Context
- **Feature Purpose**: ralph-loop plugin provides a self-referential development loop that prevents session exit until a completion condition is met
- **Related Documentation**: .claude/cache/changelog.md (line 54 references a prior ${CLAUDE_PLUGIN_ROOT} substitution fix)
- **Plugin Location**: C:\Users\Split Lease\.claude\plugins\marketplaces\claude-plugins-official\plugins\ralph-loop
### 1.3 Relevant Conventions
- **Hook Configuration**: JSON files define hooks with command field containing ${CLAUDE_PLUGIN_ROOT} variable
- **Variable Substitution**: Claude Code substitutes ${CLAUDE_PLUGIN_ROOT} at runtime with the plugin actual directory path
- **Path Format**: Windows paths can contain spaces (e.g., C:\Users\Split Lease)

### 1.4 Entry Points and Dependencies
- **Entry Point**: Session stop event triggers Stop hooks
- **Configuration File**: C:\Users\Split Lease\.claude\plugins\marketplaces\claude-plugins-official\plugins\ralph-loop\hooks\hooks.json
- **Script File**: C:\Users\Split Lease\.claude\plugins\marketplaces\claude-plugins-official\plugins\ralph-loop\hooks\stop-hook.sh
- **Dependencies**: Bash shell, jq, sed, awk, grep, perl

## 2. Problem Statement

When a session ends and the ralph-loop stop hook is triggered, the hook fails with the error:
```
C:\Users\Split is not recognized as an internal or external command, operable program or batch file.
```

This occurs because:
1. The ${CLAUDE_PLUGIN_ROOT} variable resolves to C:\Users\Split Lease\.claude\plugins\...
2. The path contains a space in "Split Lease"
3. The command string is not properly quoted
4. Windows/bash interprets C:\Users\Split as the command and Lease\... as arguments

## 3. Reproduction Context

- **Environment**: Windows 10/11 with Git Bash or similar
- **Steps to reproduce**:
  1. Have Claude Code installed with user home directory containing spaces (e.g., C:\Users\Split Lease)
  2. Install the ralph-loop plugin
  3. Start a ralph-loop session with /ralph-loop prompt
  4. Allow the session to attempt exit
  5. Observe stop hook error
- **Expected behavior**: Stop hook script executes successfully
- **Actual behavior**: Hook fails with path parsing error

## 4. Investigation Summary

### 4.1 Files Examined

| File | Relevance |
|------|-----------|
| ralph-loop/hooks/hooks.json | ROOT CAUSE - Contains unquoted command path |
| ralph-loop/hooks/stop-hook.sh | Hook script itself (well-written, not the issue) |
| ralph-loop/commands/ralph-loop.md | Uses ${CLAUDE_PLUGIN_ROOT} with quotes on line 13 |
| security-guidance/hooks/hooks.json | Similar pattern - HAS SAME ISSUE (confirmed during investigation) |
| hookify/hooks/hooks.json | Uses python3 ${CLAUDE_PLUGIN_ROOT}/... - may also be affected |

### 4.2 Execution Flow Trace

1. Session Stop Event: User ends session or session auto-terminates
2. Hook Runner Activation: Claude Code internal hook runner processes registered Stop hooks
3. Hook Discovery: Reads hooks.json from each enabled plugin
4. Variable Substitution: Replaces ${CLAUDE_PLUGIN_ROOT} with actual path
5. Command Execution: Attempts to execute the command string
6. Failure Point: Shell interprets unquoted path with spaces as multiple arguments

## 5. Hypotheses

### Hypothesis 1: Unquoted Path in hooks.json Command Field (Likelihood: 95%)

**Theory**: The command field in hooks.json specifies the path without quotes. When Claude Code hook runner substitutes ${CLAUDE_PLUGIN_ROOT} and executes the resulting command, the unquoted path with spaces is incorrectly parsed.

**Supporting Evidence**:
- Error message shows path split at space
- The ralph-loop.md command file uses quotes
- Multiple cached versions of hooks.json all have the same unquoted pattern
- CONFIRMED: During investigation, the security-guidance PreToolUse hook also failed with identical error

**Contradicting Evidence**: None found

**Potential Fix**:
```json
{
  "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/stop-hook.sh\""
}
```

## 6. Recommended Action Plan

### Priority 1 (Try First): Quote the Path in hooks.json

Modify all affected hooks.json files to include quotes around paths:

**ralph-loop/hooks/hooks.json:**
```json
{
  "description": "Ralph Loop plugin stop hook for self-referential loops",
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/stop-hook.sh\""
          }
        ]
      }
    ]
  }
}
```

**security-guidance/hooks/hooks.json:**
```json
{
  "command": "python3 \"${CLAUDE_PLUGIN_ROOT}/hooks/security_reminder_hook.py\""
}
```

**hookify/hooks/hooks.json:**
Quote all four command paths (lines 9, 20, 31, 42)

### Priority 2: Clear Plugin Cache

Delete cached versions in:
- .claude/plugins/cache/claude-plugins-official/ralph-loop/
- .claude/plugins/cache/claude-plugins-official/security-guidance/
- .claude/plugins/cache/claude-plugins-official/hookify/

### Priority 3 (Workaround): Relocate Claude Config Directory

Set CLAUDE_CONFIG_DIR environment variable to a path without spaces

## 7. Prevention Recommendations

1. Always quote paths in hooks.json command fields
2. Test plugins with paths containing spaces before release
3. Follow the pattern in command files (like ralph-loop.md) which correctly quotes paths

## 8. Related Files Reference

### Files to Modify (Primary)

| File | Line | Change |
|------|------|--------|
| ralph-loop/hooks/hooks.json | 9 | Quote the command path |
| security-guidance/hooks/hooks.json | 9 | Quote the command path |
| hookify/hooks/hooks.json | 9,20,31,42 | Quote all command paths |

### Reference Files (Correct Pattern)

| File | Line | Pattern |
|------|------|---------|
| ralph-loop/commands/ralph-loop.md | 13 | "${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" (quoted) |

---

## Summary

**Root Cause**: The hooks.json files in multiple plugins specify the command path without quotes, causing Windows path parsing failure when ${CLAUDE_PLUGIN_ROOT} contains spaces.

**Affected Plugins**:
1. ralph-loop (Stop hook)
2. security-guidance (PreToolUse hook) - CONFIRMED BROKEN
3. hookify (PreToolUse, PostToolUse, Stop, UserPromptSubmit hooks) - Likely broken

**Recommended Fix**: Add quotes around the path in the command field of all hooks.json files

**Next Steps**:
1. Modify all affected hooks.json files to quote paths
2. Clear plugin cache directories
3. Test the fixes by triggering each hook type
4. Report the issue upstream to the plugin repository maintainers
