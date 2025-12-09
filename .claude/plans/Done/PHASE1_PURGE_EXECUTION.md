# Phase 1: Complete Purge Execution Guide

## Overview
This document provides the exact files to delete and modify for Phase 1 of the guest-proposals migration.

**CRITICAL**: Before executing, create a git branch for safety:
```bash
git checkout -b feature/guest-proposals-migration
```

---

## Files to DELETE (22 files)

### Category 1: Entry Points (2 files)
```
app/public/guest-proposals.html
app/src/guest-proposals.jsx
```

### Category 2: Main Page Components (2 files)
```
app/src/islands/pages/GuestProposalsPage.jsx
app/src/islands/pages/useGuestProposalsPageLogic.js
```

### Category 3: Proposal Components - ENTIRE DIRECTORY (4 files)
```
app/src/islands/proposals/EmptyState.jsx
app/src/islands/proposals/ProgressTracker.jsx
app/src/islands/proposals/ProposalCard.jsx
app/src/islands/proposals/ProposalSelector.jsx
```
**Note**: Delete entire `app/src/islands/proposals/` directory after deleting files

### Category 4: Modal Components - PROPOSAL RELATED ONLY (7 files)
```
app/src/islands/modals/CompareTermsModal.jsx
app/src/islands/modals/EditProposalModal.jsx
app/src/islands/modals/HostProfileModal.jsx
app/src/islands/modals/MapModal.jsx
app/src/islands/modals/ProposalDetailsModal.jsx
app/src/islands/modals/ProposalDetailsModal (1).jsx    (duplicate file with space in name)
app/src/islands/modals/VirtualMeetingModal.jsx
```

**DO NOT DELETE** (not proposal-specific):
- `NotificationSettingsModal.jsx` (used elsewhere)

### Category 5: Data Utilities (1 file)
```
app/src/lib/proposalDataFetcher.js
```

### Category 6: Logic Core - Processors (1 file)
```
app/src/logic/processors/proposal/processProposalData.js
```
**Note**: Delete `app/src/logic/processors/proposal/` directory after deleting file

### Category 7: Logic Core - Workflows (3 files)
```
app/src/logic/workflows/booking/acceptProposalWorkflow.js
app/src/logic/workflows/booking/cancelProposalWorkflow.js
app/src/logic/workflows/booking/loadProposalDetailsWorkflow.js
```
**Note**: Keep `app/src/logic/workflows/booking/` directory (may have other files in future)

### Category 8: Logic Core - Rules (4 files)
```
app/src/logic/rules/proposals/canAcceptProposal.js
app/src/logic/rules/proposals/canCancelProposal.js
app/src/logic/rules/proposals/canEditProposal.js
app/src/logic/rules/proposals/determineProposalStage.js
```
**Note**: Delete `app/src/logic/rules/proposals/` directory after deleting files

---

## Files to MODIFY (3 files)

### 1. app/src/logic/processors/index.js

**Remove this line:**
```javascript
// Proposal Processors
export { processProposalData } from './proposal/processProposalData.js'
```

### 2. app/src/logic/workflows/index.js

**Remove these lines:**
```javascript
// Booking Workflows
export { loadProposalDetailsWorkflow } from './booking/loadProposalDetailsWorkflow.js'
export { cancelProposalWorkflow } from './booking/cancelProposalWorkflow.js'
export { acceptProposalWorkflow } from './booking/acceptProposalWorkflow.js'
```

### 3. app/src/logic/rules/index.js

**Remove these lines:**
```javascript
// Proposal Rules
export { determineProposalStage } from './proposals/determineProposalStage.js'
export { canEditProposal } from './proposals/canEditProposal.js'
export { canCancelProposal } from './proposals/canCancelProposal.js'
export { canAcceptProposal } from './proposals/canAcceptProposal.js'
```

---

## Files to KEEP (DO NOT DELETE)

These files are related to proposals but are used by OTHER pages (view-split-lease):

```
app/src/islands/shared/CreateProposalFlowV2.jsx                    (used by view-split-lease)
app/src/islands/shared/CreateProposalFlowV2Components/             (entire directory)
  - DaysSelectionSection.jsx
  - MoveInSection.jsx
  - ReviewSection.jsx
  - UserDetailsSection.jsx
app/src/styles/create-proposal-flow-v2.css                         (used by CreateProposalFlowV2)
app/src/islands/modals/NotificationSettingsModal.jsx               (not proposal-specific)
```

---

## Vite Config - KEEP AS-IS FOR NOW

The `vite.config.js` routing for guest-proposals should remain during purge phase.
It will be updated in Phase 2 when new files are added.

The entry point `'guest-proposals': resolve(__dirname, 'public/guest-proposals.html')`
will cause build warnings after purge but won't break other pages.

---

## Execution Script (Bash)

Run from the `app/` directory:

```bash
#!/bin/bash
# Phase 1 Purge Script - Run from app/ directory

echo "=== Phase 1: Guest Proposals Purge ==="

# Category 1: Entry Points
echo "Deleting entry points..."
rm -f public/guest-proposals.html
rm -f src/guest-proposals.jsx

# Category 2: Main Page Components
echo "Deleting main page components..."
rm -f src/islands/pages/GuestProposalsPage.jsx
rm -f src/islands/pages/useGuestProposalsPageLogic.js

# Category 3: Proposal Components (entire directory)
echo "Deleting proposal components directory..."
rm -rf src/islands/proposals/

# Category 4: Modal Components (proposal-related only)
echo "Deleting proposal-related modals..."
rm -f src/islands/modals/CompareTermsModal.jsx
rm -f src/islands/modals/EditProposalModal.jsx
rm -f src/islands/modals/HostProfileModal.jsx
rm -f src/islands/modals/MapModal.jsx
rm -f src/islands/modals/ProposalDetailsModal.jsx
rm -f "src/islands/modals/ProposalDetailsModal (1).jsx"
rm -f src/islands/modals/VirtualMeetingModal.jsx

# Category 5: Data Utilities
echo "Deleting data utilities..."
rm -f src/lib/proposalDataFetcher.js

# Category 6: Logic Core - Processors
echo "Deleting logic processors..."
rm -f src/logic/processors/proposal/processProposalData.js
rmdir src/logic/processors/proposal/ 2>/dev/null || true

# Category 7: Logic Core - Workflows
echo "Deleting logic workflows..."
rm -f src/logic/workflows/booking/acceptProposalWorkflow.js
rm -f src/logic/workflows/booking/cancelProposalWorkflow.js
rm -f src/logic/workflows/booking/loadProposalDetailsWorkflow.js

# Category 8: Logic Core - Rules
echo "Deleting logic rules..."
rm -f src/logic/rules/proposals/canAcceptProposal.js
rm -f src/logic/rules/proposals/canCancelProposal.js
rm -f src/logic/rules/proposals/canEditProposal.js
rm -f src/logic/rules/proposals/determineProposalStage.js
rmdir src/logic/rules/proposals/ 2>/dev/null || true

echo ""
echo "=== File Deletions Complete ==="
echo ""
echo "NEXT STEPS:"
echo "1. Edit src/logic/processors/index.js - remove processProposalData export"
echo "2. Edit src/logic/workflows/index.js - remove booking workflow exports"
echo "3. Edit src/logic/rules/index.js - remove proposal rule exports"
echo "4. Run 'npm run build' to verify no broken imports"
echo "5. Run 'git status' to verify changes"
echo "6. Commit: git commit -am 'chore: purge existing guest-proposals implementation'"
```

---

## Execution Script (PowerShell for Windows)

Run from the `app/` directory:

```powershell
# Phase 1 Purge Script - Run from app/ directory (PowerShell)

Write-Host "=== Phase 1: Guest Proposals Purge ===" -ForegroundColor Cyan

# Category 1: Entry Points
Write-Host "Deleting entry points..." -ForegroundColor Yellow
Remove-Item -Path "public/guest-proposals.html" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/guest-proposals.jsx" -Force -ErrorAction SilentlyContinue

# Category 2: Main Page Components
Write-Host "Deleting main page components..." -ForegroundColor Yellow
Remove-Item -Path "src/islands/pages/GuestProposalsPage.jsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/islands/pages/useGuestProposalsPageLogic.js" -Force -ErrorAction SilentlyContinue

# Category 3: Proposal Components (entire directory)
Write-Host "Deleting proposal components directory..." -ForegroundColor Yellow
Remove-Item -Path "src/islands/proposals" -Recurse -Force -ErrorAction SilentlyContinue

# Category 4: Modal Components (proposal-related only)
Write-Host "Deleting proposal-related modals..." -ForegroundColor Yellow
Remove-Item -Path "src/islands/modals/CompareTermsModal.jsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/islands/modals/EditProposalModal.jsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/islands/modals/HostProfileModal.jsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/islands/modals/MapModal.jsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/islands/modals/ProposalDetailsModal.jsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/islands/modals/ProposalDetailsModal (1).jsx" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/islands/modals/VirtualMeetingModal.jsx" -Force -ErrorAction SilentlyContinue

# Category 5: Data Utilities
Write-Host "Deleting data utilities..." -ForegroundColor Yellow
Remove-Item -Path "src/lib/proposalDataFetcher.js" -Force -ErrorAction SilentlyContinue

# Category 6: Logic Core - Processors
Write-Host "Deleting logic processors..." -ForegroundColor Yellow
Remove-Item -Path "src/logic/processors/proposal/processProposalData.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/logic/processors/proposal" -Force -ErrorAction SilentlyContinue

# Category 7: Logic Core - Workflows
Write-Host "Deleting logic workflows..." -ForegroundColor Yellow
Remove-Item -Path "src/logic/workflows/booking/acceptProposalWorkflow.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/logic/workflows/booking/cancelProposalWorkflow.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/logic/workflows/booking/loadProposalDetailsWorkflow.js" -Force -ErrorAction SilentlyContinue

# Category 8: Logic Core - Rules
Write-Host "Deleting logic rules..." -ForegroundColor Yellow
Remove-Item -Path "src/logic/rules/proposals/canAcceptProposal.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/logic/rules/proposals/canCancelProposal.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/logic/rules/proposals/canEditProposal.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/logic/rules/proposals/determineProposalStage.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "src/logic/rules/proposals" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== File Deletions Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Edit src/logic/processors/index.js - remove processProposalData export"
Write-Host "2. Edit src/logic/workflows/index.js - remove booking workflow exports"
Write-Host "3. Edit src/logic/rules/index.js - remove proposal rule exports"
Write-Host "4. Run 'npm run build' to verify no broken imports"
Write-Host "5. Run 'git status' to verify changes"
Write-Host "6. Commit: git commit -am 'chore: purge existing guest-proposals implementation'"
```

---

## Post-Purge Verification

### Step 1: Check Git Status
```bash
git status
```

Expected output should show:
- 22 deleted files
- 3 modified files (index.js files)

### Step 2: Check for Broken Imports
```bash
npm run build
```

The build should succeed (guest-proposals entry will be missing but other pages work).
You may see a warning about missing entry point - this is expected.

### Step 3: Verify No Orphaned References
```bash
# Search for any remaining imports from deleted files
grep -r "GuestProposalsPage" src/
grep -r "proposalDataFetcher" src/
grep -r "ProposalCard" src/ --include="*.jsx"
grep -r "CompareTermsModal" src/
```

All should return empty (except for CreateProposalFlowV2 related files which are kept).

### Step 4: Commit the Purge
```bash
git add -A
git commit -m "chore: purge existing guest-proposals implementation for migration

Phase 1 of guest-proposals migration:
- Remove GuestProposalsPage and related components
- Remove proposal modals (Compare, Edit, Host, Map, Details, VM)
- Remove proposalDataFetcher utility
- Remove proposal processors, workflows, and rules from Logic Core
- Keep CreateProposalFlowV2 (used by view-split-lease)
- Keep NotificationSettingsModal (not proposal-specific)

22 files deleted, 3 index files updated"
```

---

## Summary Table

| Category | Files Deleted | Directories Removed |
|----------|---------------|---------------------|
| Entry Points | 2 | 0 |
| Page Components | 2 | 0 |
| Proposal Components | 4 | 1 (proposals/) |
| Modal Components | 7 | 0 |
| Data Utilities | 1 | 0 |
| Logic Processors | 1 | 1 (proposal/) |
| Logic Workflows | 3 | 0 |
| Logic Rules | 4 | 1 (proposals/) |
| **TOTAL** | **24** | **3** |

---

## Ready for Phase 2

After Phase 1 is complete and committed, proceed to Phase 2: Foundation Setup as outlined in `GUEST_PROPOSALS_MIGRATION_PLAN.md`.
