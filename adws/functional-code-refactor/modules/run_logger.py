"""
ADW Run Logger - Unified logging with Slack notifications.

Provides timestamped logging to file + single-line Slack notifications for each event.
"""

import sys
from datetime import datetime
from pathlib import Path
from typing import Optional
from .webhook import notify_started, notify_success, notify_failure, notify_in_progress


class RunLogger:
    """Logger that writes timestamped events to file and sends Slack notifications."""

    def __init__(self, log_dir: Path, run_type: str, timestamp: Optional[str] = None):
        """Initialize the run logger.

        Args:
            log_dir: Directory to store log files
            run_type: Type of run (e.g., "unified_fp_refactor")
            timestamp: Optional timestamp string (YYYYMMDDHHMMSS), generated if not provided
        """
        self.log_dir = Path(log_dir)
        self.run_type = run_type
        self.timestamp = timestamp or datetime.now().strftime('%Y%m%d%H%M%S')
        self.session_id = f"{run_type}_{self.timestamp}"

        # Create log directory if it doesn't exist
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Create log file
        self.log_file = self.log_dir / f"{self.timestamp}_{run_type}_run.log"

        # Write header
        self._write_header()

    def _write_header(self):
        """Write log file header."""
        with open(self.log_file, 'w', encoding='utf-8') as f:
            f.write(f"{'='*60}\n")
            f.write(f"ADW RUN LOG: {self.run_type}\n")
            f.write(f"{'='*60}\n")
            f.write(f"Session ID: {self.session_id}\n")
            f.write(f"Timestamp: {self.timestamp}\n")
            f.write(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"{'='*60}\n\n")

    def _get_timestamp(self) -> str:
        """Get current timestamp for log entries."""
        return datetime.now().strftime('%H:%M:%S')

    def log(self, message: str, to_stdout: bool = True):
        """Log a message to file and optionally stdout.

        Args:
            message: Message to log
            to_stdout: Whether to also print to stdout (default: True)
        """
        timestamped = f"[{self._get_timestamp()}] {message}"

        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(timestamped + '\n')

        if to_stdout:
            # Handle encoding errors gracefully (Windows cp1252 can't encode some Unicode chars)
            try:
                print(message)
            except UnicodeEncodeError:
                # Replace problematic characters with ASCII alternatives
                safe_message = message.encode('ascii', errors='replace').decode('ascii')
                print(safe_message)

    def event(self, event_type: str, description: str, notify: bool = True):
        """Log an event with timestamp and optionally send Slack notification.

        Args:
            event_type: Type of event (PHASE, STEP, INFO, WARN, ERROR)
            description: Event description
            notify: Whether to send Slack notification (default: True)
        """
        # Log to file with full timestamp
        self.log(f"[{event_type}] {description}")

        # Send simple Slack notification
        if notify:
            slack_msg = f"{self.run_type}: {description}"
            if event_type == "ERROR":
                notify_failure(step=slack_msg, error="See log for details")
            elif event_type == "PHASE":
                notify_in_progress(step=slack_msg)

    def phase_start(self, phase_name: str, notify: bool = True):
        """Log start of a phase.

        Args:
            phase_name: Name of the phase
            notify: Send Slack notification
        """
        self.log(f"\n{'='*60}")
        self.log(phase_name)
        self.log('='*60)

        if notify:
            notify_in_progress(step=f"{self.run_type}: {phase_name}")

    def phase_complete(self, phase_name: str, success: bool = True, error: Optional[str] = None, notify: bool = True):
        """Log completion of a phase.

        Args:
            phase_name: Name of the phase
            success: Whether phase completed successfully
            error: Error message if failed
            notify: Send Slack notification
        """
        status = "OK" if success else "FAIL"
        self.log(f"[{status}] {phase_name}")

        if notify:
            if success:
                notify_success(step=f"{self.run_type}: {phase_name}")
            else:
                notify_failure(step=f"{self.run_type}: {phase_name}", error=error or "Unknown error")

    def step(self, description: str, notify: bool = False):
        """Log a step within a phase.

        Args:
            description: Step description
            notify: Send Slack notification (default: False for steps)
        """
        self.log(f"  → {description}")

        if notify:
            notify_in_progress(step=f"{self.run_type}: {description}")

    def error(self, error: Exception, context: Optional[str] = None, notify: bool = True):
        """Log an error with context.

        Args:
            error: Exception that occurred
            context: Optional context describing where the error occurred
            notify: Send Slack notification
        """
        self.log(f"\n{'-'*60}")
        self.log(f"[ERROR] {context or 'Error occurred'}")
        self.log(f"Type: {type(error).__name__}")
        self.log(f"Message: {str(error)}")

        import traceback
        tb = ''.join(traceback.format_exception(type(error), error, error.__traceback__))
        self.log(f"\nTraceback:\n{tb}")
        self.log('-'*60)

        if notify:
            error_brief = str(error)[:80]
            notify_failure(
                step=f"{self.run_type}: {context or 'Error'}",
                error=error_brief
            )

    def summary(self, **kwargs):
        """Log a summary section with key-value pairs.

        Args:
            **kwargs: Key-value pairs to log
        """
        self.log(f"\n{'='*60}")
        self.log("SUMMARY")
        self.log('='*60)
        for key, value in kwargs.items():
            formatted_key = key.replace('_', ' ').title()
            self.log(f"  {formatted_key}: {value}")
        self.log('='*60)

    def finalize(self, success: bool = True, notify: bool = True):
        """Write footer and optionally notify completion.

        Args:
            success: Whether the run completed successfully
            notify: Send final Slack notification
        """
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n{'='*60}\n")
            f.write(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Status: {'SUCCESS' if success else 'FAILED'}\n")
            f.write(f"Log File: {self.log_file}\n")
            f.write(f"{'='*60}\n")

        self.log(f"\nLog saved to: {self.log_file}")

        if notify:
            if success:
                notify_success(step=f"{self.run_type}: Run complete")
            else:
                notify_failure(step=f"{self.run_type}: Run failed", error="See log")


def create_run_logger(run_type: str, timestamp: Optional[str] = None, working_dir: Optional[Path] = None) -> RunLogger:
    """Create a run logger.

    Args:
        run_type: Type of run (e.g., "unified_fp_refactor")
        timestamp: Optional timestamp string (YYYYMMDDHHMMSS)
        working_dir: Optional working directory (defaults to cwd if not provided)

    Returns:
        Configured RunLogger instance
    """
    base_dir = Path(working_dir) if working_dir else Path.cwd()
    log_dir = base_dir / "adws" / "adw_run_logs"
    return RunLogger(log_dir, run_type, timestamp)
