# Duplication Refactoring Implementation Plan

## Overview

This plan consolidates 47 identified duplication issues into actionable implementation steps across 4 phases. Each phase builds on the previous, following the dependency graph from the analysis.

---

## Phase 1: Foundations (No Dependencies)

### 1.1 Unify Auth Status Management
**Priority**: CRITICAL | **Risk**: HIGH | **Files Affected**: 4+

**Problem**: Four different auth state implementations can return conflicting results.

**Implementation Steps**:

1. **Create unified hook** at `app/src/hooks/useAuthStatus.js`:
   ```javascript
   import { useState, useEffect } from 'react'
   import { validateTokenAndFetchUser, getAuthToken } from '@/lib/auth'

   export function useAuthStatus() {
     const [authState, setAuthState] = useState({
       checked: false,
       user: null,
       isAuthenticated: false
     })

     useEffect(() => {
       const validate = async () => {
         const token = getAuthToken()
         if (!token) {
           setAuthState({ checked: true, user: null, isAuthenticated: false })
           return
         }
         const userData = await validateTokenAndFetchUser()
         setAuthState({
           checked: true,
           user: userData,
           isAuthenticated: !!userData
         })
       }
       validate()
     }, [])

     return authState
   }
   ```

2. **Update consumers**:
   - `app/src/islands/shared/Header.jsx:39-90` → Replace inline auth logic with `useAuthStatus()`
   - `app/src/islands/pages/SearchPage.jsx:692-734` → Replace double validation
   - `app/src/guest-proposals.jsx:9-24` → Replace IIFE pattern
   - `app/src/account-profile.jsx:14-21` → Replace token-only check

3. **Testing checklist**:
   - [ ] Login flow works correctly
   - [ ] Protected pages redirect unauthenticated users
   - [ ] User data displays consistently across Header and pages
   - [ ] Logout clears state everywhere

---

### 1.2 Fix Cookie vs Token Priority
**Priority**: CRITICAL | **Risk**: HIGH | **File**: `app/src/lib/auth.js:82-97`

**Problem**: Cookie `loggedIn=true` overrides expired tokens, causing partial auth states.

**Implementation Steps**:

1. **Modify `checkAuthStatus()`** in `app/src/lib/auth.js`:
   ```javascript
   // BEFORE (buggy):
   export function checkAuthStatus() {
     const splitLeaseAuth = checkSplitLeaseCookies()
     if (splitLeaseAuth.isLoggedIn) {
       return true  // Cookie bypasses token validation!
     }
     // ...
   }

   // AFTER (fixed):
   export function checkAuthStatus() {
     // Token is the source of truth
     const token = getAuthToken()
     if (!token) return false

     // Cookie only provides username hint, never auth status
     return true  // Token exists; actual validation happens in validateTokenAndFetchUser
   }
   ```

2. **Update `checkSplitLeaseCookies()`** to only return username, not auth status:
   ```javascript
   export function checkSplitLeaseCookies() {
     const cookies = document.cookie.split('; ')
     const usernameCookie = cookies.find(c => c.startsWith('username='))
     return {
       username: usernameCookie ? usernameCookie.split('=')[1] : null
     }
     // Remove isLoggedIn - it should never come from cookie
   }
   ```

3. **Testing checklist**:
   - [ ] Expired token with `loggedIn=true` cookie correctly shows logged out
   - [ ] Fresh login sets both token and cookie
   - [ ] API calls don't fail silently due to stale cookie

---

### 1.3 Consolidate JSON Parsing
**Priority**: CRITICAL | **Risk**: MEDIUM

**Problem**: Three implementations with different error behavior (fallback vs throw).

**Implementation Steps**:

1. **Keep only Logic Core version**: `app/src/logic/processors/listing/parseJsonArrayField.js`

2. **Add optional version** at `app/src/logic/processors/listing/parseJsonArrayFieldOptional.js`:
   ```javascript
   import { parseJsonArrayField } from './parseJsonArrayField'

   export function parseJsonArrayFieldOptional({ field, fieldName, defaultValue = [] }) {
     if (field === null || field === undefined) {
       return defaultValue
     }
     return parseJsonArrayField({ field, fieldName })
   }
   ```

3. **Update imports** in these files:
   - `app/src/lib/supabaseUtils.js:25-48` → Replace `parseJsonArray()` with Logic Core import
   - `app/src/lib/listingDataFetcher.js:30-52` → Replace `parseJsonField()` with Logic Core import

4. **Delete deprecated functions** after migration complete

---

### 1.4 Delete Dead Code
**Priority**: LOW | **Risk**: LOW

**Files to delete**:

| File | Reason | Verification Before Delete |
|------|--------|---------------------------|
| `app/src/islands/shared/ListingScheduleSelector.jsx` | Superseded by V2 | Confirm no imports exist |
| `app/src/lib/dayUtils.js` | Replaced by Logic Core adapters | Confirm no imports exist |
| `app/src/islands/pages/ViewSplitLeasePage-old.jsx` | Legacy backup | Confirm no imports exist |

**Implementation Steps**:

1. **Search for imports** of each file:
   ```bash
   grep -r "ListingScheduleSelector" app/src --include="*.jsx" --include="*.js"
   grep -r "dayUtils" app/src --include="*.jsx" --include="*.js"
   grep -r "ViewSplitLeasePage-old" app/src --include="*.jsx" --include="*.js"
   ```

2. **Update any remaining imports** to use replacement files

3. **Delete files** and commit with message: "chore: remove deprecated files [ListingScheduleSelector, dayUtils, ViewSplitLeasePage-old]"

---

## Phase 2: Core Services (Depends on Phase 1)

### 2.1 Create User Fetcher Service
**Priority**: HIGH | **Risk**: LOW | **Depends on**: 1.1

**Problem**: Same 11-field user query appears in 6+ files.

**Implementation Steps**:

1. **Create** `app/src/lib/userFetcher.js`:
   ```javascript
   import { supabase } from '@/lib/supabaseClient'

   const USER_FIELDS_MINIMAL = 'id, first_name, last_name'
   const USER_FIELDS_STANDARD = 'id, first_name, last_name, email, profile_photo, user_type'
   const USER_FIELDS_COMPLETE = 'id, first_name, last_name, email, profile_photo, user_type, phone, created_at, bubble_id, bio'

   export async function fetchUserById(userId, fields = 'standard') {
     const fieldSet = {
       minimal: USER_FIELDS_MINIMAL,
       standard: USER_FIELDS_STANDARD,
       complete: USER_FIELDS_COMPLETE
     }[fields] || USER_FIELDS_STANDARD

     const { data, error } = await supabase
       .from('user')
       .select(fieldSet)
       .eq('id', userId)
       .single()

     if (error) throw new Error(`fetchUserById: ${error.message}`)
     return data
   }

   export async function fetchUserByBubbleId(bubbleId, fields = 'standard') {
     // Similar implementation
   }
   ```

2. **Update consumers**:
   - `app/src/lib/proposalDataFetcher.js:51-66` → Use `fetchUserById()`
   - `app/src/lib/proposalDataFetcher.js:164-180` → Use `fetchUserById()`
   - `app/src/logic/workflows/proposals/loadProposalDetailsWorkflow.js:84-100` → Use `fetchUserById()`
   - `app/src/logic/workflows/proposals/loadProposalDetailsWorkflow.js:119-135` → Use `fetchUserById()`

---

### 2.2 Unify Day Conversion
**Priority**: HIGH | **Risk**: MEDIUM | **Depends on**: 1.3

**Problem**: Old `dayUtils.js` silently fails; Logic Core throws.

**Implementation Steps**:

1. **Find all usages** of `dayUtils.js`:
   ```bash
   grep -r "from.*dayUtils" app/src --include="*.jsx" --include="*.js"
   grep -r "toBubbleDays\|fromBubbleDays" app/src --include="*.jsx" --include="*.js"
   ```

2. **Replace with Logic Core adapters**:
   ```javascript
   // OLD:
   import { toBubbleDays, fromBubbleDays } from '@/lib/dayUtils'

   // NEW:
   import { adaptDaysToBubble } from '@/logic/processors/external/adaptDaysToBubble'
   import { adaptDaysFromBubble } from '@/logic/processors/external/adaptDaysFromBubble'
   ```

3. **Update call signatures** (Logic Core uses object params):
   ```javascript
   // OLD:
   const bubbleDays = toBubbleDays(selectedDays)

   // NEW:
   const bubbleDays = adaptDaysToBubble({ zeroBasedDays: selectedDays })
   ```

---

### 2.3 Create BaseModal Component
**Priority**: HIGH | **Risk**: LOW

**Problem**: 8 modal components each implement same overlay/dismiss/header patterns.

**Implementation Steps**:

1. **Create** `app/src/islands/shared/BaseModal.jsx`:
   ```jsx
   import { useEffect, useCallback } from 'react'

   export function BaseModal({
     isOpen,
     onClose,
     title,
     children,
     size = 'medium', // small, medium, large, fullscreen
     showCloseButton = true
   }) {
     // Handle ESC key
     const handleKeyDown = useCallback((e) => {
       if (e.key === 'Escape') onClose()
     }, [onClose])

     useEffect(() => {
       if (isOpen) {
         document.addEventListener('keydown', handleKeyDown)
         document.body.style.overflow = 'hidden'
       }
       return () => {
         document.removeEventListener('keydown', handleKeyDown)
         document.body.style.overflow = ''
       }
     }, [isOpen, handleKeyDown])

     if (!isOpen) return null

     const sizeClasses = {
       small: 'max-w-md',
       medium: 'max-w-lg',
       large: 'max-w-2xl',
       fullscreen: 'max-w-full h-full'
     }

     return (
       <div
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
         onClick={onClose}
       >
         <div
           className={`bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full mx-4`}
           onClick={e => e.stopPropagation()}
         >
           {title && (
             <header className="flex items-center justify-between p-4 border-b">
               <h2 className="text-lg font-semibold">{title}</h2>
               {showCloseButton && (
                 <button
                   onClick={onClose}
                   className="text-gray-400 hover:text-gray-600"
                   aria-label="Close"
                 >
                   ×
                 </button>
               )}
             </header>
           )}
           <div className="p-4">
             {children}
           </div>
         </div>
       </div>
     )
   }
   ```

2. **Migrate modals one at a time**:
   - Start with simplest: `CancelProposalModal.jsx`
   - Then: `MapModal.jsx`, `HostProfileModal.jsx`
   - Complex last: `SignUpLoginModal.jsx`, `EditProposalModal.jsx`

---

### 2.4 Delete Duplicate isProtectedPage
**Priority**: LOW | **Risk**: LOW

**Implementation Steps**:

1. **Export protected paths** from constants:
   ```javascript
   // app/src/lib/constants.js
   export const PROTECTED_PATHS = [
     '/guest-proposals',
     '/account-profile',
     '/host-dashboard'
   ]
   ```

2. **Update Logic Core** to import from constants:
   ```javascript
   // app/src/logic/rules/auth/isProtectedPage.js
   import { PROTECTED_PATHS } from '@/lib/constants'
   ```

3. **Delete** `isProtectedPage()` from `app/src/lib/auth.js:635-650`

4. **Update imports** in any file using `auth.js` version

---

## Phase 3: Page Consolidation (Depends on Phase 2)

### 3.1 Merge SearchPage Implementations
**Priority**: CRITICAL | **Risk**: MEDIUM | **Depends on**: 2.1

**Problem**: ~1,500 lines duplicated between SearchPage.jsx and SearchPageTest.jsx.

**Implementation Steps**:

1. **Audit differences** between files:
   ```bash
   diff app/src/islands/pages/SearchPage.jsx app/src/islands/pages/SearchPageTest.jsx > search_diff.txt
   ```

2. **Identify unique features** in SearchPageTest.jsx that should be merged

3. **Migrate SearchPage.jsx** to use `useSearchPageLogic.js` hook:
   ```javascript
   // BEFORE (SearchPage.jsx has inline logic):
   const [filters, setFilters] = useState({})
   const [listings, setListings] = useState([])
   // ... 1000+ lines of inline logic

   // AFTER:
   import { useSearchPageLogic } from '@/logic/hooks/useSearchPageLogic'

   function SearchPage() {
     const {
       filters,
       setFilters,
       listings,
       isLoading,
       error,
       // ... other state
     } = useSearchPageLogic()

     // Only rendering logic remains
   }
   ```

4. **Delete** `SearchPageTest.jsx` after migration

---

### 3.2 Extract Query Builder
**Priority**: MEDIUM | **Risk**: LOW | **Depends on**: 2.1, 2.2

**Problem**: Identical 30+ line query building code in multiple files.

**Implementation Steps**:

1. **Create** `app/src/logic/queries/buildListingSearchQuery.js`:
   ```javascript
   export function buildListingSearchQuery(supabase, {
     borough,
     neighborhoods,
     priceTier,
     weekPattern,
     amenities,
     sortOption
   }) {
     let query = supabase
       .from('listing')
       .select('*')
       .eq('"Complete"', true)
       .or('"Active".eq.true,"Active".is.null')

     if (borough?.id) {
       query = query.eq('"Location - Borough"', borough.id)
     }

     if (neighborhoods?.length > 0) {
       query = query.in('"Location - Neighborhood"', neighborhoods.map(n => n.id))
     }

     // ... remaining filters

     return query
   }
   ```

2. **Update consumers**:
   - `app/src/islands/pages/SearchPage.jsx:1038-1072`
   - `app/src/logic/hooks/useSearchPageLogic.js:325-360`

---

### 3.3 Centralize Navigation
**Priority**: MEDIUM | **Risk**: LOW | **Depends on**: 2.1

**Problem**: 35+ inline `window.location.href` assignments instead of using centralized functions.

**Implementation Steps**:

1. **Audit existing navigation workflow**:
   - File: `app/src/logic/workflows/navigation/navigationWorkflow.js`
   - Contains: `navigateToListing()`, `navigateToMessaging()`, `navigateToSearch()`

2. **Add missing navigation functions**:
   ```javascript
   export function navigateToGuestProposals() {
     window.location.href = '/guest-proposals'
   }

   export function navigateToAccountProfile() {
     window.location.href = '/account-profile'
   }

   export function navigateToHostDashboard() {
     window.location.href = '/host-dashboard'
   }
   ```

3. **Find and replace** all direct assignments:
   ```bash
   grep -rn "window.location.href\s*=" app/src --include="*.jsx" --include="*.js"
   ```

4. **Replace inline navigation** with workflow functions

---

## Phase 4: Polish (Depends on Phase 3)

### 4.1 Standardize Loading/Error States
**Priority**: LOW | **Risk**: LOW | **Depends on**: 3.1

**Implementation Steps**:

1. **Create** `app/src/islands/shared/LoadingState.jsx`:
   ```jsx
   export function LoadingState({ message = 'Loading...' }) {
     return (
       <div className="flex items-center justify-center p-8">
         <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
         <span className="ml-3 text-gray-600">{message}</span>
       </div>
     )
   }
   ```

2. **Create** `app/src/islands/shared/ErrorState.jsx`:
   ```jsx
   export function ErrorState({ message, onRetry }) {
     return (
       <div className="flex flex-col items-center justify-center p-8">
         <p className="text-red-600 mb-4">{message}</p>
         {onRetry && (
           <button
             onClick={onRetry}
             className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
           >
             Try Again
           </button>
         )}
       </div>
     )
   }
   ```

3. **Replace implementations** in:
   - `SearchPage.jsx:559-614`
   - `ViewSplitLeasePage.jsx:128-197`

---

### 4.2 Consolidate Filter Constants
**Priority**: LOW | **Risk**: MEDIUM | **Depends on**: 3.1

**Implementation Steps**:

1. **Ensure single source** in `app/src/lib/constants.js`:
   ```javascript
   export const PRICE_TIERS = [
     { id: 'budget', label: 'Budget', min: 0, max: 100 },
     { id: 'moderate', label: 'Moderate', min: 100, max: 200 },
     // ...
   ]

   export const WEEK_PATTERNS = [
     { id: 'weekdays', label: 'Weekdays', days: [1, 2, 3, 4, 5] },
     { id: 'weekends', label: 'Weekends', days: [0, 6] },
     // ...
   ]
   ```

2. **Update Logic Core rules** to import from constants:
   ```javascript
   // app/src/logic/rules/search/isValidPriceTier.js
   import { PRICE_TIERS } from '@/lib/constants'

   export function isValidPriceTier({ tierId }) {
     return PRICE_TIERS.some(tier => tier.id === tierId)
   }
   ```

---

### 4.3 Create Geographic Data Hook
**Priority**: LOW | **Risk**: LOW | **Depends on**: 3.1

**Implementation Steps**:

1. **Create** `app/src/hooks/useGeographicData.js`:
   ```javascript
   import { useState, useEffect } from 'react'
   import { supabase } from '@/lib/supabaseClient'

   export function useGeographicData() {
     const [boroughs, setBoroughs] = useState([])
     const [neighborhoods, setNeighborhoods] = useState([])
     const [isLoading, setIsLoading] = useState(true)
     const [error, setError] = useState(null)

     useEffect(() => {
       async function loadGeoData() {
         try {
           const [boroughRes, neighborhoodRes] = await Promise.all([
             supabase.from('zat_geo_borough_toplevel').select('*').order('name'),
             supabase.from('zat_geo_hood_mediumlevel').select('*').order('name')
           ])

           if (boroughRes.error) throw boroughRes.error
           if (neighborhoodRes.error) throw neighborhoodRes.error

           setBoroughs(boroughRes.data)
           setNeighborhoods(neighborhoodRes.data)
         } catch (err) {
           setError(err.message)
         } finally {
           setIsLoading(false)
         }
       }
       loadGeoData()
     }, [])

     return { boroughs, neighborhoods, isLoading, error }
   }
   ```

2. **Replace duplicate queries** in:
   - `SearchPage.jsx:864-996`
   - `useSearchPageLogic.js:495-590`

---

## Tracking Checklist

### Phase 1: Foundations
- [ ] 1.1 Create `useAuthStatus()` hook
- [ ] 1.1 Update Header.jsx to use hook
- [ ] 1.1 Update SearchPage.jsx to use hook
- [ ] 1.1 Update guest-proposals.jsx to use hook
- [ ] 1.1 Update account-profile.jsx to use hook
- [ ] 1.2 Fix cookie vs token priority in auth.js
- [ ] 1.3 Create parseJsonArrayFieldOptional
- [ ] 1.3 Update supabaseUtils.js imports
- [ ] 1.3 Update listingDataFetcher.js imports
- [ ] 1.4 Delete ListingScheduleSelector.jsx
- [ ] 1.4 Delete dayUtils.js
- [ ] 1.4 Delete ViewSplitLeasePage-old.jsx

### Phase 2: Core Services
- [ ] 2.1 Create userFetcher.js
- [ ] 2.1 Update proposalDataFetcher.js
- [ ] 2.1 Update loadProposalDetailsWorkflow.js
- [ ] 2.2 Replace dayUtils imports with Logic Core
- [ ] 2.3 Create BaseModal.jsx
- [ ] 2.3 Migrate CancelProposalModal
- [ ] 2.3 Migrate MapModal
- [ ] 2.3 Migrate remaining modals
- [ ] 2.4 Export PROTECTED_PATHS from constants
- [ ] 2.4 Delete isProtectedPage from auth.js

### Phase 3: Page Consolidation
- [ ] 3.1 Audit SearchPage vs SearchPageTest differences
- [ ] 3.1 Migrate SearchPage to useSearchPageLogic
- [ ] 3.1 Delete SearchPageTest.jsx
- [ ] 3.2 Create buildListingSearchQuery.js
- [ ] 3.2 Update query consumers
- [ ] 3.3 Add missing navigation functions
- [ ] 3.3 Replace inline window.location.href

### Phase 4: Polish
- [ ] 4.1 Create LoadingState component
- [ ] 4.1 Create ErrorState component
- [ ] 4.1 Replace inline implementations
- [ ] 4.2 Update Logic Core to import from constants
- [ ] 4.3 Create useGeographicData hook
- [ ] 4.3 Replace duplicate geographic queries

---

## Expected Outcomes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Duplicated Lines | ~8,500 | ~3,500 | 59% reduction |
| Auth Implementations | 4 | 1 | Unified |
| JSON Parsing Functions | 3 | 1 (+optional) | Standardized |
| Search Page Files | 2 | 1 | Consolidated |
| Modal Base Patterns | 8 duplicates | 1 shared | DRY |

---

## Risk Mitigation

1. **Auth changes**: Test thoroughly in staging before production
2. **SearchPage merge**: Keep SearchPageTest.jsx until full QA pass
3. **JSON parsing**: Add logging during transition to catch silent failures
4. **Navigation**: Regression test all navigation flows after centralization

---

*Plan created: November 2024*
*Based on: Duplication analysis.md*
*Target branch: SL18*
