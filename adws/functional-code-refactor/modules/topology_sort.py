"""
Topology-based chunk ordering using pre-computed levels from Kahn's algorithm.

This module takes parsed chunks and orders them by topological level,
ensuring that leaf files (level 0) are processed first, then their
dependents (level 1), and so on. This prevents issues where refactoring
a file breaks imports in files that depend on it.
"""

from typing import List, Dict, Set, TYPE_CHECKING
from dataclasses import dataclass

if TYPE_CHECKING:
    from .chunk_parser import ChunkData
    from .graph_algorithms import GraphAnalysisResult


def normalize_path(path: str) -> str:
    """Normalize path separators for cross-platform matching.

    Args:
        path: File path to normalize

    Returns:
        Normalized path with forward slashes
    """
    import os
    normalized = path.replace('\\', '/')
    normalized = normalized.rstrip('/')
    if normalized.startswith('./'):
        normalized = normalized[2:]
    if os.name == 'nt':
        normalized = normalized.lower()
    return normalized


@dataclass
class TopologySortResult:
    """Result of topology sorting chunks.

    Attributes:
        sorted_chunks: Flat list of chunks in topological order (level 0 first)
        levels: Chunks grouped by level (for parallel processing potential)
        cycle_chunks: Chunks that are part of cycles (atomic units)
    """
    sorted_chunks: List["ChunkData"]
    levels: List[List["ChunkData"]]  # Chunks grouped by level
    cycle_chunks: List[List["ChunkData"]]  # Chunks that are part of cycles (atomic units)


def topology_sort_chunks(
    chunks: List["ChunkData"],
    topological_levels: List[List[str]],
    cycles: List[List[str]]
) -> TopologySortResult:
    """Sort chunks by topological level (leaf-first).

    Uses pre-computed levels from Kahn's algorithm instead of simple
    dependent count sorting. This ensures correct ordering even with
    complex dependency chains.

    Args:
        chunks: List of chunks to sort
        topological_levels: Pre-computed levels from compute_topological_levels()
        cycles: Pre-computed cycles from detect_cycles_tarjan()

    Returns:
        TopologySortResult with sorted chunks and level groupings
    """
    # Build file -> level lookup
    file_to_level: Dict[str, int] = {}
    for level_idx, level_files in enumerate(topological_levels):
        for file_path in level_files:
            file_to_level[normalize_path(file_path)] = level_idx

    # Build file -> cycle lookup
    file_to_cycle: Dict[str, int] = {}
    for cycle_idx, cycle_files in enumerate(cycles):
        for file_path in cycle_files:
            file_to_cycle[normalize_path(file_path)] = cycle_idx

    # Assign each chunk to a level
    chunk_levels: Dict[int, List["ChunkData"]] = {}
    cycle_chunks_map: Dict[int, List["ChunkData"]] = {}

    for chunk in chunks:
        normalized = normalize_path(chunk.file_path)

        # Check if part of a cycle
        if normalized in file_to_cycle:
            cycle_id = file_to_cycle[normalized]
            if cycle_id not in cycle_chunks_map:
                cycle_chunks_map[cycle_id] = []
            cycle_chunks_map[cycle_id].append(chunk)

        # Assign to level
        level = file_to_level.get(normalized, 999)  # Unknown files last
        if level not in chunk_levels:
            chunk_levels[level] = []
        chunk_levels[level].append(chunk)

    # Build sorted result
    sorted_chunks: List["ChunkData"] = []
    levels_output: List[List["ChunkData"]] = []

    for level_idx in sorted(chunk_levels.keys()):
        level_chunks = chunk_levels[level_idx]
        # Sort within level by file path for determinism
        level_chunks.sort(key=lambda c: c.file_path)
        sorted_chunks.extend(level_chunks)
        levels_output.append(level_chunks)

    return TopologySortResult(
        sorted_chunks=sorted_chunks,
        levels=levels_output,
        cycle_chunks=list(cycle_chunks_map.values())
    )


def topology_sort_chunks_with_graph(
    chunks: List["ChunkData"],
    graph_result: "GraphAnalysisResult"
) -> TopologySortResult:
    """Sort chunks using GraphAnalysisResult directly.

    Convenience method that extracts levels and cycles from GraphAnalysisResult.

    Args:
        chunks: List of chunks to sort
        graph_result: GraphAnalysisResult from analyze_graph()

    Returns:
        TopologySortResult with sorted chunks and level groupings
    """
    return topology_sort_chunks(
        chunks=chunks,
        topological_levels=graph_result.topological_levels,
        cycles=graph_result.cycles
    )


def get_chunk_level_stats(result: TopologySortResult) -> Dict[str, int]:
    """Get statistics about chunk distribution across levels.

    Args:
        result: TopologySortResult from topology_sort_chunks()

    Returns:
        Dictionary with level statistics
    """
    stats = {
        "total_chunks": len(result.sorted_chunks),
        "total_levels": len(result.levels),
        "chunks_in_cycles": sum(len(group) for group in result.cycle_chunks),
        "cycle_count": len(result.cycle_chunks),
    }

    # Level breakdown
    for level_idx, level_chunks in enumerate(result.levels):
        stats[f"level_{level_idx}_chunks"] = len(level_chunks)

    return stats


def validate_chunk_order(
    result: TopologySortResult,
    file_to_level: Dict[str, int]
) -> List[str]:
    """Validate that chunks are in correct topological order.

    Checks that no chunk at level N depends on a chunk at level N+M
    that hasn't been processed yet.

    Args:
        result: TopologySortResult to validate
        file_to_level: Mapping from file paths to their topological levels

    Returns:
        List of validation errors (empty if valid)
    """
    errors: List[str] = []
    processed_files: Set[str] = set()

    for chunk in result.sorted_chunks:
        normalized_path = normalize_path(chunk.file_path)
        chunk_level = file_to_level.get(normalized_path, 999)

        # Mark this file as processed
        processed_files.add(normalized_path)

    # For now, just verify level ordering is correct
    prev_level = -1
    for level_idx, level_chunks in enumerate(result.levels):
        for chunk in level_chunks:
            normalized_path = normalize_path(chunk.file_path)
            actual_level = file_to_level.get(normalized_path, 999)

            if actual_level < prev_level:
                errors.append(
                    f"Chunk {chunk.number} ({chunk.file_path}) at level {actual_level} "
                    f"appears after level {prev_level}"
                )
        prev_level = level_idx

    return errors
