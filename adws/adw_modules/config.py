"""
ADW Configuration - Centralized settings for all ADW scripts

This module provides shared configuration constants to ensure consistency
across orchestrator, browser, and validation scripts.
"""

# ============================================================================
# DEV SERVER CONFIGURATION
# ============================================================================

# Dev server will be started dynamically and port will be detected
# Default port to try first (Vite's default)
DEV_SERVER_DEFAULT_PORT = 8000

# Timeout for dev server startup (seconds)
DEV_SERVER_STARTUP_TIMEOUT = 30

# Command to start dev server
DEV_SERVER_COMMAND = ["bun", "run", "dev", "--", "--port", "8000", "--strictPort"]

# Pattern to detect dev server ready state in output
# Vite outputs with ANSI codes: "[32m➜[39m  [1mLocal[22m:   [36mhttp://localhost:[1m5173[22m/[39m"
# This pattern strips ANSI codes and Unicode chars to match "localhost:PORT"
DEV_SERVER_READY_PATTERN = r"http://localhost:(\d+)"

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

# Localhost base URL template (port will be injected)
LOCALHOST_BASE_URL_TEMPLATE = "http://localhost:{port}"

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
