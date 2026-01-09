---
name: playwrightTestGuideLoginInstructions
description: Playwright MCP login state detection and user account type switching for Split Lease testing. Use when Playwright MCP needs to: (1) Determine if a user is logged in or logged out, (2) Identify the current user type (host or guest account), (3) Perform login, logout, or account switching operations, (4) Authenticate with test credentials from environment variables. CRITICAL - Only perform login/logout actions when explicitly instructed.
---

# Playwright Test Guide: Login Instructions

This skill provides login state detection and user account management for Playwright MCP when testing the Split Lease application.

## Login State Detection

### Logged Out State
When the user is logged out, the following elements are **visible** in the header:
- "Sign In" button (top right corner)
- "Sign Up" button (top right corner)

### Logged In State
When the user is logged in, the header displays:
- **Username** (clickable)
- **User profile picture** or avatar
- The "Sign In" and "Sign Up" buttons are **NOT visible**

## User Type Detection

After confirming a user is logged in, determine the account type by checking which navigation option is visible:

| Visible Element | Account Type |
|----------------|--------------|
| "Stay with Us" in navigation | **Guest** account |
| "Host with Us" in navigation | **Host** account |

**Note**: Only ONE of these options will be visible at a time, indicating the current account type.

## Test Credentials (Environment Variables)

Retrieve test credentials from Windows environment variables (set via `setx` PowerShell command):

| Account Type | Email Address Variable | Password Variable |
|--------------|------------------------|-------------------|
| **Host** | `TESTHOSTEMAILADDRESS` | `TESTPASSWORD` |
| **Guest** | `TESTGUESTEMAILADDRESS` | `TESTPASSWORD` |

**Access in Playwright**:
```javascript
const hostEmail = process.env.TESTHOSTEMAILADDRESS;
const guestEmail = process.env.TESTGUESTEMAILADDRESS;
const password = process.env.TESTPASSWORD;
```

## Login Workflow

### CRITICAL RULE
**Only perform login, logout, or account switching when explicitly instructed in the test scenario.** Do not proactively log in or switch accounts.

### When Login Is Required

If the test instructions specify a particular user type must be logged in:

1. **Check current state**:
   - Use login state detection (see above) to determine if logged in
   - If logged in, use user type detection to determine account type

2. **If already logged in as correct type**:
   - Proceed with test (no action needed)

3. **If logged in as wrong type**:
   - Click the **username** in the header
   - Select **Logout** from the dropdown menu
   - Wait for redirect to logged-out state (Sign In/Sign Up buttons appear)
   - Proceed to step 4

4. **If logged out** (or after logout):
   - Click the **"Sign In"** button in the header
   - Wait for the login page to load
   - Enter the appropriate email address:
     - **Host**: Use `process.env.TESTHOSTEMAILADDRESS`
     - **Guest**: Use `process.env.TESTGUESTEMAILADDRESS`
   - Enter password: Use `process.env.TESTPASSWORD`
   - Submit the login form
   - Wait for redirect to authenticated state (username/profile pic appears)

### Login Page Selectors (Reference)

These are common patterns for the Split Lease login form:
- Email input: Look for `input[type="email"]` or `input[name="email"]`
- Password input: Look for `input[type="password"]` or `input[name="password"]`
- Submit button: Look for `button[type="submit"]` or button with text "Sign In" / "Log In"

## Example Decision Tree

```
Is login required for this test?
├─ NO → Proceed with test as-is
└─ YES → What user type is required?
    ├─ HOST
    │   ├─ Currently logged out? → Log in with TESTHOSTEMAILADDRESS
    │   ├─ Currently logged in as guest? → Logout → Log in with TESTHOSTEMAILADDRESS
    │   └─ Currently logged in as host? → Proceed with test
    └─ GUEST
        ├─ Currently logged out? → Log in with TESTGUESTEMAILADDRESS
        ├─ Currently logged in as host? → Logout → Log in with TESTGUESTEMAILADDRESS
        └─ Currently logged in as guest? → Proceed with test
```

## Best Practices

1. **Always verify login state** before performing login actions
2. **Wait for page transitions** after login/logout (check for header changes)
3. **Only act when instructed** - don't assume login is needed
4. **Handle authentication redirects** - login may redirect to the original requested page
5. **Use environment variables** - never hardcode credentials in test code
