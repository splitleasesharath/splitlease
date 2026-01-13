#!/usr/bin/env -S uv run
# /// script
# dependencies = ["python-dotenv", "pydantic"]
# ///

"""
ADW FP Orchestrator - Full FP Refactoring Workflow Automation
(FP means Functional Programming)

Orchestrates the complete FP refactoring process:
1. Run FP audit python script (adw_fp_audit.py). The FP audit script
will scan the codebase for FP violations and generate a plan broken into chunks.

2. For each chunk in the plan:
   a. Implement the chunk (adw_fp_implement.py with chunk filter)
   b. Validate in browser with adw_claude_browser.py (expected no behavior change)
   c. If browser validation passes -> git commit
   d. If validation fails -> git reset --hard and skip to the next FP chunk
3. Send status updates to SHARATHPLAYGROUND webhook (slack)

Usage: uv run adw_fp_orchestrator.py [target_path] [--severity high|medium|all]

Example:
    uv run adw_fp_orchestrator.py app/src/logic --severity high
"""

import sys
import argparse
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass
from datetime import datetime

# Add adws to path
sys.path.insert(0, str(Path(__file__).parent))

from adw_modules.webhook import notify_success, notify_failure, notify_in_progress
from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest
from adw_modules.run_logger import create_run_logger


@dataclass
class ChunkData:
    """Represents a single refactoring chunk."""
    number: int
    title: str
    file_path: str
    line_number: Optional[str]  # Can be "123" or "123-456"
    current_code: str
    refactored_code: str
    testing_steps: List[str]
    affected_pages: Optional[str]  # Comma-separated URLs or "AUTO"
    raw_content: str  # Full chunk markdown for reference


@dataclass
class OrchestratorState:
    """Tracks orchestrator progress."""
    plan_file: Path
    total_chunks: int
    completed_chunks: int = 0
    failed_chunks: int = 0
    skipped_chunks: int = 0
    current_chunk: Optional[int] = None


def extract_chunks_from_plan(plan_file: Path) -> List[ChunkData]:
    """Extract individual chunks from the refactoring plan.

    Args:
        plan_file: Path to the markdown plan file

    Returns:
        List of ChunkData objects, one per chunk
    """
    import re

    if not plan_file.exists():
        raise FileNotFoundError(f"Plan file not found: {plan_file}")

    content = plan_file.read_text(encoding='utf-8')

    # Split on ~~~~~ delimiter (5 or more tildes)
    sections = re.split(r'\n~{5,}\n', content)

    chunks = []

    for section in sections:
        section = section.strip()

        # Skip empty sections and header/summary sections
        if not section or not section.startswith('##'):
            continue

        # Extract chunk number and title from header
        header_match = re.search(r'##\s+CHUNK\s+(\d+):\s+(.+)', section)
        if not header_match:
            continue

        chunk_number = int(header_match.group(1))
        chunk_title = header_match.group(2).strip()

        # Extract file path
        file_match = re.search(r'\*\*File:\*\*\s+(.+)', section)
        if not file_match:
            print(f"  Warning: Chunk {chunk_number} missing file path, skipping")
            continue

        file_path = file_match.group(1).strip()

        # Extract line number (can be "Line:" or "Lines:")
        line_match = re.search(r'\*\*Lines?:\*\*\s+(.+)', section)
        line_number = line_match.group(1).strip() if line_match else None

        # Extract affected pages (supports both "Affected Pages" and "Expected Affected Pages")
        affected_pages_match = re.search(r'\*\*(?:Expected )?Affected Pages:\*\*\s+(.+)', section)
        affected_pages = affected_pages_match.group(1).strip() if affected_pages_match else None

        # Extract code blocks (look for ```javascript or ```typescript blocks)
        code_blocks = re.findall(r'```(?:javascript|typescript)\s*\n(.*?)\n```', section, re.DOTALL)

        if len(code_blocks) < 2:
            print(f"  Warning: Chunk {chunk_number} missing code blocks, skipping")
            continue

        current_code = code_blocks[0].strip()
        refactored_code = code_blocks[1].strip()

        # Extract testing steps (lines starting with "- [ ]")
        testing_steps = re.findall(r'-\s+\[\s*\]\s+(.+)', section)

        # Check if all tests are marked complete ([x])
        completed_tests = re.findall(r'-\s+\[x\]\s+(.+)', section, re.IGNORECASE)
        all_tests_complete = (
            len(testing_steps) == 0 and
            len(completed_tests) > 0
        )

        # Skip chunks where all tests are marked complete
        if all_tests_complete:
            print(f"  Skipping chunk {chunk_number} - all tests marked complete")
            continue

        # Create ChunkData object
        chunk = ChunkData(
            number=chunk_number,
            title=chunk_title,
            file_path=file_path,
            line_number=line_number,
            current_code=current_code,
            refactored_code=refactored_code,
            testing_steps=testing_steps,
            affected_pages=affected_pages,
            raw_content=section
        )

        chunks.append(chunk)

    return chunks


def run_audit_phase(target_path: str, severity: str, working_dir: Path) -> Path:
    """Run FP audit and generate plan.

    Args:
        target_path: Path to audit
        severity: Severity filter
        working_dir: Working directory

    Returns:
        Path to generated plan file
    """
    print(f"\n{'='*60}")
    print("PHASE 1: FP AUDIT")
    print(f"{'='*60}")

    # Import and run adw_fp_audit logic
    from adw_fp_audit import run_fp_audit_and_plan

    try:
        plan_file = run_fp_audit_and_plan(target_path, severity, working_dir)

        notify_success(
            step="FP Audit complete -> Plan generated",
            details=None
        )

        return working_dir / plan_file

    except Exception as e:
        notify_failure(
            step=f"Audit crashed on {target_path}",
            error=str(e)[:100]
        )
        raise


def implement_chunk(chunk: ChunkData, plan_file: Path, working_dir: Path) -> bool:
    """Implement a single refactoring chunk using Claude Code.

    Args:
        chunk: Chunk to implement
        plan_file: Path to plan file
        working_dir: Working directory

    Returns:
        True if implementation succeeded, False otherwise
    """
    print(f"\n{'='*60}")
    print(f"IMPLEMENTING CHUNK {chunk.number}: {chunk.title}")
    print(f"{'='*60}")
    print(f"File: {chunk.file_path}")
    print(f"Line: {chunk.line_number}")

    # Create prompt for Claude Code to implement THIS chunk only
    prompt = f"""Implement ONLY chunk {chunk.number} from the FP refactoring plan.

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
2. Locate the current code at line {chunk.line_number}
3. Replace it with the refactored code EXACTLY as shown
4. Do NOT make any other changes to the file
5. Do NOT implement any other chunks
6. Do NOT commit to git - the orchestrator will handle commits after validation

**Verification:**
After making the change, confirm:
- The file compiles/runs without errors
- The change matches the refactored code exactly
"""

    agent_dir = working_dir / "agents" / f"fp_chunk_{chunk.number}"
    agent_dir.mkdir(parents=True, exist_ok=True)
    output_file = agent_dir / "raw_output.jsonl"

    request = AgentPromptRequest(
        prompt=prompt,
        adw_id=f"fp_chunk_{chunk.number}",
        agent_name=f"fp_implementor_chunk_{chunk.number}",
        model="opus",
        output_file=str(output_file),
        working_dir=str(working_dir),
        dangerously_skip_permissions=True
    )

    try:
        response = prompt_claude_code(request)

        if not response.success:
            notify_failure(
                step=f"Chunk {chunk.number} refactoring failed",
                error=response.output[:100]
            )
            return False

        notify_success(
            step=f"Chunk {chunk.number} refactored in {chunk.file_path}",
            details=None
        )
        return True

    except Exception as e:
        notify_failure(
            step=f"Chunk {chunk.number} refactoring crashed",
            error=str(e)[:100]
        )
        return False


def infer_validation_context(chunk: ChunkData) -> dict:
    """Infer which page/component to validate and what specific tests to run.

    Args:
        chunk: Chunk being validated

    Returns:
        Dict with: page_url, page_name, specific_tests, user_flow
    """
    file_path = chunk.file_path.lower()
    title_lower = chunk.title.lower()
    code_lower = chunk.current_code.lower() + chunk.refactored_code.lower()

    # Page mapping - extract page from file path
    page_mapping = {
        "searchpage": {"url": "/search", "name": "Search", "requires_auth": False},
        "viewsplitleasepage": {"url": "/view-split-lease?id=1", "name": "View Listing", "requires_auth": False},
        "accountprofilepage": {"url": "/account-profile", "name": "Account Profile", "requires_auth": True},
        "listingdashboardpage": {"url": "/listing-dashboard", "name": "Listing Dashboard", "requires_auth": True},
        "hostproposalspage": {"url": "/host-proposals", "name": "Host Proposals", "requires_auth": True},
        "guestproposalspage": {"url": "/guest-proposals", "name": "Guest Proposals", "requires_auth": True},
        "selflistingpage": {"url": "/self-listing", "name": "Create Listing", "requires_auth": True},
        "favoritelistingspage": {"url": "/favorite-listings", "name": "Favorites", "requires_auth": True},
        "faqpage": {"url": "/faq", "name": "FAQ", "requires_auth": False},
        "messagespage": {"url": "/messages", "name": "Messages", "requires_auth": True},
    }

    # Determine page
    page_info = {"url": "/", "name": "Home", "requires_auth": False}
    for page_key, info in page_mapping.items():
        if page_key in file_path:
            page_info = info
            break

    # Shared components - test on multiple pages
    shared_components = {
        "loggedinavatar": {"url": "/account-profile", "name": "Account Profile (Avatar Menu)", "requires_auth": True},
        "hostscheduleselector": {"url": "/self-listing", "name": "Create Listing (Schedule)", "requires_auth": True},
        "searchscheduleselector": {"url": "/search", "name": "Search (Days Filter)", "requires_auth": False},
        "createproposalflow": {"url": "/view-split-lease?id=1", "name": "View Listing (Proposal)", "requires_auth": False},
        "googlemap": {"url": "/search", "name": "Search (Map View)", "requires_auth": False},
        "pricingeditsection": {"url": "/listing-dashboard", "name": "Listing Dashboard (Pricing)", "requires_auth": True},
    }

    for component_key, info in shared_components.items():
        if component_key in file_path:
            page_info = info
            break

    # Infer specific tests based on code changes
    specific_tests = []

    # Day/schedule selection
    if any(x in code_lower for x in ["day", "schedule", "calendar", "selecteddays", "availablenights"]):
        specific_tests.extend([
            "Click on multiple days in the calendar/schedule selector",
            "Verify selected days are highlighted correctly",
            "Check that day selection state updates properly",
            "Verify no gaps appear in day selection logic"
        ])

    # Pricing/money
    if any(x in code_lower for x in ["price", "pricing", "compensation", "rate", "deposit", "fee"]):
        specific_tests.extend([
            "Verify pricing displays correctly",
            "Check for any '$NaN' or undefined prices",
            "Verify price calculations update when inputs change",
            "Check damage deposit and fees display"
        ])

    # Menu/navigation
    if any(x in code_lower for x in ["menu", "menuitem", "navigation", "getmenuitems"]):
        specific_tests.extend([
            "Click the user avatar/menu to open dropdown",
            "Verify all menu items render correctly",
            "Check badge counts display properly",
            "Test menu item navigation"
        ])

    # Forms/validation
    if any(x in code_lower for x in ["validation", "error", "required", "errors.push"]):
        specific_tests.extend([
            "Submit form with empty required fields",
            "Verify validation errors appear",
            "Check error message text is correct",
            "Verify errors clear when fields are filled"
        ])

    # Photo/media
    if any(x in code_lower for x in ["photo", "image", "picture"]):
        specific_tests.extend([
            "Verify photos/images render correctly",
            "Check photo gallery navigation",
            "Verify no broken image placeholders"
        ])

    # Map/location
    if any(x in code_lower for x in ["map", "marker", "location", "googlemap", "bounds"]):
        specific_tests.extend([
            "Verify map loads and renders",
            "Check that markers appear on map",
            "Test map interactions (zoom, pan)",
            "Verify marker click opens info window"
        ])

    # Search/filter
    if any(x in code_lower for x in ["search", "filter", "query"]):
        specific_tests.extend([
            "Type in search/filter fields",
            "Verify results update",
            "Check filter selections work"
        ])

    # Generic tests if no specific ones found
    if not specific_tests:
        specific_tests = [
            "Verify page renders without errors",
            "Check basic interactions work",
            "Verify no visual regressions"
        ]

    # Infer user flow based on page
    user_flow = []
    if page_info["requires_auth"]:
        user_flow.append("Login if not already authenticated")
    user_flow.append(f"Navigate to {page_info['url']}")
    user_flow.extend(specific_tests)
    user_flow.append("Check browser console for errors")

    return {
        "page_url": page_info["url"],
        "page_name": page_info["name"],
        "requires_auth": page_info["requires_auth"],
        "specific_tests": specific_tests,
        "user_flow": user_flow
    }


def validate_with_browser(chunk: ChunkData, working_dir: Path, logger, port: int = 8000) -> bool:
    """Validate chunk changes using browser automation.

    Args:
        chunk: Chunk that was just implemented
        working_dir: Working directory
        logger: RunLogger instance for logging validation details
        port: Dev server port (default: 8000)

    Returns:
        True if validation passed, False if site is broken
    """
    # Determine which page(s) to test
    # Priority: affected_pages from plan > inferred from file path
    if chunk.affected_pages and chunk.affected_pages.upper() != "AUTO":
        # Parse comma-separated URLs from plan
        page_urls = [url.strip() for url in chunk.affected_pages.split(',')]
        primary_page = page_urls[0]  # Test the first page

        # Still use inference to get specific tests and user flow
        inferred_context = infer_validation_context(chunk)

        # Build context using explicit page but inferred tests
        context = {
            "page_url": primary_page,
            "page_name": f"{primary_page} (from plan)",
            "requires_auth": primary_page not in ["/", "/search", "/faq", "/view-split-lease"],
            "specific_tests": inferred_context["specific_tests"],  # Reuse inferred tests
            "user_flow": inferred_context["user_flow"]  # Reuse inferred flow
        }

        # If multiple pages affected, note in context
        if len(page_urls) > 1:
            context["additional_pages"] = page_urls[1:]
    else:
        # Fallback to inference when affected_pages is AUTO or missing
        context = infer_validation_context(chunk)

    notify_in_progress(
        step=f"Validating Chunk {chunk.number}",
        details=f"Testing on {context['page_name']}",
        metadata={
            "page": context["page_url"],
            "tests": len(context["specific_tests"])
        }
    )

    print(f"\n{'='*60}")
    print(f"VALIDATING CHUNK {chunk.number} WITH BROWSER")
    print(f"{'='*60}")
    print(f"Page: {context['page_name']} ({context['page_url']})")
    print(f"Specific tests: {len(context['specific_tests'])}")
    if "additional_pages" in context:
        print(f"Note: Also affects {', '.join(context['additional_pages'])}")

    # Log validation details
    logger.log_section("BROWSER VALIDATION CONTEXT", to_stdout=False)
    logger.log(f"Testing page: {context['page_name']}", to_stdout=False)
    logger.log(f"URL: http://localhost:{port}{context['page_url']}", to_stdout=False)
    logger.log(f"Requires auth: {context['requires_auth']}", to_stdout=False)
    logger.log(f"Specific tests: {len(context['specific_tests'])}", to_stdout=False)

    for i, test in enumerate(context['specific_tests'], 1):
        logger.log(f"  Test {i}: {test}", to_stdout=False)

    if "additional_pages" in context:
        logger.log(f"Additional affected pages: {', '.join(context['additional_pages'])}", to_stdout=False)

    if "user_flow" in context:
        logger.log(f"User flow description: {context['user_flow']}", to_stdout=False)

    # Build validation actions list (starting from step 3)
    actions_list = "\n".join(f"{i+3}. {test}" for i, test in enumerate(context["specific_tests"]))

    # Build additional pages note if applicable
    additional_pages_section = ""
    if "additional_pages" in context:
        other_pages = ", ".join(context['additional_pages'])
        additional_pages_section = f"\n\n**Also affects:** {other_pages}"

    # Build auth instruction
    auth_step = "2. Log in with test credentials" if context['requires_auth'] else "2. (No login required)"

    # Calculate final step number
    final_step = len(context['specific_tests']) + 3

    validation_prompt = f"""I want you to visually inspect simultaneously http://localhost:{port}{context['page_url']} and https://www.split.lease{context['page_url']} and identify any differences you can find between these two pages.

**Context:**
This is a functional programming refactoring validation for "{chunk.title}".
- Refactored file: {chunk.file_path}:{chunk.line_number}{additional_pages_section}

**Your Task:**
Compare the localhost (development) version against the live production site and report any differences in:
- Visual appearance (layout, styling, spacing, colors)
- Interactive elements (buttons, forms, dropdowns, etc.)
- Functionality (does everything work the same way?)
- Console errors (are there new errors in localhost that don't appear in production?)

**Expected Outcome:**
The two pages should be functionally identical. The refactoring should not have introduced any visual or functional differences.

**Report Format:**

If pages are identical:
---
VALIDATION PASSED
✓ No visual differences detected
✓ All interactive elements behave identically
✓ No new console errors in localhost
✓ Pages are functionally equivalent
---

If differences found:
---
VALIDATION FAILED
Differences detected:
- [List specific differences you observed]
- [Any console errors unique to localhost]
- [Any functional behavior changes]
---

IMPORTANT: Only report differences. Do NOT attempt to fix any issues you find.
"""

    # Log the full validation prompt being sent
    logger.log_section("VALIDATION PROMPT", to_stdout=False)
    logger.log(validation_prompt, to_stdout=False)
    logger.log_separator(to_stdout=False)

    # Import browser automation with dev server management
    import subprocess
    import sys
    import tempfile

    # Call adw_claude_browser.py script which handles dev server internally
    adw_browser_script = working_dir / "adws" / "adw_claude_browser.py"

    try:
        # Run the browser script - it handles dev server startup/cleanup internally
        # Note: context['page_url'] is actually a path (e.g., '/search'), not a full URL
        full_url = f"http://localhost:{port}{context['page_url']}"
        print(f"📋 Executing browser validation script...")
        print(f"🌐 Testing URL: {full_url}")

        logger.log_section("BROWSER SCRIPT EXECUTION", to_stdout=False)
        logger.log(f"Browser script path: {adw_browser_script}", to_stdout=False)
        logger.log(f"Full test URL: {full_url}", to_stdout=False)

        # Write prompt to temporary file to avoid Windows command-line length limits
        logger.log(f"Creating temporary prompt file...", to_stdout=False)
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as tmp:
            tmp.write(validation_prompt)
            prompt_file = tmp.name

        logger.log(f"Prompt file created: {prompt_file}", to_stdout=False)
        logger.log(f"Prompt length: {len(validation_prompt)} characters", to_stdout=False)
        logger.log(f"Prompt preview (first 200 chars): {validation_prompt[:200]}", to_stdout=False)

        try:
            logger.log(f"Starting subprocess: uv run {adw_browser_script} @{prompt_file}", to_stdout=False)
            logger.log(f"Working directory: {working_dir}", to_stdout=False)
            logger.log(f"Timeout: 600 seconds", to_stdout=False)

            result = subprocess.run(
                ["uv", "run", str(adw_browser_script), f"@{prompt_file}"],
                cwd=working_dir,
                capture_output=True,
                text=True,
                timeout=600,  # 10 minute timeout for browser + server startup
                encoding='utf-8',
                errors='replace'  # Handle encoding errors gracefully
            )

            logger.log(f"Subprocess completed with return code: {result.returncode}", to_stdout=False)
            logger.log(f"STDOUT length: {len(result.stdout)} characters", to_stdout=False)
            logger.log(f"STDERR length: {len(result.stderr)} characters", to_stdout=False)
        finally:
            # Clean up temp file
            import os
            try:
                os.unlink(prompt_file)
                logger.log(f"Temp file cleaned up: {prompt_file}", to_stdout=False)
            except Exception as cleanup_err:
                logger.log(f"Failed to cleanup temp file: {cleanup_err}", to_stdout=False)

        success = result.returncode == 0
        output = result.stdout if success else result.stderr

        if not success:
            # Log detailed error information
            print(f"\n[FAIL] Browser script failed with exit code {result.returncode}")
            print(f"STDOUT: {result.stdout[:500]}")
            print(f"STDERR: {result.stderr[:500]}")

            logger.log(f"Browser script exit code: {result.returncode}", to_stdout=False)
            logger.log(f"FULL STDOUT:", to_stdout=False)
            logger.log(result.stdout, to_stdout=False)
            logger.log(f"FULL STDERR:", to_stdout=False)
            logger.log(result.stderr, to_stdout=False)

            notify_failure(
                step=f"Chunk {chunk.number} browser automation failed",
                error=f"Exit code {result.returncode}: {output[:100]}"
            )
            return False

        # Check if validation passed
        logger.log(f"Checking validation result in output...", to_stdout=False)
        logger.log(f"Output preview (first 500 chars): {output[:500]}", to_stdout=False)

        if "VALIDATION PASSED" in output.upper():
            print(f"[OK] Validation passed!")
            logger.log("[OK] Validation PASSED", to_stdout=False)
            logger.log(f"Full validation output:", to_stdout=False)
            logger.log(output, to_stdout=False)

            notify_success(
                step=f"Chunk {chunk.number} passed all tests",
                details=None
            )
            return True
        else:
            print(f"[FAIL] Validation failed - site may be broken")
            logger.log("[FAIL] Validation FAILED - site may be broken", to_stdout=False)

            notify_failure(
                step=f"Chunk {chunk.number} broke the site",
                error=output[:100]
            )
            print(f"\nVALIDATION OUTPUT:")
            print(output)

            logger.log("Full validation failure output:", to_stdout=False)
            logger.log(output, to_stdout=False)

            return False

    except subprocess.TimeoutExpired:
        print(f"[TIMEOUT] Browser validation timed out after 10 minutes")
        logger.log("[TIMEOUT] Browser validation timed out after 10 minutes", to_stdout=False)
        logger.log("This may indicate browser script is stuck or waiting for user input", to_stdout=False)

        notify_failure(
            step=f"Chunk {chunk.number} validation timed out",
            error="Browser took >10 minutes"
        )
        return False
    except Exception as e:
        print(f"💥 Browser validation crashed: {e}")
        logger.log(f"Browser validation crashed: {e}", to_stdout=False)

        notify_failure(
            step=f"Chunk {chunk.number} validation crashed",
            error=str(e)[:100]
        )
        return False


def commit_chunk(chunk: ChunkData, working_dir: Path) -> bool:
    """Commit the chunk changes to git.

    Args:
        chunk: Chunk to commit
        working_dir: Working directory

    Returns:
        True if commit succeeded
    """
    import subprocess

    commit_message = f"""refactor(fp): {chunk.title}

Chunk {chunk.number} - {chunk.file_path}:{chunk.line_number}

Applied functional programming refactoring:
{chunk.title}

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
"""

    try:
        # Check if file was actually modified
        status_result = subprocess.run(
            ["git", "status", "--porcelain", chunk.file_path],
            cwd=working_dir,
            capture_output=True,
            text=True
        )

        if not status_result.stdout.strip():
            # No changes - skip commit but return success
            print(f"  [WARN]  No changes detected for {chunk.file_path} - chunk may already be implemented")
            notify_success(
                step=f"Chunk {chunk.number} - no changes needed (already implemented)",
                details=None
            )
            return True

        # Stage changes
        subprocess.run(
            ["git", "add", chunk.file_path],
            cwd=working_dir,
            check=True,
            capture_output=True
        )

        # Commit
        subprocess.run(
            ["git", "commit", "-m", commit_message],
            cwd=working_dir,
            check=True,
            capture_output=True
        )

        notify_success(
            step=f"Chunk {chunk.number} committed to git",
            details=None
        )
        return True

    except subprocess.CalledProcessError as e:
        error_msg = e.stderr.decode() if e.stderr else str(e)
        notify_failure(
            step=f"Chunk {chunk.number} git commit failed",
            error=error_msg[:100]
        )
        return False


def rollback_chunk(chunk: ChunkData, working_dir: Path) -> bool:
    """Rollback chunk changes using git reset.

    Args:
        chunk: Chunk to rollback
        working_dir: Working directory

    Returns:
        True if rollback succeeded
    """
    import subprocess

    try:
        # Hard reset to discard changes
        subprocess.run(
            ["git", "reset", "--hard", "HEAD"],
            cwd=working_dir,
            check=True,
            capture_output=True
        )

        print(f" Rolled back chunk {chunk.number}")
        return True

    except subprocess.CalledProcessError as e:
        notify_failure(
            step=f"Chunk {chunk.number} Rollback",
            error=e.stderr.decode() if e.stderr else str(e),
            details="Git rollback failed"
        )
        return False


def process_chunks(chunks: List[ChunkData], plan_file: Path, working_dir: Path, logger) -> OrchestratorState:
    """Process all chunks in sequence.

    Args:
        chunks: List of chunks to process
        plan_file: Path to plan file
        working_dir: Working directory
        logger: RunLogger instance for logging

    Returns:
        Final orchestrator state
    """
    state = OrchestratorState(
        plan_file=plan_file,
        total_chunks=len(chunks)
    )

    print(f"\n{'='*60}")
    print("PHASE 2: CHUNK PROCESSING")
    print(f"{'='*60}")
    print(f"Total chunks: {len(chunks)}")

    for chunk in chunks:
        state.current_chunk = chunk.number

        print(f"\n{'-'*60}")
        print(f"CHUNK {chunk.number}/{len(chunks)}")
        print(f"{'-'*60}")

        logger.log(f"Starting Chunk {chunk.number}/{len(chunks)}: {chunk.title}", to_stdout=False)
        logger.log(f"File: {chunk.file_path}:{chunk.line_number}", to_stdout=False)

        # Step 1: Implement chunk
        if not implement_chunk(chunk, plan_file, working_dir):
            print(f"  Chunk {chunk.number} implementation failed, skipping")
            logger.log(f"Chunk {chunk.number} implementation FAILED - skipping", to_stdout=False)
            state.skipped_chunks += 1
            continue

        logger.log(f"Chunk {chunk.number} implementation succeeded", to_stdout=False)

        # Step 2: Validate with browser
        logger.log(f"Validating Chunk {chunk.number} with browser", to_stdout=False)
        validation_passed = validate_with_browser(chunk, working_dir, logger)

        # Step 3: Commit or rollback
        if validation_passed:
            logger.log(f"Chunk {chunk.number} validation PASSED", to_stdout=False)
            if commit_chunk(chunk, working_dir):
                state.completed_chunks += 1
                print(f" Chunk {chunk.number} COMPLETED")
                logger.log(f"Chunk {chunk.number} COMPLETED - committed to git", to_stdout=False)
            else:
                # Commit failed - try to rollback
                rollback_chunk(chunk, working_dir)
                state.failed_chunks += 1
                print(f" Chunk {chunk.number} FAILED (commit error)")
                logger.log(f"Chunk {chunk.number} FAILED - commit error, rolled back", to_stdout=False)
        else:
            # Validation failed - rollback
            logger.log(f"Chunk {chunk.number} validation FAILED - rolling back", to_stdout=False)
            rollback_chunk(chunk, working_dir)
            state.skipped_chunks += 1
            print(f"  Chunk {chunk.number} SKIPPED (validation failed)")
            logger.log(f"Chunk {chunk.number} SKIPPED - validation failed", to_stdout=False)

    return state


def main():
    parser = argparse.ArgumentParser(description="ADW FP Orchestrator")
    parser.add_argument("target_path", nargs='?', default="app/src/logic",
                        help="Path to audit (default: app/src/logic)")
    parser.add_argument("--severity", choices=["high", "medium", "all"], default="high",
                        help="Severity filter (default: high)")
    parser.add_argument("--chunks", type=str, default=None,
                        help="Comma-separated chunk numbers to process (e.g., '1' or '1,3,5'). Default: all chunks")

    args = parser.parse_args()

    # Initialize logger
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    logger = create_run_logger("fp_orchestrator", timestamp)

    print(f"\n{'='*60}")
    print("ADW FP ORCHESTRATOR")
    print(f"{'='*60}")

    logger.log(f"Target: {args.target_path}", to_stdout=False)
    logger.log(f"Severity: {args.severity}", to_stdout=False)
    if args.chunks:
        logger.log(f"Chunks filter: {args.chunks}", to_stdout=False)

    working_dir = Path.cwd()

    try:
        # Phase 1: Run audit and generate plan
        logger.log_section("PHASE 1: FP AUDIT", to_stdout=False)
        plan_file = run_audit_phase(args.target_path, args.severity, working_dir)
        logger.log(f"Plan created: {plan_file}", to_stdout=False)

        # Extract chunks from plan
        print(f"\n{'='*60}")
        print("EXTRACTING CHUNKS FROM PLAN")
        print(f"{'='*60}")

        logger.log_section("EXTRACTING CHUNKS FROM PLAN", to_stdout=False)
        chunks = extract_chunks_from_plan(plan_file)
        print(f" Extracted {len(chunks)} chunks")
        logger.log(f"Extracted {len(chunks)} chunks", to_stdout=False)

        # Filter chunks if --chunks argument provided
        if args.chunks:
            requested_chunks = [int(x.strip()) for x in args.chunks.split(',')]
            chunks = [c for c in chunks if c.number in requested_chunks]
            print(f" Filtered to {len(chunks)} chunks: {requested_chunks}")
            logger.log(f"Filtered to {len(chunks)} chunks: {requested_chunks}", to_stdout=False)

            if not chunks:
                print(f"  No chunks matched filter: {requested_chunks}")
                logger.log(f"No chunks matched filter: {requested_chunks}", to_stdout=False)
                print("Available chunks:")
                all_chunks = extract_chunks_from_plan(plan_file)
                for c in all_chunks:
                    chunk_info = f"Chunk {c.number}: {c.title}"
                    print(f"  - {chunk_info}")
                    logger.log(chunk_info, to_stdout=False)
                logger.finalize()
                sys.exit(1)

        # Phase 2: Process chunks
        logger.log_section("PHASE 2: CHUNK PROCESSING", to_stdout=False)
        logger.log(f"Processing {len(chunks)} chunks", to_stdout=False)
        state = process_chunks(chunks, plan_file, working_dir, logger)

        # Final summary
        print(f"\n{'='*60}")
        print("FP ORCHESTRATOR COMPLETE")
        print(f"{'='*60}")
        print(f"Total chunks: {state.total_chunks}")
        print(f"Completed: {state.completed_chunks}")
        print(f"Skipped: {state.skipped_chunks}")
        print(f"Failed: {state.failed_chunks}")

        logger.log_summary(
            total_chunks=state.total_chunks,
            completed=state.completed_chunks,
            skipped=state.skipped_chunks,
            failed=state.failed_chunks,
            plan_file=str(state.plan_file)
        )

        notify_success(
            step=f"Orchestrator complete: {state.completed_chunks}/{state.total_chunks} chunks refactored, {state.failed_chunks} failed",
            details=None
        )

        logger.finalize()

    except Exception as e:
        notify_failure(
            step="Orchestrator crashed",
            error=str(e)[:100]
        )
        print(f"\nOrchestrator failed: {e}")
        logger.log_error(e, context="Main orchestrator loop")
        logger.finalize()
        sys.exit(1)


if __name__ == "__main__":
    main()
