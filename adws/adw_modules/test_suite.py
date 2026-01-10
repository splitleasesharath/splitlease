"""Test suite definitions for overnight refactoring.

Simplified for phased testing:
- Phase 1: Analysis only (run tests, report results)
- Phase 2: Fix one issue at a time, verify, continue
- Phase 3: Batch processing (overnight)

Tests are organized by speed and impact for fail-fast execution.
"""

from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


@dataclass
class TestDef:
    """Single test definition."""
    name: str
    command: str
    purpose: str
    timeout: int  # seconds
    impact: int   # 1-10, higher = more critical


# Core tests organized by category
# Format: (name, command, purpose, timeout_seconds, impact_score)
CORE_TESTS: Dict[str, List[Tuple[str, str, str, int, int]]] = {
    # Fast checks - run first
    "static_analysis": [
        ("typescript", "npm run typecheck", "Type safety", 60, 10),
        ("eslint", "npx eslint . --max-warnings=0", "Code quality", 120, 6),
        ("prettier", "npx prettier --check .", "Formatting", 60, 2),
    ],

    # Security - important but fast
    "security": [
        ("npm_audit", "npm audit --audit-level=high", "Vulnerabilities", 60, 9),
    ],

    # Build verification
    "build": [
        ("build", "npm run build", "Build succeeds", 180, 10),
    ],

    # Tests - slower
    "tests": [
        ("unit", "npm run test", "Unit tests pass", 300, 8),
    ],
}

# Execution order (fast to slow)
CATEGORY_ORDER = ["static_analysis", "security", "build", "tests"]


def get_tests_for_category(category: str) -> List[TestDef]:
    """Get test definitions for a category."""
    tests = CORE_TESTS.get(category, [])
    return [
        TestDef(name=t[0], command=t[1], purpose=t[2], timeout=t[3], impact=t[4])
        for t in tests
    ]


def get_all_tests() -> List[TestDef]:
    """Get all tests in execution order."""
    all_tests = []
    for category in CATEGORY_ORDER:
        all_tests.extend(get_tests_for_category(category))
    return all_tests


def get_quick_tests() -> List[TestDef]:
    """Get only fast tests for quick analysis."""
    quick_categories = ["static_analysis", "security"]
    tests = []
    for category in quick_categories:
        tests.extend(get_tests_for_category(category))
    return tests


def get_test_count() -> int:
    """Total number of tests."""
    return sum(len(tests) for tests in CORE_TESTS.values())


def prioritize_failures(failed_tests: List[str]) -> List[str]:
    """Sort failed tests by impact score (highest first)."""
    all_tests = {t.name: t for t in get_all_tests()}
    return sorted(
        failed_tests,
        key=lambda name: all_tests.get(name, TestDef("", "", "", 0, 0)).impact,
        reverse=True
    )


# Project-specific test overrides (loaded from config)
def load_project_tests(config_path: str) -> Optional[Dict]:
    """Load project-specific test definitions from config."""
    import json
    import os

    if not os.path.exists(config_path):
        return None

    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except Exception:
        return None
