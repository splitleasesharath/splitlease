"""
Concurrent Parity Check - LIVE vs DEV visual comparison using dual MCP sessions

This module runs visual regression checks concurrently on LIVE (split.lease)
and DEV (localhost:8010) environments using separate Playwright MCP sessions.

Architecture:
- Each page type uses 2 MCP sessions in parallel (LIVE + DEV)
- Host pages: playwright-host-live + playwright-host-dev
- Guest pages: playwright-guest-live + playwright-guest-dev
- Public pages: No auth required, uses any available session

The concurrent approach ensures:
1. State parity - Both environments captured at the same time
2. Faster execution - Parallel screenshot capture
3. Accurate comparison - No drift from sequential timing
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from enum import Enum

from .page_classifier import (
    PageInfo,
    ALL_PAGES,
    get_checkable_pages,
    group_pages_for_concurrent_check,
    resolve_dynamic_route,
)


class ParityStatus(Enum):
    """Status of a parity check"""
    PENDING = "pending"
    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    SKIPPED = "skipped"


@dataclass
class ParityResult:
    """Result of a single page parity check"""
    page_path: str
    status: ParityStatus
    live_screenshot: Optional[str] = None
    dev_screenshot: Optional[str] = None
    diff_percentage: Optional[float] = None
    error_message: Optional[str] = None
    duration_ms: int = 0


@dataclass
class ParityReport:
    """Complete report of a parity check run"""
    timestamp: str
    total_pages: int
    passed: int
    failed: int
    errors: int
    skipped: int
    results: List[ParityResult]
    duration_ms: int


# =============================================================================
# ENVIRONMENT CONFIGURATION
# =============================================================================

LIVE_BASE_URL = "https://split.lease"
DEV_BASE_URL = "http://localhost:8010"

SCREENSHOT_DIR = Path("adws/parity_screenshots")


# =============================================================================
# CONCURRENT CAPTURE FUNCTIONS
# =============================================================================

async def capture_page_pair(
    page: PageInfo,
    screenshot_dir: Path,
    timestamp: str
) -> ParityResult:
    """
    Capture screenshots of a page on both LIVE and DEV concurrently.

    This function is designed to be called by the MCP tool specialist
    which handles the actual browser automation.

    Args:
        page: PageInfo with MCP session configuration
        screenshot_dir: Directory to save screenshots
        timestamp: Timestamp string for file naming

    Returns:
        ParityResult with screenshot paths and status
    """
    start_time = datetime.now()

    # Resolve dynamic routes to concrete URLs
    url_path = resolve_dynamic_route(page)

    # Build full URLs
    live_url = f"{LIVE_BASE_URL}{url_path}"
    dev_url = f"{DEV_BASE_URL}{url_path}"

    # Screenshot filenames
    safe_path = page.path.replace("/", "_").strip("_") or "home"
    live_filename = f"{timestamp}_{safe_path}_LIVE.png"
    dev_filename = f"{timestamp}_{safe_path}_DEV.png"

    live_screenshot_path = screenshot_dir / live_filename
    dev_screenshot_path = screenshot_dir / dev_filename

    # The actual browser automation is handled by MCP tool specialist
    # This function returns the configuration for the concurrent capture

    result = ParityResult(
        page_path=page.path,
        status=ParityStatus.PENDING,
        live_screenshot=str(live_screenshot_path),
        dev_screenshot=str(dev_screenshot_path),
        duration_ms=int((datetime.now() - start_time).total_seconds() * 1000)
    )

    return result


def get_capture_config(page: PageInfo, timestamp: str) -> Dict:
    """
    Get the configuration needed for concurrent screenshot capture.

    Returns a dict with all info needed for MCP tool specialist to execute.

    Args:
        page: PageInfo for the page to capture
        timestamp: Timestamp for file naming

    Returns:
        Configuration dict for MCP execution
    """
    url_path = resolve_dynamic_route(page)
    safe_path = page.path.replace("/", "_").strip("_") or "home"

    return {
        "page_path": page.path,
        "auth_type": page.auth_type,
        "live": {
            "mcp_session": page.mcp_live,
            "url": f"{LIVE_BASE_URL}{url_path}",
            "screenshot": f"{timestamp}_{safe_path}_LIVE.png",
        },
        "dev": {
            "mcp_session": page.mcp_dev,
            "url": f"{DEV_BASE_URL}{url_path}",
            "screenshot": f"{timestamp}_{safe_path}_DEV.png",
        },
    }


def get_batch_capture_configs(
    include_deprecated: bool = False,
    include_dev_only: bool = False
) -> Dict[str, List[Dict]]:
    """
    Get capture configurations for all pages, grouped by auth type.

    This allows batch processing where:
    - All host pages run concurrently using host MCP sessions
    - All guest pages run concurrently using guest MCP sessions
    - All public pages run without auth

    Args:
        include_deprecated: Include deprecated pages
        include_dev_only: Include dev-only pages

    Returns:
        Dict with "host", "guest", "public" keys containing config lists
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    groups = group_pages_for_concurrent_check()

    configs = {
        "host": [],
        "guest": [],
        "public": [],
    }

    for group_name, pages in groups.items():
        for page in pages:
            # Skip based on filters
            if page.deprecated and not include_deprecated:
                continue
            if page.dev_only and not include_dev_only:
                continue

            config = get_capture_config(page, timestamp)
            configs[group_name].append(config)

    return configs


# =============================================================================
# PARITY CHECK EXECUTION PLAN
# =============================================================================

def create_parity_check_plan() -> Dict:
    """
    Create a complete execution plan for parity checking.

    This plan is consumed by the orchestrator to run checks in optimal order:
    1. Public pages (no auth, can run in any session)
    2. Host pages (requires host-live + host-dev sessions)
    3. Guest pages (requires guest-live + guest-dev sessions)

    Returns:
        Execution plan with page groups and MCP session requirements
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    screenshot_dir = SCREENSHOT_DIR / timestamp

    pages = get_checkable_pages(include_dev_only=False, include_deprecated=False)
    groups = group_pages_for_concurrent_check()

    plan = {
        "timestamp": timestamp,
        "screenshot_dir": str(screenshot_dir),
        "total_pages": len(pages),
        "phases": [
            {
                "name": "public",
                "description": "Public pages (no auth required)",
                "mcp_sessions": {
                    "live": None,  # Any session works
                    "dev": None,
                },
                "pages": [get_capture_config(p, timestamp) for p in groups["public"]
                          if not p.deprecated and not p.dev_only],
            },
            {
                "name": "host",
                "description": "Host-authenticated pages",
                "mcp_sessions": {
                    "live": "playwright-host-live",
                    "dev": "playwright-host-dev",
                },
                "pages": [get_capture_config(p, timestamp) for p in groups["host"]
                          if not p.deprecated and not p.dev_only],
            },
            {
                "name": "guest",
                "description": "Guest-authenticated pages",
                "mcp_sessions": {
                    "live": "playwright-guest-live",
                    "dev": "playwright-guest-dev",
                },
                "pages": [get_capture_config(p, timestamp) for p in groups["guest"]
                          if not p.deprecated and not p.dev_only],
            },
        ],
    }

    return plan


# =============================================================================
# RESULT AGGREGATION
# =============================================================================

def aggregate_results(results: List[ParityResult]) -> ParityReport:
    """
    Aggregate individual parity results into a complete report.

    Args:
        results: List of ParityResult from individual page checks

    Returns:
        ParityReport with summary statistics
    """
    passed = len([r for r in results if r.status == ParityStatus.PASSED])
    failed = len([r for r in results if r.status == ParityStatus.FAILED])
    errors = len([r for r in results if r.status == ParityStatus.ERROR])
    skipped = len([r for r in results if r.status == ParityStatus.SKIPPED])

    total_duration = sum(r.duration_ms for r in results)

    return ParityReport(
        timestamp=datetime.now().strftime("%Y%m%d%H%M%S"),
        total_pages=len(results),
        passed=passed,
        failed=failed,
        errors=errors,
        skipped=skipped,
        results=results,
        duration_ms=total_duration,
    )


def generate_report_markdown(report: ParityReport) -> str:
    """
    Generate a markdown report from parity check results.

    Args:
        report: ParityReport to format

    Returns:
        Markdown string for the report
    """
    lines = [
        f"# Parity Check Report - {report.timestamp}",
        "",
        "## Summary",
        f"- **Total Pages**: {report.total_pages}",
        f"- **Passed**: {report.passed} ✅",
        f"- **Failed**: {report.failed} ❌",
        f"- **Errors**: {report.errors} ⚠️",
        f"- **Skipped**: {report.skipped} ⏭️",
        f"- **Duration**: {report.duration_ms}ms",
        "",
        "## Results",
        "",
        "| Page | Status | Diff % | Notes |",
        "|------|--------|--------|-------|",
    ]

    for result in report.results:
        status_icon = {
            ParityStatus.PASSED: "✅",
            ParityStatus.FAILED: "❌",
            ParityStatus.ERROR: "⚠️",
            ParityStatus.SKIPPED: "⏭️",
            ParityStatus.PENDING: "⏳",
        }.get(result.status, "?")

        diff = f"{result.diff_percentage:.1f}%" if result.diff_percentage else "-"
        notes = result.error_message or "-"

        lines.append(f"| {result.page_path} | {status_icon} | {diff} | {notes} |")

    return "\n".join(lines)


# =============================================================================
# CLI ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("CONCURRENT PARITY CHECK PLAN")
    print("=" * 60)

    plan = create_parity_check_plan()

    print(f"\nTimestamp: {plan['timestamp']}")
    print(f"Screenshot Dir: {plan['screenshot_dir']}")
    print(f"Total Pages: {plan['total_pages']}")

    for phase in plan["phases"]:
        print(f"\n{phase['name'].upper()} ({len(phase['pages'])} pages)")
        print(f"  MCP Live: {phase['mcp_sessions']['live'] or 'any'}")
        print(f"  MCP Dev: {phase['mcp_sessions']['dev'] or 'any'}")
        for page in phase["pages"][:3]:  # Show first 3
            print(f"    - {page['page_path']}")
        if len(phase["pages"]) > 3:
            print(f"    ... and {len(phase['pages']) - 3} more")
