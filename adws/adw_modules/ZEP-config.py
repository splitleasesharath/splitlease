"""
ADW Configuration - Centralized settings for all ADW scripts

This module provides shared configuration constants to ensure consistency
across orchestrator, browser, and validation scripts.
"""

# ============================================================================
# DEV SERVER CONFIGURATION
# ============================================================================
# Port 8010 is hardcoded for ADW testing workflows.
# Dev server management uses npm scripts from app/package.json:
#   - bun run dev:test           (start on port 8010 with --strictPort)
#   - bun run dev:test:stop      (kill port 8010)
#   - bun run dev:test:restart   (stop + start)
#
# See: adws/adw_modules/dev_server.py for implementation

# Timeout for dev server startup (seconds) - used by restart_dev_server_on_port_8010()
DEV_SERVER_STARTUP_TIMEOUT = 30

# ============================================================================
# BROWSER VALIDATION CONFIGURATION
# ============================================================================

# Timeout for Claude browser interaction (seconds)
# This is the time Claude has to analyze pages and respond
BROWSER_CLAUDE_TIMEOUT = 600  # 10 minutes

# Total timeout for validation including retries (seconds)
VALIDATION_TOTAL_TIMEOUT = 660  # 11 minutes

# Maximum retry attempts for validation errors (not failures)
VALIDATION_MAX_RETRIES = 3

# Minimum confidence score for PASS verdict (0-100)
VALIDATION_MIN_CONFIDENCE = 80

# Exponential backoff base for retries (seconds)
VALIDATION_RETRY_BACKOFF_BASE = 2  # Results in 2s, 4s, 8s delays

# ============================================================================
# URL CONFIGURATION
# ============================================================================

# Production base URL for comparison
PRODUCTION_BASE_URL = "https://www.split.lease"

# Localhost base URL (port 8010 hardcoded for ADW testing)
LOCALHOST_BASE_URL = "http://localhost:8010"

# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

# Directory for run logs (relative to working_dir)
RUN_LOGS_DIR = "adws/adw_run_logs"

# Directory for agent outputs (relative to working_dir)
AGENT_OUTPUT_DIR = "agents"

# ============================================================================
# SCREENSHOT CONFIGURATION
# ============================================================================

# Enable screenshot capture during validation
ENABLE_SCREENSHOTS = True

# Screenshot directory name (relative to agent output dir)
SCREENSHOT_SUBDIR = "validation_screenshots"

# Screenshot format
SCREENSHOT_FORMAT = "png"

# ============================================================================
# MODEL CONFIGURATION (PHASE-SPECIFIC)
# ============================================================================
# Each phase of the ADW pipeline can use a different model.
# Environment variables override these defaults.
#
# Model IDs:
#   - "opus" -> claude-opus-4-5-20251101 (Claude Opus 4.5)
#   - "sonnet" -> claude-sonnet-4-20250514 (Claude Sonnet 4)
#   - "haiku" -> claude-haiku (fast, cheap)
#
# For Gemini (when ADW_PROVIDER=gemini):
#   - Maps "opus" -> GEMINI_HEAVY_MODEL env var
#   - Maps "sonnet" -> GEMINI_BASE_MODEL env var

import os
from typing import Literal, Dict, Any

# Type alias for model names
ModelName = Literal["opus", "sonnet", "haiku"]

# Phase-specific model configuration
# These are the DEFAULT models for each phase - can be overridden via environment
_PHASE_MODEL_DEFAULTS: Dict[str, ModelName] = {
    "audit": "opus",           # Code analysis and planning - needs reasoning
    "implementation": "opus",  # Code writing - needs precision
    "review": "opus",          # Code review - needs thoroughness
    "validation": "opus",      # Visual/test validation - needs accuracy
    "classification": "opus",  # Task classification
    "documentation": "opus",   # Documentation generation
}


def get_phase_model(phase: str) -> ModelName:
    """Get the model to use for a specific ADW phase.

    Checks environment variable first, then falls back to default.

    Environment variables (case-insensitive):
        ADW_AUDIT_MODEL=opus
        ADW_IMPLEMENTATION_MODEL=sonnet
        ADW_REVIEW_MODEL=opus
        ADW_VALIDATION_MODEL=sonnet
        ADW_CLASSIFICATION_MODEL=sonnet
        ADW_DOCUMENTATION_MODEL=opus

    Args:
        phase: One of "audit", "implementation", "review", "validation",
               "classification", "documentation"

    Returns:
        Model name ("opus", "sonnet", or "haiku")

    Example:
        >>> get_phase_model("audit")
        "opus"
        >>> os.environ["ADW_AUDIT_MODEL"] = "sonnet"
        >>> get_phase_model("audit")
        "sonnet"
    """
    # Check environment variable override
    env_key = f"ADW_{phase.upper()}_MODEL"
    env_value = os.getenv(env_key, "").lower()

    if env_value in ("opus", "sonnet", "haiku"):
        return env_value  # type: ignore

    # Fall back to configured default
    return _PHASE_MODEL_DEFAULTS.get(phase, "opus")


def set_phase_model_default(phase: str, model: ModelName) -> None:
    """Set the default model for a phase (runtime configuration).

    This changes the in-memory default. To persist, use environment variables.

    Args:
        phase: One of "audit", "implementation", "review", "validation"
        model: Model name ("opus", "sonnet", or "haiku")
    """
    _PHASE_MODEL_DEFAULTS[phase] = model


def get_all_phase_models() -> Dict[str, ModelName]:
    """Get the effective model for all phases (including env overrides).

    Returns:
        Dictionary of phase -> effective model
    """
    return {
        phase: get_phase_model(phase)
        for phase in _PHASE_MODEL_DEFAULTS.keys()
    }


def print_model_config() -> None:
    """Print current model configuration for debugging."""
    print("\n=== ADW Model Configuration ===")
    for phase, model in get_all_phase_models().items():
        env_key = f"ADW_{phase.upper()}_MODEL"
        env_value = os.getenv(env_key, "")
        source = f"(env: {env_key})" if env_value else "(default)"
        print(f"  {phase:20s}: {model:8s} {source}")
    print("================================\n")
