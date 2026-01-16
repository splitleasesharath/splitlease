# Code Refactoring Plan - app

Date: 2026-01-16
Audit Type: general
Total Issues Found: 28 chunks across 7 page groups

## Executive Summary

This audit identified **1,382 console.log statements** across 148 files, **59 files with excessive useState** (5+ calls), **14 TODO comments** indicating unfinished work, and multiple architectural patterns that can be improved for performance and maintainability.

---

## PAGE GROUP: AUTO (Global/Shared Components)

These issues affect ALL pages since they're in shared components or utilities.

~~~~~

### CHUNK 1: Remove debug console.logs from SignUpLoginModal
**File:** app/src/islands/shared/SignUpLoginModal.jsx
**Line:** 953-957, 1257-1302, 1399-1539
**Issue:** 22+ debug console.log statements left in production code, causing console noise and minor performance overhead
**Affected Pages:** ALL (modal used site-wide)

**Current Code:**
```javascript
console.log('[SignUpModal] Redirecting to profile with user_id:', userId);
console.log('[SignUpModal] Full result:', JSON.stringify(result, null, 2));
console.log('[SignUpModal] result.data:', JSON.stringify(result.data, null, 2));
console.log('[SignUpModal] userId is undefined?', userId === undefined);
console.log('[SignUpModal] userId type:', typeof userId);
```

**Refactored Code:**
```javascript
// Remove all debug console.log statements OR wrap in development check:
if (import.meta.env.DEV) {
  console.log('[SignUpModal] Redirecting to profile with user_id:', userId);
}
```

**Testing:**
- [ ] Verify login flow works without console output in production
- [ ] Verify signup flow completes successfully
- [ ] Check OAuth flows still function

~~~~~

### CHUNK 2: Remove debug console.logs from Header.jsx
**File:** app/src/islands/shared/Header.jsx
**Line:** 55-150 (within useEffect)
**Issue:** 30+ console.log statements for auth state debugging left in production
**Affected Pages:** ALL (header on every page)

**Current Code:**
```javascript
console.log('[Header] No immediate Supabase session, waiting briefly for initialization...');
console.log('[Header] ✅ Found Supabase session after brief wait');
console.log('[Header] Auth found (legacy token: ${!!token}, Supabase session: ${hasSupabaseSession}, cached auth: ${hasCachedAuth}) - validating...');
console.log('[Header] Background validation successful:', userData.firstName);
```

**Refactored Code:**
```javascript
// Remove OR wrap in logger utility:
import { logger } from '../../lib/logger.js';

// Replace console.log with:
logger.debug('[Header] Background validation successful:', userData.firstName);
```

**Testing:**
- [ ] Verify header auth state displays correctly
- [ ] Test login/logout transitions
- [ ] Verify mobile menu works

~~~~~

### CHUNK 3: Remove debug console.logs from auth/tokenValidation.js
**File:** app/src/lib/auth/tokenValidation.js
**Line:** 108-368
**Issue:** 33+ console.log statements for auth validation debugging
**Affected Pages:** ALL (auth used everywhere)

**Current Code:**
```javascript
console.log('🔍 Checking authentication status...');
console.log('✅ Migrated from legacy storage');
console.log('✅ User authenticated via Split Lease cookies');
console.log('   Username:', splitLeaseAuth.username);
```

**Refactored Code:**
```javascript
import { logger } from '../logger.js';

// Replace all console.log with logger.debug:
logger.debug('Checking authentication status...');
logger.debug('Migrated from legacy storage');
```

**Testing:**
- [ ] Verify token validation works silently
- [ ] Test session persistence across page loads
- [ ] Verify logout clears state properly

~~~~~

### CHUNK 4: Remove debug console.logs from auth/login.js
**File:** app/src/lib/auth/login.js
**Line:** 38-376
**Issue:** 29+ console.log statements for login flow debugging
**Affected Pages:** ALL (login used everywhere)

**Current Code:**
```javascript
console.log('🔐 Attempting login via Edge Function for:', email);
console.log('🔄 Using direct fetch to bypass Supabase client session handling...');
console.log('✅ Cleared auth token from localStorage');
console.log('📡 Calling auth-user edge function via direct fetch...');
```

**Refactored Code:**
```javascript
import { logger } from '../logger.js';

logger.debug('Attempting login via Edge Function for:', email);
logger.debug('Using direct fetch to bypass Supabase client session handling...');
```

**Testing:**
- [ ] Verify login with email/password works
- [ ] Test OAuth login flows
- [ ] Verify session is properly established

~~~~~

### CHUNK 5: Remove debug console.logs from dataLookups.js
**File:** app/src/lib/dataLookups.js
**Line:** 82, 108, 133, 162, 198, 224, 251, 277, 307, 334, 370-371, 394, 410, 436, 450, 477, 503, 529, 549, 577, 650, 684
**Issue:** 35+ console.log/warn statements for cache debugging
**Affected Pages:** ALL (lookups used site-wide)

**Current Code:**
```javascript
console.log('Data lookups initialized successfully');
console.log(`Cached ${lookupCache.boroughs.size} boroughs`);
console.log(`Cached ${lookupCache.neighborhoods.size} neighborhoods`);
console.warn(`Neighborhood ID not found in cache: ${neighborhoodId}`);
```

**Refactored Code:**
```javascript
import { logger } from './logger.js';

logger.debug('Data lookups initialized successfully');
logger.debug(`Cached ${lookupCache.boroughs.size} boroughs`);
// Remove warn for cache misses - these are expected for new data
```

**Testing:**
- [ ] Verify lookups still populate correctly
- [ ] Test neighborhood/borough display on listings
- [ ] Verify amenity icons display

~~~~~

### CHUNK 6: Create centralized logger utility with environment-aware output
**File:** app/src/lib/logger.js
**Line:** 1-50 (new implementation)
**Issue:** No centralized logging - console.logs scattered everywhere with no control
**Affected Pages:** ALL

**Current Code:**
```javascript
// Current logger.js is minimal, needs enhancement:
export const logger = {
  log: (...args) => console.log(...args),
  error: (...args) => console.error(...args),
  // etc.
};
```

**Refactored Code:**
```javascript
/**
 * Centralized Logger Utility
 * Provides environment-aware logging with levels
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

const currentLevel = import.meta.env.DEV ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

export const logger = {
  debug: (...args) => {
    if (currentLevel <= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args) => {
    if (currentLevel <= LOG_LEVELS.INFO) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args) => {
    if (currentLevel <= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args) => {
    if (currentLevel <= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args);
    }
  }
};

export default logger;
```

**Testing:**
- [ ] Verify debug logs appear in development
- [ ] Verify debug logs are suppressed in production build
- [ ] Test error/warn logs still appear in production

~~~~~

## PAGE GROUP: /view-split-lease (Chunks: 7, 8)

~~~~~

### CHUNK 7: Remove debug console.logs from ViewSplitLeasePage
**File:** app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx
**Line:** 64, 76-80, 103, 123, 227, 234, 258-270, 307, 327, 401-461, 587-588, 640-642, 733-734, 796-797, 828-869, 1732-1743, 1984-1995, 2078, 2523
**Issue:** 51+ console.log statements for listing view debugging - significant performance impact
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
console.log('📅 ViewSplitLeasePage: No days-selected URL param, using empty initial selection');
console.log('📅 ViewSplitLeasePage: Loaded schedule from URL:', {
  urlParam: daysParam,
  dayIndices: validDays,
  dayObjects: dayObjects.map(d => d.name)
});
console.log('=== PRICE CHANGE CALLBACK ===');
console.log('Received price breakdown:', newPriceBreakdown);
{console.log('Rendering prices - pricingBreakdown:', pricingBreakdown)}
```

**Refactored Code:**
```javascript
import { logger } from '../../lib/logger.js';

logger.debug('ViewSplitLeasePage: No days-selected URL param, using empty initial selection');
logger.debug('ViewSplitLeasePage: Loaded schedule from URL:', {
  urlParam: daysParam,
  dayIndices: validDays
});

// CRITICAL: Remove JSX inline console.log - causes re-render logging:
// {console.log('Rendering prices - pricingBreakdown:', pricingBreakdown)}
// Should be removed entirely
```

**Testing:**
- [ ] Verify listing page loads correctly
- [ ] Test schedule selection from URL params
- [ ] Verify proposal submission flow
- [ ] Check price breakdown displays correctly

~~~~~

### CHUNK 8: Remove inline JSX console.log causing render-time logging
**File:** app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx
**Line:** 2078
**Issue:** JSX inline console.log executes on EVERY render, causing performance issues
**Affected Pages:** /view-split-lease

**Current Code:**
```javascript
{console.log('Rendering prices - pricingBreakdown:', pricingBreakdown)}
```

**Refactored Code:**
```javascript
// Delete the entire line - inline console.log in JSX is an anti-pattern
// If debugging needed, use useEffect:
useEffect(() => {
  if (import.meta.env.DEV) {
    console.log('pricingBreakdown updated:', pricingBreakdown);
  }
}, [pricingBreakdown]);
```

**Testing:**
- [ ] Verify pricing section renders without console output
- [ ] Check React DevTools for render count

~~~~~

## PAGE GROUP: /search (Chunks: 9, 10)

~~~~~

### CHUNK 9: Remove debug console.logs from useSearchPageLogic
**File:** app/src/islands/pages/useSearchPageLogic.js
**Line:** Multiple (26+ occurrences)
**Issue:** 26+ console.log statements for search debugging
**Affected Pages:** /search

**Current Code:**
```javascript
console.log('🔍 Search: Initializing filters from URL...');
console.log('🔍 Search: Fetching listings with filters:', filters);
console.log('✅ Search: Listings loaded:', listings.length);
```

**Refactored Code:**
```javascript
import { logger } from '../../lib/logger.js';

logger.debug('Search: Initializing filters from URL...');
logger.debug('Search: Fetching listings with filters:', filters);
```

**Testing:**
- [ ] Verify search filters work correctly
- [ ] Test URL param persistence
- [ ] Verify listing results display

~~~~~

### CHUNK 10: Reduce excessive useState in SearchPage.jsx
**File:** app/src/islands/pages/SearchPage.jsx
**Line:** Component top-level
**Issue:** File has 5+ useState calls in quick succession - consider useReducer or state consolidation
**Affected Pages:** /search

**Current Code:**
```javascript
const [loading, setLoading] = useState(true);
const [listings, setListings] = useState([]);
const [selectedDays, setSelectedDays] = useState([]);
const [selectedBorough, setSelectedBorough] = useState('');
const [weekPattern, setWeekPattern] = useState('every-week');
// ... many more
```

**Refactored Code:**
```javascript
// Consider consolidating related state with useReducer:
const initialState = {
  loading: true,
  listings: [],
  filters: {
    selectedDays: [],
    selectedBorough: '',
    weekPattern: 'every-week',
    priceTier: 'all',
    sortBy: 'recommended'
  }
};

function searchReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_LISTINGS':
      return { ...state, listings: action.payload, loading: false };
    case 'UPDATE_FILTER':
      return {
        ...state,
        filters: { ...state.filters, [action.field]: action.value }
      };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(searchReducer, initialState);
```

**Testing:**
- [ ] Verify all filter changes work
- [ ] Test listings update on filter change
- [ ] Verify URL params sync with state

~~~~~

## PAGE GROUP: /guest-proposals (Chunks: 11, 12)

~~~~~

### CHUNK 11: Remove debug console.logs from useGuestProposalsPageLogic
**File:** app/src/islands/pages/proposals/useGuestProposalsPageLogic.js
**Line:** 72, 81, 106, 117, 121, 134, 151, 164
**Issue:** 9+ console.log statements for proposal page debugging
**Affected Pages:** /guest-proposals

**Current Code:**
```javascript
console.log('🔐 Guest Proposals: Checking authentication...');
console.log('❌ Guest Proposals: User not authenticated, redirecting to home');
console.log('✅ Guest Proposals: User data loaded, userType:', userType);
console.log('⚠️ Guest Proposals: Using fallback session data, userType:', userType);
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

logger.debug('Guest Proposals: Checking authentication...');
logger.warn('Guest Proposals: User not authenticated, redirecting to home');
```

**Testing:**
- [ ] Verify proposals page loads for guests
- [ ] Test auth redirect for non-guests
- [ ] Verify proposal data displays correctly

~~~~~

### CHUNK 12: Implement TODO - cancel API call in ProposalCard
**File:** app/src/islands/pages/proposals/ProposalCard.jsx
**Line:** 1025
**Issue:** TODO comment indicates unimplemented cancel functionality
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
// TODO: Implement actual cancel API call here
```

**Refactored Code:**
```javascript
// Import the cancel workflow
import { executeDeleteProposal } from '../../../logic/workflows/proposals/cancelProposalWorkflow.js';

// In the handler:
const handleCancel = async (proposalId, reason) => {
  try {
    await executeDeleteProposal(proposalId, reason);
    // Refresh proposal list or update local state
    onProposalCancelled?.(proposalId);
  } catch (error) {
    logger.error('Failed to cancel proposal:', error);
    showToast('Failed to cancel proposal', 'error');
  }
};
```

**Testing:**
- [ ] Test cancel button triggers API call
- [ ] Verify proposal status updates after cancel
- [ ] Check cancel reason is stored

~~~~~

## PAGE GROUP: /host-proposals (Chunks: 13, 14, 15)

~~~~~

### CHUNK 13: Remove debug console.logs from useHostProposalsPageLogic
**File:** app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
**Line:** Multiple (31+ occurrences)
**Issue:** 31+ console.log statements for host proposal debugging
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
console.log('🔐 Host Proposals: Checking authentication...');
console.log('✅ Host Proposals: User authenticated as Host');
console.log('📋 Host Proposals: Loading proposals for host:', hostId);
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

logger.debug('Host Proposals: Checking authentication...');
logger.debug('Host Proposals: User authenticated as Host');
```

**Testing:**
- [ ] Verify proposals page loads for hosts
- [ ] Test proposal actions (accept, reject, counteroffer)
- [ ] Verify proposal data displays correctly

~~~~~

### CHUNK 14: Implement TODO - Navigate to messaging
**File:** app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
**Line:** 686
**Issue:** TODO for messaging navigation not implemented
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// TODO: Navigate to messaging or open message modal
```

**Refactored Code:**
```javascript
import { navigateToMessaging } from '../../../logic/workflows/proposals/navigationWorkflow.js';

const handleMessageGuest = (proposal) => {
  navigateToMessaging(proposal, 'host');
};
```

**Testing:**
- [ ] Test message button navigates to messaging
- [ ] Verify correct thread is opened

~~~~~

### CHUNK 15: Implement TODO - Send rental app request notification
**File:** app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
**Line:** 777
**Issue:** TODO for rental application notification not implemented
**Affected Pages:** /host-proposals

**Current Code:**
```javascript
// TODO: Call API to send rental app request notification to guest
```

**Refactored Code:**
```javascript
const requestRentalApplication = async (proposalId, guestId) => {
  try {
    const { data, error } = await supabase.functions.invoke('proposal', {
      body: {
        action: 'request_rental_application',
        payload: { proposalId, guestId }
      }
    });

    if (error) throw error;
    showToast('Rental application request sent', 'success');
  } catch (error) {
    logger.error('Failed to send rental app request:', error);
    showToast('Failed to send request', 'error');
  }
};
```

**Testing:**
- [ ] Test rental app request button
- [ ] Verify notification is sent to guest
- [ ] Check proposal state updates

~~~~~

## PAGE GROUP: /host-overview (Chunks: 16, 17)

~~~~~

### CHUNK 16: Remove debug console.logs from useHostOverviewPageLogic
**File:** app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js
**Line:** Multiple (22+ occurrences)
**Issue:** 22+ console.log statements for host dashboard debugging
**Affected Pages:** /host-overview

**Current Code:**
```javascript
console.log('🏠 Host Overview: Loading dashboard data...');
console.log('✅ Host Overview: Dashboard loaded successfully');
console.log('📊 Host Overview: Earnings:', earnings);
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

logger.debug('Host Overview: Loading dashboard data...');
logger.debug('Host Overview: Dashboard loaded successfully');
```

**Testing:**
- [ ] Verify dashboard loads correctly
- [ ] Test earnings display
- [ ] Verify listing cards display

~~~~~

### CHUNK 17: Implement TODO - Open visits modal/virtual meeting
**File:** app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js
**Line:** 754, 759
**Issue:** TODOs for visits and virtual meeting navigation not implemented
**Affected Pages:** /host-overview

**Current Code:**
```javascript
// TODO: Open visits modal or navigate to visits page
// TODO: Navigate to virtual meeting page or open modal
```

**Refactored Code:**
```javascript
const handleViewVisits = () => {
  // Navigate to visits section in host proposals
  window.location.href = '/host-proposals?tab=visits';
};

const handleViewVirtualMeetings = () => {
  // Navigate to virtual meetings section
  window.location.href = '/host-proposals?tab=virtual-meetings';
};
```

**Testing:**
- [ ] Test visits card navigation
- [ ] Test virtual meetings card navigation
- [ ] Verify correct tabs are selected

~~~~~

## PAGE GROUP: /self-listing-v2 (Chunks: 18, 19)

~~~~~

### CHUNK 18: Remove debug console.logs from SelfListingPageV2
**File:** app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx
**Line:** Multiple (20+ occurrences)
**Issue:** 20+ console.log statements for listing creation debugging
**Affected Pages:** /self-listing-v2

**Current Code:**
```javascript
console.log('📝 Self Listing V2: Initializing form...');
console.log('✅ Self Listing V2: Form saved to draft');
console.log('📤 Self Listing V2: Submitting listing...');
```

**Refactored Code:**
```typescript
import { logger } from '../../../lib/logger.js';

logger.debug('Self Listing V2: Initializing form...');
logger.debug('Self Listing V2: Form saved to draft');
```

**Testing:**
- [ ] Verify listing form loads correctly
- [ ] Test draft save functionality
- [ ] Verify listing submission works

~~~~~

### CHUNK 19: Implement TODO - Send SMS with continue link
**File:** app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx
**Line:** 2098
**Issue:** TODO for SMS send not implemented
**Affected Pages:** /self-listing-v2

**Current Code:**
```typescript
// TODO: Call edge function to send SMS with continueOnPhoneLink
```

**Refactored Code:**
```typescript
const sendContinueOnPhoneSMS = async (phoneNumber: string, listingId: string) => {
  try {
    const continueLink = `${window.location.origin}/self-listing-v2?continue=${listingId}`;

    const { data, error } = await supabase.functions.invoke('notifications', {
      body: {
        action: 'send_sms',
        payload: {
          to: phoneNumber,
          message: `Continue creating your listing on your phone: ${continueLink}`
        }
      }
    });

    if (error) throw error;
    showToast('Link sent to your phone', 'success');
  } catch (error) {
    logger.error('Failed to send SMS:', error);
    showToast('Failed to send link', 'error');
  }
};
```

**Testing:**
- [ ] Test continue on phone button
- [ ] Verify SMS is received
- [ ] Test link opens correct listing draft

~~~~~

## PAGE GROUP: /account-profile (Chunks: 20, 21, 22)

~~~~~

### CHUNK 20: Remove debug console.logs from useAccountProfilePageLogic
**File:** app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js
**Line:** Multiple (23+ occurrences)
**Issue:** 23+ console.log statements for profile page debugging
**Affected Pages:** /account-profile

**Current Code:**
```javascript
console.log('👤 Account Profile: Loading user data...');
console.log('✅ Account Profile: User data loaded');
console.log('📸 Account Profile: Uploading photo...');
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

logger.debug('Account Profile: Loading user data...');
logger.debug('Account Profile: User data loaded');
```

**Testing:**
- [ ] Verify profile page loads correctly
- [ ] Test profile photo upload
- [ ] Verify profile updates save

~~~~~

### CHUNK 21: Implement TODO - Cover photo upload
**File:** app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js
**Line:** 906
**Issue:** TODO for cover photo upload not implemented
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// TODO: Implement cover photo upload
```

**Refactored Code:**
```javascript
const uploadCoverPhoto = async (file) => {
  try {
    setUploadingCover(true);

    // Upload to Supabase storage
    const fileName = `cover-${userId}-${Date.now()}.${file.type.split('/')[1]}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    // Update user profile
    const { error: updateError } = await supabase
      .from('user')
      .update({ cover_photo_url: publicUrl })
      .eq('_id', userId);

    if (updateError) throw updateError;

    setCoverPhotoUrl(publicUrl);
    showToast('Cover photo updated', 'success');
  } catch (error) {
    logger.error('Failed to upload cover photo:', error);
    showToast('Failed to upload cover photo', 'error');
  } finally {
    setUploadingCover(false);
  }
};
```

**Testing:**
- [ ] Test cover photo upload button
- [ ] Verify photo displays after upload
- [ ] Test photo replacement

~~~~~

### CHUNK 22: Implement TODO - Referral invite flow
**File:** app/src/islands/pages/AccountProfilePage/components/ReferralBanner.jsx
**Line:** 38
**Issue:** TODO for referral flow not implemented
**Affected Pages:** /account-profile

**Current Code:**
```javascript
// TODO(human): Implement referral invite flow
```

**Refactored Code:**
```javascript
const handleInviteFriend = () => {
  // Generate referral link
  const referralLink = `${window.location.origin}/referral?ref=${userId}`;

  // Open share modal or copy to clipboard
  if (navigator.share) {
    navigator.share({
      title: 'Join Split Lease',
      text: 'Check out Split Lease for flexible NYC rentals!',
      url: referralLink
    });
  } else {
    navigator.clipboard.writeText(referralLink);
    showToast('Referral link copied!', 'success');
  }
};
```

**Testing:**
- [ ] Test invite button click
- [ ] Verify referral link is correct
- [ ] Test share functionality on mobile

~~~~~

## PAGE GROUP: /favorite-listings (Chunks: 23, 24)

~~~~~

### CHUNK 23: Remove debug console.logs from FavoriteListingsPage
**File:** app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx
**Line:** Multiple (30+ occurrences)
**Issue:** 30+ console.log statements for favorites page debugging
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
console.log('❤️ Favorites: Loading favorite listings...');
console.log('✅ Favorites: Listings loaded:', favorites.length);
console.log('🗑️ Favorites: Removing listing:', listingId);
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

logger.debug('Favorites: Loading favorite listings...');
logger.debug('Favorites: Listings loaded:', favorites.length);
```

**Testing:**
- [ ] Verify favorites page loads correctly
- [ ] Test add/remove favorite
- [ ] Verify listing cards display

~~~~~

### CHUNK 24: Remove debug console.logs from favoritesApi.js
**File:** app/src/islands/pages/FavoriteListingsPage/favoritesApi.js
**Line:** Multiple (13+ occurrences)
**Issue:** 13+ console.log statements for API debugging
**Affected Pages:** /favorite-listings

**Current Code:**
```javascript
console.log('📡 Favorites API: Fetching favorites for user:', userId);
console.log('✅ Favorites API: Favorites fetched successfully');
console.log('❌ Favorites API: Error fetching favorites:', error);
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

logger.debug('Favorites API: Fetching favorites for user:', userId);
logger.debug('Favorites API: Favorites fetched successfully');
logger.error('Favorites API: Error fetching favorites:', error);
```

**Testing:**
- [ ] Verify API calls work silently
- [ ] Test error handling

~~~~~

## PAGE GROUP: /messages (Chunks: 25, 26)

~~~~~

### CHUNK 25: Remove debug console.logs from useMessagingPageLogic
**File:** app/src/islands/pages/MessagingPage/useMessagingPageLogic.js
**Line:** Multiple (18+ occurrences)
**Issue:** 18+ console.log statements for messaging debugging
**Affected Pages:** /messages

**Current Code:**
```javascript
console.log('💬 Messaging: Loading threads...');
console.log('✅ Messaging: Threads loaded:', threads.length);
console.log('📤 Messaging: Sending message...');
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

logger.debug('Messaging: Loading threads...');
logger.debug('Messaging: Threads loaded:', threads.length);
```

**Testing:**
- [ ] Verify messaging page loads
- [ ] Test message send/receive
- [ ] Verify real-time updates work

~~~~~

### CHUNK 26: Implement TODO - Unread count
**File:** app/src/islands/pages/MessagingPage/useMessagingPageLogic.js
**Line:** 473
**Issue:** TODO for unread count not implemented
**Affected Pages:** /messages

**Current Code:**
```javascript
unread_count: 0, // TODO: Implement unread count if needed
```

**Refactored Code:**
```javascript
// Calculate unread count from messages:
const calculateUnreadCount = (thread, currentUserId) => {
  return thread.messages?.filter(
    msg => !msg.read && msg.sender_id !== currentUserId
  ).length || 0;
};

// In thread mapping:
unread_count: calculateUnreadCount(thread, currentUserId),
```

**Testing:**
- [ ] Verify unread counts display
- [ ] Test count updates on new message
- [ ] Verify count clears when thread opened

~~~~~

## PAGE GROUP: Shared Workflows (Chunks: 27, 28)

~~~~~

### CHUNK 27: Remove debug console.logs from counterofferWorkflow
**File:** app/src/logic/workflows/proposals/counterofferWorkflow.js
**Line:** 34, 52, 67, 71, 91, 113
**Issue:** 6+ console.log statements in business logic
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
console.log('[counterofferWorkflow] Accepting counteroffer for proposal:', proposalId);
console.log('[counterofferWorkflow] Counteroffer accepted successfully:', proposalId);
console.log('[counterofferWorkflow] Declining counteroffer for proposal:', proposalId);
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

logger.debug('[counterofferWorkflow] Accepting counteroffer for proposal:', proposalId);
logger.debug('[counterofferWorkflow] Counteroffer accepted successfully:', proposalId);
```

**Testing:**
- [ ] Test counteroffer accept flow
- [ ] Test counteroffer decline flow
- [ ] Verify proposal state updates

~~~~~

### CHUNK 28: Remove debug console.logs from virtualMeetingWorkflow
**File:** app/src/logic/workflows/proposals/virtualMeetingWorkflow.js
**Line:** Multiple (14+ occurrences)
**Issue:** 14+ console.log statements in workflow
**Affected Pages:** /guest-proposals, /host-proposals

**Current Code:**
```javascript
console.log('[virtualMeetingWorkflow] Scheduling virtual meeting...');
console.log('[virtualMeetingWorkflow] Meeting scheduled:', meetingId);
console.log('[virtualMeetingWorkflow] Cancelling meeting:', meetingId);
```

**Refactored Code:**
```javascript
import { logger } from '../../../lib/logger.js';

logger.debug('[virtualMeetingWorkflow] Scheduling virtual meeting...');
logger.debug('[virtualMeetingWorkflow] Meeting scheduled:', meetingId);
```

**Testing:**
- [ ] Test virtual meeting scheduling
- [ ] Test meeting cancellation
- [ ] Verify meeting status updates

~~~~~

---

## Summary by Priority

### High Priority (Performance Impact)
1. **CHUNK 6**: Create centralized logger utility (enables all other changes)
2. **CHUNK 8**: Remove inline JSX console.log (renders every frame)
3. **CHUNK 7**: ViewSplitLeasePage console.logs (51+ statements)
4. **CHUNK 1-5**: Global shared components (affect ALL pages)

### Medium Priority (Code Quality)
5. **CHUNK 9-11**: Search and proposals pages console.logs
6. **CHUNK 13, 16, 18, 20, 23, 25**: Other page-specific console.logs
7. **CHUNK 27-28**: Workflow console.logs

### Low Priority (Feature Completion)
8. **CHUNK 12, 14-15, 17, 19, 21-22, 26**: TODO implementations

---

## Implementation Order

1. **Phase 1**: Create logger utility (CHUNK 6)
2. **Phase 2**: Update all shared components/utilities (CHUNKS 1-5)
3. **Phase 3**: Update page-specific code (CHUNKS 7-28)
4. **Phase 4**: Implement TODO items as separate feature tasks

---

## Files Referenced

- app/src/lib/logger.js (enhance)
- app/src/lib/dataLookups.js
- app/src/lib/auth/tokenValidation.js
- app/src/lib/auth/login.js
- app/src/islands/shared/SignUpLoginModal.jsx
- app/src/islands/shared/Header.jsx
- app/src/islands/pages/ViewSplitLeasePage/ViewSplitLeasePage.jsx
- app/src/islands/pages/SearchPage.jsx
- app/src/islands/pages/useSearchPageLogic.js
- app/src/islands/pages/proposals/useGuestProposalsPageLogic.js
- app/src/islands/pages/proposals/ProposalCard.jsx
- app/src/islands/pages/HostProposalsPage/useHostProposalsPageLogic.js
- app/src/islands/pages/HostOverviewPage/useHostOverviewPageLogic.js
- app/src/islands/pages/SelfListingPageV2/SelfListingPageV2.tsx
- app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js
- app/src/islands/pages/AccountProfilePage/components/ReferralBanner.jsx
- app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx
- app/src/islands/pages/FavoriteListingsPage/favoritesApi.js
- app/src/islands/pages/MessagingPage/useMessagingPageLogic.js
- app/src/logic/workflows/proposals/counterofferWorkflow.js
- app/src/logic/workflows/proposals/virtualMeetingWorkflow.js
