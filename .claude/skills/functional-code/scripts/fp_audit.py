#!/usr/bin/env python3
"""
Functional Programming Audit Script
Scans JavaScript/TypeScript codebase for FP violations and suggests actionable fixes.

Usage:
    python fp_audit.py [path] [--output json|markdown] [--severity all|high|medium]
"""

import ast
import json
import re
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional
from enum import Enum


class Severity(Enum):
    HIGH = "high"        # Clear violation, must fix
    MEDIUM = "medium"    # Should fix for better FP adherence
    LOW = "low"          # Nice to have, optional improvement


class ViolationType(Enum):
    # Principle 1: PURITY
    IMPURE_FUNCTION = "impure_function"
    SIDE_EFFECT = "side_effect"

    # Principle 2: IMMUTABILITY
    MUTATION = "mutation"
    MUTATING_METHOD = "mutating_method"

    # Principle 3: EXPLICIT DEPENDENCIES
    GLOBAL_ACCESS = "global_access"
    HIDDEN_DEPENDENCY = "hidden_dependency"

    # Principle 4: EFFECTS AT EDGES
    IO_IN_CORE = "io_in_core"
    MIXED_PURE_IMPURE = "mixed_pure_impure"

    # Principle 5: ERRORS AS VALUES
    EXCEPTION_FOR_FLOW = "exception_for_flow"
    NO_ERROR_TYPE = "no_error_type"

    # Principle 6: DECLARATIVE STYLE
    IMPERATIVE_LOOP = "imperative_loop"

    # Principle 7: COMPOSITION
    FUNCTION_TOO_LARGE = "function_too_large"


@dataclass
class FPViolation:
    """Represents a single FP principle violation."""
    file_path: str
    line_number: int
    violation_type: ViolationType
    severity: Severity
    principle: str
    description: str
    current_code: str
    suggested_fix: str
    rationale: str


class JavaScriptFPAuditor:
    """Audits JavaScript/TypeScript files for FP violations."""

    # Patterns that indicate mutations
    MUTATION_PATTERNS = [
        r'\.push\(',
        r'\.pop\(',
        r'\.shift\(',
        r'\.unshift\(',
        r'\.splice\(',
        r'\.sort\(',
        r'\.reverse\(',
        r'\.fill\(',
        r'\+\+',
        r'--',
        r'[^=!<>]=(?!=)',  # Assignment operators (x = y, but not ==, !=, <=, >=)
    ]

    # Patterns that indicate I/O operations
    IO_PATTERNS = [
        r'console\.',
        r'fetch\(',
        r'localStorage\.',
        r'sessionStorage\.',
        r'document\.',
        r'window\.',
        r'\.save\(',
        r'\.update\(',
        r'\.delete\(',
        r'\.insert\(',
        r'supabase\.',
        r'await.*\.query\(',
    ]

    # Imperative loop patterns
    IMPERATIVE_LOOP_PATTERNS = [
        r'for\s*\(',
        r'while\s*\(',
        r'do\s*{',
    ]

    # Exception patterns (not error returns)
    EXCEPTION_PATTERNS = [
        r'throw new Error',
        r'throw new',
    ]

    def __init__(self, root_path: str):
        self.root_path = Path(root_path)
        self.violations: List[FPViolation] = []

    def audit(self) -> List[FPViolation]:
        """Run full audit on codebase."""
        js_files = list(self.root_path.glob('**/*.js')) + \
                   list(self.root_path.glob('**/*.jsx')) + \
                   list(self.root_path.glob('**/*.ts')) + \
                   list(self.root_path.glob('**/*.tsx'))

        for file_path in js_files:
            # Skip node_modules, dist, build
            if any(part in file_path.parts for part in ['node_modules', 'dist', 'build', '.next']):
                continue

            self._audit_file(file_path)

        return self.violations

    def _audit_file(self, file_path: Path):
        """Audit a single JavaScript/TypeScript file."""
        try:
            content = file_path.read_text(encoding='utf-8')
            lines = content.split('\n')

            for line_num, line in enumerate(lines, start=1):
                self._check_mutations(file_path, line_num, line)
                self._check_io_operations(file_path, line_num, line, lines)
                self._check_imperative_loops(file_path, line_num, line, lines)
                self._check_exceptions(file_path, line_num, line, lines)

        except Exception as e:
            print(f"Warning: Could not audit {file_path}: {e}")

    def _check_mutations(self, file_path: Path, line_num: int, line: str):
        """Check for mutation patterns."""
        for pattern in self.MUTATION_PATTERNS:
            if re.search(pattern, line):
                # Skip if it's in a comment
                if line.strip().startswith('//') or line.strip().startswith('*'):
                    continue

                # Detect specific mutation types
                if '.push(' in line or '.pop(' in line or '.shift(' in line or '.unshift(' in line:
                    self.violations.append(FPViolation(
                        file_path=str(file_path.relative_to(self.root_path)),
                        line_number=line_num,
                        violation_type=ViolationType.MUTATING_METHOD,
                        severity=Severity.HIGH,
                        principle="IMMUTABILITY",
                        description="Using mutating array method",
                        current_code=line.strip(),
                        suggested_fix="Use spread operator or immutable methods: [...arr, item] instead of arr.push(item)",
                        rationale="Mutating methods modify the original array, making code harder to test and reason about."
                    ))
                    break

                elif '.sort(' in line or '.reverse(' in line:
                    self.violations.append(FPViolation(
                        file_path=str(file_path.relative_to(self.root_path)),
                        line_number=line_num,
                        violation_type=ViolationType.MUTATING_METHOD,
                        severity=Severity.HIGH,
                        principle="IMMUTABILITY",
                        description="Using mutating array sort/reverse",
                        current_code=line.strip(),
                        suggested_fix="Use toSorted() or toReversed(), or [...arr].sort()",
                        rationale="sort() and reverse() mutate the original array. Use immutable alternatives."
                    ))
                    break

    def _check_io_operations(self, file_path: Path, line_num: int, line: str, all_lines: List[str]):
        """Check for I/O operations in business logic."""
        # Determine if this is a workflow file (allowed to have I/O)
        is_workflow = 'workflow' in file_path.name.lower() or 'workflows' in str(file_path)
        is_shell = 'handler' in file_path.name.lower() or 'controller' in file_path.name.lower()

        # If it's in calculators/rules/processors, flag I/O as violation
        is_core_logic = any(part in str(file_path) for part in ['calculators', 'rules', 'processors'])

        if is_core_logic and not is_workflow:
            for pattern in self.IO_PATTERNS:
                if re.search(pattern, line):
                    # Skip comments
                    if line.strip().startswith('//') or line.strip().startswith('*'):
                        continue

                    self.violations.append(FPViolation(
                        file_path=str(file_path.relative_to(self.root_path)),
                        line_number=line_num,
                        violation_type=ViolationType.IO_IN_CORE,
                        severity=Severity.HIGH,
                        principle="EFFECTS AT EDGES",
                        description="I/O operation found in core business logic",
                        current_code=line.strip(),
                        suggested_fix="Move I/O to workflow/handler layer. Pass data as parameters instead.",
                        rationale="Pure business logic (calculators/rules/processors) should not perform I/O. This makes testing harder and violates Functional Core principle."
                    ))
                    break

    def _check_imperative_loops(self, file_path: Path, line_num: int, line: str, all_lines: List[str]):
        """Check for imperative loops that could be declarative."""
        for pattern in self.IMPERATIVE_LOOP_PATTERNS:
            if re.search(pattern, line):
                # Skip comments
                if line.strip().startswith('//') or line.strip().startswith('*'):
                    continue

                # Check if loop contains mutation (higher severity)
                loop_body = self._extract_loop_body(all_lines, line_num)
                has_mutation = any(re.search(mp, loop_body) for mp in self.MUTATION_PATTERNS)

                self.violations.append(FPViolation(
                    file_path=str(file_path.relative_to(self.root_path)),
                    line_number=line_num,
                    violation_type=ViolationType.IMPERATIVE_LOOP,
                    severity=Severity.MEDIUM if not has_mutation else Severity.HIGH,
                    principle="DECLARATIVE STYLE",
                    description="Imperative loop found (consider map/filter/reduce)",
                    current_code=line.strip(),
                    suggested_fix="Replace with map/filter/reduce or other declarative array methods",
                    rationale="Declarative array methods (map/filter/reduce) are more expressive and less error-prone than imperative loops."
                ))
                break

    def _check_exceptions(self, file_path: Path, line_num: int, line: str, all_lines: List[str]):
        """Check for exceptions used for control flow."""
        for pattern in self.EXCEPTION_PATTERNS:
            if re.search(pattern, line):
                # Skip comments
                if line.strip().startswith('//') or line.strip().startswith('*'):
                    continue

                # Determine if this is expected error (validation) or unexpected (bug)
                # Heuristic: if exception message contains "must", "invalid", "cannot", it's validation
                is_validation = any(keyword in line.lower() for keyword in ['must', 'invalid', 'cannot', 'required', 'should'])

                if is_validation:
                    self.violations.append(FPViolation(
                        file_path=str(file_path.relative_to(self.root_path)),
                        line_number=line_num,
                        violation_type=ViolationType.EXCEPTION_FOR_FLOW,
                        severity=Severity.MEDIUM,
                        principle="ERRORS AS VALUES",
                        description="Exception used for validation/expected errors",
                        current_code=line.strip(),
                        suggested_fix="Return Result<T, E> type: return err('validation message') instead of throw",
                        rationale="Expected errors (validation, not found, etc.) should be return values, not exceptions. This makes error handling explicit and type-safe."
                    ))

    def _extract_loop_body(self, lines: List[str], start_line: int, max_lines: int = 20) -> str:
        """Extract loop body for analysis (simplified)."""
        body_lines = []
        brace_count = 0
        found_open_brace = False

        for i in range(start_line - 1, min(start_line + max_lines, len(lines))):
            line = lines[i]
            body_lines.append(line)

            if '{' in line:
                found_open_brace = True
                brace_count += line.count('{')

            if found_open_brace:
                brace_count -= line.count('}')
                if brace_count == 0:
                    break

        return '\n'.join(body_lines)


def generate_markdown_report(violations: List[FPViolation], output_path: Optional[str] = None) -> str:
    """Generate markdown report of violations."""
    # Group by principle
    by_principle: Dict[str, List[FPViolation]] = {}
    for v in violations:
        if v.principle not in by_principle:
            by_principle[v.principle] = []
        by_principle[v.principle].append(v)

    # Sort by severity within each principle
    severity_order = {Severity.HIGH: 0, Severity.MEDIUM: 1, Severity.LOW: 2}
    for principle in by_principle:
        by_principle[principle].sort(key=lambda v: severity_order[v.severity])

    report = f"""# Functional Programming Audit Report

**Total Violations:** {len(violations)}

## Summary by Severity

- 🔴 **High:** {sum(1 for v in violations if v.severity == Severity.HIGH)}
- 🟡 **Medium:** {sum(1 for v in violations if v.severity == Severity.MEDIUM)}
- 🟢 **Low:** {sum(1 for v in violations if v.severity == Severity.LOW)}

## Summary by Principle

"""

    for principle, viols in sorted(by_principle.items()):
        report += f"- **{principle}:** {len(viols)} violations\n"

    report += "\n---\n\n"

    # Detailed violations by principle
    for principle, viols in sorted(by_principle.items()):
        report += f"## {principle}\n\n"
        report += f"**{len(viols)} violations**\n\n"

        for v in viols:
            severity_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}[v.severity.value]
            report += f"### {severity_icon} {v.file_path}:{v.line_number}\n\n"
            report += f"**Type:** {v.violation_type.value.replace('_', ' ').title()}\n\n"
            report += f"**Description:** {v.description}\n\n"
            report += f"**Current Code:**\n```javascript\n{v.current_code}\n```\n\n"
            report += f"**Suggested Fix:**\n{v.suggested_fix}\n\n"
            report += f"**Rationale:** {v.rationale}\n\n"
            report += "---\n\n"

    if output_path:
        Path(output_path).write_text(report, encoding='utf-8')
        print(f"Report written to {output_path}")

    return report


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Audit JavaScript codebase for FP violations')
    parser.add_argument('path', nargs='?', default='.', help='Path to audit (default: current directory)')
    parser.add_argument('--output', choices=['json', 'markdown'], default='markdown', help='Output format')
    parser.add_argument('--severity', choices=['all', 'high', 'medium', 'low'], default='all', help='Filter by severity')
    parser.add_argument('--file', type=str, help='Output file path')

    args = parser.parse_args()

    print(f"Auditing {args.path}...")
    auditor = JavaScriptFPAuditor(args.path)
    violations = auditor.audit()

    # Filter by severity
    if args.severity != 'all':
        severity_filter = Severity(args.severity)
        violations = [v for v in violations if v.severity == severity_filter]

    print(f"Found {len(violations)} violations")

    if args.output == 'json':
        output = json.dumps([asdict(v) for v in violations], indent=2, default=str)
        if args.file:
            Path(args.file).write_text(output, encoding='utf-8')
        else:
            print(output)
    else:
        report = generate_markdown_report(violations, args.file)
        if not args.file:
            print(report)


if __name__ == '__main__':
    main()
