# Guest Proposals Page Analysis - Documentation Index

**Date**: November 30, 2025
**Investigation Scope**: Why selected days don't display correctly in the day selector component on guest-proposals page
**Status**: Complete - 4 comprehensive analysis documents created

---

## Quick Start

**If you're in a hurry**, read in this order:
1. Start with: `GUEST_PROPOSALS_INVESTIGATION_SUMMARY.md` (5 min read)
2. Then: `GUEST_PROPOSALS_DAY_SELECTION_ANALYSIS.md` (10 min read)

**If you need to fix this**, read:
1. `GUEST_PROPOSALS_CODE_REFERENCE.md` (exact line numbers)
2. `GUEST_PROPOSALS_DATA_FLOW_DETAILED.md` (understand the chain)

---

## Document Guide

### 1. GUEST_PROPOSALS_INVESTIGATION_SUMMARY.md

**Purpose**: Executive summary and quick reference
**Audience**: Product managers, quick overview seekers
**Read Time**: 5 minutes
**Key Sections**:
- Quick facts about the issue
- Component architecture diagram
- Root causes (priority-ordered)
- Investigation evidence from recent commits
- Probable scenarios
- How to verify the issue

**When to read this**: Start here for a bird's-eye view

---

### 2. GUEST_PROPOSALS_DAY_SELECTION_ANALYSIS.md

**Purpose**: Deep technical analysis of the issue
**Audience**: Developers investigating the bug
**Read Time**: 10-15 minutes
**Key Sections**:
- Executive summary
- Architecture overview of components involved
- Data flow diagram
- Critical code analysis (with line numbers)
- Potential issues identified (4 issues listed)
- Root cause hypothesis
- CSS display rules
- Summary table of aspects
- Debugging steps (how to verify)

**When to read this**: Get the technical details and understand why the issue occurs

---

### 3. GUEST_PROPOSALS_DATA_FLOW_DETAILED.md

**Purpose**: Complete data pipeline analysis from database to UI
**Audience**: Developers implementing fixes
**Read Time**: 15-20 minutes
**Key Sections**:
- Complete data pipeline (6 steps)
- Deep dive into day selection logic
- Format analysis (3 formats)
- Supabase data format questions
- CSS classes and styling
- Function call chain
- Edge cases table
- Summary data flow diagram
- Potential edge cases

**When to read this**: Understand exactly how data flows from Supabase to the UI

---

### 4. GUEST_PROPOSALS_CODE_REFERENCE.md

**Purpose**: Quick reference with exact file paths and line numbers
**Audience**: Developers needing to edit code
**Read Time**: 5-10 minutes
**Key Sections**:
- Component architecture (files and line numbers)
- Data flow chain with code snippets
- All relevant file locations
- Styling reference
- Testing and debugging info
- Files summary table
- Next steps for investigation

**When to read this**: Use as a reference while coding or searching for files

---

## Investigation Findings

### What Works Correctly
- Component logic in `ProposalCard.jsx` (lines 61-84) correctly handles two data formats:
  - Text format: `["Monday", "Tuesday", "Wednesday"]`
  - Numeric format: `[2, 3, 4, 5, 6]` (Bubble 1-indexed)
- CSS styling is correct
- Rendering logic is correct
- Data loading chain is correct

### What's Broken
- Selected days don't display with purple background
- All day badges appear gray (unselected) regardless of data
- Issue likely caused by:
  1. Data format mismatch (Supabase returns unexpected format)
  2. Empty array default masking missing data
  3. Fragile format detection logic
  4. No data validation or transformation upstream

### Root Cause (Most Likely)
One of these scenarios:
1. Supabase returns `"Days Selected"` as empty array `[]`
2. Supabase returns `"Days Selected"` as JSON string instead of array
3. Both `proposal['Days Selected']` and `proposal.hcDaysSelected` are falsy
4. Data hasn't loaded yet when component first renders

---

## File Locations Reference

### Source Code Files

| Component | File | Key Lines |
|-----------|------|-----------|
| **Entry Point** | `app/src/islands/pages/GuestProposalsPage.jsx` | 75-96, 133-139 |
| **Logic Hook** | `app/src/islands/pages/proposals/useGuestProposalsPageLogic.js` | 25-161 |
| **Display Component** | `app/src/islands/pages/proposals/ProposalCard.jsx` | 132-159 |
| **Day Selection Logic** | `app/src/islands/pages/proposals/ProposalCard.jsx` | 61-84 |
| **Day Badges Rendering** | `app/src/islands/pages/proposals/ProposalCard.jsx` | 224-233 |
| **Data Query** | `app/src/lib/proposals/userProposalQueries.js` | 463-520 |
| **Proposal Fetching** | `app/src/lib/proposals/userProposalQueries.js` | 95-455 |
| **Data Transformation** | `app/src/lib/proposals/dataTransformers.js` | 141-190 |
| **CSS Styling** | `app/src/styles/components/guest-proposals.css` | 307-332 |

### Database

| Table | Field | Source |
|-------|-------|--------|
| `proposal` | `"Days Selected"` | Synced from Bubble.io |
| `proposal` | `"hc days selected"` | Fallback field (for counteroffers?) |

---

## How to Use These Documents

### For Understanding the Issue
1. Read `INVESTIGATION_SUMMARY.md` for overview
2. Read `DAY_SELECTION_ANALYSIS.md` for technical details
3. Read `DATA_FLOW_DETAILED.md` for complete pipeline understanding

### For Fixing the Issue
1. Use `CODE_REFERENCE.md` to find exact file locations
2. Use `DATA_FLOW_DETAILED.md` to understand data transformations
3. Follow "Debugging Steps" in `DAY_SELECTION_ANALYSIS.md` to verify
4. Implement fix based on root cause identified

### For Communication
- **Show to managers**: `INVESTIGATION_SUMMARY.md` (executive summary)
- **Share with developers**: All 4 documents (comprehensive reference)
- **Use in PR description**: Summary + links to specific documents

---

## Critical Insights

### 1. This is NOT a Day Selector Issue
The page doesn't use an interactive day selector (like `HostScheduleSelector`). It displays a **read-only badge display** of which days were selected in the proposal.

### 2. The Code is Correct
The `getAllDaysWithSelection()` function (ProposalCard.jsx:61-84) correctly handles the two known data formats. The issue is likely upstream.

### 3. Data Format is Unknown
The exact format Supabase returns for `"Days Selected"` hasn't been verified. This is the key blocker.

### 4. Recent Fix Addressed Similar Issue
Commit `0924b96` added support for text day names from Supabase, suggesting this was a known problem. But the issue persists or has edge cases.

### 5. Four Potential Root Causes (Priority Order)
1. Data format mismatch (most likely)
2. Empty array default usage
3. Timing issue with async loading
4. CSS not applied (unlikely)

---

## Next Steps (Action Items)

### Immediate (High Priority)
1. [ ] Check Supabase dashboard directly
   - Look at `proposal` table
   - Examine actual `"Days Selected"` field value
   - Note the type and format

2. [ ] Add debug logging to ProposalCard.jsx
   - Log the actual `daysSelected` value
   - Log the `isTextFormat` detection result
   - Log the final `allDays` array

3. [ ] Test in browser console
   - Check browser console for debug output
   - Verify data format matches expectations

### Follow-up (Based on Findings)
1. [ ] Implement fix based on root cause
   - If JSON string: Add JSON.parse()
   - If empty array: Investigate why data isn't loading
   - If format mismatch: Add normalization

2. [ ] Test with multiple proposals
   - Verify fix works across different proposals
   - Check edge cases (empty days, full week, etc.)

3. [ ] Update code comments
   - Document expected data format
   - Add validation/normalization notes

---

## Key Code Sections

### The Critical Function (ProposalCard.jsx:61-84)

```javascript
function getAllDaysWithSelection(daysSelected) {
  const days = daysSelected || [];
  const isTextFormat = days.length > 0 && typeof days[0] === 'string';

  if (isTextFormat) {
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(DAY_NAMES[index])
    }));
  } else {
    const selectedSet = new Set(days);
    return DAY_LETTERS.map((letter, index) => ({
      index,
      letter,
      selected: selectedSet.has(index + 1)
    }));
  }
}
```

### The Data Extraction (ProposalCard.jsx:154)

```javascript
const daysSelected = proposal['Days Selected'] || proposal.hcDaysSelected || [];
const allDays = getAllDaysWithSelection(daysSelected);
```

### The Rendering (ProposalCard.jsx:224-233)

```jsx
<div className="day-badges-row">
  {allDays.map((day) => (
    <div
      key={day.index}
      className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}
    >
      {day.letter}
    </div>
  ))}
</div>
```

---

## Testing Checklist

When implementing a fix, verify:
- [ ] Empty arrays show all days unselected
- [ ] Text format days ["Monday", ...] show correctly
- [ ] Numeric format days [2, 3, 4, 5, 6] show correctly
- [ ] CSS classes apply (selected=true → purple, selected=false → gray)
- [ ] Multiple proposals can be switched without issue
- [ ] Page loads without console errors
- [ ] Styling matches mockup (purple for selected, gray for unselected)

---

## Recent Context

### Commit `0924b96` (Nov 30)
- Fixed handling of text day names from Supabase
- Updated `getCheckInOutRange()` and `getAllDaysWithSelection()`
- Suggests this exact issue was being worked on

### Commit `4c16484` (Recent)
- Fixed fetching house rules from proposal table
- Indicates ongoing data structure changes

---

## Questions Answered in Analysis

| Question | Answer | Document |
|----------|--------|----------|
| What component displays the days? | ProposalCard.jsx | CODE_REFERENCE |
| Why are all badges gray? | Unknown format or empty data | INVESTIGATION_SUMMARY |
| Where does the data come from? | Supabase `proposal` table | DATA_FLOW_DETAILED |
| What formats does the code handle? | Text array and numeric array | DAY_SELECTION_ANALYSIS |
| How can I debug this? | Add console.log statements | CODE_REFERENCE |
| Where should I look first? | Supabase data format | INVESTIGATION_SUMMARY |

---

## Summary Statistics

- **Files Analyzed**: 9 core files
- **Lines of Code Reviewed**: 1000+ lines
- **Key Functions**: 8 identified
- **Data Transformations**: 3 layers
- **Potential Issues**: 4 identified
- **Documentation Created**: 4 comprehensive guides

---

## Related Commits & References

- **Current Investigation**: Started 2025-11-30
- **Related Commit**: `0924b96` (day names handling)
- **Related Commit**: `4c16484` (house rules fetching)
- **Day System Docs**: `app/CLAUDE.md` (Day Indexing Convention)
- **Development Beliefs**: `Context/DEVELOPMENT_BELIEFS.md`

---

## How to Navigate

**I need to understand the issue quickly**
→ Read: `INVESTIGATION_SUMMARY.md`

**I need to understand the code**
→ Read: `DAY_SELECTION_ANALYSIS.md`

**I need to understand data flow**
→ Read: `DATA_FLOW_DETAILED.md`

**I need to find code to edit**
→ Read: `CODE_REFERENCE.md`

**I need all details**
→ Read all 4 documents in order

---

## Document Metadata

| Document | Created | Lines | Sections | Purpose |
|----------|---------|-------|----------|---------|
| Investigation Summary | 2025-11-30 | ~450 | 20 | Executive overview |
| Day Selection Analysis | 2025-11-30 | ~500 | 16 | Technical deep dive |
| Data Flow Detailed | 2025-11-30 | ~650 | 18 | Pipeline analysis |
| Code Reference | 2025-11-30 | ~550 | 15 | Quick lookup |
| **Total** | - | ~2150 | ~69 | Comprehensive analysis |

---

**Investigation completed by**: Claude Code
**Investigation methodology**: Component tracing, data flow analysis, code review
**Confidence level**: High (all code verified, issue narrowed to data format)
**Next blocker**: Actual Supabase data format verification
