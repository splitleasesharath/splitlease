"""
Chunk Parser Module - Extract and organize refactoring chunks from plan files.

This module parses refactoring plan markdown files and groups chunks by affected pages.
"""

import re
from pathlib import Path
from typing import List, Dict
from dataclasses import dataclass


@dataclass
class ChunkData:
    """Represents a single refactoring chunk."""
    number: int
    title: str
    file_path: str
    line_number: str
    current_code: str
    refactored_code: str
    affected_pages: str


def extract_page_groups(plan_file: Path) -> Dict[str, List[ChunkData]]:
    """
    Parse plan file and group chunks by affected page.

    Args:
        plan_file: Path to the refactoring plan markdown file

    Returns:
        Dictionary mapping page paths to list of chunks
    """
    content = plan_file.read_text(encoding='utf-8')
    groups = {}

    # Try multiple patterns for page group headers (Claude outputs vary)
    # Pattern 1: ## PAGE GROUP: /search (Chunks: 1, 2) - strict format
    # Pattern 2: ## Page Group: /search - relaxed format (no Chunks list)
    # Pattern 3: ## Page Group: GLOBAL (Affects Multiple Pages) - with description

    # First try strict format
    group_sections = re.split(r'(?:^|\n)## PAGE GROUP: ([^(]+(?:\([^)]+\))?)\s*\(Chunks:', content, flags=re.IGNORECASE)

    if len(group_sections) <= 1:
        # Try relaxed format: ## Page Group: <name>
        # Split on "## Page Group:" (case insensitive) followed by content
        group_sections = re.split(r'(?:^|\n)##\s+Page\s+Group:\s+([^\n]+)', content, flags=re.IGNORECASE)

    if len(group_sections) > 1:
        # We found group headers - sections alternate: [preamble, pages1, content1, pages2, content2, ...]
        for i in range(1, len(group_sections), 2):
            # Parse the page list (e.g., "/search, /view-split-lease, /favorites" or "AUTO (Shared/Utility)")
            pages_str = group_sections[i].strip()

            # Clean up the page string - remove trailing descriptions in parentheses
            # e.g., "GLOBAL (Affects Multiple Pages)" -> "GLOBAL"
            pages_clean = re.sub(r'\s*\([^)]*\)\s*$', '', pages_str).strip()

            # Use first page as the key for the group, handling both formats
            if pages_clean.upper().startswith('AUTO') or pages_clean.upper().startswith('SHARED') or pages_clean.upper().startswith('GLOBAL'):
                first_page = pages_clean  # Keep as-is for special groups
            else:
                first_page = pages_clean.split(',')[0].strip()

            group_content = group_sections[i+1] if i+1 < len(group_sections) else ""

            # Extract chunks from this group content
            chunks = parse_chunks(group_content)
            if chunks:
                # Store with the first page as key, merging if key already exists
                if first_page in groups:
                    groups[first_page].extend(chunks)
                else:
                    groups[first_page] = chunks
    else:
        # Fallback: parse all chunks and group by affected_pages metadata
        all_chunks = parse_chunks(content)
        for chunk in all_chunks:
            # Take the first page if multiple are listed
            primary_page = chunk.affected_pages.split(',')[0].strip()
            if primary_page not in groups:
                groups[primary_page] = []
            groups[primary_page].append(chunk)

    return groups


def parse_chunks(content: str) -> List[ChunkData]:
    """
    Parse chunks from a block of markdown.

    Args:
        content: Markdown content containing chunks

    Returns:
        List of ChunkData objects
    """
    chunks = []

    # Split on chunk headers: ### Chunk N: or ### CHUNK N:
    # This handles Claude's variable output format
    chunk_pattern = r'(###?\s+Chunk\s+\d+:)'
    parts = re.split(chunk_pattern, content, flags=re.IGNORECASE)

    # parts = [preamble, "### Chunk 1:", content1, "### Chunk 2:", content2, ...]
    for i in range(1, len(parts), 2):
        header = parts[i]
        section_content = parts[i + 1] if i + 1 < len(parts) else ""
        section = header + section_content

        # Match both "### CHUNK 1:" and "### Chunk 1:" (case insensitive)
        header_match = re.search(r'###?\s+Chunk\s+(\d+):\s+(.+)', section, re.IGNORECASE)
        if not header_match:
            continue

        chunk_number = int(header_match.group(1))
        chunk_title = header_match.group(2).strip()

        # Try multiple file path patterns
        # Pattern 1: **File:** path
        # Pattern 2: **Files Affected:** path (or list)
        file_match = re.search(r'\*\*Files? Affected:\*\*\s+`?([^`\n]+)`?', section)
        if not file_match:
            file_match = re.search(r'\*\*File:\*\*\s+`?([^`\n]+)`?', section)

        # Try to extract line numbers from various formats
        # Pattern 1: **Line:** 10-20
        # Pattern 2: **Lines:** 10-20
        # Pattern 3: Embedded in code block label like (`path:10-20`):
        line_match = re.search(r'\*\*Lines?:\*\*\s+(.+)', section)
        if not line_match:
            # Try to extract from code block label like "**Current Code** (`path:82-88`):"
            line_match = re.search(r'\*\*(?:Current|Refactored)\s+Code\*\*\s*\(`[^:]+:(\d+(?:-\d+)?)`\)', section)

        # Try multiple patterns for affected pages
        pages_match = re.search(r'\*\*(?:Expected )?Affected Pages:\*\*\s+(.+)', section)

        if not file_match:
            # Last resort: try to find file path from code block labels
            path_in_label = re.search(r'\*\*(?:Current|Refactored)\s+Code\*\*\s*\(`([^:]+):', section)
            if path_in_label:
                file_path = path_in_label.group(1).strip()
            else:
                continue
        else:
            file_path = file_match.group(1).strip()
            # Clean up if it's a list (take first item)
            if '\n' in file_path:
                file_path = file_path.split('\n')[0].strip()
            # Remove markdown list prefix
            file_path = re.sub(r'^[-*]\s*', '', file_path).strip()
            # Remove backticks
            file_path = file_path.strip('`')

        line_number = line_match.group(1).strip() if line_match else "unknown"
        affected_pages = pages_match.group(1).strip() if pages_match else "AUTO"

        # Find code blocks - try multiple formats
        code_blocks = re.findall(r'```(?:javascript|typescript|jsx|tsx|python|js|ts)?\s*\n(.*?)\n```', section, re.DOTALL)
        if len(code_blocks) < 2:
            continue

        chunks.append(ChunkData(
            number=chunk_number,
            title=chunk_title,
            file_path=file_path,
            line_number=line_number,
            current_code=code_blocks[0].strip(),
            refactored_code=code_blocks[1].strip(),
            affected_pages=affected_pages
        ))
    return chunks
