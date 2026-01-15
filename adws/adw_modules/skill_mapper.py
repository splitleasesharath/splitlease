"""Skill mapper for ADW overnight refactoring.

Maps file changes to relevant testing skills and provides
skill-based test commands for the overnight pipeline.
"""

from typing import List, Dict, Set
from dataclasses import dataclass
from pathlib import Path


@dataclass
class SkillMapping:
    """Mapping of a skill to test execution."""
    skill_name: str
    category: str
    test_command: str
    purpose: str
    timeout: int
    priority: int  # 1 = highest


# All 19 skills with their test commands
SKILL_DEFINITIONS: Dict[str, SkillMapping] = {
    # Infrastructure (foundation - run first)
    "vitest-rtl-setup": SkillMapping(
        skill_name="vitest-rtl-setup",
        category="infrastructure",
        test_command="npm run test -- --run",
        purpose="Verify Vitest + RTL configuration works",
        timeout=60,
        priority=1,
    ),
    "coverage-thresholds": SkillMapping(
        skill_name="coverage-thresholds",
        category="infrastructure",
        test_command="npm run test:coverage",
        purpose="Verify coverage meets configured thresholds",
        timeout=120,
        priority=2,
    ),
    "test-file-colocation": SkillMapping(
        skill_name="test-file-colocation",
        category="infrastructure",
        test_command="npm run test -- --run",
        purpose="Verify colocated tests are discovered",
        timeout=60,
        priority=1,
    ),
    "test-sharding-ci": SkillMapping(
        skill_name="test-sharding-ci",
        category="infrastructure",
        test_command="npx playwright test --shard=1/1",
        purpose="Verify test sharding configuration",
        timeout=120,
        priority=3,
    ),

    # Mocking (core testing capability)
    "mocking-supabase-msw": SkillMapping(
        skill_name="mocking-supabase-msw",
        category="mocking",
        test_command="npm run test -- --run --grep 'supabase|Supabase'",
        purpose="Verify Supabase API mocking works",
        timeout=60,
        priority=2,
    ),
    "mocking-auth-context": SkillMapping(
        skill_name="mocking-auth-context",
        category="mocking",
        test_command="npm run test -- --run --grep 'auth|Auth'",
        purpose="Verify auth context mocking works",
        timeout=60,
        priority=2,
    ),
    "mocking-twilio-sms": SkillMapping(
        skill_name="mocking-twilio-sms",
        category="mocking",
        test_command="npm run test -- --run --grep 'sms|SMS|twilio|Twilio'",
        purpose="Verify Twilio SMS mocking works",
        timeout=60,
        priority=3,
    ),
    "testing-stripe-payments": SkillMapping(
        skill_name="testing-stripe-payments",
        category="mocking",
        test_command="npm run test -- --run --grep 'stripe|Stripe|payment|Payment'",
        purpose="Verify Stripe payment mocking works",
        timeout=60,
        priority=2,
    ),
    "webhook-handler-tests": SkillMapping(
        skill_name="webhook-handler-tests",
        category="mocking",
        test_command="npm run test -- --run --grep 'webhook|Webhook'",
        purpose="Verify webhook handler testing works",
        timeout=60,
        priority=2,
    ),

    # Component testing
    "testing-custom-hooks": SkillMapping(
        skill_name="testing-custom-hooks",
        category="component",
        test_command="npm run test -- --run --grep 'hook|Hook'",
        purpose="Verify hook testing with renderHook works",
        timeout=60,
        priority=2,
    ),
    "testing-form-submissions": SkillMapping(
        skill_name="testing-form-submissions",
        category="component",
        test_command="npm run test -- --run --grep 'form|Form'",
        purpose="Verify form testing with userEvent works",
        timeout=60,
        priority=2,
    ),
    "testing-async-loading-states": SkillMapping(
        skill_name="testing-async-loading-states",
        category="component",
        test_command="npm run test -- --run --grep 'async|loading|Loading'",
        purpose="Verify async state testing works",
        timeout=60,
        priority=2,
    ),
    "accessible-query-patterns": SkillMapping(
        skill_name="accessible-query-patterns",
        category="component",
        test_command="npm run test -- --run",
        purpose="Verify accessible queries are used",
        timeout=60,
        priority=1,
    ),

    # E2E testing
    "page-object-model": SkillMapping(
        skill_name="page-object-model",
        category="e2e",
        test_command="npx playwright test --grep '@pom'",
        purpose="Verify Page Object Model tests work",
        timeout=180,
        priority=3,
    ),
    "visual-regression-testing": SkillMapping(
        skill_name="visual-regression-testing",
        category="e2e",
        test_command="npx playwright test --grep '@visual'",
        purpose="Verify visual regression tests work",
        timeout=300,
        priority=4,
    ),
    "reusable-auth-state": SkillMapping(
        skill_name="reusable-auth-state",
        category="e2e",
        test_command="npx playwright test --project=setup",
        purpose="Verify auth state persistence works",
        timeout=60,
        priority=2,
    ),
    "websocket-realtime-testing": SkillMapping(
        skill_name="websocket-realtime-testing",
        category="e2e",
        test_command="npx playwright test --grep 'websocket|realtime'",
        purpose="Verify WebSocket testing works",
        timeout=120,
        priority=3,
    ),

    # Database testing
    "testing-rls-pgtap": SkillMapping(
        skill_name="testing-rls-pgtap",
        category="database",
        test_command="supabase test db",
        purpose="Verify RLS policy tests pass",
        timeout=120,
        priority=2,
    ),
    "database-seed-scripts": SkillMapping(
        skill_name="database-seed-scripts",
        category="database",
        test_command="supabase db reset --debug",
        purpose="Verify seed scripts work",
        timeout=180,
        priority=3,
    ),
}


# File pattern to skill mapping
FILE_PATTERN_SKILLS: Dict[str, List[str]] = {
    # Component files
    r"\.tsx$": [
        "vitest-rtl-setup",
        "testing-form-submissions",
        "testing-async-loading-states",
        "accessible-query-patterns",
    ],

    # Hook files
    r"hooks?/.*\.ts$": [
        "testing-custom-hooks",
    ],

    # Payment/Stripe related
    r"(payment|stripe|checkout).*\.(ts|tsx)$": [
        "testing-stripe-payments",
        "webhook-handler-tests",
    ],

    # Auth related
    r"(auth|login|signup).*\.(ts|tsx)$": [
        "mocking-auth-context",
        "reusable-auth-state",
    ],

    # API/Service files
    r"(api|service)s?/.*\.ts$": [
        "mocking-supabase-msw",
    ],

    # Webhook handlers
    r"webhooks?/.*\.ts$": [
        "webhook-handler-tests",
    ],

    # Realtime/WebSocket
    r"(realtime|websocket|chat).*\.(ts|tsx)$": [
        "websocket-realtime-testing",
    ],

    # SMS/Notification
    r"(sms|notification|twilio).*\.ts$": [
        "mocking-twilio-sms",
    ],

    # SQL/Database
    r"\.sql$": [
        "testing-rls-pgtap",
        "database-seed-scripts",
    ],

    # Test files (suggest improvements)
    r"\.test\.(ts|tsx)$": [
        "accessible-query-patterns",
        "coverage-thresholds",
    ],

    # E2E test files
    r"\.spec\.(ts|tsx)$": [
        "page-object-model",
        "visual-regression-testing",
    ],
}


def select_skills_for_files(changed_files: List[str]) -> List[SkillMapping]:
    """Select relevant skills based on changed files.

    Args:
        changed_files: List of file paths that were changed

    Returns:
        List of relevant skills, sorted by priority
    """
    import re

    selected_skills: Set[str] = set()

    for file_path in changed_files:
        for pattern, skills in FILE_PATTERN_SKILLS.items():
            if re.search(pattern, file_path, re.IGNORECASE):
                selected_skills.update(skills)

    # Always include infrastructure skills
    selected_skills.add("vitest-rtl-setup")

    # Convert to SkillMapping objects
    mappings = [
        SKILL_DEFINITIONS[name]
        for name in selected_skills
        if name in SKILL_DEFINITIONS
    ]

    # Sort by priority (lowest number = highest priority)
    return sorted(mappings, key=lambda m: m.priority)


def select_skills_for_category(category: str) -> List[SkillMapping]:
    """Get all skills for a specific category.

    Args:
        category: One of 'infrastructure', 'mocking', 'component', 'e2e', 'database'

    Returns:
        List of skills in that category
    """
    return [
        mapping
        for mapping in SKILL_DEFINITIONS.values()
        if mapping.category == category
    ]


def get_test_commands_for_skills(skills: List[SkillMapping]) -> List[Dict]:
    """Generate test commands from selected skills.

    Args:
        skills: List of skill mappings

    Returns:
        List of test definitions compatible with test_suite.py format
    """
    return [
        {
            "name": skill.skill_name,
            "command": skill.test_command,
            "purpose": skill.purpose,
            "timeout": skill.timeout,
            "category": skill.category,
        }
        for skill in skills
    ]


def get_skill_documentation_path(skill_name: str) -> str:
    """Get the path to skill documentation.

    Args:
        skill_name: Name of the skill

    Returns:
        Relative path to the skill markdown file
    """
    return f"TAC/skills/{skill_name}.md"


def analyze_coverage_gaps(
    coverage_report: Dict,
    changed_files: List[str]
) -> List[SkillMapping]:
    """Suggest skills based on coverage gaps.

    Args:
        coverage_report: Coverage report JSON
        changed_files: List of changed files

    Returns:
        Skills that could improve coverage
    """
    suggestions: List[str] = []

    # If coverage below 80%, suggest coverage skill
    total_coverage = coverage_report.get("total", {}).get("lines", {}).get("pct", 100)
    if total_coverage < 80:
        suggestions.append("coverage-thresholds")

    # Check for uncovered files
    uncovered = [
        f for f, data in coverage_report.get("files", {}).items()
        if data.get("lines", {}).get("pct", 100) < 50
    ]

    # Map uncovered files to skills
    for file_path in uncovered:
        if "hook" in file_path.lower():
            suggestions.append("testing-custom-hooks")
        elif file_path.endswith(".tsx"):
            suggestions.append("testing-form-submissions")
            suggestions.append("testing-async-loading-states")

    return [
        SKILL_DEFINITIONS[name]
        for name in set(suggestions)
        if name in SKILL_DEFINITIONS
    ]


# Integration with ADW test suite
def generate_skill_test_suite(
    changed_files: List[str],
    include_e2e: bool = False,
    include_database: bool = False
) -> Dict[str, List[tuple]]:
    """Generate a test suite based on selected skills.

    Args:
        changed_files: List of changed file paths
        include_e2e: Whether to include E2E tests
        include_database: Whether to include database tests

    Returns:
        Dictionary compatible with test_suite.py CORE_TESTS format
    """
    skills = select_skills_for_files(changed_files)

    # Filter by category if needed
    if not include_e2e:
        skills = [s for s in skills if s.category != "e2e"]
    if not include_database:
        skills = [s for s in skills if s.category != "database"]

    # Group by category
    test_suite: Dict[str, List[tuple]] = {}

    for skill in skills:
        category = skill.category
        if category not in test_suite:
            test_suite[category] = []

        # Format: (name, command, purpose, timeout, impact)
        test_suite[category].append((
            skill.skill_name,
            skill.test_command,
            skill.purpose,
            skill.timeout,
            10 - skill.priority,  # Convert priority to impact score
        ))

    return test_suite


# Example usage in ADW context
if __name__ == "__main__":
    # Example: Files changed in a PR
    changed_files = [
        "src/components/LoginForm.tsx",
        "src/hooks/useAuth.ts",
        "src/services/paymentService.ts",
    ]

    print("Changed files:")
    for f in changed_files:
        print(f"  - {f}")

    print("\nSelected skills:")
    skills = select_skills_for_files(changed_files)
    for skill in skills:
        print(f"  [{skill.category}] {skill.skill_name}")
        print(f"    Command: {skill.test_command}")
        print(f"    Purpose: {skill.purpose}")
        print()

    print("\nGenerated test suite:")
    suite = generate_skill_test_suite(changed_files)
    for category, tests in suite.items():
        print(f"\n[{category}]")
        for test in tests:
            print(f"  - {test[0]}: {test[1]}")
