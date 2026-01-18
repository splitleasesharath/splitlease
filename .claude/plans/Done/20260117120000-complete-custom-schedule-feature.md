# Implementation Plan: Complete Custom Schedule Feature

**Created**: 2026-01-17
**Classification**: BUILD
**Complexity**: Medium
**Estimated Files**: 4 files to modify/create

---

## Problem Statement

The custom schedule feature on the view-split-lease page is **partially implemented**:
- ✅ Frontend UI exists (textarea for guests to describe custom schedule preferences)
- ✅ Data is sent to the Edge Function on proposal submission
- ✅ Edge Function attempts to insert `custom_schedule_description` into the database
- ❌ **Database column does not exist** - data is lost/causes errors
- ❌ **Host UI does not display** custom schedule requests

Guests can enter custom schedule text like:
> "some weekends I won't be interested but that can change overtime, but definitely 2 weeks on march I will be travelling so I won't use those nights"

But this information is **never persisted** and **hosts never see it**.

---

## Implementation Tasks

### Task 1: Database Migration

**Create**: `supabase/migrations/20260117_add_custom_schedule_description_to_proposal.sql`

Add the `custom_schedule_description` column to the `proposal` table.

```sql
-- Migration: 20260117_add_custom_schedule_description_to_proposal.sql
-- Purpose: Add custom_schedule_description column to proposal table
--          Allows guests to provide free-form text describing their preferred
--          recurrent booking schedule when submitting a proposal.
--
-- Context: Feature was partially implemented - frontend UI and Edge Function
--          existed but column was never created in database.
--
-- Note: Use IF NOT EXISTS to make this migration idempotent

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'proposal'
          AND column_name = 'custom_schedule_description'
    ) THEN
        ALTER TABLE proposal
        ADD COLUMN custom_schedule_description TEXT NULL;

        RAISE NOTICE 'Added custom_schedule_description column to proposal table';
    ELSE
        RAISE NOTICE 'custom_schedule_description column already exists on proposal table';
    END IF;
END $$;

-- Add comment documenting the column's purpose
COMMENT ON COLUMN proposal.custom_schedule_description IS
'Free-form text where guests describe their preferred recurrent booking schedule.
Examples: "Every other week", "Weekdays only for first month", "Traveling 2 weeks in March".
Displayed to hosts in ProposalDetailsModal for review.';
```

**Apply via Supabase MCP** (supabase-dev first, then supabase-live after testing)

---

### Task 2: Update Host ProposalDetailsModal

**Modify**: `app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx`

Add a new collapsible section to display the custom schedule description to hosts.

**Location**: After the "Guest details" section (line ~552), before "Proposal Status" section

**Implementation**:

1. **Extract the field from proposal** (around line 85-150 where other fields are destructured):
```javascript
const customScheduleDescription = proposal?.custom_schedule_description;
```

2. **Add new collapsible section state** (around line 80):
```javascript
const [customScheduleExpanded, setCustomScheduleExpanded] = useState(true);
```

3. **Add UI section** (insert after line 552, before line 554):
```jsx
{/* Custom Schedule Request Section - only show if guest provided one */}
{customScheduleDescription && (
  <div className="collapsible-section">
    <button
      className="section-header"
      onClick={() => setCustomScheduleExpanded(!customScheduleExpanded)}
    >
      <span>Schedule Preferences</span>
      <svg
        className={`chevron ${customScheduleExpanded ? 'open' : ''}`}
        width="20"
        height="20"
        viewBox="0 0 20 20"
      >
        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      </svg>
    </button>
    {customScheduleExpanded && (
      <div className="section-content custom-schedule-content">
        <p className="custom-schedule-label">Guest's schedule request:</p>
        <p className="custom-schedule-text">{customScheduleDescription}</p>
      </div>
    )}
  </div>
)}
```

4. **Add CSS styles** (in the component's style section or separate CSS file):
```css
.custom-schedule-content {
  padding: 12px 16px;
}

.custom-schedule-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: 500;
}

.custom-schedule-text {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  white-space: pre-wrap;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid #7C3AED;
}
```

---

### Task 3: Update Documentation

**Modify**: `.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md`

Add the new column to the proposal table documentation in the "Guest Info" section.

**Location**: After line 427 (after "rental type" field)

**Add**:
```markdown
- custom_schedule_description (text, NULL) - Guest's free-form description of preferred recurrent schedule
```

---

### Task 4: Verify Type Definition (Already Done)

**File**: `supabase/functions/proposal/lib/types.ts`

**Status**: ✅ Already includes `customScheduleDescription?: string;` at line 64-65

No changes needed.

---

## Execution Order

1. **Task 1**: Create and apply database migration (supabase-dev first)
2. **Task 2**: Update HostProposalDetailsModal to display the field
3. **Task 3**: Update documentation
4. **Task 4**: Verify (no action needed)

---

## Testing Checklist

- [ ] Migration runs successfully on dev database
- [ ] Submit a proposal with custom schedule text
- [ ] Verify `custom_schedule_description` is stored in `proposal` table
- [ ] Open proposal as host in HostProposalsPage
- [ ] Verify "Schedule Preferences" section appears with the custom text
- [ ] Verify section is hidden when no custom schedule was provided
- [ ] Test collapse/expand functionality
- [ ] Migration runs successfully on live database (after dev testing)

---

## File References

| File | Action | Purpose |
|------|--------|---------|
| [supabase/migrations/20260117_add_custom_schedule_description_to_proposal.sql](../../../supabase/migrations/20260117_add_custom_schedule_description_to_proposal.sql) | CREATE | Add database column |
| [app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx](../../../app/src/islands/pages/HostProposalsPage/ProposalDetailsModal.jsx) | MODIFY | Display custom schedule to hosts |
| [.claude/Documentation/Database/DATABASE_TABLES_DETAILED.md](../../Documentation/Database/DATABASE_TABLES_DETAILED.md) | MODIFY | Document new column |
| [supabase/functions/proposal/lib/types.ts](../../../supabase/functions/proposal/lib/types.ts) | VERIFY | Type already exists |
| [supabase/functions/proposal/actions/create.ts:447](../../../supabase/functions/proposal/actions/create.ts) | VERIFY | Already inserts the field |
| [app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx:162](../../../app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx) | VERIFY | Frontend state already exists |
| [app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx:741-742](../../../app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx) | VERIFY | Already sends to backend |

---

## Rollback Plan

If issues arise:
1. The migration is additive (adds nullable column) - no data loss risk
2. To rollback: `ALTER TABLE proposal DROP COLUMN custom_schedule_description;`
3. UI changes are conditional - section only shows if field has value

---

## Notes

- The feature was 70% implemented - only the database column and host display were missing
- This is a low-risk change since it adds a nullable column and conditional UI
- No changes needed to the guest-facing view-split-lease page
