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

    Uses platform-specific commands for deterministic cleanup.
    On Windows, uses taskkill to forcefully terminate processes.

    Args:
        port: Port number to check
        logger: Logger instance

    Returns:
        True if port was cleared, False otherwise
    """
    import platform

    # First try: Use psutil to find and kill
    killed_via_psutil = False
    for conn in psutil.net_connections():
        if conn.laddr.port == port and conn.status == 'LISTEN':
            try:
                process = psutil.Process(conn.pid)
                process_name = process.name()
                logger.info(f"Found process {process_name} (PID {conn.pid}) on port {port}")
                process.kill()
                process.wait(timeout=3)
                logger.info(f"Successfully killed {process_name} (PID {conn.pid})")
                killed_via_psutil = True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.TimeoutExpired) as e:
                logger.warning(f"psutil kill failed for PID {conn.pid}: {e}")
                # Continue to platform-specific fallback

    # If psutil succeeded, verify and return
    if killed_via_psutil:
        time.sleep(1)  # Give OS time to release port
        if not is_port_in_use(port):
            logger.info(f"Port {port} successfully cleared via psutil")
            return True
        else:
            logger.warning(f"Port {port} still in use after psutil kill, trying platform-specific cleanup")

    # Fallback: Platform-specific force kill
    if platform.system() == 'Windows':
        return _kill_port_windows(port, logger)
    else:
        return _kill_port_unix(port, logger)


def _kill_port_windows(port: int, logger: logging.Logger) -> bool:
    """Kill process on port using Windows-specific commands.

    Args:
        port: Port number
        logger: Logger instance

    Returns:
        True if port was cleared
    """
    try:
        # Find PID using netstat
        result = subprocess.run(
            ['netstat', '-ano'],
            capture_output=True,
            text=True,
            timeout=5
        )

        # Parse output to find PID
        pids = set()
        for line in result.stdout.split('\n'):
            if f':{port}' in line and 'LISTENING' in line:
                parts = line.split()
                if parts:
                    try:
                        pid = int(parts[-1])
                        pids.add(pid)
                    except (ValueError, IndexError):
                        continue

        if not pids:
            logger.info(f"No process found on port {port} via netstat")
            return not is_port_in_use(port)

        # Kill all PIDs found
        for pid in pids:
            logger.info(f"Force killing PID {pid} with taskkill")
            try:
                subprocess.run(
                    ['taskkill', '/F', '/PID', str(pid)],
                    capture_output=True,
                    timeout=5,
                    check=False  # Don't raise on non-zero exit
                )
            except Exception as e:
                logger.warning(f"taskkill failed for PID {pid}: {e}")

        # Wait and verify
        time.sleep(2)
        port_free = not is_port_in_use(port)

        if port_free:
            logger.info(f"Port {port} successfully cleared via taskkill")
        else:
            logger.error(f"Port {port} still in use after taskkill")

        return port_free

    except Exception as e:
        logger.error(f"Windows port cleanup failed: {e}")
        return False


def _kill_port_unix(port: int, logger: logging.Logger) -> bool:
    """Kill process on port using Unix-specific commands.

    Args:
        port: Port number
        logger: Logger instance

    Returns:
        True if port was cleared
    """
    try:
        # Find PID using lsof or netstat
        try:
            result = subprocess.run(
                ['lsof', '-ti', f':{port}'],
                capture_output=True,
                text=True,
                timeout=5
            )
            pids = result.stdout.strip().split('\n')
        except FileNotFoundError:
            # lsof not available, try netstat
            result = subprocess.run(
                ['netstat', '-tlnp'],
                capture_output=True,
                text=True,
                timeout=5
            )
            pids = []
            for line in result.stdout.split('\n'):
                if f':{port}' in line:
                    parts = line.split()
                    if parts:
                        try:
                            pid = parts[-1].split('/')[0]
                            pids.append(pid)
                        except (IndexError, ValueError):
                            continue

        if not pids or not pids[0]:
            logger.info(f"No process found on port {port}")
            return not is_port_in_use(port)

        # Kill all PIDs
        for pid in pids:
            if pid:
                logger.info(f"Force killing PID {pid} with kill -9")
                try:
                    subprocess.run(
                        ['kill', '-9', pid],
                        timeout=5,
                        check=False
                    )
                except Exception as e:
                    logger.warning(f"kill failed for PID {pid}: {e}")

        # Wait and verify
        time.sleep(2)
        port_free = not is_port_in_use(port)

        if port_free:
            logger.info(f"Port {port} successfully cleared via kill")
        else:
            logger.error(f"Port {port} still in use after kill")

        return port_free

    except Exception as e:
        logger.error(f"Unix port cleanup failed: {e}")
        return False


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
    """Ensure dev server is running with deterministic port cleanup.

    This is the DETERMINISTIC approach:
    1. ALWAYS kill any process on the target port (no checking, just kill)
    2. Wait for port to be fully released
    3. Start dev server
    4. Verify server started successfully
    5. Fail fast with clear error if any step fails

    Args:
        working_dir: Project root directory
        port: Port to run on (typically 8000)
        logger: Logger instance

    Returns:
        Subprocess.Popen instance of the running dev server

    Raises:
        RuntimeError: If port cannot be cleared or dev server fails to start
    """
    logger.info(f"=== DETERMINISTIC DEV SERVER STARTUP (Port {port}) ===")

    # STEP 1: ALWAYS attempt to clear the port (even if it appears free)
    logger.info(f"Forcefully clearing port {port}...")
    print(f"🔧 Forcefully clearing port {port}...")

    # Check if anything is on the port
    port_was_in_use = is_port_in_use(port)

    if port_was_in_use:
        logger.info(f"Port {port} is in use - killing processes")
        print(f"⚠️  Port {port} is occupied - killing processes...")

        if not kill_process_on_port(port, logger):
            error_msg = f"Failed to clear port {port} - cannot start dev server"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        print(f"✓ Port {port} cleared")
        logger.info(f"Port {port} successfully cleared")
    else:
        logger.info(f"Port {port} is free")
        print(f"✓ Port {port} is free")

    # STEP 2: Wait for OS to fully release the port
    logger.info("Waiting for port to be fully released...")
    time.sleep(2)

    # STEP 3: Verify port is truly free
    if is_port_in_use(port):
        error_msg = f"Port {port} still in use after cleanup - cannot start dev server"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    # STEP 4: Start dev server
    logger.info(f"Starting dev server on port {port}...")
    print(f"🚀 Starting bun run dev on port {port}...")

    process = start_dev_server(working_dir, logger)

    if process is None:
        error_msg = f"Failed to start dev server on port {port} - bun run dev did not start within timeout"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    # STEP 5: Verify server is responding
    logger.info(f"Dev server started successfully on port {port}")
    print(f"✅ Dev server running at http://localhost:{port}")

    return process
