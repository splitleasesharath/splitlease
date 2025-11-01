## SignupTrialHost Component

A fully accessible, multi-step form component for property hosts to sign up for trial accounts on the Split Lease platform.

### Features

- ✅ **Multi-step Form**: Three-step form with progress tracking
- ✅ **Real-time Validation**: Field-level validation with instant feedback
- ✅ **TypeScript**: Full type safety with no `any` types
- ✅ **Runtime Validation**: Zod schemas for robust validation
- ✅ **Accessibility**: WCAG 2.1 AA compliant with comprehensive ARIA support
- ✅ **Keyboard Navigation**: Full keyboard support with logical tab order
- ✅ **Screen Reader Support**: Proper announcements and labels
- ✅ **Responsive Design**: Mobile-first, works on all devices
- ✅ **Performance Optimized**: React.memo, useCallback, useMemo
- ✅ **CSS Modules**: Scoped styles, no conflicts
- ✅ **Comprehensive Tests**: >90% code coverage
- ✅ **ESM**: Tree-shakeable named exports

### Basic Usage

```tsx
import { SignupTrialHost } from '@split-lease/components';

function App() {
  const handleSubmit = async (data) => {
    console.log('Form data:', data);
    // Submit to your API
    await api.createTrialHost(data);
  };

  return (
    <SignupTrialHost
      onSubmit={handleSubmit}
      onSuccess={() => console.log('Success!')}
      onError={(error) => console.error('Error:', error)}
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSubmit` | `(data: ValidatedFormData) => Promise<void>` | `undefined` | Callback when form is submitted with valid data |
| `onSuccess` | `() => void` | `undefined` | Callback when submission succeeds |
| `onError` | `(error: Error) => void` | `undefined` | Callback when submission fails |
| `className` | `string` | `''` | Custom CSS class name |
| `initialStep` | `FormStep` | `1` | Initial form step to display |
| `initialData` | `Partial<FormData>` | `undefined` | Pre-populate form fields |
| `showProgress` | `boolean` | `true` | Show/hide progress indicator |
| `autoFocus` | `boolean` | `true` | Auto-focus first input on mount |
| `data-testid` | `string` | `undefined` | Test ID for testing |

### Form Data Structure

The form collects data across three steps:

#### Step 1: Personal Information
```typescript
{
  personalInfo: {
    fullName: string;      // 2-50 characters, letters and spaces
    email: string;         // Valid email format
    phone: string;         // 10 digits, auto-formatted as (XXX) XXX-XXXX
  }
}
```

#### Step 2: Property Information
```typescript
{
  propertyInfo: {
    address: string;       // 10-200 characters
    propertyType: PropertyType; // 'single-family' | 'condo' | 'townhouse' | 'apartment' | 'other'
    bedrooms: number;      // 1-20, whole numbers
    bathrooms: number;     // 1-20, allows 0.5 increments
  }
}
```

#### Step 3: Trial Preferences
```typescript
{
  trialPreferences: {
    startDate: string;     // ISO date string, must be future date
    duration: number;      // 7 | 14 | 30 (days)
    referralSource?: string; // Optional, how user heard about us
    termsAccepted: boolean;  // Must be true to submit
  }
}
```

### Advanced Usage

#### With Initial Data

```tsx
<SignupTrialHost
  initialData={{
    personalInfo: {
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '',
    },
  }}
  initialStep={FormStep.PersonalInfo}
  onSubmit={handleSubmit}
/>
```

#### With Custom Styling

```tsx
<SignupTrialHost
  className="my-custom-form"
  showProgress={false}
  onSubmit={handleSubmit}
/>
```

#### Using the Hook Directly

For advanced customization, you can use the `useSignupForm` hook directly:

```tsx
import { useSignupForm } from '@split-lease/components';

function CustomSignupForm() {
  const {
    formData,
    currentStep,
    errors,
    handleChange,
    handleNext,
    handleSubmit,
  } = useSignupForm({
    onSubmit: async (data) => {
      await api.createTrialHost(data);
    },
  });

  // Build your custom UI
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Validation Rules

#### Personal Information
- **Full Name**: 2-50 characters, letters and spaces only, hyphens and apostrophes allowed
- **Email**: Must match RFC 5322 email format
- **Phone**: Must be 10 digits, auto-formatted as (XXX) XXX-XXXX

#### Property Information
- **Address**: 10-200 characters
- **Property Type**: Must select from provided options
- **Bedrooms**: 1-20, whole numbers only
- **Bathrooms**: 1-20, allows 0.5 increments (e.g., 2.5)

#### Trial Preferences
- **Start Date**: Must be at least tomorrow (no past dates or today)
- **Duration**: Must select from 7, 14, or 30 days
- **Terms Accepted**: Must be checked to submit

### Accessibility Features

This component is WCAG 2.1 AA compliant and includes:

- ✅ **Semantic HTML**: Proper heading hierarchy, form elements
- ✅ **ARIA Labels**: All inputs have accessible labels
- ✅ **ARIA Invalid**: Invalid fields marked with `aria-invalid="true"`
- ✅ **ARIA Describedby**: Error messages associated with fields
- ✅ **ARIA Required**: Required fields marked appropriately
- ✅ **ARIA Live Regions**: Status announcements for screen readers
- ✅ **Keyboard Navigation**: Full keyboard support, logical tab order
- ✅ **Focus Indicators**: Visible focus states on all interactive elements
- ✅ **Color Contrast**: Meets WCAG AA standards
- ✅ **Touch Targets**: All interactive elements ≥ 44x44px
- ✅ **Screen Reader Support**: Comprehensive announcements

### Testing

The component includes comprehensive test coverage:

```bash
# Run all tests
npm run test

# Run SignupTrialHost tests only
npm run test -- SignupTrialHost

# Run with coverage
npm run test:coverage

# Run accessibility tests
npm run test -- SignupTrialHost.a11y
```

### Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Performance

- Bundle size: <50KB gzipped
- Initial render: <50ms
- Optimized with React.memo, useCallback, useMemo
- No unnecessary re-renders

### Examples

#### With Navigation on Success

```tsx
import { useNavigate } from 'react-router-dom';

function SignupPage() {
  const navigate = useNavigate();

  return (
    <SignupTrialHost
      onSubmit={async (data) => {
        const response = await api.createTrialHost(data);
        return response;
      }}
      onSuccess={() => {
        navigate('/welcome');
      }}
      onError={(error) => {
        console.error('Submission failed:', error);
      }}
    />
  );
}
```

#### With Analytics Tracking

```tsx
function SignupPage() {
  const handleSubmit = async (data) => {
    // Track step completion
    analytics.track('Trial Signup Completed', {
      propertyType: data.propertyInfo.propertyType,
      trialDuration: data.trialPreferences.duration,
      referralSource: data.trialPreferences.referralSource,
    });

    await api.createTrialHost(data);
  };

  return <SignupTrialHost onSubmit={handleSubmit} />;
}
```

### Troubleshooting

#### Form not submitting

Ensure all required fields are valid. Check the browser console for validation errors.

#### Phone number not formatting

The phone number is formatted on display but stored as digits internally. Ensure you're using the `formatPhoneNumber` utility for display.

#### Styles not applying

Make sure you're importing the component correctly and that CSS Modules are supported in your build setup.

#### TypeScript errors

Ensure you're using TypeScript 5.0+ and that all type dependencies are installed.

### Related Components

- `Header` - Site header with navigation
- `Footer` - Site footer with links

### License

Proprietary - Split Lease Platform

### Support

For issues or questions, please contact the development team or file an issue in the repository.

---

Built with ❤️ using React 18, TypeScript, and modern web standards.
