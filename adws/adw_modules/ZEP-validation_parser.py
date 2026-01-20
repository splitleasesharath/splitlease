"""
Validation Response Parser - Structured JSON validation result parsing

Parses Claude's validation responses into structured format with
strict validation rules.
"""

import json
import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .config import VALIDATION_MIN_CONFIDENCE


@dataclass
class ValidationDifference:
    """Represents a single visual difference detected."""
    type: str  # layout, styling, content, interaction, console_error
    description: str
    severity: str  # critical, major, minor


@dataclass
class ValidationResult:
    """Structured validation result."""
    verdict: str  # PASS, FAIL, ERROR
    confidence: int  # 0-100
    differences: List[ValidationDifference]
    summary: str
    passed: bool  # Computed field
    raw_output: str  # Original Claude response


def parse_validation_response(output: str) -> ValidationResult:
    """Parse validation response from Claude.

    Expected format:
    ```json
    {
      "verdict": "PASS",
      "confidence": 95,
      "visual_differences": [],
      "summary": "Pages are visually identical"
    }
    ```

    Args:
        output: Raw output from Claude browser interaction

    Returns:
        ValidationResult with parsed data

    Validation Rules:
        - PASS verdict requires:
          * confidence >= VALIDATION_MIN_CONFIDENCE (80)
          * Empty visual_differences array
          * No contradictions in summary
        - FAIL verdict: Any visual differences detected
        - ERROR verdict: Validation couldn't complete
    """
    # Try to extract JSON from markdown code block first
    json_match = re.search(r'```json\s*(\{.*?\})\s*```', output, re.DOTALL)

    if not json_match:
        # Try to find raw JSON object
        json_match = re.search(r'(\{[^{}]*"verdict"[^{}]*\})', output, re.DOTALL)

    if not json_match:
        # No JSON found - treat as parse error
        return ValidationResult(
            verdict='ERROR',
            confidence=0,
            differences=[ValidationDifference(
                type='parse_error',
                description='Could not find JSON response in output',
                severity='critical'
            )],
            summary='Parse error: No JSON found',
            passed=False,
            raw_output=output
        )

    # Try to parse JSON
    try:
        data = json.loads(json_match.group(1))
    except json.JSONDecodeError as e:
        return ValidationResult(
            verdict='ERROR',
            confidence=0,
            differences=[ValidationDifference(
                type='parse_error',
                description=f'JSON decode error: {str(e)}',
                severity='critical'
            )],
            summary='Parse error: Invalid JSON',
            passed=False,
            raw_output=output
        )

    # Validate required fields
    if 'verdict' not in data:
        return ValidationResult(
            verdict='ERROR',
            confidence=0,
            differences=[ValidationDifference(
                type='parse_error',
                description='Missing required field: verdict',
                severity='critical'
            )],
            summary='Parse error: Missing verdict field',
            passed=False,
            raw_output=output
        )

    # Extract fields
    verdict = str(data['verdict']).upper()
    confidence = int(data.get('confidence', 0))
    summary = str(data.get('summary', ''))

    # Parse visual differences
    raw_diffs = data.get('visual_differences', [])
    differences = []

    if isinstance(raw_diffs, list):
        for diff in raw_diffs:
            if isinstance(diff, dict):
                differences.append(ValidationDifference(
                    type=diff.get('type', 'unknown'),
                    description=diff.get('description', ''),
                    severity=diff.get('severity', 'minor')
                ))

    # Validate verdict consistency
    validated_verdict = verdict
    passed = False

    if verdict == 'PASS':
        # PASS must meet strict criteria
        if len(differences) > 0:
            # Contradiction: PASS but has differences
            validated_verdict = 'FAIL'
            passed = False
            summary = f"Contradiction: Verdict was PASS but {len(differences)} differences listed"

        elif confidence < VALIDATION_MIN_CONFIDENCE:
            # Low confidence PASS -> treat as ERROR
            validated_verdict = 'ERROR'
            passed = False
            differences.append(ValidationDifference(
                type='low_confidence',
                description=f'Confidence {confidence}% below threshold {VALIDATION_MIN_CONFIDENCE}%',
                severity='major'
            ))
            summary = f"Low confidence PASS ({confidence}%) treated as ERROR"

        else:
            # Valid PASS
            passed = True

    elif verdict == 'FAIL':
        # FAIL is straightforward
        passed = False
        if len(differences) == 0:
            # FAIL should have differences
            differences.append(ValidationDifference(
                type='unspecified',
                description='Verdict was FAIL but no differences listed',
                severity='major'
            ))

    elif verdict == 'ERROR':
        # ERROR means validation couldn't complete
        passed = False

    else:
        # Unknown verdict
        validated_verdict = 'ERROR'
        passed = False
        differences.append(ValidationDifference(
            type='invalid_verdict',
            description=f'Unknown verdict: {verdict}',
            severity='critical'
        ))
        summary = f'Invalid verdict: {verdict}'

    return ValidationResult(
        verdict=validated_verdict,
        confidence=confidence,
        differences=differences,
        summary=summary,
        passed=passed,
        raw_output=output
    )


def format_validation_result(result: ValidationResult) -> str:
    """Format validation result as human-readable string.

    Args:
        result: ValidationResult to format

    Returns:
        Formatted multi-line string
    """
    lines = []
    lines.append(f"Verdict: {result.verdict}")
    lines.append(f"Confidence: {result.confidence}%")
    lines.append(f"Passed: {'✅ Yes' if result.passed else '❌ No'}")

    if result.differences:
        lines.append(f"\nDifferences ({len(result.differences)}):")
        for i, diff in enumerate(result.differences, 1):
            lines.append(f"  {i}. [{diff.severity.upper()}] {diff.type}: {diff.description}")
    else:
        lines.append("\nDifferences: None")

    lines.append(f"\nSummary: {result.summary}")

    return '\n'.join(lines)
