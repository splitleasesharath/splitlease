# Leo DiCaprio Mockup Proposal - Listing Details

**Database**: supabase-dev
**Query Date**: 2026-01-16

---

## Proposal Information

- **Proposal ID**: `1766003595869x69815320637958696`
- **Status**: Host Review (pending)
- **Guest**: Leo Di Caprio (`1697550315775x613621430341750000`)
- **Guest Email**: splitleasefrederick@gmail.com
- **Host**: fred jesurun (`1766003593341x91809818309455488`)
- **Host Email**: fredjesurun@test.com
- **Created**: 2025-12-17T20:33:15.878Z

### Proposal Details
- **Days Selected**: Tuesday - Saturday (2, 3, 4, 5, 6)
- **Nights per Week**: 4 nights (Tuesday, Wednesday, Thursday, Friday)
- **Check-in Day**: Tuesday
- **Check-out Day**: Saturday
- **Rental Type**: Monthly
- **Move-in Range**: January 5-11, 2026
- **Move-out Date**: April 3, 2026
- **Duration**: 3 months (13 weeks)

### Pricing
- **Total Guest Price**: $11,375
- **Total Host Compensation**: $11,375
- **Host Compensation (per period)**: $3,500
- **Cleaning Fee**: $150
- **Damage Deposit**: $1,000

### Proposal Message
> This is a demonstration proposal to show you how the proposal review process works. When real guests apply, their information will appear here. You can approve, negotiate, or decline proposals.

---

## Associated Listing

### Listing ID
`1766003594466x67309961278997728`

### Basic Information
- **Name**: 1 Bedroom Entire Place in Brooklyn
- **Address**: 285 Jay St, Brooklyn, NY 11201, USA
- **Coordinates**: 40.6955082, -73.9868525
- **Borough**: (null - needs to be set)
- **Neighborhood**: (null - needs to be set)
- **Status**: Active: false, Approved: false

### Property Details
- **Bedrooms**: 1
- **Bathrooms**: 1
- **Property Type**: 1569530331984x152755544104023800 (likely needs lookup for readable name)
- **Description**: "1 bedroom entire place available for monthly rental..."

### Availability
- **Days Available**: All days (0-6: Sunday through Saturday)

### Pricing
- **Monthly Host Rate**: $3,500
- **Nightly Host Rates**:
  - 1 night: $0 (not configured)
  - 2 nights: $136.75
  - 3 nights: $136.75
  - 4 nights: $0 (not configured)
  - 5 nights: $0 (not configured)
  - 6 nights: $0 (not configured)
  - 7 nights: $157.19
- **Cleaning Fee**: $150
- **Damage Deposit**: $1,000

### Media
- **Photos**: None uploaded (empty array)
- **Thumbnail**: None

---

## Host Details

### Host User Information
- **User ID**: `1766003593341x91809818309455488`
- **Name**: fred jesurun
- **Email**: fredjesurun@test.com
- **Phone**: 1234567890
- **User Type**: A Host (I have a space available to rent)
- **Profile Photo**: null (no photo uploaded)

### Host's Listings
This host has **1 listing** in total:
1. 1 Bedroom Entire Place in Brooklyn (the one associated with Leo's proposal)

---

## Issues/Gaps Identified

### Listing Data Quality
1. **No photos** - The listing has no photos uploaded
2. **Missing borough** - Location - Borough is null
3. **Missing neighborhood** - Location - Hood is null
4. **Incomplete pricing** - Several nightly rates are $0 or not configured
5. **Not active/approved** - The listing is neither active nor approved
6. **Property type** - Shows as ID rather than readable name

### Demo Implications
For demonstration purposes, this listing would need:
- Photos added to make it realistic
- Borough and neighborhood fields populated
- Complete nightly pricing for all stay durations
- Potentially activated/approved status

### Host Profile
- Host has no profile photo
- Host only has 1 listing (may want multiple for richer demo)

---

## Recommendations for Demo

### Option 1: Use this listing but enhance it
- Add realistic photos for a 1BR in Brooklyn
- Set Borough to "Brooklyn"
- Set neighborhood (e.g., "Downtown Brooklyn" or "Brooklyn Heights")
- Complete all nightly pricing tiers
- Activate and approve the listing

### Option 2: Find a different host with better listings
- Look for hosts with:
  - Multiple active listings
  - Complete photos
  - Full location data
  - Varied property types for demo variety

### Option 3: Create mock listing data
- Generate complete mockup listings specifically for Leo's demo proposal
- Ensure all fields are populated
- Add realistic photos and descriptions

---

## Query Used

Database: `supabase-dev`
Table: `listing`
Host User: `1766003593341x91809818309455488`
Listing ID: `1766003594466x67309961278997728`

---

**Generated**: 2026-01-16
**Script**: `scripts/get-host-listings-fixed.ts`
