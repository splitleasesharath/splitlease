# Bulk Update: Minimum Listing Prices to $160

**Created**: 2025-12-18 14:35:00
**Status**: Awaiting Approval
**Type**: Database Migration

---

## Objective

Update all listings in the Supabase database where the minimum nightly price is below $160 to ensure guests see at least $160/night on the map.

---

## Current State Analysis

| Metric | Value |
|--------|-------|
| **Total listings with price data** | 201 |
| **Listings below $160** | 95 (47.3%) |
| **Listings at/above $160** | 106 (52.7%) |
| **Current minimum price** | -$2.17 (invalid/legacy) |
| **Current maximum price** | $1,228.50 |
| **Current average price** | $213.85 |

### Target Column

```
Column: "Standarized Minimum Nightly Price (Filter)"
Type: numeric
Purpose: Controls the price displayed on map pins (guest-facing)
```

---

## Proposed Solution

### Option A: Simple Floor Update (Recommended)

Update only the `Standarized Minimum Nightly Price (Filter)` column to $160 for all listings currently below that threshold.

```sql
UPDATE listing
SET "Standarized Minimum Nightly Price (Filter)" = 160
WHERE "Standarized Minimum Nightly Price (Filter)" < 160
  OR "Standarized Minimum Nightly Price (Filter)" IS NULL;
```

**Pros:**
- Simple, single-column update
- Only affects map display price
- Doesn't touch host rate configurations
- Easy to audit/rollback

**Cons:**
- May create disconnect between map price and actual calculated prices
- Host rates remain unchanged (could show lower prices after day selection)

---

### Option B: Update All Host Rates Proportionally

Scale up all host nightly rates to ensure calculated guest prices meet $160 minimum.

**Pros:**
- Ensures consistency between map price and calculated prices
- No price mismatch after day selection

**Cons:**
- Complex calculation (must reverse-engineer host rates from guest-facing price)
- Affects host payouts
- Higher risk of unintended consequences

---

## Recommendation

**Proceed with Option A** - Update only the `Standarized Minimum Nightly Price (Filter)` column.

This is the safest approach because:
1. It directly controls what guests see on the map
2. It doesn't affect host compensation or actual booking prices
3. It's easily reversible if needed
4. The field is specifically designed for filtering/display purposes

---

## Execution Plan

### Step 1: Pre-Update Audit (Safety)

```sql
-- Capture current state for rollback capability
SELECT
  _id,
  "Standarized Minimum Nightly Price (Filter)" as current_price
FROM listing
WHERE "Standarized Minimum Nightly Price (Filter)" < 160
   OR "Standarized Minimum Nightly Price (Filter)" IS NULL;
```

### Step 2: Execute Update

```sql
UPDATE listing
SET "Standarized Minimum Nightly Price (Filter)" = 160
WHERE "Standarized Minimum Nightly Price (Filter)" < 160
   OR "Standarized Minimum Nightly Price (Filter)" IS NULL;
```

### Step 3: Post-Update Verification

```sql
-- Confirm no listings below $160
SELECT COUNT(*) as below_160_count
FROM listing
WHERE "Standarized Minimum Nightly Price (Filter)" < 160;

-- Should return 0
```

---

## Rollback Plan

If issues arise, restore from the pre-update audit:

```sql
-- Template for individual rollback (use captured values from Step 1)
UPDATE listing
SET "Standarized Minimum Nightly Price (Filter)" = <original_value>
WHERE _id = '<listing_id>';
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Map prices don't match calculated prices after day selection | Medium | Low | This field is for display/filtering only; actual prices calculated separately |
| Hosts see unexpected price on their listing | Low | Low | Host-facing rates unchanged; only guest map view affected |
| Bubble sync issues | Low | Medium | This field syncs from Bubble; manual update won't push back unless sync is bidirectional |

---

## Questions for User

1. **Should we include NULL prices?** Currently 0 listings have NULL, but the query includes them for safety.

2. **Bubble Sync Consideration**: Will Bubble overwrite this change on next sync? If so, the fix needs to be applied in Bubble instead.

3. **Do you want the pre-update audit saved** to a file for rollback capability?

---

## Files Referenced

- [GoogleMap.jsx](../../../app/src/islands/shared/GoogleMap.jsx) - Uses `price.starting` for map display
- [SearchPage.jsx](../../../app/src/islands/pages/SearchPage.jsx) - Uses `Starting nightly price` for map pins
- [MapView.jsx](../../../app/src/islands/pages/FavoriteListingsPage/components/MapView.jsx) - Favorites map price display

---

## Approval Checklist

- [ ] Confirm Option A (simple floor update) is acceptable
- [ ] Confirm Bubble sync won't overwrite changes
- [ ] Approve execution of UPDATE statement
