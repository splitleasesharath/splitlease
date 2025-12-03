# Signup Flow - Comprehensive Overview

**Generated**: 2025-12-03
**Status**: Complete Analysis
**Scope**: All signup pathways (standard, regular guest, AI-powered)

---

## Executive Summary

Split Lease implements a **two-stage signup system**:

1. **Standard Signup** - Traditional email/password registration with full profile collection
2. **AI Signup (Guest)** - Lightweight market research signup for guest discovery

Both flows use **Supabase Edge Functions** to proxy requests to Bubble.io (the source of truth for user creation). Tokens are encrypted and stored client-side. User data is synced from Bubble to Supabase for validation and profile retrieval.

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (React)                                        │
│ - SignUpLoginModal (standard signup)                    │
│ - AiSignupMarketReport (AI guest signup)                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼ Supabase.functions.invoke()
┌─────────────────────────────────────────────────────────┐
│ Edge Functions (Deno)                                   │
│ - bubble-auth-proxy/signup (standard)                   │
│ - ai-signup-guest (AI-powered)                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼ HTTP POST
┌─────────────────────────────────────────────────────────┐
│ Bubble.io API                                           │
│ - /wf/signup-user (creates user account)               │
│ - /wf/ai-signup-guest (market research)                │
└─────────────────────────────────────────────────────────┘
                 │
                 ▼ User sync (async)
┌─────────────────────────────────────────────────────────┐
│ Supabase PostgreSQL                                     │
│ - user table (synced from Bubble)                       │
│ - Queried during token validation                       │
└─────────────────────────────────────────────────────────┘
```

### Data Flow at Scale

| Stage | Owner | Action | Storage |
|-------|-------|--------|---------|
| **Form Submission** | Frontend | Collect user data | React state |
| **Validation** | Frontend | Client-side checks | Browser memory |
| **Edge Function** | Supabase | Route and relay | Transient |
| **User Creation** | Bubble.io | Create account, issue token | Bubble DB |
| **Token Storage** | Frontend | Encrypt and persist | localStorage (encrypted) |
| **User Sync** | Bubble | Sync to Supabase | Supabase user table |
| **Profile Retrieval** | Supabase | Query synced data | Read from Supabase |

---

## Part 1: Standard Signup Flow

### Overview

The standard signup flow (SignUpLoginModal) is a **two-step form** that collects comprehensive user profile information and creates an authenticated account.

### Entry Point Component

**File**: `/app/src/islands/shared/SignUpLoginModal.jsx`

**Component Contract**:
```jsx
<SignUpLoginModal
  isOpen={boolean}              // Modal visibility
  onClose={function}             // Close callback
  initialView="initial|login|signup"  // Starting view
  onAuthSuccess={function}       // Post-auth callback
  defaultUserType="host|guest"   // Pre-fill user type
  disableClose={boolean}         // Disable close button (optional)
/>
```

### Step 1: Form Collection (Name, Email, User Type)

**File**: `SignUpLoginModal.jsx` (lines 850-932)
**Component**: `renderSignupStep1()`

**Form Fields**:
```jsx
const signupData = {
  firstName: '',        // First name (required)
  lastName: '',         // Last name (required)
  email: '',            // Email (required, validated)
  userType: 'Guest'     // 'Guest' or 'Host' (optional, defaults to Guest)
}
```

**Validation**:
- First name: not empty
- Last name: not empty
- Email: valid email format (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)

**Continue Button**: Advances to Step 2 without submitting

### Step 2: Form Completion (DOB, Phone, Password)

**File**: `SignUpLoginModal.jsx` (lines 934-1100)
**Component**: `renderSignupStep2()`

**Form Fields**:
```jsx
const signupData = {
  ...step1Data,
  birthMonth: 1-12,            // Month (required)
  birthDay: 1-31,              // Day (required)
  birthYear: 1950-2025,        // Year (required)
  phoneNumber: '(555) 555-5555', // Phone format (required)
  password: 'minLength=4',      // Password (required)
  confirmPassword: 'minLength=4' // Confirm password (required)
}
```

**Validation**:
- Birth date complete and user is 18+
- Phone number not empty
- Password minimum 4 characters
- Password and confirm password match
- Real-time password mismatch indicator

**Date of Birth Check**:
```javascript
const isOver18 = (birthMonth, birthDay, birthYear) => {
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

**Submit Button**: Calls `handleSignupSubmit()` on click

### Form Submission Handler

**File**: `SignUpLoginModal.jsx` (lines 557-621)
**Function**: `handleSignupSubmit()`

```javascript
const handleSignupSubmit = async (e) => {
  e.preventDefault();
  setError('');

  // Client-side validation for Step 2
  if (!signupData.birthMonth || !signupData.birthDay || !signupData.birthYear) {
    setError('Please enter your date of birth.');
    return;
  }

  if (!isOver18(...)) {
    setError('You must be at least 18 years old to use Split Lease.');
    return;
  }

  if (!signupData.phoneNumber.trim()) {
    setError('Phone number is required.');
    return;
  }

  if (!signupData.password) {
    setError('Password is required.');
    return;
  }

  if (signupData.password.length < 4) {
    setError('Password must be at least 4 characters.');
    return;
  }

  if (signupData.password !== signupData.confirmPassword) {
    setError('Passwords do not match.');
    return;
  }

  setIsLoading(true);

  // Build formatted birth date
  const birthDate = `${signupData.birthYear}-${String(signupData.birthMonth).padStart(2, '0')}-${String(signupData.birthDay).padStart(2, '0')}`;

  // Call signup function from auth.js
  const result = await signupUser(
    signupData.email,
    signupData.password,
    signupData.confirmPassword,
    {
      firstName: signupData.firstName,
      lastName: signupData.lastName,
      userType: signupData.userType,
      birthDate,  // ISO format: YYYY-MM-DD
      phoneNumber: signupData.phoneNumber
    }
  );

  setIsLoading(false);

  if (result.success) {
    if (onAuthSuccess) {
      onAuthSuccess(result);
    }
    onClose();
    setTimeout(() => {
      window.location.reload();  // ← CRITICAL: Page reload
    }, 500);
  } else {
    setError(result.error || 'Signup failed. Please try again.');
  }
};
```

### Frontend Auth Function

**File**: `/app/src/lib/auth.js`
**Function**: `signupUser()` (lines 519-634)

**Function Signature**:
```javascript
export async function signupUser(
  email,           // User email
  password,        // User password
  retype,          // Password confirmation
  additionalData   // { firstName, lastName, userType, birthDate, phoneNumber }
)
```

**Steps**:

1. **Client-Side Validation**:
   - Email, password, retype not empty
   - Password minimum 4 characters
   - Password matches retype

2. **Build Payload**:
   ```javascript
   const payload = {
     email,
     password,
     retype,
     additionalData: {
       firstName,
       lastName,
       userType,      // "Host" or "Guest"
       birthDate,     // ISO: YYYY-MM-DD
       phoneNumber
     }
   };
   ```

3. **Call Edge Function**:
   ```javascript
   const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
     body: {
       action: 'signup',  // Routes to signup handler
       payload
     }
   });
   ```

4. **Handle Response**:
   - On error: Extract error message and return `{ success: false, error }`
   - On success: Extract token, user_id, expires
   - Store in secure storage (encrypted)

5. **Store Authentication Data**:
   ```javascript
   setAuthToken(data.data.token);              // Encrypted: __sl_at__
   setSessionId(data.data.user_id);            // Encrypted: __sl_sid__
   setAuthState(true, data.data.user_id);      // Public: sl_auth_state
   ```

6. **Return Success**:
   ```javascript
   return {
     success: true,
     user_id: data.data.user_id,
     expires: data.data.expires
   };
   ```

### Edge Function Router

**File**: `/supabase/functions/bubble-auth-proxy/index.ts` (lines 90-96)

**Request Routing**:
```typescript
switch (action) {
  case 'signup':
    result = await handleSignup(
      bubbleAuthBaseUrl,
      bubbleApiKey,
      supabaseUrl,           // ← Passed but currently unused
      supabaseServiceKey,    // ← Passed but currently unused
      payload
    );
    break;
  // ... other cases ...
}
```

### Signup Handler (Edge Function)

**File**: `/supabase/functions/bubble-auth-proxy/handlers/signup.ts` (lines 32-152)

**Handler Function**:
```typescript
export async function handleSignup(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  payload: any
): Promise<any>
```

**Steps**:

1. **Validate Required Fields**:
   ```typescript
   validateRequiredFields(payload, ['email', 'password', 'retype']);
   const { email, password, retype, additionalData } = payload;
   ```

2. **Extract Additional Data**:
   ```typescript
   const {
     firstName = '',
     lastName = '',
     userType = 'Guest',
     birthDate = '',
     phoneNumber = ''
   }: SignupAdditionalData = additionalData || {};
   ```

3. **Validate Password**:
   ```typescript
   if (password.length < 4) {
     throw new Error('Password must be at least 4 characters long.');
   }
   if (password !== retype) {
     throw new Error('The two passwords do not match!');
   }
   ```

4. **Call Bubble API**:
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
       firstName,      // ← CRITICAL: camelCase (not snake_case)
       lastName,       // ← CRITICAL: camelCase
       userType,       // ← CRITICAL: "Host" or "Guest"
       birthDate,      // ← CRITICAL: ISO format YYYY-MM-DD
       phoneNumber     // ← CRITICAL: camelCase
     })
   });
   ```

5. **Parse Response**:
   ```typescript
   const data = await response.json();
   // Expected: { status: 'success', response: { token, user_id, expires } }
   ```

6. **Validate Response**:
   ```typescript
   if (!response.ok || data.status !== 'success') {
     // Map Bubble errors to user-friendly messages
     let errorMessage = data.message || 'Signup failed. Please try again.';

     if (data.reason === 'NOT_VALID_EMAIL') {
       errorMessage = 'Please enter a valid email address.';
     } else if (data.reason === 'USED_EMAIL') {
       errorMessage = 'This email is already in use.';
     } else if (data.reason === 'DO_NOT_MATCH') {
       errorMessage = 'The two passwords do not match!';
     }

     throw new BubbleApiError(errorMessage, response.status, data.reason);
   }
   ```

7. **Extract Bubble Response**:
   ```typescript
   const token = data.response?.token;
   const userId = data.response?.user_id;
   const expires = data.response?.expires;

   if (!token || !userId) {
     throw new BubbleApiError('Signup response missing required fields', 500);
   }
   ```

8. **Return Token to Frontend**:
   ```typescript
   return {
     token,
     user_id: userId,
     expires
   };
   ```

### Post-Signup: Page Reload and Validation

**File**: `SignUpLoginModal.jsx` (lines 614-617)

```javascript
if (result.success) {
  if (onAuthSuccess) {
    onAuthSuccess(result);
  }
  onClose();
  setTimeout(() => {
    window.location.reload();  // ← Intentional: Re-init app with auth
  }, 500);
}
```

**On Page Reload**:
Typically, the main app component runs authentication checks:

```javascript
useEffect(() => {
  const checkAuth = async () => {
    // 1. Check if tokens exist
    const isLoggedIn = await checkAuthStatus();

    if (isLoggedIn) {
      // 2. Validate token and fetch user profile
      const userData = await validateTokenAndFetchUser();

      if (userData) {
        // User is authenticated - display user menu, etc.
        setUserData(userData);
      }
    }
  };

  checkAuth();
}, []);
```

### Validate Handler (Called on Page Reload)

**File**: `/supabase/functions/bubble-auth-proxy/handlers/validate.ts`

**Purpose**: Validate token and fetch user profile from Supabase

**Steps**:

1. **Get Token and User ID**:
   ```typescript
   validateRequiredFields(payload, ['token', 'user_id']);
   const { token, user_id } = payload;
   ```

2. **Skip Bubble Validation**:
   ```typescript
   // Note: Bubble token validation is skipped
   // Trust the login token; Bubble will reject expired tokens on API calls
   console.log(`[validate] Skipping Bubble token validation`);
   ```

3. **Query Supabase user Table**:
   ```typescript
   const supabase = createClient(supabaseUrl, supabaseServiceKey, {
     auth: { autoRefreshToken: false, persistSession: false }
   });

   const { data: userData, error: userError } = await supabase
     .from('user')
     .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current"')
     .eq('_id', user_id)
     .single();
   ```

4. **Format and Return User Data**:
   ```typescript
   if (!userData) {
     throw new SupabaseSyncError(`User not found: ${user_id}`);
   }

   return {
     userId: userData._id,
     firstName: userData['Name - First'] || null,
     fullName: userData['Name - Full'] || null,
     profilePhoto: userData['Profile Photo'] || null,
     userType: userData['Type - User Current'] || null
   };
   ```

### Secure Storage Implementation

**File**: `/app/src/lib/secureStorage.js`

**Storage Keys**:
```javascript
const SECURE_KEYS = {
  AUTH_TOKEN: '__sl_at__',    // Encrypted auth token
  SESSION_ID: '__sl_sid__',   // Encrypted user ID
  REFRESH_DATA: '__sl_rd__'   // Encrypted refresh token data
};

const STATE_KEYS = {
  IS_AUTHENTICATED: 'sl_auth_state',     // Public: "true" or "false"
  USER_ID: 'sl_user_id',                 // Public: non-sensitive ID
  USER_TYPE: 'sl_user_type',             // Public: "Host" or "Guest"
  LAST_ACTIVITY: 'sl_last_activity',     // Public: timestamp
  SESSION_VALID: 'sl_session_valid'      // Public: "true" or "false"
};
```

**Functions**:
```javascript
setAuthToken(token)        // Store encrypted token
setSessionId(sessionId)     // Store encrypted user ID
setAuthState(isAuth, userId) // Store public state
getAuthToken()             // Retrieve encrypted token
getSessionId()             // Retrieve encrypted user ID
getAuthState()             // Retrieve public state
clearAllAuthData()         // Clear all auth data on logout
```

---

## Part 2: AI-Powered Guest Signup

### Overview

The AI signup flow is a **lightweight market research signup** for potential guests. It uses AI to generate personalized market insights and collects minimal information (email, optional phone, market research text).

### Entry Point Component

**File**: `/app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Component Contract**:
```jsx
<AiSignupMarketReport
  isOpen={boolean}           // Modal visibility
  onClose={function}         // Close callback
  onSubmit={function}        // Custom submit handler (optional)
/>
```

### Key Features

1. **Email Extraction**: Parses freeform text to extract email address
2. **Email Validation**: Validates email format and checks for common typos
3. **Auto-Correction**: Fixes common email typos (gmial.com → gmail.com)
4. **Phone Extraction**: Extracts complete or partial phone numbers
5. **Lottie Animations**: Three animated states (parsing, loading, success)
6. **Typewriter Effect**: Streams AI insights progressively to UI

### Utility Functions

**Email Extraction**:
```javascript
function extractEmail(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.,][a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}
```

**Email Validation**:
```javascript
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}
```

**Email Certainty Check**:
```javascript
function checkEmailCertainty(email) {
  if (!email) return 'uncertain';

  const commonDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'aol.com', 'mail.com', 'protonmail.com'
  ];

  const commonTypos = [
    'gmial.com', 'gmai.com', 'yahooo.com', 'yaho.com',
    'hotmial.com', 'outlok.com', 'icoud.com'
  ];

  const domain = email.split('@')[1]?.toLowerCase();

  if (commonTypos.includes(domain)) return 'uncertain';
  if (domain && domain.length < 5) return 'uncertain';
  if (!domain?.includes('.')) return 'uncertain';
  if (email.includes('..') || email.includes('@.')) return 'uncertain';
  if (commonDomains.includes(domain)) return 'certain';
  if (validateEmail(email)) return 'certain';

  return 'uncertain';
}
```

**Email Auto-Correction**:
```javascript
function autoCorrectEmail(email) {
  const typoMap = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gnail.com': 'gmail.com',
    'gmail.co': 'gmail.com',
    'gmail,com': 'gmail.com',
    'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com',
    // ... more mappings ...
  };

  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  const domainLower = domain.toLowerCase();
  const fixedDomain = domainLower.replace(',', '.');
  const correctedDomain = typoMap[fixedDomain] || fixedDomain;

  return `${localPart}@${correctedDomain}`;
}
```

**Phone Extraction**:
```javascript
function extractPhone(text) {
  if (!text) return null;

  // Try complete phone format first
  const completePhoneRegex = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const completeMatch = text.match(completePhoneRegex);
  if (completeMatch) return completeMatch[0];

  // Fall back to partial phone format
  const partialPhoneRegex = /\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{0,4}|\b\d{3,}\b/;
  const partialMatch = text.match(partialPhoneRegex);
  return partialMatch ? partialMatch[0] : null;
}
```

### Form Submission

**Function**: `submitSignup(data)` (lines 110-181)

**Validation**:
```javascript
if (!data.email) {
  throw new Error('Email is required');
}

if (!data.marketResearchText) {
  throw new Error('Market research description is required');
}
```

**Call Edge Function**:
```javascript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qcfifybkaddcoimjroca.supabase.co';
const edgeFunctionUrl = `${supabaseUrl}/functions/v1/ai-signup-guest`;

const response = await fetch(edgeFunctionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: data.email,
    phone: data.phone || '',
    text_inputted: data.marketResearchText,
  }),
});
```

**Response**:
```javascript
if (!response.ok) {
  let errorMessage = 'Failed to submit signup';
  try {
    const errorJson = JSON.parse(await response.text());
    errorMessage = errorJson.error || errorJson.message || errorMessage;
  } catch (e) {
    errorMessage = await response.text() || errorMessage;
  }
  throw new Error(errorMessage);
}

const result = await response.json();
return { success: true, data: result.data };
```

### Edge Function: AI Signup Guest

**File**: `/supabase/functions/ai-signup-guest/index.ts`

**Purpose**: Lightweight signup for market research with AI integration

**Key Points**:
- No user authentication required (guest signup)
- Collects email, phone (optional), market research text
- Calls Bubble workflow: `/wf/ai-signup-guest`
- Field names sent to Bubble: `email`, `phone`, `text inputted` (note space in key!)

**Handler in bubble-proxy**:
**File**: `/supabase/functions/bubble-proxy/handlers/signup.ts`

```typescript
export async function handleAiSignup(
  syncService: BubbleSyncService,
  payload: Record<string, any>,
  user: User
): Promise<any> {
  validateRequiredFields(payload, ['email', 'text_inputted']);
  const { email, phone, text_inputted } = payload;

  validateEmail(email);
  if (phone) {
    validatePhone(phone);
  }

  if (!text_inputted.trim()) {
    throw new Error('Market research description cannot be empty');
  }

  // Atomic create-and-sync operation
  const syncedSignup = await syncService.createAndSync(
    'ai-signup-guest',  // Bubble workflow name
    {
      email,
      phone: phone || '',
      'text inputted': text_inputted,  // ← Note: space in key name
    },
    'zat_users',    // Bubble object type
    'zat_users'     // Supabase table
  );

  return syncedSignup;
}
```

---

## Part 3: Integration Points

### Bubble.io Workflows

#### `/wf/signup-user` (Standard Signup)

**Called by**: Edge Function `bubble-auth-proxy/handlers/signup.ts`

**Input Parameters** (camelCase required):
```
email (string) - User email
password (string) - User password
retype (string) - Password confirmation
firstName (string) - First name
lastName (string) - Last name
userType (string) - "Host" or "Guest"
birthDate (string) - ISO format: YYYY-MM-DD
phoneNumber (string) - Phone number
```

**Output**:
```json
{
  "status": "success",
  "response": {
    "token": "jwt_token_here",
    "user_id": "bubble_user_id",
    "expires": 86400
  }
}
```

**Error Reasons**:
- `NOT_VALID_EMAIL`: Invalid email format
- `USED_EMAIL`: Email already registered
- `DO_NOT_MATCH`: Passwords don't match
- Other: Generic error message

#### `/wf/ai-signup-guest` (AI Guest Signup)

**Called by**: Edge Function `ai-signup-guest`

**Input Parameters**:
```
email (string) - User email
phone (string) - Phone number (optional)
text inputted (string) - Market research description (note: space in key!)
```

**Output**: User/signup record created in Bubble

### Supabase User Table

**Table**: `public.user`

**Synced From**: Bubble.io (via Bubble workflow or scheduled sync)

**Fields Used During Validation**:
- `_id` - Unique user identifier (matches Bubble user_id)
- `Name - First` - First name
- `Name - Full` - Full name
- `Profile Photo` - Profile photo URL
- `Type - User Current` - User type ("Host" or "Guest")

**Query Pattern** (in validate handler):
```sql
SELECT _id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current"
FROM "user"
WHERE _id = $1
```

---

## Part 4: Error Handling

### Frontend Validation Errors

**Signup Form Validation**:
- "First name is required."
- "Last name is required."
- "Email is required."
- "Please enter a valid email address."
- "Please enter your date of birth."
- "You must be at least 18 years old to use Split Lease."
- "Phone number is required."
- "Password is required."
- "Password must be at least 4 characters."
- "Passwords do not match."

**AI Signup Validation**:
- "Email is required"
- "Market research description is required"

### Bubble API Errors

**Standard Signup**:
- `NOT_VALID_EMAIL`: "Please enter a valid email address."
- `USED_EMAIL`: "This email is already in use."
- `DO_NOT_MATCH`: "The two passwords do not match!"

**Generic**:
- "Signup failed. Please try again."
- "Failed to create account. Please try again."

### Edge Function Errors

- "Bubble API configuration missing in secrets"
- "Method not allowed. Use POST."
- "Invalid action"
- "All fields are required."
- "Missing token or user_id in response"
- "Network error. Please check your connection and try again."

---

## Part 5: Security Architecture

### API Key Protection

**Status**: ✅ Migrated
**Method**: Server-side secrets in Supabase

**Secrets Required** (in Supabase Dashboard → Edge Functions → Secrets):
```
BUBBLE_API_BASE_URL = https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY = <your-api-key>
SUPABASE_URL = <auto-provided>
SUPABASE_SERVICE_ROLE_KEY = <auto-provided>
```

**Never Exposed**:
- API keys NOT in frontend code
- API keys NOT in environment files
- API keys NOT in localStorage

### Token Storage

**Method**: Encrypted localStorage
**Keys**:
- `__sl_at__` - Auth token (encrypted)
- `__sl_sid__` - Session ID (encrypted)

**Not Used**:
- Plain text tokens
- sessionStorage (doesn't persist across browser restarts)
- Unencrypted storage

### Password Security

**Frontend**:
- Minimum 4 characters (enforced)
- Sent only via HTTPS to Edge Function
- Never logged to console

**Edge Function**:
- Validation repeated (defense in depth)
- Forwarded to Bubble via HTTPS
- Never logged to console

**Bubble.io**:
- Password hashed server-side
- Never transmitted in clear text back to frontend

### Validation Layering

```
User Input
    ↓
Frontend Validation (UX)
    ↓
Edge Function Validation (Defense)
    ↓
Bubble API Validation (Source of Truth)
    ↓
Database Storage (Hashed)
```

---

## Part 6: Critical Configuration

### Required Environment Variables

**Frontend** (`app/.env`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GOOGLE_MAPS_API_KEY=your-maps-key
```

**Edge Functions** (Supabase Dashboard Secrets):
```
BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY=your-bubble-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Deployment Checklist

- [ ] All secrets configured in Supabase Dashboard
- [ ] Edge Function `bubble-auth-proxy` deployed
- [ ] Edge Function `ai-signup-guest` deployed (if using AI signup)
- [ ] Frontend environment variables set
- [ ] Bubble workflows reachable from Edge Functions
- [ ] Supabase user table exists and is synced from Bubble
- [ ] SSL/HTTPS enabled for all endpoints

---

## Part 7: File Reference Map

### Frontend Components

| File | Purpose | Key Functions |
|------|---------|---------------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | Standard signup modal | `handleSignupSubmit()`, `renderSignupStep1/2()` |
| `app/src/islands/shared/AiSignupMarketReport.jsx` | AI guest signup | `submitSignup()`, email/phone extraction |
| `app/src/lib/auth.js` | Auth functions | `signupUser()`, `loginUser()`, `validateTokenAndFetchUser()` |
| `app/src/lib/secureStorage.js` | Token encryption | `setAuthToken()`, `getAuthToken()`, `clearAllAuthData()` |

### Edge Functions

| File | Purpose | Key Functions |
|------|---------|---------------|
| `supabase/functions/bubble-auth-proxy/index.ts` | Auth router | Routes signup to handler |
| `supabase/functions/bubble-auth-proxy/handlers/signup.ts` | Signup handler | `handleSignup()` - calls Bubble |
| `supabase/functions/bubble-auth-proxy/handlers/validate.ts` | Token validation | `handleValidate()` - queries Supabase |
| `supabase/functions/ai-signup-guest/index.ts` | AI signup endpoint | Calls Bubble `/wf/ai-signup-guest` |

### Documentation

| File | Purpose |
|------|---------|
| `docs/SIGNUP_FLOW_COMPLETE_TRACE.md` | Detailed step-by-step breakdown |
| `docs/SIGNUP_QUICK_REFERENCE.md` | Quick reference guide |
| `docs/LOGIN_PROCESS_MAP.md` | Login flow documentation |
| `supabase/SECRETS_SETUP.md` | Secrets configuration guide |

---

## Part 8: Troubleshooting

### Issue: Signup returns 200 but user not logged in

**Checklist**:
1. Check token is stored: DevTools → Application → Local Storage
   - Should have `__sl_at__` (encrypted token)
   - Should have `__sl_sid__` (encrypted user ID)
2. Check page reloaded: Look for page reload in console
3. Check Supabase user exists: Query `SELECT * FROM "user" WHERE _id = 'user_id'`
4. Check Bubble user exists: Check Bubble admin panel

### Issue: "User not found in Supabase" after signup

**Cause**: User created in Bubble but sync delay to Supabase

**Solution**:
1. Wait a few seconds for async sync to complete
2. Check if Bubble → Supabase sync workflow exists
3. Manually trigger sync or run scheduled job
4. Verify user exists in Bubble first

### Issue: "This email is already in use"

**Cause**: Email already registered in Bubble

**Solution**:
1. Use different email
2. Check if user already has account (login instead)
3. Contact support to recover account

### Issue: Edge Function returns 500

**Debug**:
1. Check Edge Function logs: Supabase Dashboard → Edge Functions → Logs
2. Check secrets configured: Settings → Secrets
3. Check Bubble API is reachable from Edge Functions
4. Check request format (camelCase for signup params!)

### Issue: Password validation failing

**Check**:
- Password minimum 4 characters
- Passwords match exactly (case-sensitive)
- No extra spaces in password
- Confirm password field has exact same value

---

## Part 9: Best Practices

### For Developers

1. **Always use Edge Functions**: Never call Bubble API directly from frontend
2. **Validate at every layer**: Frontend, Edge Function, Bubble
3. **Use camelCase for Bubble**: Bubble expects camelCase field names
4. **Clear auth on logout**: Always call `clearAllAuthData()` to clear tokens
5. **Handle page reload**: The `window.location.reload()` is intentional
6. **Check RLS policies**: Ensure Supabase RLS allows reading user table

### For Testing

1. **Manual signup test**:
   - Navigate to signup
   - Fill form with test data
   - Check browser console for logs
   - Check browser storage for tokens
   - Verify page reloads
   - Confirm user logged in

2. **Edge Function testing**:
   - Use Supabase logs to debug
   - Check request payload format
   - Verify Bubble API response
   - Test error scenarios

3. **Error recovery**:
   - Test invalid email format
   - Test password mismatch
   - Test network errors
   - Test Bubble API failures

---

## Summary

**Signup Architecture**:
- ✅ Two-step form (name/email → DOB/phone/password)
- ✅ Edge Functions proxy to Bubble.io
- ✅ Encrypted token storage
- ✅ User validation via Supabase sync
- ✅ AI-powered guest signup option
- ✅ No API keys exposed to frontend
- ✅ Layered validation (frontend → Edge → Bubble)

**Key Files**:
- Frontend: `SignUpLoginModal.jsx`, `auth.js`, `secureStorage.js`
- Backend: `bubble-auth-proxy/handlers/signup.ts`, `validate.ts`
- Config: Supabase Secrets, Edge Function environment

**Critical Details**:
- Bubble uses camelCase for field names
- Birth date must be ISO format (YYYY-MM-DD)
- Page reload after signup is intentional
- User synced from Bubble to Supabase asynchronously
- Tokens encrypted in localStorage, never in plain text
