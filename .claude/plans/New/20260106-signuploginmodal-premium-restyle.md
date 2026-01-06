# SignUpLoginModal Premium Restyle Implementation Plan

**Created**: 2026-01-06
**Status**: Ready for Implementation
**Complexity**: High (1500+ line component, full visual overhaul)
**Estimated Files**: 2 modified, 1 new

---

## Objective

Restyle the `SignUpLoginModal.jsx` component to match the premium design from `signup-mockup-v2.html` while preserving all existing authentication functionality (login, signup, password reset, magic link).

---

## Design System Mapping

### Color Palette Transformation

| Token | Current | New (from mockup) |
|-------|---------|-------------------|
| Primary Purple | `#6c40f5` | `#31135D` |
| Accent (buttons, links) | `#6c40f5` | `#6366F1` (indigo) |
| Accent Hover | - | `#4F46E5` |
| Accent Light (backgrounds) | - | `#EEF2FF` |
| Success | `#408141` | `#10B981` (teal) |
| Error | `#dc2626` | `#dc2626` (unchanged) |
| Text Dark | `#1A1A2E` | `#1a1a1a` |
| Text Gray | `#6b7280` | `#6b7280` (unchanged) |
| Text Light Gray | - | `#9ca3af` |
| Border | `#d1d5db` | `#e5e7eb` |
| LinkedIn Blue | - | `#0a66c2` |

### Typography & Spacing

| Element | Current | New |
|---------|---------|-----|
| Modal max-width | `407px` | `480px` |
| Modal padding | `2rem` | `24px` |
| Border radius (small) | `6px` | `6px` |
| Border radius (medium) | `8px` | `10px` |
| Border radius (large) | `12px` | `12px` |
| Border radius (xl) | - | `16px` |
| Title font size | `1.5rem` | `20px` |
| Label font size | `0.875rem` | `13px` |

### Shadow System

| Element | Current | New |
|---------|---------|-----|
| Modal shadow | `0 50px 80px rgba(0,0,0,0.25)` | `0 20px 40px rgba(0,0,0,0.15)` |
| Card shadow | - | `0 4px 20px rgba(0,0,0,0.08)` |
| Hover shadow | - | `0 8px 30px rgba(99,102,241,0.15)` |

---

## View Architecture Changes

### Current Views → New Views Mapping

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VIEW ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CURRENT                          NEW (from mockup)                     │
│  ───────                          ─────────────────                     │
│                                                                         │
│  INITIAL ──────────────────────→  ENTRY (Step 0)                       │
│  "Welcome to Split Lease!"        - "I'm new around here" card         │
│  - I'm new button                 - "Log into my account" card         │
│  - Log in button                  - "Sign Up with Market Report" card  │
│  - Market Report button                                                 │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [NEW] ────────────────────────→  USER_TYPE (Step 1)                   │
│                                   - "Find a place to stay" → Guest     │
│                                   - "Share my space" → Host            │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  SIGNUP_STEP1 ─────────────────→  IDENTITY (Step 2)                    │
│  "Nice To Meet You!"              - LinkedIn OAuth button (placeholder)│
│  - First/Last name                - Google OAuth button (placeholder)  │
│  - Email                          - OR divider                         │
│                                   - First/Last name                    │
│                                   - Email                              │
│                                   - Birthday (native date input)       │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  SIGNUP_STEP2 ─────────────────→  PASSWORD (Step 3)                    │
│  "Hi, {firstName}!"               - "Almost there, {name}!"            │
│  - User type dropdown             - Password with requirements         │
│  - DOB (3 dropdowns)              - Legal text                         │
│  - Phone                                                                │
│  - Password + confirm                                                   │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  LOGIN ────────────────────────→  LOGIN                                │
│  - Email/password                 - LinkedIn OAuth button (placeholder)│
│  - Log in Without Password        - Google OAuth button (placeholder)  │
│  - Forgot Password link           - OR divider                         │
│                                   - Email/password                     │
│                                   - Log in without password link       │
│                                   - Forgot password link               │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  PASSWORD_RESET ───────────────→  PASSWORD_RESET                       │
│  - Email input                    - Email input (premium styled)       │
│  - Reset button                   - Send Reset Link button             │
│  - Magic link button              - Back to login link                 │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [NEW] ────────────────────────→  RESET_SENT                           │
│                                   - Success icon (mail)                │
│                                   - "Check your email" message         │
│                                   - Back to login button               │
│                                   - Resend link                        │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [NEW] ────────────────────────→  MAGIC_LINK                           │
│                                   - Email input                        │
│                                   - Send Magic Link button             │
│                                   - Back to login link                 │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [NEW] ────────────────────────→  MAGIC_LINK_SENT                      │
│                                   - Success icon (mail)                │
│                                   - "Check your email" message         │
│                                   - Back to login button               │
│                                   - Resend link                        │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  [Toast-based] ────────────────→  SUCCESS                              │
│                                   - Success icon (checkmark)           │
│                                   - "Welcome to Split Lease!"          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Update VIEWS Constant

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`
**Lines**: ~35-41

```javascript
// BEFORE
const VIEWS = {
  INITIAL: 'initial',
  LOGIN: 'login',
  SIGNUP_STEP1: 'signup-step1',
  SIGNUP_STEP2: 'signup-step2',
  PASSWORD_RESET: 'password-reset'
};

// AFTER
const VIEWS = {
  ENTRY: 'entry',              // Step 0: Entry point
  USER_TYPE: 'user-type',      // Step 1: Guest/Host selection
  IDENTITY: 'identity',        // Step 2: Name, email, birthday
  PASSWORD: 'password',        // Step 3: Password creation
  LOGIN: 'login',
  PASSWORD_RESET: 'password-reset',
  RESET_SENT: 'reset-sent',
  MAGIC_LINK: 'magic-link',
  MAGIC_LINK_SENT: 'magic-link-sent',
  SUCCESS: 'success'
};
```

---

### Step 2: Replace Entire `styles` Object

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`
**Lines**: ~52-316

Replace the entire `styles` object with the premium design system. Key changes:

```javascript
const styles = {
  // Modal & Overlay
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 10000
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    position: 'relative'
  },

  // Close button
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '32px',
    height: '32px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    transition: 'color 0.2s ease',
    zIndex: 10
  },

  // Header
  header: {
    textAlign: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a1a1a',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    margin: 0
  },
  subtitleAccent: {
    color: '#6366F1',
    fontWeight: '600'
  },

  // User type cards
  userTypeCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: '#f9fafb'
  },
  userTypeCardHover: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
    boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)'
  },
  userTypeIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    backgroundColor: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6366F1',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
  },
  userTypeContent: {
    flex: 1
  },
  userTypeTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '2px'
  },
  userTypeDesc: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.4
  },

  // LinkedIn button
  linkedinBtn: {
    width: '100%',
    padding: '14px 16px',
    border: '1px solid #0a66c2',
    backgroundColor: '#0a66c2',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px'
  },
  linkedinIcon: {
    width: '32px',
    height: '32px',
    backgroundColor: 'white',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    color: '#0a66c2',
    fontSize: '16px',
    flexShrink: 0
  },
  linkedinText: {
    flex: 1,
    textAlign: 'left'
  },
  linkedinPrimary: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white',
    display: 'block'
  },
  linkedinSecondary: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    display: 'block',
    marginTop: '2px'
  },

  // Google button
  googleBtn: {
    width: '100%',
    padding: '14px 16px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    marginTop: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a1a'
  },

  // Divider
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    margin: '20px 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e5e7eb'
  },
  dividerText: {
    fontSize: '13px',
    color: '#9ca3af',
    fontWeight: '500'
  },

  // Form elements
  formRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px'
  },
  formGroup: {
    flex: 1,
    marginBottom: '16px'
  },
  formLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#9ca3af',
    marginBottom: '6px'
  },
  formInput: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    color: '#1a1a1a',
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
    outline: 'none',
    boxSizing: 'border-box',
    backgroundColor: '#f9fafb'
  },
  formInputFocus: {
    borderColor: '#6366F1',
    backgroundColor: 'white'
  },
  helperText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '6px',
    lineHeight: 1.4
  },

  // Password field
  passwordWrapper: {
    position: 'relative'
  },
  passwordToggle: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    transition: 'color 0.2s ease'
  },

  // Password requirements
  passwordRequirements: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '10px'
  },
  requirement: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '6px'
  },
  requirementMet: {
    color: '#10B981'
  },

  // Buttons
  btnPrimary: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#6366F1',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s ease, box-shadow 0.2s ease',
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnPrimaryHover: {
    backgroundColor: '#4F46E5',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
  },
  btnPrimaryDisabled: {
    backgroundColor: '#e5e7eb',
    cursor: 'not-allowed',
    boxShadow: 'none'
  },
  btnSecondary: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1a1a1a',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  // Back button
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    background: 'none',
    border: 'none',
    color: '#6366F1',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    padding: '12px',
    marginTop: '8px',
    transition: 'opacity 0.2s ease'
  },

  // Footer link
  footerLink: {
    textAlign: 'center',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#6b7280'
  },
  link: {
    color: '#6366F1',
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: 'inherit',
    fontWeight: '500',
    transition: 'opacity 0.2s ease'
  },

  // Legal text
  legalText: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: '16px',
    lineHeight: 1.5
  },

  // Success state
  successIcon: {
    width: '80px',
    height: '80px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    color: '#10B981'
  },

  // Error box
  errorBox: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    marginBottom: '16px'
  },
  errorText: {
    fontSize: '13px',
    color: '#dc2626',
    margin: 0
  }
};
```

---

### Step 3: Add New Icon Components

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`
**Location**: After existing icon components (~lines 322-363)

Add Feather-style icons used in the mockup:

```javascript
// Feather-style icons (matching mockup)
const FeatherIcon = ({ name, size = 20, className = '' }) => {
  const icons = {
    'user-plus': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    'log-in': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
    'bar-chart-2': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    'home': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    'key': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
      </svg>
    ),
    'chevron-right': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    ),
    'x': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    'arrow-left': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    ),
    'mail': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
    'check': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    'check-circle': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    'circle': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
      </svg>
    )
  };

  return icons[name] || null;
};

// Google logo SVG
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
```

---

### ~~Step 4: Add Progress Indicator Component~~ (REMOVED)

**Note**: Progress dots CSS exists in the mockup but is never used in the actual views. Skipping this component.

---

### Step 5: Update State Management

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`
**Location**: Component state section (~lines 408-440)

Update signupData to handle new flow:

```javascript
// State changes needed:
// 1. Remove userType from SIGNUP_STEP1, move to dedicated USER_TYPE step
// 2. Add birthday as single date field (native input) instead of 3 dropdowns
// 3. Remove phone from signup (mockup doesn't have it in main flow)

const [signupData, setSignupData] = useState({
  firstName: '',
  lastName: '',
  email: '',
  userType: defaultUserType === 'host' ? USER_TYPES.HOST : USER_TYPES.GUEST,
  birthday: '', // Changed from birthMonth/birthDay/birthYear to single date
  phoneNumber: '', // Keep for compatibility, collect later or in profile
  password: '',
  confirmPassword: ''
});

// Track LinkedIn connection state (for future OAuth)
const [linkedInConnected, setLinkedInConnected] = useState(false);
```

---

### Step 6: Rewrite All Render Functions

Each render function needs complete rewrite to match mockup. Here's the structure for each:

#### 6.1 `renderEntryView()` (replaces `renderInitialView`)

```javascript
const renderEntryView = () => (
  <>
    <div style={styles.logoContainer}>
      <img
        src="https://d1muf25xaso8hp.cloudfront.net/https%3A%2F%2F50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io%2Ff1587601671931x294112149689599100%2Fsplit%2520lease%2520purple%2520circle.png?w=48&h=&auto=enhance&dpr=1&q=100&fit=max"
        alt="Split Lease"
        style={styles.logo}
      />
    </div>

    <div style={styles.header}>
      <h1 style={styles.title}>Welcome to Split Lease</h1>
      <p style={styles.subtitle}>How can we help you today?</p>
    </div>

    {/* Card: I'm new around here */}
    <div
      style={styles.userTypeCard}
      onClick={() => setCurrentView(VIEWS.USER_TYPE)}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.userTypeCardHover)}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.backgroundColor = '#f9fafb';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={styles.userTypeIcon}>
        <FeatherIcon name="user-plus" size={24} />
      </div>
      <div style={styles.userTypeContent}>
        <h3 style={styles.userTypeTitle}>I'm new around here</h3>
        <p style={styles.userTypeDesc}>Create an account to get started</p>
      </div>
    </div>

    {/* Card: Log into my account */}
    <div
      style={styles.userTypeCard}
      onClick={() => setCurrentView(VIEWS.LOGIN)}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.userTypeCardHover)}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.backgroundColor = '#f9fafb';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={styles.userTypeIcon}>
        <FeatherIcon name="log-in" size={24} />
      </div>
      <div style={styles.userTypeContent}>
        <h3 style={styles.userTypeTitle}>Log into my account</h3>
        <p style={styles.userTypeDesc}>Welcome back! Sign in to continue</p>
      </div>
    </div>

    {/* Card: Market Report */}
    <div
      style={styles.userTypeCard}
      onClick={() => {
        // Market report flow - for now go to signup
        setCurrentView(VIEWS.USER_TYPE);
      }}
      onMouseEnter={(e) => Object.assign(e.currentTarget.style, styles.userTypeCardHover)}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.backgroundColor = '#f9fafb';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={styles.userTypeIcon}>
        <FeatherIcon name="bar-chart-2" size={24} />
      </div>
      <div style={styles.userTypeContent}>
        <h3 style={styles.userTypeTitle}>Sign Up with Market Report</h3>
        <p style={styles.userTypeDesc}>Get NYC rental insights and create an account</p>
      </div>
    </div>
  </>
);
```

#### 6.2 `renderUserTypeView()` (NEW - Step 1)

```javascript
const renderUserTypeView = () => (
  <>
    <div style={styles.logoContainer}>
      <img src="..." alt="Split Lease" style={styles.logo} />
    </div>

    <ProgressIndicator currentStep={1} totalSteps={3} />
    <p style={styles.stepLabel}>Step 1 of 3</p>

    <div style={styles.header}>
      <h1 style={styles.title}>What brings you here?</h1>
      <p style={styles.subtitle}>I'm here to...</p>
    </div>

    {/* Guest card */}
    <div
      style={{
        ...styles.userTypeCard,
        ...(signupData.userType === USER_TYPES.GUEST ? styles.userTypeCardHover : {})
      }}
      onClick={() => {
        setSignupData({ ...signupData, userType: USER_TYPES.GUEST });
        setTimeout(() => setCurrentView(VIEWS.IDENTITY), 300);
      }}
    >
      <div style={styles.userTypeIcon}>
        <FeatherIcon name="home" size={24} />
      </div>
      <div style={styles.userTypeContent}>
        <h3 style={styles.userTypeTitle}>Find a place to stay</h3>
        <p style={styles.userTypeDesc}>Browse flexible rentals across NYC</p>
      </div>
    </div>

    {/* Host card */}
    <div
      style={{
        ...styles.userTypeCard,
        ...(signupData.userType === USER_TYPES.HOST ? styles.userTypeCardHover : {})
      }}
      onClick={() => {
        setSignupData({ ...signupData, userType: USER_TYPES.HOST });
        setTimeout(() => setCurrentView(VIEWS.IDENTITY), 300);
      }}
    >
      <div style={styles.userTypeIcon}>
        <FeatherIcon name="key" size={24} />
      </div>
      <div style={styles.userTypeContent}>
        <h3 style={styles.userTypeTitle}>Share my space</h3>
        <p style={styles.userTypeDesc}>List your place for nightly, weekly, or monthly stays</p>
      </div>
    </div>

    <button style={styles.backBtn} onClick={() => setCurrentView(VIEWS.ENTRY)}>
      <FeatherIcon name="arrow-left" size={16} />
      Back
    </button>
  </>
);
```

#### 6.3 `renderIdentityView()` (replaces `renderSignupStep1` - Step 2)

Full implementation with LinkedIn/Google OAuth buttons (placeholder), divider, form fields.

#### 6.4 `renderPasswordView()` (replaces `renderSignupStep2` - Step 3)

Simplified to just password with requirements display.

#### 6.5 `renderLoginView()` - Updated with OAuth buttons

#### 6.6 `renderPasswordResetView()` - Premium styling

#### 6.7 `renderResetSentView()` (NEW)

#### 6.8 `renderMagicLinkView()` (NEW)

#### 6.9 `renderMagicLinkSentView()` (NEW)

#### 6.10 `renderSuccessView()` (NEW)

---

### Step 7: Update Main Render Switch

**File**: `app/src/islands/shared/SignUpLoginModal.jsx`
**Location**: Main render (~lines 1518-1542)

```javascript
// Render current view
{currentView === VIEWS.ENTRY && renderEntryView()}
{currentView === VIEWS.USER_TYPE && renderUserTypeView()}
{currentView === VIEWS.IDENTITY && renderIdentityView()}
{currentView === VIEWS.PASSWORD && renderPasswordView()}
{currentView === VIEWS.LOGIN && renderLoginView()}
{currentView === VIEWS.PASSWORD_RESET && renderPasswordResetView()}
{currentView === VIEWS.RESET_SENT && renderResetSentView()}
{currentView === VIEWS.MAGIC_LINK && renderMagicLinkView()}
{currentView === VIEWS.MAGIC_LINK_SENT && renderMagicLinkSentView()}
{currentView === VIEWS.SUCCESS && renderSuccessView()}
```

---

### Step 8: Update Navigation Logic

Update these functions to work with new view architecture:

```javascript
// Navigation helpers (update existing)
const goToEntry = () => {
  setCurrentView(VIEWS.ENTRY);
  setError('');
};

const goToUserType = () => {
  setCurrentView(VIEWS.USER_TYPE);
  setError('');
};

const goToIdentity = () => {
  setCurrentView(VIEWS.IDENTITY);
  setError('');
};

const goToPassword = () => {
  setCurrentView(VIEWS.PASSWORD);
  setError('');
};

const goToLogin = () => {
  setCurrentView(VIEWS.LOGIN);
  setError('');
  if (signupData.email) {
    setLoginData(prev => ({ ...prev, email: signupData.email }));
  }
};

const goToMagicLink = () => {
  setCurrentView(VIEWS.MAGIC_LINK);
  setError('');
};

const goToPasswordReset = () => {
  setCurrentView(VIEWS.PASSWORD_RESET);
  setResetEmail(loginData.email);
  setError('');
};

const showSuccess = () => {
  setCurrentView(VIEWS.SUCCESS);
};
```

---

### Step 9: Update initialView Mapping

**Location**: useEffect that handles initialView prop (~lines 442-464)

```javascript
useEffect(() => {
  if (isOpen) {
    // Map initialView prop to internal view state
    if (initialView === 'login') {
      setCurrentView(VIEWS.LOGIN);
    } else if (initialView === 'signup' || initialView === 'signup-step1') {
      setCurrentView(VIEWS.USER_TYPE); // Start at user type selection
    } else if (initialView === 'signup-step2') {
      setCurrentView(VIEWS.IDENTITY);
    } else {
      setCurrentView(VIEWS.ENTRY);
    }
    setError('');

    // ... rest of effect
  }
}, [isOpen, initialView, defaultUserType]);
```

---

### Step 10: Handle Form Data Migration

The new flow collects data differently:

| Current Step | Current Data | New Step | New Data |
|-------------|-------------|----------|----------|
| SIGNUP_STEP1 | firstName, lastName, email | USER_TYPE | userType only |
| SIGNUP_STEP2 | userType, birthMonth/Day/Year, phone, password | IDENTITY | firstName, lastName, email, birthday |
| - | - | PASSWORD | password only |

**Migration approach**: Keep `signupData` structure but change when fields are collected:
- Step 1 (USER_TYPE): Sets `userType`
- Step 2 (IDENTITY): Collects `firstName`, `lastName`, `email`, `birthday`
- Step 3 (PASSWORD): Collects `password`, `confirmPassword`

Phone number will be collected post-signup in profile (or add back if needed).

---

### Step 11: Update CSS Animations

**Location**: Injected styles useEffect (~lines 1025-1038)

```javascript
useEffect(() => {
  const styleId = 'signup-modal-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes modalFadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }
}, []);
```

---

## Data Collection Changes Summary

### Current 2-Step Signup Flow:
```
Step 1: firstName, lastName, email
Step 2: userType, DOB (3 dropdowns), phoneNumber, password, confirmPassword
```

### New 3-Step Signup Flow (from mockup):
```
Step 1 (USER_TYPE): userType selection (Guest/Host cards)
Step 2 (IDENTITY): firstName, lastName, email, birthday (date input)
Step 3 (PASSWORD): password with requirements display
```

### Data Handling:
- **Phone number**: Not collected in mockup flow. Either:
  - Option A: Add to Step 2 after birthday (keep existing requirement)
  - Option B: Collect in profile after signup

- **Birthday**: Changed from 3 dropdowns to native `<input type="date">`
  - Still validates for 18+ age requirement

- **Password confirmation**: Mockup only shows single password field with requirements
  - Recommendation: Keep confirmPassword for security, add to Step 3

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/src/islands/shared/SignUpLoginModal.jsx` | Complete restyle + new views |

## Files to Create (Optional)

| File | Purpose |
|------|---------|
| `app/src/styles/signup-modal.css` | External CSS (if extracting from inline) |

---

## Testing Checklist

After implementation, verify:

- [ ] Entry view displays 3 option cards
- [ ] Login view has OAuth buttons (placeholder), email/password form
- [ ] User type selection advances to identity step
- [ ] Identity step shows progress (2/3), collects name/email/birthday
- [ ] Password step shows progress (3/3), has requirements display
- [ ] All existing functionality works:
  - [ ] Email/password signup
  - [ ] Email/password login
  - [ ] Password reset flow
  - [ ] Magic link flow
  - [ ] Toast notifications
  - [ ] Error handling
  - [ ] Form validation
- [ ] OAuth buttons show placeholder alert (functionality TBD)
- [ ] Mobile responsive (480px breakpoint)
- [ ] Animations smooth (fade in, slide in)
- [ ] All links work (Terms, Privacy, sign up, log in)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing auth flow | Test all auth paths before/after |
| Missing phone number collection | Add to Step 2 or profile |
| View state confusion | Clear mapping table above |
| Style regressions | Compare mockup side-by-side |

---

## Estimated LOC Changes

- **Deleted**: ~250 lines (old styles + old render functions)
- **Added**: ~600 lines (new styles + new render functions + icons)
- **Net**: ~+350 lines (from 1543 to ~1900)

---

## References

- **Mockup**: `.claude/plans/Documents/signup-mockup-v2.html`
- **Current implementation**: `app/src/islands/shared/SignUpLoginModal.jsx`
- **Auth functions**: `app/src/lib/auth.js`
