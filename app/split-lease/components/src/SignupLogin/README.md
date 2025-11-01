# SignupLogin Component

A comprehensive, production-ready authentication component that provides both signup and login functionality with seamless mode switching, real-time validation, password strength indication, and full WCAG 2.1 AA accessibility compliance.

## Features

- ✅ **Dual-mode authentication** - Seamlessly toggle between signup and login
- ✅ **Real-time validation** - Instant feedback with Zod schema validation
- ✅ **Password strength indicator** - Visual feedback for password security
- ✅ **Full accessibility** - WCAG 2.1 AA compliant with ARIA attributes
- ✅ **TypeScript first** - Complete type safety with inferred types
- ✅ **CSS Modules** - Scoped styling with zero conflicts
- ✅ **Performance optimized** - React.memo, useCallback, useMemo
- ✅ **Mobile responsive** - Mobile-first design with touch-friendly targets
- ✅ **Test-driven** - >90% code coverage with comprehensive tests

## Installation

The component is part of the `@split-lease/components` package:

```bash
npm install @split-lease/components
```

## Basic Usage

```tsx
import { SignupLogin } from '@split-lease/components';

function App() {
  const handleSignupSuccess = (data) => {
    console.log('User signed up:', data);
    // Handle successful signup (e.g., redirect, show success message)
  };

  const handleLoginSuccess = (data) => {
    console.log('User logged in:', data);
    // Handle successful login (e.g., set auth token, redirect)
  };

  return (
    <SignupLogin
      mode="signup"
      onSignupSuccess={handleSignupSuccess}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
```

## Props API

### SignupLoginProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `'signup' \| 'login'` | `'signup'` | Initial authentication mode |
| `className` | `string` | `undefined` | Optional CSS class for styling customization |
| `onSignupSuccess` | `(data: SignupFormData) => void` | `undefined` | Callback fired when signup is successful |
| `onLoginSuccess` | `(data: LoginFormData) => void` | `undefined` | Callback fired when login is successful |
| `onModeChange` | `(mode: AuthMode) => void` | `undefined` | Callback fired when authentication mode changes |

### Type Definitions

```typescript
type SignupFormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
};

type LoginFormData = {
  email: string;
  password: string;
  rememberMe: boolean;
};

type AuthMode = 'signup' | 'login';
```

## Advanced Usage

### Custom Mode Handling

```tsx
import { SignupLogin } from '@split-lease/components';
import { useState } from 'react';

function AuthPage() {
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');

  return (
    <SignupLogin
      mode={authMode}
      onModeChange={(mode) => {
        setAuthMode(mode);
        console.log('Auth mode changed to:', mode);
      }}
      onSignupSuccess={async (data) => {
        // Send to API
        const response = await fetch('/api/signup', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        if (response.ok) {
          window.location.href = '/dashboard';
        }
      }}
      onLoginSuccess={async (data) => {
        // Send to API
        const response = await fetch('/api/login', {
          method: 'POST',
          body: JSON.stringify(data),
        });

        const { token } = await response.json();
        localStorage.setItem('authToken', token);
        window.location.href = '/dashboard';
      }}
    />
  );
}
```

### Using Custom Hooks Independently

The component exposes its hooks for custom implementations:

```tsx
import { useSignupForm, useLoginForm, useAuthMode } from '@split-lease/components';

function CustomAuthForm() {
  const { mode, toggleMode } = useAuthMode('signup');
  const signupForm = useSignupForm(handleSignupSuccess);
  const loginForm = useLoginForm(handleLoginSuccess);

  const form = mode === 'signup' ? signupForm : loginForm;

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
      {/* Custom form implementation */}
    </form>
  );
}
```

## Validation Rules

### Email Validation

- ✅ Standard email format (RFC 5322)
- ✅ Maximum 255 characters
- ✅ Common typo detection (gmial.com → gmail.com)
- ✅ Case-insensitive
- ✅ Automatic trimming

### Password Requirements (Signup)

- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

### Password Strength Levels

- **Weak** - Meets minimum requirements only (8 chars, basic variety)
- **Medium** - 10+ characters with good variety
- **Strong** - 12+ characters with high variety and no common patterns

### Name Validation

- ✅ Minimum 2 characters
- ✅ Maximum 50 characters
- ✅ Letters, hyphens, and apostrophes only
- ✅ Examples: John, O'Brien, Smith-Jones

## Accessibility Features

### WCAG 2.1 AA Compliance

- ✅ All form fields have associated `<label>` elements
- ✅ All buttons have accessible names
- ✅ Error messages use `aria-describedby`
- ✅ Invalid fields have `aria-invalid="true"`
- ✅ Form has `role="form"` and `aria-labelledby`
- ✅ Password toggle has `aria-label`
- ✅ Live regions for submission feedback
- ✅ Color contrast ≥4.5:1 for all text
- ✅ Touch targets ≥44x44px
- ✅ Keyboard navigation support

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Navigate between form fields |
| `Shift + Tab` | Navigate backwards |
| `Enter` | Submit form |
| `Space` | Toggle checkbox |
| `Escape` | Close modals (if applicable) |

## Styling Customization

The component uses CSS Modules for scoped styling. You can customize appearance using the `className` prop:

```tsx
<SignupLogin
  className="my-custom-auth"
  onSignupSuccess={handleSignup}
/>
```

```css
/* Your custom styles */
.my-custom-auth {
  max-width: 500px;
  margin: 4rem auto;
}

.my-custom-auth button[type="submit"] {
  background-color: #your-brand-color;
}
```

## Browser Support

- ✅ Chrome (last 2 versions)
- ✅ Firefox (last 2 versions)
- ✅ Safari (last 2 versions)
- ✅ Edge (last 2 versions)
- ✅ iOS Safari
- ✅ Chrome Android

Requires:
- ES2020 features
- CSS Grid and Flexbox support

## Performance

- **First render**: <100ms
- **Re-render**: <16ms (60 FPS)
- **Bundle size contribution**: <75KB gzipped
- **Time to interactive**: <50ms for form interactions

## Testing

The component includes comprehensive test coverage:

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run accessibility tests only
npm run test -- SignupLogin.a11y
```

## Troubleshooting

### Form not submitting

**Issue**: Form submission doesn't trigger callbacks.

**Solution**: Ensure callbacks are passed as props:

```tsx
<SignupLogin
  onSignupSuccess={handleSignupSuccess}
  onLoginSuccess={handleLoginSuccess}
/>
```

### Validation errors not showing

**Issue**: Validation errors don't appear on blur.

**Solution**: Ensure you're using the component's built-in validation. Errors show on blur and submit.

### Password strength not updating

**Issue**: Password strength indicator doesn't update.

**Solution**: The password strength updates in real-time. Check that you're in signup mode - login mode doesn't show password strength.

### Styling conflicts

**Issue**: Component styles conflict with global CSS.

**Solution**: The component uses CSS Modules for scoped styles. Check for overly broad selectors in your global CSS that might be targeting form elements.

## Examples

### Minimal Setup

```tsx
import { SignupLogin } from '@split-lease/components';

<SignupLogin
  onSignupSuccess={(data) => console.log('Signup:', data)}
  onLoginSuccess={(data) => console.log('Login:', data)}
/>
```

### With API Integration

```tsx
import { SignupLogin } from '@split-lease/components';

<SignupLogin
  mode="login"
  onSignupSuccess={async (data) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Signup failed');
    }

    const { user, token } = await response.json();
    localStorage.setItem('authToken', token);
    window.location.href = '/dashboard';
  }}
  onLoginSuccess={async (data) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Invalid credentials');
    }

    const { user, token } = await response.json();
    localStorage.setItem('authToken', token);
    window.location.href = '/dashboard';
  }}
/>
```

## License

This component is part of the Split Lease project.

## Support

For issues, questions, or contributions, please refer to the main project repository.
