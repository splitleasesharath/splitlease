# auth-user Edge Function

**ENDPOINT**: `POST /functions/v1/auth-user`
**AUTH_REQUIRED**: No (these ARE the auth endpoints)
**SOURCE**: `supabase/functions/auth-user/`

---

## Purpose

Routes authentication requests to appropriate handlers. Supports both native Supabase Auth (login/signup/password) and legacy Bubble integration (validate).

---

## Actions

| Action | Handler | Backend | Description |
|--------|---------|---------|-------------|
| `login` | `handlers/login.ts` | Supabase Auth | Email/password login |
| `signup` | `handlers/signup.ts` | Supabase Auth | New user registration |
| `logout` | `handlers/logout.ts` | Client-side | Stub (actual logout is client-side) |
| `validate` | `handlers/validate.ts` | Bubble + Supabase | Validate token, fetch user data |
| `request_password_reset` | `handlers/resetPassword.ts` | Supabase Auth | Send password reset email |
| `update_password` | `handlers/updatePassword.ts` | Supabase Auth | Update password after reset |

---

## Action Details

### login

Authenticates user via Supabase Auth native `signInWithPassword`.

**Request:**
```json
{
  "action": "login",
  "payload": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "...",
    "user_id": "bubble-user-id",
    "supabase_user_id": "uuid",
    "user_type": "guest|host",
    "host_account_id": "...",
    "guest_account_id": "..."
  }
}
```

---

### signup

Registers new user via Supabase Auth native. Creates:
1. Supabase auth user
2. `public.user` record
3. `host_account` record
4. `guest_account` record

Enqueues `SIGNUP_ATOMIC` operation for Bubble sync.

**Request:**
```json
{
  "action": "signup",
  "payload": {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "user_type": "guest"
  }
}
```

**Response:** Same structure as login.

---

### logout

Stub handler. Actual logout happens client-side via Supabase Auth `signOut()`.

**Request:**
```json
{
  "action": "logout",
  "payload": {}
}
```

---

### validate

Validates token and fetches user data. Uses Bubble API (legacy) plus Supabase lookup.

**Request:**
```json
{
  "action": "validate",
  "payload": {
    "token": "bubble-auth-token"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "...",
    "email": "...",
    "full_name": "...",
    "host_account_id": "...",
    "guest_account_id": "..."
  }
}
```

---

### request_password_reset

Sends password reset email via Supabase Auth.

**Security**: Always returns success to prevent email enumeration attacks.

**Request:**
```json
{
  "action": "request_password_reset",
  "payload": {
    "email": "user@example.com",
    "redirect_url": "https://split.lease/reset-password"
  }
}
```

---

### update_password

Updates password after user clicks reset link.

**Request:**
```json
{
  "action": "update_password",
  "payload": {
    "access_token": "token-from-reset-link",
    "new_password": "newpassword123"
  }
}
```

---

## File Structure

```
auth-user/
├── index.ts                    # Main router
├── handlers/
│   ├── login.ts               # handleLogin()
│   ├── signup.ts              # handleSignup()
│   ├── logout.ts              # handleLogout()
│   ├── validate.ts            # handleValidate()
│   ├── resetPassword.ts       # handleRequestPasswordReset()
│   └── updatePassword.ts      # handleUpdatePassword()
└── deno.json                  # Import map
```

---

## Dependencies

- Supabase Auth (native)
- Bubble API (legacy, for validate only)
- `_shared/cors.ts`
- `_shared/errors.ts`
- `_shared/validation.ts`
- `_shared/slack.ts`

---

## Error Handling

- Invalid credentials: 401
- Missing required fields: 400 (ValidationError)
- Supabase Auth errors: Pass through with original status

---

**LAST_UPDATED**: 2025-12-11
