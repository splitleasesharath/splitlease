# Split Lease Authentication System - Complete Technical Documentation

**Version:** 2.0 (Refactored November 2025)
**Last Updated:** 2025-11-21
**Status:** Production

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Storage Layer](#storage-layer)
4. [Authentication Flow](#authentication-flow)
5. [Logged-In State Management](#logged-in-state-management)
6. [Pages Using Authentication](#pages-using-authentication)
7. [API Endpoints](#api-endpoints)
8. [Field Mappings](#field-mappings)
9. [Security Model](#security-model)
10. [Recreation Guide](#recreation-guide)
11. [Troubleshooting](#troubleshooting)

---

## System Overview

The Split Lease authentication system is a **hybrid token-based authentication** system that integrates:

- **Bubble.io Backend:** Handles user authentication, token generation, and validation
- **Supabase Database:** Stores user profile data
- **sessionStorage:** Stores sensitive tokens (cleared on tab close)
- **localStorage:** Stores non-sensitive public state (persists across sessions)

### Key Design Principles

1. **No Fallback Mechanisms:** Token validation happens through Bubble API - no artificial expiry or client-side validation
2. **Separation of Concerns:** Tokens in sessionStorage, state in localStorage
3. **Bubble-Managed Expiry:** Trust Bubble's token expiry, validate on each API request
4. **Public State Pattern:** Only expose non-sensitive identifiers to the application

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER LOGIN/SIGNUP                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    BUBBLE.IO API ENDPOINTS                           │
│  • POST /api/1.1/wf/login-user       (Login)                        │
│  • POST /api/1.1/wf/signup-user      (Signup)                       │
│  • GET  /api/1.1/obj/user/:id        (Validate Token)               │
│  • POST /api/1.1/wf/logout-user      (Logout)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                   Returns: {token, user_id}
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SECURE STORAGE LAYER                            │
│  app/src/lib/secureStorage.js                                       │
├─────────────────────────────────────────────────────────────────────┤
│  sessionStorage (Cleared on tab close):                             │
│    • __sl_at__    → Auth token (Bearer token)                       │
│    • __sl_sid__   → Session ID (user_id from Bubble)                │
│    • __sl_rd__    → Refresh token data (future use)                 │
│                                                                      │
│  localStorage (Persists across sessions):                           │
│    • sl_auth_state      → Boolean: 'true' or 'false'                │
│    • sl_user_id         → User ID (public, non-sensitive)           │
│    • sl_user_type       → 'Host' or 'Guest'                         │
│    • sl_last_activity   → Timestamp (for UI staleness checks)       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTH MODULE (auth.js)                           │
│  Validates token → Fetches user data from Supabase                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SUPABASE DATABASE                               │
│  SELECT * FROM user WHERE _id = 'user_id'                           │
│  Returns: {_id, "Name - First", "Name - Full",                      │
│           "Profile Photo", "Type - User Current"}                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION STATE                                 │
│  Header.jsx maintains currentUser state:                            │
│    {                                                                 │
│      userId: string,                                                 │
│      firstName: string | null,                                       │
│      fullName: string | null,                                        │
│      profilePhoto: string | null,                                    │
│      userType: 'Host' | 'Guest'                                      │
│    }                                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Storage Layer

### File: `app/src/lib/secureStorage.js`

This module manages all storage operations for authentication.

#### **Secure Keys (sessionStorage)**

```javascript
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',     // Bearer token from Bubble
  SESSION_ID: '__sl_sid__',    // user_id from Bubble
  REFRESH_DATA: '__sl_rd__',   // Refresh token (future use)
};
```

**Why sessionStorage?**
- Cleared when browser tab closes
- Not accessible across tabs (better security)
- Industry standard (GitHub, Google, etc.)

#### **Public State Keys (localStorage)**

```javascript
const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',     // Boolean: 'true' | 'false'
  USER_ID: 'sl_user_id',                 // User ID (non-sensitive)
  USER_TYPE: 'sl_user_type',             // 'Host' | 'Guest'
  LAST_ACTIVITY: 'sl_last_activity',     // Timestamp in ms
  SESSION_VALID: 'sl_session_valid'      // Boolean: 'true' | 'false'
};
```

**Why localStorage?**
- Persists across browser sessions
- Allows quick auth state checks without token decryption
- Contains only non-sensitive identifiers

#### **Key Functions**

```javascript
// Token Management (sessionStorage)
setAuthToken(token: string): void
getAuthToken(): string | null
setSessionId(sessionId: string): void
getSessionId(): string | null

// State Management (localStorage)
setAuthState(isAuthenticated: boolean, userId?: string): void
getAuthState(): boolean
getUserId(): string | null
setUserType(userType: 'Host' | 'Guest'): void
getUserType(): string | null

// Housekeeping
updateLastActivity(): void
clearAllAuthData(): void
hasValidTokens(): Promise<boolean>
migrateFromLegacyStorage(): Promise<boolean>
```

---

## Authentication Flow

### File: `app/src/lib/auth.js`

This module orchestrates authentication operations.

### 1. **Login Flow** (`loginUser()`)

```javascript
// Function: loginUser(email: string, password: string)
// Location: app/src/lib/auth.js:419-483

STEP 1: POST to Bubble Login Endpoint
  URL: https://upgradefromstr.bubbleapps.io/api/1.1/wf/login-user
  Headers:
    - Content-Type: application/json
    - Authorization: Bearer ${VITE_BUBBLE_API_KEY}
  Body:
    {
      "email": "user@example.com",
      "password": "userpassword"
    }

STEP 2: Bubble Response (on success)
  {
    "status": "success",
    "response": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user_id": "1586447992720x748691103167545300",
      "expires": 86400  // Seconds until token expires
    }
  }

STEP 3: Store Credentials
  await setAuthToken(data.response.token)
  await setSessionId(data.response.user_id)
  setAuthState(true, data.response.user_id)

STEP 4: Update Internal State
  isUserLoggedInState = true

STEP 5: Return to Caller
  return {
    success: true,
    user_id: data.response.user_id,
    expires: data.response.expires
  }
```

**Exact Variable Names to Use:**
- `data.response.token` → Store in `__sl_at__`
- `data.response.user_id` → Store in `__sl_sid__` AND `sl_user_id`
- `data.response.expires` → Return to caller (informational only)

### 2. **Signup Flow** (`signupUser()`)

```javascript
// Function: signupUser(email: string, password: string, retype: string)
// Location: app/src/lib/auth.js:495-593

STEP 1: Validate Passwords Match
  if (password !== retype) {
    return { success: false, error: 'Passwords do not match' }
  }

STEP 2: POST to Bubble Signup Endpoint
  URL: https://upgradefromstr.bubbleapps.io/api/1.1/wf/signup-user
  Headers: (same as login)
  Body:
    {
      "email": "newuser@example.com",
      "password": "newpassword",
      "retype": "newpassword"
    }

STEP 3-5: Same as Login Flow
```

### 3. **Token Validation Flow** (`validateTokenAndFetchUser()`)

```javascript
// Function: validateTokenAndFetchUser()
// Location: app/src/lib/auth.js:604-697

STEP 1: Retrieve Stored Credentials
  const token = await getAuthToken()
  const userId = await getSessionId()

  if (!token || !userId) {
    return null  // Not logged in
  }

STEP 2: Validate Token via Bubble API
  GET https://upgradefromstr.bubbleapps.io/api/1.1/obj/user/${userId}
  Headers:
    - Authorization: Bearer ${token}

  If response.ok:
    Token is valid ✓
  Else:
    Token is invalid - clear auth data
    return null

STEP 3: Update Last Activity
  updateLastActivity()

STEP 4: Fetch User Data from Supabase
  const { data: userData } = await supabase
    .from('user')
    .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current"')
    .eq('_id', userId)
    .single()

STEP 5: Process Profile Photo URL
  let profilePhoto = userData['Profile Photo']
  if (profilePhoto && profilePhoto.startsWith('//')) {
    profilePhoto = 'https:' + profilePhoto
  }

STEP 6: Cache User Type
  let userType = getUserType()
  if (!userType) {
    userType = userData['Type - User Current']
    setUserType(userType)
  }

STEP 7: Construct User Object
  return {
    userId: userData._id,
    firstName: userData['Name - First'] || null,
    fullName: userData['Name - Full'] || null,
    profilePhoto: profilePhoto || null,
    userType: userType
  }
```

**Critical Field Mappings:**
- Bubble's `user_id` → Supabase's `_id`
- Supabase's `"Name - First"` → User object's `firstName`
- Supabase's `"Name - Full"` → User object's `fullName`
- Supabase's `"Profile Photo"` → User object's `profilePhoto`
- Supabase's `"Type - User Current"` → User object's `userType`

### 4. **Logout Flow** (`logoutUser()`)

```javascript
// Function: logoutUser()
// Location: app/src/lib/auth.js:715-751

STEP 1: Get Token
  const token = await getAuthToken()

STEP 2: Call Bubble Logout Endpoint (optional)
  POST https://upgradefromstr.bubbleapps.io/api/1.1/wf/logout-user
  Headers:
    - Authorization: Bearer ${token}

STEP 3: Clear All Local Data
  clearAllAuthData()  // Clears sessionStorage + localStorage

STEP 4: Update State
  isUserLoggedInState = false

STEP 5: Redirect to Home
  window.location.replace('/')
```

---

## Logged-In State Management

### File: `app/src/islands/shared/Header.jsx`

The Header component is the **single source of truth** for authentication state across the application.

### State Variables

```javascript
// User Authentication State
const [currentUser, setCurrentUser] = useState(null)
const [authChecked, setAuthChecked] = useState(false)
const [userType, setUserType] = useState(null)

// Modal State
const [showLoginModal, setShowLoginModal] = useState(autoShowLogin)
const [showSignupModal, setShowSignupModal] = useState(false)
```

### Authentication Check Flow

```javascript
// Location: Header.jsx:33-84

useEffect(() => {
  const validateAuth = async () => {
    // STEP 1: Quick check - do we even have a token?
    const token = await getAuthToken()
    if (!token) {
      console.log('[Header] No token found - skipping validation')
      setAuthChecked(true)
      return
    }

    // STEP 2: Wait for page to fully load before validating
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        performAuthValidation()
      })
    } else {
      performAuthValidation()
    }
  }

  const performAuthValidation = async () => {
    try {
      // STEP 3: Validate token and fetch user data
      const userData = await validateTokenAndFetchUser()

      if (userData) {
        // Token valid - set user state
        setCurrentUser(userData)
      } else {
        // Token invalid - clear state
        setCurrentUser(null)

        // STEP 4: Handle protected pages
        if (isProtectedPage() && !autoShowLogin) {
          window.location.replace('/')  // Redirect to home
        } else if (isProtectedPage() && autoShowLogin) {
          // Show auth modal instead of redirecting
        }
      }
    } catch (error) {
      console.error('Auth validation error:', error)
      setCurrentUser(null)
    } finally {
      setAuthChecked(true)
    }
  }

  validateAuth()
}, [])
```

### Conditional Rendering

```javascript
// Show loading state while checking auth
if (!authChecked) {
  return <div>Loading...</div>
}

// Conditionally render based on auth state
{currentUser ? (
  <>
    {/* Logged-in UI */}
    <a href={`/account-profile/${currentUser.userId}`}>
      <img src={currentUser.profilePhoto} alt="Profile" />
      <span>{currentUser.firstName}</span>
    </a>
    <button onClick={handleLogout}>Log Out</button>
  </>
) : (
  <>
    {/* Logged-out UI */}
    <button onClick={() => setShowLoginModal(true)}>Sign In</button>
    <button onClick={() => setShowSignupModal(true)}>Sign Up</button>
  </>
)}
```

### How Pages Access Auth State

**Option 1: Via Header Component (Recommended)**

All pages that include `<Header />` automatically have access to auth state through the Header's internal management.

**Option 2: Direct Check**

```javascript
import { validateTokenAndFetchUser } from '../lib/auth.js'

const [user, setUser] = useState(null)

useEffect(() => {
  const checkAuth = async () => {
    const userData = await validateTokenAndFetchUser()
    if (userData) {
      setUser(userData)
    }
  }
  checkAuth()
}, [])
```

---

## Pages Using Authentication

### Protected Pages (Require Login)

These pages automatically redirect to home if user is not authenticated:

1. **Account Profile** (`/account-profile/:userId`)
   - File: `app/public/account-profile.html`
   - Island: `app/src/account-profile.jsx`
   - Uses: `validateTokenAndFetchUser()` via Header
   - Auto-shows: Login modal if not authenticated (`autoShowLogin={true}`)

2. **Guest Proposals** (`/guest-proposals.html`)
   - File: `app/public/guest-proposals.html`
   - Island: `app/src/guest-proposals.jsx`
   - Uses: `validateTokenAndFetchUser()` directly in `GuestProposalsPage.jsx`
   - Redirects: To home if not authenticated

### Pages with Optional Authentication

These pages work for both logged-in and logged-out users:

1. **Home Page** (`/`)
   - File: `app/public/index.html`
   - Island: `app/src/islands/pages/HomePage.jsx`
   - Auth: Via Header component
   - Behavior: Shows different UI based on auth state

2. **Search Page** (`/search.html`)
   - File: `app/public/search.html`
   - Island: `app/src/islands/pages/SearchPage.jsx`
   - Auth: Via Header component
   - Behavior: Can browse listings without login

3. **View Listing** (`/view-split-lease`)
   - File: `app/public/view-split-lease.html`
   - Island: `app/src/islands/pages/ViewSplitLeasePage.jsx`
   - Auth: Via Header component
   - Behavior: Requires login for "Contact Host" actions

### Pages Without Authentication

These pages do not require or check authentication:

- FAQ (`/faq.html`)
- Policies (`/policies.html`)
- Careers (`/careers.html`)
- Why Split Lease (`/why-split-lease.html`)
- List With Us (`/list-with-us.html`)
- Success pages (`/guest-success.html`, `/host-success.html`)

### Protected Page Detection

```javascript
// Function: isProtectedPage()
// Location: app/src/lib/auth.js:699-713

export function isProtectedPage() {
  const protectedPaths = [
    '/account-profile',
    '/guest-proposals',
    '/host-dashboard',
    '/messages',
    '/bookings'
  ]

  const currentPath = window.location.pathname
  return protectedPaths.some(path => currentPath.includes(path))
}
```

---

## API Endpoints

### Bubble.io Workflow Endpoints

All endpoints require the `VITE_BUBBLE_API_KEY` environment variable.

**Base URL:** `https://upgradefromstr.bubbleapps.io`

| Endpoint | Method | Purpose | Headers | Body |
|----------|--------|---------|---------|------|
| `/api/1.1/wf/login-user` | POST | Authenticate user | `Authorization: Bearer ${API_KEY}`<br>`Content-Type: application/json` | `{email, password}` |
| `/api/1.1/wf/signup-user` | POST | Create new user | Same as above | `{email, password, retype}` |
| `/api/1.1/obj/user/:id` | GET | Validate token | `Authorization: Bearer ${token}` | None |
| `/api/1.1/wf/logout-user` | POST | Invalidate token | `Authorization: Bearer ${token}` | None |

### Supabase Database Queries

**Table:** `user`
**Primary Key:** `_id` (text)

```sql
-- Fetch user data by ID
SELECT
  _id,
  "Name - First",
  "Name - Full",
  "Profile Photo",
  "Type - User Current"
FROM user
WHERE _id = '1586447992720x748691103167545300'
LIMIT 1;
```

**JavaScript (via Supabase client):**

```javascript
const { data, error } = await supabase
  .from('user')
  .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current"')
  .eq('_id', userId)
  .single()
```

---

## Field Mappings

### Bubble API → Storage

| Bubble API Field | Storage Location | Storage Key | Type |
|------------------|------------------|-------------|------|
| `response.token` | sessionStorage | `__sl_at__` | string |
| `response.user_id` | sessionStorage | `__sl_sid__` | string |
| `response.user_id` | localStorage | `sl_user_id` | string |
| `response.expires` | _(not stored)_ | _(informational)_ | number |

### Storage → Application State

| Storage Key | Variable Name | Type | Component |
|-------------|---------------|------|-----------|
| `__sl_at__` | `token` | string | auth.js |
| `__sl_sid__` | `userId` | string | auth.js |
| `sl_user_id` | `currentUser.userId` | string | Header.jsx |
| `sl_user_type` | `currentUser.userType` | string | Header.jsx |
| `sl_auth_state` | `isAuthenticated` | boolean | auth.js |

### Supabase → User Object

| Supabase Field | User Object Property | Type | Processing |
|----------------|---------------------|------|------------|
| `_id` | `userId` | string | Direct mapping |
| `"Name - First"` | `firstName` | string \| null | Direct mapping |
| `"Name - Full"` | `fullName` | string \| null | Direct mapping |
| `"Profile Photo"` | `profilePhoto` | string \| null | Add `https:` prefix if starts with `//` |
| `"Type - User Current"` | `userType` | string | Direct mapping, cached in localStorage |

**Complete User Object Structure:**

```typescript
interface CurrentUser {
  userId: string;                    // From Supabase._id
  firstName: string | null;          // From Supabase."Name - First"
  fullName: string | null;           // From Supabase."Name - Full"
  profilePhoto: string | null;       // From Supabase."Profile Photo" (processed)
  userType: 'Host' | 'Guest';        // From Supabase."Type - User Current"
}
```

---

## Security Model

### Token Security

1. **Storage:** Tokens stored in `sessionStorage` (cleared on tab close)
2. **Transmission:** All API calls use HTTPS
3. **Validation:** Token validated on every Bubble API request
4. **Expiry:** Managed by Bubble API (default 24 hours)
5. **Scope:** Tokens are origin-isolated by browser security model

### Why sessionStorage Over Encryption?

**Industry Standard Practice:**
- GitHub stores tokens in sessionStorage (not encrypted)
- Google stores OAuth tokens in sessionStorage
- AWS Console stores session tokens in sessionStorage

**Rationale:**
1. **XSS is the threat:** If attacker has XSS, they can:
   - Steal encrypted data AND encryption keys
   - Steal tokens before encryption
   - Make authenticated requests directly
2. **sessionStorage benefits:**
   - Cleared on tab close (limited exposure)
   - Origin-isolated (same-origin policy)
   - Faster (no encryption overhead)
3. **HTTPS:** All data encrypted in transit anyway

### Protection Against Common Attacks

| Attack Type | Protection Mechanism |
|-------------|---------------------|
| **XSS** | Content Security Policy, Input sanitization |
| **CSRF** | Origin checks, Same-origin policy |
| **Token Theft** | sessionStorage (cleared on tab close), HTTPS |
| **Replay Attacks** | Bubble manages token expiry |
| **Man-in-the-Middle** | HTTPS everywhere |

---

## Recreation Guide

### Prerequisites

1. **Environment Variables Required:**
   ```bash
   VITE_BUBBLE_API_KEY=your_bubble_api_key
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Bubble.io Configuration:**
   - Workflows: `login-user`, `signup-user`, `logout-user`
   - Data type: `user` with field `_id`

3. **Supabase Configuration:**
   - Table: `user`
   - Primary key: `_id` (text)
   - Required fields: `"Name - First"`, `"Name - Full"`, `"Profile Photo"`, `"Type - User Current"`

### Step-by-Step Implementation

#### **Step 1: Create Storage Module**

**File:** `app/src/lib/secureStorage.js`

```javascript
// Define storage keys
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',
  SESSION_ID: '__sl_sid__',
  REFRESH_DATA: '__sl_rd__',
};

const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',
  USER_ID: 'sl_user_id',
  USER_TYPE: 'sl_user_type',
  LAST_ACTIVITY: 'sl_last_activity',
  SESSION_VALID: 'sl_session_valid'
};

// Implement functions
export function setAuthToken(token) {
  if (!token) return;
  sessionStorage.setItem(SECURE_KEYS.AUTH_TOKEN, token);
}

export function getAuthToken() {
  return sessionStorage.getItem(SECURE_KEYS.AUTH_TOKEN);
}

export function setSessionId(sessionId) {
  if (!sessionId) return;
  sessionStorage.setItem(SECURE_KEYS.SESSION_ID, sessionId);
}

export function getSessionId() {
  return sessionStorage.getItem(SECURE_KEYS.SESSION_ID);
}

export function setAuthState(isAuthenticated, userId = null) {
  localStorage.setItem(STATE_KEYS.IS_AUTHENTICATED, isAuthenticated ? 'true' : 'false');
  localStorage.setItem(STATE_KEYS.LAST_ACTIVITY, Date.now().toString());
  if (userId) {
    localStorage.setItem(STATE_KEYS.USER_ID, userId);
  }
}

export function getAuthState() {
  return localStorage.getItem(STATE_KEYS.IS_AUTHENTICATED) === 'true';
}

export function getUserId() {
  return localStorage.getItem(STATE_KEYS.USER_ID);
}

export function setUserType(userType) {
  if (userType) {
    localStorage.setItem(STATE_KEYS.USER_TYPE, userType);
  }
}

export function getUserType() {
  return localStorage.getItem(STATE_KEYS.USER_TYPE);
}

export function updateLastActivity() {
  localStorage.setItem(STATE_KEYS.LAST_ACTIVITY, Date.now().toString());
}

export function clearAllAuthData() {
  // Clear sessionStorage
  sessionStorage.removeItem(SECURE_KEYS.AUTH_TOKEN);
  sessionStorage.removeItem(SECURE_KEYS.SESSION_ID);
  sessionStorage.removeItem(SECURE_KEYS.REFRESH_DATA);

  // Clear localStorage
  localStorage.removeItem(STATE_KEYS.IS_AUTHENTICATED);
  localStorage.removeItem(STATE_KEYS.USER_ID);
  localStorage.removeItem(STATE_KEYS.USER_TYPE);
  localStorage.removeItem(STATE_KEYS.LAST_ACTIVITY);
  localStorage.removeItem(STATE_KEYS.SESSION_VALID);
}
```

#### **Step 2: Create Authentication Module**

**File:** `app/src/lib/auth.js`

```javascript
import { supabase } from './supabase.js';
import {
  setAuthToken as setSecureAuthToken,
  getAuthToken as getSecureAuthToken,
  setSessionId as setSecureSessionId,
  getSessionId as getSecureSessionId,
  setAuthState,
  getAuthState,
  getUserId as getPublicUserId,
  setUserType as setSecureUserType,
  getUserType as getSecureUserType,
  updateLastActivity,
  clearAllAuthData,
} from './secureStorage.js';

// API Configuration
const BUBBLE_API_KEY = import.meta.env.VITE_BUBBLE_API_KEY;
const BUBBLE_LOGIN_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/login-user';
const BUBBLE_SIGNUP_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/wf/signup-user';
const BUBBLE_USER_ENDPOINT = 'https://upgradefromstr.bubbleapps.io/api/1.1/obj/user';

// Login User
export async function loginUser(email, password) {
  try {
    const response = await fetch(BUBBLE_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BUBBLE_API_KEY}`
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      // Store credentials
      await setSecureAuthToken(data.response.token);
      await setSecureSessionId(data.response.user_id);
      setAuthState(true, data.response.user_id);

      return {
        success: true,
        user_id: data.response.user_id,
        expires: data.response.expires
      };
    } else {
      return {
        success: false,
        error: data.message || 'Login failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error'
    };
  }
}

// Validate Token and Fetch User
export async function validateTokenAndFetchUser() {
  const token = await getSecureAuthToken();
  const userId = await getSecureSessionId();

  if (!token || !userId) {
    return null;
  }

  try {
    // Validate token via Bubble
    const response = await fetch(`${BUBBLE_USER_ENDPOINT}/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      clearAllAuthData();
      return null;
    }

    updateLastActivity();

    // Fetch user data from Supabase
    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current"')
      .eq('_id', userId)
      .single();

    if (userError || !userData) {
      clearAllAuthData();
      return null;
    }

    // Process profile photo
    let profilePhoto = userData['Profile Photo'];
    if (profilePhoto && profilePhoto.startsWith('//')) {
      profilePhoto = 'https:' + profilePhoto;
    }

    // Cache user type
    let userType = getSecureUserType();
    if (!userType) {
      userType = userData['Type - User Current'];
      setSecureUserType(userType);
    }

    return {
      userId: userData._id,
      firstName: userData['Name - First'] || null,
      fullName: userData['Name - Full'] || null,
      profilePhoto: profilePhoto || null,
      userType: userType
    };
  } catch (error) {
    clearAllAuthData();
    return null;
  }
}

// Get Auth Token (async wrapper for external use)
export async function getAuthToken() {
  return getSecureAuthToken();
}

// Logout User
export async function logoutUser() {
  clearAllAuthData();
  window.location.replace('/');
}
```

#### **Step 3: Create Header Component with Auth**

**File:** `app/src/islands/shared/Header.jsx`

```javascript
import { useState, useEffect } from 'react';
import { validateTokenAndFetchUser, getAuthToken } from '../../lib/auth.js';

export default function Header({ autoShowLogin = false }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      const token = await getAuthToken();
      if (!token) {
        setAuthChecked(true);
        return;
      }

      const performAuthValidation = async () => {
        try {
          const userData = await validateTokenAndFetchUser();
          if (userData) {
            setCurrentUser(userData);
          } else {
            setCurrentUser(null);
          }
        } catch (error) {
          console.error('Auth validation error:', error);
          setCurrentUser(null);
        } finally {
          setAuthChecked(true);
        }
      };

      if (document.readyState !== 'complete') {
        window.addEventListener('load', performAuthValidation);
      } else {
        performAuthValidation();
      }
    };

    validateAuth();
  }, []);

  if (!authChecked) {
    return <div>Loading...</div>;
  }

  return (
    <header>
      {currentUser ? (
        <div>
          <a href={`/account-profile/${currentUser.userId}`}>
            <img src={currentUser.profilePhoto} alt="Profile" />
            <span>{currentUser.firstName}</span>
          </a>
        </div>
      ) : (
        <div>
          <button>Sign In</button>
        </div>
      )}
    </header>
  );
}
```

#### **Step 4: Use in HTML Pages**

**File:** `app/public/account-profile.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Account Profile - Split Lease</title>
</head>
<body>
  <div id="account-profile-page"></div>
  <script type="module" src="/src/account-profile.jsx"></script>
</body>
</html>
```

**File:** `app/src/account-profile.jsx`

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import Header from './islands/shared/Header.jsx';

function AccountProfilePage() {
  return (
    <>
      <Header autoShowLogin={true} />
      <main>
        <h1>Account Profile</h1>
        {/* Page content */}
      </main>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('account-profile-page')).render(
  <AccountProfilePage />
);
```

---

## Troubleshooting

### Common Issues

#### 1. **Token Not Found / User Not Authenticated**

**Symptoms:**
- `currentUser` is `null` despite logging in
- Redirected to home page immediately

**Diagnosis:**
```javascript
// Check sessionStorage
console.log('Token:', sessionStorage.getItem('__sl_at__'));
console.log('Session ID:', sessionStorage.getItem('__sl_sid__'));

// Check localStorage
console.log('Auth State:', localStorage.getItem('sl_auth_state'));
console.log('User ID:', localStorage.getItem('sl_user_id'));
```

**Solutions:**
- Ensure `VITE_BUBBLE_API_KEY` is configured
- Check browser console for API errors
- Verify Bubble workflows are active
- Clear browser cache and cookies

#### 2. **User Data Not Loading from Supabase**

**Symptoms:**
- Token validates but `currentUser` fields are `null`
- Console shows Supabase query errors

**Diagnosis:**
```javascript
// Test Supabase connection
const { data, error } = await supabase
  .from('user')
  .select('_id')
  .limit(1);

console.log('Supabase connection:', data, error);
```

**Solutions:**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Supabase RLS policies
- Ensure user record exists in database with correct `_id`
- Verify field names match exactly (including quotes and spaces)

#### 3. **Infinite Redirect Loop**

**Symptoms:**
- Page keeps redirecting between login and home
- Browser becomes unresponsive

**Diagnosis:**
```javascript
// Check if page is detected as protected
import { isProtectedPage } from './lib/auth.js';
console.log('Is protected page:', isProtectedPage());
```

**Solutions:**
- Verify `isProtectedPage()` logic
- Check `autoShowLogin` prop on protected pages
- Ensure token validation doesn't fail silently

#### 4. **Profile Photo Not Displaying**

**Symptoms:**
- User logged in but no profile image
- Broken image icon in header

**Diagnosis:**
```javascript
console.log('Profile Photo URL:', currentUser?.profilePhoto);
```

**Solutions:**
- Check if Supabase field `"Profile Photo"` contains URL
- Verify URL protocol fix: `profilePhoto.startsWith('//')` → `'https:' + profilePhoto`
- Ensure Bubble CDN URLs are accessible

#### 5. **User Type Not Cached**

**Symptoms:**
- `userType` is `null` despite being set in Supabase

**Diagnosis:**
```javascript
console.log('Cached User Type:', localStorage.getItem('sl_user_type'));
console.log('Current User Type:', currentUser?.userType);
```

**Solutions:**
- Ensure Supabase field `"Type - User Current"` exists and has value
- Check `setUserType()` is called after fetching user data
- Verify localStorage is not disabled in browser

---

## Variable Reference Table

### Exact Variable Names to Enforce

| Context | Variable Name | Type | Value Example | Source/Destination |
|---------|---------------|------|---------------|-------------------|
| **Bubble Login Response** | `data.response.token` | string | `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."` | Bubble API → sessionStorage |
| **Bubble Login Response** | `data.response.user_id` | string | `"1586447992720x748691103167545300"` | Bubble API → sessionStorage + localStorage |
| **Bubble Login Response** | `data.response.expires` | number | `86400` | Bubble API (informational) |
| **sessionStorage Key** | `__sl_at__` | string | Auth token | Token storage |
| **sessionStorage Key** | `__sl_sid__` | string | User ID | Session ID storage |
| **localStorage Key** | `sl_auth_state` | string | `"true"` or `"false"` | Auth state flag |
| **localStorage Key** | `sl_user_id` | string | User ID | Public user identifier |
| **localStorage Key** | `sl_user_type` | string | `"Host"` or `"Guest"` | User type cache |
| **localStorage Key** | `sl_last_activity` | string | `"1700000000000"` | Timestamp in ms |
| **Supabase Field** | `_id` | text | User ID primary key | Supabase user table |
| **Supabase Field** | `"Name - First"` | text | First name | Supabase user table |
| **Supabase Field** | `"Name - Full"` | text | Full name | Supabase user table |
| **Supabase Field** | `"Profile Photo"` | text | Image URL | Supabase user table |
| **Supabase Field** | `"Type - User Current"` | text | User type | Supabase user table |
| **User Object Property** | `currentUser.userId` | string | User ID | Header component state |
| **User Object Property** | `currentUser.firstName` | string \| null | First name | Header component state |
| **User Object Property** | `currentUser.fullName` | string \| null | Full name | Header component state |
| **User Object Property** | `currentUser.profilePhoto` | string \| null | Image URL | Header component state |
| **User Object Property** | `currentUser.userType` | string | `"Host"` or `"Guest"` | Header component state |

---

## Appendix: Complete Code References

### Core Files

1. **Storage Layer:** `app/src/lib/secureStorage.js`
2. **Authentication Logic:** `app/src/lib/auth.js`
3. **Header Component:** `app/src/islands/shared/Header.jsx`
4. **Constants:** `app/src/lib/constants.js`
5. **Supabase Client:** `app/src/lib/supabase.js`

### Pages Using Auth

1. **Account Profile:** `app/public/account-profile.html`, `app/src/account-profile.jsx`
2. **Guest Proposals:** `app/public/guest-proposals.html`, `app/src/guest-proposals.jsx`
3. **Home Page:** `app/public/index.html`, `app/src/islands/pages/HomePage.jsx`
4. **Search Page:** `app/public/search.html`, `app/src/islands/pages/SearchPage.jsx`

### Environment Variables

```bash
# Bubble.io
VITE_BUBBLE_API_KEY=your_bubble_api_key_here

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Google Maps (if using maps)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

---

**End of Documentation**

*For questions or issues, refer to the Troubleshooting section or consult the code files directly.*
