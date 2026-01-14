#!/usr/bin/env python3
"""
Test Orchestrator - Individual Component Tester

This script allows you to test individual components of the unified FP orchestrator
by specifying the component name as an argument.

Usage:
    python test_orchestrator.py <component> [args...]

Available Components:
    audit          - Test code audit (Opus)
    chunks         - Test chunk parser
    implement      - Test implementation (Gemini)
    visual         - Test visual regression
    dev-server     - Test dev server management
    full           - Run full orchestrator with --limit 1

Examples:
    python test_orchestrator.py audit app/src/logic
    python test_orchestrator.py chunks .claude/plans/New/<plan-file>.md
    python test_orchestrator.py visual /listing
    python test_orchestrator.py dev-server
    python test_orchestrator.py full app/src/logic
"""

import sys
import subprocess
import argparse
from pathlib import Path


def test_audit(target_path: str):
    """Test code audit functionality."""
    print("="*60)
    print("TESTING: Code Audit (Claude Opus)")
    print("="*60)

    cmd = ["uv", "run", "adw_code_audit.py", target_path]
    print(f"Running: {' '.join(cmd)}\n")

    subprocess.run(cmd, cwd=Path(__file__).parent)


def test_chunks(plan_file: str):
    """Test chunk parser functionality."""
    print("="*60)
    print("TESTING: Chunk Parser")
    print("="*60)

    sys.path.insert(0, str(Path(__file__).parent))
    from adw_modules.chunk_parser import extract_page_groups

    plan_path = Path(plan_file)
    if not plan_path.exists():
        print(f"Error: Plan file not found at {plan_path}")
        sys.exit(1)

    page_groups = extract_page_groups(plan_path)

    print(f"\nFound {len(page_groups)} page groups:\n")
    for page_path, chunks in page_groups.items():
        print(f"  {page_path}: {len(chunks)} chunks")
        for chunk in chunks:
            print(f"    - Chunk {chunk.number}: {chunk.title}")
            print(f"      File: {chunk.file_path}:{chunk.line_number}")

    print(f"\nTotal chunks across all groups: {sum(len(chunks) for chunks in page_groups.values())}")


def test_implement(plan_file: str, chunk_number: int = None):
    """Test implementation functionality."""
    print("="*60)
    print("TESTING: Implementation (Gemini Flash)")
    print("="*60)

    sys.path.insert(0, str(Path(__file__).parent))
    from adw_modules.chunk_parser import extract_page_groups
    from adw_unified_fp_orchestrator import implement_chunks_with_gemini

    plan_path = Path(plan_file)
    if not plan_path.exists():
        print(f"Error: Plan file not found at {plan_path}")
        sys.exit(1)

    page_groups = extract_page_groups(plan_path)

    if not page_groups:
        print("No page groups found in plan")
        sys.exit(1)

    # Get first page group
    first_page = list(page_groups.keys())[0]
    chunks = page_groups[first_page]

    if chunk_number:
        chunks = [c for c in chunks if c.number == chunk_number]
        if not chunks:
            print(f"Chunk {chunk_number} not found")
            sys.exit(1)

    print(f"\nTesting implementation on: {first_page}")
    print(f"Chunks: {[c.number for c in chunks]}")
    print("\nWARNING: This will modify your code!")
    response = input("Continue? (yes/no): ")

    if response.lower() != "yes":
        print("Aborted")
        sys.exit(0)

    success = implement_chunks_with_gemini(chunks, Path.cwd())

    if success:
        print("\n[SUCCESS] Implementation completed")
    else:
        print("\n[FAILURE] Implementation failed")


def test_visual(page_path: str):
    """Test visual regression functionality."""
    print("="*60)
    print("TESTING: Visual Regression Check")
    print("="*60)

    sys.path.insert(0, str(Path(__file__).parent))
    from adw_modules.visual_regression import check_visual_parity
    from adw_modules.dev_server import DevServerManager
    from adw_modules.page_classifier import HOST_PAGES, GUEST_PAGES, SHARED_PROTECTED_PAGES
    import logging

    # Setup dev server
    working_dir = Path.cwd()
    app_dir = working_dir / "app"

    dev_logger = logging.getLogger("dev_server")
    dev_logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
    dev_logger.addHandler(handler)

    dev_server = DevServerManager(app_dir, dev_logger)

    try:
        print("\nStarting dev server on port 8010...")
        port, base_url = dev_server.start()

        # Determine MCP session
        if page_path in HOST_PAGES:
            mcp_session = "playwright-host"
        elif page_path in GUEST_PAGES:
            mcp_session = "playwright-guest"
        elif page_path in SHARED_PROTECTED_PAGES:
            mcp_session = "playwright-host"
        else:
            mcp_session = None

        auth_type = "protected" if mcp_session else "public"

        print(f"\nRunning visual check:")
        print(f"  Page: {page_path}")
        print(f"  MCP Session: {mcp_session or 'public'}")
        print(f"  Auth Type: {auth_type}")

        result = check_visual_parity(
            page_path=page_path,
            mcp_session=mcp_session,
            auth_type=auth_type,
            port=port
        )

        print(f"\nResult: {result.get('visualParity')}")
        if result.get('explanation'):
            print(f"Explanation: {result.get('explanation')}")
        if result.get('issues'):
            print(f"Issues: {', '.join(result.get('issues'))}")

    finally:
        dev_server.stop()


def test_dev_server():
    """Test dev server management."""
    print("="*60)
    print("TESTING: Dev Server Management")
    print("="*60)

    sys.path.insert(0, str(Path(__file__).parent))
    from adw_modules.dev_server import DevServerManager
    import logging
    import time

    working_dir = Path.cwd()
    app_dir = working_dir / "app"

    dev_logger = logging.getLogger("dev_server")
    dev_logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
    dev_logger.addHandler(handler)

    dev_server = DevServerManager(app_dir, dev_logger)

    try:
        print("\nStarting dev server...")
        port, base_url = dev_server.start()

        print(f"\n[SUCCESS] Dev server started")
        print(f"  Port: {port}")
        print(f"  Base URL: {base_url}")
        print(f"  Is running: {dev_server.is_running()}")

        print("\nWaiting 5 seconds...")
        time.sleep(5)

        print("\nStopping dev server...")
        dev_server.stop()

        print(f"\n[SUCCESS] Dev server stopped")
        print(f"  Is running: {dev_server.is_running()}")

    except Exception as e:
        print(f"\n[FAILURE] {e}")
    finally:
        if dev_server.is_running():
            dev_server.stop()


def test_full(target_path: str):
    """Run full orchestrator with --limit 1."""
    print("="*60)
    print("TESTING: Full Orchestrator (--limit 1)")
    print("="*60)

    cmd = ["uv", "run", "adw_unified_fp_orchestrator.py", target_path, "--limit", "1"]
    print(f"Running: {' '.join(cmd)}\n")

    subprocess.run(cmd, cwd=Path(__file__).parent)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    component = sys.argv[1]
    args = sys.argv[2:]

    if component == "audit":
        if not args:
            print("Usage: test_orchestrator.py audit <target_path>")
            sys.exit(1)
        test_audit(args[0])

    elif component == "chunks":
        if not args:
            print("Usage: test_orchestrator.py chunks <plan_file>")
            sys.exit(1)
        test_chunks(args[0])

    elif component == "implement":
        if not args:
            print("Usage: test_orchestrator.py implement <plan_file> [chunk_number]")
            sys.exit(1)
        chunk_num = int(args[1]) if len(args) > 1 else None
        test_implement(args[0], chunk_num)

    elif component == "visual":
        if not args:
            print("Usage: test_orchestrator.py visual <page_path>")
            sys.exit(1)
        test_visual(args[0])

    elif component == "dev-server":
        test_dev_server()

    elif component == "full":
        if not args:
            print("Usage: test_orchestrator.py full <target_path>")
            sys.exit(1)
        test_full(args[0])

    else:
        print(f"Unknown component: {component}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
