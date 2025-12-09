# Split Lease Signup Flow - Visual Guide

## Quick Reference

### Two Signup Paths

```
User Visits Site
    ↓
    ├─ Path 1: Standard Signup (Interactive)
    │   └─ SignUpLoginModal.jsx
    │
    └─ Path 2: AI Market Report Signup (Research)
        └─ AiSignupMarketReport.jsx
```

---

## Path 1: Standard Signup Flow

### Frontend Component Hierarchy

```
Header.jsx / HomePage.jsx
    ↓
User clicks "Sign Up" button
    ↓
SignUpLoginModal.jsx (isOpen=true)
    ↓
┌──────────────────────────────────────┐
│ Initial View                         │
│ "I'm new here" / "Log into account"  │
└──────────────────────────────────────┘
    │
    └─→ User clicks "I'm new here"
        ↓
┌──────────────────────────────────────┐
│ SIGNUP STEP 1                        │
│ [First Name]                         │
│ [Last Name]                          │
│ [Email]                              │
│                                      │
│ [Continue Button]                    │
└──────────────────────────────────────┘
    │
    └─→ Validation passes
        ↓
┌──────────────────────────────────────┐
│ SIGNUP STEP 2                        │
│ [User Type: Guest/Host]              │
│ [Birth Month/Day/Year]               │
│ [Phone Number]                       │
│ [Password]                           │
│ [Confirm Password]                   │
│                                      │
│ [Agree and Sign Up Button]           │
└──────────────────────────────────────┘
    │
    └─→ All validations pass
        ↓
    Calls: signupUser(email, password, retype, {
      firstName, lastName, userType,
      birthDate, phoneNumber
    })
```

### Data Validation Rules (Frontend)

```
STEP 1:
├─ First Name: Required, trimmed
├─ Last Name: Required, trimmed
└─ Email: Required, must match /^[^\s@]+@[^\s@]+\.[^\s@]+$/

STEP 2:
├─ User Type: Host or Guest
├─ Birth Date: Age must be >= 18
├─ Phone Number: Required, any format
├─ Password: Required, >= 4 characters
└─ Confirm Password: Must match Password exactly
```

### API Call Flow

```
Frontend
   │
   └─→ POST /functions/v1/auth-user
       │
       ├─ Headers: Content-Type: application/json
       │
       └─ Body:
          {
            "action": "signup",
            "payload": {
              "email": "user@example.com",
              "password": "secret123",
              "retype": "secret123",
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

### Backend Processing (Edge Function)

```
auth-user Edge Function (index.ts)
    ↓
handleSignup() called
    ↓
┌────────────────────────────────────┐
│ 1. Validate Input                  │
│    - email, password, retype       │
│    - password length >= 4          │
│    - password === retype           │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 2. Call Bubble API                 │
│    POST .../wf/signup-user         │
│    Body: {email, password, ...}    │
│    Response: {token, user_id}      │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 3. Generate IDs                    │
│    - Call generate_bubble_id() × 3 │
│    - Get: user_id, host_id,        │
│      guest_id (Bubble-compatible)  │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 4. Create Supabase Auth User       │
│    auth.admin.createUser()         │
│    email_confirm: true             │
│    user_metadata: {...}            │
│    (Best-effort, doesn't block)    │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 5. Insert account_host             │
│    (linked to generated IDs)       │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 6. Insert account_guest            │
│    (linked to generated IDs)       │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 7. Insert public.user              │
│    (profile with all info)         │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 8. Return Response                 │
│    {                               │
│      token,                        │
│      user_id (Supabase),           │
│      bubble_id (Bubble),           │
│      host_account_id,              │
│      guest_account_id,             │
│      expires: 3600                 │
│    }                               │
└────────────────────────────────────┘
```

### Frontend After Signup

```
Response received
    ↓
if (success) {
    ├─→ Call onAuthSuccess() callback
    ├─→ Close modal
    ├─→ Store token in secure storage
    │   (auth.js: setAuthToken, setSessionId)
    └─→ Reload page (unless skipReload=true)
        ↓
        User is now logged in!
} else {
    └─→ Display error message
        Stay on signup form
        Can retry
}
```

---

## Path 2: AI Market Report Signup

### Component Flow

```
HomePage / Marketing Page
    ↓
User clicks "Sign Up with Market Report"
    ↓
AiSignupMarketReport.jsx modal opens
    ↓
┌──────────────────────────────────────┐
│ Stage 1: FREEFORM TEXT               │
│ "Describe your unique logistics      │
│  needs in your own words"            │
│                                      │
│ [Large Textarea]                     │
│ "ex. I need a quiet space near..."   │
│                                      │
│ 💡 Include email and phone for      │
│    faster processing                │
│                                      │
│ [Next Button]                        │
└──────────────────────────────────────┘
    │
    └─→ User clicks Next
        ↓
┌──────────────────────────────────────┐
│ Stage 2: PARSING (Animated)          │
│ [Lottie Animation]                   │
│ "Analyzing your request..."          │
│                                      │
│ 1.5 seconds elapsed...               │
└──────────────────────────────────────┘
    │
    └─→ Background processing:
        ├─→ Extract email with regex
        ├─→ Extract phone with regex
        ├─→ Auto-correct common typos
        │   (gmial.com → gmail.com)
        ├─→ Check email certainty
        └─→ Validate completeness
```

### Smart Extraction Logic

```
INPUT TEXT:
"I need a quiet space. Email: gmai.com and phone (415) 555-5555"

EXTRACTION:
├─ Email Found: "gmai.com"
├─ Email Corrected: "gmail.com" (typo map)
├─ Email Certainty: "certain" (known domain)
├─ Phone Found: "(415) 555-5555"
└─ Phone Complete: true (full format)

AUTO-SUBMIT CHECK:
├─ Email is certain? YES ✓
├─ Phone is complete? YES ✓
├─ Email was corrected? NO ✓
└─ Decision: AUTO-SUBMIT → FINAL STAGE

OR if not perfect:
└─ Go to contact form for manual review
```

### Contact Verification Stage

```
┌──────────────────────────────────────┐
│ Stage 3: CONTACT FORM (if needed)    │
│ "Where do we send the report?"       │
│                                      │
│ [Email Input]                        │
│ (Pre-filled from extraction)         │
│                                      │
│ [Phone Input]                        │
│ (Optional, pre-filled if extracted)  │
│                                      │
│ "We'll send your personalized..."    │
│                                      │
│ [Submit Button]                      │
└──────────────────────────────────────┘
    │
    └─→ User confirms/edits and clicks Submit
        ↓
┌──────────────────────────────────────┐
│ Stage 4: LOADING (Animated)          │
│ [Lottie Animation]                   │
│ "We are processing your request"     │
│                                      │
│ 1.5 seconds elapsed...               │
└──────────────────────────────────────┘
    │
    └─→ Calls submitSignup() to Edge Function
        ↓
        POST /functions/v1/ai-signup-guest
        Body: {
          email: "user@gmail.com",
          phone: "(415) 555-5555",
          text_inputted: "Long original text..."
        }
```

### Success Stage

```
┌──────────────────────────────────────┐
│ Stage 5: FINAL / SUCCESS             │
│ [Lottie Success Animation]           │
│                                      │
│ "Success!"                           │
│ "Tomorrow morning, you'll receive    │
│  a full report."                     │
│                                      │
│ "Check your inbox for the            │
│  comprehensive market research       │
│  report."                            │
│                                      │
│ [Close Button]                       │
└──────────────────────────────────────┘
    │
    └─→ Modal closes
        User can now receive market report email
```

---

## Database Schema - After Signup

### What Gets Created

```
BUBBLE.IO (Source of Truth)
├─ user table
│  └─ NEW ROW: {user_id, email, password_hash, ...}

SUPABASE (Replica)
├─ auth.users table
│  └─ NEW ROW: {id (UUID), email, password_hash,
│               user_metadata: {user_id, bubble_user_id, ...}}
│
├─ public.user table
│  └─ NEW ROW: {
│      _id: generated,
│      bubble_id: bubble_user_id,
│      email, first_name, last_name,
│      date_of_birth, phone_number,
│      user_type, ...
│     }
│
├─ account_host table
│  └─ NEW ROW: {
│      _id: generated,
│      User: (FK to public.user._id),
│      HasClaimedListing: false,
│      Receptivity: 0, ...
│     }
│
└─ account_guest table
   └─ NEW ROW: {
      _id: generated,
      User: (FK to public.user._id),
      Email: email, ...
     }
```

### Relationships

```
public.user (Center)
├─ FK: Account - Host / Landlord → account_host._id
├─ FK: Account - Guest → account_guest._id
├─ FK to auth.users (via email)
└─ Reference: bubble_id → Bubble's user table

account_host
└─ FK: User → public.user._id

account_guest
└─ FK: User → public.user._id
```

---

## Session Management After Signup

### Token Storage

```
Browser localStorage (Encrypted)
│
├─ splitlease_auth_token
│  └─ JWT token from Bubble (CRITICAL)
│
├─ splitlease_session_id
│  └─ User ID (secondary identifier)
│
└─ splitlease_user_type
   └─ "Host" or "Guest" (preference)
```

### Subsequent Page Loads

```
Page loads
    ↓
checkAuthStatus() called
    ↓
├─ Check Split Lease cookies (legacy)
│
├─ Check localStorage auth state
│   └─ If present → getAuthToken() + getSessionId()
│
└─ If found: return true
   Else: return false
    ↓
validateTokenAndFetchUser() called
    ↓
    POST /functions/v1/auth-user
    {
      action: "validate",
      payload: { token, user_id }
    }
    ↓
    Bubble validates token expiry
    Supabase fetches updated user data
    ↓
    On success: Cache user type, return user object
    On failure: clearAuthData(), return null
```

### Authentication Check Flow

```
Protected Page Access
    ↓
isProtectedPage() check
├─ /guest-proposals? YES
├─ /account-profile? YES
├─ /host-dashboard? YES
└─ /search? NO
    ↓
if (protected && !isLoggedIn) {
    └─→ Redirect to /signup-login
} else {
    └─→ Allow access
}
```

---

## Error Scenarios

### Signup Validation Errors (Frontend)

```
STEP 1:
├─ Empty First Name → "First name is required."
├─ Empty Last Name → "Last name is required."
├─ Empty Email → "Email is required."
└─ Invalid Email Format → "Please enter a valid email address."

STEP 2:
├─ No Birth Date → "Please enter your date of birth."
├─ Age < 18 → "You must be at least 18 years old..."
├─ Empty Phone → "Phone number is required."
├─ Empty Password → "Password is required."
├─ Password < 4 chars → "Password must be at least 4 characters."
└─ Passwords don't match → "Passwords do not match."
```

### Bubble API Errors

```
Bubble Response
    ↓
    ├─ NOT_VALID_EMAIL
    │  └─ "Please enter a valid email address."
    │
    ├─ USED_EMAIL
    │  └─ "This email is already in use."
    │
    ├─ DO_NOT_MATCH (passwords)
    │  └─ "The two passwords do not match!"
    │
    └─ Other error
       └─ "Signup failed. Please try again."
```

### Database Errors

```
account_host insert fails
    └─ "Failed to create host account: [error]"
    └─ Entire signup fails (NO FALLBACK)

account_guest insert fails
    └─ "Failed to create guest account: [error]"
    └─ Entire signup fails (NO FALLBACK)

public.user insert fails
    └─ "Failed to create user profile: [error]"
    └─ Entire signup fails (NO FALLBACK)
```

---

## Key Code Files

### Frontend
```
/app/src/islands/shared/SignUpLoginModal.jsx
├─ Lines 1-50: Imports and constants
├─ Lines 51-315: Styles object
├─ Lines 374-441: Component state and effects
├─ Lines 532-626: Form handlers
├─ Lines 857-939: Signup Step 1 render
└─ Lines 941-1107: Signup Step 2 render

/app/src/lib/auth.js
├─ Lines 389-472: loginUser()
├─ Lines 493-615: signupUser()
└─ Lines 628-720: validateTokenAndFetchUser()

/app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx
├─ Lines 110-181: submitSignup()
├─ Lines 448-506: handleNext() - extraction logic
└─ Lines 516-548: handleSubmit()
```

### Backend
```
/supabase/functions/auth-user/index.ts
├─ Lines 88-95: Signup action routing

/supabase/functions/auth-user/handlers/signup.ts
├─ Lines 48-388: handleSignup() function
├─ Lines 82-132: Bubble API call
├─ Lines 147-241: Supabase Auth creation
├─ Lines 246-299: Account creation (host + guest)
└─ Lines 301-351: User profile creation
```

---

## Quick Decision Tree

### "Which signup flow should I use?"

```
Are you a regular user with all info?
├─ YES → Use SignUpLoginModal (Path 1)
│        └─ Traditional multi-step form
│
└─ NO → Use AiSignupMarketReport (Path 2)
       └─ AI-powered market research flow
```

### "What happens after signup?"

```
Signup succeeds?
├─ YES → Token stored locally
│        └─ Page reloads
│        └─ User is authenticated
│        └─ Can access protected features
│
└─ NO → Error displayed
       └─ Can retry same form
```

### "Can I be both Host and Guest?"

```
Answer: YES! Both account_host and account_guest
records created for every user.

Type preference stored in:
├─ public.user.Type - User Current
│  └─ What user selected at signup
│
└─ public.user.Type - User Signup
   └─ Can be changed later
```

---

## Summary Table

| Aspect | Path 1 (Standard) | Path 2 (AI Report) |
|--------|-------------------|-------------------|
| **Component** | SignUpLoginModal | AiSignupMarketReport |
| **Entry** | "I'm new here" button | "Market Report" button |
| **Steps** | 2 (name/email, details) | Up to 3 (text, contact, submit) |
| **Creates User?** | YES | NO (info only) |
| **User Type** | Selected by user | Always Guest |
| **Data** | Structured form | Freeform text |
| **Extraction** | None | Smart email/phone |
| **Auto-Submit** | No | Yes (if perfect) |
| **Result** | Full account + authenticated | Market research report |
| **Next Step** | Access protected pages | Receive email report |

---

**End of Visual Guide**
