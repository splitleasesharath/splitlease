# House Rules Data Structure Analysis

## Overview
House rules data exists across multiple tables with different formats and purposes. The data flows from a master lookup table through various feature fields to proposal and lease document tables.

## Data Sources & Locations

### 1. Master Lookup Table: `zat_features_houserule`
**Purpose**: Central repository of all available house rules with names and icons

**Fields**:
- `_id` (text): Unique identifier (Bubble ID format)
- `Name` (text): Display name of the rule (e.g., "Quiet Hours", "No Pets", "Take Out Trash")
- `Icon` (text): CDN URL to icon image
- `pre-set?` (boolean): Whether this is a pre-set/suggested rule

**Example Rules**:
```
1556151847445x748291628265310200 → "Quiet Hours"
1556151848468x314854653954062850 → "No Pets"
1556151848820x263815240540241400 → "No Guests"
1556151849189x396180511786125000 → "Take Out Trash" (pre-set: true)
1556151850058x913437569713412200 → "No Food In Sink" (pre-set: true)
1556151851403x764540891720229900 → "Lock Doors" (pre-set: true)
1556151851172x976832583246718600 → "Recycle"
1556151851868x310211444972887230 → "No Opening Windows"
1556151852318x876014498757353800 → "Conserve Water"
1556151852738x303519853382369700 → "No Entertaining"
1556151853438x932304905407593300 → "No Candles"
1556151853734x492675758581723650 → "Flush Toilet Paper ONLY"
1558650937719x980131001106473000 → "No Overnight Guests"
1560257925497x381078509642556400 → "No Drinking"
1556151847060x415943613978721800 → "No Shoes Inside"
```

---

## Tables Storing House Rules

### 2. Listing Table: `listing`

**Column**: `Features - House Rules` (JSONB array of IDs)

**Format**: Array of Bubble IDs referencing `zat_features_houserule`

**Example**:
```json
["1556151847445x748291628265310200", "1556151849189x396180511786125000"]
// Maps to: ["Quiet Hours", "Take Out Trash"]
```

**Purpose**: Stores which pre-defined house rules apply to a specific listing

---

### 3. Proposal Table: `proposal`

**Columns**:
- `House Rules` (JSONB array of IDs)
- `hc house rules` (JSONB array of IDs) [HC = House Curator?]

**Format**: Array of Bubble IDs referencing `zat_features_houserule`

**Example**:
```json
// House Rules field
["1556151847445x748291628265310200", "1556151850058x913437569713412200"]
// Maps to: ["Quiet Hours", "No Food In Sink"]

// hc house rules field (often mirrors House Rules)
["1556151847445x748291628265310200", "1556151850058x913437569713412200"]
```

**Purpose**: Captures house rules relevant to a specific proposal/guest booking

---

### 4. Lease Documents Table: `fieldsforleasedocuments`

**Column**: `house rules` (JSONB array of text strings)

**Format**: Array of plain text rule names (NOT IDs)

**Example**:
```json
["Take Out Trash", "No Food In Sink", "Lock Doors", "Wash Your Dishes", "No Smoking Inside"]
```

**Purpose**: Stores human-readable house rules for inclusion in lease documents

---

### 5. House Manual Table: `housemanual`

**Column**: `House Rules` (JSONB array of IDs)

**Format**: Array of Bubble IDs referencing `zat_features_houserule`

**Example**:
```json
[
  "1556151851403x764540891720229900",  // Lock Doors
  "1558650937719x980131001106473000",  // No Overnight Guests
  "1560258089836x428000737556366600"   // (unknown rule ID)
]
```

**Purpose**: Stores house rules that have been compiled into a house manual

---

## Data Flow

```
User selects rules → Stored in proposal.House Rules (IDs)
                  ↓
           Lookup in zat_features_houserule
                  ↓
        Get rule name + icon for display
                  ↓
When generating lease → Convert to text names
                  ↓
          Store in fieldsforleasedocuments.house rules
```

---

## "See House Rules" Button Visibility Logic

### When to Show the Button

The button should be visible when:

1. **House Rules Exist**: The proposal/listing has non-empty house rules data
2. **Data Not Null**: `proposal.House Rules IS NOT NULL AND array_length(proposal.House Rules) > 0`
3. **Has Resolvable Rules**: The referenced rule IDs exist in `zat_features_houserule` table

### When to Hide the Button

The button should be hidden when:

1. **No House Rules**: `proposal.House Rules IS NULL OR array_length(proposal.House Rules) = 0`
2. **Empty Array**: Field exists but contains an empty array `[]`
3. **Rules Not Available**: Referenced rule IDs don't exist (edge case, shouldn't happen in production)

### Implementation Recommendation

```typescript
// Check if house rules exist and have content
const hasHouseRules = (proposal: Proposal) => {
  return (
    proposal['House Rules'] &&
    Array.isArray(proposal['House Rules']) &&
    proposal['House Rules'].length > 0
  );
};

// Use in component
{hasHouseRules(proposal) && (
  <button onClick={handleViewRules}>
    See House Rules
  </button>
)}
```

---

## Query to Get House Rules with Names

To retrieve house rules with display names:

```sql
SELECT
  p._id as proposal_id,
  h._id as rule_id,
  h."Name" as rule_name,
  h."Icon" as rule_icon
FROM proposal p
CROSS JOIN LATERAL jsonb_array_elements(p."House Rules") AS rule_id
LEFT JOIN zat_features_houserule h ON h._id = rule_id::text
WHERE p._id = 'proposal_id_here';
```

---

## Summary Table

| Table | Column | Format | Purpose | Example |
|-------|--------|--------|---------|---------|
| `zat_features_houserule` | `_id`, `Name`, `Icon` | Master lookup | Define all available rules | ID → "Quiet Hours" |
| `listing` | `Features - House Rules` | Array of IDs | Rules that apply to listing | IDs stored |
| `proposal` | `House Rules`, `hc house rules` | Array of IDs | Rules for this booking | IDs stored |
| `housemanual` | `House Rules` | Array of IDs | Rules in house manual | IDs stored |
| `fieldsforleasedocuments` | `house rules` | Array of text | Human-readable for documents | Text names stored |

---

## Key Data Facts

- **Primary Key Format**: Bubble IDs (e.g., `1556151847445x748291628265310200`)
- **Data Type**: JSONB arrays (allows efficient queries)
- **Pre-set Rules**: Some rules are marked as "pre-set" in the lookup table
- **Icon URLs**: All rules have CDN-hosted icon images
- **Bidirectional**: Rules flow from lookup table to listing/proposal, then to lease documents as text

---

## Important Notes

1. **ID Resolution Required**: Frontend/backend code must join proposal/listing data with `zat_features_houserule` to get human-readable names
2. **Two Formats in Proposal**: Both `House Rules` and `hc house rules` exist; typically they contain the same data
3. **Free-form Text**: `fieldsforleasedocuments.house rules` can contain custom text not matching lookup table
4. **Icons Available**: Each rule has an associated icon for UI display
5. **Null Safety**: Always check for null/empty arrays before accessing house rules data
