# Library Map

**TYPE**: BRANCH NODE
**PARENT**: app/src/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Utility modules, API clients, and shared infrastructure
[PATTERN]: Service modules with async functions for data fetching
[SCOPE]: Application-wide utilities (not UI components)

---

## ### SUB-MODULES ###

- **[constants/](./constants/CLAUDE.md)**: Proposal statuses and stage definitions
- **[scheduleSelector/](./scheduleSelector/CLAUDE.md)**: Schedule calculation utilities

---

## ### KEY_MODULES ###

### supabase.js
[INTENT]: Supabase client initialization
[EXPORTS]: supabase (SupabaseClient instance)
[USAGE]: `import { supabase } from 'lib/supabase'`
[ENV]: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

---

### auth.js
[INTENT]: Authentication functions
[EXPORTS]: loginUser, logoutUser, checkAuthStatus, validateTokenAndFetchUser
[DEPENDS_ON]: secureStorage, supabase
[API]: auth-user Edge Function

---

### secureStorage.js
[INTENT]: Encrypted storage for auth tokens (AES encryption)
[EXPORTS]: setToken, getToken, clearToken, getSessionId, setSessionId
[KEYS]: splitlease_auth_token, splitlease_session_id

---

### bubbleAPI.js
[INTENT]: Bubble API client routing through Edge Functions
[EXPORTS]: callBubbleAPI, fetchListing, submitProposal
[DEPENDS_ON]: supabase
[PATTERN]: All Bubble calls through Edge Functions (never direct)

---

### constants.js
[INTENT]: Main constants file
[EXPORTS]:
  - PROPOSAL_STATUSES: All status strings
  - DAYS_OF_WEEK: Day name constants
  - PRICE_TIERS: Search filter price ranges
  - API_ENDPOINTS: Edge Function endpoints
  - BOROUGH_MAP_CONFIGS: NYC borough map centers

---

### dataLookups.js
[INTENT]: Lookup functions for reference data
[EXPORTS]: fetchBoroughs, fetchNeighborhoods, fetchAmenities, fetchHouseRules
[DATA_SOURCE]: Supabase zat_* lookup tables

---

### listingDataFetcher.js
[INTENT]: Listing data retrieval via Edge Functions
[EXPORTS]: fetchListing, fetchListingPhotos, fetchListingsByBorough
[DEPENDS_ON]: bubbleAPI

---

### proposalDataFetcher.js
[INTENT]: Proposal data retrieval via Edge Functions
[EXPORTS]: fetchProposal, fetchProposalsByGuest, fetchProposalsByHost
[DEPENDS_ON]: bubbleAPI

---

### dayUtils.js
[INTENT]: Day/week utility functions
[EXPORTS]: getDayName, getWeekDays, formatDateRange, parseISODate

---

### sanitize.js
[INTENT]: HTML/input sanitization for XSS prevention
[EXPORTS]: sanitizeHTML, sanitizeInput
[USAGE]: Always sanitize user-generated content before display

---

### urlParams.js
[INTENT]: URL parameter parsing utilities
[EXPORTS]: getUrlParam, setUrlParam, removeUrlParam

---

### mapUtils.js
[INTENT]: Google Maps utilities
[EXPORTS]: formatAddress, geocodeAddress, getBoundsForListings

---

## ### API_CLIENT_PATTERN ###

```javascript
// All Bubble API calls go through Edge Functions
import { supabase } from 'lib/supabase'

export async function fetchListing(listingId) {
  const { data, error } = await supabase.functions.invoke('bubble-proxy', {
    body: { action: 'listing', type: 'fetch', id: listingId }
  })

  if (error) throw error
  return data
}
```

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: NEVER call Bubble API directly - always through Edge Functions
[RULE_2]: Use secureStorage for auth tokens (encrypted)
[RULE_3]: All environment variables start with VITE_ for frontend access
[RULE_4]: API keys stored in Supabase Secrets, NOT in frontend

---

## ### DEPENDENCIES ###

[LOCAL]: None (lib is foundational)
[EXTERNAL]: @supabase/supabase-js
[ENV]: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_GOOGLE_MAPS_API_KEY

---

**SUBDIRECTORY_COUNT**: 2
**TOTAL_FILES**: 20+
