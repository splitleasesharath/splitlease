"""
Scoped Git Operations - Track and reset only refactored files.

This module provides git operations that are scoped to specific files,
preventing accidental reset of pipeline fixes or other changes.

The key insight: when validation fails, we only want to reset the FILES
that were modified by the refactoring process, NOT:
- Pipeline bug fixes made during the session
- Configuration changes
- AST cache updates
- Other unrelated modifications
"""

from pathlib import Path
from typing import List, Set, Optional
import subprocess
from dataclasses import dataclass, field


@dataclass
class RefactorScope:
    """Tracks files modified during refactoring for scoped reset.

    Usage:
        scope = RefactorScope(working_dir=Path.cwd(), base_path="app/src/logic")

        # During implementation - paths are relative to base_path
        scope.track_file("calculators/pricing.js")  # Becomes app/src/logic/calculators/pricing.js
        scope.track_file("rules/auth.js")           # Becomes app/src/logic/rules/auth.js

        # On failure, only reset tracked files
        scope.reset_scoped()  # Preserves pipeline fixes!
    """

    working_dir: Path = field(default_factory=Path.cwd)
    base_path: str = field(default="")  # Base path to prepend to relative file paths
    modified_files: Set[str] = field(default_factory=set)
    _original_content: dict = field(default_factory=dict, repr=False)

    def track_file(self, file_path: str) -> None:
        """Add a file to the refactor scope and cache its original content.

        Args:
            file_path: Path to the file (relative or absolute).
                       Relative paths are resolved against base_path if set,
                       otherwise against working_dir.
        """
        # Normalize to absolute path
        if Path(file_path).is_absolute():
            abs_path = Path(file_path)
        else:
            # If base_path is set and file_path doesn't start with it, prepend base_path
            # This handles chunk file_paths like "constants/proposalStatuses.js"
            # when base_path is "app/src/logic"
            if self.base_path:
                file_path_normalized = file_path.replace('\\', '/')
                base_normalized = self.base_path.replace('\\', '/')

                # Only prepend if file_path doesn't already include base_path
                if not file_path_normalized.startswith(base_normalized):
                    file_path = f"{base_normalized}/{file_path_normalized}"

            abs_path = (self.working_dir / file_path).resolve()

        str_path = str(abs_path)
        self.modified_files.add(str_path)

        # Cache original content for potential restoration
        if str_path not in self._original_content and abs_path.exists():
            try:
                self._original_content[str_path] = abs_path.read_text(encoding='utf-8')
            except Exception:
                pass  # File might be binary or unreadable

    def track_files(self, file_paths: List[str]) -> None:
        """Add multiple files to the refactor scope.

        Args:
            file_paths: List of file paths to track
        """
        for fp in file_paths:
            self.track_file(fp)

    def track_from_chunk(self, chunk: "ChunkData") -> None:
        """Track files from a chunk's file_path attribute.

        Handles multiple files specified in formats like:
        - Single file: `file.js`
        - Multiple files: `file1.js`, `file2.js`
        - Multiple with backticks: `file1.js`, `file2.js`

        Args:
            chunk: ChunkData object with file_path
        """
        if not hasattr(chunk, 'file_path'):
            return

        raw_path = chunk.file_path

        # Check for invalid phrases first (before splitting)
        invalid_phrases = ['multiple', 'various', 'see below', 'see above', 'n/a']
        if any(phrase in raw_path.lower() for phrase in invalid_phrases):
            return  # Skip non-file entries

        # Split on common separators: `, ` (comma-space) or `\`, \`` (backtick patterns)
        # Example: "`file1.js`, `file2.js`" -> ["file1.js", "file2.js"]
        import re
        # Split on `, ` or `\`, \`` patterns
        parts = re.split(r'`,\s*`|,\s*', raw_path)

        for part in parts:
            # Clean up backticks and whitespace
            file_path = part.strip('`').strip()

            if not file_path:
                continue

            # Must have a common file extension
            has_extension = any(file_path.endswith(ext) for ext in
                              ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.md', '.css'])
            if not has_extension:
                continue  # Skip entries without valid extension

            self.track_file(file_path)

    def get_relative_paths(self) -> List[str]:
        """Get tracked files as relative paths from working_dir.

        Returns:
            List of relative path strings
        """
        relative = []
        for fp in self.modified_files:
            try:
                rel = Path(fp).relative_to(self.working_dir)
                relative.append(str(rel).replace('\\', '/'))
            except ValueError:
                # Path not under working_dir, use as-is
                relative.append(fp.replace('\\', '/'))
        return sorted(relative)

    def reset_scoped(self, logger=None) -> bool:
        """Reset only the tracked files, preserving other changes.

        This uses `git checkout HEAD -- <files>` instead of `git reset --hard`
        to preserve any changes to files NOT in the refactor scope.

        Args:
            logger: Optional RunLogger for output

        Returns:
            True if reset succeeded, False otherwise
        """
        if not self.modified_files:
            if logger:
                logger.log("  [SKIP] No files to reset")
            return True

        relative_paths = self.get_relative_paths()

        if logger:
            logger.log(f"  Resetting {len(relative_paths)} refactored files...")
            for path in relative_paths[:5]:
                logger.log(f"    - {path}")
            if len(relative_paths) > 5:
                logger.log(f"    ... and {len(relative_paths) - 5} more")

        # Use git checkout to reset specific files
        # This preserves other changes (pipeline fixes, config updates)
        cmd = ["git", "checkout", "HEAD", "--"] + relative_paths

        result = subprocess.run(
            cmd,
            cwd=self.working_dir,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            if logger:
                logger.log(f"  [WARN] Git checkout failed: {result.stderr}")

            # Fallback: try to restore from cached content
            return self._restore_from_cache(logger)

        if logger:
            logger.log(f"  [OK] Reset {len(relative_paths)} files (preserved pipeline fixes)")

        return result.returncode == 0

    def _restore_from_cache(self, logger=None) -> bool:
        """Fallback restoration from cached original content.

        Args:
            logger: Optional RunLogger for output

        Returns:
            True if restoration succeeded
        """
        restored = 0
        failed = 0

        for str_path, content in self._original_content.items():
            try:
                Path(str_path).write_text(content, encoding='utf-8')
                restored += 1
            except Exception as e:
                if logger:
                    logger.log(f"  [FAIL] Could not restore {str_path}: {e}")
                failed += 1

        if logger:
            logger.log(f"  [FALLBACK] Restored {restored} files from cache, {failed} failed")

        return failed == 0

    def get_staged_files(self) -> List[str]:
        """Get list of currently staged files.

        Returns:
            List of staged file paths
        """
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            cwd=self.working_dir,
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            return result.stdout.strip().split('\n')
        return []

    def get_modified_files(self) -> List[str]:
        """Get list of currently modified (unstaged) files.

        Returns:
            List of modified file paths
        """
        result = subprocess.run(
            ["git", "diff", "--name-only"],
            cwd=self.working_dir,
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            return result.stdout.strip().split('\n')
        return []

    def get_untracked_changes(self) -> List[str]:
        """Get files that have changes but are NOT in the refactor scope.

        These are the files that will be PRESERVED during reset.

        Returns:
            List of file paths with changes outside the scope
        """
        all_modified = set(self.get_modified_files() + self.get_staged_files())
        tracked_relative = set(self.get_relative_paths())

        # Find files that are modified but not tracked
        untracked = []
        for f in all_modified:
            normalized = f.replace('\\', '/')
            if normalized not in tracked_relative:
                untracked.append(normalized)

        return sorted(untracked)

    def summarize(self) -> str:
        """Generate a summary of the refactor scope.

        Returns:
            Human-readable summary string
        """
        untracked = self.get_untracked_changes()
        return (
            f"RefactorScope: {len(self.modified_files)} tracked files\n"
            f"  Will reset: {len(self.modified_files)} files\n"
            f"  Will preserve: {len(untracked)} files with other changes"
        )


def create_refactor_scope(working_dir: Path, base_path: str = "") -> RefactorScope:
    """Factory function to create a RefactorScope.

    Args:
        working_dir: Project root directory
        base_path: Optional base path to prepend to relative file paths
                   (e.g., "app/src/logic" for logic refactoring)

    Returns:
        New RefactorScope instance
    """
    return RefactorScope(working_dir=working_dir, base_path=base_path)
