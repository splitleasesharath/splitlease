# Code Refactoring Plan - Split Lease Application Audit

**Generated**: 2026-01-17 16:42:33
**Scope**: `app/src/**/*`
**Type**: Performance, Maintainability, Duplication, Anti-patterns

---

## Executive Summary

This audit identifies **18 refactoring chunks** across the application, grouped by the pages they affect. Each chunk represents an atomic fix that can be applied independently.

### Issue Categories Found:
- **Performance**: Unnecessary re-renders, missing memoization, inefficient data structures
- **Maintainability**: Duplicated auth initialization logic, scattered state management
- **Duplication**: Repeated optimistic auth patterns across multiple components
- **Anti-patterns**: Inline function definitions in JSX, mixed concerns in utility modules

---

## PAGE GROUP: SearchPage

### Chunk 1: Extract Inline ListingsGrid Component

**File**: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 163-248
**Issue Type**: Performance / Maintainability
**Severity**: Medium
**Affected Pages**: SearchPage

**Problem**: The `ListingsGrid` component is defined inline within `SearchPage.jsx`, which means it gets redefined on every parent render and cannot be properly memoized by React.

~~~~~

**Current Code**:
```jsx
// Lines 163-248
function ListingsGrid({
  listings,
  mapRef,
  onCardLeave,
  onOpenContactModal,
  onOpenInfoModal,
  isLoggedIn,
  userId,
  onToggleFavorite,
  onRequireAuth,
  showCreateProposalButton,
  onOpenCreateProposalModal,
  favoritedListingIds,
  proposalsByListingId,
  selectedNightsCount,
  hasMore,
  sentinelRef
}) {
  return (
    <div className="listings-container">
      {listings.map((listing, index) => {
        const listingId = listing.id || listing._id;
        const isFavorited = favoritedListingIds?.has(listingId);
        const proposalForListing = proposalsByListingId?.get(listingId) || null;
        return (
          <PropertyCard
            key={listing.id}
            listing={listing}
            onLocationClick={(listing) => {
              if (mapRef.current) {
                mapRef.current.zoomToListing(listing.id);
              }
            }}
            onCardHover={(listing) => {
              if (mapRef.current) {
                mapRef.current.highlightListing(listing.id);
              }
            }}
            // ... rest of props
          />
        );
      })}
      {/* sentinel element */}
    </div>
  );
}
```

**Refactored Code**:
```jsx
// Extract to: app/src/islands/shared/ListingsGrid.jsx
import { memo, useCallback } from 'react';
import PropertyCard from './PropertyCard.jsx';

const ListingsGrid = memo(function ListingsGrid({
  listings,
  mapRef,
  onCardLeave,
  onOpenContactModal,
  onOpenInfoModal,
  isLoggedIn,
  userId,
  onToggleFavorite,
  onRequireAuth,
  showCreateProposalButton,
  onOpenCreateProposalModal,
  favoritedListingIds,
  proposalsByListingId,
  selectedNightsCount,
  hasMore,
  sentinelRef
}) {
  const handleLocationClick = useCallback((listing) => {
    if (mapRef.current) {
      mapRef.current.zoomToListing(listing.id);
    }
  }, [mapRef]);

  const handleCardHover = useCallback((listing) => {
    if (mapRef.current) {
      mapRef.current.highlightListing(listing.id);
    }
  }, [mapRef]);

  return (
    <div className="listings-container">
      {listings.map((listing) => {
        const listingId = listing.id || listing._id;
        return (
          <PropertyCard
            key={listingId}
            listing={listing}
            onLocationClick={handleLocationClick}
            onCardHover={handleCardHover}
            onCardLeave={onCardLeave}
            onOpenContactModal={onOpenContactModal}
            onOpenInfoModal={onOpenInfoModal}
            isLoggedIn={isLoggedIn}
            isFavorited={favoritedListingIds?.has(listingId)}
            userId={userId}
            onToggleFavorite={onToggleFavorite}
            onRequireAuth={onRequireAuth}
            showCreateProposalButton={showCreateProposalButton}
            onOpenCreateProposalModal={onOpenCreateProposalModal}
            proposalForListing={proposalsByListingId?.get(listingId) || null}
            selectedNightsCount={selectedNightsCount}
            variant="search"
          />
        );
      })}
      {hasMore && (
        <div ref={sentinelRef} className="lazy-load-sentinel">
          <div className="loading-more">
            <div className="spinner"></div>
            <span>Loading more listings...</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default ListingsGrid;
```

~~~~~

### Chunk 2: Extract Inline LoadingState/ErrorState/EmptyState Components

**File**: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 250-308
**Issue Type**: Maintainability / Duplication
**Severity**: Low
**Affected Pages**: SearchPage, potentially other pages using similar patterns

**Problem**: Simple presentational components (`LoadingState`, `ErrorState`, `EmptyState`) are defined inline and could be reused across multiple pages.

~~~~~

**Current Code**:
```jsx
// Lines 250-308
function LoadingState() {
  return (
    <div className="loading-skeleton active">
      {[1, 2].map(i => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-line" style={{ width: '60%' }}></div>
            <div className="skeleton-line" style={{ width: '80%' }}></div>
            <div className="skeleton-line" style={{ width: '40%' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="error-message">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <h3>Unable to Load Listings</h3>
      <p>{message || 'Failed to load listings. Please try again.'}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ onResetFilters }) {
  return (
    <div className="no-results-notice">
      {/* ... */}
    </div>
  );
}
```

**Refactored Code**:
```jsx
// Extract to: app/src/islands/shared/FeedbackStates.jsx
import { memo } from 'react';

export const LoadingState = memo(function LoadingState({ count = 2 }) {
  return (
    <div className="loading-skeleton active">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-image"></div>
          <div className="skeleton-content">
            <div className="skeleton-line" style={{ width: '60%' }}></div>
            <div className="skeleton-line" style={{ width: '80%' }}></div>
            <div className="skeleton-line" style={{ width: '40%' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
});

export const ErrorState = memo(function ErrorState({
  message = 'Failed to load. Please try again.',
  title = 'Unable to Load',
  onRetry
}) {
  return (
    <div className="error-message">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="retry-btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
});

export const EmptyState = memo(function EmptyState({
  title = 'No Results Found',
  message = 'No items match your current filters. Try adjusting your selection.',
  actionLabel = 'Reset Filters',
  onAction
}) {
  return (
    <div className="no-results-notice">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <h3>{title}</h3>
      <p>{message}</p>
      {onAction && (
        <button className="reset-filters-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
});
```

~~~~~

### Chunk 3: Consolidate Duplicated Optimistic Auth Pattern

**File**: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 377-397
**Issue Type**: Duplication
**Severity**: High
**Affected Pages**: SearchPage, Header, ViewSplitLeasePage, GuestProposalsPage (and others)

**Problem**: The optimistic auth initialization pattern is duplicated across multiple page components. This pattern reads cached auth data from localStorage to prevent UI flicker.

~~~~~

**Current Code**:
```jsx
// Lines 377-397 in SearchPage.jsx
// Auth state - Initialize with cached data for optimistic UI (prevents flash of logged-out state)
const cachedFirstName = getFirstName();
const cachedAvatarUrl = getAvatarUrl();
const cachedUserType = getStoredUserType();
const hasCachedAuth = !!(cachedFirstName && getAuthState());

const [isLoggedIn, setIsLoggedIn] = useState(hasCachedAuth);
const [currentUser, setCurrentUser] = useState(() => {
  if (hasCachedAuth) {
    return {
      id: getUserId(),
      name: cachedFirstName,
      email: '',
      userType: cachedUserType || 'GUEST',
      avatarUrl: cachedAvatarUrl || null,
      proposalCount: 0,
      _isOptimistic: true // Flag to indicate this is optimistic data
    };
  }
  return null;
});
```

**Refactored Code**:
```jsx
// Extract to: app/src/hooks/useOptimisticAuth.js
import { useState, useMemo } from 'react';
import { getFirstName, getAvatarUrl, getAuthState, getUserId } from '../lib/secureStorage.js';
import { getUserType as getStoredUserType } from '../lib/secureStorage.js';

/**
 * Hook to initialize auth state optimistically from localStorage cache.
 * Prevents flash of logged-out state on page load.
 *
 * @returns {object} { isLoggedIn, currentUser, setIsLoggedIn, setCurrentUser, hasCachedAuth }
 */
export function useOptimisticAuth() {
  const cachedAuth = useMemo(() => {
    const firstName = getFirstName();
    const avatarUrl = getAvatarUrl();
    const userType = getStoredUserType();
    const hasCached = !!(firstName && getAuthState());

    return {
      firstName,
      avatarUrl,
      userType,
      hasCached,
      userId: hasCached ? getUserId() : null
    };
  }, []);

  const [isLoggedIn, setIsLoggedIn] = useState(cachedAuth.hasCached);
  const [currentUser, setCurrentUser] = useState(() => {
    if (cachedAuth.hasCached) {
      return {
        id: cachedAuth.userId,
        name: cachedAuth.firstName,
        email: '',
        userType: cachedAuth.userType || 'GUEST',
        avatarUrl: cachedAuth.avatarUrl || null,
        proposalCount: 0,
        _isOptimistic: true
      };
    }
    return null;
  });

  return {
    isLoggedIn,
    setIsLoggedIn,
    currentUser,
    setCurrentUser,
    hasCachedAuth: cachedAuth.hasCached
  };
}

// Usage in SearchPage.jsx:
// const { isLoggedIn, setIsLoggedIn, currentUser, setCurrentUser, hasCachedAuth } = useOptimisticAuth();
```

~~~~~

### Chunk 4: Memoize activeFilterTags Calculation

**File**: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 472-537
**Issue Type**: Performance
**Severity**: Low
**Affected Pages**: SearchPage

**Problem**: The `activeFilterTags` useMemo has correct dependencies but creates new objects on each calculation. The objects inside the array have inline `onRemove` functions that create new references.

~~~~~

**Current Code**:
```jsx
// Lines 472-537
const activeFilterTags = useMemo(() => {
  const tags = [];

  if (selectedBorough && selectedBorough !== 'all' && selectedBorough !== '') {
    const boroughName = boroughs.find(b => b.value === selectedBorough)?.name;
    if (boroughName && boroughName !== 'All Boroughs') {
      tags.push({
        id: 'borough',
        icon: 'map-pin',
        label: boroughName,
        onRemove: () => setSelectedBorough('all')  // New function on each render
      });
    }
  }
  // ... similar for other filters
  return tags;
}, [selectedBorough, selectedNeighborhoods, priceTier, weekPattern, boroughs, neighborhoods]);
```

**Refactored Code**:
```jsx
// Create stable callback references outside useMemo
const handleRemoveBorough = useCallback(() => setSelectedBorough('all'), []);
const handleRemoveNeighborhoods = useCallback(() => setSelectedNeighborhoods([]), []);
const handleRemovePrice = useCallback(() => setPriceTier('all'), []);
const handleRemoveWeekPattern = useCallback(() => setWeekPattern('every-week'), []);

const activeFilterTags = useMemo(() => {
  const tags = [];

  if (selectedBorough && selectedBorough !== 'all' && selectedBorough !== '') {
    const boroughName = boroughs.find(b => b.value === selectedBorough)?.name;
    if (boroughName && boroughName !== 'All Boroughs') {
      tags.push({
        id: 'borough',
        icon: 'map-pin',
        label: boroughName,
        onRemove: handleRemoveBorough  // Stable reference
      });
    }
  }

  if (selectedNeighborhoods.length > 0) {
    const neighborhoodNames = selectedNeighborhoods
      .map(id => neighborhoods.find(n => n.id === id)?.name)
      .filter(Boolean)
      .slice(0, 2);
    const label = neighborhoodNames.length > 2
      ? `${neighborhoodNames.join(', ')} +${selectedNeighborhoods.length - 2}`
      : neighborhoodNames.join(', ');
    tags.push({
      id: 'neighborhoods',
      icon: 'map-pin',
      label: label || `${selectedNeighborhoods.length} neighborhoods`,
      onRemove: handleRemoveNeighborhoods  // Stable reference
    });
  }

  if (priceTier && priceTier !== 'all') {
    const priceLabels = {
      'under-200': 'Under $200',
      '200-350': '$200-$350',
      '350-500': '$350-$500',
      '500-plus': '$500+'
    };
    tags.push({
      id: 'price',
      icon: 'dollar-sign',
      label: priceLabels[priceTier] || priceTier,
      onRemove: handleRemovePrice  // Stable reference
    });
  }

  if (weekPattern && weekPattern !== 'every-week') {
    const patternLabels = {
      'one-on-off': 'Every other week',
      'two-on-off': '2 weeks on/off',
      'one-three-off': '1 on, 3 off'
    };
    tags.push({
      id: 'weekPattern',
      icon: 'repeat',
      label: patternLabels[weekPattern] || weekPattern,
      onRemove: handleRemoveWeekPattern  // Stable reference
    });
  }

  return tags;
}, [
  selectedBorough, selectedNeighborhoods, priceTier, weekPattern,
  boroughs, neighborhoods,
  handleRemoveBorough, handleRemoveNeighborhoods, handleRemovePrice, handleRemoveWeekPattern
]);
```

~~~~~

---

## PAGE GROUP: Header (Shared Component - Affects All Pages)

### Chunk 5: Extract Auth Validation Logic from Header

**File**: `app/src/islands/shared/Header.jsx`
**Lines**: 57-184
**Issue Type**: Maintainability / Single Responsibility
**Severity**: High
**Affected Pages**: ALL pages (Header is global)

**Problem**: The Header component contains ~130 lines of auth validation logic in a useEffect. This logic should be extracted into a dedicated hook for reuse and testability.

~~~~~

**Current Code**:
```jsx
// Lines 57-184 (abbreviated)
useEffect(() => {
  const token = getAuthToken();

  const performBackgroundValidation = async () => {
    let hasSupabaseSession = false;
    let session = null;
    try {
      const { data } = await supabase.auth.getSession();
      session = data?.session;
      hasSupabaseSession = !!session;

      if (!hasSupabaseSession) {
        console.log('[Header] No immediate Supabase session, waiting briefly for initialization...');
        await new Promise(resolve => setTimeout(resolve, 200));
        const { data: retryData } = await supabase.auth.getSession();
        // ... retry logic
      }
    } catch (err) {
      console.log('[Header] Error checking Supabase session:', err.message);
    }

    // ... 100+ more lines of validation logic
  };

  if (document.readyState === 'complete') {
    performBackgroundValidation();
  } else {
    window.addEventListener('load', performBackgroundValidation, { once: true });
  }
}, [autoShowLogin, hasCachedAuth]);
```

**Refactored Code**:
```jsx
// Extract to: app/src/hooks/useAuthValidation.js
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';
import {
  getAuthToken,
  validateTokenAndFetchUser,
  isProtectedPage,
  checkUrlForAuthError
} from '../lib/auth.js';
import { getStoredUserType, getUserId } from '../lib/secureStorage.js';

/**
 * Hook to handle background auth validation after page load.
 * Validates cached auth state against server and updates UI accordingly.
 *
 * @param {object} options
 * @param {boolean} options.autoShowLogin - Show login modal on protected pages
 * @param {boolean} options.hasCachedAuth - Whether we have cached auth data
 * @param {function} options.onUserValidated - Callback when user is validated
 * @param {function} options.onAuthFailed - Callback when auth validation fails
 */
export function useAuthValidation({
  autoShowLogin = false,
  hasCachedAuth = false,
  onUserValidated,
  onAuthFailed
}) {
  const [authChecked, setAuthChecked] = useState(hasCachedAuth);
  const validationRunRef = useRef(false);

  useEffect(() => {
    if (validationRunRef.current) return;

    const performValidation = async () => {
      validationRunRef.current = true;
      const token = getAuthToken();

      // Check for Supabase session
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session;

        if (!session) {
          await new Promise(resolve => setTimeout(resolve, 200));
          const { data: retryData } = await supabase.auth.getSession();
          session = retryData?.session;
        }
      } catch (err) {
        console.log('[useAuthValidation] Session check error:', err.message);
      }

      const hasSupabaseSession = !!session;

      if (!token && !hasSupabaseSession && !hasCachedAuth) {
        setAuthChecked(true);
        onAuthFailed?.();
        return;
      }

      try {
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          onUserValidated?.(userData, getStoredUserType());
        } else if (hasSupabaseSession && session?.user) {
          // Fallback to session data
          const bubbleUserId = session.user.user_metadata?.user_id || getUserId() || session.user.id;
          onUserValidated?.({
            userId: bubbleUserId,
            id: bubbleUserId,
            firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email,
            userType: session.user.user_metadata?.user_type || null,
            _isFromSession: true
          }, session.user.user_metadata?.user_type);
        } else {
          handleAuthFailure(autoShowLogin, onAuthFailed);
        }
      } catch (error) {
        console.error('[useAuthValidation] Validation error:', error);
        if (!hasSupabaseSession) {
          onAuthFailed?.();
        }
      }

      setAuthChecked(true);
    };

    if (document.readyState === 'complete') {
      performValidation();
    } else {
      window.addEventListener('load', performValidation, { once: true });
    }
  }, [autoShowLogin, hasCachedAuth, onUserValidated, onAuthFailed]);

  return { authChecked };
}

function handleAuthFailure(autoShowLogin, onAuthFailed) {
  onAuthFailed?.();

  if (isProtectedPage() && !autoShowLogin) {
    const authError = checkUrlForAuthError();
    if (!authError) {
      window.location.replace('/');
    }
  }
}
```

~~~~~

### Chunk 6: Consolidate Auth State Change Listener

**File**: `app/src/islands/shared/Header.jsx`
**Lines**: 190-262
**Issue Type**: Maintainability
**Severity**: Medium
**Affected Pages**: ALL pages

**Problem**: The Supabase `onAuthStateChange` listener in Header is complex and handles multiple concerns. It should be extracted into the auth validation hook.

~~~~~

**Current Code**:
```jsx
// Lines 190-262
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Header] Auth state changed:', event);

    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
      if (signInHandledRef.current) {
        console.log('[Header] Sign-in already handled, skipping duplicate event:', event);
        return;
      }
      signInHandledRef.current = true;

      console.log('[Header] User signed in, deferring UI update to avoid deadlock...');
      setTimeout(async () => {
        try {
          console.log('[Header] Now updating UI...');
          const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
          if (userData) {
            setCurrentUser(userData);
            setUserType(getStoredUserType());
            setAuthChecked(true);
            console.log('[Header] UI updated for:', userData.firstName);
          } else {
            // ... fallback logic
          }
        } catch (error) {
          console.error('[Header] Error updating user data after sign in:', error);
        }
      }, 0);
    } else if (event === 'SIGNED_OUT') {
      signInHandledRef.current = false;
      console.log('[Header] User signed out, reloading page...');
      if (isProtectedPage()) {
        window.location.href = '/';
      } else {
        window.location.reload();
      }
    }
  });

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

**Refactored Code**:
```jsx
// Add to: app/src/hooks/useAuthValidation.js

/**
 * Hook to listen for Supabase auth state changes.
 * Handles SIGNED_IN, INITIAL_SESSION, and SIGNED_OUT events.
 */
export function useAuthStateListener({ onSignedIn, onSignedOut }) {
  const signInHandledRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        if (signInHandledRef.current) return;
        signInHandledRef.current = true;

        // Defer to avoid deadlock with setSession()
        setTimeout(async () => {
          try {
            const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
            onSignedIn?.(userData, session);
          } catch (error) {
            console.error('[useAuthStateListener] Sign-in error:', error);
          }
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        signInHandledRef.current = false;
        onSignedOut?.();
      }
    });

    return () => subscription.unsubscribe();
  }, [onSignedIn, onSignedOut]);
}

// Usage in Header.jsx:
const handleSignedIn = useCallback((userData, session) => {
  if (userData) {
    setCurrentUser(userData);
    setUserType(getStoredUserType());
    setAuthChecked(true);
  } else if (session?.user) {
    // Fallback to session data
    const bubbleUserId = session.user.user_metadata?.user_id || getUserId() || session.user.id;
    setCurrentUser({
      userId: bubbleUserId,
      id: bubbleUserId,
      firstName: session.user.user_metadata?.first_name || session.user.email?.split('@')[0] || 'User',
      email: session.user.email,
      userType: session.user.user_metadata?.user_type || null,
      _isFromSession: true
    });
    setAuthChecked(true);
  }
}, []);

const handleSignedOut = useCallback(() => {
  if (isProtectedPage()) {
    window.location.href = '/';
  } else {
    window.location.reload();
  }
}, []);

useAuthStateListener({ onSignedIn: handleSignedIn, onSignedOut: handleSignedOut });
```

~~~~~

---

## PAGE GROUP: Auth Module (lib/auth.js - Affects All Pages)

### Chunk 7: Split OAuth Functions into Separate Module

**File**: `app/src/lib/auth.js`
**Lines**: 1389-1977
**Issue Type**: Maintainability / File Size
**Severity**: Medium
**Affected Pages**: ALL pages with OAuth login

**Problem**: The `auth.js` file is ~1980 lines with ~600 lines dedicated to OAuth functions (LinkedIn and Google). This makes the file difficult to navigate and maintain.

~~~~~

**Current Code**:
```javascript
// auth.js Lines 1389-1977 contain:
// - initiateLinkedInOAuth()
// - handleLinkedInOAuthCallback()
// - initiateLinkedInOAuthLogin()
// - handleLinkedInOAuthLoginCallback()
// - initiateGoogleOAuth()
// - handleGoogleOAuthCallback()
// - initiateGoogleOAuthLogin()
// - handleGoogleOAuthLoginCallback()
```

**Refactored Code**:
```javascript
// Extract to: app/src/lib/oauthProviders.js

import { supabase } from './supabase.js';
import { logger } from './logger.js';
import {
  setLinkedInOAuthUserType,
  getLinkedInOAuthUserType,
  clearLinkedInOAuthUserType,
  setLinkedInOAuthLoginFlow,
  getLinkedInOAuthLoginFlow,
  clearLinkedInOAuthLoginFlow,
  setGoogleOAuthUserType,
  getGoogleOAuthUserType,
  clearGoogleOAuthUserType,
  setGoogleOAuthLoginFlow,
  getGoogleOAuthLoginFlow,
  clearGoogleOAuthLoginFlow
} from './secureStorage.js';
import { setAuthToken, setSessionId, setAuthState, setUserType } from './auth.js';

// ============================================================================
// LinkedIn OAuth Functions
// ============================================================================

export async function initiateLinkedInOAuth(userType) { /* ... */ }
export async function handleLinkedInOAuthCallback() { /* ... */ }
export async function initiateLinkedInOAuthLogin() { /* ... */ }
export async function handleLinkedInOAuthLoginCallback() { /* ... */ }

// ============================================================================
// Google OAuth Functions
// ============================================================================

export async function initiateGoogleOAuth(userType) { /* ... */ }
export async function handleGoogleOAuthCallback() { /* ... */ }
export async function initiateGoogleOAuthLogin() { /* ... */ }
export async function handleGoogleOAuthLoginCallback() { /* ... */ }

// Re-export from auth.js for backwards compatibility:
// export * from './oauthProviders.js';
```

~~~~~

### Chunk 8: Remove Duplicated Session Verification Logic

**File**: `app/src/lib/auth.js`
**Lines**: 567-585 and 790-808
**Issue Type**: Duplication
**Severity**: Medium
**Affected Pages**: Login and Signup flows

**Problem**: The session verification logic (waiting for session to persist) is duplicated between `loginUser()` and `signupUser()`.

~~~~~

**Current Code**:
```javascript
// Lines 567-585 (in loginUser)
// CRITICAL: Verify the session is actually persisted before proceeding
let verifyAttempts = 0;
const maxVerifyAttempts = 5;
while (verifyAttempts < maxVerifyAttempts) {
  const { data: { session: verifiedSession } } = await supabase.auth.getSession();
  if (verifiedSession && verifiedSession.access_token === access_token) {
    logger.debug('✅ Session verified and persisted');
    break;
  }
  verifyAttempts++;
  logger.debug(`⏳ Waiting for session to persist (attempt ${verifyAttempts}/${maxVerifyAttempts})...`);
  await delay(100);
}

// Lines 790-808 (in signupUser) - IDENTICAL CODE
```

**Refactored Code**:
```javascript
// Add to: app/src/lib/auth.js (internal helper)

/**
 * Wait for Supabase session to be persisted to localStorage.
 * Fixes race condition where page reload happens before session is written.
 *
 * @param {string} expectedAccessToken - The access token to verify
 * @param {number} maxAttempts - Maximum verification attempts (default: 5)
 * @param {number} delayMs - Delay between attempts in ms (default: 100)
 * @returns {Promise<boolean>} True if verified, false if timeout
 */
async function verifySessionPersisted(expectedAccessToken, maxAttempts = 5, delayMs = 100) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.access_token === expectedAccessToken) {
      logger.debug('✅ Session verified and persisted');
      return true;
    }
    logger.debug(`⏳ Waiting for session to persist (attempt ${attempt}/${maxAttempts})...`);
    await delay(delayMs);
  }
  logger.warn('⚠️ Session may not be fully persisted, but continuing...');
  return false;
}

// Usage in loginUser():
if (access_token && refresh_token) {
  const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  if (sessionError) {
    logger.error('❌ Failed to set Supabase session:', sessionError.message);
  } else {
    logger.debug('✅ Supabase session set successfully');
  }
  await verifySessionPersisted(access_token);
}

// Same usage in signupUser()
```

~~~~~

---

## PAGE GROUP: Secure Storage Module

### Chunk 9: Add Type Safety to SecureStorage Functions

**File**: `app/src/lib/secureStorage.js`
**Lines**: 50-96
**Issue Type**: Maintainability / Type Safety
**Severity**: Low
**Affected Pages**: ALL pages using auth

**Problem**: The secureStorage functions don't validate input types, which could lead to silent failures or localStorage corruption.

~~~~~

**Current Code**:
```javascript
// Lines 50-96
export function setAuthToken(token) {
  if (!token) return;  // Silent failure for falsy values
  localStorage.setItem(SECURE_KEYS.AUTH_TOKEN, token);
}

export function setSessionId(sessionId) {
  if (!sessionId) return;  // Silent failure
  localStorage.setItem(SECURE_KEYS.SESSION_ID, sessionId);
}

export function setRefreshData(refreshData) {
  if (!refreshData) return;  // Silent failure
  localStorage.setItem(SECURE_KEYS.REFRESH_DATA, JSON.stringify(refreshData));
}
```

**Refactored Code**:
```javascript
// Lines 50-96 with validation

/**
 * Store authentication token
 * @param {string} token - Bearer token from API
 * @throws {Error} if token is not a non-empty string
 */
export function setAuthToken(token) {
  if (typeof token !== 'string' || token.trim() === '') {
    console.warn('[SecureStorage] setAuthToken called with invalid token:', typeof token);
    return;
  }
  localStorage.setItem(SECURE_KEYS.AUTH_TOKEN, token);
}

/**
 * Store session ID (user ID)
 * @param {string} sessionId - User ID from API
 * @throws {Error} if sessionId is not a non-empty string
 */
export function setSessionId(sessionId) {
  if (typeof sessionId !== 'string' || sessionId.trim() === '') {
    console.warn('[SecureStorage] setSessionId called with invalid sessionId:', typeof sessionId);
    return;
  }
  localStorage.setItem(SECURE_KEYS.SESSION_ID, sessionId);
}

/**
 * Store refresh token data
 * @param {object} refreshData - Refresh token and metadata
 * @throws {Error} if refreshData is not a valid object
 */
export function setRefreshData(refreshData) {
  if (!refreshData || typeof refreshData !== 'object') {
    console.warn('[SecureStorage] setRefreshData called with invalid data:', typeof refreshData);
    return;
  }
  try {
    localStorage.setItem(SECURE_KEYS.REFRESH_DATA, JSON.stringify(refreshData));
  } catch (error) {
    console.error('[SecureStorage] Failed to serialize refreshData:', error);
  }
}
```

~~~~~

---

## PAGE GROUP: Data Lookups Module

### Chunk 10: Add Error Handling for Uninitialized Lookups

**File**: `app/src/lib/dataLookups.js`
**Lines**: Throughout file
**Issue Type**: Maintainability / Error Handling
**Severity**: Medium
**Affected Pages**: SearchPage, ViewSplitLeasePage, any page using lookups

**Problem**: The lookup functions (e.g., `getNeighborhoodName()`, `getBoroughName()`) return `undefined` or default values silently when lookups aren't initialized, making debugging difficult.

~~~~~

**Current Code**:
```javascript
// Typical pattern in dataLookups.js
export function getNeighborhoodName(neighborhoodId) {
  if (!neighborhoodId) return null;
  return neighborhoodIdToName.get(neighborhoodId) || neighborhoodId;
}

export function getBoroughName(boroughValue) {
  if (!boroughValue) return null;
  return boroughValueToName.get(boroughValue.toLowerCase()) || boroughValue;
}
```

**Refactored Code**:
```javascript
// Add initialization check wrapper

let isLookupInitialized = false;

export async function initializeLookups() {
  // ... existing initialization code
  isLookupInitialized = true;
}

export function isInitialized() {
  return isLookupInitialized;
}

/**
 * Wrapper to check initialization before lookup operations
 * In development, warns if lookups are used before initialization
 */
function requireInitialized(functionName) {
  if (!isLookupInitialized && import.meta.env.DEV) {
    console.warn(`[dataLookups] ${functionName} called before initialization. Results may be incomplete.`);
  }
}

export function getNeighborhoodName(neighborhoodId) {
  requireInitialized('getNeighborhoodName');
  if (!neighborhoodId) return null;
  return neighborhoodIdToName.get(neighborhoodId) || neighborhoodId;
}

export function getBoroughName(boroughValue) {
  requireInitialized('getBoroughName');
  if (!boroughValue) return null;
  return boroughValueToName.get(boroughValue.toLowerCase()) || boroughValue;
}

// Similar pattern for other lookup functions
```

~~~~~

---

## PAGE GROUP: Constants Module

### Chunk 11: Remove Deprecated API Constants

**File**: `app/src/lib/constants.js`
**Lines**: 22-27
**Issue Type**: Maintainability / Dead Code
**Severity**: Low
**Affected Pages**: None (dead code)

**Problem**: The file contains deprecated API endpoint constants that are explicitly marked as "for reference only" but still exist in the codebase, potentially causing confusion.

~~~~~

**Current Code**:
```javascript
// Lines 22-27
// API Endpoints (DEPRECATED - Now proxied through Edge Functions)
// These constants are kept for reference only
// All API calls now route through Supabase Edge Functions
export const REFERRAL_API_ENDPOINT = 'https://app.split.lease/api/1.1/wf/referral-index-lite';
export const BUBBLE_MESSAGING_ENDPOINT = 'https://app.split.lease/api/1.1/wf/core-contact-host-send-message';
export const AI_SIGNUP_WORKFLOW_URL = 'https://app.split.lease/api/1.1/wf/ai-signup-guest';
```

**Refactored Code**:
```javascript
// Remove deprecated constants entirely or move to a separate file

// Option 1: Remove completely (RECOMMENDED)
// Delete lines 22-27

// Option 2: Move to a legacy constants file for reference
// Create: app/src/lib/constants.legacy.js
/**
 * DEPRECATED API Endpoints
 * Kept for historical reference only - DO NOT USE
 * All API calls now route through Supabase Edge Functions
 * @deprecated since migration to Edge Functions (2025)
 */
export const LEGACY_ENDPOINTS = {
  REFERRAL_API_ENDPOINT: 'https://app.split.lease/api/1.1/wf/referral-index-lite',
  BUBBLE_MESSAGING_ENDPOINT: 'https://app.split.lease/api/1.1/wf/core-contact-host-send-message',
  AI_SIGNUP_WORKFLOW_URL: 'https://app.split.lease/api/1.1/wf/ai-signup-guest'
};
```

~~~~~

---

## PAGE GROUP: Logic Layer

### Chunk 12: Standardize Calculator Function Signatures

**File**: Multiple files in `app/src/logic/calculators/`
**Lines**: Various
**Issue Type**: Maintainability / Consistency
**Severity**: Low
**Affected Pages**: SearchPage, ViewSplitLeasePage, ProposalPages

**Problem**: Calculator functions have inconsistent parameter naming (`nightsSelected` vs `nightsPerWeek` vs `frequency`).

~~~~~

**Current Code**:
```javascript
// getNightlyRateByFrequency.js
export function getNightlyRateByFrequency({ listing, nightsSelected }) { ... }

// calculateFourWeekRent.js
export function calculateFourWeekRent({ nightlyRate, frequency }) { ... }

// calculatePricingBreakdown.js
export function calculatePricingBreakdown({ listing, nightsPerWeek, reservationWeeks }) { ... }
```

**Refactored Code**:
```javascript
// Standardize on 'nightsPerWeek' across all pricing calculators

// getNightlyRateByFrequency.js
/**
 * @param {object} params
 * @param {object} params.listing - Listing with pricing fields
 * @param {number} params.nightsPerWeek - Nights per week (2-7)
 * @deprecated Use nightsPerWeek instead of nightsSelected
 */
export function getNightlyRateByFrequency({ listing, nightsPerWeek, nightsSelected }) {
  // Support both parameter names during migration
  const nights = nightsPerWeek ?? nightsSelected;
  if (nights === undefined) {
    throw new Error('getNightlyRateByFrequency: nightsPerWeek is required');
  }
  // ... rest of implementation
}

// calculateFourWeekRent.js
export function calculateFourWeekRent({ nightlyRate, nightsPerWeek, frequency }) {
  // Support both parameter names during migration
  const nights = nightsPerWeek ?? frequency;
  // ...
}
```

~~~~~

### Chunk 13: Extract Repeated Day Calculation Logic

**File**: `app/src/islands/pages/SearchPage.jsx`
**Lines**: 419-459
**Issue Type**: Duplication
**Severity**: Low
**Affected Pages**: SearchPage, other pages with day selection

**Problem**: Day parsing from URL parameters and day name calculations are done inline instead of using existing utility functions.

~~~~~

**Current Code**:
```jsx
// Lines 419-459
const [selectedDaysForDisplay, setSelectedDaysForDisplay] = useState(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const daysParam = urlParams.get('days-selected');
  if (daysParam) {
    return daysParam.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d) && d >= 0 && d <= 6);
  }
  return [1, 2, 3, 4, 5]; // Default: Mon-Fri
});

// ... useEffect to listen for URL changes with same parsing logic

const checkInOutDays = useMemo(() => {
  const result = calculateCheckInOutFromDays(selectedDaysForDisplay);
  if (!result) return { checkIn: '', checkOut: '' };
  return {
    checkIn: DAY_NAMES[result.checkIn],
    checkOut: DAY_NAMES[result.checkOut]
  };
}, [selectedDaysForDisplay]);
```

**Refactored Code**:
```javascript
// Add to: app/src/logic/calculators/scheduling/parseDaysFromUrl.js

import { DAY_NAMES } from '../../../lib/constants.js';
import { calculateCheckInOutFromDays } from './calculateCheckInOutFromDays.js';

/**
 * Parse selected days from URL search parameters.
 *
 * @param {URLSearchParams|string} searchParams - URL search params or query string
 * @param {string} paramName - Parameter name (default: 'days-selected')
 * @param {number[]} defaultDays - Default days if param not found (default: Mon-Fri)
 * @returns {number[]} Array of valid day indices (0-6)
 */
export function parseDaysFromUrl(searchParams, paramName = 'days-selected', defaultDays = [1, 2, 3, 4, 5]) {
  const params = typeof searchParams === 'string'
    ? new URLSearchParams(searchParams)
    : searchParams;

  const daysParam = params.get(paramName);

  if (!daysParam) return defaultDays;

  const days = daysParam
    .split(',')
    .map(d => parseInt(d.trim(), 10))
    .filter(d => !isNaN(d) && d >= 0 && d <= 6);

  return days.length > 0 ? days : defaultDays;
}

/**
 * Get check-in and check-out day names from selected days.
 *
 * @param {number[]} selectedDays - Array of selected day indices (0-6)
 * @returns {{ checkIn: string, checkOut: string }} Day names
 */
export function getCheckInOutDayNames(selectedDays) {
  const result = calculateCheckInOutFromDays(selectedDays);
  if (!result) return { checkIn: '', checkOut: '' };
  return {
    checkIn: DAY_NAMES[result.checkIn],
    checkOut: DAY_NAMES[result.checkOut]
  };
}

// Usage in SearchPage.jsx:
import { parseDaysFromUrl, getCheckInOutDayNames } from '../../logic/calculators/scheduling/parseDaysFromUrl.js';

const [selectedDaysForDisplay, setSelectedDaysForDisplay] = useState(() =>
  parseDaysFromUrl(window.location.search)
);

const checkInOutDays = useMemo(() =>
  getCheckInOutDayNames(selectedDaysForDisplay),
  [selectedDaysForDisplay]
);
```

~~~~~

---

## PAGE GROUP: Proposal Status Module

### Chunk 14: Add Exhaustive Status Type Checking

**File**: `app/src/logic/constants/proposalStatuses.js`
**Lines**: 240-267
**Issue Type**: Maintainability / Type Safety
**Severity**: Low
**Affected Pages**: GuestProposalsPage, HostProposalsPage, ViewSplitLeasePage

**Problem**: The `getStatusConfig()` function returns a generic fallback for unknown statuses without logging, making it hard to detect data issues.

~~~~~

**Current Code**:
```javascript
// Lines 240-267
export function getStatusConfig(statusKey) {
  if (!statusKey) {
    return {
      key: 'Unknown',
      color: 'gray',
      label: 'Unknown Status',
      stage: null,
      usualOrder: 0,
      actions: []
    };
  }

  const normalizedKey = normalizeStatusKey(statusKey);

  const config = Object.values(PROPOSAL_STATUSES).find(
    s => normalizeStatusKey(s.key) === normalizedKey
  );

  return config || {
    key: normalizedKey,
    color: 'gray',
    label: normalizedKey,
    stage: null,
    usualOrder: 0,
    actions: []
  };
}
```

**Refactored Code**:
```javascript
// Lines 240-267 with logging and validation

const unknownStatusesLogged = new Set();

export function getStatusConfig(statusKey) {
  if (!statusKey) {
    return {
      key: 'Unknown',
      color: 'gray',
      label: 'Unknown Status',
      stage: null,
      usualOrder: 0,
      actions: []
    };
  }

  const normalizedKey = normalizeStatusKey(statusKey);

  const config = Object.values(PROPOSAL_STATUSES).find(
    s => normalizeStatusKey(s.key) === normalizedKey
  );

  if (config) {
    return config;
  }

  // Log unknown status only once per unique key (prevents log spam)
  if (!unknownStatusesLogged.has(normalizedKey)) {
    unknownStatusesLogged.add(normalizedKey);
    console.warn(
      `[proposalStatuses] Unknown status encountered: "${normalizedKey}". ` +
      `Consider adding it to PROPOSAL_STATUSES configuration.`
    );
  }

  return {
    key: normalizedKey,
    color: 'gray',
    label: normalizedKey,
    stage: null,
    usualOrder: 0,
    actions: []
  };
}

/**
 * Check if a status key is a known status in the configuration.
 * Useful for validation and debugging.
 *
 * @param {string} statusKey - The status string to check
 * @returns {boolean} True if status is defined in PROPOSAL_STATUSES
 */
export function isKnownStatus(statusKey) {
  if (!statusKey) return false;
  const normalizedKey = normalizeStatusKey(statusKey);
  return Object.values(PROPOSAL_STATUSES).some(
    s => normalizeStatusKey(s.key) === normalizedKey
  );
}
```

~~~~~

---

## PAGE GROUP: Supabase Module

### Chunk 15: Remove Side Effect from Module Import

**File**: `app/src/lib/supabase.js`
**Lines**: 12-24
**Issue Type**: Anti-pattern
**Severity**: Medium
**Affected Pages**: ALL pages

**Problem**: The module has a side effect (OAuth callback processing) that runs on import. This makes the module harder to test and can cause unexpected behavior.

~~~~~

**Current Code**:
```javascript
// Lines 12-24
// Process any pending OAuth login callback immediately
// This runs when the supabase module is first imported (early in app lifecycle)
import('./oauthCallbackHandler.js').then(({ processOAuthLoginCallback }) => {
  processOAuthLoginCallback().then(result => {
    if (result.processed) {
      console.log('[Supabase Init] OAuth callback processed:', result.success ? 'success' : 'failed');
    }
  }).catch(err => {
    console.error('[Supabase Init] OAuth callback error:', err);
  });
});
```

**Refactored Code**:
```javascript
// supabase.js - Remove side effect
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Move OAuth callback processing to explicit initialization
// This should be called by the app entry point, not on module import

/**
 * Initialize OAuth callback processing.
 * Call this from your app's entry point after the Supabase client is ready.
 */
export async function initializeOAuthCallbackProcessing() {
  try {
    const { processOAuthLoginCallback } = await import('./oauthCallbackHandler.js');
    const result = await processOAuthLoginCallback();
    if (result.processed) {
      console.log('[Supabase] OAuth callback processed:', result.success ? 'success' : 'failed');
    }
    return result;
  } catch (err) {
    console.error('[Supabase] OAuth callback error:', err);
    return { processed: false, error: err };
  }
}

// In app entry points (e.g., SearchPage.jsx, index.jsx):
// import { supabase, initializeOAuthCallbackProcessing } from '../lib/supabase.js';
//
// useEffect(() => {
//   initializeOAuthCallbackProcessing();
// }, []);
```

~~~~~

---

## PAGE GROUP: Workflows

### Chunk 16: Standardize Workflow Return Types

**File**: `app/src/logic/workflows/auth/checkAuthStatusWorkflow.js`
**Lines**: 29-77
**Issue Type**: Maintainability / Consistency
**Severity**: Low
**Affected Pages**: ALL pages using auth workflows

**Problem**: Workflow functions throw errors for invalid inputs instead of returning error results, which is inconsistent with other workflows.

~~~~~

**Current Code**:
```javascript
// Lines 29-77
export function checkAuthStatusWorkflow({
  splitLeaseCookies,
  authState,
  hasValidTokens
}) {
  // No Fallback: Validate inputs
  if (!splitLeaseCookies || typeof splitLeaseCookies !== 'object') {
    throw new Error(
      'checkAuthStatusWorkflow: splitLeaseCookies is required'
    )
  }

  if (typeof authState !== 'boolean') {
    throw new Error(
      'checkAuthStatusWorkflow: authState must be a boolean'
    )
  }

  if (typeof hasValidTokens !== 'boolean') {
    throw new Error(
      'checkAuthStatusWorkflow: hasValidTokens must be a boolean'
    )
  }
  // ...
}
```

**Refactored Code**:
```javascript
// Two approaches - choose based on project convention:

// Approach 1: Keep throwing but with consistent error structure (RECOMMENDED for this project)
// The "No Fallback" pattern is a deliberate design choice mentioned in CLAUDE.md

export function checkAuthStatusWorkflow({
  splitLeaseCookies,
  authState,
  hasValidTokens
}) {
  // Input validation with consistent error format
  const errors = [];

  if (!splitLeaseCookies || typeof splitLeaseCookies !== 'object') {
    errors.push('splitLeaseCookies must be a valid object');
  }
  if (typeof authState !== 'boolean') {
    errors.push('authState must be a boolean');
  }
  if (typeof hasValidTokens !== 'boolean') {
    errors.push('hasValidTokens must be a boolean');
  }

  if (errors.length > 0) {
    throw new Error(`checkAuthStatusWorkflow: ${errors.join('; ')}`);
  }

  // ... rest of implementation
}

// Approach 2: Return Result type (if migrating to functional pattern)
// This aligns with the "functional-code" skill mentioned in CLAUDE.md

/**
 * @typedef {Object} AuthResult
 * @property {boolean} success
 * @property {Object|null} data
 * @property {string|null} error
 */

export function checkAuthStatusWorkflow({
  splitLeaseCookies,
  authState,
  hasValidTokens
}) {
  // Validate inputs
  if (!splitLeaseCookies || typeof splitLeaseCookies !== 'object') {
    return { success: false, data: null, error: 'splitLeaseCookies is required' };
  }
  if (typeof authState !== 'boolean') {
    return { success: false, data: null, error: 'authState must be a boolean' };
  }
  if (typeof hasValidTokens !== 'boolean') {
    return { success: false, data: null, error: 'hasValidTokens must be a boolean' };
  }

  // Priority 1: Check Split Lease cookies
  if (splitLeaseCookies.isLoggedIn) {
    return {
      success: true,
      data: { isAuthenticated: true, source: 'cookies', username: splitLeaseCookies.username },
      error: null
    };
  }

  // Priority 2: Check secure storage
  if (authState && hasValidTokens) {
    return {
      success: true,
      data: { isAuthenticated: true, source: 'secure_storage', username: null },
      error: null
    };
  }

  return {
    success: true,
    data: { isAuthenticated: false, source: null, username: null },
    error: null
  };
}
```

~~~~~

---

## PAGE GROUP: Schedule Selector Components

### Chunk 17: Consolidate Duplicate Schedule Selector Versions

**File**: `app/src/islands/shared/ListingScheduleSelector.jsx` and `ListingScheduleSelectorV2.jsx`
**Lines**: Entire files
**Issue Type**: Duplication / Maintainability
**Severity**: Medium
**Affected Pages**: ViewSplitLeasePage, CreateProposalFlow

**Problem**: Two versions of the same component exist (`ListingScheduleSelector.jsx` and `ListingScheduleSelectorV2.jsx`), indicating incomplete migration.

~~~~~

**Current Code**:
```
app/src/islands/shared/
├── ListingScheduleSelector.jsx    # Original version
└── ListingScheduleSelectorV2.jsx  # New version (migration incomplete?)
```

**Refactored Code**:
```
# Option 1: Complete migration and remove V1
# 1. Audit all imports to find which version is used where
# 2. Update all imports to use V2
# 3. Delete V1 or rename V2 to replace V1

# Search for usage:
grep -r "ListingScheduleSelector" app/src --include="*.jsx" --include="*.js"

# Option 2: If V2 is a breaking change, deprecate V1
# Add deprecation notice to V1:

// ListingScheduleSelector.jsx
/**
 * @deprecated Use ListingScheduleSelectorV2 instead.
 * This component will be removed in the next major version.
 *
 * Migration guide:
 * - Props remain the same
 * - Event handlers now receive (days, moveInDate) instead of (event)
 */
import ListingScheduleSelectorV2 from './ListingScheduleSelectorV2.jsx';

export default function ListingScheduleSelector(props) {
  if (import.meta.env.DEV) {
    console.warn(
      '[DEPRECATED] ListingScheduleSelector is deprecated. ' +
      'Use ListingScheduleSelectorV2 instead.'
    );
  }
  return <ListingScheduleSelectorV2 {...props} />;
}
```

~~~~~

---

## PAGE GROUP: General Codebase

### Chunk 18: Add ESLint Rule for Inline Component Definitions

**File**: `app/eslint.config.js`
**Lines**: N/A (new rule)
**Issue Type**: Maintainability
**Severity**: Low
**Affected Pages**: ALL pages

**Problem**: Inline component definitions in JSX files cause performance issues and are hard to catch during code review. An ESLint rule can prevent this pattern.

~~~~~

**Current Code**:
```javascript
// eslint.config.js - doesn't have a rule for inline components
```

**Refactored Code**:
```javascript
// Add to eslint.config.js rules section

// Option 1: Use existing eslint-plugin-react rule
{
  rules: {
    // ... existing rules
    'react/no-unstable-nested-components': ['warn', { allowAsProps: true }],
  }
}

// Option 2: Custom rule configuration for stricter enforcement
{
  rules: {
    // Warn about functions defined inside render
    'react/no-unstable-nested-components': ['error', {
      allowAsProps: false
    }],

    // Encourage extracting large objects/arrays to useMemo
    // (This would require a custom rule or plugin)
  }
}
```

~~~~~

---

## Implementation Priority

### High Priority (Do First)
1. **Chunk 3**: Consolidate duplicated optimistic auth pattern (affects many pages)
2. **Chunk 5**: Extract auth validation logic from Header (improves maintainability)
3. **Chunk 8**: Remove duplicated session verification logic (DRY)
4. **Chunk 15**: Remove side effect from supabase module import (anti-pattern)

### Medium Priority
5. **Chunk 1**: Extract inline ListingsGrid component (performance)
6. **Chunk 6**: Consolidate auth state change listener (maintainability)
7. **Chunk 7**: Split OAuth functions into separate module (file size)
8. **Chunk 10**: Add error handling for uninitialized lookups (debugging)
9. **Chunk 17**: Consolidate duplicate schedule selector versions (duplication)

### Low Priority (Nice to Have)
10. **Chunk 2**: Extract LoadingState/ErrorState/EmptyState components
11. **Chunk 4**: Memoize activeFilterTags calculation
12. **Chunk 9**: Add type safety to SecureStorage functions
13. **Chunk 11**: Remove deprecated API constants
14. **Chunk 12**: Standardize calculator function signatures
15. **Chunk 13**: Extract repeated day calculation logic
16. **Chunk 14**: Add exhaustive status type checking
17. **Chunk 16**: Standardize workflow return types
18. **Chunk 18**: Add ESLint rule for inline component definitions

---

## Files Referenced

### Pages Affected
- `app/src/islands/pages/SearchPage.jsx`
- `app/src/islands/pages/ViewSplitLeasePage.jsx`
- `app/src/islands/pages/GuestProposalsPage.jsx`
- `app/src/islands/pages/HostProposalsPage.jsx`

### Shared Components Affected
- `app/src/islands/shared/Header.jsx`
- `app/src/islands/shared/ListingScheduleSelector.jsx`
- `app/src/islands/shared/ListingScheduleSelectorV2.jsx`

### Lib Modules Affected
- `app/src/lib/auth.js`
- `app/src/lib/secureStorage.js`
- `app/src/lib/supabase.js`
- `app/src/lib/dataLookups.js`
- `app/src/lib/constants.js`

### Logic Layer Affected
- `app/src/logic/constants/proposalStatuses.js`
- `app/src/logic/workflows/auth/checkAuthStatusWorkflow.js`
- `app/src/logic/calculators/pricing/calculatePricingBreakdown.js`
- `app/src/logic/calculators/pricing/getNightlyRateByFrequency.js`
- `app/src/logic/calculators/pricing/calculateFourWeekRent.js`

### Configuration Files
- `app/eslint.config.js`

---

## Dependency Graph Context

The following files have the highest reverse dependency counts (most files depend on them):
1. `lib/auth.js` - Core authentication utilities
2. `lib/constants.js` - Application constants
3. `lib/secureStorage.js` - Token storage
4. `lib/supabase.js` - Supabase client
5. `lib/dataLookups.js` - Cached data lookups
6. `islands/shared/Header.jsx` - Global navigation

Changes to these files have the widest impact and should be carefully tested.
