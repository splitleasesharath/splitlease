# Signup Flow Architecture Analysis

**Status**: Research & Analysis Complete
**Date**: 2025-12-03
**Scope**: Frontend signup UI, Edge Function authentication proxy, Bubble.io integration, Supabase user sync

---

## Executive Summary

The Split Lease signup flow follows a modern serverless architecture:

1. **Frontend** (React): Multi-step signup modal collecting user data
2. **Edge Function** (Supabase): `bubble-auth-proxy/signup` handler proxying to Bubble
3. **Backend** (Bubble.io): Creates user account and returns authentication token
4. **Database** (Supabase): Validates user exists in the `user` table

The system is **fully migrated** from direct Bubble API calls to Edge Functions for security (API keys never exposed to frontend).

---

## 1. Current Signup Data Flow

```
User fills SignUpLoginModal
    ↓
SignUpLoginModal.jsx collects:
  - firstName, lastName, email (Step 1)
  - userType, birthDate, phoneNumber, password (Step 2)
    ↓
signupUser(email, password, retype, additionalData)
    ↓
app/src/lib/auth.js
    ↓
supabase.functions.invoke('bubble-auth-proxy')
    ↓
supabase/functions/bubble-auth-proxy/handlers/signup.ts
    ↓
Bubble API (/wf/signup-user workflow)
    ↓
Bubble creates user, returns token + user_id
    ↓
Frontend stores token in secure storage
    ↓
Page reloads → validateTokenAndFetchUser() fetches Supabase user data
```

### Data Flow Diagram

```
Frontend Layer
├── SignUpLoginModal.jsx (UI)
└── signupUser() in auth.js (API caller)
        │
        ▼
Edge Function Layer (Supabase)
└── bubble-auth-proxy/handlers/signup.ts
    ├── Validate request
    ├── Call Bubble /wf/signup-user
    └── Return token + user_id
        │
        ▼
Backend Layer (Bubble.io)
└── /wf/signup-user workflow
    ├── Create user account
    ├── Return token (expires in ~86400s)
    └── Return user_id (Bubble internal ID)
        │
        ▼
Frontend Layer (Post-Auth)
└── Secure Storage
    ├── Store token (encrypted)
    ├── Store user_id (encrypted)
    └── Store user type
        │
        ▼
User Data Fetch (validateTokenAndFetchUser)
└── Supabase Edge Function
    └── bubble-auth-proxy/handlers/validate.ts
        ├── Query user table from Supabase
        └── Return formatted user data
```

---

## 2. Frontend Signup Collection

### SignUpLoginModal.jsx

**Location**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx`

#### Component Structure

- **Total Lines**: 1185 lines
- **Architecture**: Controlled component with local state management
- **Styling**: Inline styles (no CSS files)

#### Signup Form State

```javascript
const [signupData, setSignupData] = useState({
  firstName: '',        // Text input, required
  lastName: '',         // Text input, required
  email: '',            // Email input, required, validated
  userType: 'Guest',    // Dropdown: 'Guest' | 'Host', defaults to route
  birthMonth: '',       // Dropdown 1-12 (month)
  birthDay: '',         // Dropdown 1-31 (day, dynamic based on month/year)
  birthYear: '',        // Dropdown (last 100 years)
  phoneNumber: '',      // Tel input, required
  password: '',         // Password input, min 4 chars
  confirmPassword: ''   // Password confirm, must match
});
```

#### Signup Flow: Multi-Step

**Step 1 - Basic Information**
```jsx
Form fields:
├── First Name (required, text)
├── Last Name (required, text)
└── Email (required, email format validation)

Validation:
├── No empty fields
└── Valid email format (regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/)

Action: Continue to Step 2
```

**Step 2 - Detailed Information**
```jsx
Form fields:
├── User Type (required, dropdown)
│   ├── "A Guest (I would like to rent a space)"
│   └── "A Host (I have a space available to rent)"
├── Birth Date (required, 3 dropdowns: month/day/year)
├── Phone Number (required, tel input)
├── Password (required, min 4 chars, toggle visibility)
├── Confirm Password (required, must match, visual feedback)
└── Terms/Privacy/Guidelines links

Validation:
├── Age >= 18 (calculates from DOB)
├── No empty fields
├── Password >= 4 characters
└── Passwords match (real-time validation)

Action: Submit → signup flow
```

#### Key Component Props

```jsx
<SignUpLoginModal
  isOpen={boolean}                    // Modal visibility
  onClose={() => void}                // Close handler
  initialView="initial"|"login"|"signup"
  onAuthSuccess={(userData) => void}  // Callback on successful signup
  disableClose={boolean}              // Prevent escape/overlay close
  defaultUserType="guest"|"host"      // Pre-select user type from route
/>
```

#### Signup Submission Handler

```javascript
async function handleSignupSubmit(e) {
  // Step 1: Client-side validation
  if (!birthMonth || !birthDay || !birthYear) throw "Please enter your date of birth"
  if (!isOver18(...)) throw "You must be at least 18 years old"
  if (!phoneNumber.trim()) throw "Phone number is required"
  if (password.length < 4) throw "Password must be at least 4 characters"
  if (password !== confirmPassword) throw "Passwords do not match"

  // Step 2: Call signup API with extended data
  const result = await signupUser(
    email,
    password,
    confirmPassword,
    {
      firstName,
      lastName,
      userType,
      birthDate: 'YYYY-MM-DD',  // ISO format constructed
      phoneNumber
    }
  );

  // Step 3: On success
  if (result.success) {
    onAuthSuccess(result);        // Parent callback
    onClose();                    // Close modal
    setTimeout(() => {
      window.location.reload();   // Reload page to refresh session
    }, 500);
  } else {
    setError(result.error);       // Display error message
  }
}
```

#### Age Validation Function

```javascript
const isOver18 = (birthMonth, birthDay, birthYear) => {
  if (!birthMonth || !birthDay || !birthYear) return false;
  const today = new Date();
  const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 18;
};
```

---

## 3. Authentication Library

### auth.js - signupUser Function

**Location**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\lib\auth.js`

**Lines**: 519-634

```javascript
export async function signupUser(email, password, retype, additionalData = null) {
  // Client-side validation
  if (!email || !password || !retype) return { success: false, error: '...' }
  if (password.length < 4) return { success: false, error: '...' }
  if (password !== retype) return { success: false, error: '...' }

  // Build payload
  const payload = {
    email,
    password,
    retype,
    ...(additionalData ? { additionalData } : {})
  };

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
    body: {
      action: 'signup',
      payload
    }
  });

  // Handle errors and extract response
  if (error) { /* extract error message and return */ }
  if (!data.success) { /* return error */ }

  // Store tokens in secure storage
  setAuthToken(data.data.token);        // Encrypted in localStorage
  setSessionId(data.data.user_id);      // Encrypted in localStorage
  setAuthState(true, data.data.user_id);

  return {
    success: true,
    user_id: data.data.user_id,
    expires: data.data.expires  // Seconds until token expires
  };
}
```

#### API Request Payload Structure

```json
{
  "action": "signup",
  "payload": {
    "email": "user@example.com",
    "password": "mypassword",
    "retype": "mypassword",
    "additionalData": {
      "firstName": "John",
      "lastName": "Doe",
      "userType": "Guest",
      "birthDate": "1990-05-15",
      "phoneNumber": "+1234567890"
    }
  }
}
```

---

## 4. Edge Function: bubble-auth-proxy/signup Handler

**Location**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\handlers\signup.ts`

**Lines**: 1-152

### Handler Flow

```typescript
export async function handleSignup(
  bubbleAuthBaseUrl: string,        // From BUBBLE_API_BASE_URL secret
  bubbleApiKey: string,             // From BUBBLE_API_KEY secret
  supabaseUrl: string,              // Not used in signup (kept for signature)
  supabaseServiceKey: string,       // Not used in signup
  payload: any
): Promise<any>
```

### Processing Steps

**Step 1: Request Validation**
```typescript
validateRequiredFields(payload, ['email', 'password', 'retype']);
const { email, password, retype, additionalData } = payload;

// Extract optional additional data
const {
  firstName = '',
  lastName = '',
  userType = 'Guest',
  birthDate = '',
  phoneNumber = ''
} = additionalData || {};
```

**Step 2: Client-Side Validation (Deno)**
```typescript
if (password.length < 4) {
  throw new Error('Password must be at least 4 characters long.');
}

if (password !== retype) {
  throw new Error('The two passwords do not match!');
}
```

**Step 3: Call Bubble Signup Workflow**
```typescript
const url = `${bubbleAuthBaseUrl}/wf/signup-user`;

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${bubbleApiKey}`
  },
  body: JSON.stringify({
    email,
    password,
    retype,
    firstName,      // CRITICAL: camelCase
    lastName,       // CRITICAL: camelCase
    userType,       // CRITICAL: camelCase
    birthDate,      // CRITICAL: camelCase (ISO format expected)
    phoneNumber     // CRITICAL: camelCase
  })
});
```

**Step 4: Parse Bubble Response**
```typescript
const data = await response.json();

// Check response.ok and data.status
if (!response.ok || data.status !== 'success') {
  // Map Bubble error reasons to user messages
  if (data.reason === 'NOT_VALID_EMAIL') { /* invalid email */ }
  if (data.reason === 'USED_EMAIL') { /* email already registered */ }
  if (data.reason === 'DO_NOT_MATCH') { /* passwords don't match */ }

  throw new BubbleApiError(errorMessage, response.status, data.reason);
}
```

**Step 5: Extract Authentication Data**
```typescript
const token = data.response?.token;              // JWT token
const userId = data.response?.user_id;           // Bubble internal ID
const expires = data.response?.expires;          // Seconds

if (!token || !userId) {
  throw new BubbleApiError('Signup response missing required fields', 500);
}

// Return to frontend
return {
  token,
  user_id: userId,
  expires
};
```

### Error Handling

- **NOT_VALID_EMAIL**: "Please enter a valid email address."
- **USED_EMAIL**: "This email is already in use."
- **DO_NOT_MATCH**: "The two passwords do not match!"
- **Generic Error**: "Signup failed. Please try again."

### NO FALLBACK PRINCIPLE

The handler follows the "no fallback mechanisms" principle:
- If Bubble signup fails, the entire operation fails
- No fallback data, no dummy accounts, no delayed syncing
- Either the user is created in Bubble or signup fails

---

## 5. Edge Function: bubble-auth-proxy Main Router

**Location**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\index.ts`

**Lines**: 1-144

### Request Routing

```typescript
Deno.serve(async (req) => {
  // 1. CORS preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // 2. Parse request body
  const body = await req.json();
  const { action, payload } = body;

  // 3. Route to handler
  switch (action) {
    case 'signup':
      result = await handleSignup(
        bubbleAuthBaseUrl,
        bubbleApiKey,
        supabaseUrl,
        supabaseServiceKey,
        payload
      );
      break;
    // ... other actions: login, logout, validate
  }

  // 4. Return response with CORS headers
  return new Response(
    JSON.stringify({ success: true, data: result }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

### Key Configuration

- **Endpoint**: `POST /bubble-auth-proxy`
- **CORS**: Enabled for split.lease domain
- **Authentication**: NO auth required (these ARE the auth endpoints)
- **Secrets**: BUBBLE_API_BASE_URL, BUBBLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

---

## 6. Post-Signup User Validation

### validateTokenAndFetchUser Function

**Location**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\lib\auth.js`

**Lines**: 647-737

After signup succeeds and the page reloads, this function is called:

```javascript
export async function validateTokenAndFetchUser() {
  const token = getAuthToken();        // Get from encrypted storage
  const userId = getSessionId();       // Get from encrypted storage

  if (!token || !userId) return null;  // No session

  // Call validate endpoint
  const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
    body: {
      action: 'validate',
      payload: { token, user_id: userId }
    }
  });

  if (error || !data.success) {
    clearAuthData();                  // Clear on failure
    return null;
  }

  // Return user data object
  return {
    userId: userData.userId,
    firstName: userData.firstName,
    fullName: userData.fullName,
    profilePhoto: userData.profilePhoto,
    userType: userData.userType
  };
}
```

### validate Handler

**Location**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\handlers\validate.ts`

**Lines**: 1-118

```typescript
export async function handleValidate(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  const { token, user_id } = payload;

  // Create Supabase client with service role key
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Query user table
  const { data: userData, error: userError } = await supabase
    .from('user')
    .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current"')
    .eq('_id', user_id)
    .single();

  if (!userData) {
    throw new SupabaseSyncError(`User not found: ${user_id}`);
  }

  // Format and return user data
  return {
    userId: userData._id,
    firstName: userData['Name - First'],
    fullName: userData['Name - Full'],
    profilePhoto: profilePhoto,  // Handle protocol-relative URLs
    userType: userData['Type - User Current']
  };
}
```

**Key Points**:
- Uses Supabase `user` table (synced from Bubble)
- Field names are Bubble's naming convention: `"Name - First"`, `"Type - User Current"`
- Handles protocol-relative URLs (`//cdn.example.com` → `https://cdn.example.com`)
- Queries with service role key (bypasses RLS)

---

## 7. User Table Schema

### Supabase `user` Table

**Field Mapping**:
| Field | Type | Source | Usage |
|-------|------|--------|-------|
| `_id` | UUID | Bubble User ID | Primary key |
| `Name - First` | Text | Signup form (Step 1) | First name |
| `Name - Full` | Text | Calculated | Full name for display |
| `Profile Photo` | Text (URL) | User upload | Avatar |
| `Type - User Current` | Text (Enum) | Signup form (Step 2) | "Guest" \| "Host" |
| Email (assumed) | Text | Signup form (Step 1) | Contact |
| Password (hashed) | Text | Signup form (Step 2) | Authentication |
| Phone (assumed) | Text | Signup form (Step 2) | Contact |
| Birth Date (assumed) | Date | Signup form (Step 2) | Age verification |

**Data Syncing**:
- User data is synced from Bubble to Supabase after creation
- The validate handler queries Supabase (not Bubble)
- Sync is atomic: if Bubble create succeeds, Supabase sync follows

---

## 8. Secure Storage

### secureStorage.js Functions

**Location**: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\lib\secureStorage.js`

Handles encrypted storage of sensitive auth data:

```javascript
// Store functions
setAuthToken(token)              // Encrypt and store JWT token
setSessionId(sessionId)          // Encrypt and store user_id
setUserType(userType)            // Store non-sensitive user type
setAuthState(isAuth, userId)     // Set auth flag + public user ID

// Retrieve functions
getAuthToken()                   // Decrypt and return token
getSessionId()                   // Decrypt and return user_id
getUserType()                    // Return cached user type
getAuthState()                   // Check if authenticated

// Cleanup
clearAllAuthData()               // Clear all tokens and state
```

**Storage Keys**:
- `splitlease_auth_token` - Encrypted JWT token
- `splitlease_session_id` - Encrypted user ID
- `splitlease_user_type` - Plain text (non-sensitive)
- `splitlease_auth_state` - Auth boolean flag

**Encryption**: AES encryption in secure storage module

---

## 9. Signup Fields Summary

### Fields Collected in Signup

| Field | Type | Step | Required | Format | Validation |
|-------|------|------|----------|--------|------------|
| First Name | String | 1 | Yes | Text | Non-empty |
| Last Name | String | 1 | Yes | Text | Non-empty |
| Email | String | 1 | Yes | Email | RFC email regex |
| User Type | Enum | 2 | Yes | "Guest" \| "Host" | Dropdown |
| Birth Month | Number | 2 | Yes | 1-12 | Numeric |
| Birth Day | Number | 2 | Yes | 1-31 | Numeric (dynamic) |
| Birth Year | Number | 2 | Yes | 1925-2024 | Numeric |
| Phone Number | String | 2 | Yes | Phone | Text |
| Password | String | 2 | Yes | ≥4 chars | Min length |
| Confirm Password | String | 2 | Yes | Matches pwd | Equality check |

### Fields Sent to Bubble

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "retype": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "Guest",
  "birthDate": "1990-05-15",
  "phoneNumber": "+1-555-555-5555"
}
```

### Critical Notes

1. **All fields are camelCase** - Bubble expects camelCase, not snake_case
2. **birthDate is ISO format** - YYYY-MM-DD (constructed from month/day/year)
3. **userType must match exactly** - "Guest" or "Host" (case-sensitive)
4. **All fields are required** - Bubble will reject requests with missing fields
5. **Password validation is client-side** - Edge Function validates minimum length

---

## 10. Architecture Decisions

### Why Edge Functions?

**Security**:
- API keys never exposed to frontend code
- Bubble API credentials stored in Supabase Secrets
- All Bubble calls proxied through Edge Functions

**Validation**:
- Centralized request validation
- Error handling and translation
- Consistent response format

**Future Migration Path**:
- Can switch Bubble implementation without changing frontend
- Can add additional validations server-side

### Why Supabase User Table Lookup?

The validate handler queries Supabase (not Bubble) because:
1. **Bubble Data API may not accept workflow-issued tokens** - Workflow tokens are issued for authentication, not for data access
2. **Supabase is faster** - Local database query vs. external API call
3. **Supabase is source of truth** - Users are synced to Supabase anyway
4. **RLS can be bypassed with service role** - Service key provides full access

### Why No User Creation in Supabase?

Currently, **NO direct user creation in Supabase happens during signup**:
- User is created in Bubble via `/wf/signup-user`
- Bubble syncs user to Supabase (external sync process)
- Frontend only validates user exists via `validate` endpoint

This follows the "no fallback mechanisms" principle - if Bubble doesn't sync, the system isn't pretending the user exists.

---

## 11. Error Handling

### Frontend Error Messages

| Scenario | Error Message | Component |
|----------|---------------|-----------|
| Invalid email | "Please enter a valid email address." | Step 1 |
| Email already registered | "This email is already in use." | Step 2 (after submit) |
| Passwords don't match | "The passwords don't match" | Step 2 (real-time) |
| Password < 4 chars | "Password must be at least 4 characters." | Step 2 |
| User < 18 years | "You must be at least 18 years old to use Split Lease." | Step 2 |
| Missing required field | Field-specific error | Each step |
| Network error | "Network error. Please check your connection and try again." | signupUser() |

### Edge Function Error Codes

| Error | Status | Reason Code |
|-------|--------|-------------|
| Invalid email format | 400 | `NOT_VALID_EMAIL` |
| Email already in use | 400 | `USED_EMAIL` |
| Passwords don't match | 400 | `DO_NOT_MATCH` |
| Missing required fields | 400 | N/A |
| Bubble API error | 500+ | Varies |
| Invalid request | 400 | N/A |

---

## 12. State Management Post-Signup

### Signup Success Flow

```
1. signupUser() returns { success: true, user_id, expires }
   ↓
2. Frontend stores in secure storage:
   - token (encrypted)
   - user_id (encrypted)
   - user type (plain)
   - auth state (boolean)
   ↓
3. Modal closes, page reloads
   ↓
4. On page reload, checkAuthStatus() runs:
   - Checks auth state
   - Verifies tokens exist
   - Returns true if authenticated
   ↓
5. validateTokenAndFetchUser() fetches user data:
   - Calls validate endpoint
   - Queries Supabase user table
   - Returns user profile data
   ↓
6. App renders authenticated UI with user name/avatar
```

### Auth State Variables

```javascript
// In auth.js module scope
let isUserLoggedInState = false;  // Module-level flag
let authCheckAttempts = 0;        // For limiting retries

// In secure storage
splitlease_auth_token       // Encrypted JWT
splitlease_session_id       // Encrypted user ID
splitlease_auth_state       // Auth boolean
splitlease_user_type        // User type (Host/Guest)
loggedInAvatar_userType_visible  // UI preference
```

---

## 13. Critical Implementation Details

### Day Indexing

**Signup uses month/day/year dropdowns** (not affected by JS day indexing):
- Month: 1-12 (user-friendly)
- Day: 1-31 (user-friendly, dynamic)
- Year: Last 100 years (user-friendly)
- Converted to ISO date: YYYY-MM-DD before sending to Bubble

### Password Handling

- **Minimum length**: 4 characters (validated both frontend and Edge Function)
- **Confirmation**: Must match in both locations
- **Transmission**: Sent in plain text over HTTPS (encrypted by TLS)
- **Storage**: Hashed by Bubble (not visible in Edge Function)

### Email Validation

- **Regex**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Bubble validation**: `NOT_VALID_EMAIL` error if invalid
- **Duplicate check**: Bubble returns `USED_EMAIL` if email exists

### User Type Assignment

**Default**: "Guest" (unless route-based prefilling sets "Host")
**Source**: Route parameter `defaultUserType` prop
**Storage**: In Supabase `"Type - User Current"` field
**Immutable**: Can be changed in user profile, not during signup retries

---

## 14. Files Involved

### Frontend Files
1. **SignUpLoginModal.jsx** - Multi-step signup UI
   - Path: `app/src/islands/shared/SignUpLoginModal.jsx`
   - Lines: 1185 (complete modal)

2. **auth.js** - signupUser() function
   - Path: `app/src/lib/auth.js`
   - Lines: 519-634

3. **supabase.js** - Supabase client
   - Path: `app/src/lib/supabase.js`
   - Lines: 11 (initialization only)

4. **secureStorage.js** - Token encryption/storage
   - Path: `app/src/lib/secureStorage.js`
   - Lines: Contains setAuthToken, getAuthToken, etc.

### Edge Function Files
1. **bubble-auth-proxy/index.ts** - Main router
   - Path: `supabase/functions/bubble-auth-proxy/index.ts`
   - Lines: 144 (routing logic)

2. **bubble-auth-proxy/handlers/signup.ts** - Signup handler
   - Path: `supabase/functions/bubble-auth-proxy/handlers/signup.ts`
   - Lines: 152 (signup logic)

3. **bubble-auth-proxy/handlers/validate.ts** - User validation
   - Path: `supabase/functions/bubble-auth-proxy/handlers/validate.ts`
   - Lines: 118 (user lookup)

4. **bubble-auth-proxy/handlers/login.ts** - Login handler
   - Path: `supabase/functions/bubble-auth-proxy/handlers/login.ts`
   - Lines: 102 (login logic)

5. **bubble-auth-proxy/handlers/logout.ts** - Logout handler
   - Path: `supabase/functions/bubble-auth-proxy/handlers/logout.ts`
   - Lines: 80 (logout logic)

### Shared Edge Function Utilities
- **_shared/errors.ts** - Error handling (BubbleApiError, SupabaseSyncError)
- **_shared/validation.ts** - validateRequiredFields, validateEmail, validatePhone
- **_shared/cors.ts** - CORS headers and preflight handling

---

## 15. Data Validation Summary

### Frontend Validations (SignUpLoginModal.jsx)

**Step 1**:
- `firstName`: Non-empty
- `lastName`: Non-empty
- `email`: RFC-compliant email format

**Step 2**:
- `birthMonth/Day/Year`: Non-empty, converts to valid date, age >= 18
- `phoneNumber`: Non-empty
- `password`: >= 4 characters
- `confirmPassword`: Matches password

### Edge Function Validations (signup.ts)

- `email`: Required
- `password`: >= 4 characters, matches `retype`
- `retype`: Matches `password`
- All additional fields: Forwarded to Bubble as-is

### Bubble Validations (/wf/signup-user)

- `email`: Valid email format, unique (NOT_VALID_EMAIL, USED_EMAIL)
- `password`: Matches `retype` (DO_NOT_MATCH)
- `firstName`, `lastName`, `userType`, `birthDate`, `phoneNumber`: Required

---

## 16. Known Limitations & Constraints

1. **No direct user creation in Supabase** - Relies on Bubble sync
2. **No email verification** - Signup completes immediately
3. **No phone verification** - Phone stored as-is
4. **No password strength requirements** - Only minimum 4 characters
5. **No rate limiting** - Edge Function doesn't limit signup attempts per IP
6. **Birth date not stored** - Only used for age validation
7. **No profile photo during signup** - Must be added in account settings
8. **User type immutable during signup** - Can only change in profile

---

## 17. Testing Checklist

- [ ] Signup modal renders with Step 1 fields
- [ ] Step 1 validation prevents empty fields
- [ ] Email validation regex works for valid/invalid emails
- [ ] "Continue" transitions to Step 2
- [ ] Step 2 renders all fields (user type, DOB, phone, password)
- [ ] Age validation rejects users under 18
- [ ] Password mismatch shows visual feedback and disables submit
- [ ] Form preserves data between steps
- [ ] Submit calls signupUser() with correct payload
- [ ] Edge Function receives payload correctly
- [ ] Edge Function calls Bubble API with camelCase fields
- [ ] Error handling displays user-friendly messages
- [ ] Successful signup stores tokens in secure storage
- [ ] Page reloads after successful signup
- [ ] validateTokenAndFetchUser() queries Supabase correctly
- [ ] User data displays in authenticated UI

---

## Summary

The Split Lease signup flow is a well-architected system that:

1. **Collects comprehensive user data** via a multi-step modal with real-time validation
2. **Proxies through Edge Functions** for security (no exposed API keys)
3. **Creates users in Bubble** as the source of truth
4. **Validates users in Supabase** after sync completion
5. **Stores tokens securely** with encryption
6. **Follows no-fallback principles** - fails cleanly without workarounds
7. **Provides clear error messages** translated from Bubble responses
8. **Respects user type routes** with pre-filling when from /host-signup or /guest-signup

All code follows the project's four-layer logic architecture and hollow component patterns, with clear separation between UI (React component), orchestration (auth.js), infrastructure (Edge Function), and backend (Bubble + Supabase).

