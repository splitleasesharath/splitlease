# Library - Utility Modules

**GENERATED**: 2025-11-26
**PARENT**: app/src/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Utility modules, API clients, and shared infrastructure
[PATTERN]: Service modules with async functions for data fetching
[SCOPE]: Application-wide utilities

---

## ### SUBDIRECTORIES ###

### constants/
[INTENT]: Constant definitions for proposal statuses and stages
[FILES]: 2 files
[KEY_EXPORTS]: PROPOSAL_STAGES, PROPOSAL_STATUSES

### scheduleSelector/
[INTENT]: Utilities specific to schedule selector component
[FILES]: 4 files
[KEY_EXPORTS]: calculateNights, dayHelpers, validators

---

## ### FILE_INVENTORY ###

### auth.js
[INTENT]: Authentication functions (login, logout, validate, checkStatus)
[IMPORTS]: ./secureStorage, ./supabase
[DEPENDENCIES]: supabase/functions/bubble-auth-proxy/
[EXPORTS]: loginUser, logoutUser, checkAuthStatus, validateTokenAndFetchUser

### availabilityValidation.js
[INTENT]: Availability checking and date validation
[IMPORTS]: ./dayUtils

### bubbleAPI.js
[INTENT]: Bubble API client routing through Edge Functions
[IMPORTS]: ./supabase
[DEPENDENCIES]: supabase/functions/bubble-proxy/, bubble-auth-proxy/

### config.js
[INTENT]: Application configuration and environment values
[EXPORTS]: config, SUPABASE_URL, SUPABASE_ANON_KEY

### constants.js
[INTENT]: Main constants file with statuses, days, tiers, endpoints
[EXPORTS]: PROPOSAL_STATUSES, DAYS_OF_WEEK, PRICE_TIERS, API_ENDPOINTS

### dataLookups.js
[INTENT]: Lookup functions for boroughs, neighborhoods, amenities
[IMPORTS]: ./supabase
[DATA_SOURCE]: Supabase lookup tables (zat_*)

### dayUtils.js
[INTENT]: Day/week utility functions
[EXPORTS]: getDayName, getWeekDays, formatDateRange

### hotjar.js
[INTENT]: Hotjar analytics integration
[EXPORTS]: initHotjar, trackEvent

### informationalTextsFetcher.js
[INTENT]: CMS content fetcher from Supabase informational_texts
[IMPORTS]: ./supabase

### listingDataFetcher.js
[INTENT]: Listing data retrieval via Edge Functions
[IMPORTS]: ./bubbleAPI
[EXPORTS]: fetchListing, fetchListingPhotos

### mapUtils.js
[INTENT]: Google Maps utilities
[IMPORTS]: @react-google-maps/api

### nycZipCodes.ts
[INTENT]: NYC zip code validation and borough detection
[EXPORTS]: isValidNYCZipCode, getBoroughByZipCode

### priceCalculations.js
[INTENT]: General pricing utilities
[EXPORTS]: formatCurrency, calculateDiscount

### proposalDataFetcher.js
[INTENT]: Proposal data retrieval via Edge Functions
[IMPORTS]: ./bubbleAPI

### sanitize.js
[INTENT]: HTML/input sanitization for XSS prevention
[EXPORTS]: sanitizeHTML, sanitizeInput

### secureStorage.js
[INTENT]: Encrypted storage for auth tokens (AES encryption)
[EXPORTS]: setToken, getToken, clearToken

### supabase.js
[INTENT]: Supabase client initialization
[IMPORTS]: @supabase/supabase-js
[EXPORTS]: supabase

### supabaseUtils.js
[INTENT]: Typed wrappers for Supabase operations
[IMPORTS]: ./supabase
[EXPORTS]: fetchFromTable, insertIntoTable

### urlParams.js
[INTENT]: URL parameter parsing utilities
[EXPORTS]: getUrlParam, setUrlParam

### SECURE_AUTH_README.md
[INTENT]: Documentation for authentication security

---

## ### API_CLIENT_PATTERN ###

```javascript
// All Bubble API calls go through Edge Functions
import { supabase } from 'lib/supabase';

async function fetchData() {
  const { data } = await supabase.functions.invoke('bubble-proxy', {
    body: { action: 'listing', type: 'fetch', id: listingId }
  });
  return data;
}
```

---

**SUBDIRECTORY_COUNT**: 2
**TOTAL_FILES**: 20+
