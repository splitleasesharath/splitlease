#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic", "google-genai"]
# ///

"""
ADW Code Implement Orchestrator - Refactoring with Visual Regression

Workflow:
1. Parse plan file into PAGE GROUPS
2. For each PAGE GROUP:
   a. Gemini implements all chunks for that page
   b. Playwright compares refactored page vs live (visual parity check)
   c. If PASS -> git commit
   d. If FAIL -> git reset --hard, skip to next page group
3. Slack notifications

Usage:
  uv run adw_code_implement_orchestrator.py .claude/plans/New/<plan-file>.md
"""

import sys
import argparse
import re
import json
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime

# Add adws to path
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.webhook import notify_success, notify_failure
from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest
from adw_modules.run_logger import create_run_logger
from adw_modules.dev_server import DevServerManager
from adw_modules.visual_regression import check_visual_parity
from adw_modules.page_classifier import classify_page, HOST_PAGES, GUEST_PAGES, SHARED_PROTECTED_PAGES


@dataclass
class ChunkData:
    number: int
    title: str
    file_path: str
    line_number: str
    current_code: str
    refactored_code: str
    affected_pages: str


def extract_page_groups(plan_file: Path) -> Dict[str, List[ChunkData]]:
    """Parse plan file and group chunks by affected page."""
    content = plan_file.read_text(encoding='utf-8')
    
    # Simple grouping logic based on PAGE GROUP headers
    # or affected pages metadata in chunks.
    
    # First, let's try to split by PAGE GROUP headers
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
    """Parse chunks from a block of markdown."""
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

        code_blocks = re.findall(r'```(?:javascript|typescript)\s*\n(.*?)\n```', section, re.DOTALL)
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


def implement_chunks_with_gemini(chunks: List[ChunkData], working_dir: Path) -> bool:
    """Implement all chunks in a group using Gemini."""
    for chunk in chunks:
        print(f"  [Implement] Chunk {chunk.number}: {chunk.title}")
        
        prompt = f"""Implement ONLY chunk {chunk.number} from the refactoring plan.

**Chunk Details:**
- File: {chunk.file_path}
- Line: {chunk.line_number}
- Title: {chunk.title}

**Current Code:**
```javascript
{chunk.current_code}
```

**Refactored Code:**
```javascript
{chunk.refactored_code}
```

**Instructions:**
1. Read the file: {chunk.file_path}
2. Locate the current code.
3. Replace it with the refactored code EXACTLY as shown.
4. Verify the change matches the refactored code.
5. Do NOT commit.
"""
        agent_dir = working_dir / "agents" / "implementation" / f"chunk_{chunk.number}"
        agent_dir.mkdir(parents=True, exist_ok=True)
        output_file = agent_dir / "raw_output.jsonl"

        request = AgentPromptRequest(
            prompt=prompt,
            adw_id=f"refactor_chunk_{chunk.number}",
            agent_name="gemini_implementor",
           model="sonnet",  # Maps to gemini-3-flash-preview via GEMINI_BASE_MODEL
            output_file=str(output_file),
            working_dir=str(working_dir),
            dangerously_skip_permissions=True
        )

        response = prompt_claude_code(request)
        if not response.success:
            print(f"    Error: Implementation failed for chunk {chunk.number}")
            return False
            
    return True


def get_mcp_session_for_page(page_path: str) -> Optional[str]:
    """Determine MCP session for a page path."""
    if page_path in HOST_PAGES:
        return "playwright-host"
    if page_path in GUEST_PAGES:
        return "playwright-guest"
    if page_path in SHARED_PROTECTED_PAGES:
        return "playwright-host"
    return None


def main():
    parser = argparse.ArgumentParser(description="ADW Code Implement Orchestrator")
    parser.add_argument("plan_file", help="Path to the refactoring plan markdown file")
    parser.add_argument("--limit", type=int, help="Limit number of page groups to process")

    args = parser.parse_args()
    plan_file = Path(args.plan_file)
    if not plan_file.exists():
        print(f"Error: Plan file not found at {plan_file}")
        sys.exit(1)

    working_dir = Path.cwd()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    logger = create_run_logger("code_refactor", timestamp)

    # 1. Parse plan file
    print(f"Parsing plan file: {plan_file}")
    page_groups = extract_page_groups(plan_file)
    print(f"Found {len(page_groups)} page groups")

    # 2. Start dev server
    # Robust app_dir detection
    if (working_dir / "app").exists():
        app_dir = working_dir / "app"
    elif (working_dir.parent / "app").exists():
        app_dir = working_dir.parent / "app"
    else:
        app_dir = working_dir
        
    dev_logger = logging.getLogger("dev_server")
    dev_logger.setLevel(logging.INFO)
    if not dev_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
        dev_logger.addHandler(handler)

    dev_server = DevServerManager(app_dir, dev_logger)

    try:
        count = 0
        for page_path, chunks in page_groups.items():
            if args.limit and count >= args.limit:
                break
            
            print(f"\n{'='*60}")
            print(f"PAGE GROUP: {page_path} ({len(chunks)} chunks)")
            print(f"{ '='*60}")

            # 3a. Gemini implements all chunks for this page
            success = implement_chunks_with_gemini(chunks, working_dir)
            if not success:
                print("  [FAIL] Implementation failed, resetting...")
                subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir)
                continue

            # 3b. Start dev server for visual check
            print("  Starting dev server...")
            try:
                port, base_url = dev_server.start()
            except Exception as e:
                print(f"  [FAIL] Dev server failed: {e}")
                subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir)
                continue

            try:
                # 3c. Playwright visual check
                mcp_session = get_mcp_session_for_page(page_path)
                visual_result = check_visual_parity(
                    page_path=page_path,
                    mcp_session=mcp_session,
                    auth_type="protected" if mcp_session else "public",
                    port=port
                )

                # 3d. Commit or reset
                if visual_result.get("visualParity") == "PASS":
                    print(f"  [PASS] Visual parity check passed!")
                    chunk_ids = ", ".join([str(c.number) for c in chunks])
                    commit_msg = f"refactor({page_path}): Implement chunks {chunk_ids}\n\n{visual_result.get('explanation', '')}"
                    
                    # Stage all changes
                    subprocess.run(["git", "add", "."], cwd=working_dir)
                    subprocess.run(["git", "commit", "-m", commit_msg], cwd=working_dir)
                    
                    notify_success(
                        step=f"Refactored {page_path}",
                        details=f"Implemented chunks: {chunk_ids}"
                    )
                else:
                    print(f"  [FAIL] Visual parity check failed: {visual_result.get('issues')}")
                    subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=working_dir)
                    notify_failure(
                        step=f"Visual regression on {page_path}",
                        error=", ".join(visual_result.get('issues', []))
                    )
            finally:
                dev_server.stop()
            
            count += 1

    except Exception as e:
        print(f"Orchestrator crashed: {e}")
        notify_failure(step="Code Refactor Orchestrator crashed", error=str(e))
    finally:
        if dev_server.is_running():
            dev_server.stop()
        logger.finalize()


if __name__ == "__main__":
    main()
