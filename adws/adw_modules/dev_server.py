"""
Dev Server Management for ADW Workflows

Provides utilities to:
- Check if dev server is running on localhost:8000
- Kill any process blocking the port
- Start dev server in background if not running
- Keep dev server running throughout orchestration
"""

import subprocess
import time
import logging
import socket
import os
import psutil
from pathlib import Path
from typing import Optional


def is_port_in_use(port: int, host: str = "localhost") -> bool:
    """Check if a port is already in use.

    Args:
        port: Port number to check
        host: Host to check (default: localhost)

    Returns:
        True if port is in use, False otherwise
    """
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.connect((host, port))
            return True
        except (ConnectionRefusedError, OSError):
            return False


def kill_process_on_port(port: int, logger: logging.Logger) -> bool:
    """Kill any process using the specified port.

    Args:
        port: Port number to check
        logger: Logger instance

    Returns:
        True if a process was killed, False if no process found
    """
    killed = False
    for conn in psutil.net_connections():
        if conn.laddr.port == port and conn.status == 'LISTEN':
            try:
                process = psutil.Process(conn.pid)
                logger.info(f"Killing process {process.name()} (PID {conn.pid}) on port {port}")
                process.kill()
                process.wait(timeout=5)
                killed = True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired) as e:
                logger.warning(f"Failed to kill process on port {port}: {e}")

    return killed


def start_dev_server(working_dir: Path, logger: logging.Logger) -> Optional[subprocess.Popen]:
    """Start the dev server in background.

    Args:
        working_dir: Project root directory
        logger: Logger instance

    Returns:
        Subprocess.Popen instance if started, None if already running
    """
    port = 8000

    # Check if already running
    if is_port_in_use(port):
        logger.info(f"Dev server already running on port {port}")
        return None

    logger.info(f"Starting dev server on port {port}...")

    # Start bun run dev in background
    # Use CREATE_NO_WINDOW on Windows to prevent console popup
    creation_flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0

    process = subprocess.Popen(
        ["bun", "run", "dev"],
        cwd=working_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        creationflags=creation_flags,
        text=True
    )

    # Wait for server to be ready (max 30 seconds)
    max_wait = 30
    for i in range(max_wait):
        if is_port_in_use(port):
            logger.info(f"Dev server started successfully (took {i+1}s)")
            return process
        time.sleep(1)

    # Server didn't start in time
    logger.error("Dev server failed to start within 30 seconds")
    process.terminate()
    return None


def ensure_dev_server(working_dir: Path, logger: logging.Logger) -> Optional[subprocess.Popen]:
    """Ensure dev server is running, start if needed.

    Args:
        working_dir: Project root directory
        logger: Logger instance

    Returns:
        Subprocess.Popen instance if we started it, None if already running
    """
    port = 8000

    if is_port_in_use(port):
        logger.info("✓ Dev server is running")
        return None

    logger.info("Dev server not detected, starting...")
    print(f"\n{'='*60}")
    print("STARTING DEV SERVER")
    print(f"{'='*60}")
    print("Dev server not running - starting bun run dev...")

    process = start_dev_server(working_dir, logger)

    if process:
        print(f"✓ Dev server started on http://localhost:{port}")
        print(f"{'='*60}\n")
    else:
        print(f"✗ Failed to start dev server")
        print(f"{'='*60}\n")

    return process


def stop_dev_server(process: Optional[subprocess.Popen], logger: logging.Logger):
    """Stop the dev server process.

    Args:
        process: Subprocess.Popen instance (or None if we didn't start it)
        logger: Logger instance
    """
    if process is None:
        logger.info("Dev server was already running (not started by us) - leaving it running")
        return

    logger.info("Stopping dev server...")

    try:
        # Try graceful termination first
        process.terminate()

        # Wait up to 5 seconds for graceful shutdown
        try:
            process.wait(timeout=5)
            logger.info("Dev server stopped gracefully")
        except subprocess.TimeoutExpired:
            # Force kill if it didn't stop
            logger.warning("Dev server didn't stop gracefully, forcing...")
            process.kill()
            process.wait()
            logger.info("Dev server force-stopped")

    except Exception as e:
        logger.error(f"Error stopping dev server: {e}")


def ensure_dev_server_single_attempt(working_dir: Path, port: int, logger: logging.Logger) -> subprocess.Popen:
    """Ensure dev server is running with a single restart attempt if needed.

    This is the deterministic approach:
    1. Check if port is available
    2. If port is blocked, kill the process and start fresh
    3. If port is free, just start the server
    4. Single attempt only - fail fast if it doesn't work

    Args:
        working_dir: Project root directory
        port: Port to run on (default: 8000)
        logger: Logger instance

    Returns:
        Subprocess.Popen instance of the running dev server

    Raises:
        RuntimeError: If dev server fails to start
    """
    logger.info(f"Checking port {port}...")

    # Check if port is in use
    if is_port_in_use(port):
        logger.warning(f"Port {port} is in use - killing existing process")
        print(f"⚠️  Port {port} is blocked - killing existing process...")

        if kill_process_on_port(port, logger):
            print(f"✓ Killed process on port {port}")
            # Wait a moment for port to be fully released
            time.sleep(2)
        else:
            logger.warning(f"No process found on port {port} but port appears in use")

    # Start dev server
    logger.info(f"Starting dev server on port {port}...")
    print(f"Starting bun run dev on port {port}...")

    process = start_dev_server(working_dir, logger)

    if process is None:
        error_msg = f"Failed to start dev server on port {port}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    print(f"✓ Dev server running at http://localhost:{port}")
    return process
