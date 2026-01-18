#!/usr/bin/env python3
"""
Barrel File Detector for Split Lease Codebase

Scans app/src/ for index.js/jsx/ts/tsx files and categorizes them:
- PURE_BARREL: Only contains re-exports (safe to remove)
- MIXED: Contains re-exports AND logic (needs extraction first)
- ENTRY_POINT: Framework-required entry point or component file (keep)

Output: JSON report or human-readable summary

Usage:
    python refactor/barrel_detector.py              # Human-readable output
    python refactor/barrel_detector.py --json       # JSON output
    python refactor/barrel_detector.py --pure-only  # Just list pure barrel paths
    python refactor/barrel_detector.py -o report.json --json  # Save to file
"""

import os
import re
import json
import sys
from dataclasses import dataclass, asdict, field
from typing import List, Literal, Set
from datetime import datetime
from pathlib import Path

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════

SEARCH_PATHS = ["app/src"]
SKIP_DIRS: Set[str] = {"node_modules", ".git", "dist", "build", "__pycache__", ".vite"}
INDEX_PATTERNS: Set[str] = {"index.js", "index.jsx", "index.ts", "index.tsx"}

# ═══════════════════════════════════════════════════════════════
# DETECTION PATTERNS
# ═══════════════════════════════════════════════════════════════

# Re-export patterns
RE_EXPORT_PATTERNS = [
    re.compile(r'^\s*export\s+\*\s+from\s+[\'"]', re.MULTILINE),           # export * from './foo'
    re.compile(r'^\s*export\s+\{[^}]+\}\s+from\s+[\'"]', re.MULTILINE),    # export { foo } from './foo'
    re.compile(r'^\s*export\s+\{\s*default\s*(as\s+\w+)?\s*\}\s+from', re.MULTILINE),  # export { default } from
    re.compile(r'^\s*export\s+default\s+from\s+[\'"]', re.MULTILINE),      # export default from './foo'
]

# Logic indicators (things that make a file NOT a pure barrel)
LOGIC_INDICATORS = [
    re.compile(r'\bfunction\s+\w+\s*\('),           # function declarations
    re.compile(r'\bconst\s+\w+\s*=\s*\([^)]*\)\s*=>'),  # arrow function assigned to const
    re.compile(r'\bconst\s+\w+\s*=\s*async\s*\('),  # async arrow function
    re.compile(r'\bclass\s+\w+'),                   # class declarations
    re.compile(r'\b(useState|useEffect|useMemo|useCallback|useRef|useContext)\b'),  # React hooks
    re.compile(r'return\s*\(\s*<'),                 # JSX return
    re.compile(r'<[A-Z][a-zA-Z0-9]*[\s/>]'),        # JSX component usage
    re.compile(r'\bimport\s+React\b'),              # React import (likely a component)
    re.compile(r'@param|@returns|@description'),    # JSDoc (indicates real logic)
]

# Source file extraction pattern
SOURCE_FILE_PATTERN = re.compile(r"from\s+['\"]([^'\"]+)['\"]")


# ═══════════════════════════════════════════════════════════════
# DATA STRUCTURES
# ═══════════════════════════════════════════════════════════════

@dataclass
class BarrelFile:
    """Represents an analyzed index file."""
    path: str
    category: Literal["PURE_BARREL", "MIXED", "ENTRY_POINT"]
    export_count: int
    has_logic: bool
    exports: List[str] = field(default_factory=list)
    source_files: List[str] = field(default_factory=list)
    line_count: int = 0
    reason: str = ""  # Why it was categorized this way


# ═══════════════════════════════════════════════════════════════
# ANALYSIS FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def strip_comments(content: str) -> str:
    """Remove JS/TS comments from content for cleaner analysis."""
    # Remove single-line comments
    content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
    # Remove multi-line comments
    content = re.sub(r'/\*[\s\S]*?\*/', '', content)
    return content


def count_reexports(content: str) -> int:
    """Count the number of re-export statements."""
    count = 0
    for pattern in RE_EXPORT_PATTERNS:
        count += len(pattern.findall(content))
    return count


def extract_source_files(content: str) -> List[str]:
    """Extract the source file paths from export statements."""
    matches = SOURCE_FILE_PATTERN.findall(content)
    # Deduplicate while preserving order
    seen = set()
    result = []
    for m in matches:
        if m not in seen:
            seen.add(m)
            result.append(m)
    return result


def extract_export_names(content: str) -> List[str]:
    """Extract names being exported."""
    exports = []

    # Named exports: export { foo, bar, baz as qux }
    named_pattern = re.compile(r'export\s+\{\s*([^}]+)\s*\}')
    for match in named_pattern.findall(content):
        names = match.split(',')
        for name in names:
            name = name.strip()
            # Handle 'foo as bar' syntax - take the original name
            if ' as ' in name:
                name = name.split(' as ')[0].strip()
            if name and name != 'default':
                exports.append(name)

    # Star exports: export * from
    if re.search(r'export\s+\*\s+from', content):
        exports.append('*')

    # Default exports
    if re.search(r'export\s+\{\s*default\s*\}|export\s+default', content):
        exports.append('default')

    return list(set(exports))


def has_logic_content(content: str) -> tuple[bool, str]:
    """Check if content contains actual logic (not just re-exports)."""
    for pattern in LOGIC_INDICATORS:
        match = pattern.search(content)
        if match:
            return True, f"Found: {match.group(0)[:50]}"

    # Also check for substantial non-export/import lines
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    logic_lines = 0
    for line in lines:
        # Skip common non-logic lines
        if any(line.startswith(prefix) for prefix in
               ('export', 'import', '//', '/*', '*', "'use", '"use', 'module.exports')):
            continue
        if line in ('{', '}', '};', ''):
            continue
        logic_lines += 1

    if logic_lines > 5:
        return True, f"Found {logic_lines} lines of potential logic"

    return False, ""


def analyze_file(filepath: str) -> BarrelFile:
    """Analyze a single index file and categorize it."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return BarrelFile(
            path=filepath,
            category="ENTRY_POINT",
            export_count=0,
            has_logic=False,
            reason=f"Could not read file: {e}"
        )

    line_count = len(content.split('\n'))
    clean_content = strip_comments(content)

    # Count re-exports
    export_count = count_reexports(clean_content)

    # Extract info
    source_files = extract_source_files(clean_content)
    exports = extract_export_names(clean_content)

    # Check for logic
    has_logic, logic_reason = has_logic_content(clean_content)

    # Categorize
    if export_count == 0:
        category = "ENTRY_POINT"
        reason = "No re-exports found (likely a component or entry file)"
    elif has_logic:
        category = "MIXED"
        reason = f"Has re-exports but also contains logic. {logic_reason}"
    else:
        category = "PURE_BARREL"
        reason = f"Only re-exports ({export_count} exports from {len(source_files)} source files)"

    return BarrelFile(
        path=filepath.replace('\\', '/'),  # Normalize path separators
        category=category,
        export_count=export_count,
        has_logic=has_logic,
        exports=exports,
        source_files=source_files,
        line_count=line_count,
        reason=reason
    )


def scan_codebase() -> List[BarrelFile]:
    """Scan the codebase for all index files."""
    barrels = []

    for search_path in SEARCH_PATHS:
        if not os.path.exists(search_path):
            print(f"Warning: Search path '{search_path}' does not exist", file=sys.stderr)
            continue

        for root, dirs, files in os.walk(search_path):
            # Skip ignored directories (modifies dirs in-place)
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

            for filename in files:
                if filename in INDEX_PATTERNS:
                    filepath = os.path.join(root, filename)
                    barrel = analyze_file(filepath)
                    barrels.append(barrel)

    # Sort by path for consistent output
    barrels.sort(key=lambda b: b.path)
    return barrels


# ═══════════════════════════════════════════════════════════════
# REPORT GENERATION
# ═══════════════════════════════════════════════════════════════

def generate_report(barrels: List[BarrelFile]) -> dict:
    """Generate a structured report from barrel analysis."""
    pure = [b for b in barrels if b.category == "PURE_BARREL"]
    mixed = [b for b in barrels if b.category == "MIXED"]
    entry = [b for b in barrels if b.category == "ENTRY_POINT"]

    # Group pure barrels by location
    logic_barrels = [b for b in pure if '/logic/' in b.path]
    page_barrels = [b for b in pure if '/pages/' in b.path]
    shared_barrels = [b for b in pure if '/shared/' in b.path]
    other_barrels = [b for b in pure if b not in logic_barrels + page_barrels + shared_barrels]

    return {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_index_files": len(barrels),
            "pure_barrels": len(pure),
            "mixed_files": len(mixed),
            "entry_points": len(entry),
            "by_location": {
                "logic_layer": len(logic_barrels),
                "page_components": len(page_barrels),
                "shared_components": len(shared_barrels),
                "other": len(other_barrels)
            }
        },
        "pure_barrels": [asdict(b) for b in pure],
        "mixed_files": [asdict(b) for b in mixed],
        "entry_points": [asdict(b) for b in entry]
    }


def format_human_readable(report: dict) -> str:
    """Format report for human reading."""
    lines = []

    lines.append("")
    lines.append("=" * 70)
    lines.append("                    BARREL FILE DETECTION REPORT")
    lines.append("=" * 70)
    lines.append(f"  Generated: {report['timestamp']}")
    lines.append("")

    s = report['summary']
    lines.append("  SUMMARY")
    lines.append("  " + "-" * 66)
    lines.append(f"    Total Index Files:    {s['total_index_files']}")
    lines.append(f"    Pure Barrels:         {s['pure_barrels']} (safe to remove)")
    lines.append(f"    Mixed Files:          {s['mixed_files']} (needs extraction)")
    lines.append(f"    Entry Points:         {s['entry_points']} (keep)")
    lines.append("")

    loc = s['by_location']
    lines.append("  PURE BARRELS BY LOCATION")
    lines.append("  " + "-" * 66)
    lines.append(f"    Logic Layer:          {loc['logic_layer']}")
    lines.append(f"    Page Components:      {loc['page_components']}")
    lines.append(f"    Shared Components:    {loc['shared_components']}")
    lines.append(f"    Other:                {loc['other']}")
    lines.append("")

    lines.append("  PURE BARRELS (Candidates for Removal)")
    lines.append("  " + "-" * 66)
    for b in report['pure_barrels']:
        exports = b['export_count']
        path = b['path']
        lines.append(f"    [{exports:2d} exports] {path}")
    lines.append("")

    if report['mixed_files']:
        lines.append("  MIXED FILES (Need Logic Extraction First)")
        lines.append("  " + "-" * 66)
        for b in report['mixed_files']:
            exports = b['export_count']
            path = b['path']
            reason = b['reason'][:50] + "..." if len(b['reason']) > 50 else b['reason']
            lines.append(f"    [{exports:2d} exports] {path}")
            lines.append(f"                 +-- {reason}")
        lines.append("")

    lines.append("=" * 70)
    lines.append("")

    return '\n'.join(lines)


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Detect and categorize barrel files in the codebase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python refactor/barrel_detector.py              # Human-readable output
  python refactor/barrel_detector.py --json       # JSON output
  python refactor/barrel_detector.py --pure-only  # Just paths of pure barrels
  python refactor/barrel_detector.py -o report.json --json
        """
    )
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--output", "-o", help="Write report to file")
    parser.add_argument("--pure-only", action="store_true",
                        help="Only list pure barrel paths (for piping to other tools)")
    parser.add_argument("--mixed-only", action="store_true",
                        help="Only list mixed file paths")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Show detailed analysis for each file")

    args = parser.parse_args()

    # Scan codebase
    barrels = scan_codebase()
    report = generate_report(barrels)

    # Handle output
    if args.pure_only:
        for b in report["pure_barrels"]:
            print(b["path"])
        return

    if args.mixed_only:
        for b in report["mixed_files"]:
            print(b["path"])
        return

    if args.json:
        output = json.dumps(report, indent=2)
    else:
        output = format_human_readable(report)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output)
        print(f"Report written to: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
