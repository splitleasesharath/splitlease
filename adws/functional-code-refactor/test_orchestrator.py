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
    paths          - Test path conversion (file path → URL path)
    page-detect    - Test page file detection (_is_page_file)
    validation     - Test deferred validation flow with mock data

Examples:
    python test_orchestrator.py audit app/src/logic
    python test_orchestrator.py chunks .claude/plans/New/<plan-file>.md
    python test_orchestrator.py visual /listing
    python test_orchestrator.py visual // --use-claude --slack-channel test-bed
    python test_orchestrator.py dev-server
    python test_orchestrator.py full app/src/logic
    python test_orchestrator.py paths
    python test_orchestrator.py page-detect
    python test_orchestrator.py validation
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

    # Run from project root so plan file is created at correct location
    # Path: functional-code-refactor/test_orchestrator.py → functional-code-refactor → adws → project root
    project_root = Path(__file__).parent.parent.parent
    cmd = ["uv", "run", "adws/functional-code-refactor/code_audit.py", target_path]
    print(f"Running: {' '.join(cmd)}\n")

    subprocess.run(cmd, cwd=project_root)


def test_chunks(plan_file: str):
    """Test chunk parser functionality."""
    print("="*60)
    print("TESTING: Chunk Parser")
    print("="*60)

    sys.path.insert(0, str(Path(__file__).parent))
    from modules.chunk_parser import extract_page_groups

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
    from modules.chunk_parser import extract_page_groups
    from orchestrator import implement_chunks_with_gemini

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


def test_visual(page_path: str, use_claude: bool = False, slack_channel: str = None):
    """Test visual regression functionality with concurrent MCP sessions.

    Args:
        page_path: URL path to test (e.g., "/search")
        use_claude: If True, use Claude instead of Gemini (avoids quota issues)
        slack_channel: Optional Slack channel for notifications (e.g., "#dev-alerts")
    """
    print("="*60)
    print("TESTING: Visual Regression Check (Concurrent Mode)")
    print("="*60)

    sys.path.insert(0, str(Path(__file__).parent))
    from modules.visual_regression import check_visual_parity
    from modules.dev_server import DevServerManager
    from modules.page_classifier import get_page_info, get_mcp_sessions_for_page
    import logging

    if use_claude:
        print("Using Claude (not Gemini) for visual check")

    # Setup dev server - calculate project root from script location
    project_root = Path(__file__).parent.parent.parent
    app_dir = project_root / "app"

    dev_logger = logging.getLogger("dev_server")
    dev_logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
    dev_logger.addHandler(handler)

    dev_server = DevServerManager(app_dir, dev_logger)

    try:
        print("\nStarting dev server on port 8010...")
        port, base_url = dev_server.start()

        # Get concurrent MCP sessions (LIVE + DEV)
        mcp_live, mcp_dev = get_mcp_sessions_for_page(page_path)
        page_info = get_page_info(page_path)
        auth_type = page_info.auth_type if page_info else "public"

        print(f"\nRunning concurrent visual check:")
        print(f"  Page: {page_path}")
        print(f"  Auth Type: {auth_type}")
        print(f"  MCP LIVE: {mcp_live or 'public'}")
        print(f"  MCP DEV: {mcp_dev or 'public'}")

        result = check_visual_parity(
            page_path=page_path,
            mcp_session=mcp_live,
            mcp_session_dev=mcp_dev,
            auth_type=auth_type,
            port=port,
            use_claude=use_claude,
            concurrent=True,
            slack_channel=slack_channel
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
    from modules.dev_server import DevServerManager
    import logging
    import time

    # Calculate project root from script location (functional-code-refactor → adws → project)
    project_root = Path(__file__).parent.parent.parent
    app_dir = project_root / "app"

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


def test_path_conversion():
    """Test file path to URL path conversion."""
    print("="*60)
    print("TESTING: Path Conversion (file_path_to_url_path)")
    print("="*60)

    sys.path.insert(0, str(Path(__file__).parent))
    from modules.page_classifier import file_path_to_url_path, get_page_info, get_mcp_sessions_for_page, ALL_PAGES

    # Test cases: (input_path, expected_url, should_find_page)
    test_cases = [
        # Top-level pages
        ("src/islands/pages/HomePage.jsx", "/", True),
        ("src/islands/pages/GuestProposalsPage.jsx", "/guest-proposals", True),
        ("app/src/islands/pages/LoginPage.jsx", "/login", True),

        # Directory-based pages
        ("src/islands/pages/HostProposalsPage/index.jsx", "/host-proposals", True),
        ("src/islands/pages/HostProposalsPage/HostProposalsPage.jsx", "/host-proposals", True),
        ("src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx", "/listing-dashboard", True),
        ("src/islands/pages/HostOverviewPage/HostOverviewPage.jsx", "/host-overview", True),

        # Nested components (should NOT be pages)
        ("src/islands/pages/HostProposalsPage/InfoGrid.jsx", None, False),
        ("src/islands/pages/HostProposalsPage/formatters.js", None, False),
        ("src/islands/pages/proposals/displayUtils.js", None, False),
        ("src/islands/pages/MessagingPage/components/MessageThread.jsx", None, False),
        ("src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx", None, False),

        # Already URL paths
        ("/host-proposals", None, True),  # Should return None but page should exist
        ("/listing-dashboard", None, True),
    ]

    print("\nPath Conversion Results:")
    print("-" * 80)
    print(f"{'Input Path':<55} {'URL':<20} {'Found':<8}")
    print("-" * 80)

    passed = 0
    failed = 0

    for input_path, expected_url, should_find in test_cases:
        url = file_path_to_url_path(input_path)

        # Check if page exists (either via converted URL or direct lookup)
        lookup = url if url else input_path
        page_info = get_page_info(lookup)
        found = page_info is not None

        # Determine pass/fail
        # For files that should convert: url should match expected and page should be found
        # For non-page files: url should be None or not find a page
        if expected_url is not None:
            test_passed = (url == expected_url) and (found == should_find)
        else:
            # For non-page files, we expect conversion to fail or not match a real page
            test_passed = (found == should_find)

        status = "PASS" if test_passed else "FAIL"

        if test_passed:
            passed += 1
        else:
            failed += 1

        # Truncate long paths for display
        display_input = input_path if len(input_path) <= 55 else "..." + input_path[-52:]
        display_url = str(url) if url else "(none)"

        print(f"{display_input:<55} {display_url:<20} {found!s:<8} [{status}]")

    print("-" * 80)
    print(f"\nResults: {passed} passed, {failed} failed out of {len(test_cases)} tests")

    if failed > 0:
        print("\n[FAIL] Some path conversion tests failed!")
        return False
    else:
        print("\n[PASS] All path conversion tests passed!")
        return True


def test_page_detection():
    """Test _is_page_file detection accuracy."""
    print("="*60)
    print("TESTING: Page File Detection (_is_page_file)")
    print("="*60)

    sys.path.insert(0, str(Path(__file__).parent))
    from modules.deferred_validation import _is_page_file

    # Test cases: (file_path, expected_is_page)
    test_cases = [
        # TRUE POSITIVES: Should be detected as pages
        ("src/islands/pages/HomePage.jsx", True),
        ("src/islands/pages/GuestProposalsPage.jsx", True),
        ("src/islands/pages/LoginPage.jsx", True),
        ("src/islands/pages/HostProposalsPage/index.jsx", True),
        ("src/islands/pages/HostProposalsPage/HostProposalsPage.jsx", True),
        ("src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx", True),
        ("app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx", True),
        ("islands/pages/MessagesPage.jsx", True),

        # TRUE NEGATIVES: Should NOT be detected as pages
        ("src/islands/pages/HostProposalsPage/InfoGrid.jsx", False),
        ("src/islands/pages/HostProposalsPage/formatters.js", False),
        ("src/islands/pages/HostProposalsPage/CollapsibleProposalCard.jsx", False),
        ("src/islands/pages/proposals/displayUtils.js", False),
        ("src/islands/pages/proposals/VirtualMeetingsSection.jsx", False),
        ("src/islands/pages/MessagingPage/components/MessageThread.jsx", False),
        ("src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx", False),
        ("src/islands/pages/ListingDashboardPage/components/PropertyInfoSection.jsx", False),
        ("src/islands/pages/FavoriteListingsPage/formatters.js", False),
        ("src/islands/pages/FavoriteListingsPage/types.js", False),

        # Non-page paths
        ("src/lib/dateFormatters.js", False),
        ("src/hooks/useAuth.js", False),
        ("src/islands/modals/CompareTermsModal.jsx", False),
    ]

    print("\nPage Detection Results:")
    print("-" * 80)
    print(f"{'File Path':<60} {'Expected':<10} {'Actual':<10}")
    print("-" * 80)

    passed = 0
    failed = 0

    for file_path, expected in test_cases:
        actual = _is_page_file(file_path)
        test_passed = actual == expected

        if test_passed:
            passed += 1
            status = "PASS"
        else:
            failed += 1
            status = "FAIL"

        display_path = file_path if len(file_path) <= 60 else "..." + file_path[-57:]
        print(f"{display_path:<60} {expected!s:<10} {actual!s:<10} [{status}]")

    print("-" * 80)
    print(f"\nResults: {passed} passed, {failed} failed out of {len(test_cases)} tests")

    if failed > 0:
        print("\n[FAIL] Some page detection tests failed!")
        return False
    else:
        print("\n[PASS] All page detection tests passed!")
        return True


def test_validation_flow():
    """Test the deferred validation flow with mock data."""
    print("="*60)
    print("TESTING: Deferred Validation Flow (Mock Data)")
    print("="*60)

    sys.path.insert(0, str(Path(__file__).parent))
    from modules.deferred_validation import _is_page_file, _trace_to_pages
    from modules.page_classifier import file_path_to_url_path, get_page_info, get_mcp_sessions_for_page

    # Simulate the paths from the failed run log
    problematic_paths = [
        "src/islands/pages/proposals/displayUtils.js",
        "src/islands/pages/MessagingPage/components/MessageThread.jsx",
        "src/islands/pages/ListingDashboardPage/components/AvailabilitySection.jsx",
        "src/islands/pages/proposals/VirtualMeetingsSection.jsx",
        "src/islands/pages/ListingDashboardPage/components/PropertyInfoSection.jsx",
        "src/islands/pages/HostProposalsPage/InfoGrid.jsx",
        "src/islands/pages/HostProposalsPage/formatters.js",
    ]

    print("\nAnalyzing Problematic Paths from Run Log:")
    print("-" * 80)

    for path in problematic_paths:
        is_page = _is_page_file(path)
        url_path = file_path_to_url_path(path)
        page_info = get_page_info(url_path) if url_path else None
        mcp_live, mcp_dev = get_mcp_sessions_for_page(url_path) if url_path else (None, None)

        print(f"\nPath: {path}")
        print(f"  _is_page_file(): {is_page}")
        print(f"  file_path_to_url_path(): {url_path}")
        print(f"  Page found in registry: {page_info is not None}")
        if page_info:
            print(f"  Auth type: {page_info.auth_type}")
            print(f"  MCP sessions: LIVE={mcp_live}, DEV={mcp_dev}")

        # This path should NOT be identified as a page
        if is_page:
            print(f"  [ERROR] This should NOT be detected as a page!")

    # Now test with actual page files
    print("\n\nAnalyzing Actual Page Entry Points:")
    print("-" * 80)

    actual_pages = [
        "src/islands/pages/HostProposalsPage/index.jsx",
        "src/islands/pages/GuestProposalsPage.jsx",
        "src/islands/pages/ListingDashboardPage/ListingDashboardPage.jsx",
        "src/islands/pages/MessagesPage.jsx",
    ]

    for path in actual_pages:
        is_page = _is_page_file(path)
        url_path = file_path_to_url_path(path)
        page_info = get_page_info(url_path) if url_path else None
        mcp_live, mcp_dev = get_mcp_sessions_for_page(url_path) if url_path else (None, None)

        print(f"\nPath: {path}")
        print(f"  _is_page_file(): {is_page}")
        print(f"  file_path_to_url_path(): {url_path}")
        print(f"  Page found in registry: {page_info is not None}")
        if page_info:
            print(f"  Auth type: {page_info.auth_type}")
            print(f"  MCP sessions: LIVE={mcp_live}, DEV={mcp_dev}")

        # This path SHOULD be identified as a page
        if not is_page:
            print(f"  [ERROR] This SHOULD be detected as a page!")

    print("\n" + "="*60)
    print("Validation flow test complete")
    print("="*60)


def test_full(target_path: str):
    """Run full orchestrator with --limit 1."""
    print("="*60)
    print("TESTING: Full Orchestrator (--limit 1)")
    print("="*60)

    cmd = ["uv", "run", "orchestrator.py", target_path, "--limit", "1"]
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
            print("Usage: test_orchestrator.py visual <page_path> [--use-claude] [--slack-channel CHANNEL]")
            sys.exit(1)
        use_claude = "--use-claude" in args
        slack_channel = None
        if "--slack-channel" in args:
            idx = args.index("--slack-channel")
            if idx + 1 < len(args):
                slack_channel = args[idx + 1]
        # Find page_path (first arg that doesn't start with --)
        page_path = None
        for arg in args:
            if not arg.startswith("--"):
                page_path = arg
                break
        if not page_path:
            print("Usage: test_orchestrator.py visual <page_path> [--use-claude] [--slack-channel CHANNEL]")
            sys.exit(1)
        test_visual(page_path, use_claude=use_claude, slack_channel=slack_channel)

    elif component == "dev-server":
        test_dev_server()

    elif component == "full":
        if not args:
            print("Usage: test_orchestrator.py full <target_path>")
            sys.exit(1)
        test_full(args[0])

    elif component == "paths":
        test_path_conversion()

    elif component == "page-detect":
        test_page_detection()

    elif component == "validation":
        test_validation_flow()

    else:
        print(f"Unknown component: {component}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
