# Implementation Plan: Display Total Host Compensation on Proposal Cards

## Overview
Add the total host compensation value to proposal cards on the host proposals page. The compensation data is already being fetched and available in the proposal object - this is a display-only change to make the total compensation visible on the card view (not just in the details modal).

## Success Criteria
- [ ] Total host compensation displays on all proposal cards
- [ ] Compensation displays consistently whether counter-offer happened or not
- [ ] Display follows existing formatting patterns using `formatCurrency`
- [ ] Styling is consistent with existing proposal card design
- [ ] Responsive design maintained

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/HostProposalsPage/ProposalCard.jsx` | Proposal card component | Add compensation display row |
| `app/src/styles/components/host-proposals.css` | Styles for host proposals page | Add styles for compensation display |
| `app/src/islands/pages/HostProposalsPage/formatters.js` | Currency/date formatters | No changes - already has `formatCurrency` |
| `app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js` | Data fetching logic | No changes - already fetches compensation data |

### Related Documentation
- `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx` - Shows how compensation is displayed in the modal (reference pattern)
- `app/src/styles/components/host-proposals.css` - Existing styles for proposal cards

### Existing Patterns to Follow
- **Currency formatting**: Use `formatCurrency(amount)` from `./formatters.js` (already imported in ProposalCard)
- **Compensation extraction**: Use fallback pattern for field names: `proposal.totalCompensation || proposal['Total Compensation (proposal - host)'] || proposal['Total Compensation'] || proposal.total_compensation || 0`
- **Card details section**: Pricing info goes in `.proposal-card-details` div
- **Styling pattern**: Use `.detail-row` class with label/value structure

### Data Already Available
The proposal object already contains compensation fields (fetched in `useHostProposalsPageLogic.js` lines 268-270):
- `"Total Compensation (proposal - host)"` - Total host compensation for the reservation
- `"host compensation"` - Per-night host rate
- `"4 week compensation"` - Host compensation per 4 weeks

The `ProposalCard.jsx` already extracts these values (lines 74-78):
```javascript
const hostCompensation = proposal.hostCompensation || proposal['host compensation'] || ...
const totalCompensation = proposal.totalCompensation || proposal['Total Compensation (proposal - host)'] || ...
```

## Implementation Steps

### Step 1: Add Total Compensation Display to ProposalCard
**Files:** `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\HostProposalsPage\ProposalCard.jsx`
**Purpose:** Display the total host compensation on every proposal card

**Details:**
- Add a new detail row to the `.proposal-card-details` section that displays total compensation
- Show compensation ALWAYS (not just when counter-offer happened) since hosts want to see this key metric
- Keep the existing counter-offer display logic (showing original vs current price) as a secondary detail if needed
- Use the `formatCurrency` function already imported in the file

**Current Code (lines 143-157):**
```jsx
{/* Details Section */}
<div className="proposal-card-details">
  <div className="detail-row">
    <span>Move-in {formatDate(moveInRangeStart)}</span>
  </div>
  <div className="detail-row">
    <span>Duration <strong>{reservationSpanWeeks} weeks</strong></span>
  </div>
  {counterOfferHappened && (
    <div className="detail-row pricing">
      <span className="original-price">${hostCompensation * reservationSpanWeeks * 7}</span>
      <span className="current-price">${formatCurrency(totalCompensation)}</span>
    </div>
  )}
</div>
```

**New Code:**
```jsx
{/* Details Section */}
<div className="proposal-card-details">
  <div className="detail-row">
    <span>Move-in {formatDate(moveInRangeStart)}</span>
  </div>
  <div className="detail-row">
    <span>Duration <strong>{reservationSpanWeeks} weeks</strong></span>
  </div>
  <div className="detail-row compensation">
    <span className="compensation-label">Your Compensation</span>
    <span className="compensation-value">
      {counterOfferHappened && (
        <span className="original-price">${formatCurrency(hostCompensation * reservationSpanWeeks * 7)}</span>
      )}
      <strong>${formatCurrency(totalCompensation)}</strong>
    </span>
  </div>
</div>
```

**Validation:**
- View the host proposals page
- Verify all proposal cards show "Your Compensation" with the dollar amount
- Verify cards with counter-offers show both original (strikethrough) and current values

### Step 2: Add CSS Styles for Compensation Display
**Files:** `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\host-proposals.css`
**Purpose:** Style the compensation display row to be visually prominent

**Details:**
- Add styles for `.detail-row.compensation` to make it stand out
- Style `.compensation-label` for the label text
- Style `.compensation-value` for the amount with emphasis
- Ensure the original-price strikethrough works alongside the new strong value
- Use existing CSS variables for consistency

**Location:** After the existing `.current-price` styles (around line 347)

**Add the following CSS:**
```css
/* Compensation row in proposal card */
.proposal-card-details .detail-row.compensation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--spacing-xs);
  margin-top: var(--spacing-xs);
  border-top: 1px solid var(--border-color);
}

.compensation-label {
  font-size: var(--text-sm);
  color: var(--text-gray);
}

.compensation-value {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-base);
}

.compensation-value strong {
  font-weight: 700;
  color: var(--primary-purple);
}

.compensation-value .original-price {
  text-decoration: line-through;
  color: var(--text-light-gray);
  font-size: var(--text-sm);
  font-weight: 400;
}
```

**Validation:**
- Check that compensation row has a subtle top border separating it from other details
- Verify the label is gray and the value is purple and bold
- Verify strikethrough original price appears correctly for counter-offer proposals
- Test on mobile viewport sizes

## Edge Cases & Error Handling
- **Missing compensation data**: The fallback to `0` is already in place; `formatCurrency(0)` will display "$0.00"
- **Large numbers**: `formatCurrency` uses Intl.NumberFormat which handles thousands separators
- **Counter-offer logic**: The original calculation `hostCompensation * reservationSpanWeeks * 7` is preserved from existing code

## Testing Considerations
- Verify compensation shows on cards with different statuses (pending, accepted, rejected)
- Test with proposals that have counter-offers (should show original + current)
- Test with proposals without counter-offers (should show only current value)
- Check responsive behavior on mobile (640px, 768px breakpoints)
- Verify alignment and spacing on cards in the 3-column, 2-column, and 1-column grid layouts

## Rollback Strategy
- Revert the two file changes (ProposalCard.jsx and host-proposals.css)
- No database or data changes involved

## Dependencies & Blockers
- None - all required data is already fetched and available

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CSS conflicts | Low | Low | Scoped with specific class names |
| Missing data fields | Low | Low | Existing fallback pattern handles null/undefined |
| Layout break on mobile | Low | Medium | Test across breakpoints |

---

## File References Summary
1. **ProposalCard.jsx** - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\HostProposalsPage\ProposalCard.jsx`
2. **host-proposals.css** - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\styles\components\host-proposals.css`
3. **formatters.js** (reference only) - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\HostProposalsPage\formatters.js`
4. **useHostProposalsPageLogic.js** (reference only) - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\HostProposalsPage\useHostProposalsPageLogic.js`
5. **ProposalDetailsModal.jsx** (pattern reference) - `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\HostProposalsPage\ProposalDetailsModal.jsx`
