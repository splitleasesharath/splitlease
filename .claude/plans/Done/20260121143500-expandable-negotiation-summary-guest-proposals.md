# Implementation Plan: Expandable Negotiation Summary Section for ProposalCard

## Overview
Add an expandable negotiation summary section to proposal cards on the guest proposals page. This feature will fetch negotiation summaries from the `negotiationsummary` table and display them in a collapsible section within each ProposalCard/ExpandableProposalCard component, following the existing expand/collapse patterns in the codebase.

## Success Criteria
- [ ] Negotiation summaries are fetched alongside proposal data during page load
- [ ] Each proposal card displays a collapsible "Why This Proposal" or "Negotiation Summary" section
- [ ] The section shows the summary text with markdown bold parsing when expanded
- [ ] The expand/collapse pattern matches existing codebase conventions (e.g., house rules toggle)
- [ ] Only proposals with negotiation summaries show the section (graceful degradation)
- [ ] Loading and empty states are handled appropriately

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/lib/proposals/userProposalQueries.js` | Fetches proposal data with related entities | Add negotiation summary fetch after proposals enrichment |
| `app/src/islands/pages/proposals/ExpandableProposalCard.jsx` | Main proposal card component for V7 guest proposals page | Add expandable negotiation summary section |
| `app/src/styles/components/guest-proposals.css` | Styles for guest proposals page | Add styles for negotiation summary section |
| `app/src/islands/shared/SuggestedProposals/components/WhyThisProposal.jsx` | Reference implementation for displaying negotiation summaries | Use as pattern reference for markdown parsing |
| `app/src/islands/shared/SuggestedProposals/suggestedProposalService.js` | Reference implementation for fetching negotiation summaries | Use as pattern for Supabase query structure |

### Related Documentation
- `app/src/islands/pages/proposals/CLAUDE.md` - Describes the ExpandableProposalCard component structure
- `app/src/islands/shared/SuggestedProposals/CLAUDE.md` - Documents how negotiation summaries are fetched and attached to proposals

### Existing Patterns to Follow
- **House Rules Toggle Pattern** (ExpandableProposalCard.jsx lines 651-665): Click to show/hide content with `useState`
- **Negotiation Summary Fetch Pattern** (suggestedProposalService.js lines 73-96): Query `negotiationsummary` table by `"Proposal associated"` field
- **Markdown Bold Parsing** (WhyThisProposal.jsx lines 13-26): `parseMarkdownBold()` function splits on `**text**` and returns React elements
- **Accordion Animation** (ExpandableProposalCard.jsx): Uses `contentHeight` state and CSS transition for smooth expand/collapse

## Implementation Steps

### Step 1: Add Negotiation Summary Fetch to userProposalQueries.js
**Files:** `app/src/lib/proposals/userProposalQueries.js`
**Purpose:** Fetch negotiation summaries for all proposals and attach them to the enriched proposal objects

**Details:**
- After the existing Step 6 (fetch virtual meetings), add Step 6.5 to fetch negotiation summaries
- Query the `negotiationsummary` table using `in('"Proposal associated"', proposalIds)`
- Order by `"Created Date"` descending to get most recent first
- Create a Map for efficient lookup: `proposalId -> summaries[]`
- Attach summaries to enriched proposals as `_negotiationSummaries` array (matching the pattern from suggestedProposalService.js)

**Code Pattern (from suggestedProposalService.js):**
```javascript
// Step 6.5: Fetch negotiation summaries for all proposals
const proposalIdsForSummaries = validProposals.map(p => p._id);
let negotiationSummaries = [];

if (proposalIdsForSummaries.length > 0) {
  const { data: summariesData } = await supabase
    .from('negotiationsummary')
    .select('*')
    .in('"Proposal associated"', proposalIdsForSummaries)
    .order('"Created Date"', { ascending: false });

  negotiationSummaries = summariesData || [];
  console.log(`fetchProposalsByIds: Fetched ${negotiationSummaries.length} negotiation summaries`);
}

// Create summary lookup map
const summaryMap = new Map();
negotiationSummaries.forEach(summary => {
  const proposalId = summary['Proposal associated'];
  if (!summaryMap.has(proposalId)) {
    summaryMap.set(proposalId, []);
  }
  summaryMap.get(proposalId).push(summary);
});
```

Then in Step 8 (manual join), add:
```javascript
// Lookup negotiation summaries
const negotiationSummaries = summaryMap.get(proposal._id) || [];
```

And include in the return object:
```javascript
return {
  ...proposal,
  // ... existing fields ...
  negotiationSummaries // Array of summary objects
};
```

**Validation:** Log the count of fetched summaries; verify in browser console that proposals have `negotiationSummaries` property

---

### Step 2: Create NegotiationSummarySection Component
**Files:** `app/src/islands/pages/proposals/NegotiationSummarySection.jsx` (new file)
**Purpose:** Reusable component to display negotiation summary with expand/collapse functionality

**Details:**
- Create a new component that accepts `summaries` prop (array of summary objects)
- Include `parseMarkdownBold()` helper function (copy from WhyThisProposal.jsx)
- Use useState for `isExpanded` toggle
- Display a clickable header row with lightbulb icon and "Why This Proposal?" text
- When expanded, show the summary text (use first summary's content if multiple exist)
- Match styling to existing `.match-reason-card` patterns

**Component Structure:**
```jsx
/**
 * NegotiationSummarySection
 *
 * Displays AI-generated negotiation summary in an expandable section.
 * Shows a preview when collapsed, full content when expanded.
 */

import { useState } from 'react';

// Helper to parse markdown bold syntax
function parseMarkdownBold(text) {
  if (!text) return text;
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index}>{part}</strong>;
    }
    return part;
  });
}

export default function NegotiationSummarySection({ summaries }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the most recent summary (first in array since sorted by date desc)
  const summary = summaries?.[0];
  if (!summary) return null;

  const summaryText = summary['Guest Summary'] || summary['Host Summary'] || summary.summary || '';
  if (!summaryText) return null;

  return (
    <div className="negotiation-summary-section">
      <button
        className="negotiation-summary-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="negotiation-summary-icon">💡</span>
        <span className="negotiation-summary-label">
          Why This Proposal?
        </span>
        <span className={`negotiation-summary-chevron ${isExpanded ? 'expanded' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <div className="negotiation-summary-content">
          <p>{parseMarkdownBold(summaryText)}</p>
        </div>
      )}
    </div>
  );
}
```

**Validation:** Component renders without errors when imported; correctly handles null/empty summaries

---

### Step 3: Integrate NegotiationSummarySection into ExpandableProposalCard
**Files:** `app/src/islands/pages/proposals/ExpandableProposalCard.jsx`
**Purpose:** Add the negotiation summary section to the expanded content area

**Details:**
- Import the new NegotiationSummarySection component
- Extract `negotiationSummaries` from proposal object (line ~437 area)
- Add the component after the Match Reason Card and before the Status Banner (around line 604)
- Only render if `negotiationSummaries` exists and has items

**Code Changes:**
```jsx
// At imports section (around line 17)
import NegotiationSummarySection from './NegotiationSummarySection.jsx';

// In the component body, extract from proposal (around line 437)
const negotiationSummaries = proposal?.negotiationSummaries || [];

// In the render section, after Match Reason Card (around line 604-607)
{/* Match Reason Card for SL-suggested proposals */}
{isSuggested && <MatchReasonCard proposal={proposal} />}

{/* Negotiation Summary Section - for all proposals with summaries */}
{negotiationSummaries.length > 0 && (
  <NegotiationSummarySection summaries={negotiationSummaries} />
)}

{/* Status Banner */}
<StatusBanner status={status} cancelReason={cancelReason} isCounteroffer={isCounteroffer} />
```

**Validation:** Proposals with negotiation summaries display the section; proposals without summaries do not show the section

---

### Step 4: Add CSS Styles for NegotiationSummarySection
**Files:** `app/src/styles/components/guest-proposals.css`
**Purpose:** Style the new negotiation summary section to match the design system

**Details:**
- Add styles after the existing `.match-reason-card` styles (around line 2433)
- Follow the existing design tokens (--gp-* variables)
- Match the visual style of the house rules toggle for consistency
- Include hover states and transitions

**CSS to Add:**
```css
/* ============================================================================
   NEGOTIATION SUMMARY SECTION
   ============================================================================ */

.negotiation-summary-section {
  border: 1px solid var(--gp-border-light);
  border-radius: 10px;
  margin: 12px 0;
  overflow: hidden;
}

.negotiation-summary-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 16px;
  background: var(--gp-bg);
  border: none;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.negotiation-summary-toggle:hover {
  background: var(--gp-purple-bg);
}

.negotiation-summary-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.negotiation-summary-label {
  flex: 1;
  text-align: left;
  font-size: var(--gp-font-size-sm);
  font-weight: 600;
  color: var(--gp-purple-primary);
}

.negotiation-summary-chevron {
  font-size: 10px;
  color: var(--gp-text-muted);
  transition: transform 0.2s ease-out;
}

.negotiation-summary-chevron.expanded {
  transform: rotate(180deg);
}

.negotiation-summary-content {
  padding: 16px;
  background: var(--gp-white);
  border-top: 1px solid var(--gp-border-light);
  animation: slideDown 0.2s ease-out;
}

.negotiation-summary-content p {
  font-size: var(--gp-font-size-sm);
  color: var(--gp-text-secondary);
  line-height: var(--gp-line-height-relaxed);
  margin: 0;
}

.negotiation-summary-content strong {
  color: var(--gp-text);
  font-weight: 600;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive adjustments */
@media (max-width: 480px) {
  .negotiation-summary-toggle {
    padding: 10px 14px;
  }

  .negotiation-summary-content {
    padding: 14px;
  }
}
```

**Validation:** Section displays correctly with hover states; animation plays on expand; responsive on mobile

---

### Step 5: Also Update Legacy ProposalCard.jsx (if still in use)
**Files:** `app/src/islands/pages/proposals/ProposalCard.jsx`
**Purpose:** Ensure legacy ProposalCard component also supports negotiation summaries

**Details:**
- Import the NegotiationSummarySection component
- Extract `negotiationSummaries` from proposal props
- Add the section after the links-row and before the info-grid (similar location as ExpandableProposalCard)
- The legacy ProposalCard is still exported and may be used in fallback scenarios

**Code Changes:**
```jsx
// At imports section
import NegotiationSummarySection from './NegotiationSummarySection.jsx';

// Extract from proposal (around line 879)
const negotiationSummaries = proposal?.negotiationSummaries || [];

// In render, after links-row (around line 1202)
{/* Negotiation Summary Section */}
{negotiationSummaries.length > 0 && (
  <NegotiationSummarySection summaries={negotiationSummaries} />
)}
```

**Validation:** Legacy ProposalCard renders negotiation summary if present

---

## Edge Cases & Error Handling
- **No summaries**: Component returns null, no section displayed
- **Empty summary text**: Additional check for empty string in summary content
- **Multiple summaries**: Use the first (most recent) summary
- **Malformed markdown**: `parseMarkdownBold` handles missing asterisks gracefully
- **Supabase query failure**: Catch error and log, continue without summaries (non-blocking)

## Testing Considerations
- Test with proposals that have negotiation summaries
- Test with proposals that do NOT have negotiation summaries (no section should appear)
- Test expand/collapse interaction
- Test markdown bold parsing with various summary formats
- Test responsive layout on mobile devices
- Verify no performance impact from additional Supabase query

## Rollback Strategy
1. Remove the negotiation summary fetch from `userProposalQueries.js`
2. Remove the NegotiationSummarySection import and usage from ExpandableProposalCard.jsx
3. Remove the CSS styles from guest-proposals.css
4. Delete the NegotiationSummarySection.jsx component file

## Dependencies & Blockers
- The `negotiationsummary` table must exist in Supabase with the expected schema
- The `"Proposal associated"` field must contain valid proposal IDs
- The summary text fields (`Guest Summary`, `Host Summary`, or `summary`) must be populated

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Additional DB query impacts page load time | Low | Medium | Query runs in parallel with existing queries; data is small |
| Summary field names differ from expected | Low | Low | Check multiple possible field names in component |
| Negotiation summary table doesn't exist | Very Low | Medium | Query will fail gracefully; summaries just won't display |

---

## Files Referenced Summary

### Files to Modify
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\lib\proposals\userProposalQueries.js`
2. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\proposals\ExpandableProposalCard.jsx`
3. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\proposals\ProposalCard.jsx`
4. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\styles\components\guest-proposals.css`

### Files to Create
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\proposals\NegotiationSummarySection.jsx`

### Reference Files (Read Only)
1. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\SuggestedProposals\suggestedProposalService.js` - Pattern for fetching negotiation summaries
2. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\shared\SuggestedProposals\components\WhyThisProposal.jsx` - Pattern for displaying summaries with markdown parsing
3. `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL3\Split Lease\app\src\islands\pages\proposals\MatchReasonCard.jsx` - Similar UI pattern reference
