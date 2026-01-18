# De-Barreling Implementation Plan

**Created**: 2026-01-17
**Objective**: Remove barrel/hub files to create sparse dependency graphs for better AI-assisted refactoring
**Approach**: Pilot → Verify → Scale → Automate

---

## Current State Analysis

### Barrel File Census (Actual Baseline - 2026-01-18)

| Category | Count | Risk Level | Action |
|----------|-------|------------|--------|
| **Pure Barrels** | 33 | LOW | Remove (update imports) |
| **Mixed Files** | 10 | MEDIUM | Extract logic, then remove |
| **Entry Points** | 2 | HIGH | Keep (framework requirements) |

> **Note**: Baseline established via `python refactor/barrel_detector.py` on 2026-01-18.
> Report saved to `refactor/reports/baseline-20260118.json`

### Pure Barrels by Location

**Logic Layer (6 files)** - HIGH PRIORITY for FP refactoring agent:
1. `app/src/logic/index.js`
2. `app/src/logic/calculators/index.js`
3. `app/src/logic/rules/index.js`
4. `app/src/logic/processors/index.js`
5. `app/src/logic/constants/index.js`
6. `app/src/logic/workflows/index.js`

**Page Component Barrels (6 files)** - MEDIUM PRIORITY:
1. `app/src/islands/pages/HostOverviewPage/components/index.js`
2. `app/src/islands/pages/ListingDashboardPage/components/index.js`
3. `app/src/islands/pages/MessagingPage/components/index.js`
4. `app/src/islands/pages/SearchPage/components/index.js`
5. `app/src/islands/pages/ViewSplitLeasePage/components/index.js`
6. `app/src/islands/pages/FavoriteListingsPage/index.js`

**Shared Component Barrels (11 files)** - LOW PRIORITY:
1. `app/src/islands/shared/FavoriteButton/index.js`
2. `app/src/islands/shared/LoggedInAvatar/index.js`
3. `app/src/islands/shared/AIImportAssistantModal/index.js`
4. `app/src/islands/shared/CreateDuplicateListingModal/index.js`
5. `app/src/islands/shared/SubmitListingPhotos/index.js`
6. `app/src/islands/shared/ImportListingReviewsModal/index.js`
7. `app/src/islands/shared/NotificationSettingsIsland/index.js`
8. `app/src/islands/shared/AiSignupMarketReport/index.js`
9. `app/src/islands/shared/HostScheduleSelector/index.js`
10. `app/src/islands/shared/QRCodeDashboard/components/index.js`
11. `app/src/islands/pages/HouseManualPage/index.js`

**Other (5 files)**:
- Various nested component barrels

---

## Phase 1: Build Detection Infrastructure

### 1.1 Create Directory Structure

```
adws/
├── sensors/
│   └── barrel_detector.py      # Detects and categorizes barrel files
├── skills/
│   └── de-barreler/
│       └── SKILL.md            # Skill definition for Claude Code
├── loops/
│   └── debarrel_ralph.py       # Ralph Loop orchestrator
└── reports/
    └── (generated reports)
```

### 1.2 Barrel Detection Script

**File**: `adws/sensors/barrel_detector.py`

```python
#!/usr/bin/env python3
"""
Barrel File Detector for Split Lease Codebase

Scans app/src/ for index.js/jsx/ts/tsx files and categorizes them:
- PURE_BARREL: Only contains re-exports (safe to remove)
- MIXED: Contains re-exports AND logic (needs extraction)
- ENTRY_POINT: Framework-required entry point (keep)

Output: JSON report for downstream processing
"""

import os
import re
import json
import sys
from dataclasses import dataclass, asdict
from typing import List, Literal
from datetime import datetime

# Configuration
SEARCH_PATHS = ["app/src"]
SKIP_DIRS = {"node_modules", ".git", "dist", "build", "__pycache__"}
INDEX_PATTERNS = {"index.js", "index.jsx", "index.ts", "index.tsx"}

# Patterns
RE_EXPORT_PATTERN = re.compile(r'^\s*export\s+(\*|\{[^}]+\}|default)\s+from\s+[\'"]', re.MULTILINE)
IMPORT_PATTERN = re.compile(r'^\s*import\s+', re.MULTILINE)
LOGIC_INDICATORS = [
    r'\bfunction\s+\w+',      # Function declarations
    r'\bconst\s+\w+\s*=\s*\(', # Arrow functions
    r'\bclass\s+\w+',          # Class declarations
    r'useState|useEffect|useMemo|useCallback',  # React hooks
    r'return\s*\(',            # JSX returns
    r'<[A-Z]\w+',              # JSX components
]

@dataclass
class BarrelFile:
    path: str
    category: Literal["PURE_BARREL", "MIXED", "ENTRY_POINT"]
    export_count: int
    has_logic: bool
    exports: List[str]  # List of exported names
    source_files: List[str]  # Files being re-exported from

def analyze_file(filepath: str) -> BarrelFile:
    """Analyze a single index file to determine its category."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return BarrelFile(
            path=filepath,
            category="ENTRY_POINT",  # Assume important if unreadable
            export_count=0,
            has_logic=False,
            exports=[],
            source_files=[]
        )

    # Remove comments for cleaner analysis
    content_no_comments = re.sub(r'//.*', '', content)
    content_no_comments = re.sub(r'/\*[\s\S]*?\*/', '', content_no_comments)

    # Count re-exports
    re_exports = RE_EXPORT_PATTERN.findall(content_no_comments)
    export_count = len(re_exports)

    # Extract source files from exports
    source_pattern = re.compile(r'from\s+[\'"]([^"\']+)[\'"]')
    source_files = list(set(source_pattern.findall(content_no_comments)))

    # Extract exported names
    named_exports = re.findall(r'export\s+\{\s*([^}]+)\s*\}', content_no_comments)
    exports = []
    for group in named_exports:
        names = [n.strip().split(' as ')[0].strip() for n in group.split(',')]
        exports.extend(names)

    # Check for default exports
    if 'export default' in content_no_comments or 'export { default' in content_no_comments:
        exports.append('default')

    # Check for logic indicators
    has_logic = False
    for pattern in LOGIC_INDICATORS:
        if re.search(pattern, content_no_comments):
            has_logic = True
            break

    # Also check for substantial non-export/import lines
    lines = [l.strip() for l in content_no_comments.split('\n') if l.strip()]
    logic_lines = 0
    for line in lines:
        if line.startswith(('export', 'import', '//', '/*', '*', '}', '{', "'use")):
            continue
        if line in ['};', '}', '{', '']:
            continue
        logic_lines += 1

    if logic_lines > 3:  # Threshold for "has logic"
        has_logic = True

    # Categorize
    if export_count == 0:
        category = "ENTRY_POINT"  # Likely a main component file
    elif has_logic:
        category = "MIXED"
    else:
        category = "PURE_BARREL"

    return BarrelFile(
        path=filepath,
        category=category,
        export_count=export_count,
        has_logic=has_logic,
        exports=exports,
        source_files=source_files
    )

def scan_codebase() -> List[BarrelFile]:
    """Scan the codebase for all barrel files."""
    barrels = []

    for search_path in SEARCH_PATHS:
        for root, dirs, files in os.walk(search_path):
            # Skip ignored directories
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

            for filename in files:
                if filename in INDEX_PATTERNS:
                    filepath = os.path.join(root, filename)
                    barrel = analyze_file(filepath)
                    barrels.append(barrel)

    return barrels

def generate_report(barrels: List[BarrelFile]) -> dict:
    """Generate a structured report from barrel analysis."""
    pure = [b for b in barrels if b.category == "PURE_BARREL"]
    mixed = [b for b in barrels if b.category == "MIXED"]
    entry = [b for b in barrels if b.category == "ENTRY_POINT"]

    return {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total": len(barrels),
            "pure_barrels": len(pure),
            "mixed_files": len(mixed),
            "entry_points": len(entry)
        },
        "pure_barrels": [asdict(b) for b in pure],
        "mixed_files": [asdict(b) for b in mixed],
        "entry_points": [asdict(b) for b in entry]
    }

def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Detect barrel files in codebase")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--output", "-o", help="Write report to file")
    parser.add_argument("--pure-only", action="store_true", help="Only list pure barrels")
    args = parser.parse_args()

    barrels = scan_codebase()
    report = generate_report(barrels)

    if args.pure_only:
        # Just output paths for piping to other tools
        for b in report["pure_barrels"]:
            print(b["path"])
        return

    if args.json:
        output = json.dumps(report, indent=2)
    else:
        # Human-readable format
        output = f"""
═══════════════════════════════════════════════════════════════
               BARREL FILE DETECTION REPORT
═══════════════════════════════════════════════════════════════
Generated: {report['timestamp']}

SUMMARY
───────────────────────────────────────────────────────────────
  Total Index Files:  {report['summary']['total']}
  Pure Barrels:       {report['summary']['pure_barrels']} (safe to remove)
  Mixed Files:        {report['summary']['mixed_files']} (needs extraction)
  Entry Points:       {report['summary']['entry_points']} (keep)

PURE BARRELS (Candidates for Removal)
───────────────────────────────────────────────────────────────
"""
        for b in report["pure_barrels"]:
            output += f"  [{b['export_count']:2d} exports] {b['path']}\n"

        output += """
MIXED FILES (Needs Manual Review)
───────────────────────────────────────────────────────────────
"""
        for b in report["mixed_files"]:
            output += f"  [{b['export_count']:2d} exports] {b['path']}\n"

        output += """
═══════════════════════════════════════════════════════════════
"""

    if args.output:
        with open(args.output, 'w') as f:
            f.write(output if not args.json else json.dumps(report, indent=2))
        print(f"Report written to: {args.output}")
    else:
        print(output)

if __name__ == "__main__":
    main()
```

### 1.3 Verification Steps

After creating the script:

1. **Run detection**:
   ```powershell
   python adws/sensors/barrel_detector.py
   ```

2. **Verify output** matches expected ~28 pure barrels

3. **Generate baseline report**:
   ```powershell
   python adws/sensors/barrel_detector.py --json -o adws/reports/baseline-$(Get-Date -Format "yyyyMMdd").json
   ```

---

## Phase 2: First Manual Pilot

### Target Selection Criteria

Choose a **LOW RISK** barrel for the first pilot:
- Has few exports (2-4)
- Has few consumers (1-2 files import from it)
- Is in a non-critical path

**Recommended First Target**: `app/src/islands/shared/FavoriteButton/index.js`
- Single export: `export { default } from './FavoriteButton.jsx'`
- Simple, contained component
- Likely 1-2 consumers

### 2.1 Analyze the Target

```powershell
# Read the barrel file
cat app/src/islands/shared/FavoriteButton/index.js

# Find consumers (files importing from this barrel)
grep -r "from.*FavoriteButton'" app/src --include="*.js" --include="*.jsx"
grep -r "from.*FavoriteButton\"" app/src --include="*.js" --include="*.jsx"
```

### 2.2 Refactor Steps

1. **Map the exports**:
   - `default` → `./FavoriteButton.jsx`

2. **Update consumers**:

   **BEFORE**:
   ```javascript
   import FavoriteButton from '@/islands/shared/FavoriteButton';
   ```

   **AFTER**:
   ```javascript
   import FavoriteButton from '@/islands/shared/FavoriteButton/FavoriteButton.jsx';
   ```

3. **Delete the barrel**:
   ```powershell
   rm app/src/islands/shared/FavoriteButton/index.js
   ```

### 2.3 Verification Checklist

- [ ] Run `bun run dev` - does the dev server start?
- [ ] Navigate to a page using FavoriteButton - does it render?
- [ ] Run `bun run build` - does the build succeed?
- [ ] Re-run barrel detector - is count reduced by 1?

### 2.4 Commit

```powershell
git add -A
git commit -m "refactor(cleanup): remove FavoriteButton barrel file

- Updated imports to point directly to FavoriteButton.jsx
- Barrel count: 28 → 27"
```

---

## Phase 3: Second Manual Pilot (Slightly More Complex)

### Target Selection

Choose a barrel with **MULTIPLE exports** to test the more complex case.

**Recommended Second Target**: `app/src/islands/pages/HostOverviewPage/components/index.js`
- Multiple named exports
- Multiple source files
- Tests the "multi-consumer update" scenario

### 3.1 Analyze the Target

```powershell
# Read the barrel
cat "app/src/islands/pages/HostOverviewPage/components/index.js"

# Find consumers
grep -r "from.*HostOverviewPage/components'" app/src --include="*.js" --include="*.jsx"
```

### 3.2 Expected Refactor Pattern

**BEFORE** (consumer file):
```javascript
import {
  Card,
  ListingCard,
  ClaimListingCard,
  Modal
} from './components';
```

**AFTER** (consumer file):
```javascript
import { Card, ListingCard, ClaimListingCard } from './components/HostOverviewCards.jsx';
import { Modal } from './components/HostOverviewModals.jsx';
```

### 3.3 Verification Checklist

- [ ] Run `bun run dev` - does the dev server start?
- [ ] Navigate to Host Overview page - does it render?
- [ ] Test all interactive elements (cards, modals)
- [ ] Run `bun run build` - does build succeed?
- [ ] Re-run barrel detector - is count reduced by 1?

### 3.4 Commit

```powershell
git add -A
git commit -m "refactor(cleanup): remove HostOverviewPage components barrel

- Updated HostOverviewPage imports to point directly to source files
- Barrel count: 27 → 26"
```

---

## Phase 4: Create the De-Barreler Skill

### 4.1 Skill Definition

**File**: `.claude/skills/de-barreler.md`

```markdown
---
name: de-barreler
description: Removes barrel files by refactoring consumer imports to point directly to source files
triggers:
  - "remove barrel"
  - "explode barrel"
  - "de-barrel"
  - "flatten imports"
---

# De-Barreler Skill

You are an expert Refactoring Agent specialized in removing barrel (index.js) files to flatten dependency graphs.

## Objective

Given a target barrel file path, you will:
1. Analyze what the barrel exports and from where
2. Find all files that import from the barrel
3. Update those imports to point directly to source files
4. Delete the barrel file
5. Verify the refactor didn't break anything

## Process

### Step 1: Analyze the Barrel

Read the target barrel file and create an export map:

```
Export Name → Source File
─────────────────────────
Button      → ./Button.jsx
Icon        → ./Icon.jsx
default     → ./MainComponent.jsx
```

### Step 2: Find Consumers

Search for files importing from the barrel's directory:

```bash
# Pattern to search
import.*from.*'{barrel_directory}'
import.*from.*"{barrel_directory}"
```

### Step 3: Refactor Each Consumer

For each consumer file:

**Transform destructured imports:**
```javascript
// BEFORE
import { Button, Icon } from './components';

// AFTER
import Button from './components/Button.jsx';
import Icon from './components/Icon.jsx';
```

**Transform default imports:**
```javascript
// BEFORE
import MainComponent from './components';

// AFTER
import MainComponent from './components/MainComponent.jsx';
```

**Transform namespace imports:**
```javascript
// BEFORE
import * as Components from './components';

// AFTER
// This pattern requires keeping the barrel OR manual refactor of usage sites
// Flag for human review
```

### Step 4: Delete the Barrel

```bash
rm {barrel_file_path}
```

### Step 5: Verify

1. Run `bun run dev` to check for import errors
2. Run `bun run build` to verify production build
3. Report success or failure

## Constraints

- **NEVER** modify source component files (only update imports in consumer files)
- **STOP** if barrel contains actual logic (not just re-exports)
- **FLAG** namespace imports (`import * as X`) for human review
- **PRESERVE** any TypeScript type imports separately

## Output Format

After completing the refactor, output:

```
═══════════════════════════════════════════════
DE-BARREL COMPLETE
═══════════════════════════════════════════════
Target:     {barrel_file_path}
Status:     SUCCESS | FAILED | NEEDS_REVIEW
Exports:    {count}
Consumers:  {count} files updated
Deleted:    {barrel_file_path}

Changes:
  - {consumer_file_1}: updated {n} imports
  - {consumer_file_2}: updated {n} imports

Verification:
  - Dev server: ✓ PASS
  - Build:      ✓ PASS
═══════════════════════════════════════════════
```

## Error Handling

If the barrel contains logic:
```
⚠️ BARREL CONTAINS LOGIC - MANUAL REVIEW REQUIRED
File: {path}
Logic detected: {description}
Action: Extract logic to separate file before de-barreling
```

If namespace import found:
```
⚠️ NAMESPACE IMPORT DETECTED - MANUAL REVIEW REQUIRED
Consumer: {consumer_path}
Pattern: import * as {name} from '{barrel}'
Action: Refactor usage sites to use direct imports
```
```

### 4.2 Register the Skill

Add to `.claude/settings.json` or appropriate skill registry location.

---

## Phase 5: Ralph Loop Automation

### 5.1 Ralph Loop Script

**File**: `adws/loops/debarrel_ralph.py`

```python
#!/usr/bin/env python3
"""
De-Barrel Ralph Loop

Automated loop that:
1. Detects remaining barrel files
2. Picks a batch
3. Invokes de-barreler skill for each
4. Verifies build
5. Commits changes
6. Repeats until no barrels remain or max cycles reached
"""

import subprocess
import json
import time
import sys
import os
from datetime import datetime

# Configuration
BATCH_SIZE = 3          # Files per cycle
MAX_CYCLES = 20         # Safety limit
VERIFY_COMMAND = "bun run build"
SENSOR_SCRIPT = "adws/sensors/barrel_detector.py"

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}")

def get_pure_barrels():
    """Get list of pure barrel files from sensor."""
    result = subprocess.run(
        ["python", SENSOR_SCRIPT, "--pure-only"],
        capture_output=True,
        text=True,
        cwd=os.getcwd()
    )
    if result.returncode != 0:
        log(f"Sensor failed: {result.stderr}", "ERROR")
        return []

    barrels = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
    return barrels

def invoke_debarreler(filepath):
    """Invoke Claude's de-barreler skill on a single file."""
    log(f"De-barreling: {filepath}")

    # Construct the prompt for Claude Code
    prompt = f"""
/de-barreler

Target barrel file: {filepath}

Execute the de-barrel process:
1. Analyze the exports in {filepath}
2. Find all files that import from this barrel
3. Update imports to point directly to source files
4. Delete {filepath}
5. Report the result
"""

    # This would invoke Claude Code CLI
    # Replace with your actual invocation method
    result = subprocess.run(
        ["claude", "-p", prompt, "--yes"],  # --yes to auto-approve
        capture_output=True,
        text=True,
        timeout=300  # 5 minute timeout
    )

    return result.returncode == 0

def verify_build():
    """Run build verification."""
    log("Verifying build...")
    result = subprocess.run(
        VERIFY_COMMAND.split(),
        capture_output=True,
        text=True,
        timeout=300
    )

    if result.returncode == 0:
        log("Build verification: PASSED", "SUCCESS")
        return True
    else:
        log(f"Build verification: FAILED\n{result.stderr}", "ERROR")
        return False

def git_commit(files_processed):
    """Commit the changes."""
    msg = f"refactor(cleanup): remove {len(files_processed)} barrel files\n\nRemoved:\n"
    for f in files_processed:
        msg += f"- {f}\n"

    subprocess.run(["git", "add", "-A"])
    subprocess.run(["git", "commit", "-m", msg])
    log(f"Committed {len(files_processed)} barrel removals")

def git_revert():
    """Revert uncommitted changes."""
    log("Reverting changes...", "WARN")
    subprocess.run(["git", "checkout", "."])
    subprocess.run(["git", "clean", "-fd"])

def ralph_loop():
    """Main Ralph Loop."""
    log("═══════════════════════════════════════════════════════════════")
    log("           DE-BARREL RALPH LOOP STARTING")
    log("═══════════════════════════════════════════════════════════════")

    cycle = 0
    total_removed = 0

    while cycle < MAX_CYCLES:
        cycle += 1
        log(f"\n─── CYCLE {cycle}/{MAX_CYCLES} ───")

        # Get current barrel count
        barrels = get_pure_barrels()
        count = len(barrels)
        log(f"Remaining pure barrels: {count}")

        if count == 0:
            log("✅ MISSION COMPLETE: No barrel files remaining!", "SUCCESS")
            break

        # Pick batch (prioritize by location for logical grouping)
        batch = barrels[:BATCH_SIZE]
        log(f"Processing batch of {len(batch)} files")

        # Process each file
        processed = []
        for filepath in batch:
            try:
                if invoke_debarreler(filepath):
                    processed.append(filepath)
                else:
                    log(f"Failed to de-barrel: {filepath}", "WARN")
            except Exception as e:
                log(f"Error processing {filepath}: {e}", "ERROR")

        if not processed:
            log("No files successfully processed in this batch", "WARN")
            continue

        # Verify
        if verify_build():
            git_commit(processed)
            total_removed += len(processed)
            log(f"Cycle {cycle} complete: {len(processed)} barrels removed")
        else:
            log("Build failed! Reverting changes.", "ERROR")
            git_revert()
            log("Consider running manually to debug the issue")
            break

        # Brief pause between cycles
        time.sleep(2)

    # Final report
    log("\n═══════════════════════════════════════════════════════════════")
    log("                    RALPH LOOP COMPLETE")
    log("═══════════════════════════════════════════════════════════════")
    log(f"Cycles run:     {cycle}")
    log(f"Barrels removed: {total_removed}")

    remaining = get_pure_barrels()
    log(f"Remaining:      {len(remaining)}")

    if remaining:
        log("\nRemaining barrels (may need manual review):")
        for b in remaining:
            log(f"  - {b}")

if __name__ == "__main__":
    ralph_loop()
```

### 5.2 Ralph Loop Skill Registration

**File**: `.claude/skills/ralph-loop/debarrel-loop.md`

```markdown
---
name: debarrel-loop
description: Starts Ralph Loop for automated barrel file removal
triggers:
  - "ralph debarrel"
  - "start debarrel loop"
  - "automate barrel removal"
---

# De-Barrel Ralph Loop

Initiates an automated loop that continuously removes barrel files until none remain.

## Invocation

```bash
python adws/loops/debarrel_ralph.py
```

## Configuration

Edit `adws/loops/debarrel_ralph.py` to adjust:
- `BATCH_SIZE`: Files per cycle (default: 3)
- `MAX_CYCLES`: Safety limit (default: 20)
- `VERIFY_COMMAND`: Build verification command

## Monitoring

The loop outputs progress to stdout. Watch for:
- `[SUCCESS]` - Cycle completed successfully
- `[WARN]` - Non-critical issue
- `[ERROR]` - Critical issue, loop may stop

## Stopping

- `Ctrl+C` to interrupt
- Loop auto-stops if build fails
- Loop auto-stops when no barrels remain
```

---

## Phase Summary & Execution Order

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION ROADMAP                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 1: Build Infrastructure                                  │
│  ├─ 1.1 Create adws/sensors/barrel_detector.py                 │
│  ├─ 1.2 Run detector, verify output                            │
│  └─ 1.3 Generate baseline report                               │
│       ↓                                                        │
│  PHASE 2: First Pilot (Simple)                                  │
│  ├─ 2.1 Target: FavoriteButton/index.js                        │
│  ├─ 2.2 Manual refactor                                        │
│  ├─ 2.3 Verify: dev server + build                             │
│  └─ 2.4 Commit, re-run detector (28 → 27)                      │
│       ↓                                                        │
│  PHASE 3: Second Pilot (Complex)                                │
│  ├─ 3.1 Target: HostOverviewPage/components/index.js           │
│  ├─ 3.2 Manual refactor (multiple exports)                     │
│  ├─ 3.3 Verify: dev server + build + page test                 │
│  └─ 3.4 Commit, re-run detector (27 → 26)                      │
│       ↓                                                        │
│  PHASE 4: Create Skill                                          │
│  ├─ 4.1 Write .claude/skills/de-barreler.md                    │
│  ├─ 4.2 Test skill on 1 file                                   │
│  └─ 4.3 Verify skill output matches manual process             │
│       ↓                                                        │
│  PHASE 5: Ralph Loop                                            │
│  ├─ 5.1 Create adws/loops/debarrel_ralph.py                    │
│  ├─ 5.2 Test loop with BATCH_SIZE=1, MAX_CYCLES=2              │
│  └─ 5.3 Full run until barrel count = 0                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Success Criteria

| Phase | Metric | Target |
|-------|--------|--------|
| Phase 1 | Detector runs without errors | ✓ |
| Phase 1 | Detects ~28 pure barrels | ✓ |
| Phase 2 | Barrel count reduces by 1 | 28 → 27 |
| Phase 2 | Build passes | ✓ |
| Phase 3 | Barrel count reduces by 1 | 27 → 26 |
| Phase 3 | Page functionality intact | ✓ |
| Phase 4 | Skill executes successfully | ✓ |
| Phase 4 | Skill output matches manual | ✓ |
| Phase 5 | Loop completes without errors | ✓ |
| Phase 5 | Final barrel count | 0 |

---

## Risk Mitigation

1. **Build Breakage**: Each phase includes build verification before commit
2. **Import Path Issues**: Detector identifies exact source files, not guesses
3. **Mixed Files**: Detector categorizes separately, requires manual extraction
4. **Circular Dependencies**: If detected during refactor, flag for manual review
5. **TypeScript Paths**: Handle `@/` aliases by resolving to actual paths

---

## Files to Create/Modify

| File | Action | Phase |
|------|--------|-------|
| `adws/sensors/barrel_detector.py` | CREATE | 1 |
| `adws/reports/` | CREATE (directory) | 1 |
| `.claude/skills/de-barreler.md` | CREATE | 4 |
| `adws/loops/debarrel_ralph.py` | CREATE | 5 |
| `app/src/islands/shared/FavoriteButton/index.js` | DELETE | 2 |
| `app/src/islands/pages/HostOverviewPage/components/index.js` | DELETE | 3 |
| Various consumer files | MODIFY (imports) | 2-5 |

---

## Test Strategy

### Overview

De-barreling doesn't change runtime behavior—it changes *how* code is loaded. Tests must verify:
1. **Import resolution** works at build time (no broken paths)
2. **Runtime behavior** remains unchanged (same components render)
3. **Build optimization** isn't degraded (tree-shaking, bundle size)

### Test Directory Structure

```
refactor/
├── barrel_detector.py           # Detection script (CREATED)
├── reports/
│   └── baseline-20260118.json   # Baseline snapshot (CREATED)
└── tests/
    ├── baseline/                # Run BEFORE de-barreling
    │   ├── import-resolution.test.js
    │   ├── component-render.test.jsx
    │   └── build-health.test.js
    ├── verification/            # Run AFTER each phase
    │   ├── barrel-removal.test.js
    │   ├── direct-imports.test.js
    │   ├── orphaned-imports.test.js
    │   └── consumer-updates.test.js
    ├── phase-specific/          # Phase-targeted tests
    │   ├── phase2-favorite-button.test.jsx
    │   └── phase3-host-overview.test.jsx
    ├── regression/              # Performance & optimization
    │   ├── tree-shaking.test.js
    │   └── build-performance.test.js
    └── e2e/                     # End-to-end smoke tests
        └── smoke.test.js
```

---

### 1. Baseline Tests (BEFORE De-Barreling)

#### 1.1 Build Health Baseline

```bash
# Capture baseline metrics BEFORE any changes
bun run build 2>&1 | tee refactor/reports/baseline-build.log

# Measure bundle sizes
ls -la app/dist/assets/*.js | tee refactor/reports/baseline-bundle-sizes.txt
```

#### 1.2 Import Resolution Baseline Test

**File**: `refactor/tests/baseline/import-resolution.test.js`

```javascript
import { describe, it, expect } from 'vitest';

// Logic layer barrels
describe('Logic Layer Barrel Imports (Baseline)', () => {
  it('can import from logic/index.js', async () => {
    const mod = await import('@/logic');
    expect(mod).toBeDefined();
  });

  it('can import from logic/calculators/index.js', async () => {
    const mod = await import('@/logic/calculators');
    expect(mod).toBeDefined();
  });

  it('can import from logic/rules/index.js', async () => {
    const mod = await import('@/logic/rules');
    expect(mod).toBeDefined();
  });

  it('can import from logic/processors/index.js', async () => {
    const mod = await import('@/logic/processors');
    expect(mod).toBeDefined();
  });
});

// Shared component barrels
describe('Shared Component Barrel Imports (Baseline)', () => {
  it('can import FavoriteButton from barrel', async () => {
    const mod = await import('@/islands/shared/FavoriteButton');
    expect(mod.default).toBeDefined();
  });

  it('can import LoggedInAvatar from barrel', async () => {
    const mod = await import('@/islands/shared/LoggedInAvatar');
    expect(mod.default).toBeDefined();
  });
});

// Page component barrels
describe('Page Component Barrel Imports (Baseline)', () => {
  it('can import HostOverviewPage components from barrel', async () => {
    const mod = await import('@/islands/pages/HostOverviewPage/components');
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('can import SearchPage components from barrel', async () => {
    const mod = await import('@/islands/pages/SearchPage/components');
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });
});
```

#### 1.3 Component Render Baseline Test

**File**: `refactor/tests/baseline/component-render.test.jsx`

```javascript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// Components that rely on barrel imports
import FavoriteButton from '@/islands/shared/FavoriteButton';

describe('Component Rendering (Baseline)', () => {
  it('FavoriteButton renders from barrel import', () => {
    render(<FavoriteButton listingId="test-123" />);
    expect(document.body).toBeDefined();
  });
});
```

---

### 2. Post-Refactor Verification Tests (AFTER Each Phase)

#### 2.1 Barrel Removal Verification

**File**: `refactor/tests/verification/barrel-removal.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Barrel File Removal Verification', () => {
  // Update this list as barrels are removed
  const removedBarrels = [
    // Phase 2
    'app/src/islands/shared/FavoriteButton/index.js',
    // Phase 3
    'app/src/islands/pages/HostOverviewPage/components/index.js',
    // Add more as they're removed
  ];

  removedBarrels.forEach((barrelPath) => {
    it(`${barrelPath} should be deleted`, () => {
      const fullPath = path.resolve(process.cwd(), barrelPath);
      expect(fs.existsSync(fullPath)).toBe(false);
    });
  });
});
```

#### 2.2 Direct Import Resolution Test

**File**: `refactor/tests/verification/direct-imports.test.js`

```javascript
import { describe, it, expect } from 'vitest';

describe('Direct Import Resolution (Post-Debarrel)', () => {
  // After FavoriteButton barrel is removed
  it('can import FavoriteButton directly', async () => {
    const mod = await import('@/islands/shared/FavoriteButton/FavoriteButton.jsx');
    expect(mod.default).toBeDefined();
  });

  // After HostOverviewPage barrel is removed
  it('can import HostOverview components directly', async () => {
    const Cards = await import('@/islands/pages/HostOverviewPage/components/HostOverviewCards.jsx');
    expect(Cards).toBeDefined();
  });
});
```

#### 2.3 Orphaned Import Detection Script

**File**: `refactor/scripts/check-orphaned-imports.sh`

```bash
#!/bin/bash
# Run after de-barreling to find any broken imports

echo "Checking for imports pointing to removed barrels..."

# List of removed barrel directories (update as you progress)
REMOVED=(
  "islands/shared/FavoriteButton'"
  "islands/shared/FavoriteButton\""
  "HostOverviewPage/components'"
  "HostOverviewPage/components\""
)

FOUND_ERRORS=0

for pattern in "${REMOVED[@]}"; do
  matches=$(grep -r "from.*$pattern" app/src --include="*.js" --include="*.jsx" 2>/dev/null | grep -v ".test." | grep -v "node_modules")
  if [ ! -z "$matches" ]; then
    echo "ERROR: Found orphaned imports for pattern: $pattern"
    echo "$matches"
    FOUND_ERRORS=1
  fi
done

if [ $FOUND_ERRORS -eq 0 ]; then
  echo "OK: No orphaned imports found"
  exit 0
else
  exit 1
fi
```

#### 2.4 Consumer Import Update Verification

**File**: `refactor/tests/verification/consumer-updates.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('Consumer Import Updates', () => {
  // After FavoriteButton de-barrel, verify its consumers were updated
  const favoriteButtonConsumers = [
    'app/src/islands/pages/SearchPage/SearchPage.jsx',
    'app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx',
    // Add actual consumers found during analysis
  ];

  favoriteButtonConsumers.forEach((consumerPath) => {
    it(`${consumerPath} imports FavoriteButton directly`, () => {
      if (!fs.existsSync(consumerPath)) return; // Skip if file doesn't exist

      const content = fs.readFileSync(consumerPath, 'utf-8');

      // Should NOT have old barrel import
      expect(content).not.toMatch(/from.*FavoriteButton['"](?!\/FavoriteButton)/);

      // Should have direct import (or no import if not using)
      const usesFavoriteButton = content.includes('FavoriteButton');
      if (usesFavoriteButton) {
        expect(content).toMatch(/from.*FavoriteButton\/FavoriteButton/);
      }
    });
  });
});
```

---

### 3. Phase-Specific Tests

#### Phase 2: FavoriteButton Pilot

**File**: `refactor/tests/phase-specific/phase2-favorite-button.test.jsx`

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Import using the NEW direct path (post-debarrel)
import FavoriteButton from '@/islands/shared/FavoriteButton/FavoriteButton.jsx';

describe('Phase 2: FavoriteButton Post-Debarrel', () => {
  it('renders correctly after barrel removal', () => {
    render(<FavoriteButton listingId="test-listing-123" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles click interactions', async () => {
    const onFavorite = vi.fn();
    render(
      <FavoriteButton
        listingId="test-listing-123"
        onFavorite={onFavorite}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    // Verify interaction still works
  });

  it('maintains same props interface', () => {
    const props = {
      listingId: 'test',
      isFavorited: false,
      onFavorite: () => {},
    };

    expect(() => render(<FavoriteButton {...props} />)).not.toThrow();
  });
});
```

#### Phase 3: HostOverviewPage Components Pilot

**File**: `refactor/tests/phase-specific/phase3-host-overview.test.jsx`

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Import using NEW direct paths (post-debarrel)
// Note: Update these paths based on actual file structure
import { Card, ListingCard, ClaimListingCard } from '@/islands/pages/HostOverviewPage/components/HostOverviewCards.jsx';
import { Modal } from '@/islands/pages/HostOverviewPage/components/HostOverviewModals.jsx';

describe('Phase 3: HostOverviewPage Components Post-Debarrel', () => {
  it('Card renders correctly', () => {
    render(<Card title="Test Card">Content</Card>);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('ListingCard renders with listing data', () => {
    render(<ListingCard listing={{ id: '1', title: 'Test Listing' }} />);
    expect(screen.getByText('Test Listing')).toBeInTheDocument();
  });

  it('Modal renders and can be controlled', () => {
    render(<Modal isOpen={true} onClose={() => {}}>Modal Content</Modal>);
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });
});
```

---

### 4. Regression & Performance Tests

#### 4.1 Tree Shaking Effectiveness

**File**: `refactor/tests/regression/tree-shaking.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Tree Shaking Effectiveness', () => {
  it('bundle size does not increase after de-barreling', () => {
    const bundlePath = path.resolve('app/dist/assets');

    if (!fs.existsSync(bundlePath)) {
      console.warn('Build not found, skipping bundle size test');
      return;
    }

    const jsFiles = fs.readdirSync(bundlePath).filter(f => f.endsWith('.js'));
    const totalSize = jsFiles.reduce((sum, f) => {
      return sum + fs.statSync(path.join(bundlePath, f)).size;
    }, 0);

    // Read baseline from report (update this value after establishing baseline)
    const baselineSize = 5000000; // ~5MB placeholder

    // Should be same or smaller (allow 5% tolerance for minor variations)
    expect(totalSize).toBeLessThanOrEqual(baselineSize * 1.05);
  });
});
```

#### 4.2 Build Comparison Script

**File**: `refactor/scripts/compare-builds.sh`

```bash
#!/bin/bash
echo "Comparing build metrics before/after de-barreling..."

# Run build and capture metrics
bun run build 2>&1 | tee refactor/reports/post-debarrel-build.log

echo ""
echo "=== Bundle Size Comparison ==="
echo "BEFORE:"
cat refactor/reports/baseline-bundle-sizes.txt 2>/dev/null || echo "(no baseline found)"
echo ""
echo "AFTER:"
ls -la app/dist/assets/*.js 2>/dev/null || echo "(build not found)"

# Note: Bundle sizes should stay the same or decrease (better tree-shaking)
# An INCREASE would indicate a problem
```

---

### 5. E2E Smoke Tests

**File**: `refactor/tests/e2e/smoke.test.js` (Playwright)

```javascript
import { test, expect } from '@playwright/test';

test.describe('E2E Smoke Tests Post-Debarrel', () => {
  test('Home page loads without errors', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => consoleLogs.push(msg.text()));

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    await page.waitForTimeout(2000);

    const importErrors = consoleLogs.filter(log =>
      log.includes('Failed to resolve import') ||
      log.includes('Cannot find module')
    );
    expect(importErrors).toHaveLength(0);
  });

  test('Search page renders with FavoriteButton', async ({ page }) => {
    await page.goto('/search');
    // Adjust selector based on actual implementation
    await expect(page.locator('[data-testid="favorite-button"]').first()).toBeVisible();
  });

  test('Host Overview page renders all components', async ({ page }) => {
    // Note: May need authentication
    await page.goto('/host/overview');
    await expect(page.locator('[data-testid="listing-card"]').first()).toBeVisible();
  });
});
```

---

### 6. Test Execution Script

**File**: `refactor/scripts/run-tests.sh`

```bash
#!/bin/bash
echo "======================================================================"
echo "               DE-BARREL TEST SUITE"
echo "======================================================================"

PHASE=${1:-"baseline"}

case $PHASE in
  "baseline")
    echo "Running BASELINE tests (before de-barreling)..."
    bun run test refactor/tests/baseline/
    python refactor/barrel_detector.py --json -o refactor/reports/baseline-barrels.json
    bun run build
    ;;

  "post-phase2")
    echo "Running Phase 2 verification tests..."
    bun run test refactor/tests/phase-specific/phase2-*
    bun run test refactor/tests/verification/
    ./refactor/scripts/check-orphaned-imports.sh
    ;;

  "post-phase3")
    echo "Running Phase 3 verification tests..."
    bun run test refactor/tests/phase-specific/phase3-*
    bun run test refactor/tests/verification/
    ;;

  "full")
    echo "Running FULL test suite..."
    bun run test refactor/tests/
    bun run build
    ./refactor/scripts/compare-builds.sh
    python refactor/barrel_detector.py
    ;;

  *)
    echo "Usage: $0 [baseline|post-phase2|post-phase3|full]"
    exit 1
    ;;
esac

echo "======================================================================"
echo "                    TESTS COMPLETE"
echo "======================================================================"
```

---

### Test Execution Summary Table

| Test Category | Purpose | When to Run |
|---------------|---------|-------------|
| Import Resolution Baseline | Verify barrel imports work | BEFORE Phase 1 |
| Component Render Baseline | Verify components render via barrels | BEFORE Phase 1 |
| Build Health Baseline | Capture build time + bundle sizes | BEFORE Phase 1 |
| Barrel Census Baseline | Count barrels (expect 33) | BEFORE Phase 1 |
| Barrel Removal Verification | Confirm barrels are deleted | AFTER each phase |
| Direct Import Resolution | Verify direct imports work | AFTER each phase |
| Orphaned Import Check | Find broken barrel references | AFTER each phase |
| Consumer Update Verification | Verify consumers updated | AFTER each phase |
| Build Comparison | Compare bundle sizes | AFTER all phases |
| E2E Smoke Tests | Verify app works end-to-end | AFTER each phase |

---

## Next Steps

1. **Approve this plan** - Review and confirm approach
2. **Execute Phase 1** - Build and test the detector ✓ COMPLETE
3. **Create test infrastructure** - Set up `refactor/tests/` directory
4. **Run baseline tests** - Establish baseline before any changes
5. **Execute Phase 2** - First pilot with FavoriteButton
6. **Continue sequentially** through remaining phases

Ready to proceed?
