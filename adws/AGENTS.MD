# ADW (AI Developer Workflow) System - LLM Reference

**GENERATED**: 2026-01-20
**SCOPE**: `adws/` directory - Complete ADW automation system
**OPTIMIZATION**: Semantic Searchability + Digestibility

---

## Quick Stats

| Metric | Value |
|--------|-------|
| **Total Modules** | 30+ Python files |
| **Primary Language** | Python (with uv script headers) |
| **CLI Providers** | Gemini CLI (primary), Claude Code CLI (fallback) |
| **Key Patterns** | Agent orchestration, Git worktrees, Visual regression, MCP browser control |

---

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │         Entry Point Scripts            │
                    │  (adw_unified_fp_orchestrator.py, etc.) │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │           adw_modules/                  │
                    │  Core libraries for agent orchestration │
                    └─────────────────┬───────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         │                            │                            │
    ┌────▼────┐                  ┌────▼────┐                  ┌────▼────┐
    │ agent.py │                  │ state.py │                  │git_ops.py│
    │ (LLM I/O)│                  │(Persist) │                  │(Git ops) │
    └─────────┘                  └──────────┘                  └──────────┘
```

---

## Critical Working Directory Rule

**Claude/Gemini agents are ALWAYS invoked from the PROJECT ROOT (`Split Lease/`), NOT from `adws/`.**

This is enforced in `adw_unified_fp_orchestrator.py:253-254`:
```python
script_dir = Path(__file__).parent.resolve()
working_dir = script_dir.parent  # Project root: Split Lease
```

All modules compute `project_root` by navigating **up from `adws/adw_modules/`**:
```python
project_root = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
```

**Implication**: Agent prompts can reference `app/`, `Documentation/`, `supabase/`, etc. directly.

---

## File Reference Index

### Entry Point Scripts (adws/)

| File | Purpose | Key Functions |
|------|---------|---------------|
| `adw_unified_fp_orchestrator.py` | Main orchestrator with deferred validation | `main()`, `implement_chunk_syntax_only()` |
| `adw_code_audit.py` | Codebase auditor with dependency analysis | `run_code_audit_and_plan()`, `run_dependency_analysis()` |
| `test_orchestrator.py` | Test runner for orchestrator | `test_code_audit()` |
| `check_ports.py` | Port availability checker | Utility script |

### Core Modules (adws/adw_modules/)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `agent.py` | Claude/Gemini CLI execution | `prompt_claude_code()`, `execute_template()`, `SLASH_COMMAND_MODEL_MAP` |
| `gemini_agent.py` | Gemini API with tool support | `prompt_gemini_agent()`, tools: `list_files`, `read_file`, `write_file`, etc. |
| `data_types.py` | Pydantic models | `AgentPromptRequest`, `AgentPromptResponse`, `RetryCode`, `ChunkData` |
| `config.py` | Centralized settings | `get_phase_model()`, `DEV_SERVER_STARTUP_TIMEOUT`, URLs |
| `state.py` | Persistent ADW state | `ADWState.load()`, `ADWState.save()` |
| `batch_state.py` | Batch processing state | `BatchState` for multi-chunk operations |

### Analysis & Parsing (adws/adw_modules/)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `ast_dependency_analyzer.py` | AST-based dependency analysis | `analyze_dependencies()`, `DependencyContext` |
| `graph_algorithms.py` | Graph analysis (cycles, reduction) | `analyze_graph()`, `build_simple_graph()`, `GraphAnalysisResult` |
| `topology_sort.py` | Topological ordering of chunks | `topology_sort_chunks_with_graph()`, `TopologySortResult` |
| `chunk_parser.py` | Parse plan files into chunks | `extract_page_groups()`, `parse_chunks()`, `ChunkData` |
| `chunk_validation.py` | Validate implemented chunks | Validation utilities |
| `high_impact_summary.py` | Condensed dependency summary | `HighImpactSummary.from_dependency_context()` |

### Validation & Testing (adws/adw_modules/)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `deferred_validation.py` | Batch validation after all chunks | `run_deferred_validation()`, `ValidationBatch`, `ValidationResult` |
| `visual_regression.py` | Visual parity checking via MCP | `check_visual_parity()`, `verify_environment_accessibility()` |
| `concurrent_parity.py` | Parallel LIVE vs DEV comparison | `create_parity_check_plan()`, `LIVE_BASE_URL`, `DEV_BASE_URL` |
| `test_driven_validation.py` | Test suite generation | `generate_test_suite_for_chunk()`, `run_tests_before_refactor()` |
| `test_suite.py` | Test execution utilities | Test helpers |
| `validation_parser.py` | Parse validation results | Parsing utilities |

### Git & Workflow Operations (adws/adw_modules/)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `git_ops.py` | Git command wrappers | Git utilities with `cwd` support |
| `scoped_git_ops.py` | Scoped file tracking for reset | `RefactorScope`, `create_refactor_scope()` |
| `worktree_ops.py` | Git worktree management | `create_worktree()`, `get_worktree_path()` |
| `workflow_ops.py` | Core workflow operations | Workflow orchestration |

### External Integrations (adws/adw_modules/)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `dev_server.py` | Dev server lifecycle management | `DevServerManager` |
| `mcp_config.py` | MCP session configuration | `get_session_config()`, `get_url_for_session()` |
| `page_classifier.py` | Page type classification | `ALL_PAGES`, `get_page_info()`, `get_mcp_sessions_for_page()` |
| `webhook.py` | Slack/webhook notifications | `notify_failure()`, `notify_in_progress()` |
| `slack_client.py` | Slack API client | `notify_parity_check_result()` |
| `notifications.py` | Notification utilities | Alert helpers |
| `r2_uploader.py` | Cloudflare R2 uploads | Screenshot/asset upload |
| `github.py` | GitHub API operations | GitHub utilities |
| `run_logger.py` | Timestamped run logging | `create_run_logger()`, `RunLogger` |
| `utils.py` | Shared utilities | `get_safe_subprocess_env()` |
| `skill_mapper.py` | Skill mapping utilities | Skill helpers |

### Triggers (adws/adw_triggers/)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `trigger_cron.py` | Polling monitor for GitHub | Polls every 20 seconds |
| `trigger_webhook.py` | Webhook server for GitHub events | Port 8001, `/gh-webhook` endpoint |

### Tests (adws/adw_tests/)

| File | Purpose |
|------|---------|
| `health_check.py` | System health verification |
| `test_agents.py` | Agent execution tests |
| `test_model_selection.py` | Model mapping tests |
| `test_r2_uploader.py` | R2 upload tests |
| `test_webhook_simplified.py` | Webhook tests |
| `sandbox_poc.py` | Sandbox proof-of-concept |

### Prompts (adws/prompts/)

| File | Purpose |
|------|---------|
| `code_audit_opus.txt` | Opus code audit prompt template |
| `parity_check_protected.txt` | Protected page visual check prompt |
| `parity_check_public.txt` | Public page visual check prompt |
| `visual_check_gemini.txt` | Gemini visual regression prompt |

### Plans (adws/adw_plans/, adws/.claude/plans/)

Active and completed refactoring plans stored as markdown files with timestamps.

---

## Provider Configuration

### Default Provider: Gemini

The system defaults to Gemini CLI (`STRICT_GEMINI=true`), configured in `agent.py:39-44`:

```python
ADW_PROVIDER = os.getenv("ADW_PROVIDER", "gemini").lower()
STRICT_GEMINI = os.getenv("STRICT_GEMINI", "true").lower() == "true"
if STRICT_GEMINI:
    ADW_PROVIDER = "gemini"
```

### Model Mapping

```python
GEMINI_BASE_MODEL = "gemini-3-flash-preview"   # Maps from "sonnet"
GEMINI_HEAVY_MODEL = "gemini-3-flash-preview"  # Maps from "opus"
```

### Automatic Claude Fallback

If Gemini fails (429, quota, execution error), the system automatically retries with Claude Sonnet:

```python
# agent.py:_attempt_claude_fallback()
fallback_response = _attempt_claude_fallback(request, error_msg, original_provider, original_strict)
```

---

## Orchestrator Workflow (adw_unified_fp_orchestrator.py)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORCHESTRATOR PHASES                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: CODE AUDIT                                                        │
│  ├─ Claude Opus analyzes target directory                                   │
│  ├─ Generates chunk-based refactoring plan                                  │
│  └─ Output: adws/adw_plans/{timestamp}_code_refactor_plan.md                │
│                                                                             │
│  PHASE 1.5: GRAPH ANALYSIS                                                  │
│  ├─ AST-based dependency analysis                                           │
│  ├─ Transitive reduction (removes redundant edges)                          │
│  ├─ Cycle detection (for atomic refactoring)                                │
│  └─ Topological levels (correct refactoring order)                          │
│                                                                             │
│  PHASE 2: PARSE PLAN & TOPOLOGY SORT                                        │
│  ├─ Extract page groups from plan                                           │
│  └─ Sort chunks by dependency levels (leaf-first)                           │
│                                                                             │
│  PHASE 3: DEV SERVER SETUP                                                  │
│  └─ Start dev server for validation                                         │
│                                                                             │
│  PHASE 4: IMPLEMENT ALL CHUNKS                                              │
│  ├─ Syntax-only validation (no build per chunk)                             │
│  ├─ Scoped file tracking for rollback                                       │
│  └─ Deferred full validation                                                │
│                                                                             │
│  PHASE 5: DEFERRED VALIDATION                                               │
│  ├─ Single build check                                                      │
│  ├─ Optional visual regression                                              │
│  ├─ On SUCCESS: git commit all changes                                      │
│  └─ On FAILURE: scoped reset (only refactored files)                        │
│                                                                             │
│  PHASE 6: SUMMARY                                                           │
│  └─ Report results with metrics                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Usage Examples

### Run Code Audit
```bash
cd adws
uv run adw_code_audit.py app/src/logic --audit-type general
```

### Run Full Orchestrator
```bash
cd adws
uv run adw_unified_fp_orchestrator.py app/src/logic --limit 5
```

### Skip Visual Regression
```bash
uv run adw_unified_fp_orchestrator.py app/src/logic --skip-visual
```

---

## Key Data Structures

### AgentPromptRequest (data_types.py:149-159)
```python
class AgentPromptRequest(BaseModel):
    prompt: str
    adw_id: str
    agent_name: str = "ops"
    model: Literal["sonnet", "opus"] = "sonnet"
    dangerously_skip_permissions: bool = False
    output_file: str
    working_dir: Optional[str] = None
    mcp_session: Optional[str] = None  # MCP server for Playwright
```

### ChunkData (chunk_parser.py:13-23)
```python
@dataclass
class ChunkData:
    number: int
    title: str
    file_path: str
    line_number: str
    current_code: str
    refactored_code: str
    affected_pages: str
```

### RetryCode (data_types.py:10-17)
```python
class RetryCode(str, Enum):
    CLAUDE_CODE_ERROR = "claude_code_error"
    TIMEOUT_ERROR = "timeout_error"
    EXECUTION_ERROR = "execution_error"
    ERROR_DURING_EXECUTION = "error_during_execution"
    NONE = "none"
```

---

## MCP Browser Sessions

Visual regression uses dual Playwright MCP sessions:

| Session | Domain | Purpose |
|---------|--------|---------|
| `playwright-host-live` | split.lease | LIVE host pages |
| `playwright-host-dev` | localhost:8010 | DEV host pages |
| `playwright-guest-live` | split.lease | LIVE guest pages |
| `playwright-guest-dev` | localhost:8010 | DEV guest pages |

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ADW_PROVIDER` | `gemini` | LLM provider (gemini/claude) |
| `STRICT_GEMINI` | `true` | Force Gemini regardless of ADW_PROVIDER |
| `GEMINI_BASE_MODEL` | `gemini-3-flash-preview` | Model for "sonnet" mapping |
| `GEMINI_HEAVY_MODEL` | `gemini-3-flash-preview` | Model for "opus" mapping |
| `CLAUDE_CODE_PATH` | `claude` | Path to Claude CLI |
| `GEMINI_CODE_PATH` | `gemini` | Path to Gemini CLI |
| `GEMINIAPIKEY` | - | Gemini API key |
| `DISABLE_GEMINI_FALLBACK` | `false` | Disable Claude fallback |

---

## Output Directories

| Directory | Purpose |
|-----------|---------|
| `adws/agents/` | Agent output files (JSONL, JSON) |
| `adws/adw_plans/` | Generated refactoring plans |
| `adws/adw_run_logs/` | Timestamped run logs |
| `adws/ast_cache/` | Cached AST analysis results |
| `adws/.claude/plans/` | Claude-specific plans |

---

## Slash Command Model Mapping (agent.py:48-68)

```python
SLASH_COMMAND_MODEL_MAP = {
    "/classify_issue": {"base": "sonnet", "heavy": "sonnet"},
    "/implement": {"base": "sonnet", "heavy": "opus"},
    "/resolve_failed_test": {"base": "sonnet", "heavy": "opus"},
    "/document": {"base": "sonnet", "heavy": "opus"},
    "/chore": {"base": "sonnet", "heavy": "opus"},
    "/bug": {"base": "sonnet", "heavy": "opus"},
    "/feature": {"base": "sonnet", "heavy": "opus"},
    # ... and more
}
```

---

## Phase Model Configuration (config.py:98-105)

```python
_PHASE_MODEL_DEFAULTS = {
    "audit": "opus",           # Code analysis
    "implementation": "opus",  # Code writing
    "review": "opus",          # Code review
    "validation": "opus",      # Visual/test validation
    "classification": "opus",  # Task classification
    "documentation": "opus",   # Documentation
}
```

Override via environment: `ADW_AUDIT_MODEL=sonnet`, etc.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-01-20 | Complete rewrite with comprehensive file index |
| 1.0 | 2026-01-13 | Initial with DevServerManager architecture |
