# Cancellation Policy Database Investigation

**Date**: 2025-12-16
**Type**: Database Schema Analysis

---

## Summary

Investigation of the cancellation policy structure in the Supabase database, including valid values and foreign key constraints.

---

## Valid Cancellation Policy Values

The cancellation policies are stored in the reference table: `reference_table.zat_features_cancellationpolicy`

### Available Policies

| ID | Display Name | Sort Order | Shown |
|----|--------------|------------|-------|
| `1599791785559x603327510287017500` | **After First-Time Arrival** | 2 | null |
| `1599791792265x281203802121463780` | **Prior to First-Time Arrival** | 1 | null |
| `1665431440883x653177548350901500` | **Standard** | null | true |
| `1665431684611x656977293321267800` | **Additional Host Restrictions** | null | true |

### Policy Details

#### 1. After First-Time Arrival
- **Best Case**: Within 24 hours after first-time arrival and if the condition of the property is not as described, Split Lease will mediate on a case-by-case basis.
- **Medium Case**: If either the guest or host breaches the terms of their rental agreement.
- **Worst Case**: null
- **Summary**:
  - Traveler moves in for 2 week stay and immediately receives request to book and pay for next 2 week stay.
  - Has 10 days to agree to book next stay and have payment processed for their next stay.
  - Has until 7 days before next stay is scheduled to start to choose to cancel their next booking to get full refund.

#### 2. Prior to First-Time Arrival
- **Best Case**: 100% refund (excluding Split Lease fees) if cancelled within 30 calendar days prior to the beginning of your stay.
- **Medium Case**: 50% refund (excluding Split Lease fees) if cancelled within 14 calendar days prior to the beginning of your stay.
- **Worst Case**: 0% refund of entire stay if cancelled within 7 calendar days prior to the beginning of your stay.
- **Summary**:
  - Guests may cancel their booking at any time before their stay begins.
  - Hosts may also cancel a guest's booking at any time before the stay begins. In this case, the guest will be notified and fully refunded the booking amount plus deposits and Split Lease fees.

#### 3. Standard
- Created: 2022-10-10
- No detailed text provided
- Shown: true

#### 4. Additional Host Restrictions
- Created: 2022-10-10
- Best Case: "test"
- Shown: true

---

## Foreign Key Constraints

### Listing Table
- **Constraint Name**: `listing_Cancellation Policy_fkey`
- **Source**: `public.listing."Cancellation Policy"`
- **Target**: `reference_table.zat_features_cancellationpolicy._id`
- **On Update**: NO ACTION
- **On Delete**: NO ACTION

### Bookings/Leases Table
- **Constraint Name**: `fk_bookings_leases_cancellation_policy`
- **Source**: `public.bookings_leases."Cancellation Policy"`
- **Target**: `reference_table.zat_features_cancellationpolicy._id`
- **On Update**: CASCADE
- **On Delete**: SET NULL

---

## Current Usage in Listing Table

| Cancellation Policy ID | Count | Display Name |
|------------------------|-------|--------------|
| `1665431440883x653177548350901500` | 196 | Standard |
| `1665431684611x656977293321267800` | 18 | Additional Host Restrictions |

**Key Observations**:
- Out of 277 total listings, only 214 have a cancellation policy set (63 are NULL)
- The "Standard" policy is used by the vast majority (196 listings)
- "Additional Host Restrictions" is used by 18 listings
- The two original policies ("After First-Time Arrival" and "Prior to First-Time Arrival") are **NOT currently used** by any listings

---

## Technical Notes

1. **Different Constraint Behaviors**:
   - The `listing` table uses strict constraints (NO ACTION on both update/delete)
   - The `bookings_leases` table uses more flexible constraints (CASCADE on update, SET NULL on delete)

2. **Nullable Column**:
   - Both `listing."Cancellation Policy"` and `bookings_leases."Cancellation Policy"` allow NULL values

3. **Data Type**:
   - All cancellation policy IDs are stored as `text` data type

---

## Recommendations

1. **For New Listings**: Use one of the four valid IDs listed above
2. **Most Common Choice**: `1665431440883x653177548350901500` (Standard)
3. **Validation**: Any cancellation policy value must match an `_id` in `reference_table.zat_features_cancellationpolicy`
4. **Legacy Policies**: The two older policies ("After First-Time Arrival" and "Prior to First-Time Arrival") have detailed text but are not actively used

---

## Related Files

- Database Schema: `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\DATABASE_SCHEMA_OVERVIEW.md`
- Listing Table Definition: See migration files in `supabase/migrations/`
