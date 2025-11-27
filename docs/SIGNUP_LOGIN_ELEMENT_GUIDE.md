# Split Lease Signup/Login Element - Comprehensive Implementation Guide

## Overview

This document provides a complete analysis of the Split Lease authentication modal element behavior from `app.split.lease`. This guide is intended to help replicate the element's functionality in code outside of Bubble.io.

## Screenshots Reference

All screenshots are stored in `.playwright-mcp/`:
- `01_initial_modal_state.png` - Initial "Have we met before?" state
- `02_signup_step1_name_email.png` - Signup Step 1 (Name/Email)
- `03_signup_step2_details.png` - Signup Step 2 (Role/DOB/Phone/Password)
- `04_signup_go_back_data_preserved.png` - Data preserved when going back
- `05_login_view.png` - Login view (empty)
- `06_login_filled_with_options.png` - Login with filled fields showing additional options
- `07_login_success_alert.png` - Successful login state
- `08_user_dropdown_menu.png` - Logged-in user dropdown menu
- `09_logged_out.png` - Logged out state
- `10_login_email_preserved_after_logout.png` - Email preserved after logout
- `11_password_reset_view.png` - Password reset view
- `12_password_reset_pending.png` - Password reset form
- `13_magic_link_sent_alert.png` - Magic link sent confirmation
- `14_signup_with_market_report.png` - AI-powered market report signup
- `15_login_error_wrong_password.png` - Login error state

---

## Element States & Structure

### State 1: Initial Modal (Entry Point)

**Trigger:** Click "Sign In | Sign Up" button in navbar

**UI Elements:**
- Logo + "Welcome to Split Lease!" header
- Question: "Have we met before?"
- Three CTAs:
  1. "I'm new around here" → Signup Flow
  2. "Log into my account" → Login Flow
  3. "Sign Up with Market Report" → AI Market Research Flow
- Close button (X)

**State Data:**
```typescript
interface InitialState {
  view: 'initial';
  showModal: boolean;
}
```

---

### State 2: Signup Flow - Step 1 (Name & Email)

**Trigger:** Click "I'm new around here"

**UI Elements:**
- Header: "Nice To Meet You!"
- Form Fields:
  - First Name* (required, with note: "*Must match your government ID")
  - Last Name* (required)
  - Email* (with note: "Your email serves as your User ID and primary communication channel")
- Continue button
- Footer link: "Have an account? **Log In**"

**Validation Rules:**
- All fields required
- Email must be valid format

**State Data:**
```typescript
interface SignupStep1State {
  view: 'signup-step1';
  firstName: string;
  lastName: string;
  email: string;
}
```

**Data Persistence:**
- ✅ Data IS preserved when navigating back from Step 2
- ❌ Data is NOT transferred to Login when switching flows

---

### State 3: Signup Flow - Step 2 (Account Details)

**Trigger:** Click "Continue" on Step 1 (with valid data)

**UI Elements:**
- Header: "Hi, {firstName}!" (personalized)
- Form Fields:
  - Role Dropdown: "I am signing up to be..."
    - "A Host (I have a space available to rent)"
    - "A Guest (I would like to rent a space)"
  - Birth Date* (date picker with month/year/day selection)
    - Note: "To use our service, you must be 18 years old. Your date of birth will be kept confidential."
  - Phone Number*
  - Password* (with show/hide toggle)
  - Re-enter Password* (with show/hide toggle)
- Legal text: "By signing up or logging in, you agree to the Split Lease Terms of Use, Privacy Policy and Community Guidelines."
- "Agree and Sign Up" button
- "Go Back" link

**Validation Rules:**
- User must be 18+ years old
- Passwords must match
- Phone number format validation

**State Data:**
```typescript
interface SignupStep2State {
  view: 'signup-step2';
  firstName: string; // From Step 1
  lastName: string;  // From Step 1
  email: string;     // From Step 1
  role: 'host' | 'guest';
  birthDate: Date | null;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
}
```

---

### State 4: Login View

**Trigger:** Click "Log into my account" OR "Log In" from signup

**UI Elements:**
- Header: "Welcome back!"
- Section Label: "Login"
- Form Fields:
  - Email* (placeholder: "example@example.com*")
  - Password* (with show/hide toggle)
- Login button (disabled until both fields filled)
- **Conditional Links (appear after email is entered):**
  - "Log in Without Password" → Magic Link flow
  - "Forgot Password? Reset here" → Password Reset flow
- Footer: "Don't have an account? **Sign Up Here**"

**State Data:**
```typescript
interface LoginState {
  view: 'login';
  email: string;
  password: string;
  showPasswordOptions: boolean; // Shows after email entered
}
```

**Data Persistence:**
- ✅ Email IS preserved across sessions (stored in local storage/cookies)
- ✅ Email IS preserved after logout
- ❌ Password is NEVER preserved

---

### State 5: Password Reset View

**Trigger:** Click "Forgot Password? Reset here"

**UI Elements:**
- Header: "Enter your email to reset your password."
- Form Fields:
  - Email* (pre-filled from login state)
- Two Action Buttons:
  - "Reset my password" (primary)
  - "Send me a magic login link" (secondary)
- "Cancel" link → Returns to Login

**State Data:**
```typescript
interface PasswordResetState {
  view: 'password-reset';
  email: string; // Pre-filled from login
}
```

---

### State 6: Market Report Signup (AI Flow)

**Trigger:** Click "Sign Up with Market Report"

**UI Elements:**
- Header: "Market Research for Lodging, Storage, Transport, Restaurants and more"
- Large textarea with placeholder example:
  ```
  ex.
  I need a quiet space near downtown, weekly from Monday to Friday,
  I commute to the city on a weekly basis.

  Send to (415) 555-5555 and guest@mail.com
  ```
- "Next" button

**Purpose:** AI-powered signup that extracts user needs and contact info from natural language input.

---

## Alert/Notification Types

### Success Alerts

**Login Success:**
```typescript
{
  type: 'success',
  title: 'Successful Login',
  message: 'Welcome Back {firstName}'
}
```

**Magic Link Sent:**
```typescript
{
  type: 'success',
  title: 'Login Sent to Email',
  message: 'Please check your inbox: {email}'
}
```

### Error Alerts

**Invalid Credentials:**
```typescript
{
  type: 'error',
  title: 'Whoops...',
  message: 'We could not log you in with those details. Please check your username and password and try again'
}
```

### Alert Behavior
- Alerts appear as modal overlays
- Can be dismissed by clicking X button
- Auto-dismiss after ~3-5 seconds
- Position: Top-right corner of modal

---

## Navigation & Transitions

### Flow Diagram

```
                    ┌─────────────────────────────┐
                    │    "Sign In | Sign Up"      │
                    │      (Navbar Button)        │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │     INITIAL MODAL           │
                    │   "Have we met before?"     │
                    └──────────────┬──────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  "I'm new       │   │  "Log into my   │   │ "Sign Up with   │
│  around here"   │   │    account"     │   │ Market Report"  │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  SIGNUP STEP 1  │   │   LOGIN VIEW    │   │  MARKET REPORT  │
│  (Name/Email)   │◄──┤                 │   │    AI FLOW      │
└────────┬────────┘   └────────┬────────┘   └─────────────────┘
         │ Continue            │
         ▼                     │
┌─────────────────┐            │
│  SIGNUP STEP 2  │            │
│  (Details)      │            │
└────────┬────────┘            │
         │                     │
         ▼                     ▼
┌─────────────────────────────────────────┐
│           AUTHENTICATED STATE           │
│  (User Profile Dropdown in Navbar)      │
└────────────────────┬────────────────────┘
                     │ Sign Out
                     ▼
         ┌───────────────────────┐
         │    LOGGED OUT STATE   │
         │ (Back to Initial)     │
         └───────────────────────┘
```

### Cross-Flow Links

| From | Action | To | Data Preserved |
|------|--------|----|----|
| Signup Step 1 | "Log In" | Login View | ❌ Email not transferred |
| Signup Step 2 | "Go Back" | Signup Step 1 | ✅ All Step 1 data |
| Login View | "Sign Up Here" | Signup Step 1 | ❌ Email not transferred |
| Login View | "Forgot Password?" | Password Reset | ✅ Email preserved |
| Password Reset | "Cancel" | Login View | ✅ Email preserved |

---

## Data Persistence Rules

### Session Storage (persists during session)
- First Name, Last Name (signup flow)
- Email (across all views)
- Role selection
- Birth date
- Phone number

### Local Storage/Cookies (persists across sessions)
- Email (for "remember me" functionality)
- Last login timestamp

### Never Persisted
- Passwords
- Confirm password

---

## Logged-In State UI

### Navbar Changes
When logged in, the navbar transforms:
- "Sign In | Sign Up" → User profile avatar + name
- "Host with Us" may be hidden (based on role)
- Notification badge appears (shows unread count)
- "AI Suggested Proposal" feature appears

### User Dropdown Menu
Items (with counts where applicable):
1. My Profile
2. My Proposals (count badge)
3. My Leases
4. My Favorite Listings (count badge)
5. Rental Application
6. Reviews Manager
7. Referral
8. Messages (count badge)
9. **Sign Out**

---

## Implementation Recommendations

### State Management Structure

```typescript
type AuthView =
  | 'closed'
  | 'initial'
  | 'signup-step1'
  | 'signup-step2'
  | 'login'
  | 'password-reset'
  | 'market-report';

interface AuthModalState {
  isOpen: boolean;
  currentView: AuthView;

  // Signup data
  signup: {
    firstName: string;
    lastName: string;
    email: string;
    role: 'host' | 'guest' | null;
    birthDate: Date | null;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
  };

  // Login data
  login: {
    email: string;
    password: string;
  };

  // UI states
  isLoading: boolean;
  error: string | null;

  // Persisted
  rememberedEmail: string | null;
}
```

### Required API Endpoints

```typescript
// Authentication
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/validate-token

// Password Management
POST /api/auth/reset-password
POST /api/auth/send-magic-link

// Market Report (AI)
POST /api/ai/market-report-signup
```

### Validation Functions

```typescript
// Email validation
const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Age validation (18+)
const isOver18 = (birthDate: Date): boolean => {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
};

// Password match validation
const passwordsMatch = (password: string, confirm: string): boolean => {
  return password === confirm && password.length > 0;
};

// Phone validation (basic US format)
const isValidPhone = (phone: string): boolean => {
  return /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(phone);
};
```

---

## CSS/Styling Notes

### Modal Characteristics
- Centered overlay with semi-transparent backdrop
- White background with rounded corners
- Drop shadow for depth
- Max-width: ~450px
- Responsive (full-width on mobile)

### Color Scheme
- Primary: Purple (#6B46C1 approximately)
- Text: Dark gray/black
- Links: Purple (matches primary)
- Error: Red
- Success: Green

### Button Styles
- Primary: Filled purple background, white text
- Secondary: White background with purple border
- Disabled: Gray background (when form incomplete)

### Input Styles
- Rounded borders
- Purple focus ring
- Floating labels (label moves up when focused/filled)
- Password fields have eye icon for show/hide toggle

---

## Error Handling

### Client-Side Validation Errors
- Display inline below the relevant field
- Red text color
- Fields get red border

### Server-Side Errors
- Display as alert modal
- "Whoops..." title for login errors
- Specific error messages for different failure types:
  - Invalid credentials
  - Account not found
  - Account locked
  - Network error

---

## Testing Checklist

- [ ] Initial modal opens on "Sign In | Sign Up" click
- [ ] All three initial CTAs navigate correctly
- [ ] Signup Step 1 → Step 2 transition preserves data
- [ ] "Go Back" preserves Step 1 data
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] "Log in Without Password" sends magic link
- [ ] "Forgot Password" navigates to reset view
- [ ] Email persists across views within session
- [ ] Email persists after logout
- [ ] User dropdown appears when logged in
- [ ] Sign Out returns to logged-out state
- [ ] Modal closes when clicking X or backdrop
- [ ] Form validation prevents invalid submissions
- [ ] 18+ age restriction is enforced
- [ ] Password show/hide toggle works

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-26 | 1.0 | Initial documentation from Bubble.io analysis |

