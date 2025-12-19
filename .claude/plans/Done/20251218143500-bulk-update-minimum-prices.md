# Bulk Update: Minimum Listing Prices to $160

**Created**: 2025-12-18 14:35:00
**Updated**: 2025-12-18 15:00:00
**Status**: Awaiting Approval
**Type**: Database Migration (Proportional Rate Adjustment)

---

## Objective

Update all listings where the guest-facing minimum price is below $160 by **proportionally scaling ALL host rate columns** so the calculated guest-facing minimum reaches $160.

---

## Current State Analysis

| Metric | Value |
|--------|-------|
| **Total listings with price data** | 201 |
| **Listings below $160** | 95 (47.3%) |
| **Listings at/above $160** | 106 (52.7%) |
| **Current minimum price** | -$2.17 (invalid/legacy) |
| **Current maximum price** | $1,228.50 |

### Data Patterns in Low-Price Listings

| Pattern | Count | Description |
|---------|-------|-------------|
| **Monthly Only** | 49 (51.6%) | Only `💰Monthly Host Rate` populated |
| **Has Nightly Rates** | 30 (31.6%) | Has 2n/3n/4n/5n/7n rates |
| **Weekly Only** | 16 (16.8%) | Only `💰Weekly Host Rate` populated |

---

## Guest-Facing Price Formula

From `calculateGuestFacingPrice.js`:

```
For 2-6 nights: guestPrice = hostRate × 1.17 (17% markup)
For 7 nights:   guestPrice = hostRate × 0.87 × 1.17 = hostRate × 1.0179 (13% discount + 17% markup)
```

### Reverse Calculation (Host Rate from Target Guest Price)

```
For non-7-night: targetHostRate = targetGuestPrice ÷ 1.17
For 7-night:     targetHostRate = targetGuestPrice ÷ 1.0179
```

**To achieve $160 guest-facing minimum:**
- Non-7-night host rate: `$160 ÷ 1.17 = $136.75`
- 7-night host rate: `$160 ÷ 1.0179 = $157.19`

---

## Proposed Solution: Proportional Scaling

### Strategy

For each listing below $160:

1. **Calculate current minimum guest-facing price** from MIN of all rate-derived prices
2. **Calculate scale factor**: `scaleFactor = 160 / currentMinGuestPrice`
3. **Apply scale factor to ALL host rates** (2n, 3n, 4n, 5n, 7n, weekly, monthly)
4. **Recalculate `Standarized Minimum Nightly Price (Filter)`** from new rates

### Why Proportional Scaling?

- Maintains the **relative pricing structure** hosts intended
- If host charged 2× for 2-nights vs 7-nights, that ratio is preserved
- Avoids arbitrary flat rates that ignore host's pricing strategy

---

## Execution Plan

### Step 1: Pre-Update Audit (Safety Backup)

```sql
-- Save current state for rollback
SELECT
  _id,
  "Standarized Minimum Nightly Price (Filter)" as current_min,
  "💰Nightly Host Rate for 2 nights" as rate_2n,
  "💰Nightly Host Rate for 3 nights" as rate_3n,
  "💰Nightly Host Rate for 4 nights" as rate_4n,
  "💰Nightly Host Rate for 5 nights" as rate_5n,
  "💰Nightly Host Rate for 7 nights" as rate_7n,
  "💰Weekly Host Rate" as weekly,
  "💰Monthly Host Rate" as monthly
FROM listing
WHERE "Standarized Minimum Nightly Price (Filter)" < 160
   OR "Standarized Minimum Nightly Price (Filter)" IS NULL;
```

### Step 2: Calculate Scale Factors and Update

```sql
-- Update all host rates proportionally to achieve $160 minimum
WITH current_state AS (
  SELECT
    _id,
    "Standarized Minimum Nightly Price (Filter)" as current_min,
    "💰Nightly Host Rate for 2 nights" as rate_2n,
    "💰Nightly Host Rate for 3 nights" as rate_3n,
    "💰Nightly Host Rate for 4 nights" as rate_4n,
    "💰Nightly Host Rate for 5 nights" as rate_5n,
    "💰Nightly Host Rate for 7 nights" as rate_7n,
    "💰Weekly Host Rate" as weekly,
    "💰Monthly Host Rate" as monthly,
    -- Scale factor to reach $160 guest-facing minimum
    CASE
      WHEN "Standarized Minimum Nightly Price (Filter)" > 0
      THEN 160.0 / "Standarized Minimum Nightly Price (Filter)"
      ELSE 1.0
    END as scale_factor
  FROM listing
  WHERE "Standarized Minimum Nightly Price (Filter)" < 160
    AND "Standarized Minimum Nightly Price (Filter)" > 0
)
UPDATE listing l
SET
  "💰Nightly Host Rate for 2 nights" = ROUND((cs.rate_2n * cs.scale_factor)::numeric, 2),
  "💰Nightly Host Rate for 3 nights" = ROUND((cs.rate_3n * cs.scale_factor)::numeric, 2),
  "💰Nightly Host Rate for 4 nights" = ROUND((cs.rate_4n * cs.scale_factor)::numeric, 2),
  "💰Nightly Host Rate for 5 nights" = ROUND((cs.rate_5n * cs.scale_factor)::numeric, 2),
  "💰Nightly Host Rate for 7 nights" = ROUND((cs.rate_7n * cs.scale_factor)::numeric, 2),
  "💰Weekly Host Rate" = ROUND((cs.weekly * cs.scale_factor)::numeric, 2),
  "💰Monthly Host Rate" = ROUND((cs.monthly * cs.scale_factor)::numeric, 0),
  "Standarized Minimum Nightly Price (Filter)" = 160
FROM current_state cs
WHERE l._id = cs._id;
```

### Step 3: Handle Edge Cases

```sql
-- Handle listings with 0 or NULL minimum (set floor values)
UPDATE listing
SET
  "💰Nightly Host Rate for 2 nights" = COALESCE(NULLIF("💰Nightly Host Rate for 2 nights", 0), 136.75),
  "💰Nightly Host Rate for 3 nights" = COALESCE(NULLIF("💰Nightly Host Rate for 3 nights", 0), 136.75),
  "💰Nightly Host Rate for 7 nights" = COALESCE(NULLIF("💰Nightly Host Rate for 7 nights", 0), 157.19),
  "💰Monthly Host Rate" = COALESCE(NULLIF("💰Monthly Host Rate", 0), 4768),
  "Standarized Minimum Nightly Price (Filter)" = 160
WHERE "Standarized Minimum Nightly Price (Filter)" <= 0
   OR "Standarized Minimum Nightly Price (Filter)" IS NULL;
```

### Step 4: Post-Update Verification

```sql
-- Verify no listings below $160
SELECT COUNT(*) as below_160_count
FROM listing
WHERE "Standarized Minimum Nightly Price (Filter)" < 160;
-- Expected: 0

-- Sample check: verify proportions maintained
SELECT
  _id,
  "Standarized Minimum Nightly Price (Filter)" as new_min,
  "💰Nightly Host Rate for 2 nights" as new_2n,
  "💰Nightly Host Rate for 7 nights" as new_7n,
  ROUND("💰Nightly Host Rate for 2 nights" / NULLIF("💰Nightly Host Rate for 7 nights", 0), 2) as ratio_2n_to_7n
FROM listing
WHERE "Standarized Minimum Nightly Price (Filter)" = 160
LIMIT 10;
```

---

## Example Calculation

**Before**: Listing with current min $100
- `rate_2n = $200`, `rate_7n = $100`, `monthly = $3000`
- Scale factor = `160 / 100 = 1.6`

**After**:
- `rate_2n = $320`, `rate_7n = $160`, `monthly = $4800`
- New min = $160 ✓
- Ratio preserved: 2n is still 2× of 7n ✓

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Host payouts increase | High | Medium | This is intentional - hosts earn more |
| Price structure ratio changes | Low | Low | Proportional scaling preserves ratios |
| Edge cases with 0/NULL rates | Medium | Low | Step 3 handles these explicitly |

---

## Files Referenced

- [calculateGuestFacingPrice.js](../../../app/src/logic/calculators/pricing/calculateGuestFacingPrice.js) - Guest price formula
- [GoogleMap.jsx](../../../app/src/islands/shared/GoogleMap.jsx) - Map price display
- [SearchPage.jsx](../../../app/src/islands/pages/SearchPage.jsx) - Search map pins
- [ListingScheduleSelector.jsx](../../../app/src/islands/shared/ListingScheduleSelector.jsx) - Price calculation on selection

---

## Approval Checklist

- [ ] Confirm proportional scaling approach
- [ ] Confirm host rate increases are acceptable (affects host payouts)
- [ ] Approve execution of UPDATE statements
- [ ] Confirm edge case handling (0/NULL rates)
