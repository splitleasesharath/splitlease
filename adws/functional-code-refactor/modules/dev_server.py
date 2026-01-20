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
import json
import threading
from pathlib import Path
from typing import Optional, List
from datetime import datetime


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


# Global buffer to capture process output for diagnostics
_process_output_buffer: List[str] = []
_output_lock = threading.Lock()


def _capture_process_output(process: subprocess.Popen, logger: logging.Logger) -> None:
    """Background thread to capture process stdout/stderr without blocking.

    Stores output in global buffer for diagnostic purposes.
    """
    global _process_output_buffer
    try:
        for line in iter(process.stdout.readline, ''):
            if not line:
                break
            line = line.rstrip()
            with _output_lock:
                _process_output_buffer.append(line)
                # Keep only last 100 lines to prevent memory bloat
                if len(_process_output_buffer) > 100:
                    _process_output_buffer = _process_output_buffer[-100:]
            logger.debug(f"[vite] {line}")
    except Exception as e:
        logger.debug(f"Output capture ended: {e}")


def _get_captured_output() -> List[str]:
    """Get captured process output (thread-safe)."""
    with _output_lock:
        return _process_output_buffer.copy()


def _clear_captured_output() -> None:
    """Clear captured output buffer (thread-safe)."""
    global _process_output_buffer
    with _output_lock:
        _process_output_buffer = []


def _write_diagnostic_log(app_dir: Path, event: str, details: dict) -> None:
    """Write diagnostic entry to dev_server_diagnostics.log in adws directory."""
    try:
        log_path = Path(__file__).parent.parent / "dev_server_diagnostics.log"
        entry = {
            "timestamp": datetime.now().isoformat(),
            "event": event,
            "app_dir": str(app_dir),
            **details
        }
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception:
        pass  # Never fail due to diagnostic logging


def is_dev_server_http_ready(timeout: int = 2) -> bool:
    """Check if dev server is ready to serve HTTP requests.

    More reliable than socket check - actually makes an HTTP request
    to verify Vite is fully initialized.

    Args:
        timeout: Request timeout in seconds

    Returns:
        True if HTTP request succeeds, False otherwise
    """
    import requests

    try:
        # Request the root path - Vite should respond even without content
        resp = requests.get("http://localhost:8010/", timeout=timeout)
        # Any 2xx or 3xx response means server is ready
        return resp.status_code < 400
    except requests.exceptions.ConnectionError:
        return False
    except requests.exceptions.Timeout:
        return False
    except Exception:
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

    # Clear previous output buffer
    _clear_captured_output()

    # Use CREATE_NO_WINDOW on Windows to prevent console popup
    creation_flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0

    # Log diagnostic info before starting
    _write_diagnostic_log(app_dir, "startup_attempt", {
        "cwd_exists": app_dir.exists(),
        "cwd_is_dir": app_dir.is_dir() if app_dir.exists() else False
    })

    process = subprocess.Popen(
        ["bun", "run", "dev:test:restart"],
        cwd=app_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        creationflags=creation_flags
    )

    # Start background thread to capture output
    output_thread = threading.Thread(
        target=_capture_process_output,
        args=(process, logger),
        daemon=True
    )
    output_thread.start()

    # Wait for server to be HTTP-ready (max 60 seconds)
    # First wait for port, then wait for HTTP response
    max_wait = 60
    port_ready_at = None

    for i in range(max_wait):
        # Check if process died prematurely
        poll_result = process.poll()
        if poll_result is not None:
            captured = _get_captured_output()
            error_details = {
                "exit_code": poll_result,
                "elapsed_seconds": i,
                "captured_output": captured[-20:] if captured else [],
                "output_line_count": len(captured)
            }
            logger.error(f"Dev server process died with exit code {poll_result}")
            logger.error(f"Last output: {captured[-5:] if captured else 'none'}")
            _write_diagnostic_log(app_dir, "process_died", error_details)
            raise RuntimeError(
                f"Dev server process died (exit code {poll_result}). "
                f"Last output: {captured[-3:] if captured else 'none'}"
            )

        if port_ready_at is None and is_port_8010_responding():
            port_ready_at = i
            logger.info(f"Port 8010 responding after {i+1}s, waiting for HTTP ready...")
            _write_diagnostic_log(app_dir, "port_responding", {"elapsed_seconds": i + 1})

        if port_ready_at is not None and is_dev_server_http_ready():
            logger.info(f"Dev server HTTP-ready (took {i+1}s total, {i - port_ready_at}s after port)")
            print(f"Dev server running at http://localhost:8010")
            _write_diagnostic_log(app_dir, "startup_success", {
                "total_seconds": i + 1,
                "port_ready_at": port_ready_at
            })
            return process

        time.sleep(1)

    # Server didn't start in time - capture diagnostics
    captured = _get_captured_output()
    error_details = {
        "elapsed_seconds": max_wait,
        "port_ready_at": port_ready_at,
        "captured_output": captured[-20:] if captured else [],
        "output_line_count": len(captured),
        "process_running": process.poll() is None
    }
    logger.error("Dev server failed to start within 60 seconds")
    logger.error(f"Captured output ({len(captured)} lines): {captured[-10:] if captured else 'none'}")
    _write_diagnostic_log(app_dir, "startup_timeout", error_details)

    process.terminate()
    raise RuntimeError(
        f"Dev server failed to start on port 8010 within 60 seconds. "
        f"Port responded: {port_ready_at is not None}. "
        f"Last output: {captured[-3:] if captured else 'none'}"
    )


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
