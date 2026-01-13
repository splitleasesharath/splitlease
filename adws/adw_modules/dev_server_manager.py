"""
Dev Server Manager - Dynamic port detection and lifecycle management

Handles starting, monitoring, and stopping the Vite dev server with
automatic port detection from output.
"""

import subprocess
import re
import time
import logging
from pathlib import Path
from typing import Optional, Tuple

from .config import (
    DEV_SERVER_COMMAND,
    DEV_SERVER_STARTUP_TIMEOUT,
    DEV_SERVER_READY_PATTERN,
    DEV_SERVER_DEFAULT_PORT
)


class DevServerManager:
    """Manages dev server lifecycle with dynamic port detection."""

    def __init__(self, working_dir: Path, logger: logging.Logger):
        """Initialize dev server manager.

        Args:
            working_dir: Project root directory
            logger: Logger instance
        """
        self.working_dir = working_dir
        self.logger = logger
        self.process: Optional[subprocess.Popen] = None
        self.port: Optional[int] = None
        self.base_url: Optional[str] = None

    def start(self) -> Tuple[int, str]:
        """Start dev server and detect port from output.

        Returns:
            Tuple of (port, base_url)

        Raises:
            RuntimeError: If server fails to start or port not detected
        """
        if self.process is not None:
            self.logger.warning("Dev server already running, stopping first")
            self.stop()

        self.logger.info(f"Starting dev server: {' '.join(DEV_SERVER_COMMAND)}")
        self.logger.info(f"Working directory: {self.working_dir}")

        try:
            # Start dev server with output capture
            self.process = subprocess.Popen(
                DEV_SERVER_COMMAND,
                cwd=self.working_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,  # Merge stderr into stdout
                text=True,
                encoding='utf-8',
                bufsize=1,  # Line buffered
                universal_newlines=True
            )

            # Monitor output for ready state and port
            start_time = time.time()
            port_detected = False
            output_buffer = []

            self.logger.debug("Monitoring dev server output for ready state...")

            while time.time() - start_time < DEV_SERVER_STARTUP_TIMEOUT:
                # Check if process died
                if self.process.poll() is not None:
                    # Process exited
                    remaining_output = self.process.stdout.read()
                    full_output = ''.join(output_buffer) + remaining_output
                    raise RuntimeError(
                        f"Dev server process exited with code {self.process.returncode}\n"
                        f"Output:\n{full_output}"
                    )

                # Read line from output
                line = self.process.stdout.readline()
                if not line:
                    time.sleep(0.1)
                    continue

                output_buffer.append(line)
                self.logger.debug(f"Dev server: {line.strip()}")

                # Check for port in output
                # Vite outputs: "  ➜  Local:   http://localhost:5173/"
                match = re.search(DEV_SERVER_READY_PATTERN, line)
                if match:
                    self.port = int(match.group(1))
                    self.base_url = f"http://localhost:{self.port}"
                    port_detected = True
                    self.logger.info(f"✅ Dev server ready at {self.base_url}")
                    break

            if not port_detected:
                # Timeout - dump output and fail
                full_output = ''.join(output_buffer)
                self.stop()  # Clean up
                raise RuntimeError(
                    f"Dev server did not become ready within {DEV_SERVER_STARTUP_TIMEOUT}s\n"
                    f"Output:\n{full_output}"
                )

            # Give server a moment to fully initialize
            time.sleep(1)

            return self.port, self.base_url

        except Exception as e:
            self.logger.error(f"Failed to start dev server: {e}")
            if self.process:
                self.stop()
            raise

    def stop(self) -> None:
        """Stop dev server gracefully."""
        if self.process is None:
            self.logger.debug("No dev server process to stop")
            return

        self.logger.info("Stopping dev server...")

        try:
            # Try graceful termination first
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
                self.logger.info("Dev server stopped gracefully")
            except subprocess.TimeoutExpired:
                # Force kill if terminate didn't work
                self.logger.warning("Dev server didn't stop gracefully, forcing kill")
                self.process.kill()
                self.process.wait(timeout=2)
                self.logger.info("Dev server killed")

        except Exception as e:
            self.logger.error(f"Error stopping dev server: {e}")

        finally:
            self.process = None
            self.port = None
            self.base_url = None

    def is_running(self) -> bool:
        """Check if dev server is running.

        Returns:
            True if running, False otherwise
        """
        if self.process is None:
            return False

        # Check if process is still alive
        return self.process.poll() is None

    def get_url(self, path: str = "") -> str:
        """Get full URL for given path.

        Args:
            path: Path to append (e.g., "/search", "/view-split-lease")
                 Should start with / if provided

        Returns:
            Full URL (e.g., "http://localhost:5173/search")

        Raises:
            RuntimeError: If dev server not running
        """
        if not self.is_running() or self.base_url is None:
            raise RuntimeError("Dev server not running")

        # Ensure path starts with / if provided
        if path and not path.startswith('/'):
            path = f"/{path}"

        return f"{self.base_url}{path}"

    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()
