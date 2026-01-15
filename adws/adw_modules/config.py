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
