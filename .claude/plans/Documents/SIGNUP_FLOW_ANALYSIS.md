# Split Lease Signup Flow - Complete Analysis

**Status**: Analysis Complete
**Last Updated**: 2025-12-06
**Author**: Code Analysis
**Scope**: Frontend + Backend signup flow from form submission to database creation

---

## Executive Summary

Split Lease has **two distinct signup flows**:

1. **Standard Signup** - Traditional multi-step form (first name, last name, email, DOB, phone, password)
2. **AI Market Report Signup** - Guest signup with market research text, email extraction, and auto-correction

Both flows ultimately call the **`auth-user` Edge Function** which:
- Validates credentials with Bubble.io (legacy backend, source of truth)
- Creates corresponding Supabase users and accounts (replica)
- Returns token for session management

---

## 1. Frontend Signup Components

### 1.1 Main Signup Modal: `SignUpLoginModal.jsx`

**Location**: `/app/src/islands/shared/SignUpLoginModal.jsx`

**Purpose**: Universal authentication modal handling login, signup, password reset

**Views**:
- `initial` - Choose between signup/login
- `login` - Email + password login
- `signup-step1` - First name, last name, email
- `signup-step2` - User type, DOB, phone, password
- `password-reset` - Password recovery

**Key Features**:
- Multi-step form with data persistence between steps
- Real-time password mismatch detection
- Age validation (must be 18+)
- Route-based user type prefilling (host vs guest)
- Magic link password reset option

**Usage**:
```jsx
<SignUpLoginModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  initialView="signup-step1"
  onAuthSuccess={(userData) => handleSuccess(userData)}
  defaultUserType="guest"  // Optional: 'host' or 'guest'
  skipReload={false}       // When true, don't reload after auth
/>
```

**Data Collected in Signup**:
```javascript
{
  firstName: string,        // Required
  lastName: string,         // Required
  email: string,           // Required
  userType: 'Host'|'Guest', // Required in step 2
  birthMonth: number,      // 1-12
  birthDay: number,        // 1-31
  birthYear: number,       // Full year
  phoneNumber: string,     // Required
  password: string,        // Min 4 chars
  confirmPassword: string  // Must match password
}
```

**Validation Rules**:
- Step 1: firstName, lastName, email (basic email format check)
- Step 2: DOB (age >= 18), phoneNumber, password (4+ chars, match confirm)

---

### 1.2 AI Market Report Signup: `AiSignupMarketReport.jsx`

**Location**: `/app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`

**Purpose**: Alternative signup flow for guests interested in market research reports

**Features**:
- Freeform text input for logistics needs
- Smart email extraction from text
- Smart phone extraction from text
- Auto-correction for common email typos
- Auto-submit if all data is perfect
- Lottie animations (parsing, loading, success)

**Flow Stages**:
1. `freeform` - User describes needs in text
2. `parsing` - Extract email/phone (animated)
3. `contact` - Confirm/edit extracted email and phone
4. `loading` - Submit to backend
5. `final` - Success message

**Smart Features**:
- Extracts email using regex: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.,][a-zA-Z]{2,}`
- Extracts phone: Complete format `(XXX) XXX-XXXX` or partial numbers
- Email certainty detection (checks domain validity, typos)
- Email auto-correction map: `gmial.com` → `gmail.com`, etc.
- **Auto-submit** if email is certain + phone is complete + no corrections made

**Example Auto-Correct Cases**:
- `gmial.com` → `gmail.com`
- `yahooo.com` → `yahoo.com`
- `outlook,com` → `outlook.com`

**Data Submitted**:
```javascript
{
  email: string,                // Extracted and corrected
  phone: string,               // Extracted (optional)
  text_inputted: string,       // Original user text
  timestamp: ISO8601 string    // When submitted
}
```

---

### 1.3 Authentication Utility: `auth.js`

**Location**: `/app/src/lib/auth.js`

**Core Functions**:

#### `loginUser(email, password)`
- Calls `auth-user` Edge Function with action='login'
- Stores token and user_id in secure storage
- Sets auth state
- Returns `{ success: boolean, user_id: string, expires: number, error?: string }`

#### `signupUser(email, password, retype, additionalData?)`
- Calls `auth-user` Edge Function with action='signup'
- Supports optional extended data:
  - `firstName`, `lastName`
  - `userType` ('Host' or 'Guest')
  - `birthDate` (ISO format YYYY-MM-DD)
  - `phoneNumber`
- Stores token and user_id in secure storage
- Returns `{ success: boolean, user_id: string, expires: number, supabase_user_id?: string, error?: string }`

#### `validateTokenAndFetchUser()`
- Validates stored token via Edge Function (action='validate')
- Fetches user data from Supabase
- Caches user type locally
- Clears auth data on failure
- Returns user object or null

#### `checkAuthStatus()`
- Checks Split Lease cookies (cross-domain, for Bubble compatibility)
- Checks secure auth state and stored tokens
- Returns boolean (true if logged in)

#### `logoutUser()`
- Calls Edge Function with action='logout'
- Clears auth data from localStorage
- Always returns success (even if API fails)

**Secure Storage Details**:
- Uses `secureStorage.js` for encrypted token storage
- All tokens stored via `setAuthToken()` and `getAuthToken()`
- Session ID stored via `setSessionId()` and `getSessionId()`
- User type cached locally via `setUserType()` and `getUserType()`

---

## 2. Backend Signup Flow - Edge Functions

### 2.1 Entry Point: `auth-user` Edge Function

**Location**: `/supabase/functions/auth-user/index.ts`

**Routes**: `POST /functions/v1/auth-user`

**Actions Supported**:
- `login` → `handleLogin()`
- `signup` → `handleSignup()`
- `logout` → `handleLogout()`
- `validate` → `handleValidate()`

**Request Format**:
```json
{
  "action": "signup",
  "payload": {
    "email": "user@example.com",
    "password": "password123",
    "retype": "password123",
    "additionalData": {
      "firstName": "John",
      "lastName": "Doe",
      "userType": "Guest",
      "birthDate": "1995-06-15",
      "phoneNumber": "(555) 123-4567"
    }
  }
}
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "token": "auth_token_string",
    "user_id": "generated_supabase_id",
    "bubble_id": "bubble_user_id",
    "expires": 3600,
    "supabase_user_id": "uuid_from_auth.users"
  }
}
```

---

### 2.2 Signup Handler: `handleSignup()`

**Location**: `/supabase/functions/auth-user/handlers/signup.ts`

**Purpose**: Register new user in Bubble + Supabase (atomic operation)

**Flow**:

#### Step 1: Validate Input
```
- email (required)
- password (required, min 4 chars)
- retype (required, must match password)
- additionalData (optional):
  - firstName, lastName, userType, birthDate, phoneNumber
```

#### Step 2: Create User in Bubble
```
POST https://app.split.lease/version-test/api/1.1/wf/signup-user
Headers: { Authorization: Bearer BUBBLE_API_KEY }
Body: {
  email, password, retype,
  firstName, lastName, userType, birthDate, phoneNumber
}
```

**Bubble Response** (on success):
```json
{
  "status": "success",
  "response": {
    "token": "jwt_token",
    "user_id": "bubble_user_id_string",
    "expires": 3600
  }
}
```

**Error Handling**:
- `NOT_VALID_EMAIL` → "Please enter a valid email address."
- `USED_EMAIL` → "This email is already in use."
- `DO_NOT_MATCH` → "The two passwords do not match!"

#### Step 3: Generate Bubble-Compatible IDs
```typescript
const { data: generatedIds } = await supabaseAdmin.rpc('generate_bubble_id');
const { data: generatedHostId } = await supabaseAdmin.rpc('generate_bubble_id');
const { data: generatedGuestId } = await supabaseAdmin.rpc('generate_bubble_id');
```

Three IDs generated:
- `user_id` - Primary key for `public.user` table
- `host_account_id` - Primary key for `account_host` table
- `guest_account_id` - Primary key for `account_guest` table

#### Step 4: Create Supabase Auth User (Best-Effort)
```typescript
await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,  // Auto-confirmed since Bubble validated
  user_metadata: {
    user_id: generatedUserId,
    bubble_user_id: bubbleUserId,
    host_account_id: hostAccountId,
    guest_account_id: guestAccountId,
    first_name: firstName,
    last_name: lastName,
    user_type: userType,
    birth_date: birthDate,
    phone_number: phoneNumber
  }
});
```

If this fails, continues to next step (logged but doesn't block)

#### Step 5: Create account_host Record
```typescript
const hostAccountRecord = {
  '_id': hostAccountId,
  'User': generatedUserId,
  'HasClaimedListing': false,
  'Receptivity': 0,
  'Created Date': now,
  'Modified Date': now,
  'bubble_id': null
};

await supabaseAdmin.from('account_host').insert(hostAccountRecord);
```

#### Step 6: Create account_guest Record
```typescript
const guestAccountRecord = {
  '_id': guestAccountId,
  'User': generatedUserId,
  'Email': email,
  'Created Date': now,
  'Modified Date': now,
  'bubble_id': null
};

await supabaseAdmin.from('account_guest').insert(guestAccountRecord);
```

#### Step 7: Create public.user Record
```typescript
const userRecord = {
  '_id': generatedUserId,
  'bubble_id': userId,                    // Bubble's ID for backward compat
  'email': email,
  'email as text': email,
  'Name - First': firstName || null,
  'Name - Last': lastName || null,
  'Name - Full': [firstName, lastName].join(' '),
  'Date of Birth': dateOfBirth,           // ISO timestamp
  'Phone Number (as text)': phoneNumber || null,
  'Type - User Current': userType || 'Guest',
  'Type - User Signup': userType || 'Guest',
  'Account - Host / Landlord': hostAccountId,
  'Account - Guest': guestAccountId,
  'Created Date': now,
  'Modified Date': now,
  'authentication': {},                   // Required JSONB
  'user_signed_up': true                  // Required boolean
};

await supabaseAdmin.from('user').upsert(userRecord, { onConflict: '_id' });
```

#### Step 8: Return Response
```json
{
  "token": "bubble_jwt_token",
  "user_id": "generated_supabase_user_id",
  "bubble_id": "bubble_user_id",
  "host_account_id": "generated_host_id",
  "guest_account_id": "generated_guest_id",
  "expires": 3600,
  "supabase_user_id": "supabase_auth_uuid_or_null"
}
```

**Key Design Decisions**:

1. **Write-Read-Write Pattern** (Atomic):
   - Bubble creates user (source of truth)
   - Fetch from Bubble (not shown, but implicit)
   - Write to Supabase (replica)

2. **No Fallback Mechanism**:
   - If Bubble signup fails → entire operation fails
   - If Supabase account creation fails → logged, continues (auth table is secondary)
   - If any Supabase insert fails → entire operation fails

3. **Dual IDs**:
   - `_id` (Supabase) and `bubble_id` (Bubble) both stored
   - Allows gradual migration from Bubble to Supabase
   - Frontend can use either ID as needed

4. **Always Host + Guest**:
   - Both `account_host` and `account_guest` records created for every user
   - User type preference stored separately (`Type - User Current`)
   - Allows user to switch between roles later

---

### 2.3 AI Signup Handler: `ai-signup-guest`

**Location**: `/supabase/functions/ai-signup-guest/index.ts`

**Purpose**: Create guest signup record with market research text

**Different from Standard Signup**:
- Does NOT create user account
- Does NOT authenticate user
- Creates metadata record for market research report generation
- Called by `AiSignupMarketReport.jsx` component

**Flow**:
1. Receive email, phone, market research text
2. Generate AI-powered market research report
3. Send report to email via Bubble workflow
4. Create signup record in Supabase (for tracking)
5. Return success

**Request**:
```json
{
  "email": "user@example.com",
  "phone": "(555) 123-4567",
  "text_inputted": "Long freeform text describing needs..."
}
```

---

## 3. Data Flow Diagram

```
FRONTEND SIGNUP FORM
    ↓
SignUpLoginModal.jsx (Multi-step form)
    ↓
    ├─→ Collect: firstName, lastName, email
    ├─→ Collect: userType, DOB, phone, password
    ↓
Call auth.js::signupUser(email, password, retype, additionalData)
    ↓
HTTP POST to /functions/v1/auth-user
Body: { action: 'signup', payload: { ... } }
    ↓
EDGE FUNCTION: auth-user
    ↓
Validate input
    ↓
HTTP POST to Bubble API: /wf/signup-user
    ↓
BUBBLE.IO (Source of Truth)
    ├─→ Creates user in Bubble database
    ├─→ Returns token + bubble_user_id
    ↓
Back to Edge Function
    ↓
Generate IDs (generate_bubble_id × 3)
    ├─→ user_id
    ├─→ host_account_id
    └─→ guest_account_id
    ↓
Create Supabase Auth user (best-effort)
    ↓
Insert account_host record
    ↓
Insert account_guest record
    ↓
Insert public.user record
    ↓
Return token + IDs to Frontend
    ↓
FRONTEND: SignUpLoginModal
    ↓
Store token in secure storage (auth.js)
Store user_id in session
Store user type in cache
    ↓
Reload page (if skipReload !== true)
    ↓
USER LOGGED IN & CAN ACCESS AUTHENTICATED FEATURES
```

---

## 4. User Types: Host vs Guest

**Split Lease has two user types** with different capabilities:

### Host
- Lists properties for rent
- Sets availability schedules
- Reviews guest proposals
- Accepts/rejects/counters proposals
- Manages listings

### Guest
- Searches for available properties
- Submits proposals
- Views listing details
- Tracks proposal status

**Implementation**:
- `userType` stored as string ('Host' or 'Guest') in:
  - Supabase `auth.users.user_metadata.user_type`
  - Supabase `public.user.Type - User Current`
  - Frontend localStorage (cached)

**User can be both** - Both `account_host` and `account_guest` records created during signup

**Route-Based Prefilling**:
```javascript
// If user comes from /host-success page
<SignUpLoginModal defaultUserType="host" ... />

// If user comes from /guest-success page
<SignUpLoginModal defaultUserType="guest" ... />
```

This pre-selects the user type in step 2 form

---

## 5. Session Management

### Token Storage
**Encrypted in browser localStorage** via `secureStorage.js`:
- `splitlease_auth_token` - JWT token (most critical)
- `splitlease_session_id` - User ID (secondary)
- `splitlease_user_type` - User type preference (non-sensitive)

### Token Validation
Called on every protected page load:
```javascript
await validateTokenAndFetchUser()
```

This:
1. Retrieves stored token + user_id
2. Calls Edge Function validate action
3. Bubble validates token expiry
4. Returns updated user data
5. Clears auth if token expired
6. Caches user type

### Session Timeout
- Bubble sets token expiry (default 3600 seconds)
- Frontend checks on each API call
- Invalid/expired tokens trigger logout

### Cross-Domain Cookies
Legacy Bubble cookies from `.split.lease` domain are also checked:
```javascript
checkSplitLeaseCookies()
```

Provides compatibility during migration

---

## 6. Different Signup Flows Summary

### Flow 1: Standard Signup (SignUpLoginModal)
**For**: Users wanting traditional multi-step form
**Input**: firstName, lastName, email, DOB, phone, password
**User Type**: Selected in form
**Result**: Full user account created, authenticated
**Used On**: Most signup entry points

### Flow 2: AI Market Report Signup (AiSignupMarketReport)
**For**: Guests researching Split Lease
**Input**: Freeform text (email/phone extracted)
**User Type**: Always Guest
**Result**: Market research signup record (not full user yet)
**Used On**: Homepage, special campaigns
**Note**: May convert to full signup later

### Flow 3: Direct API Signup
**For**: Mobile apps, third-party integrations
**Input**: POST to `/functions/v1/auth-user`
**User Type**: In payload
**Result**: Same as Flow 1

---

## 7. Database Schema - Signup-Related Tables

### account_host (Host Account)
```typescript
{
  '_id': string,                // Primary key (generated)
  'User': string,              // Foreign key to public.user._id
  'HasClaimedListing': boolean, // Default: false
  'Receptivity': number,       // Default: 0
  'Created Date': timestamp,
  'Modified Date': timestamp,
  'bubble_id': string|null     // Legacy Bubble ID
}
```

### account_guest (Guest Account)
```typescript
{
  '_id': string,               // Primary key (generated)
  'User': string,              // Foreign key to public.user._id
  'Email': string,             // User's email
  'Created Date': timestamp,
  'Modified Date': timestamp,
  'bubble_id': string|null     // Legacy Bubble ID
}
```

### public.user (User Profile)
```typescript
{
  '_id': string,                              // Primary key (generated)
  'bubble_id': string,                        // Legacy Bubble ID
  'email': string,
  'email as text': string,
  'Name - First': string|null,
  'Name - Last': string|null,
  'Name - Full': string|null,
  'Date of Birth': timestamp|null,
  'Phone Number (as text)': string|null,
  'Type - User Current': 'Host'|'Guest',      // Current preference
  'Type - User Signup': 'Host'|'Guest',       // Signup preference
  'Account - Host / Landlord': string,        // FK to account_host._id
  'Account - Guest': string,                  // FK to account_guest._id
  'Created Date': timestamp,
  'Modified Date': timestamp,
  'authentication': object,                   // JSONB (required)
  'user_signed_up': boolean                   // Required
}
```

---

## 8. Error Handling

### Frontend Error Handling
```javascript
// In SignUpLoginModal
if (result.success) {
  // Success - reload or call callback
} else {
  setError(result.error)  // Display error message
}
```

### Edge Function Error Handling
- Input validation → HTTP 400
- Bubble API errors → Varies (usually 400-500)
- Supabase insert errors → HTTP 500

### Error Types
- `ValidationError` - Missing/invalid input
- `BubbleApiError` - Bubble signup failed
- `SupabaseSyncError` - Database insert failed
- Network errors - Connection issues

---

## 9. Security Considerations

### NO Fallbacks
- If Bubble signup fails, entire signup fails
- If Supabase inserts fail, user creation rolled back (via transaction)
- No hardcoded demo data or test accounts

### API Key Security
- Bubble API key stored in **Supabase Secrets** (not in code)
- Edge Functions handle all API communication
- Frontend never contacts Bubble directly
- CORS restrictions prevent unauthorized calls

### Token Encryption
- Tokens stored encrypted in localStorage
- Not accessible to scripts on different origins
- Cleared on logout or token expiry

### DOB Validation
- Must be 18+ years old
- Validated both on frontend and backend
- Prevents minor signups

---

## 10. Testing Checklist

When modifying signup flow:

- [ ] Can signup with valid credentials?
- [ ] Error shown for invalid email?
- [ ] Error shown for short password (<4 chars)?
- [ ] Error shown for password mismatch?
- [ ] Error shown if under 18?
- [ ] Email already in use error?
- [ ] Token stored after signup?
- [ ] Can login immediately after signup?
- [ ] User type saved correctly?
- [ ] Both account_host and account_guest created?
- [ ] public.user record has all fields populated?
- [ ] Auth redirect works (if not skipReload)?
- [ ] AI Market Report extraction works?
- [ ] Email auto-correct works?
- [ ] Auto-submit triggers on perfect data?

---

## 11. Related Files Reference

### Frontend
- **Main**: `/app/src/islands/shared/SignUpLoginModal.jsx` (lines 1-1194)
- **Auth Lib**: `/app/src/lib/auth.js` (lines 389-615 for signup)
- **AI Flow**: `/app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx`
- **Router**: `/app/src/islands/shared/Header.jsx` (uses SignUpLoginModal)

### Backend
- **Entry**: `/supabase/functions/auth-user/index.ts` (lines 88-95)
- **Handler**: `/supabase/functions/auth-user/handlers/signup.ts` (full file)
- **Login**: `/supabase/functions/auth-user/handlers/login.ts`
- **Validate**: `/supabase/functions/auth-user/handlers/validate.ts`

### Database
- Tables: `account_host`, `account_guest`, `public.user` in Supabase
- RPC: `generate_bubble_id()` - Generates Bubble-compatible IDs

### Configuration
- **Secrets**: BUBBLE_API_BASE_URL, BUBBLE_API_KEY in Supabase
- **Constants**: `/app/src/lib/constants.js`
- **Storage**: `/app/src/lib/secureStorage.js`

---

## 12. Key Takeaways

1. **Two Entry Points**: Standard form (SignUpLoginModal) and AI report (AiSignupMarketReport)
2. **Bubble = Source of Truth**: Bubble creates user first, Supabase syncs as replica
3. **No Fallbacks**: Strict error handling, no demo data
4. **Dual Accounting**: Both host and guest accounts created for flexibility
5. **Secure Tokens**: All API keys server-side, tokens encrypted client-side
6. **Age Gate**: 18+ validation both frontend and backend
7. **Smart Extraction**: AI flow extracts and corrects email/phone from freeform text
8. **Auto-Submit**: AI flow submits automatically if data is perfect
9. **Role Flexibility**: Users can be host, guest, or both simultaneously
10. **Atomic Operations**: Either full success or full failure, no partial states

---

**End of Analysis**
