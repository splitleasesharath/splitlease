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

    # Try multiple PAGE GROUP patterns to handle different plan formats
    # Pattern 1: ## PAGE GROUP: <name> (Chunks: N, M) - old format
    # Pattern 2: ## PAGE GROUP: <name>\n**Affected Pages**: <pages> - new format

    # First try pattern 1 (old format with Chunks suffix)
    group_sections = re.split(r'(?:^|\n)## PAGE GROUP: ([^(]+(?:\([^)]+\))?)\s*\(Chunks:', content)

    if len(group_sections) > 1:
        # Old format found
        for i in range(1, len(group_sections), 2):
            pages_str = group_sections[i].strip()
            if pages_str.startswith('AUTO') or pages_str.startswith('SHARED'):
                first_page = pages_str
            else:
                first_page = pages_str.split(',')[0].strip()

            group_content = group_sections[i+1] if i+1 < len(group_sections) else ""
            chunks = parse_chunks(group_content)
            if chunks:
                if first_page in groups:
                    groups[first_page].extend(chunks)
                else:
                    groups[first_page] = chunks
    else:
        # Try pattern 2: ## PAGE GROUP: <name> followed by **Affected Pages**: <pages>
        # Split by PAGE GROUP headers (new format without Chunks suffix)
        group_sections = re.split(r'(?:^|\n)## PAGE GROUP:\s+(.+?)(?:\n|$)', content)

        if len(group_sections) > 1:
            for i in range(1, len(group_sections), 2):
                group_name = group_sections[i].strip()
                group_content = group_sections[i+1] if i+1 < len(group_sections) else ""

                # Extract **Affected Pages**: from the group content
                pages_match = re.search(r'\*\*Affected Pages\*\*:\s*(.+?)(?:\n|$)', group_content)
                if pages_match:
                    pages_str = pages_match.group(1).strip().strip('`').strip()
                    # Remove backticks and clean up
                    pages_str = re.sub(r'`', '', pages_str)
                    first_page = pages_str.split(',')[0].strip()
                else:
                    first_page = group_name  # Use group name as fallback

                chunks = parse_chunks(group_content)
                if chunks:
                    if first_page in groups:
                        groups[first_page].extend(chunks)
                    else:
                        groups[first_page] = chunks
        else:
            # Final fallback: parse all chunks and group by affected_pages metadata
            all_chunks = parse_chunks(content)
            for chunk in all_chunks:
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
    # Split on ~~~~~ delimiter
    sections = re.split(r'\n~{5,}\n', content)
    chunks = []

    for section in sections:
        section = section.strip()
        if not section or "CHUNK" not in section:
            continue

        header_match = re.search(r'###?\s+CHUNK\s+(\d+):\s+(.+)', section)
        if not header_match:
            continue

        chunk_number = int(header_match.group(1))
        chunk_title = header_match.group(2).strip()

        # Try multiple file patterns: **File:**, **Files:**, **Affected Files:**
        # First, try single-line pattern: **File:** `path/to/file.js`
        file_match = re.search(r'\*\*File:\*\*\s+`?([^`\n]+)`?', section)

        # Also try to extract from **File**: format (with colon after asterisks)
        if not file_match:
            file_match = re.search(r'\*\*File\*\*:\s+`?([^`\n]+)`?', section)

        # Try multi-line **Files:** format with bullet list
        # **Files:**
        # - `file1.js` (line 72)
        # - `file2.js` (line 61)
        if not file_match:
            files_match = re.search(r'\*\*Files:\*\*\s*\n((?:[-*]\s*`[^`]+`[^\n]*\n?)+)', section)
            if files_match:
                # Extract all file paths from bullet list
                bullet_content = files_match.group(1)
                file_paths = re.findall(r'[-*]\s*`([^`]+)`', bullet_content)
                if file_paths:
                    # Join with comma for multi-file tracking
                    file_match = type('Match', (), {'group': lambda self, n: ', '.join(file_paths)})()

        # Try to find file path from the **Issue**: or **Current Code** sections
        if not file_match:
            # Look for file paths in backticks like `app/src/logic/...`
            file_match = re.search(r'`(app/src/[^\s`]+\.(?:js|jsx|ts|tsx))`', section)

        line_match = re.search(r'\*\*Lines?:\*\*\s+(.+)', section)
        pages_match = re.search(r'\*\*(?:Expected )?Affected Pages\*?\*?:\*?\s+(.+)', section)

        if not file_match:
            # Try extracting from **Current Code** section header
            current_code_match = re.search(r'\*\*Current Code\*\*\s+\(`([^`]+)`\)', section)
            if current_code_match:
                file_path = current_code_match.group(1).strip()
            else:
                continue
        else:
            file_path = file_match.group(1).strip().strip('`')

        line_number = line_match.group(1).strip() if line_match else "unknown"
        affected_pages = pages_match.group(1).strip() if pages_match else "AUTO"

        code_blocks = re.findall(r'```(?:javascript|typescript|python)\s*\n(.*?)\n```', section, re.DOTALL)
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
