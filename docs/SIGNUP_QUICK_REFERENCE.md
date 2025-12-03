# Signup Flow - Quick Reference

**Status**: Complete
**Last Updated**: 2025-12-03

---

## The Signup Path (Simple Version)

```
User fills form → Clicks "Agree and Sign Up" → Page reloads → User logged in
```

---

## Step-by-Step

### Step 1: User Fills Signup Form
**File**: `app/src/islands/shared/SignUpLoginModal.jsx` (lines 850-932)

**Data collected**:
- First name, Last name
- Email
- User type (Host/Guest)
- Birth date (month/day/year)
- Phone number
- Password + confirmation

### Step 2: Click Button Calls Function
**File**: `app/src/islands/shared/SignUpLoginModal.jsx` (line 557)

```javascript
const result = await signupUser(
  email, password, confirmPassword,
  { firstName, lastName, userType, birthDate, phoneNumber }
);
```

### Step 3: Frontend Calls Edge Function
**File**: `app/src/lib/auth.js` (line 558)

```javascript
supabase.functions.invoke('bubble-auth-proxy', {
  body: { action: 'signup', payload: {...} }
})
```

### Step 4: Edge Function Calls Bubble
**File**: `supabase/functions/bubble-auth-proxy/handlers/signup.ts` (line 83)

```
POST https://app.split.lease/version-test/api/1.1/wf/signup-user
Headers: Authorization: Bearer {BUBBLE_API_KEY}
Body: { email, password, retype, firstName, lastName, userType, birthDate, phoneNumber }
```

### Step 5: Bubble Returns Token
**Bubble response**:
```json
{
  "status": "success",
  "response": {
    "token": "abc123...",
    "user_id": "bubble_user_123",
    "expires": 86400
  }
}
```

### Step 6: Frontend Stores Token
**File**: `app/src/lib/auth.js` (lines 607-611)

```javascript
setAuthToken(token);           // Encrypted storage
setSessionId(user_id);         // Encrypted storage
setAuthState(true, user_id);   // Public state
```

### Step 7: Page Reloads
**File**: `app/src/islands/shared/SignUpLoginModal.jsx` (line 616)

```javascript
setTimeout(() => window.location.reload(), 500);
```

### Step 8: Page Validates User
**Called on page load**:
```javascript
const user = await validateTokenAndFetchUser();
// Returns: { userId, firstName, fullName, profilePhoto, userType }
```

---

## Key Files Map

```
Signup Flow Files:
│
├── Frontend UI
│   └── app/src/islands/shared/SignUpLoginModal.jsx
│       └── handleSignupSubmit() (line 557)
│
├── Frontend Auth Logic
│   └── app/src/lib/auth.js
│       └── signupUser() (line 519)
│
├── Edge Function Router
│   └── supabase/functions/bubble-auth-proxy/index.ts
│       └── Route action:'signup' to handler (line 96)
│
├── Signup Handler
│   └── supabase/functions/bubble-auth-proxy/handlers/signup.ts
│       └── handleSignup() (line 32)
│
├── Validate Handler
│   └── supabase/functions/bubble-auth-proxy/handlers/validate.ts
│       └── handleValidate() (line 29)
│
└── External
    └── Bubble.io API: {BUBBLE_API_BASE_URL}/wf/signup-user
```

---

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  SignUpLoginModal.jsx (React Component)                      │
│  ├─ Collect form data                                        │
│  └─ Call: signupUser(email, pass, additionalData)           │
│                                                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  auth.js: signupUser()                                       │
│  ├─ Validate locally (password length, match)                │
│  └─ Call Edge Function: bubble-auth-proxy                   │
│                                                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼ Supabase.functions.invoke()
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  bubble-auth-proxy/index.ts (Edge Function Router)          │
│  ├─ Parse request                                            │
│  ├─ Validate action='signup'                                │
│  └─ Call: handleSignup(params)                              │
│                                                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  signup.ts: handleSignup()                                   │
│  ├─ Validate fields (email, password, retype)               │
│  └─ Call Bubble API: POST /wf/signup-user                  │
│                                                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼ HTTP POST
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Bubble.io Auth API                                          │
│  ├─ Create user account                                      │
│  ├─ Validate email                                           │
│  └─ Return token + user_id                                  │
│                                                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  auth.js: Response handling                                 │
│  ├─ Store token (encrypted)                                 │
│  ├─ Store user_id (encrypted)                               │
│  ├─ Set auth state                                          │
│  └─ Return success                                          │
│                                                              │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  SignUpLoginModal.jsx: After Signup                         │
│  ├─ Close modal                                             │
│  └─ Reload page (500ms timeout)                            │
│                                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  Page Reload & Init                                         │
│  ├─ Load tokens from secure storage                         │
│  ├─ Call validateTokenAndFetchUser()                        │
│  └─ Fetch user profile from Supabase                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Critical Points

### Point 1: User Created in Bubble, Not Supabase
- Bubble is the **source of truth** for user accounts
- Supabase **queries** the user table but doesn't insert during signup
- User data synced from Bubble to Supabase by **Bubble workflow or scheduled job**

### Point 2: All Fields Must Be camelCase
**REQUIRED** by Bubble API (NOT snake_case):
- `firstName` ✅
- `lastName` ✅
- `userType` ✅
- `birthDate` ✅ (ISO format: YYYY-MM-DD)
- `phoneNumber` ✅

### Point 3: Token Encrypted in Storage
- Never exposed in plain text
- Automatically decrypted when needed
- Cleared on logout

### Point 4: Page Must Reload
- Window.location.reload() is **intentional and required**
- Re-initializes app with authenticated user
- Validates token and fetches profile

### Point 5: No Supabase Insert
```
❌ NO code like: supabase.from('user').insert({ ... })
✅ ONLY: supabase.from('user').select(...).eq('_id', user_id)
```

---

## Error Handling

### From Bubble API:

| Error | Message |
|-------|---------|
| `NOT_VALID_EMAIL` | Please enter a valid email address. |
| `USED_EMAIL` | This email is already in use. |
| `DO_NOT_MATCH` | The two passwords do not match! |

### From Frontend Validation:

| Error | Condition |
|-------|-----------|
| Password < 4 chars | Caught on frontend before sending |
| Passwords don't match | Caught on frontend before sending |
| Network error | Connection issue |

---

## Testing Signup

### Manual Test Steps:

1. Open Split Lease homepage
2. Click "I'm new around here"
3. Fill in form:
   - Name: John Doe
   - Email: test@example.com
   - User Type: Guest
   - DOB: 01/15/1990
   - Phone: (555) 555-5555
   - Password: password123
4. Click "Agree and Sign Up"
5. **Expected**: Page reloads and user is logged in
6. **Verify**: Check DevTools → Application → Local Storage for auth tokens

### Debug Checklist:

- [ ] Signup button is clickable
- [ ] Form validates before submission
- [ ] Edge Function receives request (check logs)
- [ ] Bubble API returns 200 OK
- [ ] Token stored in localStorage
- [ ] Page reloads after 500ms
- [ ] User appears logged in after reload
- [ ] Supabase user table has the user

---

## Related Functions

### Frontend:
- `checkAuthStatus()` - Check if logged in
- `validateTokenAndFetchUser()` - Get user profile
- `logoutUser()` - Clear auth data
- `loginUser()` - Login with existing account

### Edge Functions:
- `bubble-auth-proxy/login` - User login
- `bubble-auth-proxy/signup` - New user registration
- `bubble-auth-proxy/logout` - End session
- `bubble-auth-proxy/validate` - Validate token

---

## Configuration

### Required Supabase Secrets:

```
BUBBLE_API_BASE_URL = https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY = <your-bubble-api-key>
SUPABASE_URL = <auto-provided>
SUPABASE_SERVICE_ROLE_KEY = <auto-provided>
```

### Required Frontend Environment:

```
VITE_SUPABASE_URL = <your-supabase-url>
VITE_SUPABASE_ANON_KEY = <your-supabase-anon-key>
```

---

## Notes

- SignUpLoginModal can also be used for Login and Password Reset
- User type (Host/Guest) is optional, defaults to 'Guest'
- Birth date must validate user is 18+ years old
- Tokens expire after `expires` seconds (typically 86400 = 24 hours)
- Session stored in encrypted secure storage (`secureStorage.js`)

---

## See Also

- `SIGNUP_FLOW_COMPLETE_TRACE.md` - Detailed step-by-step breakdown
- `app/src/lib/secureStorage.js` - Token encryption implementation
- `supabase/SECRETS_SETUP.md` - Secrets configuration guide
- `docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md` - Auth migration status
