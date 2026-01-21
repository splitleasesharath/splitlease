# TAC (The Agent Choreographer) - Architecture Guide

> **Comprehensive Implementation Guide for Agentic Workflow Orchestration**
>
> **Source Directory**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL1\TAC - Clean\TAC - Clean`
>
> **Document Created**: 2026-01-16

---

## Executive Summary

TAC (The Agent Choreographer) is a sophisticated **outer shell orchestration system** that enables AI agents (specifically Claude Code) to execute complete software development workflows autonomously. Rather than being an application itself, TAC provides the infrastructure, configuration, and automation patterns that allow AI agents to:

- Receive work via GitHub issues
- Plan implementations
- Build features in isolated environments
- Test, review, and document changes
- Create pull requests ready for human review

This guide focuses on the **architectural choices** made in TAC's design, explaining the "why" behind each pattern.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [The Configuration Layer (.claude/)](#2-the-configuration-layer-claude)
3. [The Execution Engine (adws/)](#3-the-execution-engine-adws)
4. [Isolation & State Management](#4-isolation--state-management)
5. [Trigger Systems](#5-trigger-systems)
6. [Key Architectural Patterns](#6-key-architectural-patterns)
7. [Bootstrap & Entry Points](#7-bootstrap--entry-points)
8. [Directory Reference](#8-directory-reference)

---

## 1. System Architecture Overview

### High-Level Structure

```
TAC - The Agent Choreographer
│
├── .claude/                    # CONFIGURATION LAYER
│   ├── settings.json           # Permissions, hooks, environment
│   ├── commands/               # 28 slash command definitions
│   ├── hooks/                  # 7 lifecycle hooks
│   └── logs/                   # Session telemetry
│
├── adws/                       # EXECUTION ENGINE
│   ├── adw_*.py                # 16 workflow scripts
│   ├── adw_modules/            # Core modules (state, agent, git, etc.)
│   ├── adw_triggers/           # Webhook + cron triggers
│   └── adw_tests/              # Integration tests
│
├── trees/                      # RUNTIME: Isolated worktrees
├── agents/                     # RUNTIME: Session state & logs
│
└── app/                        # APPLICATION: The codebase being built
```

### Design Philosophy

| Principle | Implementation |
|-----------|----------------|
| **Separation of Concerns** | Configuration (`.claude/`) is distinct from Execution (`adws/`) which is distinct from Application (`app/`) |
| **Deterministic Isolation** | Each workflow gets its own worktree, ports, and state file |
| **Composable Workflows** | Small phases combine into larger workflows |
| **State-Based Sequencing** | JSON state files enable workflow resumption and phase composition |
| **Audit Everything** | Hooks log all tool usage, user input, and session events |

---

## 2. The Configuration Layer (.claude/)

> **Reference**: `.claude/` directory

The `.claude/` directory is the **control plane** for Claude Code. It defines what the agent can do, how it should behave, and what commands are available.

### 2.1 Settings Configuration

> **Reference**: `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(uv run *)",
      "Bash(npm *)",
      "Write(*)"
    ],
    "deny": [
      "Bash(git push --force*)",
      "Bash(rm -rf *)"
    ]
  },
  "hooks": {
    "PreToolUse": ["uv run .claude/hooks/pre_tool_use.py"],
    "PostToolUse": ["uv run .claude/hooks/post_tool_use.py"],
    "UserPromptSubmit": ["uv run .claude/hooks/user_prompt_submit.py"],
    "Notification": ["uv run .claude/hooks/notification.py"],
    "Stop": ["uv run .claude/hooks/stop.py"],
    "SubagentStop": ["uv run .claude/hooks/subagent_stop.py"],
    "PreCompact": ["uv run .claude/hooks/pre_compact.py"]
  }
}
```

#### Why This Pattern?

| Choice | Benefit |
|--------|---------|
| **Explicit allow-list** | Agent can only perform pre-approved operations; prevents accidental destructive commands |
| **Explicit deny-list** | Double protection for dangerous operations like force-push |
| **Hook-based lifecycle** | Validation, logging, and cleanup happen automatically without agent awareness |
| **uv run for hooks** | Consistent Python execution with proper dependency resolution |

### 2.2 Slash Commands

> **Reference**: `.claude/commands/` (28 files)

Slash commands are **markdown files** that define structured prompts for the agent. Each command follows a consistent format:

```markdown
# Command Name

Brief description of what this command does.

Variables:
  variable_name: $1
  another_var: $2

Instructions:
  - Step 1: Do this thing
  - Step 2: Do that thing
  - Step 3: Output in the specified format

Relevant Files:
  - path/to/relevant/file.ts
  - path/to/another/file.ts

Plan Format:
  ## Title
  ### Section 1
  - Content structure
```

#### Command Categories

| Category | Commands | Purpose |
|----------|----------|---------|
| **Issue Classification** | `/feature`, `/bug`, `/chore` | Classify GitHub issues and generate plans |
| **Execution** | `/implement`, `/patch` | Execute implementation plans |
| **Validation** | `/test`, `/test_e2e`, `/resolve_failed_test` | Run and fix tests |
| **Quality** | `/review`, `/document` | Code review and documentation |
| **Git** | `/commit`, `/pull_request`, `/generate_branch_name` | Source control operations |
| **Setup** | `/install`, `/install_worktree`, `/prime`, `/health_check` | Bootstrap and validation |
| **ADW Control** | `/classify_adw`, `/classify_issue`, `/track_agentic_kpis` | Workflow orchestration |

#### Why Markdown Commands?

| Choice | Benefit |
|--------|---------|
| **Human-readable** | Easy to review, modify, and understand |
| **Version-controlled** | Commands evolve with the codebase |
| **Self-documenting** | Instructions serve as both prompt and documentation |
| **Variable substitution** | `$1`, `$2` enable dynamic parameterization |
| **Structured output** | Plan Format sections ensure consistent agent responses |

### 2.3 Lifecycle Hooks

> **Reference**: `.claude/hooks/` (7 scripts)

Hooks intercept agent behavior at critical lifecycle points:

| Hook | Trigger Point | Purpose |
|------|---------------|---------|
| **PreToolUse** | Before any tool execution | Validate commands, block dangerous operations |
| **PostToolUse** | After tool execution | Log tool invocations for audit trail |
| **UserPromptSubmit** | When user sends message | Log user input |
| **Notification** | System notifications | Alert on important events |
| **Stop** | Session termination | Log session end |
| **SubagentStop** | Subagent termination | Track subagent lifecycle |
| **PreCompact** | Before context compression | Cleanup before compaction |

#### Hook Implementation Pattern

```python
# .claude/hooks/pre_tool_use.py
import sys
import json

def main():
    # Read hook input from stdin
    input_data = json.loads(sys.stdin.read())

    tool_name = input_data.get("tool_name")
    tool_input = input_data.get("tool_input", {})

    # Validate the operation
    if is_dangerous(tool_input):
        # Block the operation
        print(json.dumps({
            "decision": "block",
            "reason": "Dangerous operation detected"
        }))
    else:
        # Allow the operation
        print(json.dumps({"decision": "allow"}))

if __name__ == "__main__":
    main()
```

#### Why This Pattern?

| Choice | Benefit |
|--------|---------|
| **Python hooks** | Rich validation logic, access to external APIs |
| **JSON communication** | Structured data exchange with Claude Code |
| **Separate files per hook** | Single responsibility, easy to modify |
| **Centralized utilities** | `.claude/hooks/utils/` provides shared code |

---

## 3. The Execution Engine (adws/)

> **Reference**: `adws/` directory

ADW (AI Developer Workflow) is the **execution engine** that orchestrates multi-phase software development workflows.

### 3.1 Workflow Scripts

> **Reference**: `adws/adw_*.py` (16 scripts)

Workflows follow a consistent naming pattern:

```
adw_<phase>_iso.py           # Single-phase workflow
adw_<phase1>_<phase2>_iso.py # Multi-phase composite workflow
```

#### Workflow Types

| Type | Scripts | Description |
|------|---------|-------------|
| **Single Phase** | `adw_plan_iso.py`, `adw_build_iso.py`, `adw_test_iso.py`, `adw_review_iso.py`, `adw_document_iso.py`, `adw_ship_iso.py` | Execute one phase |
| **Composite** | `adw_plan_build_iso.py`, `adw_plan_build_test_iso.py`, `adw_plan_build_test_review_iso.py` | Chain multiple phases |
| **Full SDLC** | `adw_sdlc_iso.py`, `adw_sdlc_zte_iso.py` | Complete development lifecycle |
| **Utility** | `adw_patch_iso.py` | Specialized operations |

#### The "_iso" Suffix

All workflows use the `_iso` (isolated) suffix, indicating they run in **isolated worktrees**. This is a critical architectural decision:

| Without Isolation | With Isolation (`_iso`) |
|-------------------|-------------------------|
| Workflows share the same codebase | Each workflow has its own copy |
| Concurrent workflows conflict | 15 workflows can run in parallel |
| Failures can corrupt main repo | Failures are contained |
| Port conflicts are common | Deterministic port allocation |

### 3.2 Core Modules

> **Reference**: `adws/adw_modules/`

| Module | Responsibility |
|--------|----------------|
| **agent.py** | Execute slash commands via Claude Code CLI; model selection |
| **state.py** | Persistent state file management |
| **data_types.py** | Pydantic models for GitHub API, ADW state, requests/responses |
| **github.py** | GitHub API operations (issues, comments, auth) |
| **git_ops.py** | Git operations (commit, push, branch) |
| **worktree_ops.py** | Isolated worktree creation/management |
| **workflow_ops.py** | Issue classification, planning, branch generation |
| **r2_uploader.py** | Cloudflare R2 screenshot uploads |
| **utils.py** | Logging, JSON parsing, ID generation, environment safety |

#### Agent Module Detail

> **Reference**: `adws/adw_modules/agent.py`

The agent module is the **bridge** between Python workflows and Claude Code:

```python
SLASH_COMMAND_MODEL_MAP = {
    "/feature":   {"base": "sonnet", "heavy": "opus"},
    "/bug":       {"base": "sonnet", "heavy": "opus"},
    "/implement": {"base": "sonnet", "heavy": "opus"},
    "/test":      {"base": "sonnet", "heavy": "sonnet"},
    "/review":    {"base": "sonnet", "heavy": "opus"},
    "/document":  {"base": "sonnet", "heavy": "opus"},
    # ... more commands
}

def execute_slash_command(command: str, args: list, adw_id: str):
    """Execute a Claude Code slash command with appropriate model"""
    model = get_model_for_slash_command(command, adw_id)

    subprocess.run([
        "claude",
        "--model", model,
        "--command", command,
        *args
    ])
```

#### Why Model Selection?

| Choice | Benefit |
|--------|---------|
| **Per-command model mapping** | Expensive operations use powerful models; simple tasks use efficient models |
| **model_set parameter** | Users can request "heavy" models for complex features |
| **State-based persistence** | Model choice persists across phases |

---

## 4. Isolation & State Management

### 4.1 Worktree Isolation

> **Reference**: `adws/adw_modules/worktree_ops.py`

Each ADW workflow creates an **isolated Git worktree**:

```
trees/
├── a1b2c3d4/              # Worktree for ADW ID a1b2c3d4
│   ├── .git/              # Separate git state
│   ├── .ports.env         # Allocated ports for this instance
│   ├── app/               # Full copy of application
│   ├── adws/              # Full copy of ADW system
│   └── .claude/           # Full copy of configuration
│
├── x9y8z7w6/              # Another parallel workflow
└── ...
```

#### Port Allocation

> **Reference**: `adws/adw_modules/worktree_ops.py`

```python
def get_ports_for_adw(adw_id: str) -> Tuple[int, int]:
    """Deterministic port allocation from ADW ID"""
    hash_value = sum(ord(c) for c in adw_id)
    idx = hash_value % 15  # Support 15 concurrent workflows

    backend_port = 9100 + idx    # 9100-9114
    frontend_port = 9200 + idx   # 9200-9214

    return backend_port, frontend_port
```

| Choice | Benefit |
|--------|---------|
| **Deterministic hashing** | Same ADW ID always gets same ports |
| **15-slot allocation** | Practical limit for concurrent workflows |
| **Stored in .ports.env** | Subsequent phases can retrieve ports |

### 4.2 State Persistence

> **Reference**: `adws/adw_modules/state.py`

Workflow state is persisted in JSON files:

```
agents/
├── a1b2c3d4/
│   ├── adw_state.json         # Primary state file
│   ├── adw_plan_iso/
│   │   ├── execution.log      # Phase-specific logs
│   │   └── raw_output.jsonl   # Claude's raw responses
│   ├── adw_build_iso/
│   │   └── execution.log
│   └── adw_review_iso/
│       ├── execution.log
│       └── review_img/        # Screenshots
│           ├── 01_feature.png
│           └── 02_validation.png
```

#### State File Structure

```json
{
  "adw_id": "a1b2c3d4",
  "issue_number": 123,
  "branch_name": "feature/issue-123-add-user-auth",
  "plan_file": "specs/issue-123-adw-a1b2c3d4-user-auth.md",
  "issue_class": "/feature",
  "worktree_path": "C:/path/to/trees/a1b2c3d4",
  "backend_port": 9102,
  "frontend_port": 9202,
  "model_set": "base",
  "all_adws": ["adw_plan_iso", "adw_build_iso", "adw_test_iso"]
}
```

#### Why This Pattern?

| Choice | Benefit |
|--------|---------|
| **File-based state** | Simple, no database required, survives crashes |
| **Per-ADW directories** | Complete isolation of workflow artifacts |
| **Phase subdirectories** | Clear audit trail per phase |
| **Screenshot storage** | Visual evidence for review phases |

---

## 5. Trigger Systems

> **Reference**: `adws/adw_triggers/`

TAC provides two trigger mechanisms for initiating workflows:

### 5.1 Webhook Trigger

> **Reference**: `adws/adw_triggers/trigger_webhook.py`

```python
# FastAPI server listening for GitHub webhooks
@app.post("/gh-webhook")
async def handle_webhook(request: Request):
    payload = await request.json()

    # Extract issue number and look for "adw_" keyword
    if "adw_" in issue_body:
        workflow = extract_workflow_name(issue_body)  # e.g., "adw_plan_build"

        # Spawn workflow in background (non-blocking)
        background_tasks.add_task(
            run_workflow,
            workflow=workflow,
            issue_number=issue_number
        )

    # Return quickly (GitHub 10-second timeout)
    return {"status": "accepted"}
```

#### Why Webhooks?

| Choice | Benefit |
|--------|---------|
| **Real-time triggering** | Workflows start immediately when issues are created |
| **Background execution** | Returns quickly to satisfy GitHub timeout |
| **Keyword detection** | `adw_<workflow>` in issue body triggers specific workflow |
| **Loop prevention** | Filters out bot-generated comments |

### 5.2 Cron Trigger

> **Reference**: `adws/adw_triggers/trigger_cron.py`

```python
async def poll_github():
    """Poll every 20 seconds for new issues or 'adw' comments"""
    processed = set()

    while True:
        issues = fetch_open_issues()

        for issue in issues:
            if issue.id in processed:
                continue

            # Check for new issues without comments
            if issue.comments_count == 0 and "adw_" in issue.body:
                trigger_workflow(issue)
                processed.add(issue.id)

            # Check for latest comment containing "adw"
            elif latest_comment_has_adw(issue):
                trigger_workflow(issue)
                processed.add(issue.id)

        await asyncio.sleep(20)
```

#### Why Polling?

| Choice | Benefit |
|--------|---------|
| **Backup mechanism** | Works even if webhook fails |
| **Self-hosted friendly** | No public endpoint required |
| **Simple deployment** | Just run the script |
| **Graceful shutdown** | SIGINT handling for clean exit |

---

## 6. Key Architectural Patterns

### Pattern 1: Composable Workflows

Workflows are designed to be **composed** from smaller phases:

```
adw_plan_iso.py                    # Phase 1: Planning
adw_build_iso.py                   # Phase 2: Building
adw_test_iso.py                    # Phase 3: Testing
adw_review_iso.py                  # Phase 4: Review

adw_plan_build_iso.py              # = Phase 1 + Phase 2
adw_plan_build_test_iso.py         # = Phase 1 + Phase 2 + Phase 3
adw_plan_build_test_review_iso.py  # = Phase 1 + Phase 2 + Phase 3 + Phase 4
adw_sdlc_iso.py                    # = All phases + documentation
```

**Benefit**: Flexibility. Run just planning, or the full lifecycle, depending on need.

### Pattern 2: State-Based Sequencing

Phases communicate through **state files**, not direct coupling:

```
Phase 1 (plan)     → Creates state → agents/<adw_id>/adw_state.json
                                              ↓
Phase 2 (build)    ← Loads state  ← agents/<adw_id>/adw_state.json
                   → Updates state → agents/<adw_id>/adw_state.json
                                              ↓
Phase 3 (test)     ← Loads state  ← ...
```

**Benefit**: Phases can be rerun, resumed, or reordered. Failures don't corrupt other phases.

### Pattern 3: Hook-Based Lifecycle

All agent operations pass through hooks:

```
User Input → UserPromptSubmit Hook → Logged
                    ↓
Tool Call  → PreToolUse Hook → Validated
                    ↓
Execution  → PostToolUse Hook → Logged
                    ↓
Session End → Stop Hook → Logged
```

**Benefit**: Complete audit trail. Dangerous operations blocked. Consistent behavior.

### Pattern 4: GitHub-Centric Triggering

GitHub issues are the **single source of truth** for work:

```
GitHub Issue → Webhook/Cron → ADW Workflow → PR → Human Review → Merge
     ↑                                         ↓
     └────────────── Feedback Loop ────────────┘
```

**Benefit**: Work is tracked, visible, and reviewable in a familiar interface.

### Pattern 5: Deterministic Isolation

Every workflow gets **predictable, isolated resources**:

```
ADW ID: a1b2c3d4
├── Worktree: trees/a1b2c3d4/        (deterministic path)
├── Backend Port: 9102               (deterministic from hash)
├── Frontend Port: 9202              (deterministic from hash)
├── State File: agents/a1b2c3d4/     (deterministic path)
└── Branch: feature/issue-123-a1b2c3d4-*  (deterministic name)
```

**Benefit**: 15 workflows can run in parallel without collision. Debugging is reproducible.

---

## 7. Bootstrap & Entry Points

### Manual Execution

```bash
# From project root
cd adws/

# Run a specific workflow
uv run adw_plan_iso.py 123                    # Plan for issue #123
uv run adw_plan_build_iso.py 123              # Plan + Build
uv run adw_sdlc_iso.py 123                    # Full lifecycle

# With existing ADW ID (resumption)
uv run adw_build_iso.py 123 a1b2c3d4          # Build using existing state
```

### Automated Execution

```bash
# Start webhook server
cd adws/
uv run adw_triggers/trigger_webhook.py
# → Listens on :8001/gh-webhook

# Or start cron polling
uv run adw_triggers/trigger_cron.py
# → Polls every 20 seconds
```

### GitHub Issue Triggering

Create a GitHub issue with body containing:

```
## Feature Request

Add user authentication to the application.

adw_plan_build_test_review model_set=heavy
```

The `adw_plan_build_test_review` keyword triggers that workflow. `model_set=heavy` uses more powerful models.

---

## 8. Directory Reference

### Complete Structure

```
TAC - Clean/
├── .claude/                           # CONFIGURATION LAYER
│   ├── settings.json                  # Claude Code CLI configuration
│   ├── commands/                      # 28 slash command definitions
│   │   ├── feature.md                 # Feature planning command
│   │   ├── bug.md                     # Bug planning command
│   │   ├── chore.md                   # Chore planning command
│   │   ├── implement.md               # Implementation command
│   │   ├── test.md                    # Test execution command
│   │   ├── test_e2e.md                # E2E test command
│   │   ├── review.md                  # Code review command
│   │   ├── document.md                # Documentation command
│   │   ├── commit.md                  # Git commit command
│   │   ├── pull_request.md            # PR creation command
│   │   ├── install.md                 # Project install command
│   │   ├── install_worktree.md        # Worktree install command
│   │   ├── prime.md                   # Project priming command
│   │   ├── health_check.md            # Health check command
│   │   ├── patch.md                   # Patch command
│   │   ├── classify_issue.md          # Issue classification
│   │   ├── classify_adw.md            # ADW classification
│   │   ├── generate_branch_name.md    # Branch name generation
│   │   ├── resolve_failed_test.md     # Test fix command
│   │   ├── resolve_failed_e2e_test.md # E2E test fix command
│   │   ├── in_loop_review.md          # In-loop review command
│   │   ├── track_agentic_kpis.md      # KPI tracking command
│   │   ├── prepare_app.md             # App preparation
│   │   ├── start.md                   # App start command
│   │   ├── tools.md                   # Tool listing
│   │   ├── conditional_docs.md        # Conditional docs
│   │   └── e2e/                       # E2E test definitions (user-created)
│   ├── hooks/                         # 7 lifecycle hooks
│   │   ├── pre_tool_use.py            # Command validation
│   │   ├── post_tool_use.py           # Tool execution logging
│   │   ├── user_prompt_submit.py      # User input logging
│   │   ├── notification.py            # System notifications
│   │   ├── stop.py                    # Session end logging
│   │   ├── subagent_stop.py           # Subagent termination
│   │   ├── pre_compact.py             # Pre-compression cleanup
│   │   └── utils/                     # Shared utilities
│   │       ├── constants.py           # Shared constants
│   │       └── llm/                   # LLM API wrappers
│   │           ├── anth.py            # Anthropic API
│   │           └── oai.py             # OpenAI API
│   └── logs/                          # Session telemetry
│       ├── chat.json                  # Conversation logs
│       ├── errors.json                # Error logs
│       ├── notifications.json         # Notification logs
│       └── stop.json                  # Session end logs
│
├── adws/                              # EXECUTION ENGINE
│   ├── adw_plan_iso.py                # Planning phase
│   ├── adw_build_iso.py               # Building phase
│   ├── adw_test_iso.py                # Testing phase
│   ├── adw_review_iso.py              # Review phase
│   ├── adw_document_iso.py            # Documentation phase
│   ├── adw_ship_iso.py                # Shipping phase
│   ├── adw_patch_iso.py               # Patch workflow
│   ├── adw_plan_build_iso.py          # Plan + Build
│   ├── adw_plan_build_test_iso.py     # Plan + Build + Test
│   ├── adw_plan_build_review_iso.py   # Plan + Build + Review
│   ├── adw_plan_build_test_review_iso.py  # Plan + Build + Test + Review
│   ├── adw_plan_build_document_iso.py # Plan + Build + Document
│   ├── adw_sdlc_iso.py                # Full SDLC
│   ├── adw_sdlc_zte_iso.py            # Zero Touch Execution SDLC
│   ├── adw_modules/                   # Core modules
│   │   ├── __init__.py
│   │   ├── agent.py                   # Claude Code CLI wrapper
│   │   ├── state.py                   # State persistence
│   │   ├── data_types.py              # Pydantic models
│   │   ├── github.py                  # GitHub API
│   │   ├── git_ops.py                 # Git operations
│   │   ├── worktree_ops.py            # Worktree management
│   │   ├── workflow_ops.py            # Workflow orchestration
│   │   ├── r2_uploader.py             # Cloudflare R2
│   │   └── utils.py                   # Utilities
│   ├── adw_triggers/                  # Trigger mechanisms
│   │   ├── __init__.py
│   │   ├── trigger_webhook.py         # GitHub webhook server
│   │   └── trigger_cron.py            # Polling trigger
│   ├── adw_tests/                     # Integration tests
│   │   ├── health_check.py
│   │   ├── test_agents.py
│   │   ├── test_model_selection.py
│   │   ├── test_r2_uploader.py
│   │   └── test_webhook_simplified.py
│   └── README.md                      # ADW documentation
│
├── trees/                             # RUNTIME: Isolated worktrees
│   └── <adw_id>/                      # Per-workflow worktree
│       ├── .git/
│       ├── .ports.env
│       ├── app/
│       ├── adws/
│       └── .claude/
│
├── agents/                            # RUNTIME: Session state
│   └── <adw_id>/
│       ├── adw_state.json
│       └── <phase>/
│           ├── execution.log
│           ├── raw_output.jsonl
│           └── review_img/
│
├── specs/                             # RUNTIME: Generated plans
│   └── issue-<num>-adw-<id>-*.md
│
├── app/                               # APPLICATION: Codebase being built
│
├── .env                               # Environment configuration
├── .env.sample                        # Environment template
└── settings.json                      # Claude Code settings (root)
```

---

## Summary

TAC (The Agent Choreographer) represents a mature approach to **agentic workflow orchestration**. Key takeaways:

1. **Configuration is separate from execution**: `.claude/` defines behavior; `adws/` executes workflows
2. **Isolation enables parallelism**: Worktrees + deterministic ports allow 15 concurrent workflows
3. **State enables composition**: JSON state files let phases communicate without tight coupling
4. **Hooks enable control**: Lifecycle hooks provide validation, logging, and cleanup
5. **GitHub is the interface**: Issues trigger work; PRs deliver results

This architecture allows an AI agent to autonomously execute complete software development workflows while maintaining safety, auditability, and human oversight.

---

**Document Version**: 1.0
**Created**: 2026-01-16
**Source**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL1\TAC - Clean\TAC - Clean`
