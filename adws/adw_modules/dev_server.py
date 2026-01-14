"""
Dev Server Management for ADW Workflows

Simplified implementation that delegates all port management to npm scripts.
Port 8010 is hardcoded throughout - no dynamic detection, no psutil, no platform-specific code.

The npm script `bun run dev:test:restart` handles:
- Killing any process on port 8010
- Starting Vite with --strictPort on port 8010
"""

import subprocess
import time
import logging
import socket
import os
from pathlib import Path
from typing import Optional


def is_port_8010_responding() -> bool:
    """Check if port 8010 is responding to connections.

    Returns:
        True if something is listening on port 8010, False otherwise
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(2)
        try:
            s.connect(("localhost", 8010))
            return True
        except (ConnectionRefusedError, OSError, socket.timeout):
            return False


def restart_dev_server_on_port_8010(app_dir: Path, logger: logging.Logger) -> Optional[subprocess.Popen]:
    """Restart dev server on port 8010 using npm script.

    Calls `bun run dev:test:restart` which:
    1. Stops any existing server on port 8010
    2. Starts fresh Vite server on port 8010 with --strictPort

    Args:
        app_dir: Path to app/ directory (where package.json lives)
        logger: Logger instance

    Returns:
        Popen process if started, None if already running

    Raises:
        RuntimeError: If server fails to start within timeout
    """
    logger.info("=== DEV SERVER RESTART (Port 8010) ===")

    # Check if already running
    if is_port_8010_responding():
        logger.info("Dev server already running on port 8010")
        print("Dev server already running at http://localhost:8010")
        return None

    logger.info("Starting dev server via bun run dev:test:restart...")
    print("Starting dev server on port 8010...")

    # Use CREATE_NO_WINDOW on Windows to prevent console popup
    creation_flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0

    process = subprocess.Popen(
        ["bun", "run", "dev:test:restart"],
        cwd=app_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        creationflags=creation_flags
    )

    # Wait for server to be ready (max 30 seconds)
    max_wait = 30
    for i in range(max_wait):
        if is_port_8010_responding():
            logger.info(f"Dev server started successfully (took {i+1}s)")
            print(f"Dev server running at http://localhost:8010")
            return process
        time.sleep(1)

    # Server didn't start in time
    logger.error("Dev server failed to start within 30 seconds")
    process.terminate()
    raise RuntimeError("Dev server failed to start on port 8010 within 30 seconds")


def stop_dev_server(process: Optional[subprocess.Popen], logger: logging.Logger) -> None:
    """Stop the dev server process.

    Args:
        process: Popen instance (or None if we didn't start it)
        logger: Logger instance
    """
    if process is None:
        logger.info("Dev server was already running - leaving it running")
        return

    logger.info("Stopping dev server...")

    try:
        process.terminate()
        try:
            process.wait(timeout=5)
            logger.info("Dev server stopped gracefully")
        except subprocess.TimeoutExpired:
            logger.warning("Dev server didn't stop gracefully, forcing...")
            process.kill()
            process.wait()
            logger.info("Dev server force-stopped")
    except Exception as e:
        logger.error(f"Error stopping dev server: {e}")


class DevServerManager:
    """Simple dev server manager for orchestrators.
    
    Wraps restart_dev_server_on_port_8010() with a class interface
    for compatibility with existing orchestrator code.
    
    Port 8010 is always used - no dynamic port detection.
    """

    def __init__(self, app_dir: Path, logger: logging.Logger):
        """Initialize dev server manager.

        Args:
            app_dir: Path to app/ directory (where package.json lives)
            logger: Logger instance
        """
        self.app_dir = app_dir
        self.logger = logger
        self.process: Optional[subprocess.Popen] = None
        self.port: int = 8010  # Always 8010
        self.base_url: str = "http://localhost:8010"

    def start(self) -> tuple:
        """Start dev server on port 8010.

        Returns:
            Tuple of (port, base_url) - always (8010, "http://localhost:8010")

        Raises:
            RuntimeError: If server fails to start
        """
        if self.process is not None:
            self.logger.warning("Dev server process already managed by this instance")
            return self.port, self.base_url

        if is_port_8010_responding():
            self.logger.info("Dev server already running on port 8010. Using existing instance.")
            return self.port, self.base_url

        self.process = restart_dev_server_on_port_8010(self.app_dir, self.logger)
        return self.port, self.base_url

    def stop(self) -> None:
        """Stop the dev server."""
        stop_dev_server(self.process, self.logger)
        self.process = None

    def is_running(self) -> bool:
        """Check if dev server is running on port 8010.

        Returns:
            True if server is responding on port 8010
        """
        return is_port_8010_responding()

    def get_url(self, path: str = "") -> str:
        """Get full URL for given path.

        Args:
            path: Path to append (e.g., "/search", "/view-split-lease")

        Returns:
            Full URL (e.g., "http://localhost:8010/search")

        Raises:
            RuntimeError: If dev server not running
        """
        if not self.is_running():
            raise RuntimeError("Dev server not running on port 8010")

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
