"""Constants and utility functions for hook logging."""

from pathlib import Path
import os

def ensure_session_log_dir(session_id):
    """Ensure the session log directory exists and return its path."""
    # Get the hooks directory
    hooks_dir = Path(__file__).parent.parent

    # Create logs directory under hooks
    logs_dir = hooks_dir / 'logs'
    logs_dir.mkdir(exist_ok=True)

    # Create session-specific directory
    session_dir = logs_dir / session_id
    session_dir.mkdir(exist_ok=True)

    return session_dir
