# Trial Host Signup Integration Plan

**Generated**: 2026-01-18
**Source Repository**: https://github.com/splitleasesharath/signup-trial-host-RE.git
**Target**: Split Lease Islands Architecture + Supabase Auth

---

## Executive Summary

This plan outlines the integration of a "Trial Host" signup flow into the Split Lease application. The external repository uses **Bubble API** which is incompatible with our **Supabase Auth** system. The component must be **rebuilt** following Split Lease patterns rather than directly ported.

**Key Decision**: Create a new shared island component `SignUpTrialHost` that follows the existing `AiSignupMarketReport` pattern - a specialized signup flow for a specific user type.

---

## 1. Architecture Analysis

### 1.1 External Repository Structure (What We're Adapting From)

```
signup-trial-host-RE/
├── src/
│   ├── SignUpLoginModal.tsx      # Main component (465 lines)
│   ├── SignUpLoginModal.styles.ts # Styled-components (390+ lines)
│   ├── types/auth.ts             # 17 TypeScript interfaces
│   ├── validation.ts             # Email, phone, password validation
│   └── services/bubbleAPI.ts     # Bubble API calls (NOT COMPATIBLE)
```

**External Component Features**:
- Multi-step signup form
- Email/phone/password validation
- User type selection
- Styled-components styling
- Bubble API backend

### 1.2 Split Lease Architecture (What We Must Follow)

```
app/src/islands/shared/
├── SignUpLoginModal.jsx          # General auth modal (2500+ lines)
├── AiSignupMarketReport/
│   └── AiSignupMarketReport.jsx  # AI-powered guest signup (2250+ lines)
└── SignUpTrialHost/              # NEW - To be created
    └── SignUpTrialHost.jsx
```

**Split Lease Patterns**:
- Islands Architecture with Hollow Components
- Supabase Auth via Edge Functions
- Inline styles (NOT styled-components)
- `useToast()` for notifications
- `signupUser()` from `app/src/lib/auth.js`

---

## 2. Breaking Changes & Compatibility Issues

### 2.1 CRITICAL: Backend Incompatibility

| External Repo | Split Lease | Action Required |
|---------------|-------------|-----------------|
| Bubble API (`bubbleAPI.ts`) | Supabase Auth | **Complete replacement** |
| Direct API calls | Edge Functions | Use `signupUser()` from auth.js |
| Bubble user IDs | `generate_bubble_id()` RPC | Already handled by signup.ts |

**The entire `services/bubbleAPI.ts` file CANNOT be used.** All API calls must go through:
```javascript
import { signupUser } from '../../lib/auth.js';
```

### 2.2 Styling System Mismatch

| External Repo | Split Lease | Action Required |
|---------------|-------------|-----------------|
| styled-components | Inline styles / CSS | Convert all styles |
| CSS-in-JS objects | React `style` prop | Manual conversion |

**Example conversion needed**:
```tsx
// EXTERNAL (styled-components) - NOT COMPATIBLE
const StyledButton = styled.button`
  background: #007bff;
  padding: 12px 24px;
`;

// SPLIT LEASE (inline styles) - REQUIRED PATTERN
const buttonStyle = {
  background: '#007bff',
  padding: '12px 24px'
};
<button style={buttonStyle}>...</button>
```

### 2.3 User Type Configuration

The "Trial Host" user type **already exists** in the signup handler:

**File**: `supabase/functions/auth-user/handlers/signup.ts:88-91`
```typescript
const userTypeDisplayMap: Record<string, string> = {
  // ...
  'Trial Host': 'Trial Host',
  'trial_host': 'Trial Host'
};
```

**No Edge Function changes required** - just pass `userType: 'Trial Host'` in additionalData.

### 2.4 TypeScript to JavaScript

| External Repo | Split Lease | Action Required |
|---------------|-------------|-----------------|
| TypeScript (`.tsx`) | JavaScript (`.jsx`) | Remove type annotations |
| Interface definitions | JSDoc comments (optional) | Simplify or add JSDoc |

---

## 3. Implementation Plan

### Phase 1: Create Component Structure

**Create directory and main component file**:

```
app/src/islands/shared/SignUpTrialHost/
├── SignUpTrialHost.jsx           # Main component
├── useSignUpTrialHostLogic.js    # Hook for business logic (Hollow Component pattern)
└── index.js                      # Export barrel
```

### Phase 2: Component Implementation

#### 2.1 Main Component (`SignUpTrialHost.jsx`)

**Responsibilities**:
- Render multi-step signup form
- Collect: firstName, lastName, email, password, phone (optional)
- Fixed userType: 'Trial Host' (not selectable)
- Show house manual tool value proposition

**Key imports (from existing codebase)**:
```javascript
import { signupUser } from '../../lib/auth.js';
import { useToast } from '../../hooks/useToast.js';
import { saveAuthTokens } from '../../lib/auth.js';
```

#### 2.2 Business Logic Hook (`useSignUpTrialHostLogic.js`)

Following the Hollow Component pattern, extract all logic:
```javascript
export function useSignUpTrialHostLogic() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: ''
  });
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Validation functions
  // Submit handler
  // Step navigation

  return {
    formData, setFormData,
    step, setStep,
    isLoading,
    errors,
    handleSubmit,
    validateField,
    nextStep,
    prevStep
  };
}
```

### Phase 3: Validation Logic

**Reuse from external repo** (convert to JS):

```javascript
// app/src/islands/shared/SignUpTrialHost/validation.js

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // Minimum 4 characters (matching signup.ts:99)
  return password.length >= 4;
};

export const validatePhoneNumber = (phone) => {
  if (!phone) return true; // Optional field
  const phoneRegex = /^[\d\s\-+()]{10,}$/;
  return phoneRegex.test(phone);
};
```

### Phase 4: Signup Integration

**Call the existing auth system**:

```javascript
const handleSignup = async () => {
  setIsLoading(true);

  try {
    const additionalData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      userType: 'Trial Host',  // FIXED - not user-selectable
      phoneNumber: formData.phoneNumber || ''
    };

    const result = await signupUser(
      formData.email,
      formData.password,
      formData.confirmPassword,  // retype parameter
      additionalData
    );

    if (result.success) {
      // Save tokens using existing auth utility
      await saveAuthTokens(
        result.access_token,
        result.refresh_token,
        result.user_id
      );

      // Redirect to house manual tool
      window.location.href = '/house-manual';
    } else {
      toast.error(result.error || 'Signup failed');
    }
  } catch (error) {
    toast.error(error.message || 'An error occurred');
  } finally {
    setIsLoading(false);
  }
};
```

### Phase 5: Entry Point Integration

**Option A: Standalone Page** (Recommended)

Create new HTML entry point:
```
public/signup-trial-host.html
```

Add to `app/src/routes.config.js`:
```javascript
{
  name: 'signup-trial-host',
  path: '/signup-trial-host',
  htmlFile: 'signup-trial-host.html',
  entryPoint: 'src/signup-trial-host.jsx'
}
```

**Option B: Modal Component**

Use as modal within existing pages:
```javascript
import SignUpTrialHost from './islands/shared/SignUpTrialHost';

// In parent component
<SignUpTrialHost
  isOpen={showTrialHostSignup}
  onClose={() => setShowTrialHostSignup(false)}
  onSuccess={(userData) => handleSignupSuccess(userData)}
/>
```

---

## 4. File Changes Summary

### 4.1 New Files to Create

| File | Purpose |
|------|---------|
| `app/src/islands/shared/SignUpTrialHost/SignUpTrialHost.jsx` | Main component |
| `app/src/islands/shared/SignUpTrialHost/useSignUpTrialHostLogic.js` | Business logic hook |
| `app/src/islands/shared/SignUpTrialHost/validation.js` | Form validation utilities |
| `app/src/islands/shared/SignUpTrialHost/index.js` | Export barrel |
| `public/signup-trial-host.html` | HTML entry point (if standalone) |
| `app/src/signup-trial-host.jsx` | React mount point (if standalone) |

### 4.2 Files to Modify

| File | Change |
|------|--------|
| `app/src/routes.config.js` | Add signup-trial-host route (if standalone page) |

### 4.3 No Changes Required

| File | Reason |
|------|--------|
| `supabase/functions/auth-user/handlers/signup.ts` | "Trial Host" type already supported |
| `app/src/lib/auth.js` | `signupUser()` already supports additionalData |
| Edge Functions | No modifications needed |

---

## 5. Potential Breaking Points

### 5.1 Risk: Session Race Condition

**Issue**: After signup, session may not be immediately available.

**Mitigation**: Use the existing `waitForSupabaseSession()` pattern from `auth.js:1870`:
```javascript
const waitForSession = async () => {
  // Existing implementation handles retry logic
  // with 500ms intervals for up to 10 attempts
};
```

### 5.2 Risk: Token Storage Conflicts

**Issue**: Multiple auth flows storing tokens differently.

**Mitigation**: Always use `saveAuthTokens()` from `auth.js` - never direct localStorage access.

### 5.3 Risk: User Type Foreign Key

**Issue**: `os_user_type.display` requires exact string match.

**Mitigation**: Hardcode `'Trial Host'` exactly as it appears in the reference table. The signup handler already has the correct mapping.

### 5.4 Risk: OAuth Not Applicable

**Issue**: External component may have OAuth hints, but Trial Host signup should be email/password only.

**Mitigation**: Do not include OAuth buttons in the Trial Host component. This is a focused, simplified signup for a specific user segment.

---

## 6. Implementation Order

1. **Create directory structure** - `SignUpTrialHost/`
2. **Create validation.js** - Portable from external repo
3. **Create useSignUpTrialHostLogic.js** - Business logic hook
4. **Create SignUpTrialHost.jsx** - Main component
5. **Create index.js** - Export barrel
6. **Create HTML/JSX entry points** (if standalone page)
7. **Update routes.config.js** (if standalone page)
8. **Test signup flow end-to-end**
9. **Verify user appears in Supabase with correct type**

---

## 7. Testing Checklist

- [ ] Form validation works (email, password, optional phone)
- [ ] Signup creates user in Supabase Auth
- [ ] User record in `public.user` has `Type - User Current` = 'Trial Host'
- [ ] Session tokens are properly stored
- [ ] Redirect to house manual tool works
- [ ] Error messages display correctly
- [ ] Loading states show during API call
- [ ] Existing users get "email already in use" error

---

## 8. Reference Files

### External Repository (Source - For Reference Only)
- `SignUpLoginModal.tsx` - UI structure reference
- `SignUpLoginModal.styles.ts` - Visual design reference
- `validation.ts` - Validation logic to port
- `types/auth.ts` - Data structure reference

### Split Lease Codebase (Patterns to Follow)
- [app/src/lib/auth.js](../../../app/src/lib/auth.js) - Auth utilities
- [app/src/islands/shared/SignUpLoginModal.jsx](../../../app/src/islands/shared/SignUpLoginModal.jsx) - Existing auth modal pattern
- [app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx](../../../app/src/islands/shared/AiSignupMarketReport/AiSignupMarketReport.jsx) - Specialized signup flow pattern
- [supabase/functions/auth-user/handlers/signup.ts](../../../supabase/functions/auth-user/handlers/signup.ts) - Backend signup handler
- [supabase/functions/auth-user/index.ts](../../../supabase/functions/auth-user/index.ts) - Edge function router

---

## 9. Decision Points for User

1. **Standalone page vs Modal?**
   - Standalone: Dedicated URL, SEO-friendly, marketing landing page potential
   - Modal: Embed in existing pages, lighter implementation

2. **Post-signup redirect destination?**
   - House manual tool (assumed)
   - Dashboard with house manual prompt
   - Onboarding flow

3. **Marketing copy for Trial Host value proposition?**
   - Component should highlight house manual tool benefits
   - Need copy for signup form header/description

---

**Plan Status**: Ready for Implementation
**Estimated Complexity**: Medium
**Backend Changes Required**: None (existing system supports Trial Host)
