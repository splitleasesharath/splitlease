# Implementation Plan: AI-Powered Neighborhood Description Fallback

## Overview
Add an AI-powered fallback mechanism to generate neighborhood descriptions when the ZIP code lookup fails in the self-listing page. When `getNeighborhoodByZipCode()` returns null (no match in `zat_geo_hood_mediumlevel` table), the system will automatically call the AI gateway to generate a contextual neighborhood description based on the user's address.

## Success Criteria
- [ ] When ZIP code lookup succeeds, existing behavior is unchanged (use database description)
- [ ] When ZIP code lookup fails, AI generates a neighborhood description
- [ ] AI generation uses the full address from the listing form as context
- [ ] Loading state is displayed during AI generation
- [ ] User receives clear feedback whether description came from database or AI
- [ ] Same fallback behavior available in both SelfListingPage and EditListingDetails

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/islands/pages/SelfListingPage/utils/neighborhoodService.ts` | ZIP code neighborhood lookup for SelfListingPage | Add AI fallback function, modify return type |
| `app/src/islands/pages/SelfListingPage/sections/Section2Features.tsx` | UI component calling neighborhood template | Update to handle AI fallback, show generation source |
| `app/src/islands/shared/EditListingDetails/services/neighborhoodService.js` | ZIP code neighborhood lookup for EditListingDetails | Add AI fallback function (mirror SelfListingPage) |
| `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js` | Logic hook for EditListingDetails | Update loadNeighborhoodTemplate to use fallback |
| `app/src/lib/aiService.js` | AI service client | Add `generateNeighborhoodDescription()` function |
| `supabase/functions/ai-gateway/index.ts` | AI Gateway Edge Function | Add `neighborhood-description` to PUBLIC_PROMPTS, import prompt |
| `supabase/functions/ai-gateway/prompts/neighborhood-description.ts` | New file | Create prompt configuration for neighborhood generation |
| `supabase/functions/ai-gateway/prompts/_registry.ts` | Prompt registry | No changes (prompts self-register) |

### Related Documentation
- `.claude/Documentation/Pages/SELF_LISTING_QUICK_REFERENCE.md` - Section2Features documentation
- `supabase/CLAUDE.md` - AI Gateway Edge Function patterns
- `app/src/islands/pages/SelfListingPage/utils/CLAUDE.md` - Service patterns

### Existing Patterns to Follow
1. **AI Service Pattern**: `aiService.js` - Calls ai-gateway Edge Function with `{ action: 'complete', payload: { prompt_key, variables } }`
2. **Prompt Registration Pattern**: `listing-description.ts` - Uses `registerPrompt()` with systemPrompt, userPromptTemplate, defaults
3. **Neighborhood Service Pattern**: `neighborhoodService.ts` - Returns `{ neighborhood_name, description }` or null
4. **Error Handling Pattern**: Log warnings but return gracefully, let UI handle missing data

## Implementation Steps

### Step 1: Create the AI Neighborhood Description Prompt

**Files:** `supabase/functions/ai-gateway/prompts/neighborhood-description.ts`
**Purpose:** Define the prompt configuration for generating neighborhood descriptions

**Details:**
- Create new file following `listing-description.ts` pattern
- Register prompt with key `neighborhood-description`
- System prompt should instruct AI to:
  - Generate NYC neighborhood descriptions similar to existing ones in database
  - Focus on lifestyle, atmosphere, accessibility, and local amenities
  - Keep descriptions 2-3 sentences (matching existing database entries)
  - Not make up specific business names or landmarks
  - Use the address to infer neighborhood characteristics
- User prompt template with variables: `{{address}}`, `{{city}}`, `{{state}}`, `{{zipCode}}`
- Use `gpt-4o-mini` model for cost efficiency
- Set response format to `text`

**Code Pattern:**
```typescript
// supabase/functions/ai-gateway/prompts/neighborhood-description.ts
import { registerPrompt } from "./_registry.ts";

registerPrompt({
  key: "neighborhood-description",
  name: "Neighborhood Description Generator",
  description: "Generates neighborhood descriptions for listings when ZIP lookup fails",
  systemPrompt: `You are an expert NYC real estate copywriter specializing in neighborhood descriptions.
Your task is to generate engaging, accurate neighborhood descriptions that help potential renters understand the area.

IMPORTANT RULES:
- Generate 2-3 sentences describing the neighborhood
- Focus on lifestyle, atmosphere, accessibility, and general amenities
- DO NOT make up specific business names, restaurant names, or landmarks
- DO NOT mention specific prices or costs
- Use positive, inviting language
- If you cannot determine the neighborhood from the address, provide a generic but welcoming description
- Highlight proximity to transit, parks, dining options in general terms`,

  userPromptTemplate: `Please generate a neighborhood description for a rental listing at this address:

Address: {{address}}
City: {{city}}
State: {{state}}
ZIP Code: {{zipCode}}

Generate a welcoming 2-3 sentence description of the neighborhood that would appeal to potential renters. Focus on the lifestyle and atmosphere of the area.`,

  defaults: {
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 300,
  },

  responseFormat: "text",
});
```

**Validation:** Test prompt registration by checking console logs on Edge Function startup

---

### Step 2: Update AI Gateway to Include New Prompt

**Files:** `supabase/functions/ai-gateway/index.ts`
**Purpose:** Import the new prompt file and add to public prompts list

**Details:**
- Add import statement for `./prompts/neighborhood-description.ts`
- Add `neighborhood-description` to `PUBLIC_PROMPTS` array (no auth required)

**Code Changes:**
```typescript
// Add to imports section (after line 34)
import "./prompts/neighborhood-description.ts";

// Update PUBLIC_PROMPTS array (line 37)
const PUBLIC_PROMPTS = ["listing-description", "listing-title", "neighborhood-description", "echo-test"];
```

**Validation:** Deploy Edge Function, test with curl:
```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/ai-gateway \
  -H "Content-Type: application/json" \
  -d '{"action":"complete","payload":{"prompt_key":"neighborhood-description","variables":{"address":"123 Main St","city":"Brooklyn","state":"NY","zipCode":"11211"}}}'
```

---

### Step 3: Add AI Generation Function to aiService.js

**Files:** `app/src/lib/aiService.js`
**Purpose:** Add client function to generate neighborhood descriptions via AI

**Details:**
- Add new exported function `generateNeighborhoodDescription(addressData)`
- Accept address object with: `fullAddress`, `city`, `state`, `zip`
- Call ai-gateway with `prompt_key: 'neighborhood-description'`
- Return generated description string or throw on error
- Follow existing error handling pattern from `generateListingDescription`

**Code Pattern:**
```javascript
/**
 * Generate a neighborhood description using AI based on address
 * Used as fallback when ZIP code lookup fails
 *
 * @param {Object} addressData - The address data to generate description from
 * @param {string} addressData.fullAddress - Full street address
 * @param {string} addressData.city - City name
 * @param {string} addressData.state - State abbreviation
 * @param {string} addressData.zip - ZIP code
 * @returns {Promise<string>} Generated neighborhood description
 * @throws {Error} If generation fails
 */
export async function generateNeighborhoodDescription(addressData) {
  console.log('[aiService] Generating neighborhood description for address:', addressData);

  const variables = {
    address: addressData.fullAddress || '',
    city: addressData.city || '',
    state: addressData.state || '',
    zipCode: addressData.zip || '',
  };

  console.log('[aiService] Calling ai-gateway for neighborhood with variables:', variables);

  const { data, error } = await supabase.functions.invoke('ai-gateway', {
    body: {
      action: 'complete',
      payload: {
        prompt_key: 'neighborhood-description',
        variables,
      },
    },
  });

  if (error) {
    console.error('[aiService] Edge Function error:', error);
    throw new Error(`Failed to generate neighborhood description: ${error.message}`);
  }

  if (!data?.success) {
    console.error('[aiService] AI Gateway error:', data?.error);
    throw new Error(data?.error || 'Failed to generate neighborhood description');
  }

  console.log('[aiService] Generated neighborhood description:', data.data?.content);
  return data.data?.content || '';
}
```

**Validation:** Test in browser console by importing and calling function

---

### Step 4: Update SelfListingPage neighborhoodService.ts with Fallback

**Files:** `app/src/islands/pages/SelfListingPage/utils/neighborhoodService.ts`
**Purpose:** Add fallback to AI generation when ZIP lookup fails

**Details:**
- Import `generateNeighborhoodDescription` from aiService
- Create new function `getNeighborhoodDescriptionWithFallback(zipCode, addressData)`
- First attempt database lookup via existing `getNeighborhoodByZipCode`
- If null returned, call AI generation with address data
- Return extended interface: `{ description, source: 'database' | 'ai' | null }`
- Keep original `getNeighborhoodByZipCode` function unchanged for backward compatibility

**Code Pattern:**
```typescript
import { generateNeighborhoodDescription } from '../../../../lib/aiService';

export interface NeighborhoodResult {
  description: string;
  neighborhood_name?: string;
  source: 'database' | 'ai';
}

/**
 * Get neighborhood description with AI fallback
 * First attempts database lookup, falls back to AI generation if not found
 */
export async function getNeighborhoodDescriptionWithFallback(
  zipCode: string,
  addressData: {
    fullAddress: string;
    city: string;
    state: string;
    zip: string;
  }
): Promise<NeighborhoodResult | null> {
  // First, try database lookup
  const dbResult = await getNeighborhoodByZipCode(zipCode);

  if (dbResult && dbResult.description) {
    console.log('[neighborhoodService] Found description in database');
    return {
      description: dbResult.description,
      neighborhood_name: dbResult.neighborhood_name,
      source: 'database',
    };
  }

  // Fallback to AI generation
  console.log('[neighborhoodService] No database match, generating via AI');

  if (!addressData.fullAddress && !addressData.city) {
    console.warn('[neighborhoodService] Insufficient address data for AI generation');
    return null;
  }

  try {
    const aiDescription = await generateNeighborhoodDescription(addressData);

    if (aiDescription) {
      return {
        description: aiDescription,
        source: 'ai',
      };
    }

    return null;
  } catch (error) {
    console.error('[neighborhoodService] AI generation failed:', error);
    return null;
  }
}
```

**Validation:** Unit test with known failing ZIP code

---

### Step 5: Update Section2Features.tsx to Use Fallback

**Files:** `app/src/islands/pages/SelfListingPage/sections/Section2Features.tsx`
**Purpose:** Update UI to use fallback function and show description source

**Details:**
- Import new `getNeighborhoodDescriptionWithFallback` function
- Update `loadNeighborhoodTemplate` to:
  - Get full address data from localStorage draft (similar to AI description)
  - Call `getNeighborhoodDescriptionWithFallback` with zipCode and addressData
  - Show appropriate alert/toast based on source ('database' vs 'ai')
- Update loading state text to indicate "generating" vs "loading"

**Code Changes in `loadNeighborhoodTemplate`:**
```typescript
const loadNeighborhoodTemplate = async () => {
  if (!zipCode) {
    alert('Please complete Section 1 (Address) first to load neighborhood template.');
    return;
  }

  setIsLoadingNeighborhood(true);
  try {
    // Get address data from localStorage draft
    const draftJson = localStorage.getItem('selfListingDraft');
    const draft = draftJson ? JSON.parse(draftJson) : null;
    const addressData = {
      fullAddress: draft?.spaceSnapshot?.address?.fullAddress || '',
      city: draft?.spaceSnapshot?.address?.city || '',
      state: draft?.spaceSnapshot?.address?.state || '',
      zip: zipCode,
    };

    const result = await getNeighborhoodDescriptionWithFallback(zipCode, addressData);

    if (result && result.description) {
      handleChange('neighborhoodDescription', result.description);

      // Show different message based on source
      if (result.source === 'ai') {
        // Could use toast here if available, or console.log
        console.log('[Section2Features] AI-generated neighborhood description loaded');
      } else {
        console.log(`[Section2Features] Database template loaded for ${result.neighborhood_name || 'neighborhood'}`);
      }
    } else {
      alert(`Could not find or generate neighborhood information for ZIP code: ${zipCode}`);
    }
  } catch (error) {
    console.error('Error loading neighborhood template:', error);
    alert('Error loading neighborhood template. Please try again.');
  } finally {
    setIsLoadingNeighborhood(false);
  }
};
```

**Validation:** Test in self-listing page with both valid and invalid ZIP codes

---

### Step 6: Update EditListingDetails neighborhoodService.js with Same Pattern

**Files:** `app/src/islands/shared/EditListingDetails/services/neighborhoodService.js`
**Purpose:** Mirror the fallback implementation for consistency

**Details:**
- Import `generateNeighborhoodDescription` from aiService
- Add `getNeighborhoodDescriptionWithFallback` function (same pattern as SelfListingPage)
- Export both original and new function

**Code Pattern:**
```javascript
import { generateNeighborhoodDescription } from '../../../../lib/aiService';

/**
 * Get neighborhood description with AI fallback
 * First attempts database lookup, falls back to AI generation if not found
 * @param {string} zipCode - ZIP code to lookup
 * @param {Object} addressData - Address data for AI fallback
 * @returns {Promise<{description: string, neighborhoodName?: string, source: 'database' | 'ai'} | null>}
 */
export async function getNeighborhoodDescriptionWithFallback(zipCode, addressData) {
  // First, try database lookup
  const dbResult = await getNeighborhoodByZipCode(zipCode);

  if (dbResult && dbResult.description) {
    console.log('[neighborhoodService] Found description in database');
    return {
      description: dbResult.description,
      neighborhoodName: dbResult.neighborhoodName,
      source: 'database',
    };
  }

  // Fallback to AI generation
  console.log('[neighborhoodService] No database match, generating via AI');

  if (!addressData?.fullAddress && !addressData?.city) {
    console.warn('[neighborhoodService] Insufficient address data for AI generation');
    return null;
  }

  try {
    const aiDescription = await generateNeighborhoodDescription(addressData);

    if (aiDescription) {
      return {
        description: aiDescription,
        source: 'ai',
      };
    }

    return null;
  } catch (error) {
    console.error('[neighborhoodService] AI generation failed:', error);
    return null;
  }
}
```

**Validation:** Verify function exports correctly

---

### Step 7: Update useEditListingDetailsLogic.js to Use Fallback

**Files:** `app/src/islands/shared/EditListingDetails/useEditListingDetailsLogic.js`
**Purpose:** Update the loadNeighborhoodTemplate function to use AI fallback

**Details:**
- Import new `getNeighborhoodDescriptionWithFallback` function
- Update `loadNeighborhoodTemplate` callback to:
  - Build addressData from formData/listing
  - Call `getNeighborhoodDescriptionWithFallback`
  - Update toast message based on source
  - Remove fallback to static `NEIGHBORHOOD_TEMPLATE` (AI replaces this)

**Code Changes:**
```javascript
// Update import
import { getNeighborhoodByZipCode, getNeighborhoodDescriptionWithFallback } from './services/neighborhoodService';

// Update loadNeighborhoodTemplate callback
const loadNeighborhoodTemplate = useCallback(async () => {
  const zipCode = formData['Location - Zip Code'] || listing?.['Location - Zip Code'];

  if (!zipCode) {
    showToast('Missing ZIP code', 'Please add a ZIP code first to load the neighborhood template', 'error');
    return;
  }

  setIsLoadingNeighborhood(true);
  try {
    // Build address data for AI fallback
    const addressData = {
      fullAddress: `${formData['Location - City'] || listing?.['Location - City'] || ''}, ${formData['Location - State'] || listing?.['Location - State'] || ''}`,
      city: formData['Location - City'] || listing?.['Location - City'] || '',
      state: formData['Location - State'] || listing?.['Location - State'] || '',
      zip: zipCode,
    };

    const result = await getNeighborhoodDescriptionWithFallback(zipCode, addressData);

    if (result && result.description) {
      handleInputChange('Description - Neighborhood', result.description);

      if (result.source === 'ai') {
        showToast('Description generated!', 'AI-generated neighborhood description based on address');
      } else {
        showToast('Template loaded!', `Loaded description for ${result.neighborhoodName || 'neighborhood'}`);
      }
    } else {
      showToast('Could not load template', `No description available for ZIP: ${zipCode}`, 'error');
    }
  } catch (error) {
    console.error('[loadNeighborhoodTemplate] Error:', error);
    showToast('Error loading template', 'Please try again', 'error');
  } finally {
    setIsLoadingNeighborhood(false);
  }
}, [formData, listing, handleInputChange, showToast]);
```

**Validation:** Test in ListingDashboard edit modal with various ZIP codes

---

## Edge Cases & Error Handling

| Edge Case | How to Handle |
|-----------|---------------|
| ZIP code lookup succeeds | Use database description, no AI call (existing behavior) |
| ZIP code lookup fails, AI succeeds | Use AI description, log source as 'ai' |
| ZIP code lookup fails, AI fails | Show error toast, description field unchanged |
| No ZIP code provided | Show "Please add ZIP code first" message (existing behavior) |
| No address data for AI fallback | Return null, show generic error message |
| AI gateway timeout | Let error propagate, show "Error loading template" toast |
| Invalid ZIP format | Handled by existing validation in Section 1 |

## Testing Considerations

### Manual Testing Scenarios
1. **Valid NYC ZIP code (database match)**: Enter 10001, 11211, etc. - should load database description
2. **Invalid/Unknown ZIP code (AI fallback)**: Enter 99999 or out-of-service-area ZIP - should generate AI description
3. **No ZIP code entered**: Click "load template" without address - should show error
4. **Partial address data**: ZIP only, no city - AI should still attempt generation
5. **Network error**: Disconnect network, click "load template" - should show error gracefully

### Key Scenarios to Verify
- [ ] Database lookup path unchanged for existing ZIP codes
- [ ] AI fallback triggers only when database returns null
- [ ] Loading state displays correctly during both database and AI operations
- [ ] Error messages are user-friendly and actionable
- [ ] Generated AI descriptions are reasonable and relevant
- [ ] Both SelfListingPage and EditListingDetails behave consistently

## Rollback Strategy

If issues arise:
1. **Quick rollback**: Remove `neighborhood-description` from `PUBLIC_PROMPTS` array in ai-gateway/index.ts
2. **Full rollback**: Revert changes to Section2Features.tsx and useEditListingDetailsLogic.js to use original functions without fallback
3. **Database preserved**: No database changes required, rollback is code-only

## Dependencies & Blockers

| Dependency | Status | Notes |
|------------|--------|-------|
| AI Gateway Edge Function | Ready | Already deployed and working |
| OpenAI API Key | Configured | Already set in Supabase secrets |
| Prompt registry pattern | Established | Following listing-description.ts |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI generates inappropriate content | Low | Medium | System prompt has strict rules; descriptions are user-editable |
| AI latency affects UX | Medium | Low | Show "generating..." loading state; users expect AI to take a moment |
| AI costs | Low | Low | Using gpt-4o-mini; only called as fallback; ~$0.0001 per call |
| Prompt injection via address | Low | Low | Address is user-provided for their own listing; no sensitive data exposure |

## Deployment Notes

**IMPORTANT**: After implementing changes to the Edge Function, manual deployment is required:

```bash
supabase functions deploy ai-gateway
```

---

## Files Referenced

### Primary Implementation Files
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\ai-gateway\prompts\neighborhood-description.ts` (NEW)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\ai-gateway\index.ts`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\lib\aiService.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SelfListingPage\utils\neighborhoodService.ts`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\pages\SelfListingPage\sections\Section2Features.tsx`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\EditListingDetails\services\neighborhoodService.js`
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\app\src\islands\shared\EditListingDetails\useEditListingDetailsLogic.js`

### Reference Files (Read-Only Context)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\ai-gateway\prompts\listing-description.ts` (pattern reference)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\ai-gateway\prompts\_registry.ts` (registry pattern)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\ai-gateway\handlers\complete.ts` (handler pattern)
- `c:\Users\Split Lease\My Drive\!Agent Context and Tools\SL16\Split Lease\supabase\functions\_shared\aiTypes.ts` (type definitions)

---

**DOCUMENT_VERSION**: 1.0
**CREATED**: 2025-12-16 18:00:00
**STATUS**: Ready for Implementation
