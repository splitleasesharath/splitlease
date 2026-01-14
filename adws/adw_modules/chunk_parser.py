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
    
    # Pattern to match ## PAGE GROUP: /path (Chunks: 1, 2)
    group_sections = re.split(r'\n## PAGE GROUP: ([^\s\(]+)', content)
    
    if len(group_sections) > 1:
        # We found group headers
        for i in range(1, len(group_sections), 2):
            page_path = group_sections[i].strip()
            group_content = group_sections[i+1]
            
            # Extract chunks from this group content
            chunks = parse_chunks(group_content)
            if chunks:
                groups[page_path] = chunks
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

        file_match = re.search(r'\*\*File:\*\*\s+(.+)', section)
        line_match = re.search(r'\*\*Lines?:\*\*\s+(.+)', section)
        pages_match = re.search(r'\*\*(?:Expected )?Affected Pages:\*\*\s+(.+)', section)

        if not file_match:
            continue

        file_path = file_match.group(1).strip()
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
