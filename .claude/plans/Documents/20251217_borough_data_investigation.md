# Borough Data Investigation Report

**Date**: 2025-12-17
**Task**: Investigate why borough filtering might not be working for specific listings

---

## Executive Summary

**CRITICAL FINDING**: All four test listings have **NULL values** in the `Location - Borough` field. This explains why borough-based filtering is not working - the data simply doesn't exist in the database.

---

## Query Results

### 1. Borough Reference Data

The reference table `reference_table.zat_geo_borough_toplevel` contains 7 valid borough options:

| _id | Display Borough |
|-----|----------------|
| 1607041299687x679479834266385900 | Manhattan |
| 1607041299715x741251947580746200 | Bronx |
| 1607041299828x406969561802059650 | Queens |
| 1686596333255x514268093014903500 | Bergen County NJ |
| 1686599616073x348655546878883200 | Hudson County NJ |
| 1686674905048x436838997624262400 | Essex County NJ |
| 1607041299637x913970439175620100 | Brooklyn |

**Note**: The reference data includes NYC boroughs plus New Jersey counties.

---

### 2. Listing Data Analysis

**Query**: Check `Location - Borough` for 4 specific listings

| _id | Name | Location - Borough | Location - Hood | Location - City |
|-----|------|-------------------|----------------|----------------|
| 1765901048170x64855832289573808 | 1 Bedroom Entire Place in Brooklyn | **null** | **null** | **null** |
| 1765927145616x55294201928847216 | 1 Bedroom Entire Place in Staten Island | **null** | **null** | **null** |
| 1765928847076x97558852867184528 | 1 Bedroom Private Room in Brooklyn | **null** | **null** | **null** |
| 1765929342612x08328547140417331 | new test | **null** | **null** | **null** |

**KEY OBSERVATION**:
- The listing names mention "Brooklyn" and "Staten Island" (borough information)
- But the `Location - Borough` field is NULL for all listings
- This suggests borough information may be embedded in other fields (like Name) but not properly stored in the structured location field

---

### 3. Location-Related Columns in Listing Table

The `listing` table has 10 location-related columns:

1. `Location - Address`
2. `Location - Hoods (new)`
3. `Location - slightly different address`
4. `Location - Coordinates`
5. `Not Found - Location - Address`
6. `Location - State`
7. `Location - Zip Code`
8. **`Location - Borough`** ← The field we're checking
9. `Location - City`
10. `Location - Hood`

---

## Root Cause Analysis

### Why Borough Filtering Isn't Working

1. **Data Quality Issue**: The `Location - Borough` field is not being populated when listings are created
2. **Possible Data Entry Gap**: Borough information exists in the listing name but isn't being captured in the structured field
3. **Legacy Data**: These listings appear to be test/development listings that may not have gone through proper data entry

### Potential Sources of Borough Information

Since `Location - Borough` is null, the borough information might be:
- Embedded in the `Name` field (as seen: "1 Bedroom Entire Place in Brooklyn")
- Stored in a different field like `Location - Hoods (new)` or `Location - Hood`
- Not captured at all during listing creation

---

## Recommendations

### Immediate Actions

1. **Investigate Listing Creation Flow**
   - Check the listing creation form/edge function
   - Verify if `Location - Borough` field is being set during creation
   - Look for any data transformation that should map borough data

2. **Check Additional Listings**
   - Query a broader sample of listings to see if this is isolated to test listings or a systemic issue:
   ```sql
   SELECT
     COUNT(*) as total_listings,
     COUNT("Location - Borough") as listings_with_borough,
     COUNT(*) - COUNT("Location - Borough") as listings_without_borough
   FROM listing;
   ```

3. **Examine `Location - Hood` and `Location - Hoods (new)`**
   - These fields might contain borough data in a different structure
   - Run a query to check what data exists in these fields

### Long-term Solutions

1. **Data Migration**: If borough data exists elsewhere (like in the Name or Hood fields), create a migration to populate `Location - Borough`
2. **Validation**: Add required field validation to listing creation to ensure `Location - Borough` is always populated
3. **Data Cleanup**: Audit all listings and backfill missing borough data

---

## Next Steps

To continue investigation, run:

```sql
-- Check overall data quality
SELECT
  COUNT(*) as total,
  COUNT("Location - Borough") as has_borough,
  COUNT("Location - Hood") as has_hood,
  COUNT("Location - Hoods (new)") as has_hoods_new
FROM listing;

-- See what data exists in Hood fields for these listings
SELECT
  _id,
  "Name",
  "Location - Hood",
  "Location - Hoods (new)",
  "Location - Address",
  "Location - Zip Code"
FROM listing
WHERE _id IN (
  '1765927145616x55294201928847216',
  '1765928847076x97558852867184528',
  '1765929342612x08328547140417331',
  '1765901048170x64855832289573808'
);
```

---

## Files Referenced

- Database Table: `listing`
- Reference Table: `reference_table.zat_geo_borough_toplevel`
- Affected Fields: `Location - Borough`, `Location - Hood`, `Location - City`
