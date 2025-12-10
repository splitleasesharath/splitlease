# Signup Flow - Quick Reference

**Last Updated**: 2025-12-03

---

## Data Flow at a Glance

```
User Form → signupUser() → bubble-auth-proxy → Bubble API → Supabase
```

---

## Signup Fields Collected

### Step 1 (Basic Info)
| Field | Type | Validation |
|-------|------|-----------|
| First Name | Text | Required |
| Last Name | Text | Required |
| Email | Email | Required, RFC format |

### Step 2 (Detailed Info)
| Field | Type | Validation |
|-------|------|-----------|
| User Type | Enum (Guest/Host) | Required, defaults to Guest |
| Birth Date | Date (3 dropdowns) | Required, age >= 18 |
| Phone Number | Tel | Required |
| Password | String | Required, >= 4 chars |
| Confirm Password | String | Required, must match |

---

## API Payload Format

```json
{
  "action": "signup",
  "payload": {
    "email": "user@example.com",
    "password": "securepassword",
    "retype": "securepassword",
    "additionalData": {
      "firstName": "John",
      "lastName": "Doe",
      "userType": "Guest",
      "birthDate": "1990-05-15",
      "phoneNumber": "+1-555-555-5555"
    }
  }
}
```

## Critical: Field Names Are camelCase

Bubble expects **camelCase**, not snake_case:
- ✅ `firstName` (correct)
- ❌ `first_name` (incorrect)
- ✅ `userType` (correct)
- ❌ `user_type` (incorrect)
- ✅ `birthDate` (correct)
- ❌ `birth_date` (incorrect)

---

## Component Entry Points

| File | Component | Purpose |
|------|-----------|---------|
| `SignUpLoginModal.jsx` | `<SignUpLoginModal>` | Multi-step signup UI |
| `auth.js` | `signupUser()` | API caller |
| `bubble-auth-proxy/handlers/signup.ts` | `handleSignup()` | Edge Function handler |

---

## Key Code Snippets

### Open Signup Modal

```jsx
import SignUpLoginModal from './shared/SignUpLoginModal.jsx';

<SignUpLoginModal
  isOpen={true}
  onClose={() => setOpen(false)}
  initialView="signup"
  defaultUserType="guest"
  onAuthSuccess={() => window.location.reload()}
/>
```

### Call Signup Directly

```javascript
import { signupUser } from 'lib/auth.js';

const result = await signupUser(
  'user@example.com',
  'password123',
  'password123',
  {
    firstName: 'John',
    lastName: 'Doe',
    userType: 'Guest',
    birthDate: '1990-05-15',
    phoneNumber: '+1-555-555-5555'
  }
);

if (result.success) {
  console.log('User ID:', result.user_id);
  console.log('Token expires in:', result.expires, 'seconds');
} else {
  console.error('Signup failed:', result.error);
}
```

### Check Auth Status Post-Signup

```javascript
import { validateTokenAndFetchUser } from 'lib/auth.js';

const userData = await validateTokenAndFetchUser();
if (userData) {
  console.log('User:', userData.firstName, userData.userType);
} else {
  console.log('Session invalid');
}
```

---

## Response Formats

### Signup Success Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user_id": "bubble-user-id-123",
    "expires": 86400
  }
}
```

### Signup Error Response
```json
{
  "success": false,
  "error": "This email is already in use."
}
```

### Validate Success Response
```json
{
  "success": true,
  "data": {
    "userId": "bubble-user-id-123",
    "firstName": "John",
    "fullName": "John Doe",
    "profilePhoto": "https://cdn.example.com/photo.jpg",
    "userType": "Guest"
  }
}
```

---

## Error Messages Users See

| Error | When |
|-------|------|
| "Please enter a valid email address." | Email fails RFC validation |
| "This email is already in use." | Email already registered in Bubble |
| "The two passwords do not match!" | Confirm password ≠ password |
| "Password must be at least 4 characters." | Password length < 4 |
| "You must be at least 18 years old to use Split Lease." | Age calculation < 18 |
| "Please enter your date of birth." | DOB fields incomplete |
| "Phone number is required." | Phone field empty |
| "Network error. Please check your connection and try again." | Network/fetch error |

---

## User Table Fields (Supabase)

After signup, user data is synced to Supabase `user` table:

| Field | Value Source |
|-------|--------------|
| `_id` | Bubble's user ID |
| `"Name - First"` | signup Step 1: firstName |
| `"Name - Full"` | Calculated from first + last name |
| `"Type - User Current"` | signup Step 2: userType (Guest/Host) |
| `"Profile Photo"` | User profile settings (not from signup) |

---

## Secure Storage (Frontend)

Post-signup, tokens are encrypted in localStorage:

```javascript
// Automatically handled by signupUser()
localStorage['splitlease_auth_token']   // Encrypted JWT
localStorage['splitlease_session_id']   // Encrypted user_id
localStorage['splitlease_user_type']    // Plain text user type
localStorage['splitlease_auth_state']   // Auth boolean
```

---

## Environment Variables Required

### Frontend (.env in app/)
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GOOGLE_MAPS_API_KEY=...
```

### Edge Function Secrets (Supabase Dashboard)
```
BUBBLE_API_BASE_URL=https://app.split.lease/version-test/api/1.1
BUBBLE_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Default Values

| Field | Default |
|-------|---------|
| User Type | "Guest" |
| Password Min Length | 4 characters |
| Token Expiry | ~86400 seconds (24 hours) |
| Age Requirement | >= 18 years |

---

## Validation Summary

| Location | Type | Examples |
|----------|------|----------|
| Frontend (React) | Format, length, age | Email regex, pwd >= 4, age >= 18 |
| Edge Function (Deno) | Format, length, match | Pwd >= 4, pwd === retype |
| Bubble API | Uniqueness, format | Email unique, email valid |

---

## Post-Signup Flow

1. **signupUser() returns success**
   - Tokens stored in secure storage

2. **Modal closes, page reloads**
   - Triggers auth check

3. **validateTokenAndFetchUser() called**
   - Validates token via Edge Function
   - Queries Supabase user table
   - Returns user profile data

4. **App renders authenticated UI**
   - Shows user name in header
   - Shows avatar/logout menu
   - Enables protected pages

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Email already in use" on signup | Email already registered - login instead |
| "Password must be at least 4 characters" | Increase password length |
| "Please enter a valid email address" | Check email format |
| User type not saving | Ensure `userType` is "Guest" or "Host" (case-sensitive) |
| Birth date validation fails | Check month (1-12), day (1-31), year (1925-2024) |
| Token expires after 24 hours | User must login again |
| Page doesn't reload after signup | Check browser console for errors |

---

## Testing Checklist

- [ ] Step 1 validation works for empty fields
- [ ] Email validation works for invalid formats
- [ ] Continue button transitions to Step 2
- [ ] Age validation rejects < 18
- [ ] Password mismatch shows visual feedback
- [ ] Submit sends correct payload format
- [ ] Success response stores tokens
- [ ] Page reloads after success
- [ ] User data displays post-reload

---

## Files to Modify for Signup Changes

| Aspect | Files |
|--------|-------|
| Signup UI fields | `SignUpLoginModal.jsx` |
| API request format | `auth.js` (signupUser) |
| Edge Function logic | `bubble-auth-proxy/handlers/signup.ts` |
| User validation | `bubble-auth-proxy/handlers/validate.ts` |
| Error messages | Multiple (translate from Bubble errors) |
| Secure storage | `secureStorage.js` |

---

## Related Workflows

- **Login**: `bubble-auth-proxy/handlers/login.ts` (similar flow)
- **Logout**: `bubble-auth-proxy/handlers/logout.ts` (clears tokens)
- **Validate**: `bubble-auth-proxy/handlers/validate.ts` (post-signup user fetch)
- **Password Reset**: Not yet implemented in Edge Functions

---

**For detailed information**, see: `docs/SIGNUP_FLOW_ARCHITECTURE_ANALYSIS.md`

