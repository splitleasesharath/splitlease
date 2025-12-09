# Listing Table Column Research for listing_trial Mapping

**Date**: 2025-12-06
**Purpose**: Research column equivalents in listing table for listing_trial fields
**Status**: Complete Research Phase

---

## Query Results Summary

### 1. Weekly/Scheduling/Days/Nights Related Columns

| Column Name | Data Type |
|------------|-----------|
| # of nights available | integer |
| Days Available (List of Days) | jsonb |
| Days Not Available | jsonb |
| Maximum Nights | integer |
| Maximum Weeks | integer |
| Minimum Nights | integer |
| Minimum Weeks | integer |
| Nights Available (List of Nights) | jsonb |
| Nights Available (numbers) | jsonb |
| Nights Not Available | jsonb |
| Weeks offered | text |
| weeks out to available | integer |

**Key Insights**:
- Days/nights data stored as JSONB arrays
- Contains day names (Monday, Tuesday, etc.) or numeric formats
- Supports both minimum and maximum constraints
- Has both "available" and "not available" variants

---

### 2. Pricing Related Columns

| Column Name | Data Type |
|------------|-----------|
| Price number (for map) | text |
| Standarized Minimum Nightly Price (Filter) | numeric |
| market_strategy | text |
| 💰Cleaning Cost / Maintenance Fee | integer |
| 💰Damage Deposit | integer |
| 💰Monthly Host Rate | integer |
| 💰Nightly Host Rate for 2 nights | numeric |
| 💰Nightly Host Rate for 3 nights | numeric |
| 💰Nightly Host Rate for 4 nights | numeric |
| 💰Nightly Host Rate for 5 nights | numeric |
| 💰Nightly Host Rate for 7 nights | numeric |
| 💰Price Override | integer |
| 💰Unit Markup | integer |
| 💰Weekly Host Rate | numeric |

**Key Insights**:
- Nightly rates vary by duration (2, 3, 4, 5, 7 nights)
- Weekly and monthly rates available
- Additional fees: cleaning/maintenance, damage deposit
- Markup and override capabilities

---

### 3. Duration/Minimum/Maximum Columns

| Column Name | Data Type |
|------------|-----------|
| Features - Trial Periods Allowed | boolean |
| Maximum Months | integer |
| Maximum Nights | integer |
| Maximum Weeks | integer |
| Minimum Months | integer |
| Minimum Nights | integer |
| Minimum Weeks | integer |
| Standarized Minimum Nightly Price (Filter) | numeric |

**Key Insights**:
- `Features - Trial Periods Allowed` is a boolean flag (CRITICAL for trial periods!)
- Supports minimum/maximum at month, week, and night levels
- This is the closest match to listing_trial functionality

---

### 4. Reviews/Notes/Source Columns

| Column Name | Data Type |
|------------|-----------|
| Reviews | jsonb |
| Source Link | text |

**Key Insights**:
- Reviews stored as JSONB (structured data)
- Source Link for tracking origin

---

### 5. Subsidy/Agreement/Contract Columns

**Result**: No columns found matching these patterns

---

### 6. Sample Data from Listings

```
Listing 1 (_id: 1637349440736x622780446630946800):
  - Weeks offered: "Every week"
  - Maximum Weeks: 26
  - Minimum Nights: 2
  - Days Available: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  - Nights Available: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  - Rental type: "Nightly"

Listing 2 (_id: 1764189100243x464450542074153800):
  - Weeks offered: "Every week"
  - Maximum Weeks: 26
  - Minimum Nights: 2
  - Days Available: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  - Nights Available: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  - Rental type: null

Listing 3 (_id: 1764192323682x631607213068670500):
  - Weeks offered: "Every week"
  - Maximum Weeks: 26
  - Minimum Nights: 2
  - Days Available: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  - Nights Available: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  - Rental type: null
```

---

## Critical Column Mappings for listing_trial

Based on the research, here are the key column matches:

### Trial Period Support
- **listing.Features - Trial Periods Allowed** (boolean) - Direct trial period flag

### Duration Constraints
- **listing.Minimum Nights** - Minimum stay duration
- **listing.Minimum Weeks** - Alternative minimum duration
- **listing.Maximum Nights** - Maximum stay duration
- **listing.Maximum Weeks** - Alternative maximum duration
- **listing.Maximum Months** - Long-term maximum

### Schedule/Availability
- **listing.Days Available (List of Days)** (jsonb) - Which days can be booked
- **listing.Days Not Available** (jsonb) - Blocked dates/days
- **listing.Nights Available (List of Nights)** (jsonb) - Night-specific availability
- **listing.Nights Not Available** (jsonb) - Night-specific blocks
- **listing.weeks out to available** - How many weeks in advance can book

### Pricing for Trials
- **listing.💰Nightly Host Rate for 2 nights** - 2-night stay rate (smallest stint)
- **listing.💰Nightly Host Rate for 3 nights** - 3-night stay rate
- **listing.💰Nightly Host Rate for 4 nights** - 4-night stay rate
- **listing.💰Nightly Host Rate for 5 nights** - 5-night stay rate
- **listing.💰Nightly Host Rate for 7 nights** - Weekly rate
- **listing.💰Cleaning Cost / Maintenance Fee** - One-time fee for trials
- **listing.💰Damage Deposit** - Security deposit for trials

### Metadata
- **listing.Weeks offered** (text) - "Every week" or specific pattern
- **listing.rental type** - Type of rental (Nightly, etc.)

---

## Observations

1. **Trial periods are already partially supported** via the `Features - Trial Periods Allowed` boolean flag
2. **Days/nights are stored as JSONB arrays** - more flexible than fixed columns
3. **Multiple pricing tiers exist** for different stay durations - great for trial pricing
4. **No explicit "trial" naming** in listing columns, but functionality is distributed across multiple fields
5. **Both "available" and "not available" variants** provide flexibility for scheduling
6. **The listing table has comprehensive scheduling logic** - trial periods are just a subset

---

## Next Steps for Implementation

1. Determine if listing_trial needs its own dedicated columns or if it should reference listing columns
2. Map listing_trial fields to these listing columns
3. Consider if trial periods should override or extend existing pricing/scheduling rules
4. Plan data migration strategy if converting existing trials to the new table
