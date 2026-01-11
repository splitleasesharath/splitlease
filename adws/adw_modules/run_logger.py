"""
ADW Run Logger - Timestamped logging for orchestrator runs.

Provides a simple logging interface that writes to both stdout and timestamped log files.
"""

import sys
from datetime import datetime
from pathlib import Path
from typing import Optional


class RunLogger:
    """Logger that writes to both stdout and a timestamped log file."""

    def __init__(self, log_dir: Path, run_type: str, timestamp: Optional[str] = None):
        """Initialize the run logger.

        Args:
            log_dir: Directory to store log files
            run_type: Type of run (e.g., "fp_audit", "fp_orchestrator")
            timestamp: Optional timestamp string (YYYYMMDDHHMMSS), generated if not provided
        """
        self.log_dir = Path(log_dir)
        self.run_type = run_type
        self.timestamp = timestamp or datetime.now().strftime('%Y%m%d%H%M%S')

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
            f.write(f"Timestamp: {self.timestamp}\n")
            f.write(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"{'='*60}\n\n")

    def log(self, message: str, to_stdout: bool = True):
        """Log a message to both file and stdout.

        Args:
            message: Message to log
            to_stdout: Whether to also print to stdout (default: True)
        """
        # Add timestamp prefix
        timestamp = datetime.now().strftime('%H:%M:%S')
        prefixed_message = f"[{timestamp}] {message}"

        # Write to log file
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(prefixed_message + '\n')

        # Write to stdout if requested
        if to_stdout:
            print(message)

    def log_separator(self, char: str = '=', length: int = 60, to_stdout: bool = True):
        """Log a separator line.

        Args:
            char: Character to use for separator
            length: Length of separator line
            to_stdout: Whether to also print to stdout (default: True)
        """
        self.log(char * length, to_stdout=to_stdout)

    def log_section(self, title: str, char: str = '=', length: int = 60, to_stdout: bool = True):
        """Log a section header.

        Args:
            title: Section title
            char: Character to use for separator
            length: Length of separator line
            to_stdout: Whether to also print to stdout (default: True)
        """
        self.log_separator(char, length, to_stdout=to_stdout)
        self.log(title, to_stdout=to_stdout)
        self.log_separator(char, length, to_stdout=to_stdout)

    def log_error(self, error: Exception, context: Optional[str] = None):
        """Log an error with context.

        Args:
            error: Exception that occurred
            context: Optional context describing where the error occurred
        """
        self.log_section("ERROR", char='-')
        if context:
            self.log(f"Context: {context}")
        self.log(f"Error Type: {type(error).__name__}")
        self.log(f"Error Message: {str(error)}")

        # Log traceback
        import traceback
        tb = ''.join(traceback.format_exception(type(error), error, error.__traceback__))
        self.log("\nTraceback:")
        self.log(tb)
        self.log_separator('-')

    def log_summary(self, **kwargs):
        """Log a summary section with key-value pairs.

        Args:
            **kwargs: Key-value pairs to log
        """
        self.log_section("SUMMARY")
        for key, value in kwargs.items():
            # Format key as title case with spaces
            formatted_key = key.replace('_', ' ').title()
            self.log(f"{formatted_key}: {value}")
        self.log_separator()

    def finalize(self):
        """Write footer and close log file."""
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(f"\n{'='*60}\n")
            f.write(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Log File: {self.log_file}\n")
            f.write(f"{'='*60}\n")

        self.log(f"\nLog saved to: {self.log_file.relative_to(Path.cwd())}")


def create_run_logger(run_type: str, timestamp: Optional[str] = None) -> RunLogger:
    """Create a run logger for the current working directory.

    Args:
        run_type: Type of run (e.g., "fp_audit", "fp_orchestrator")
        timestamp: Optional timestamp string (YYYYMMDDHHMMSS)

    Returns:
        Configured RunLogger instance
    """
    log_dir = Path.cwd() / "adws" / "adw_run_logs"
    return RunLogger(log_dir, run_type, timestamp)
