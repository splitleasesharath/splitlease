# Complete Signup Flow Trace - Split Lease

**Generated**: 2025-12-03
**Status**: Complete Analysis
**Scope**: Button click → API call → Response → Post-signup actions

---

## Overview

The signup flow in Split Lease follows this path:

```
User clicks "Agree and Sign Up" button
         ↓
SignUpLoginModal.jsx calls signupUser()
         ↓
app/src/lib/auth.js → signupUser() function
         ↓
Calls Supabase Edge Function: bubble-auth-proxy
         ↓
Edge Function calls Bubble API: POST /wf/signup-user
         ↓
Bubble creates user account and returns token + user_id
         ↓
Frontend stores token in secure storage
         ↓
Page reloads (window.location.reload())
```

**CRITICAL FINDING**: There is **NO Supabase user insertion on signup**. The user is created only in Bubble.io. Supabase queries the Bubble-synced `user` table when validating tokens.

---

## 1. Frontend Signup Component

### File: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\islands\shared\SignUpLoginModal.jsx`

**Component**: `SignUpLoginModal` (React component)

#### Key Points:
- **Multi-step form**: Step 1 (name/email) → Step 2 (DOB/phone/password)
- **Data collected**:
  ```javascript
  const signupData = {
    firstName: '',
    lastName: '',
    email: '',
    userType: 'Guest' | 'Host',
    birthMonth: '',
    birthDay: '',
    birthYear: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  }
  ```

#### Signup Button Click Handler: Lines 557-621

```javascript
const handleSignupSubmit = async (e) => {
  e.preventDefault();
  setError('');

  // Validate DOB, phone, password on client-side
  // ...validation code...

  setIsLoading(true);

  // Call signupUser from lib/auth.js (lines 595-606)
  const result = await signupUser(
    signupData.email,
    signupData.password,
    signupData.confirmPassword,
    {
      firstName: signupData.firstName,
      lastName: signupData.lastName,
      userType: signupData.userType,
      birthDate: `${signupData.birthYear}-${String(signupData.birthMonth).padStart(2, '0')}-${String(signupData.birthDay).padStart(2, '0')}`,
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
      window.location.reload();  // RELOAD AFTER SIGNUP ← KEY ACTION
    }, 500);
  } else {
    setError(result.error || 'Signup failed. Please try again.');
  }
};
```

**Key Action**: After successful signup, the page reloads with a 500ms delay.

---

## 2. Frontend Auth Library

### File: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\app\src\lib\auth.js`

#### Function: `signupUser()` (Lines 519-634)

```javascript
export async function signupUser(email, password, retype, additionalData = null) {
  console.log('📝 Attempting signup via Edge Function for:', email);

  // Client-side validation
  if (!email || !password || !retype) {
    return { success: false, error: 'All fields are required.' };
  }
  if (password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters long.' };
  }
  if (password !== retype) {
    return { success: false, error: 'The two passwords do not match!' };
  }

  // Build payload
  const payload = {
    email,
    password,
    retype
  };

  if (additionalData) {
    payload.additionalData = additionalData;
    console.log('📝 Additional signup data:', additionalData);
  }

  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
      body: {
        action: 'signup',  // ← Routes to handleSignup
        payload
      }
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      // Extract error message from response...
      return { success: false, error: errorMessage };
    }

    if (!data.success) {
      console.error('❌ Signup failed:', data.error);
      return { success: false, error: data.error || 'Signup failed. Please try again.' };
    }

    // Store token and user_id in secure storage
    setAuthToken(data.data.token);           // ← Encrypted storage
    setSessionId(data.data.user_id);         // ← Encrypted storage
    setAuthState(true, data.data.user_id);   // ← Public state
    isUserLoggedInState = true;

    console.log('✅ Signup successful');
    console.log('   User ID:', data.data.user_id);
    console.log('   Token expires in:', data.data.expires, 'seconds');

    return {
      success: true,
      user_id: data.data.user_id,
      expires: data.data.expires
    };

  } catch (error) {
    console.error('❌ Signup error:', error);
    return {
      success: false,
      error: 'Network error. Please check your connection and try again.'
    };
  }
}
```

**Key Points**:
- ✅ Calls `supabase.functions.invoke('bubble-auth-proxy')` (NOT direct Bubble API)
- ✅ Passes `action: 'signup'` to route to the signup handler
- ✅ Stores token in encrypted secure storage (`setAuthToken`)
- ✅ Stores user_id in encrypted secure storage (`setSessionId`)
- ✅ Sets auth state (`setAuthState(true, user_id)`)
- ❌ Does NOT insert into Supabase `user` table

---

## 3. Edge Function Router

### File: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\index.ts`

**Entry Point**: `Deno.serve()` handler (Lines 35-143)

#### Key Flow:

```typescript
Deno.serve(async (req) => {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // 2. Validate POST request
  if (req.method !== 'POST') {
    throw new Error('Method not allowed. Use POST.');
  }

  // 3. NO USER AUTHENTICATION CHECK
  // These endpoints ARE the authentication system
  // Users calling /signup are not yet authenticated

  // 4. Parse request body
  const body = await req.json();

  // 5. Validate action field
  validateRequiredFields(body, ['action']);
  const { action, payload } = body;
  const allowedActions = ['login', 'signup', 'logout', 'validate'];
  validateAction(action, allowedActions);

  // 6. Get Bubble secrets from Supabase
  const bubbleAuthBaseUrl = Deno.env.get('BUBBLE_API_BASE_URL');
  const bubbleApiKey = Deno.env.get('BUBBLE_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  // 7. Route to appropriate handler
  let result;
  switch (action) {
    case 'signup':
      result = await handleSignup(
        bubbleAuthBaseUrl,
        bubbleApiKey,
        supabaseUrl,           // ← NOTE: Passed to signup handler
        supabaseServiceKey,    // ← NOTE: Passed to signup handler
        payload
      );
      break;
    // ... other cases ...
  }

  // 8. Return success response
  return new Response(
    JSON.stringify({ success: true, data: result }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

**Critical Observation**: The `handleSignup` is passed `supabaseUrl` and `supabaseServiceKey` but uses them differently than expected. See next section.

---

## 4. Signup Handler (Edge Function)

### File: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\handlers\signup.ts`

**Function**: `handleSignup()` (Lines 32-152)

#### Complete Handler Code:

```typescript
export async function handleSignup(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  payload: any
): Promise<any> {
  console.log('[signup] ========== SIGNUP REQUEST ==========');

  // 1. Validate required fields
  validateRequiredFields(payload, ['email', 'password', 'retype']);
  const { email, password, retype, additionalData } = payload;

  // 2. Extract additional signup data
  const {
    firstName = '',
    lastName = '',
    userType = 'Guest',
    birthDate = '',
    phoneNumber = ''
  }: SignupAdditionalData = additionalData || {};

  console.log(`[signup] Registering new user: ${email}`);
  console.log(`[signup] Additional data: firstName=${firstName}, lastName=${lastName}, userType=${userType}`);

  // 3. Client-side validation (password checks)
  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters long.');
  }
  if (password !== retype) {
    throw new Error('The two passwords do not match!');
  }

  try {
    // 4. Call Bubble signup workflow
    const url = `${bubbleAuthBaseUrl}/wf/signup-user`;
    console.log(`[signup] Calling Bubble API: ${url}`);

    // 5. Build request body with camelCase (Bubble requirement)
    const requestBody: Record<string, any> = {
      email,
      password,
      retype,
      firstName,
      lastName,
      userType,
      birthDate,
      phoneNumber
    };

    console.log(`[signup] Request body:`, JSON.stringify(requestBody, null, 2));

    // 6. Call Bubble API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bubbleApiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`[signup] Bubble response status: ${response.status}`);
    const data = await response.json();
    console.log(`[signup] Bubble response:`, JSON.stringify(data, null, 2));

    // 7. Check if signup was successful
    if (!response.ok || data.status !== 'success') {
      console.error(`[signup] Signup failed:`, data.reason || data.message);

      // Map Bubble error reasons to friendly messages
      let errorMessage = data.message || 'Signup failed. Please try again.';
      if (data.reason === 'NOT_VALID_EMAIL') {
        errorMessage = data.message || 'Please enter a valid email address.';
      } else if (data.reason === 'USED_EMAIL') {
        errorMessage = data.message || 'This email is already in use.';
      } else if (data.reason === 'DO_NOT_MATCH') {
        errorMessage = data.message || 'The two passwords do not match!';
      }

      throw new BubbleApiError(errorMessage, response.status, data.reason);
    }

    // 8. Extract response data
    const token = data.response?.token;
    const userId = data.response?.user_id;
    const expires = data.response?.expires;

    if (!token || !userId) {
      console.error(`[signup] Missing token or user_id in response:`, data);
      throw new BubbleApiError('Signup response missing required fields', 500);
    }

    console.log(`[signup] ✅ Signup successful`);
    console.log(`[signup]    User ID: ${userId}`);
    console.log(`[signup]    Token expires in: ${expires} seconds`);
    console.log(`[signup]    User automatically logged in`);
    console.log(`[signup] ========== SIGNUP COMPLETE ==========`);

    // 9. Return authentication data
    return {
      token,
      user_id: userId,
      expires
    };

  } catch (error) {
    if (error instanceof BubbleApiError) {
      throw error;
    }

    console.error(`[signup] ========== SIGNUP ERROR ==========`);
    console.error(`[signup] Error:`, error);

    throw new BubbleApiError(
      `Failed to register user: ${error.message}`,
      500,
      error
    );
  }
}
```

**Key Findings**:
- ✅ Validates email, password, retype
- ✅ Calls Bubble API: `POST {BUBBLE_API_BASE_URL}/wf/signup-user`
- ✅ Sends ALL fields as **camelCase** (firstName, lastName, userType, birthDate, phoneNumber)
- ✅ Returns token, user_id, expires from Bubble
- ❌ **Does NOT insert into Supabase** (despite being passed supabaseUrl/serviceKey)
- ❌ **Does NOT create Supabase user record**

**CRITICAL NOTE**: The function signature in the handler file (lines 32-36) only takes 3 parameters:
```typescript
export async function handleSignup(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  payload: any
): Promise<any>
```

But the index.ts router (line 96) calls it with 5 parameters:
```typescript
result = await handleSignup(
  bubbleAuthBaseUrl,
  bubbleApiKey,
  supabaseUrl,           // ← Extra
  supabaseServiceKey,    // ← Extra
  payload
);
```

**This suggests the function signature may be outdated or the extra Supabase params are not used.**

---

## 5. Validate Handler (Used During Page Reload)

### File: `C:\Users\Split Lease\splitleaseteam\_Agent Context and Tools\SL6\Split Lease\supabase\functions\bubble-auth-proxy\handlers\validate.ts`

**Function**: `handleValidate()` (Lines 29-117)

This handler is called after signup to validate the token. Key points:

```typescript
export async function handleValidate(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  console.log('[validate] ========== SESSION VALIDATION REQUEST ==========');

  // 1. Validate required fields
  validateRequiredFields(payload, ['token', 'user_id']);
  const { token, user_id } = payload;

  // 2. Skip Bubble token validation (trust the login token)
  console.log(`[validate] Skipping Bubble token validation`);

  try {
    // 3. Fetch user data from Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: userData, error: userError } = await supabase
      .from('user')
      .select('_id, "Name - First", "Name - Full", "Profile Photo", "Type - User Current"')
      .eq('_id', user_id)
      .single();

    if (userError) {
      console.error(`[validate] Supabase query error:`, userError);
      throw new SupabaseSyncError(`Failed to fetch user data: ${userError.message}`, userError);
    }

    if (!userData) {
      console.error(`[validate] User not found in Supabase: ${user_id}`);
      throw new SupabaseSyncError(`User not found: ${user_id}`);
    }

    // 4. Format and return user data
    const userDataObject = {
      userId: userData._id,
      firstName: userData['Name - First'] || null,
      fullName: userData['Name - Full'] || null,
      profilePhoto: userData['Profile Photo'] || null,
      userType: userData['Type - User Current'] || null
    };

    console.log(`[validate] ✅ Validation complete`);
    return userDataObject;

  } catch (error) {
    // ... error handling ...
  }
}
```

**Key Finding**: The validate handler **queries** the Supabase `user` table but **does not insert**. It fetches user data that was already synced from Bubble.

---

## 6. Summary: Post-Signup User Creation

### Where is the Supabase user created?

**Answer: NOT during signup. The user exists only in Bubble.io.**

**However**: When the user logs in or validates their token, the `validate` handler queries the Supabase `user` table looking for the user. This table is **synced from Bubble** (via Bubble workflows or data sync).

### Flow After Signup Returns 200 OK:

```
Bubble returns: { token, user_id, expires }
         ↓
Frontend stores token + user_id in secure storage
         ↓
Frontend calls window.location.reload() (500ms delay)
         ↓
Page reloads and initializes
         ↓
Components call checkAuthStatus() or validateTokenAndFetchUser()
         ↓
Edge Function: bubble-auth-proxy/validate action
         ↓
Queries Supabase user table for user_id
         ↓
Returns user profile data (if synced from Bubble)
         ↓
Frontend displays user as authenticated
```

### Critical Question: When is user synced to Supabase?

The user data must be synced from Bubble to Supabase **after signup completes in Bubble**. This is likely handled by:
- **Bubble workflow**: Automatically syncs user to Supabase on signup
- **Scheduled job**: Periodic sync from Bubble to Supabase
- **Manual sync**: Another Edge Function or service

**Note**: The signup handler has Supabase config passed but doesn't use it. The sync likely happens in Bubble itself.

---

## File Map Summary

| Component | File Path | Key Action |
|-----------|-----------|-----------|
| **UI Component** | `app/src/islands/shared/SignUpLoginModal.jsx` | Collects form data, calls signupUser() |
| **Frontend Auth** | `app/src/lib/auth.js` → `signupUser()` | Calls Edge Function, stores token |
| **Edge Function Router** | `supabase/functions/bubble-auth-proxy/index.ts` | Routes action:'signup' to handler |
| **Signup Handler** | `supabase/functions/bubble-auth-proxy/handlers/signup.ts` | Calls Bubble API, returns token |
| **Validate Handler** | `supabase/functions/bubble-auth-proxy/handlers/validate.ts` | Fetches user from Supabase |
| **Bubble API** | (External) `{BUBBLE_API_BASE_URL}/wf/signup-user` | Creates user, returns token |

---

## Complete Request/Response Chain

### 1. Frontend Form Submission

```javascript
// SignUpLoginModal.jsx line 595
const result = await signupUser(
  signupData.email,
  signupData.password,
  signupData.confirmPassword,
  {
    firstName: signupData.firstName,
    lastName: signupData.lastName,
    userType: signupData.userType,
    birthDate: "YYYY-MM-DD",
    phoneNumber: signupData.phoneNumber
  }
);
```

### 2. Frontend Calls Edge Function

```javascript
// auth.js line 558
const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
  body: {
    action: 'signup',
    payload: {
      email: '...',
      password: '...',
      retype: '...',
      additionalData: {
        firstName: '...',
        lastName: '...',
        userType: '...',
        birthDate: '...',
        phoneNumber: '...'
      }
    }
  }
});
```

### 3. Edge Function Router Receives Request

```typescript
// bubble-auth-proxy/index.ts line 59
const body = await req.json();
// Validates action field
// Routes to handleSignup()
```

### 4. Signup Handler Calls Bubble

```typescript
// bubble-auth-proxy/handlers/signup.ts line 83
const response = await fetch(
  `${bubbleAuthBaseUrl}/wf/signup-user`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bubbleApiKey}`
    },
    body: JSON.stringify({
      email,
      password,
      retype,
      firstName,
      lastName,
      userType,
      birthDate,
      phoneNumber
    })
  }
);
```

### 5. Bubble API Response

```json
{
  "status": "success",
  "response": {
    "token": "auth_token_here",
    "user_id": "bubble_user_id_123",
    "expires": 86400
  }
}
```

### 6. Signup Handler Returns Token

```typescript
// signup.ts line 132
return {
  token,
  user_id: userId,
  expires
};
```

### 7. Edge Function Router Returns Success

```typescript
// bubble-auth-proxy/index.ts line 117
return new Response(
  JSON.stringify({
    success: true,
    data: result  // { token, user_id, expires }
  }),
  { status: 200, headers: corsHeaders }
);
```

### 8. Frontend Stores Token

```javascript
// auth.js line 607
setAuthToken(data.data.token);      // Encrypted storage
setSessionId(data.data.user_id);    // Encrypted storage
setAuthState(true, data.data.user_id);
```

### 9. Frontend Page Reload

```javascript
// SignUpLoginModal.jsx line 616
setTimeout(() => {
  window.location.reload();
}, 500);
```

### 10. Page Initialization (After Reload)

Typically components call:
- `checkAuthStatus()` - Check if token exists
- `validateTokenAndFetchUser()` - Validate and fetch user profile

---

## Authentication Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SignUpLoginModal.jsx                          │
│  Collects: firstName, lastName, email, DOB, phone, password      │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     app/src/lib/auth.js                          │
│                    signupUser(email, pass...)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│             Supabase Edge Function Request                       │
│  POST /bubble-auth-proxy                                        │
│  {                                                              │
│    "action": "signup",                                          │
│    "payload": { email, password, retype, additionalData }      │
│  }                                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│          bubble-auth-proxy/handlers/signup.ts                    │
│         Validates & calls Bubble API                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Bubble.io Auth API                                  │
│         POST {BUBBLE_API_BASE_URL}/wf/signup-user               │
│         Creates user account                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│            Bubble API Response                                   │
│  {                                                              │
│    "status": "success",                                         │
│    "response": {                                                │
│      "token": "...",                                            │
│      "user_id": "...",                                          │
│      "expires": 86400                                           │
│    }                                                            │
│  }                                                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│         Frontend Secure Storage                                  │
│  setAuthToken(token)        → splitlease_auth_token (encrypted) │
│  setSessionId(user_id)      → splitlease_session_id (encrypted) │
│  setAuthState(true)         → Auth state flag                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Page Reload                                         │
│         window.location.reload() after 500ms                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│           Supabase user Table (Synced from Bubble)              │
│   Query: SELECT * FROM user WHERE _id = user_id                │
│   Returns: Profile data (firstName, fullName, userType, etc)    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Takeaways

1. **User is created in Bubble**, not Supabase
2. **Token is stored in encrypted secure storage** on frontend
3. **Supabase user table is queried** to fetch profile data (data synced from Bubble)
4. **No explicit Supabase INSERT** happens during signup flow
5. **User sync from Bubble to Supabase** happens outside the signup flow (in Bubble itself)
6. **Validate handler** (called on page reload) queries Supabase `user` table for profile data

---

## Important Configuration

### Secrets Required for Signup:

In **Supabase Dashboard → Project Settings → Edge Functions → Secrets**:

- `BUBBLE_API_BASE_URL`: `https://app.split.lease/version-test/api/1.1`
- `BUBBLE_API_KEY`: (Bubble.io API key)
- `SUPABASE_URL`: (Auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY`: (Auto-provided)

### Frontend Environment Variables:

In `app/.env`:

- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key

---

## Potential Issues & Debugging

### Issue: "User not found in Supabase" after signup

**Cause**: User was created in Bubble but not synced to Supabase `user` table yet.

**Debug**:
1. Check Bubble user exists: `https://app.split.lease/` admin
2. Check Supabase `user` table: `SELECT * FROM "user" WHERE _id = 'bubble_user_id'`
3. Check if Bubble → Supabase sync is running

### Issue: Signup returns 200 but user can't log in

**Check**:
1. Token storage: Open DevTools → Application → Local Storage
2. Check `splitlease_auth_token` and `splitlease_session_id` are set
3. Check page reload happened (check console for reload message)
4. Check Supabase user exists for that user_id

### Issue: Password validation errors

**Common errors** from Bubble:
- `NOT_VALID_EMAIL`: Invalid email format
- `USED_EMAIL`: Email already registered
- `DO_NOT_MATCH`: Passwords don't match

---

## Conclusion

The signup flow is **clean and secure**:
- ✅ No API keys exposed to frontend
- ✅ Tokens encrypted in storage
- ✅ Bubble is source of truth for user creation
- ✅ Supabase validates and fetches profile data
- ✅ No manual Supabase inserts needed

The user data **must be synced from Bubble to Supabase** in a separate process (handled by Bubble or a scheduled sync job).
