# Auth-User Edge Function - Quick Reference

**GENERATED**: 2025-12-11
**VERSION**: 1.0.0
**STATUS**: Production
**RUNTIME**: Deno 2 (Supabase Edge Functions)

---

## Overview

The `auth-user` Edge Function handles all authentication operations for Split Lease. It uses **Supabase Auth natively** for login, signup, password reset, and password update operations, while maintaining backward compatibility with Bubble for the validate action.

---

## Endpoint

```
POST /functions/v1/auth-user
```

---

## Request Format

```json
{
  "action": "action_name",
  "payload": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

---

## Supported Actions

| Action | Description | Auth Required | Backend |
|--------|-------------|---------------|---------|
| `login` | Authenticate user | No | Supabase Auth (Native) |
| `signup` | Register new user | No | Supabase Auth (Native) |
| `logout` | End session (stub) | No | Client-side (Supabase Auth) |
| `validate` | Validate token & fetch user | No | Supabase + Bubble (Legacy) |
| `request_password_reset` | Send reset email | No | Supabase Auth (Native) |
| `update_password` | Set new password | No* | Supabase Auth (Native) |

*Requires valid access_token from reset email link

---

## Action Details

### 1. Login

**Endpoint**: `POST /functions/v1/auth-user`

**Request**:
```json
{
  "action": "login",
  "payload": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "abc123xyz...",
    "expires_in": 3600,
    "user_id": "1733904567890x123456789",
    "supabase_user_id": "uuid-here",
    "user_type": "Guest",
    "host_account_id": "1733904567890x987654321",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "profilePhoto": "https://..."
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid email or password. Please try again."
}
```

**Handler**: `supabase/functions/auth-user/handlers/login.ts`

---

### 2. Signup

**Endpoint**: `POST /functions/v1/auth-user`

**Request**:
```json
{
  "action": "signup",
  "payload": {
    "email": "newuser@example.com",
    "password": "password123",
    "retype": "password123",
    "additionalData": {
      "firstName": "Jane",
      "lastName": "Smith",
      "userType": "Guest",
      "birthDate": "1990-05-15",
      "phoneNumber": "(555) 123-4567"
    }
  }
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "abc123xyz...",
    "expires_in": 3600,
    "user_id": "1733904567890x123456789",
    "host_account_id": "1733904567890x987654321",
    "supabase_user_id": "uuid-here",
    "user_type": "Guest"
  }
}
```

**Handler**: `supabase/functions/auth-user/handlers/signup.ts`

**Operations Performed**:
1. Check existing user in public.user and auth.users
2. Generate Bubble-style IDs via `generate_bubble_id()` RPC
3. Create Supabase Auth user with metadata
4. Sign in to get session tokens
5. Insert account_host record
6. Insert public.user record
7. Queue Bubble sync (async, non-blocking)

---

### 3. Logout

**Endpoint**: `POST /functions/v1/auth-user`

**Request**:
```json
{
  "action": "logout",
  "payload": {
    "token": "optional-token-here"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Logout successful"
  }
}
```

**Note**: This is a stub handler. Actual logout happens client-side via `supabase.auth.signOut()`.

**Handler**: `supabase/functions/auth-user/handlers/logout.ts`

---

### 4. Validate

**Endpoint**: `POST /functions/v1/auth-user`

**Request**:
```json
{
  "action": "validate",
  "payload": {
    "token": "access_token_here",
    "user_id": "1733904567890x123456789"
  }
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "userId": "1733904567890x123456789",
    "firstName": "John",
    "fullName": "John Doe",
    "email": "user@example.com",
    "profilePhoto": "https://...",
    "userType": "Guest",
    "accountHostId": "1733904567890x987654321",
    "aboutMe": null,
    "needForSpace": null,
    "specialNeeds": null
  }
}
```

**Handler**: `supabase/functions/auth-user/handlers/validate.ts`

**Note**: Token validation against Bubble is skipped. User existence is verified via Supabase query by `_id`.

---

### 5. Request Password Reset

**Endpoint**: `POST /functions/v1/auth-user`

**Request**:
```json
{
  "action": "request_password_reset",
  "payload": {
    "email": "user@example.com",
    "redirectTo": "https://split.lease/reset-password"
  }
}
```

**Response** (always success for security):
```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a password reset link has been sent.",
    "_debug": {
      "email": "user@example.com",
      "timestamp": "2025-12-11T10:30:00.000Z",
      "steps": ["checking_auth_users", "reset_email_sent"],
      "emailSent": true
    }
  }
}
```

**Handler**: `supabase/functions/auth-user/handlers/resetPassword.ts`

**Features**:
- Always returns success (prevents email enumeration)
- Auto-creates auth.users entry for legacy Bubble users
- Links legacy users to existing public.user records
- Default redirect: `https://split.lease/reset-password`

---

### 6. Update Password

**Endpoint**: `POST /functions/v1/auth-user`

**Request**:
```json
{
  "action": "update_password",
  "payload": {
    "password": "newPassword123",
    "access_token": "token-from-reset-email-link"
  }
}
```

**Success Response**:
```json
{
  "success": true,
  "data": {
    "message": "Password updated successfully. You can now sign in with your new password."
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Invalid or expired reset link. Please request a new password reset."
}
```

**Handler**: `supabase/functions/auth-user/handlers/updatePassword.ts`

**Validation**:
- Password minimum length: 4 characters
- Access token must be valid (from reset email link)

---

## File Structure

```
supabase/functions/auth-user/
├── index.ts                      # Main router
└── handlers/
    ├── login.ts                  # Supabase Auth login
    ├── signup.ts                 # Supabase Auth signup
    ├── logout.ts                 # Logout stub
    ├── validate.ts               # Token validation
    ├── resetPassword.ts          # Password reset request
    └── updatePassword.ts         # Password update
```

---

## Dependencies

### Shared Utilities

| File | Purpose |
|------|---------|
| `_shared/cors.ts` | CORS headers configuration |
| `_shared/errors.ts` | Error classes (BubbleApiError, SupabaseSyncError) |
| `_shared/validation.ts` | Input validation utilities |
| `_shared/slack.ts` | Error reporting to Slack |
| `_shared/queueSync.ts` | Bubble sync queue (signup only) |

### Environment Variables

| Variable | Required For | Description |
|----------|--------------|-------------|
| `SUPABASE_URL` | All actions | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | All actions | Service role key for admin ops |
| `BUBBLE_API_BASE_URL` | validate | Bubble API base URL |
| `BUBBLE_API_KEY` | validate | Bubble API key |

---

## Error Classes

| Class | HTTP Status | Usage |
|-------|-------------|-------|
| `BubbleApiError` | Variable | Auth/API errors with custom messages |
| `SupabaseSyncError` | 500 | Database sync errors |
| `ValidationError` | 400 | Input validation failures |
| `AuthenticationError` | 401 | Authentication failures |

---

## Security Notes

1. **No User Authentication Required**: These ARE the auth endpoints
2. **API Keys Server-Side**: All secrets stored in Supabase Dashboard
3. **Password Never Stored**: Supabase Auth handles hashing (bcrypt)
4. **Email Enumeration Prevention**: Password reset always returns success
5. **CORS Enabled**: Allows requests from any origin
6. **Error Reporting**: Errors reported to Slack (consolidated)

---

## ID Generation

Uses `generate_bubble_id()` database function for Bubble-compatible IDs:

```typescript
const { data: userId } = await supabaseAdmin.rpc('generate_bubble_id');
```

**Format**: `{timestamp}x{random15digits}` (e.g., `1733904567890x123456789012345`)

---

## Bubble Sync

Signup queues background sync to Bubble via `sync_queue` table:

```typescript
await enqueueSignupSync(supabaseAdmin, userId, hostAccountId);
triggerQueueProcessing(); // Non-blocking
```

Processed by:
- `bubble_sync` Edge Function
- pg_cron job (every 5 minutes)

---

## Testing

```bash
# Login
curl -X POST https://your-project.supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{"action":"login","payload":{"email":"test@example.com","password":"test123"}}'

# Signup
curl -X POST https://your-project.supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{"action":"signup","payload":{"email":"new@example.com","password":"test123","retype":"test123","additionalData":{"firstName":"Test","lastName":"User","userType":"Guest"}}}'

# Password Reset
curl -X POST https://your-project.supabase.co/functions/v1/auth-user \
  -H "Content-Type: application/json" \
  -d '{"action":"request_password_reset","payload":{"email":"test@example.com"}}'
```

---

## Deployment

```bash
# Deploy auth-user function
supabase functions deploy auth-user

# View logs
supabase functions logs auth-user --follow
```

**REMINDER**: Edge Functions require manual deployment after changes.

---

**DOCUMENT_VERSION**: 1.0.0
**LAST_UPDATED**: 2025-12-11
**AUTHOR**: Claude Code
