# Tech Debt: Listing Table Column Trailing Spaces

**Created**: 2025-12-10
**Priority**: Medium
**Category**: Database Schema Cleanup

---

## Problem Statement

Several columns in the `listing` table have trailing spaces in their names, causing query errors when developers forget to include the trailing space. This is a source of bugs and developer confusion.

### Affected Columns

| Current Column Name | Proposed Clean Name |
|---------------------|---------------------|
| `"Nights Available (List of Nights) "` | `"Nights Available (List of Nights)"` |
| `"Label "` (in `zat_features_listingtype`) | `"Label"` |

### Recent Incident

- **Date**: 2025-12-10
- **Error**: PostgreSQL error 42703 (undefined column) in `proposal` edge function
- **Root Cause**: Code used `"Nights Available (List of Nights)"` but database column is `"Nights Available (List of Nights) "`
- **Fix Commit**: `abc7236`

---

## Impact

1. **Developer Experience**: Easy to miss trailing spaces when writing queries
2. **Bug Potential**: Silent failures or runtime errors when column names don't match
3. **Code Maintenance**: Requires careful attention and comments to document the quirk
4. **Onboarding**: New developers may not be aware of this naming convention

---

## Current Workarounds

1. **Documentation**: README.md line 737 documents the trailing space
2. **Code Comments**: `listingService.js` line 570 has explicit comment about trailing space
3. **Manual Fixes**: When bugs occur, manually add trailing spaces to queries

---

## Proposed Solution

### Migration Plan

1. **Create Migration Script**:
   ```sql
   -- Rename column to remove trailing space
   ALTER TABLE listing
   RENAME COLUMN "Nights Available (List of Nights) "
   TO "Nights Available (List of Nights)";
   ```

2. **Update All References**:
   - Frontend code (`app/src/`)
   - Edge functions (`supabase/functions/`)
   - Any Bubble.io workflows that reference this column

3. **Files Requiring Updates** (after migration):
   - `supabase/functions/proposal/actions/create.ts`
   - `supabase/functions/proposal/actions/suggest.ts`
   - `supabase/functions/proposal/lib/types.ts`
   - `supabase/functions/bubble_sync/lib/transformer.ts`
   - `app/src/lib/listingService.js`
   - `app/src/lib/listingDataFetcher.js`

---

## Risks

1. **Bubble.io Sync**: If Bubble.io expects the trailing space, the sync may break
2. **Data API**: External consumers may be using the current column name
3. **Cached Queries**: Any cached queries will need to be invalidated

---

## Recommendation

**Wait for Bubble.io migration completion** before executing this cleanup. Once the system is fully migrated to Supabase-native operations, perform this as part of a broader database schema cleanup sprint.

---

## References

- Fix Commit: `abc7236` - fix(proposal): add trailing space to listing column name
- README.md: Line 737 documents trailing space quirk
- listingService.js: Line 570 has mapping comment
