# SignUpLoginModal Component

A comprehensive, production-ready authentication modal component converted from Bubble.io. Handles login, signup, password reset, and passwordless authentication with full TypeScript support and modern React patterns.

## Features

✅ **Multiple Authentication Flows**
- Email/Password Login
- User Registration (Signup)
- Password Reset via Email
- Passwordless Login (Magic Link)
- Referral Code Support

✅ **Modern React Patterns**
- TypeScript with full type safety
- Custom hooks for state management
- Styled-components for styling
- Form validation with helpful error messages
- Accessible (ARIA labels, keyboard navigation)

✅ **Production Ready**
- Error handling and loading states
- Responsive design (mobile-friendly)
- Clean animations and transitions
- Follows React best practices
- Easy to customize and extend

## Installation

The component is already part of your codebase. No additional installation needed beyond the existing dependencies:

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "styled-components": "^6.1.13"
}
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import { SignUpLoginModal } from './components/SignUpLoginModal';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAuthSuccess = (user) => {
    console.log('User logged in:', user);
    // Handle successful authentication
    // - Store user in state
    // - Save token to localStorage
    // - Redirect to dashboard
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)}>
        Sign In
      </button>

      <SignUpLoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
```

## Props

### SignUpLoginModalProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | ✅ | - | Controls whether the modal is visible |
| `onClose` | `() => void` | ✅ | - | Callback when modal is closed |
| `onAuthSuccess` | `(user: User) => void` | ❌ | - | Callback when authentication succeeds |
| `defaultEmail` | `string` | ❌ | `''` | Pre-fill email field |
| `fromPageType` | `string` | ❌ | - | Track source page for analytics |
| `referral` | `Referral` | ❌ | - | Referral data object |
| `houseManual` | `HouseManual` | ❌ | - | House manual context |
| `disableClose` | `boolean` | ❌ | `false` | Disable close button (force action) |
| `fromTrialHost` | `boolean` | ❌ | `false` | Indicates trial host flow |
| `isNYU` | `boolean` | ❌ | `false` | NYU user flag |

## Advanced Examples

### Example 1: Pre-fill Email

```tsx
<SignUpLoginModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  defaultEmail="user@example.com"
  onAuthSuccess={handleAuthSuccess}
/>
```

### Example 2: With Referral Code

```tsx
const referralData = {
  id: 'ref_123',
  cashbackPoints: 50,
  cesScore: 10,
  referrantName: 'Jane Smith',
  code: 'FRIEND50'
};

<SignUpLoginModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  referral={referralData}
  onAuthSuccess={handleAuthSuccess}
/>
```

### Example 3: Force Authentication (No Close)

```tsx
<SignUpLoginModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  disableClose={true} // User must authenticate
  onAuthSuccess={handleAuthSuccess}
/>
```

### Example 4: Track Context

```tsx
<SignUpLoginModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  fromPageType="pricing-page"
  fromTrialHost={true}
  onAuthSuccess={handleAuthSuccess}
/>
```

## Customization

### Modify API Endpoints

Edit the authentication functions in `hooks/useAuthFlow.ts`:

```typescript
// hooks/useAuthFlow.ts
const login = async (data: LoginFormData) => {
  // Replace with your API endpoint
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  // ...
};
```

### Customize Styling

All styles are in separate `.styles.ts` files using styled-components:

```typescript
// SignUpLoginModal.styles.ts
export const ModalContainer = styled.div`
  max-width: 407px; // Change modal width
  border-radius: 10px; // Change border radius
  // ... customize as needed
`;
```

### Modify Validation Rules

Update validation logic in `hooks/useValidation.ts`:

```typescript
const validatePasswordStrength = (password: string): string | null => {
  if (password.length < 12) { // Changed from 8 to 12
    return 'Password must be at least 12 characters';
  }
  // Add custom validation rules
};
```

### Add Social Authentication

The `useAuthFlow` hook includes a `socialAuth` function:

```typescript
import { AuthButton } from './components/shared';

// In your view component
<AuthButton
  onClick={() => socialAuth('google')}
  variant="outline"
  icon={<GoogleIcon />}
>
  Continue with Google
</AuthButton>
```

## Component Architecture

```
SignUpLoginModal/
├── SignUpLoginModal.tsx          # Main component
├── SignUpLoginModal.styles.ts    # Main styles
├── types.ts                      # TypeScript definitions
├── hooks/
│   ├── useAuthState.ts          # State management
│   ├── useValidation.ts         # Form validation
│   ├── useAuthFlow.ts           # API calls
│   └── index.ts                 # Hook exports
├── components/
│   ├── WelcomeView.tsx          # Initial screen
│   ├── LoginView.tsx            # Login form
│   ├── SignupView.tsx           # Registration form
│   ├── PasswordResetView.tsx    # Password reset
│   └── shared/
│       ├── AuthInput.tsx        # Input component
│       ├── AuthButton.tsx       # Button component
│       ├── ErrorMessage.tsx     # Error display
│       └── CloseButton.tsx      # Close button
├── Example.tsx                   # Usage examples
├── README.md                     # This file
└── index.ts                      # Main export
```

## State Management

The component uses custom hooks for state management:

### useAuthState

Manages modal state (current view, user selections, etc.)

```typescript
const { state, showLogin, showSignup, showPasswordReset } = useAuthState({
  defaultEmail: 'user@example.com'
});
```

### useValidation

Handles form validation

```typescript
const { errors, validate, clearError } = useValidation();

const isValid = validate({
  email: { value: email, rules: { required: true, email: true } },
  password: { value: password, rules: { required: true, minLength: 8 } }
});
```

### useAuthFlow

Manages authentication API calls

```typescript
const { loading, error, login, signup, resetPassword } = useAuthFlow();

const user = await login({ email, password });
```

## Accessibility

The component follows accessibility best practices:

- ✅ Proper ARIA labels (`role="dialog"`, `aria-modal="true"`)
- ✅ Keyboard navigation support (Escape to close, Tab navigation)
- ✅ Focus management (auto-focus on inputs)
- ✅ Screen reader support
- ✅ Error announcements with `role="alert"`

## Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## API Integration

### Expected API Responses

**Login Endpoint (`/api/auth/login`)**

```typescript
// Request
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

// Success Response (200)
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Error Response (401)
{
  "message": "Invalid credentials"
}
```

**Signup Endpoint (`/api/auth/signup`)**

```typescript
// Request
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}

// Success Response (201)
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Password Reset Endpoint (`/api/auth/reset-password`)**

```typescript
// Request
POST /api/auth/reset-password
{
  "email": "user@example.com"
}

// Success Response (200)
{
  "message": "Password reset email sent"
}
```

## Testing

Example test setup:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignUpLoginModal } from './SignUpLoginModal';

describe('SignUpLoginModal', () => {
  it('renders welcome view by default', () => {
    render(
      <SignUpLoginModal isOpen={true} onClose={jest.fn()} />
    );
    expect(screen.getByText('Welcome to Split Lease!')).toBeInTheDocument();
  });

  it('switches to login view', () => {
    render(
      <SignUpLoginModal isOpen={true} onClose={jest.fn()} />
    );
    fireEvent.click(screen.getByText('Log into my account'));
    expect(screen.getByText('Welcome Back!')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Modal doesn't appear

Check that `isOpen` prop is `true` and there are no z-index conflicts.

### Form validation not working

Ensure you're using the validation hooks correctly and checking the `errors` object.

### API calls failing

Update the API endpoints in `hooks/useAuthFlow.ts` to match your backend.

## License

MIT

## Support

For issues or questions, please contact the development team or open an issue in the project repository.
