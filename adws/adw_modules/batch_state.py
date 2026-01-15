"""Batch state management for overnight refactoring workflows.

Provides persistent state management for batch processing of multiple issues,
tracking progress across parallel workers and enabling resume from failures.
"""

import json
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field

from adw_modules.data_types import ModelSet


class IssueStatus(str, Enum):
    """Status of an individual issue in a batch."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class TestCategory(str, Enum):
    """Categories of tests in the extended test suite."""
    STATIC_ANALYSIS = "static_analysis"
    BUILD_INTEGRITY = "build_integrity"
    UNIT_INTEGRATION = "unit_integration"
    E2E = "e2e"
    SECURITY = "security"
    DOCUMENTATION = "documentation"
    DEPLOYMENT = "deployment"


class ExtendedTestResult(BaseModel):
    """Test result with category and timing information."""
    test_name: str
    category: TestCategory
    passed: bool
    execution_command: str
    test_purpose: str
    duration_seconds: float = 0.0
    error: Optional[str] = None


class BatchConfig(BaseModel):
    """Configuration for overnight batch run."""
    issues: List[str] = Field(default_factory=list)
    github_label: Optional[str] = None
    parallel_limit: int = Field(default=5, ge=1, le=15)
    continue_on_failure: bool = True
    failure_threshold: int = Field(default=3, ge=1)
    notification_webhook: Optional[str] = None
    notification_channel: Optional[str] = None
    model_set: ModelSet = "base"
    skip_tests: List[str] = Field(default_factory=list)
    run_dead_code_detection: bool = True
    auto_merge: bool = False
    test_timeout_multiplier: float = 1.0
    cleanup_worktrees_after: bool = True


class BatchIssueResult(BaseModel):
    """Result for a single issue in batch processing."""
    issue_number: str
    adw_id: str = ""
    status: IssueStatus = IssueStatus.PENDING
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    test_results: Dict[str, bool] = Field(default_factory=dict)
    tests_passed: int = 0
    tests_failed: int = 0
    tests_skipped: int = 0
    pr_url: Optional[str] = None
    error: Optional[str] = None
    dead_code_found: List[str] = Field(default_factory=list)
    worktree_path: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BatchStateData(BaseModel):
    """Persistent state data for batch run (Pydantic validation)."""
    batch_id: str
    config: BatchConfig
    status: str = "running"  # running, completed, failed, paused
    start_time: datetime = Field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    issues: Dict[str, BatchIssueResult] = Field(default_factory=dict)
    current_parallel: int = 0
    consecutive_failures: int = 0
    total_issues: int = 0
    completed_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class BatchState:
    """Container for batch workflow state with file persistence."""

    STATE_FILENAME = "batch_state.json"

    def __init__(self, batch_id: str, config: Optional[BatchConfig] = None):
        """Initialize BatchState with a required batch ID.

        Args:
            batch_id: The batch ID for this state (required)
            config: Optional batch configuration
        """
        if not batch_id:
            raise ValueError("batch_id is required for BatchState")

        self.batch_id = batch_id
        self.config = config or BatchConfig()
        self.status = "running"
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None
        self.issues: Dict[str, BatchIssueResult] = {}
        self.current_parallel = 0
        self.consecutive_failures = 0
        self.total_issues = 0
        self.completed_count = 0
        self.failed_count = 0
        self.skipped_count = 0
        self.logger = logging.getLogger(__name__)

    def add_issue(self, issue_number: str) -> BatchIssueResult:
        """Add an issue to the batch for processing."""
        if issue_number not in self.issues:
            result = BatchIssueResult(
                issue_number=issue_number,
                status=IssueStatus.PENDING,
                start_time=datetime.now()
            )
            self.issues[issue_number] = result
            self.total_issues = len(self.issues)
        return self.issues[issue_number]

    def update_issue(self, issue_number: str, **kwargs) -> Optional[BatchIssueResult]:
        """Update an issue's result fields."""
        if issue_number not in self.issues:
            return None

        result = self.issues[issue_number]
        for key, value in kwargs.items():
            if hasattr(result, key):
                setattr(result, key, value)

        # Update aggregate counts
        self._update_counts()
        return result

    def mark_issue_started(self, issue_number: str, adw_id: str) -> Optional[BatchIssueResult]:
        """Mark an issue as in progress."""
        return self.update_issue(
            issue_number,
            status=IssueStatus.IN_PROGRESS,
            adw_id=adw_id,
            start_time=datetime.now()
        )

    def mark_issue_completed(self, issue_number: str, **kwargs) -> Optional[BatchIssueResult]:
        """Mark an issue as completed."""
        self.consecutive_failures = 0  # Reset on success
        return self.update_issue(
            issue_number,
            status=IssueStatus.COMPLETED,
            end_time=datetime.now(),
            **kwargs
        )

    def mark_issue_failed(self, issue_number: str, error: str, **kwargs) -> Optional[BatchIssueResult]:
        """Mark an issue as failed."""
        self.consecutive_failures += 1
        return self.update_issue(
            issue_number,
            status=IssueStatus.FAILED,
            end_time=datetime.now(),
            error=error,
            **kwargs
        )

    def should_stop_batch(self) -> bool:
        """Check if batch should stop due to failure threshold."""
        return self.consecutive_failures >= self.config.failure_threshold

    def get_pending_issues(self) -> List[str]:
        """Get list of issue numbers that are still pending."""
        return [
            issue_num for issue_num, result in self.issues.items()
            if result.status == IssueStatus.PENDING
        ]

    def get_summary(self) -> Dict[str, Any]:
        """Get summary of batch processing results."""
        duration = None
        if self.end_time and self.start_time:
            duration = (self.end_time - self.start_time).total_seconds()
        elif self.start_time:
            duration = (datetime.now() - self.start_time).total_seconds()

        # Aggregate test results
        all_test_results: Dict[str, Dict[str, int]] = {}
        for result in self.issues.values():
            for test_name, passed in result.test_results.items():
                if test_name not in all_test_results:
                    all_test_results[test_name] = {"passed": 0, "failed": 0}
                if passed:
                    all_test_results[test_name]["passed"] += 1
                else:
                    all_test_results[test_name]["failed"] += 1

        return {
            "batch_id": self.batch_id,
            "status": self.status,
            "total_issues": self.total_issues,
            "completed": self.completed_count,
            "failed": self.failed_count,
            "skipped": self.skipped_count,
            "pending": len(self.get_pending_issues()),
            "duration_seconds": duration,
            "test_summary": all_test_results,
            "dead_code_total": sum(
                len(r.dead_code_found) for r in self.issues.values()
            )
        }

    def _update_counts(self):
        """Update aggregate counts from issue statuses."""
        self.completed_count = sum(
            1 for r in self.issues.values() if r.status == IssueStatus.COMPLETED
        )
        self.failed_count = sum(
            1 for r in self.issues.values() if r.status == IssueStatus.FAILED
        )
        self.skipped_count = sum(
            1 for r in self.issues.values() if r.status == IssueStatus.SKIPPED
        )

    def get_batch_dir(self) -> str:
        """Get path to batch state directory."""
        project_root = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        return os.path.join(project_root, "agents", f"batch_{self.batch_id}")

    def get_state_path(self) -> str:
        """Get path to state file."""
        return os.path.join(self.get_batch_dir(), self.STATE_FILENAME)

    def save(self) -> None:
        """Save state to file in agents/batch_{batch_id}/batch_state.json."""
        state_path = self.get_state_path()
        os.makedirs(os.path.dirname(state_path), exist_ok=True)

        # Create BatchStateData for validation and serialization
        state_data = BatchStateData(
            batch_id=self.batch_id,
            config=self.config,
            status=self.status,
            start_time=self.start_time,
            end_time=self.end_time,
            issues=self.issues,
            current_parallel=self.current_parallel,
            consecutive_failures=self.consecutive_failures,
            total_issues=self.total_issues,
            completed_count=self.completed_count,
            failed_count=self.failed_count,
            skipped_count=self.skipped_count,
        )

        # Custom JSON encoder for datetime
        def json_serial(obj):
            if isinstance(obj, datetime):
                return obj.isoformat()
            raise TypeError(f"Type {type(obj)} not serializable")

        with open(state_path, "w", encoding='utf-8') as f:
            json.dump(state_data.model_dump(mode='json'), f, indent=2, default=json_serial)

        self.logger.info(f"Saved batch state to {state_path}")

    @classmethod
    def load(cls, batch_id: str, logger: Optional[logging.Logger] = None) -> Optional["BatchState"]:
        """Load state from file if it exists."""
        project_root = os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        )
        state_path = os.path.join(
            project_root, "agents", f"batch_{batch_id}", cls.STATE_FILENAME
        )

        if not os.path.exists(state_path):
            if logger:
                logger.warning(f"Batch state not found: {state_path}")
            return None

        try:
            with open(state_path, "r", encoding='utf-8') as f:
                data = json.load(f)

            # Parse datetime strings
            if isinstance(data.get("start_time"), str):
                data["start_time"] = datetime.fromisoformat(data["start_time"])
            if data.get("end_time") and isinstance(data["end_time"], str):
                data["end_time"] = datetime.fromisoformat(data["end_time"])

            # Parse issue results
            for issue_num, issue_data in data.get("issues", {}).items():
                if isinstance(issue_data.get("start_time"), str):
                    issue_data["start_time"] = datetime.fromisoformat(issue_data["start_time"])
                if issue_data.get("end_time") and isinstance(issue_data["end_time"], str):
                    issue_data["end_time"] = datetime.fromisoformat(issue_data["end_time"])

            # Validate with Pydantic
            state_data = BatchStateData(**data)

            # Create BatchState instance
            state = cls(state_data.batch_id, state_data.config)
            state.status = state_data.status
            state.start_time = state_data.start_time
            state.end_time = state_data.end_time
            state.issues = state_data.issues
            state.current_parallel = state_data.current_parallel
            state.consecutive_failures = state_data.consecutive_failures
            state.total_issues = state_data.total_issues
            state.completed_count = state_data.completed_count
            state.failed_count = state_data.failed_count
            state.skipped_count = state_data.skipped_count

            if logger:
                logger.info(f"Loaded batch state from {state_path}")
                logger.info(f"Batch {batch_id}: {state.completed_count} completed, "
                           f"{state.failed_count} failed, {len(state.get_pending_issues())} pending")

            return state
        except Exception as e:
            if logger:
                logger.error(f"Failed to load batch state from {state_path}: {e}")
            return None
