# Split Lease - Signup Flow Documentation

**GENERATED**: 2025-12-11
**VERSION**: 2.0.0
**STATUS**: Production
**BACKEND**: Supabase Auth (Native) - No Bubble Dependency

---

## Overview

The Split Lease signup flow registers new users through a multi-step form that collects user information, creates accounts in Supabase Auth and public.user/account_host tables, and automatically logs the user in. This is a complete migration from the previous Bubble-based registration system.

---

## Architecture Diagram

```
+---------------------------------------------------------------------------+
|                            FRONTEND (React)                                |
+---------------------------------------------------------------------------+
|                                                                            |
|  +---------------------------------------------------------------------+   |
|  |                     SignUpLoginModal.jsx                            |   |
|  |  +----------------+     +----------------+                          |   |
|  |  |  Step 1        |---->|  Step 2        |                          |   |
|  |  |  Name + Email  |     |  DOB + Phone   |                          |   |
|  |  |                |     |  + Password    |                          |   |
|  |  +----------------+     +----------------+                          |   |
|  +---------------------------------------------------------------------+   |
|                                       |                                    |
|  +---------------------+              |                                    |
|  |    auth.js          |<-------------+                                    |
|  |  (signupUser fn)    |                                                   |
|  +---------------------+                                                   |
|            |                                                               |
+---------------------------------------------------------------------------+
             |
             v
+---------------------------------------------------------------------------+
|                        SUPABASE EDGE FUNCTION                              |
+---------------------------------------------------------------------------+
|                                                                            |
|  +---------------------+     +------------------------+                    |
|  | auth-user/index.ts  |---->| handlers/signup.ts     |                    |
|  | (Router)            |     | (Supabase Auth Native) |                    |
|  +---------------------+     +------------------------+                    |
|                                       |                                    |
+---------------------------------------------------------------------------+
                                        |
         +------------------------------+------------------------------+
         |                              |                              |
         v                              v                              v
+------------------+         +------------------+         +------------------+
|  SUPABASE AUTH   |         |  PUBLIC.USER     |         | ACCOUNT_HOST     |
|  (auth.users)    |         |  (user profile)  |         | (host account)   |
+------------------+         +------------------+         +------------------+
|                  |         |                  |         |                  |
| createUser()     |         | INSERT record    |         | INSERT record    |
| with metadata:   |         | _id = user_id    |         | _id = host_id    |
| - user_id        |         | email, name      |         | User = user_id   |
| - host_account_id|         | phone, DOB       |         |                  |
| - user_type      |         | user_type        |         |                  |
+------------------+         +------------------+         +------------------+
                                        |
                                        v
                             +------------------+
                             |   SYNC_QUEUE     |
                             | (Bubble Sync)    |
                             +------------------+
                             | Async background |
                             | sync to Bubble   |
                             | (non-blocking)   |
                             +------------------+
```

---

## Multi-Step Form Flow

### Form Steps Overview

```
+------------------------------------------------------------------------+
|                          SIGNUP STEP 1                                  |
|                       "Nice To Meet You!"                              |
+------------------------------------------------------------------------+
|                                                                        |
|  Fields:                                                               |
|  +------------------------------------------------------------------+ |
|  |  First Name *     [                    ]                         | |
|  |  Last Name *      [                    ]                         | |
|  |  Email *          [                    ]                         | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  Note: *Must match your government ID                                 |
|                                                                        |
|                    [ Continue ]                                        |
|                                                                        |
|              Have an account? Log In                                  |
+------------------------------------------------------------------------+
                              |
                              v
+------------------------------------------------------------------------+
|                          SIGNUP STEP 2                                  |
|                       "Hi, {firstName}!"                               |
+------------------------------------------------------------------------+
|                                                                        |
|  Fields:                                                               |
|  +------------------------------------------------------------------+ |
|  |  I am signing up to be *   [ A Guest (I would like to rent) v]  | |
|  |                                                                  | |
|  |  Birth Date *              [Month v] [Day v] [Year v]           | |
|  |                                                                  | |
|  |  Phone Number *            [                    ]                | |
|  |                                                                  | |
|  |  Password *                [                    ] [eye]          | |
|  |                                                                  | |
|  |  Re-enter Password *       [                    ] [eye]          | |
|  +------------------------------------------------------------------+ |
|                                                                        |
|  By signing up, you agree to Terms, Privacy Policy, and Guidelines.   |
|                                                                        |
|                    [ Agree and Sign Up ]                              |
|                                                                        |
|  <- Go Back                                                           |
+------------------------------------------------------------------------+
```

---

## Step-by-Step Flow

### Step 1: Form State Management (SignUpLoginModal.jsx)

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`

#### Signup Data State
```javascript
const [signupData, setSignupData] = useState({
  firstName: '',
  lastName: '',
  email: '',
  userType: defaultUserType === 'host' ? USER_TYPES.HOST : USER_TYPES.GUEST,
  birthMonth: '',
  birthDay: '',
  birthYear: '',
  phoneNumber: '',
  password: '',
  confirmPassword: ''
});
```

#### User Type Constants
```javascript
const USER_TYPES = {
  HOST: 'Host',
  GUEST: 'Guest'
};
```

---

### Step 2: Signup Step 1 - Basic Information

#### Fields Collected
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| First Name | `text` | Yes | Non-empty, trimmed |
| Last Name | `text` | Yes | Non-empty, trimmed |
| Email | `email` | Yes | Valid email format |

#### Step 1 Handler
```javascript
const handleSignupStep1Continue = (e) => {
  e.preventDefault();
  setError('');

  // Validate step 1 fields
  if (!signupData.firstName.trim()) {
    setError('First name is required.');
    return;
  }
  if (!signupData.lastName.trim()) {
    setError('Last name is required.');
    return;
  }
  if (!signupData.email.trim()) {
    setError('Email is required.');
    return;
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(signupData.email)) {
    setError('Please enter a valid email address.');
    return;
  }

  // Proceed to step 2
  goToSignupStep2();
};
```

---

### Step 3: Signup Step 2 - Additional Details & Password

#### Fields Collected
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| User Type | `select` | Yes | "Host" or "Guest" |
| Birth Month | `select` | Yes | 1-12 |
| Birth Day | `select` | Yes | 1-31 (dynamic) |
| Birth Year | `select` | Yes | Past 100 years |
| Phone Number | `tel` | Yes | Non-empty |
| Password | `password` | Yes | Min 4 characters |
| Confirm Password | `password` | Yes | Must match password |

#### Age Verification Function
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

#### Password Match Validation
```javascript
useEffect(() => {
  if (signupData.confirmPassword && signupData.password !== signupData.confirmPassword) {
    setPasswordMismatch(true);
  } else {
    setPasswordMismatch(false);
  }
}, [signupData.password, signupData.confirmPassword]);
```

---

### Step 4: Final Signup Submission

#### Validation Sequence
```javascript
const handleSignupSubmit = async (e) => {
  e.preventDefault();
  setError('');

  // 1. Validate date of birth
  if (!signupData.birthMonth || !signupData.birthDay || !signupData.birthYear) {
    setError('Please enter your date of birth.');
    return;
  }

  // 2. Validate age (18+)
  if (!isOver18(parseInt(signupData.birthMonth), parseInt(signupData.birthDay), parseInt(signupData.birthYear))) {
    setError('You must be at least 18 years old to use Split Lease.');
    return;
  }

  // 3. Validate phone number
  if (!signupData.phoneNumber.trim()) {
    setError('Phone number is required.');
    return;
  }

  // 4. Validate password
  if (!signupData.password) {
    setError('Password is required.');
    return;
  }

  if (signupData.password.length < 4) {
    setError('Password must be at least 4 characters.');
    return;
  }

  // 5. Validate password match
  if (signupData.password !== signupData.confirmPassword) {
    setError('Passwords do not match.');
    return;
  }

  setIsLoading(true);

  // Call signup function
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
    if (!skipReload) {
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  } else {
    setError(result.error || 'Signup failed. Please try again.');
  }
};
```

---

### Step 5: Authentication Library (auth.js)

**File**: `app/src/lib/auth.js`

#### signupUser Function
```javascript
export async function signupUser(email, password, retype, additionalData = {}) {
  try {
    // Input validation
    if (!email || !password || !retype) {
      return { success: false, error: 'Email, password, and confirmation are required.' };
    }

    if (password !== retype) {
      return { success: false, error: 'Passwords do not match.' };
    }

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('auth-user', {
      body: {
        action: 'signup',
        payload: {
          email,
          password,
          retype,
          additionalData
        }
      }
    });

    if (error || !data?.success) {
      const errorMsg = data?.error || error?.message || 'Signup failed.';
      return { success: false, error: errorMsg };
    }

    // Extract response data
    const { access_token, refresh_token, user_id, host_account_id, supabase_user_id, user_type, expires_in } = data.data;

    // Store authentication tokens (auto-login after signup)
    setAuthToken(access_token);
    setSessionId(user_id);
    setAuthState(true, user_id);
    setUserType(additionalData.userType || 'Guest');

    return {
      success: true,
      access_token,
      refresh_token,
      userId: user_id,
      hostAccountId: host_account_id,
      supabaseUserId: supabase_user_id
    };

  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
```

---

### Step 6: Edge Function Router (auth-user/index.ts)

**File**: `supabase/functions/auth-user/index.ts`

#### Request Format
```json
{
  "action": "signup",
  "payload": {
    "email": "user@example.com",
    "password": "userpassword",
    "retype": "userpassword",
    "additionalData": {
      "firstName": "John",
      "lastName": "Doe",
      "userType": "Guest",
      "birthDate": "1990-05-15",
      "phoneNumber": "(555) 123-4567"
    }
  }
}
```

#### Router to Signup Handler
```typescript
case 'signup':
  // Signup now uses Supabase Auth natively (no Bubble dependency)
  result = await handleSignup(supabaseUrl, supabaseServiceKey, payload);
  break;
```

---

### Step 7: Signup Handler (handlers/signup.ts)

**File**: `supabase/functions/auth-user/handlers/signup.ts`

This handler performs a **multi-step atomic operation** entirely within Supabase (no Bubble dependency).

#### Complete Handler Flow

```typescript
export async function handleSignup(
  supabaseUrl: string,
  supabaseServiceKey: string,
  payload: any
): Promise<any> {
  // Validate required fields
  validateRequiredFields(payload, ['email', 'password', 'retype']);
  const { email, password, retype, additionalData } = payload;

  // Extract additional signup data
  const {
    firstName = '',
    lastName = '',
    userType = 'Guest',
    birthDate = '',
    phoneNumber = ''
  } = additionalData || {};

  // Client-side validation
  if (password.length < 4) {
    throw new BubbleApiError('Password must be at least 4 characters long.', 400);
  }

  if (password !== retype) {
    throw new BubbleApiError('The two passwords do not match!', 400);
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new BubbleApiError('Please enter a valid email address.', 400);
  }

  // Initialize Supabase admin client
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // ========== STEP 1: CHECK FOR EXISTING USER ==========
  // Check in public.user table
  const { data: existingUser } = await supabaseAdmin
    .from('user')
    .select('_id, email')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existingUser) {
    throw new BubbleApiError('This email is already in use.', 400, 'USED_EMAIL');
  }

  // Check in Supabase Auth
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (existingAuthUser) {
    throw new BubbleApiError('This email is already in use.', 400, 'USED_EMAIL');
  }

  // ========== STEP 2: GENERATE BUBBLE-STYLE IDs ==========
  const { data: generatedUserId } = await supabaseAdmin.rpc('generate_bubble_id');
  const { data: generatedHostId } = await supabaseAdmin.rpc('generate_bubble_id');

  // ========== STEP 3: CREATE SUPABASE AUTH USER ==========
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true, // Auto-confirm for immediate login
    user_metadata: {
      user_id: generatedUserId,
      host_account_id: generatedHostId,
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      birth_date: birthDate,
      phone_number: phoneNumber
    }
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new BubbleApiError('This email is already in use.', 400, 'USED_EMAIL');
    }
    throw new BubbleApiError(`Failed to create account: ${authError.message}`, 500);
  }

  const supabaseUserId = authData.user?.id;

  // ========== STEP 4: SIGN IN TO GET SESSION TOKENS ==========
  const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (signInError || !sessionData.session) {
    // Clean up auth user on failure
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId!);
    throw new BubbleApiError('Failed to create session. Please try again.', 500);
  }

  const { access_token, refresh_token, expires_in } = sessionData.session;

  // ========== STEP 5: CREATE DATABASE RECORDS ==========
  const now = new Date().toISOString();
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

  // Insert into account_host table
  const hostAccountRecord = {
    '_id': generatedHostId,
    'User': generatedUserId,
    'HasClaimedListing': false,
    'Receptivity': 0,
    'Created Date': now,
    'Modified Date': now,
    'bubble_id': null
  };

  const { error: hostInsertError } = await supabaseAdmin
    .from('account_host')
    .insert(hostAccountRecord);

  if (hostInsertError) {
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId!);
    throw new BubbleApiError(`Failed to create host account: ${hostInsertError.message}`, 500);
  }

  // Insert into public.user table
  const userRecord = {
    '_id': generatedUserId,
    'bubble_id': null,
    'email': email.toLowerCase(),
    'email as text': email.toLowerCase(),
    'Name - First': firstName || null,
    'Name - Last': lastName || null,
    'Name - Full': fullName,
    'Date of Birth': birthDate ? new Date(birthDate).toISOString() : null,
    'Phone Number (as text)': phoneNumber || null,
    'Type - User Current': userType || 'Guest',
    'Type - User Signup': userType || 'Guest',
    'Account - Host / Landlord': generatedHostId,
    'Created Date': now,
    'Modified Date': now,
    'authentication': {},
    'user_signed_up': true
  };

  const { error: userInsertError } = await supabaseAdmin
    .from('user')
    .insert(userRecord);

  if (userInsertError) {
    // Clean up: delete host account and auth user
    await supabaseAdmin.from('account_host').delete().eq('_id', generatedHostId);
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId!);
    throw new BubbleApiError(`Failed to create user profile: ${userInsertError.message}`, 500);
  }

  // ========== STEP 6: QUEUE BUBBLE SYNC (NON-BLOCKING) ==========
  try {
    await enqueueSignupSync(supabaseAdmin, generatedUserId, generatedHostId);
    triggerQueueProcessing(); // Fire-and-forget
  } catch (syncQueueError) {
    // Log but don't fail signup - queue item will be processed later by pg_cron
    console.error('[signup] Failed to queue Bubble sync (non-blocking):', syncQueueError);
  }

  // Return session and user data
  return {
    access_token,
    refresh_token,
    expires_in,
    user_id: generatedUserId,
    host_account_id: generatedHostId,
    supabase_user_id: supabaseUserId,
    user_type: userType
  };
}
```

---

## Data Flow Diagram

```
User Input                   Edge Function                    Backends
----------                   -------------                    --------

+---------------+
|  firstName    |
|  lastName     |
|  email        |
|  password     |----------------------------------> Supabase Auth
|  retype       |                                    createUser()
|  userType     |                                         |
|  birthDate    |                                         |
|  phoneNumber  |                                         v
+---------------+                                  +--------------+
       |                                           |   Creates    |
       |                                           |   auth.users |
       |                                           |    record    |
       |                                           +--------------+
       |                                                  |
       v                                                  v
+--------------+                                  +--------------+
|  signup.ts   |<---------------------------------|   Returns    |
|  (Handler)   |         Session tokens           |   session    |
+--------------+                                  +--------------+
       |
       +----------------------------------------> Supabase DB
       |                                          account_host
       |                                          INSERT record
       |                                               |
       +----------------------------------------> Supabase DB
       |                                          public.user
       |                                          INSERT record
       |                                               |
       +----------------------------------------> sync_queue
                                                  Bubble Sync
                                                  (async, non-blocking)
```

---

## Database Schema

### public.user Table (Supabase)

| Column | Type | Description |
|--------|------|-------------|
| `_id` | `text` (PK) | Generated Bubble-style ID |
| `email` | `text` | User email |
| `email as text` | `text` | User email (legacy field) |
| `Name - First` | `text` | First name |
| `Name - Last` | `text` | Last name |
| `Name - Full` | `text` | Full name (computed) |
| `Date of Birth` | `timestamp` | Birth date |
| `Phone Number (as text)` | `text` | Phone number |
| `Type - User Current` | `text` | Current user type (Host/Guest) |
| `Type - User Signup` | `text` | Signup user type |
| `Account - Host / Landlord` | `text` | FK to account_host._id |
| `Created Date` | `timestamp` | Creation timestamp |
| `Modified Date` | `timestamp` | Last modified timestamp |
| `authentication` | `jsonb` | Auth metadata |
| `user_signed_up` | `boolean` | Signup complete flag |
| `bubble_id` | `text` | Bubble user ID (synced later) |

### account_host Table (Supabase)

| Column | Type | Description |
|--------|------|-------------|
| `_id` | `text` (PK) | Generated Bubble-style ID |
| `User` | `text` | FK to user._id |
| `HasClaimedListing` | `boolean` | Whether host has claimed a listing |
| `Receptivity` | `number` | Host receptivity score |
| `Created Date` | `timestamp` | Creation timestamp |
| `Modified Date` | `timestamp` | Last modified timestamp |
| `bubble_id` | `text` | Bubble ID (synced later) |

### auth.users Table (Supabase Auth)

| Field | Description |
|-------|-------------|
| `id` | Supabase Auth UUID |
| `email` | User email |
| `email_confirmed_at` | Auto-confirmed on signup |
| `user_metadata.user_id` | Generated user._id |
| `user_metadata.host_account_id` | Generated account_host._id |
| `user_metadata.first_name` | First name |
| `user_metadata.last_name` | Last name |
| `user_metadata.user_type` | "Host" or "Guest" |
| `user_metadata.birth_date` | ISO date string |
| `user_metadata.phone_number` | Phone number |

---

## ID Generation

### Bubble-Style IDs

Split Lease uses Bubble-compatible IDs for interoperability:

```typescript
// Generate IDs using the database function
const { data: generatedUserId } = await supabaseAdmin.rpc('generate_bubble_id');
const { data: generatedHostId } = await supabaseAdmin.rpc('generate_bubble_id');
```

**Example ID Format**: `1733904567890x123456789012345` (timestamp + random)

---

## Error Handling

### Validation Errors (Frontend)

| Error Scenario | User Message |
|----------------|--------------|
| Empty first name | "First name is required." |
| Empty last name | "Last name is required." |
| Empty email | "Email is required." |
| Invalid email | "Please enter a valid email address." |
| Missing DOB | "Please enter your date of birth." |
| Under 18 | "You must be at least 18 years old to use Split Lease." |
| Empty phone | "Phone number is required." |
| Empty password | "Password is required." |
| Short password | "Password must be at least 4 characters." |
| Password mismatch | "Passwords do not match." |

### Backend Errors (Edge Function)

| Error Reason | User Message |
|--------------|--------------|
| `NOT_VALID_EMAIL` | "Please enter a valid email address." |
| `USED_EMAIL` | "This email is already in use." |
| `DO_NOT_MATCH` | "The two passwords do not match!" |
| Default | "Signup failed. Please try again." |

### Error Response Format
```json
{
  "success": false,
  "error": "This email is already in use."
}
```

---

## Post-Signup Actions

### 1. Auto-Login
After successful signup, the user is automatically logged in:
```javascript
// Store authentication tokens
setAuthToken(access_token);
setSessionId(user_id);
setAuthState(true, user_id);
setUserType(additionalData.userType || 'Guest');
```

### 2. Page Reload
```javascript
if (!skipReload) {
  setTimeout(() => {
    window.location.reload();
  }, 500);
}
```

### 3. Auth Success Callback
```javascript
if (onAuthSuccess) {
  onAuthSuccess(result);
}
```

### 4. Bubble Sync (Background)
The signup is queued for background sync to Bubble:
```typescript
await enqueueSignupSync(supabaseAdmin, generatedUserId, generatedHostId);
triggerQueueProcessing(); // Non-blocking, fire-and-forget
```

---

## Atomic Rollback

If any step fails during signup, all previous steps are rolled back:

```typescript
try {
  // Create auth user
  const authData = await supabaseAdmin.auth.admin.createUser(...);

  // Get session
  const sessionData = await supabaseAdmin.auth.signInWithPassword(...);
  if (signInError) {
    // Rollback: delete auth user
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
    throw error;
  }

  // Create host account
  const hostInsertResult = await supabaseAdmin.from('account_host').insert(...);
  if (hostInsertError) {
    // Rollback: delete auth user
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
    throw error;
  }

  // Create user record
  const userInsertResult = await supabaseAdmin.from('user').insert(...);
  if (userInsertError) {
    // Rollback: delete host account and auth user
    await supabaseAdmin.from('account_host').delete().eq('_id', generatedHostId);
    await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
    throw error;
  }
} catch (error) {
  // Error already handled with rollback above
  throw error;
}
```

---

## Related Files

### Frontend
| File | Purpose |
|------|---------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | Signup UI component |
| `app/src/lib/auth.js` | signupUser function |
| `app/src/lib/secureStorage.js` | Token storage utilities |
| `app/src/lib/supabase.js` | Supabase client |
| `app/src/lib/constants.js` | Auth configuration |

### Backend
| File | Purpose |
|------|---------|
| `supabase/functions/auth-user/index.ts` | Auth router |
| `supabase/functions/auth-user/handlers/signup.ts` | Signup handler (Supabase Native) |
| `supabase/functions/_shared/errors.ts` | Error classes |
| `supabase/functions/_shared/validation.ts` | Input validation |
| `supabase/functions/_shared/queueSync.ts` | Bubble sync queue utilities |

---

## Security Considerations

### 1. Password Requirements
- Minimum 4 characters
- Confirmation required (retype)
- Never stored in plain text (Supabase Auth handles hashing)

### 2. Age Verification
- Calculated from DOB fields
- Must be 18+ to register
- Validated on frontend before submission

### 3. Email Auto-Confirmation
- Email is auto-confirmed in Supabase Auth (`email_confirm: true`)
- No email verification step required
- Enables immediate login after signup

### 4. API Key Protection
- Supabase service role key stored server-side in Edge Function secrets
- Used for admin operations (createUser, deleteUser)
- Never exposed to frontend code

### 5. Atomic Operations
- All steps must succeed or all are rolled back
- No partial registrations possible
- Ensures data consistency

---

## Authentication Backend Comparison

| Feature | Old (Bubble) | New (Supabase Auth) |
|---------|--------------|---------------------|
| User Creation | Bubble Workflow API | Supabase Admin createUser |
| Token Type | Bubble Token | JWT (access + refresh) |
| Password Hashing | Bubble | Supabase Auth (bcrypt) |
| Email Verification | N/A | Auto-confirmed |
| ID Generation | Bubble-managed | generate_bubble_id() RPC |
| User Profile | Bubble Database | public.user table |
| Host Account | Bubble Database | account_host table |
| Bubble Sync | Synchronous | Async via sync_queue |

---

## Testing Checklist

### Step 1 Validation
- [ ] Empty first name shows error
- [ ] Empty last name shows error
- [ ] Empty email shows error
- [ ] Invalid email format shows error
- [ ] Valid step 1 proceeds to step 2

### Step 2 Validation
- [ ] User type dropdown works (Host/Guest)
- [ ] Date picker works correctly
- [ ] Under 18 age shows error
- [ ] Empty phone shows error
- [ ] Short password shows error
- [ ] Password mismatch shows inline error
- [ ] Password match shows success indicator
- [ ] Password visibility toggle works

### Backend Integration
- [ ] Supabase Auth user created successfully
- [ ] account_host record created
- [ ] public.user record created
- [ ] JWT tokens returned and stored
- [ ] Auto-login works after signup
- [ ] Duplicate email shows appropriate error
- [ ] Rollback works on failure

### Post-Signup
- [ ] Page reloads after signup
- [ ] User shown as logged in
- [ ] User type stored correctly
- [ ] Can immediately access authenticated features
- [ ] Bubble sync queued (non-blocking)

---

**DOCUMENT_VERSION**: 2.0.0
**LAST_UPDATED**: 2025-12-11
**AUTHOR**: Claude Code
**MIGRATION**: Bubble -> Supabase Auth (Native)
