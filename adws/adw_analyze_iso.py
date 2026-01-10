#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW Analyze Iso - Phase 1: Information Only Mode

Usage: uv run adw_analyze_iso.py [options]

Options:
  --path DIR              Path to analyze (default: current directory)
  --category CATEGORY     Run only one category (static_analysis, build_integrity, etc.)
  --quick                 Run only fast tests (static_analysis + security)
  --output FILE           Save results to JSON file
  --verbose               Show full command output

This script runs analysis WITHOUT making any changes:
1. Runs tests and captures results
2. Reports what's passing and failing
3. Ranks issues by priority (quick wins first)
4. Outputs manual commands you can run yourself

No git operations, no file modifications, no PRs - just information.
"""

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import List, Dict, Optional, Tuple

# Test definitions - simplified for Phase 1
TESTS = {
    "static_analysis": [
        ("typescript_check", "npm run typecheck", "Type errors block builds", 60),
        ("eslint", "npx eslint . --max-warnings=0", "Linting catches bugs early", 120),
        ("prettier_check", "npx prettier --check .", "Formatting consistency", 60),
    ],
    "build_integrity": [
        ("component_build", "npm run build", "Build must succeed", 180),
    ],
    "security": [
        ("npm_audit", "npm audit --audit-level=high", "Security vulnerabilities", 60),
    ],
    "unit_tests": [
        ("vitest", "npx vitest run", "Unit tests must pass", 300),
    ],
}

# Priority order (run fast tests first)
CATEGORY_ORDER = ["static_analysis", "security", "build_integrity", "unit_tests"]

# Impact scoring for prioritization
IMPACT_SCORES = {
    "typescript_check": 10,  # High - blocks everything
    "component_build": 9,    # High - must build
    "npm_audit": 8,          # High - security
    "eslint": 6,             # Medium - code quality
    "vitest": 5,             # Medium - correctness
    "prettier_check": 2,     # Low - cosmetic
}


@dataclass
class TestResult:
    """Result of a single test."""
    name: str
    category: str
    passed: bool
    command: str
    purpose: str
    duration_seconds: float
    error: Optional[str] = None
    output: Optional[str] = None


@dataclass
class AnalysisReport:
    """Complete analysis report."""
    timestamp: str
    path: str
    total_tests: int
    passed: int
    failed: int
    results: List[TestResult]
    recommended_actions: List[Dict]


def run_test(
    name: str,
    command: str,
    purpose: str,
    timeout: int,
    category: str,
    cwd: str,
    verbose: bool = False
) -> TestResult:
    """Run a single test and capture result."""
    print(f"  Running {name}...", end=" ", flush=True)

    start = datetime.now()

    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        duration = (datetime.now() - start).total_seconds()
        passed = result.returncode == 0

        if passed:
            print(f"PASS ({duration:.1f}s)")
        else:
            print(f"FAIL ({duration:.1f}s)")

        error = None
        output = None

        if not passed:
            # Capture first 500 chars of error
            error = (result.stderr or result.stdout or "Unknown error")[:500]
            if verbose:
                output = result.stdout[:2000] if result.stdout else None

        return TestResult(
            name=name,
            category=category,
            passed=passed,
            command=command,
            purpose=purpose,
            duration_seconds=duration,
            error=error,
            output=output
        )

    except subprocess.TimeoutExpired:
        duration = (datetime.now() - start).total_seconds()
        print(f"TIMEOUT ({timeout}s)")
        return TestResult(
            name=name,
            category=category,
            passed=False,
            command=command,
            purpose=purpose,
            duration_seconds=duration,
            error=f"Timed out after {timeout}s"
        )
    except Exception as e:
        duration = (datetime.now() - start).total_seconds()
        print(f"ERROR")
        return TestResult(
            name=name,
            category=category,
            passed=False,
            command=command,
            purpose=purpose,
            duration_seconds=duration,
            error=str(e)
        )


def run_analysis(
    path: str,
    categories: List[str],
    verbose: bool = False
) -> List[TestResult]:
    """Run all tests in specified categories."""
    results = []

    for category in categories:
        if category not in TESTS:
            print(f"Unknown category: {category}")
            continue

        print(f"\n[{category.upper()}]")

        for name, command, purpose, timeout in TESTS[category]:
            result = run_test(
                name=name,
                command=command,
                purpose=purpose,
                timeout=timeout,
                category=category,
                cwd=path,
                verbose=verbose
            )
            results.append(result)

    return results


def prioritize_actions(results: List[TestResult]) -> List[Dict]:
    """Prioritize failed tests by impact score."""
    failed = [r for r in results if not r.passed]

    # Sort by impact score (highest first)
    failed.sort(key=lambda r: IMPACT_SCORES.get(r.name, 5), reverse=True)

    actions = []
    for i, result in enumerate(failed, 1):
        actions.append({
            "priority": i,
            "test": result.name,
            "impact": IMPACT_SCORES.get(result.name, 5),
            "reason": result.purpose,
            "fix_command": f"# Fix: {result.name}",
            "verify_command": result.command,
            "error_hint": result.error[:200] if result.error else None
        })

    return actions


def print_report(report: AnalysisReport):
    """Print human-readable report."""
    print("\n" + "=" * 60)
    print("ANALYSIS REPORT")
    print("=" * 60)

    print(f"\nPath: {report.path}")
    print(f"Time: {report.timestamp}")
    print(f"\nResults: {report.passed}/{report.total_tests} passed")

    if report.failed == 0:
        print("\n All tests passing! No actions needed.")
        return

    print(f"\n{report.failed} ISSUES FOUND")
    print("-" * 40)

    # Group by category
    by_category = {}
    for r in report.results:
        if not r.passed:
            if r.category not in by_category:
                by_category[r.category] = []
            by_category[r.category].append(r)

    for category, failures in by_category.items():
        print(f"\n[{category}]")
        for f in failures:
            print(f"  {f.name}: {f.error[:80] if f.error else 'Failed'}...")

    print("\n" + "=" * 60)
    print("RECOMMENDED ACTIONS (by priority)")
    print("=" * 60)

    for action in report.recommended_actions:
        print(f"\n{action['priority']}. {action['test']} (impact: {action['impact']}/10)")
        print(f"   Why: {action['reason']}")
        print(f"   Run: {action['verify_command']}")
        if action['error_hint']:
            print(f"   Hint: {action['error_hint'][:100]}...")

    print("\n" + "=" * 60)
    print("MANUAL COMMANDS TO RUN")
    print("=" * 60)
    print("\n# Run these commands in order to fix issues:\n")

    for action in report.recommended_actions:
        print(f"# {action['priority']}. Fix {action['test']}")
        print(f"{action['verify_command']}")
        print()


def main():
    parser = argparse.ArgumentParser(
        description="Analyze codebase without making changes"
    )
    parser.add_argument(
        "--path",
        default=".",
        help="Path to analyze"
    )
    parser.add_argument(
        "--category",
        choices=list(TESTS.keys()),
        help="Run only one category"
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Run only fast tests (static_analysis + security)"
    )
    parser.add_argument(
        "--output",
        help="Save results to JSON file"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show full command output"
    )

    args = parser.parse_args()

    # Resolve path
    path = os.path.abspath(args.path)
    if not os.path.isdir(path):
        print(f"Error: {path} is not a directory")
        sys.exit(1)

    # Determine categories to run
    if args.category:
        categories = [args.category]
    elif args.quick:
        categories = ["static_analysis", "security"]
    else:
        categories = CATEGORY_ORDER

    print("=" * 60)
    print("ADW ANALYZE - Phase 1: Information Only")
    print("=" * 60)
    print(f"\nAnalyzing: {path}")
    print(f"Categories: {', '.join(categories)}")
    print(f"Mode: READ-ONLY (no changes will be made)")

    # Run analysis
    results = run_analysis(path, categories, args.verbose)

    # Build report
    passed = sum(1 for r in results if r.passed)
    failed = sum(1 for r in results if not r.passed)

    report = AnalysisReport(
        timestamp=datetime.now().isoformat(),
        path=path,
        total_tests=len(results),
        passed=passed,
        failed=failed,
        results=results,
        recommended_actions=prioritize_actions(results)
    )

    # Print report
    print_report(report)

    # Save to file if requested
    if args.output:
        with open(args.output, "w") as f:
            json.dump(asdict(report), f, indent=2, default=str)
        print(f"\nResults saved to: {args.output}")

    # Exit code reflects test status
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
