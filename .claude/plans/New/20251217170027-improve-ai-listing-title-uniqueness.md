# Improve AI Listing Title Uniqueness

**Created**: 2025-12-17 17:00:27
**Status**: Ready for Implementation
**Type**: Enhancement

## Problem Statement

The AI title generator repeatedly produces identical or near-identical titles like:
- "Air-Conditioned Private Room in Prime Location"

This happens because:
1. **Limited input data**: Only 4 variables are passed (neighborhood, typeOfSpace, bedrooms, amenitiesInsideUnit)
2. **Generic examples**: The 5 example titles in the prompt create a pattern-matching bias
3. **No uniqueness mechanism**: No seed, timestamp, or differentiator to force variety
4. **Amenity hierarchy missing**: AI doesn't understand which amenities are rare/valuable vs. common

## Solution: Title Generation Formula

### The Title Hierarchy Framework

Great listing titles follow a **specificity hierarchy**:

```
MOST SPECIFIC (prefer these when available)
├── 1. Unique Architectural Feature (Loft, Brownstone, Pre-war, Penthouse)
├── 2. Exceptional View/Exposure (Manhattan Views, Park Views, Skyline)
├── 3. Premium Amenity (Private Terrace, Rooftop, Doorman, Washer/Dryer)
├── 4. Location Landmark Proximity (Near Central Park, Steps from Subway)
├── 5. Neighborhood Character (Trendy, Historic, Artistic)
├── 6. Space Configuration (2BR, Studio, Spacious)
└── 7. Generic Comfort (Cozy, Modern, Charming)
LEAST SPECIFIC (avoid as primary descriptor)
```

### Amenity Rarity Tiers

```
TIER 1 - RARE (Always highlight if present)
- Private Outdoor Space (terrace, balcony, patio, backyard)
- In-unit Washer/Dryer
- Dishwasher
- Doorman/Concierge
- Rooftop Access
- Gym in Building
- Parking Included

TIER 2 - NOTABLE (Good differentiators)
- Exposed Brick
- High Ceilings
- Natural Light / Large Windows
- Hardwood Floors
- Home Office / Workspace
- Pet Friendly

TIER 3 - EXPECTED (Don't highlight alone)
- Air Conditioning (everyone expects this in NYC)
- WiFi
- TV
- Kitchen basics
- Heat included
```

### Title Formula

```
[Mood Adjective] + [Space Type] + [Location OR Top-Tier Amenity]

Where:
- Mood Adjective: Derived from space characteristics (Sunny, Spacious, Cozy, Modern, Charming)
- Space Type: Studio, 1BR, 2BR, Private Room, Entire Apartment, Loft
- Differentiator: EITHER neighborhood landmark/vibe OR top-tier amenity (never both)
```

## Implementation Plan

### Step 1: Enhance Data Extraction (Frontend)

**File**: `app/src/lib/aiService.js`

Add more variables to pass to the AI:
- `borough`: Manhattan, Brooklyn, Queens, etc.
- `buildingAmenities`: In-building amenities (elevator, doorman, rooftop, gym)
- `uniqueFeatures`: Special features if available
- `bathrooms`: For spaciousness context

```javascript
const variables = {
  neighborhood: listingData.neighborhood || '',
  borough: listingData.borough || '',
  typeOfSpace: listingData.typeOfSpace || '',
  bedrooms: listingData.bedrooms ?? '',
  bathrooms: listingData.bathrooms ?? '',
  amenitiesInsideUnit: amenitiesInUnit || 'None specified',
  amenitiesInBuilding: amenitiesBuilding || 'None specified',
  randomSeed: Math.floor(Math.random() * 5) + 1, // Forces variety
};
```

### Step 2: Update Data Extraction Hook

**File**: `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`

Update `extractListingDataForAI` to include borough and building amenities.

### Step 3: Rewrite the Prompt

**File**: `supabase/functions/ai-gateway/prompts/listing-title.ts`

```typescript
registerPrompt({
  key: "listing-title",
  name: "Listing Title Generator",
  description: "Generates unique, compelling listing titles based on property details",
  systemPrompt: `You are an expert NYC rental copywriter. Generate a UNIQUE listing title.

TITLE FORMULA: [Adjective] + [Space Type] + [Top Differentiator]

DIFFERENTIATOR PRIORITY (use the FIRST available):
1. Rare amenity: private outdoor space, in-unit washer/dryer, doorman, rooftop
2. Location landmark: "Near [Park/Station]", "Heart of [Neighborhood]"
3. Architectural feature: loft, brownstone, pre-war, penthouse
4. Neighborhood vibe: trendy, artistic, historic

ADJECTIVE SELECTION:
- Multiple bedrooms OR private outdoor → "Spacious"
- Lots of windows OR south-facing → "Sunny" or "Bright"
- Studio OR cozy nook → "Cozy"
- Recent renovation OR modern amenities → "Modern"
- Pre-war OR brownstone → "Charming" or "Classic"

BANNED PHRASES (too generic):
- "Prime Location" (meaningless)
- "Air-Conditioned" (expected in NYC)
- "Great Amenities" (vague)
- "Perfect for..." (salesy)

RULES:
- 5-8 words maximum
- Title case
- No prices, no emojis
- Each title must be DIFFERENT - use the randomSeed to vary your approach`,

  userPromptTemplate: `Generate a unique listing title:

LOCATION:
- Neighborhood: {{neighborhood}}
- Borough: {{borough}}

SPACE:
- Type: {{typeOfSpace}}
- Bedrooms: {{bedrooms}} (0 = Studio)
- Bathrooms: {{bathrooms}}

AMENITIES (check for rare ones first):
- In-unit: {{amenitiesInsideUnit}}
- Building: {{amenitiesInBuilding}}

VARIATION SEED: {{randomSeed}}
(If seed=1: emphasize location, 2: emphasize amenity, 3: emphasize space type, 4: emphasize vibe, 5: be creative)

Output ONLY the title, no quotes, no explanation.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.9, // Increased for more variety
    maxTokens: 30,    // Reduced to enforce brevity
  },

  responseFormat: "text",
});
```

### Step 4: Update aiService.js

**File**: `app/src/lib/aiService.js`

```javascript
export async function generateListingTitle(listingData) {
  console.log('[aiService] Generating listing title with data:', listingData);

  // Format amenities - prioritize rare ones
  const rareAmenities = ['Washer/Dryer', 'Dishwasher', 'Private Outdoor', 'Terrace',
                         'Balcony', 'Rooftop', 'Doorman', 'Gym', 'Parking'];

  const inUnitAmenities = Array.isArray(listingData.amenitiesInsideUnit)
    ? listingData.amenitiesInsideUnit : [];
  const buildingAmenities = Array.isArray(listingData.amenitiesOutsideUnit)
    ? listingData.amenitiesOutsideUnit : [];

  // Sort amenities to put rare ones first
  const sortByRarity = (amenities) => {
    return amenities.sort((a, b) => {
      const aRare = rareAmenities.some(r => a.toLowerCase().includes(r.toLowerCase()));
      const bRare = rareAmenities.some(r => b.toLowerCase().includes(r.toLowerCase()));
      if (aRare && !bRare) return -1;
      if (!aRare && bRare) return 1;
      return 0;
    });
  };

  const variables = {
    neighborhood: listingData.neighborhood || '',
    borough: listingData.borough || '',
    typeOfSpace: listingData.typeOfSpace || '',
    bedrooms: listingData.bedrooms ?? '',
    bathrooms: listingData.bathrooms ?? '',
    amenitiesInsideUnit: sortByRarity(inUnitAmenities).slice(0, 5).join(', ') || 'None specified',
    amenitiesInBuilding: sortByRarity(buildingAmenities).slice(0, 5).join(', ') || 'None specified',
    randomSeed: Math.floor(Math.random() * 5) + 1,
  };

  // ... rest of function unchanged
}
```

### Step 5: Update extractListingDataForAI

**File**: `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`

Add borough to the extracted data:

```javascript
const extractListingDataForAI = useCallback(() => {
  return {
    listingName: formData.Name || listing?.Name || '',
    address: `${formData['Location - City'] || listing?.['Location - City'] || ''}, ${formData['Location - State'] || listing?.['Location - State'] || ''}`,
    neighborhood: formData['Location - Hood'] || listing?.['Location - Hood'] || formData['Location - Borough'] || listing?.['Location - Borough'] || '',
    borough: formData['Location - Borough'] || listing?.['Location - Borough'] || '',
    typeOfSpace: formData['Features - Type of Space'] || listing?.['Features - Type of Space'] || '',
    bedrooms: formData['Features - Qty Bedrooms'] ?? listing?.['Features - Qty Bedrooms'] ?? 0,
    beds: formData['Features - Qty Beds'] ?? listing?.['Features - Qty Beds'] ?? 0,
    bathrooms: formData['Features - Qty Bathrooms'] ?? listing?.['Features - Qty Bathrooms'] ?? 0,
    kitchenType: formData['Kitchen Type'] || listing?.['Kitchen Type'] || '',
    amenitiesInsideUnit: formData['Features - Amenities In-Unit'] || listing?.['Features - Amenities In-Unit'] || [],
    amenitiesOutsideUnit: formData['Features - Amenities In-Building'] || listing?.['Features - Amenities In-Building'] || [],
  };
}, [formData, listing]);
```

## Expected Outcomes

### Before (Current Behavior)
```
Listing 1 (Brooklyn, Private Room, AC): "Air-Conditioned Private Room in Prime Location"
Listing 2 (Queens, Private Room, AC):   "Air-Conditioned Private Room in Prime Location"
Listing 3 (Manhattan, Private Room, AC): "Air-Conditioned Private Room in Prime Location"
```

### After (New Behavior)
```
Listing 1 (Williamsburg, Private Room, Rooftop): "Cozy Room with Rooftop Access in Williamsburg"
Listing 2 (Astoria, Private Room, Near Subway):  "Sunny Private Room Steps from Astoria Station"
Listing 3 (UES, Private Room, Doorman):          "Modern Room in Doorman Building on Upper East"
```

## Files to Modify

| File | Change |
|------|--------|
| [supabase/functions/ai-gateway/prompts/listing-title.ts](../../supabase/functions/ai-gateway/prompts/listing-title.ts) | Complete prompt rewrite with hierarchy framework |
| [app/src/lib/aiService.js](../../app/src/lib/aiService.js) | Add borough, building amenities, randomSeed, amenity sorting |
| [app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js](../../app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js) | Add borough to extractListingDataForAI |

## Testing Plan

1. Generate titles for the same listing multiple times → should get variety due to randomSeed
2. Generate titles for listings with rare amenities → should highlight them
3. Generate titles for listings with only common amenities → should fall back to location
4. Generate titles for different neighborhoods → should always be different

## Deployment Notes

After implementation, remind to deploy the Edge Function:
```bash
supabase functions deploy ai-gateway
```
