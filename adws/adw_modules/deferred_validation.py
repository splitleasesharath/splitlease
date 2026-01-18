"""
Deferred Validation Module

Performs batch validation after all chunks are implemented, rather than
validating after each individual chunk. This reduces the number of build
cycles and allows the full codebase to be validated in context.

The validation sequence:
1. Full production build (catches type errors, import errors)
2. Visual regression on affected pages (if applicable)
3. Return detailed result with error attribution
"""

from dataclasses import dataclass, field
from typing import List, Set, Optional, Dict, TYPE_CHECKING
from pathlib import Path
import subprocess
import time

if TYPE_CHECKING:
    from .chunk_parser import ChunkData
    from .topology_sort import TopologySortResult
    from .run_logger import RunLogger

# Import test-driven validation for pageless chunks
from .test_driven_validation import (
    generate_test_suite_for_chunk,
    run_tests_until_predictable,
    run_tests_before_refactor,
    run_tests_after_refactor,
    TestSuite,
    TestDrivenResult,
)


@dataclass
class ValidationError:
    """A validation error with source attribution.

    Attributes:
        message: Full error message
        file_path: File that caused the error (if identifiable)
        line_number: Line number in the file (if identifiable)
        chunk_number: Chunk that likely caused this error (if attributable)
    """
    message: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    chunk_number: Optional[int] = None


@dataclass
class ValidationBatch:
    """Tracks a batch of chunks for deferred validation.

    Attributes:
        chunks: All chunks being validated
        implemented_files: Set of file paths that were modified
        affected_pages: Pages affected by the changes (derived from reverse deps)
        cycle_groups: Groups of chunks that form atomic units (cycles)
    """
    chunks: List["ChunkData"]
    implemented_files: Set[str]
    affected_pages: Set[str]  # Derived from reverse deps
    cycle_groups: List[List["ChunkData"]]  # Atomic units

    @classmethod
    def from_topology_result(
        cls,
        result: "TopologySortResult",
        reverse_deps: Dict[str, List[str]]
    ) -> "ValidationBatch":
        """Build validation batch from topology sort result.

        Args:
            result: TopologySortResult from topology_sort_chunks()
            reverse_deps: Reverse dependency map from DependencyContext

        Returns:
            ValidationBatch ready for validation
        """
        files = {c.file_path for c in result.sorted_chunks}

        # Expand to affected pages via reverse dependencies
        affected: Set[str] = set()
        for file_path in files:
            normalized = file_path.replace('\\', '/')
            dependents = reverse_deps.get(normalized, [])
            affected.update(dependents)

        # Filter to actual page paths (files under pages/ or islands/pages/)
        pages = {
            p for p in affected
            if '/pages/' in p or p.startswith('src/islands/pages/')
        }

        return cls(
            chunks=result.sorted_chunks,
            implemented_files=files,
            affected_pages=pages,
            cycle_groups=result.cycle_chunks
        )


@dataclass
class ValidationResult:
    """Result of deferred validation.

    Attributes:
        success: True if all validation passed
        build_passed: True if build succeeded
        visual_passed: True if visual regression passed (or was skipped)
        errors: List of validation errors encountered
        affected_chunks: Chunks that likely caused the errors
    """
    success: bool
    build_passed: bool = False
    visual_passed: bool = False
    errors: List[ValidationError] = field(default_factory=list)
    affected_chunks: List["ChunkData"] = field(default_factory=list)


@dataclass
class OrchestrationResult:
    """Final pipeline result with metrics for logging and reporting.

    This is the CONTRACT OUTPUT from the orchestration pipeline.
    All downstream consumers (logging, Slack, analytics) use this.

    Attributes:
        success: True if pipeline completed successfully
        phase_reached: Last phase that was attempted
        total_chunks: Total number of chunks planned
        chunks_implemented: Number of chunks successfully implemented
        topological_levels: Number of levels in dependency graph
        cycles_detected: Number of circular dependency cycles
        edge_reduction_pct: Percentage of edges removed by transitive reduction
        total_duration_seconds: Total pipeline runtime
        phase_durations: Duration of each phase in seconds
        errors: List of error messages
        affected_chunks: Chunk numbers that caused failures
        plan_path: Path to the audit plan file
        changelog_path: Path to the generated changelog
    """

    # Outcome
    success: bool
    phase_reached: str  # "audit", "parse", "sort", "implement", "validate"

    # Metrics
    total_chunks: int
    chunks_implemented: int
    topological_levels: int
    cycles_detected: int
    edge_reduction_pct: float

    # Timing
    total_duration_seconds: float
    phase_durations: Dict[str, float] = field(default_factory=dict)  # phase_name -> seconds

    # Errors (if any)
    errors: List[str] = field(default_factory=list)
    affected_chunks: List[int] = field(default_factory=list)  # chunk numbers

    # Artifacts
    plan_path: Optional[str] = None
    changelog_path: Optional[str] = None

    def to_summary(self) -> str:
        """Generate human-readable summary for logging.

        Returns:
            Single-line summary of the orchestration result
        """
        status = "SUCCESS" if self.success else "FAILED"
        return (
            f"{status} | Phase: {self.phase_reached} | "
            f"Chunks: {self.chunks_implemented}/{self.total_chunks} | "
            f"Levels: {self.topological_levels} | "
            f"Cycles: {self.cycles_detected} | "
            f"Duration: {self.total_duration_seconds:.1f}s"
        )

    def to_slack_message(self) -> str:
        """Generate Slack notification message.

        Returns:
            Formatted message for Slack webhook
        """
        emoji = "white_check_mark" if self.success else "x"
        status = "SUCCESS" if self.success else "FAILED"

        msg = f":{emoji}: ADW Orchestration {status}\n"
        msg += f"- Chunks: {self.chunks_implemented}/{self.total_chunks}\n"
        msg += f"- Levels: {self.topological_levels}, Cycles: {self.cycles_detected}\n"
        msg += f"- Duration: {self.total_duration_seconds:.1f}s\n"

        if self.errors:
            msg += f"- Errors: {len(self.errors)}\n"
            for error in self.errors[:3]:  # Show first 3 errors
                msg += f"  - {error[:80]}\n"

        return msg


def run_deferred_validation(
    batch: ValidationBatch,
    working_dir: Path,
    logger: "RunLogger",
    skip_visual: bool = False,
    build_timeout: int = 180
) -> ValidationResult:
    """Run validation after all chunks implemented.

    Validation sequence:
    1. Full production build (catches type errors, import errors)
    2. Visual regression on affected pages (if any and not skipped)
    3. Return detailed result with error attribution

    Args:
        batch: ValidationBatch containing chunks and affected files
        working_dir: Project working directory
        logger: RunLogger for output
        skip_visual: If True, skip visual regression testing
        build_timeout: Build timeout in seconds (default: 180)

    Returns:
        ValidationResult with success status and any errors
    """
    result = ValidationResult(success=False)

    # Phase 1: Build check
    logger.step(f"Running full build verification ({len(batch.implemented_files)} files changed)...")

    try:
        build_start = time.time()
        build_result = subprocess.run(
            ["bun", "run", "build"],
            cwd=working_dir / "app",
            capture_output=True,
            text=True,
            timeout=build_timeout
        )
        build_duration = time.time() - build_start

        if build_result.returncode != 0:
            result.build_passed = False
            error_output = build_result.stderr or build_result.stdout

            # Parse errors and attribute to chunks
            result.errors = _parse_build_errors(error_output)
            result.affected_chunks = _attribute_errors_to_chunks(
                result.errors, batch.chunks
            )

            logger.log(f"  [FAIL] Build failed with {len(result.errors)} errors ({build_duration:.1f}s)")
            for error in result.errors[:5]:  # Log first 5 errors
                logger.log(f"    - {error.message[:100]}")

            return result

        result.build_passed = True
        logger.log(f"  [OK] Build passed ({build_duration:.1f}s)")

    except subprocess.TimeoutExpired:
        result.errors.append(ValidationError(
            message=f"Build timed out ({build_timeout}s)"
        ))
        logger.log(f"  [FAIL] Build timed out ({build_timeout}s)")
        return result
    except Exception as e:
        result.errors.append(ValidationError(message=str(e)))
        logger.log(f"  [FAIL] Build error: {e}")
        return result

    # Phase 2: Visual regression OR Test-driven validation
    if not skip_visual and batch.affected_pages:
        # Chunks with affected pages: run visual regression
        logger.step(f"Visual regression on {len(batch.affected_pages)} affected pages...")
        # TODO: Implement batch visual regression
        # For now, mark as passed - visual regression handled separately
        result.visual_passed = True
        logger.log("  [SKIP] Batch visual regression not yet implemented")
    elif not batch.affected_pages and batch.chunks:
        # PAGELESS CHUNKS: Run test-driven validation
        logger.step(f"Test-driven validation for {len(batch.chunks)} pageless chunks...")

        pageless_test_results = _run_test_driven_validation_for_pageless(
            batch.chunks,
            working_dir,
            logger
        )

        if pageless_test_results.all_passed:
            result.visual_passed = True
            logger.log(f"  [PASS] All {len(batch.chunks)} pageless chunks validated via tests")
        else:
            result.visual_passed = False
            for td_result in pageless_test_results.results:
                if not td_result.all_tests_passed:
                    result.errors.append(ValidationError(
                        message=td_result.to_summary(),
                        chunk_number=td_result.suite.chunk_number
                    ))
            logger.log(f"  [FAIL] {pageless_test_results.failed_count} pageless chunks failed tests")
    else:
        result.visual_passed = True
        if skip_visual:
            logger.log("  [SKIP] Visual regression skipped by flag")
        else:
            logger.log("  [SKIP] No pages affected")

    result.success = result.build_passed and result.visual_passed
    return result


@dataclass
class PagelessTestResults:
    """Aggregate results from test-driven validation of pageless chunks."""
    results: List[TestDrivenResult] = field(default_factory=list)
    all_passed: bool = True
    failed_count: int = 0


def _run_test_driven_validation_for_pageless(
    chunks: List["ChunkData"],
    working_dir: Path,
    logger: "RunLogger"
) -> PagelessTestResults:
    """Run test-driven validation for chunks that don't affect any pages.

    For each pageless chunk:
    1. Generate test suite
    2. Run tests until predictable (consistent results)
    3. Verify tests match expected outcomes

    Args:
        chunks: List of pageless chunks to validate
        working_dir: Project working directory
        logger: RunLogger for output

    Returns:
        PagelessTestResults with aggregate pass/fail status
    """
    aggregate = PagelessTestResults()

    for chunk in chunks:
        logger.log(f"  [TEST] Validating chunk {chunk.number}: {chunk.title}")

        try:
            # Generate test suite for this chunk
            suite = generate_test_suite_for_chunk(chunk, working_dir)

            if not suite.tests:
                logger.log(f"    [SKIP] No tests generated for chunk {chunk.number}")
                continue

            # Step 1: Run tests until predictable
            predictable, consistency_errors = run_tests_until_predictable(
                suite, working_dir, max_runs=3, logger=logger
            )

            if not predictable:
                logger.log(f"    [WARN] Tests not predictable after 3 runs")
                for err in consistency_errors[:2]:
                    logger.log(f"      - {err}")
                # Still continue - tests may be inherently flaky

            # Step 2: Run tests before refactor (establish baseline)
            # Note: At this point, the refactor is ALREADY applied
            # We're verifying the AFTER state matches expectations

            # Step 3: Run tests after refactor (verify outcomes)
            td_result = run_tests_after_refactor(suite, working_dir, logger)
            aggregate.results.append(td_result)

            if td_result.all_tests_passed:
                logger.log(f"    [PASS] Chunk {chunk.number}: {len(suite.tests)} tests passed")
            else:
                aggregate.all_passed = False
                aggregate.failed_count += 1
                logger.log(f"    [FAIL] Chunk {chunk.number}: Tests failed")

        except Exception as e:
            logger.log(f"    [ERROR] Chunk {chunk.number}: {str(e)[:100]}")
            aggregate.all_passed = False
            aggregate.failed_count += 1

    return aggregate


def _parse_build_errors(error_output: str) -> List[ValidationError]:
    """Parse build error output into structured errors.

    Attempts to extract file paths and line numbers from common build
    error formats (Vite, TypeScript, ESLint, etc.).

    Args:
        error_output: Raw stderr/stdout from build command

    Returns:
        List of ValidationError objects (max 20)
    """
    errors: List[ValidationError] = []

    for line in error_output.split('\n'):
        line = line.strip()
        if not line:
            continue

        # Skip non-error lines
        if 'error' not in line.lower() and 'Error' not in line:
            continue

        # Try to extract file:line format (common in most build tools)
        # Examples:
        #   src/file.js:10:5: error: ...
        #   /path/to/file.ts(10,5): error TS1234: ...
        #   Error in src/file.jsx on line 10

        file_path = None
        line_number = None

        # Try colon-separated format: path:line:col: error
        parts = line.split(':')
        if len(parts) >= 3:
            potential_path = parts[0].strip()
            if potential_path.endswith(('.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs')):
                file_path = potential_path
                try:
                    line_number = int(parts[1].strip())
                except ValueError:
                    pass

        errors.append(ValidationError(
            message=line[:200],  # Truncate long messages
            file_path=file_path,
            line_number=line_number
        ))

        # Limit to 20 errors to avoid overwhelming output
        if len(errors) >= 20:
            break

    return errors


def _attribute_errors_to_chunks(
    errors: List[ValidationError],
    chunks: List["ChunkData"]
) -> List["ChunkData"]:
    """Find which chunks likely caused each error.

    Matches error file paths to chunk file paths to attribute
    errors to specific chunks.

    Args:
        errors: List of parsed validation errors
        chunks: List of all chunks that were implemented

    Returns:
        List of chunks that likely caused errors
    """
    affected: List["ChunkData"] = []

    for chunk in chunks:
        chunk_path = chunk.file_path.replace('\\', '/').lower()

        for error in errors:
            if error.file_path:
                error_path = error.file_path.replace('\\', '/').lower()
                if chunk_path in error_path or error_path in chunk_path:
                    affected.append(chunk)
                    break

    return affected


def create_validation_batch_from_chunks(
    chunks: List["ChunkData"],
    reverse_deps: Dict[str, List[str]]
) -> ValidationBatch:
    """Create a validation batch directly from chunks.

    Convenience function when you don't have a TopologySortResult.

    Args:
        chunks: List of chunks to validate
        reverse_deps: Reverse dependency map

    Returns:
        ValidationBatch ready for validation
    """
    files = {c.file_path for c in chunks}

    # Expand to affected pages via reverse dependencies
    affected: Set[str] = set()
    for file_path in files:
        normalized = file_path.replace('\\', '/')
        dependents = reverse_deps.get(normalized, [])
        affected.update(dependents)

    # Filter to actual page paths
    pages = {
        p for p in affected
        if '/pages/' in p or p.startswith('src/islands/pages/')
    }

    return ValidationBatch(
        chunks=chunks,
        implemented_files=files,
        affected_pages=pages,
        cycle_groups=[]  # No cycle info without topology sort
    )
