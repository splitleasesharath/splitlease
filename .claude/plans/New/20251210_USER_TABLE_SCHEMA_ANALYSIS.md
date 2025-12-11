# User Table Schema Analysis for AI Parsing

**Date**: 2025-12-10
**Purpose**: Document all user table fields for AI-powered profile parsing implementation

---

## Overview

The `user` table contains **113 columns** that store comprehensive user profile information. This analysis identifies which fields should be populated by AI parsing of free-form signup text.

---

## Table of Contents

1. [Core Identity Fields](#core-identity-fields)
2. [AI-Parseable Profile Fields](#ai-parseable-profile-fields)
3. [Geographic Preference Fields](#geographic-preference-fields)
4. [Schedule & Availability Fields](#schedule--availability-fields)
5. [System/Metadata Fields](#systemmetadata-fields)
6. [Reference Table Structures](#reference-table-structures)
7. [Recommended AI Parsing Strategy](#recommended-ai-parsing-strategy)

---

## Core Identity Fields

These fields identify the user but are NOT typically AI-parsed:

| Column | Type | Description |
|--------|------|-------------|
| `_id` | text (PK) | Unique identifier |
| `bubble_id` | text | Bubble.io legacy ID |
| `email` | text | User email |
| `email as text` | text | Alternative email field |
| `Name - First` | text | First name |
| `Name - Last` | text | Last name |
| `Name - Full` | text | Full name |
| `Date of Birth` | timestamptz | User's date of birth |
| `Phone Number (as text)` | text | Contact phone |
| `authentication` | jsonb (NOT NULL) | Auth credentials |

---

## AI-Parseable Profile Fields

### Primary Profile Content

| Column | Type | AI Parsing Priority | Notes |
|--------|------|---------------------|-------|
| `freeform ai signup text` | text | SOURCE | Raw user input |
| `freeform ai signup text (chatgpt generation)` | text | OUTPUT | AI-generated structured version |
| `About Me / Bio` | text | HIGH | Personal description |
| `About - reasons to host me` | text | HIGH | Why they're a good tenant |
| `Reasons to Host me` | jsonb | MEDIUM | Structured reasons (array) |

### Lifestyle & Preferences

| Column | Type | AI Parsing Priority | Notes |
|--------|------|---------------------|-------|
| `About - Commonly Stored Items` | jsonb | MEDIUM | Items they need to store |
| `need for Space` | text | MEDIUM | Space requirements |
| `special needs` | text | MEDIUM | Special accommodations |
| `transportation medium` | text | LOW | How they commute |

### User Type & Intent

| Column | Type | AI Parsing Priority | Notes |
|--------|------|---------------------|-------|
| `Type - User Signup` | text | HIGH | Initial user type (guest/host) |
| `Type - User Current` | text | MEDIUM | Current user type |
| `User Sub Type` | text | LOW | Subtype classification |
| `reservation span` | text | HIGH | How long they want to stay |

### Cleaning Preferences

| Column | Type | AI Parsing Priority | Notes |
|--------|------|---------------------|-------|
| `Sign up - Willing to Clean` | text | MEDIUM | Cleaning willingness |

---

## Geographic Preference Fields

These fields work with lookup tables and can be AI-parsed from location mentions:

| Column | Type | AI Parsing Priority | Notes |
|--------|------|---------------------|-------|
| `Preferred Borough` | text | HIGH | Single borough preference (FK to `zat_geo_borough_toplevel._id`) |
| `Preferred Hoods` | jsonb | HIGH | Array of neighborhood IDs (FK to `zat_geo_hood_mediumlevel._id`) |
| `Preferred Searched Address` | jsonb | MEDIUM | Address object with coordinates |
| `Personal Address` | jsonb | LOW | User's current address |

---

## Schedule & Availability Fields

Critical for matching users with listings:

| Column | Type | AI Parsing Priority | Notes |
|--------|------|---------------------|-------|
| `Preferred weekly schedule` | text | HIGH | Text description of ideal schedule |
| `freeFormIdealSchedule` | text | HIGH | Free-form schedule description |
| `ideal schedule night selector type` | text | MEDIUM | Type of night selection |
| `ideal schedule (company suggested)` | jsonb | HIGH | Structured schedule (AI output) |
| `Recent Days Selected` | jsonb | MEDIUM | Recent day selections |
| `Sign up - Preferred Schedule Type` | text | HIGH | Schedule type preference |
| `Split Schedule Preference` | text | MEDIUM | Split scheduling preference |
| `flexibility (last known)` | text | MEDIUM | Schedule flexibility level |
| `Move-in range` | jsonb | HIGH | Date range for move-in |
| `Preferred Searched Address` | jsonb | MEDIUM | Location preferences with coordinates |

---

## System/Metadata Fields

These are managed by the system, NOT AI-parsed:

### Account Status
- `Created Date` (timestamptz)
- `Modified Date` (timestamptz, NOT NULL)
- `created_at` (timestamptz, default: now())
- `updated_at` (timestamptz, default: now())
- `user_signed_up` (boolean, NOT NULL)
- `pending` (boolean, default: false)
- `is email confirmed` (boolean)
- `user verified?` (boolean)

### Profile Progress
- `profile completeness` (integer)
- `Usability Step` (integer)
- `Lead Info Captured` (boolean)
- `Tasks Completed` (jsonb)

### Verification & Documents
- `ID front` (text) - Image URL
- `ID Back` (text) - Image URL
- `Selfie with ID` (text) - Image URL
- `ID documents submitted?` (boolean)
- `Profile Photo` (text) - Image URL
- `Profile Photo changed` (text)

### Financial & Rental
- `credit score` (integer)
- `StripeCustomerID` (text)
- `AI Credits` (numeric)
- `Additional Credits Received` (boolean)
- `Rental Application` (text) - FK to rental applications

### Relationships & History
- `Listings` (jsonb) - Array of listing IDs
- `Proposals List` (jsonb) - Array of proposal IDs
- `Leases` (jsonb) - Array of lease IDs
- `Favorited Listings` (jsonb)
- `Chat - Threads` (jsonb)

### Communication Preferences
- `Message Forwarding Preference(list)` (jsonb)
- `Mobile Notifications On` (boolean)
- `Notification Setting` (text)
- `Notification Settings OS(lisits)` (text)
- `usernotifyseton` (boolean)

### Admin & Testing
- `Toggle - Is Admin` (boolean)
- `Toggle - Is Corporate User` (boolean)
- `is usability tester` (boolean)
- `override tester?` (boolean)

### Search & Navigation
- `Search Log` (jsonb)
- `Saved Search` (text)
- `History date and page` (jsonb)
- `History dates` (jsonb)
- `recent rental type search` (jsonb)
- `recent rental type search list` (jsonb)

### External Integrations
- `Google ID` (text)
- `Verify - Linked In ID` (text)
- `Player ID` (text) - Push notification player ID
- `Phone Calls` (text)

### UI State & Preferences
- `Hide Nights Error` (boolean)
- `Hide header announcement` (boolean)
- `show selector popups?` (boolean)
- `Last Visit (return user popup)` (text)
- `Mobile User Preference` (text)
- `login counter` (integer)
- `has logged in through mobile app` (boolean)

### Workflow & API
- `API reminder finish profile ID` (text)
- `incomplete rental app API workflow` (text)
- `mobile app reminder API Workflow` (text)
- `notify of mobile app opened` (text)

### Email & Communications
- `emails-txt-sent` (jsonb)
- `my emails history` (jsonb)
- `reminder after 15 days sent?` (boolean)

### Misc
- `agreed to term and conditions?` (boolean)
- `Allow Email Change` (boolean)
- `SMS Lock` (boolean)
- `Verify - Email Confirmation Code` (text)
- `Verify - Phone` (boolean)
- `Price Tier` (text)
- `Curated listing page` (text)
- `Account - Host / Landlord` (text)
- `manualID` (text)
- `Promo - Codes Seen` (jsonb)
- `Users with permission to see sensitive info` (jsonb)
- `Receptivity` (numeric)
- `MedianHoursToReply` (integer)

---

## Reference Table Structures

### zat_geo_borough_toplevel

**Purpose**: Top-level borough/county classification for NYC metro area

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `_id` | text | NO | Unique borough ID (e.g., "1607041299687x679479834266385900") |
| `Display Borough` | text | NO | Human-readable name (e.g., "Manhattan", "Bronx", "Queens", "Bergen County NJ") |
| `Geo-Hoods` | jsonb | NO | Array of neighborhood IDs (FKs to `zat_geo_hood_mediumlevel._id`) |
| `Geo-Location` | text | NO | Geographic location identifier |
| `Geographics Centre` | jsonb | NO | Center coordinates for the borough |
| `Zip Codes` | jsonb | NO | Array of ZIP codes in this borough |
| `Created By` | text | NO | Creator user ID |
| `Created Date` | timestamptz | NO | Creation timestamp |
| `Modified Date` | timestamptz | NO | Last modification timestamp |
| `created_at` | timestamptz | YES | System creation timestamp |
| `updated_at` | timestamptz | YES | System update timestamp |
| `pending` | boolean | YES | Pending status flag |

**Sample Data**:
```json
{
  "_id": "1607041299687x679479834266385900",
  "Display Borough": "Manhattan",
  "Geo-Hoods": [
    "1686665230140x109060028533516140",
    "1686665230140x391210370437286460",
    // ... 39 more neighborhood IDs
  ]
}
```

**Available Boroughs**:
- Manhattan
- Bronx
- Queens
- Brooklyn (assumed, not in sample)
- Staten Island (assumed, not in sample)
- Bergen County NJ
- Hudson County NJ

### zat_geo_hood_mediumlevel

**Purpose**: Neighborhood-level geographic data within boroughs

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `_id` | text | NO | Unique neighborhood ID (e.g., "1607041634116x806942014320927900") |
| `Display` | text | NO | Human-readable neighborhood name (e.g., "Long Island City", "Astoria") |
| `Geo-Borough` | text | YES | Borough ID (FK to `zat_geo_borough_toplevel._id`) |
| `Geo-City` | text | NO | City identifier |
| `Zips` | jsonb | NO | Array of ZIP codes in this neighborhood |
| `Neighborhood Description` | text | NO | Description of the neighborhood |
| `Created By` | text | NO | Creator user ID |
| `Created Date` | timestamptz | NO | Creation timestamp |
| `Modified Date` | timestamptz | NO | Last modification timestamp |
| `created_at` | timestamptz | YES | System creation timestamp |
| `updated_at` | timestamptz | YES | System update timestamp |
| `pending` | boolean | YES | Pending status flag |

**Sample Data**:
```json
{
  "_id": "1607041634116x806942014320927900",
  "Display": "Long Island City",
  "Geo-Borough": "1607041299828x406969561802059650"  // Queens
}
```

**Sample Queens Neighborhoods**:
- Long Island City
- Rockaways
- Arverne
- Bellerose
- Astoria
- Briarwood
- Beechhurst
- etc.

---

## Recommended AI Parsing Strategy

### Phase 1: Extract Core Information

From `freeform ai signup text`, extract:

1. **User Intent**
   - User type (guest/host)
   - Reservation span (how long they want to stay)
   - Move-in date range

2. **Geographic Preferences**
   - Borough mentions → lookup in `zat_geo_borough_toplevel`
   - Neighborhood mentions → lookup in `zat_geo_hood_mediumlevel`
   - Parse to: `Preferred Borough` (text ID), `Preferred Hoods` (jsonb array of IDs)

3. **Schedule Preferences**
   - Parse text descriptions of when they want to be in the space
   - Extract structured schedule → `ideal schedule (company suggested)` (jsonb)
   - Extract schedule type → `Sign up - Preferred Schedule Type`
   - Extract flexibility level → `flexibility (last known)`

4. **Profile Content**
   - Generate bio → `About Me / Bio`
   - Extract reasons they're a good tenant → `About - reasons to host me`
   - List items they need to store → `About - Commonly Stored Items` (jsonb)

5. **Lifestyle Details**
   - Space needs → `need for Space`
   - Special requirements → `special needs`
   - Cleaning willingness → `Sign up - Willing to Clean`
   - Transportation → `transportation medium`

### Phase 2: Geographic Lookup Implementation

**Algorithm**:
```typescript
async function parseGeographicPreferences(freeformText: string) {
  // 1. AI extracts mentions of locations from text
  const aiExtracted = {
    boroughs: ["Manhattan", "Brooklyn"],  // from AI parsing
    neighborhoods: ["Williamsburg", "Astoria", "Long Island City"]
  };

  // 2. Lookup borough IDs
  const boroughQuery = `
    SELECT _id, "Display Borough"
    FROM zat_geo_borough_toplevel
    WHERE "Display Borough" ILIKE ANY(ARRAY[$1, $2])
  `;
  const boroughResults = await supabase.query(boroughQuery, aiExtracted.boroughs);

  // 3. Lookup neighborhood IDs
  const hoodQuery = `
    SELECT _id, "Display", "Geo-Borough"
    FROM zat_geo_hood_mediumlevel
    WHERE "Display" ILIKE ANY(ARRAY[$1, $2, $3])
  `;
  const hoodResults = await supabase.query(hoodQuery, aiExtracted.neighborhoods);

  // 4. Return structured data
  return {
    "Preferred Borough": boroughResults[0]._id,  // Use first match or null
    "Preferred Hoods": hoodResults.map(h => h._id)  // Array of IDs
  };
}
```

### Phase 3: Schedule Parsing

**Example Input**: "I work Monday through Thursday and need a place Friday-Sunday nights. Flexible on exact times but generally staying overnight."

**Expected Output**:
```json
{
  "ideal schedule (company suggested)": {
    "days": [5, 6, 0],  // Friday=5, Saturday=6, Sunday=0 (JavaScript indexing)
    "overnight": true,
    "flexible": true
  },
  "Sign up - Preferred Schedule Type": "Weekend Warrior",
  "flexibility (last known)": "moderate"
}
```

### Phase 4: Profile Content Generation

From raw text, generate polished versions:

**Input**: "im a quiet professional who works from home tuesdays and thursdays. need a spot to crash other nights. clean, respectful, have good credit. looking in astoria or lic area"

**Outputs**:
```json
{
  "About Me / Bio": "I'm a quiet professional who works remotely on Tuesdays and Thursdays. I'm looking for a comfortable space to stay on other nights of the week. I take pride in being clean and respectful of shared spaces.",

  "About - reasons to host me": "I'm a reliable tenant with good credit, clean habits, and a respectful approach to shared living. My remote work schedule means I'm quiet and low-impact during work hours.",

  "Reasons to Host me": [
    "Good credit score",
    "Clean and respectful",
    "Quiet professional",
    "Flexible schedule"
  ],

  "freeform ai signup text (chatgpt generation)": "[Polished version of original text]"
}
```

---

## Data Type Notes

### JSONB Fields Format

**Arrays** (simple lists):
```json
["value1", "value2", "value3"]
```

**Objects** (complex structures):
```json
{
  "key1": "value",
  "key2": 123,
  "nested": {
    "sub": "value"
  }
}
```

**Common JSONB Patterns in User Table**:
- `Preferred Hoods`: Array of neighborhood IDs → `["1607041634116x806942014320927900", "1686663637820x773055786359342000"]`
- `ideal schedule (company suggested)`: Object with days array and metadata
- `About - Commonly Stored Items`: Array of item descriptions
- `Reasons to Host me`: Array of reason strings

---

## Important Constraints

1. **NOT NULL Fields** (must always have values):
   - `_id`
   - `Modified Date`
   - `authentication`
   - `user_signed_up`

2. **Foreign Key Relationships**:
   - `Preferred Borough` → `zat_geo_borough_toplevel._id`
   - `Preferred Hoods` → Array of `zat_geo_hood_mediumlevel._id`
   - User should only have neighborhoods that belong to their preferred borough

3. **Day Indexing** (CRITICAL):
   - JavaScript: Sunday=0, Monday=1, ..., Saturday=6
   - Bubble API: Sunday=1, Monday=2, ..., Saturday=7
   - Use `adaptDaysFromBubble()` and `adaptDaysToBubble()` at boundaries

---

## Next Steps

1. **Create AI Prompt Template**
   - Define JSON schema for AI output
   - Map AI fields to database columns
   - Include geographic lookup requirements

2. **Build Geographic Lookup Service**
   - Fuzzy matching for neighborhoods/boroughs
   - Handle typos and abbreviations
   - Validate borough-neighborhood relationships

3. **Implement Schedule Parser**
   - Parse natural language to day arrays
   - Detect schedule types (weekday/weekend/custom)
   - Calculate flexibility score

4. **Create Validation Layer**
   - Ensure required fields are populated
   - Validate JSONB structure
   - Check FK relationships

5. **Build Testing Suite**
   - Sample inputs with expected outputs
   - Edge cases (typos, ambiguous locations, etc.)
   - Validation of AI-generated content

---

## Files Referenced

- Database schema: `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\DATABASE_SCHEMA_OVERVIEW.md`
- Supabase configuration: `C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\CLAUDE.md`

---

**End of Analysis**
