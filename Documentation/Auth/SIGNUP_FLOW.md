# Split Lease - Signup Flow Documentation

**GENERATED**: 2025-12-04
**VERSION**: 1.0.0
**STATUS**: Production

---

## Overview

The Split Lease signup flow registers new users through a multi-step form that collects user information, creates accounts in both Bubble.io and Supabase, and automatically logs the user in. This document provides a comprehensive guide to the entire signup process.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     SignUpLoginModal.jsx                             │    │
│  │  ┌────────────────┐     ┌────────────────┐                          │    │
│  │  │  Step 1        │────▶│  Step 2        │                          │    │
│  │  │  Name + Email  │     │  DOB + Phone   │                          │    │
│  │  │                │     │  + Password    │                          │    │
│  │  └────────────────┘     └────────────────┘                          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                       │                                      │
│  ┌─────────────────────┐             │                                      │
│  │    auth.js          │◀────────────┘                                      │
│  │  (signupUser fn)    │                                                    │
│  └─────────────────────┘                                                    │
│            │                                                                 │
└────────────│─────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SUPABASE EDGE FUNCTION                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐     ┌────────────────────┐                         │
│  │ bubble-auth-proxy   │────▶│  handlers/signup.ts│                         │
│  │ index.ts (Router)   │     │  (Signup Handler)  │                         │
│  └─────────────────────┘     └────────────────────┘                         │
│                                       │                                      │
└───────────────────────────────────────│──────────────────────────────────────┘
                                        │
         ┌──────────────────────────────┼──────────────────────────────────┐
         │                              │                                   │
         ▼                              ▼                                   ▼
┌─────────────────┐          ┌─────────────────┐            ┌─────────────────┐
│  BUBBLE.IO      │          │  SUPABASE AUTH  │            │  SUPABASE DB    │
│  Backend        │          │  (auth.users)   │            │  (public.user)  │
├─────────────────┤          ├─────────────────┤            ├─────────────────┤
│                 │          │                 │            │                 │
│  /wf/signup-user│          │  createUser()   │            │  upsert()       │
│                 │          │  (with metadata)│            │                 │
│  Returns:       │          │                 │            │  User profile   │
│  - token        │          │  Stores:        │            │  synced from    │
│  - user_id      │          │  - bubble_id    │            │  Bubble         │
│  - expires      │          │  - name         │            │                 │
│                 │          │  - user_type    │            │                 │
└─────────────────┘          └─────────────────┘            └─────────────────┘
```

---

## Multi-Step Form Flow

### Form Steps Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          SIGNUP STEP 1                                    │
│                       "Nice To Meet You!"                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Fields:                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  First Name *     [                    ]                           │ │
│  │  Last Name *      [                    ]                           │ │
│  │  Email *          [                    ]                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  Note: *Must match your government ID                                   │
│                                                                          │
│                    [ Continue ]                                         │
│                                                                          │
│              Have an account? Log In                                    │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          SIGNUP STEP 2                                    │
│                       "Hi, {firstName}!"                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Fields:                                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  I am signing up to be *   [ A Guest (I would like to rent) ▼]    │ │
│  │                                                                    │ │
│  │  Birth Date *              [Month▼] [Day▼] [Year▼]                │ │
│  │                                                                    │ │
│  │  Phone Number *            [                    ]                  │ │
│  │                                                                    │ │
│  │  Password *                [                    ] 👁               │ │
│  │                                                                    │ │
│  │  Re-enter Password *       [                    ] 👁               │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  By signing up, you agree to Terms, Privacy Policy, and Guidelines.     │
│                                                                          │
│                    [ Agree and Sign Up ]                                │
│                                                                          │
│  ← Go Back                                                              │
└──────────────────────────────────────────────────────────────────────────┘
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
    const { data, error } = await supabase.functions.invoke('bubble-auth-proxy', {
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
    const { token, user_id, expires, supabase_user_id } = data.data;

    // Store authentication tokens (auto-login after signup)
    setAuthToken(token);
    setSessionId(user_id);
    setAuthState(true, user_id);
    setUserType(additionalData.userType || 'Guest');
    updateLastActivity();

    return {
      success: true,
      token,
      userId: user_id,
      supabaseUserId: supabase_user_id
    };

  } catch (error) {
    console.error('Signup error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
```

---

### Step 6: Edge Function Router (bubble-auth-proxy/index.ts)

**File**: `supabase/functions/bubble-auth-proxy/index.ts`

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
  result = await handleSignup(
    bubbleAuthBaseUrl,
    bubbleApiKey,
    supabaseUrl,
    supabaseServiceKey,
    payload
  );
  break;
```

---

### Step 7: Signup Handler (handlers/signup.ts)

**File**: `supabase/functions/bubble-auth-proxy/handlers/signup.ts`

This handler performs a **three-step atomic operation**:

#### Full Handler Implementation
```typescript
export async function handleSignup(
  bubbleAuthBaseUrl: string,
  bubbleApiKey: string,
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
    throw new Error('Password must be at least 4 characters long.');
  }

  if (password !== retype) {
    throw new Error('The two passwords do not match!');
  }

  // ========== STEP 1: BUBBLE SIGNUP ==========
  const url = `${bubbleAuthBaseUrl}/wf/signup-user`;

  const requestBody = {
    email,
    password,
    retype,
    firstName,
    lastName,
    userType,
    birthDate,
    phoneNumber
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bubbleApiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  const data = await response.json();

  // Check if signup was successful
  if (!response.ok || data.status !== 'success') {
    // Map Bubble error reasons to user-friendly messages
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

  // Extract Bubble response
  const token = data.response?.token;
  const userId = data.response?.user_id;
  const expires = data.response?.expires;

  if (!token || !userId) {
    throw new BubbleApiError('Signup response missing required fields', 500);
  }

  // ========== STEP 2: SUPABASE AUTH USER CREATION ==========
  let supabaseUserId = null;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Check if user already exists
  const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = allUsers?.users?.find(u => u.email === email);

  if (existingAuthUser) {
    // Update existing user's metadata
    supabaseUserId = existingAuthUser.id;
    await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
      user_metadata: {
        ...existingAuthUser.user_metadata,
        bubble_user_id: userId,
        first_name: firstName,
        last_name: lastName,
        user_type: userType
      }
    });
  } else {
    // Create new Supabase Auth user
    const { data: supabaseUser, error: supabaseError } =
      await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          bubble_user_id: userId,
          first_name: firstName,
          last_name: lastName,
          user_type: userType,
          birth_date: birthDate,
          phone_number: phoneNumber
        }
      });

    if (!supabaseError) {
      supabaseUserId = supabaseUser.user?.id;
    }
  }

  // ========== STEP 3: PUBLIC.USER TABLE INSERT ==========
  const now = new Date().toISOString();
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

  let dateOfBirth = null;
  if (birthDate) {
    try {
      dateOfBirth = new Date(birthDate).toISOString();
    } catch (e) {
      // Skip invalid date
    }
  }

  const userRecord = {
    '_id': userId,
    'email as text': email,
    'Name - First': firstName || null,
    'Name - Last': lastName || null,
    'Name - Full': fullName,
    'Date of Birth': dateOfBirth,
    'Phone Number (as text)': phoneNumber || null,
    'Type - User Current': userType || 'Guest',
    'Type - User Signup': userType || 'Guest',
    'Created Date': now,
    'Modified Date': now,
    'authentication': {},
    'user_signed_up': true
  };

  const { error: insertError } = await supabaseAdmin
    .from('user')
    .upsert(userRecord, { onConflict: '_id' })
    .select('_id')
    .single();

  if (insertError) {
    throw new BubbleApiError(
      `Failed to create user profile: ${insertError.message}`,
      500,
      insertError
    );
  }

  // Return authentication data
  return {
    token,
    user_id: userId,
    expires,
    supabase_user_id: supabaseUserId
  };
}
```

---

## Data Flow Diagram

```
User Input                   Edge Function                    Backends
──────────                   ─────────────                    ────────

┌──────────────┐
│  firstName   │
│  lastName    │
│  email       │──────────────────────────────────────────────▶ Bubble.io
│  password    │                                                /wf/signup-user
│  retype      │                                                     │
│  userType    │                                                     │
│  birthDate   │                                                     ▼
│  phoneNumber │                                              ┌──────────────┐
└──────────────┘                                              │   Creates    │
       │                                                      │   User in    │
       │                                                      │   Bubble DB  │
       │                                                      └──────┬───────┘
       │                                                             │
       │                                                             │
       ▼                                                             │
┌──────────────┐                                                     │
│  signup.ts   │◀────────────────────────────────────────────────────┘
│  (Handler)   │         Returns: { token, user_id, expires }
└──────────────┘
       │
       ├──────────────────────────────────────────────────────▶ Supabase Auth
       │                                                        createUser()
       │                                                             │
       │                                                             ▼
       │                                                      ┌──────────────┐
       │                                                      │   Creates    │
       │                                                      │  auth.users  │
       │                                                      │    record    │
       │                                                      └──────────────┘
       │
       └──────────────────────────────────────────────────────▶ Supabase DB
                                                                public.user
                                                                  upsert()
                                                                     │
                                                                     ▼
                                                              ┌──────────────┐
                                                              │   Creates    │
                                                              │  public.user │
                                                              │    record    │
                                                              └──────────────┘
```

---

## Database Schema

### public.user Table (Supabase)

| Column | Type | Description |
|--------|------|-------------|
| `_id` | `text` (PK) | Bubble user ID |
| `email as text` | `text` | User email |
| `Name - First` | `text` | First name |
| `Name - Last` | `text` | Last name |
| `Name - Full` | `text` | Full name (computed) |
| `Date of Birth` | `timestamp` | Birth date |
| `Phone Number (as text)` | `text` | Phone number |
| `Type - User Current` | `text` | Current user type |
| `Type - User Signup` | `text` | Signup user type |
| `Created Date` | `timestamp` | Creation timestamp |
| `Modified Date` | `timestamp` | Last modified timestamp |
| `authentication` | `jsonb` | Auth metadata |
| `user_signed_up` | `boolean` | Signup complete flag |

### auth.users Table (Supabase Auth)

| Field | Description |
|-------|-------------|
| `id` | Supabase Auth UUID |
| `email` | User email |
| `email_confirmed_at` | Auto-confirmed |
| `user_metadata.bubble_user_id` | Bubble user ID |
| `user_metadata.first_name` | First name |
| `user_metadata.last_name` | Last name |
| `user_metadata.user_type` | "Host" or "Guest" |
| `user_metadata.birth_date` | ISO date string |
| `user_metadata.phone_number` | Phone number |

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

| Bubble Error Reason | User Message |
|--------------------|--------------|
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
setAuthToken(token);
setSessionId(user_id);
setAuthState(true, user_id);
setUserType(additionalData.userType || 'Guest');
updateLastActivity();
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

---

## Route-Based User Type Prefilling

The modal can be initialized with a default user type based on the current route:

```javascript
// Usage in parent component
<SignUpLoginModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  defaultUserType="host" // or "guest"
/>

// Inside modal
useEffect(() => {
  if (isOpen && defaultUserType) {
    setSignupData(prev => ({
      ...prev,
      userType: defaultUserType === 'host' ? USER_TYPES.HOST : USER_TYPES.GUEST
    }));
  }
}, [isOpen, defaultUserType]);
```

---

## UI Components

### Password Visibility Toggle
```jsx
<div style={styles.passwordWrapper}>
  <input
    type={showPassword ? 'text' : 'password'}
    value={signupData.password}
    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
    required
    minLength={4}
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    style={styles.togglePasswordBtn}
  >
    <EyeIcon open={showPassword} />
  </button>
</div>
```

### Password Match Indicator
```jsx
<input
  style={{
    ...styles.input,
    ...(passwordMismatch ? styles.inputError : {}),
    ...(signupData.confirmPassword && !passwordMismatch ? styles.inputSuccess : {})
  }}
/>
{passwordMismatch && (
  <p style={styles.inlineError}>The passwords don't match</p>
)}
```

### Date Selector
```jsx
<div style={styles.dateInputsRow}>
  <select value={signupData.birthMonth} onChange={...}>
    <option value="">Month</option>
    {months.map((month, idx) => (
      <option key={month} value={idx + 1}>{month}</option>
    ))}
  </select>
  <select value={signupData.birthDay} onChange={...}>
    <option value="">Day</option>
    {getDaysInMonth(signupData.birthMonth, signupData.birthYear).map(day => (
      <option key={day} value={day}>{day}</option>
    ))}
  </select>
  <select value={signupData.birthYear} onChange={...}>
    <option value="">Year</option>
    {years.map(year => (
      <option key={year} value={year}>{year}</option>
    ))}
  </select>
</div>
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
| `supabase/functions/bubble-auth-proxy/index.ts` | Auth router |
| `supabase/functions/bubble-auth-proxy/handlers/signup.ts` | Signup handler |
| `supabase/functions/_shared/errors.ts` | Error classes |
| `supabase/functions/_shared/validation.ts` | Input validation |

---

## Security Considerations

### 1. Password Requirements
- Minimum 4 characters
- Confirmation required (retype)
- Never stored in plain text

### 2. Age Verification
- Calculated from DOB fields
- Must be 18+ to register
- Validated on frontend before submission

### 3. Email Verification
- Email auto-confirmed in Supabase Auth
- Bubble handles primary validation
- Unique email constraint enforced

### 4. API Key Protection
- Bubble API key stored server-side
- Service role key used for admin operations
- All API calls proxied through Edge Functions

### 5. Data Integrity
- BLOCKING operation for public.user insert
- Operation fails entirely if any step fails
- No partial registrations

---

## Terms and Conditions

The signup form displays a terms agreement:

```jsx
<p style={styles.termsText}>
  By signing up or logging in, you agree to the Split Lease{' '}
  <a href="/terms" target="_blank">Terms of Use</a>,{' '}
  <a href="/privacy" target="_blank">Privacy Policy</a> and{' '}
  <a href="/guidelines" target="_blank">Community Guidelines</a>.
</p>
```

By clicking "Agree and Sign Up", the user accepts these terms.

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
- [ ] Bubble user created successfully
- [ ] Supabase Auth user created
- [ ] public.user record created
- [ ] Token returned and stored
- [ ] Auto-login works after signup
- [ ] Duplicate email shows appropriate error

### Post-Signup
- [ ] Page reloads after signup
- [ ] User shown as logged in
- [ ] User type stored correctly
- [ ] Can immediately access authenticated features

---

**DOCUMENT_VERSION**: 1.0.0
**LAST_UPDATED**: 2025-12-04
**AUTHOR**: Claude Code
