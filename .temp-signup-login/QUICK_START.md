# 🚀 Quick Start Guide - SignUpLoginModal

Get your authentication modal running in **5 minutes**!

## Step 1: Copy the Import (30 seconds)

Add this to your component:

```tsx
import { useState } from 'react';
import { SignUpLoginModal } from './components/SignUpLoginModal';
```

## Step 2: Add State (30 seconds)

```tsx
function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    // Your JSX here
  );
}
```

## Step 3: Add the Modal (1 minute)

```tsx
function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div>
      {/* Your existing content */}
      <button onClick={() => setIsAuthModalOpen(true)}>
        Sign In
      </button>

      {/* The Authentication Modal */}
      <SignUpLoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          console.log('User logged in:', user);
          // Handle successful authentication here
        }}
      />
    </div>
  );
}
```

## Step 4: Configure API (3 minutes)

Open `src/components/SignUpLoginModal/hooks/useAuthFlow.ts` and update:

```typescript
// Find line ~32 and replace the URL
const response = await fetch('https://YOUR-API.com/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
```

Do the same for:
- Signup endpoint (~line 61)
- Password reset endpoint (~line 90)

## ✅ Done!

Your authentication modal is ready! Click the "Sign In" button to test it.

---

## Common Customizations (Optional)

### 1. Pre-fill Email

```tsx
<SignUpLoginModal
  isOpen={isAuthModalOpen}
  onClose={() => setIsAuthModalOpen(false)}
  defaultEmail="user@example.com"  // ← Add this
  onAuthSuccess={handleAuthSuccess}
/>
```

### 2. Add Referral Code

```tsx
const referralData = {
  id: 'ref_123',
  cashbackPoints: 50,
  cesScore: 10,
  referrantName: 'John Doe',
};

<SignUpLoginModal
  isOpen={isAuthModalOpen}
  onClose={() => setIsAuthModalOpen(false)}
  referral={referralData}  // ← Add this
  onAuthSuccess={handleAuthSuccess}
/>
```

### 3. Prevent Closing (Force Login)

```tsx
<SignUpLoginModal
  isOpen={isAuthModalOpen}
  onClose={() => setIsAuthModalOpen(false)}
  disableClose={true}  // ← Add this
  onAuthSuccess={handleAuthSuccess}
/>
```

### 4. Store User After Login

```tsx
function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);  // ← Save user
    setIsAuthModalOpen(false);  // ← Close modal

    // Optional: Save to localStorage
    localStorage.setItem('user', JSON.stringify(user));
  };

  return (
    <div>
      {currentUser ? (
        <div>
          Welcome, {currentUser.firstName}!
          <button onClick={() => setCurrentUser(null)}>Logout</button>
        </div>
      ) : (
        <button onClick={() => setIsAuthModalOpen(true)}>
          Sign In
        </button>
      )}

      <SignUpLoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
```

---

## Troubleshooting

### Modal doesn't appear?
- Check that `isOpen={true}`
- Check browser console for errors
- Make sure styled-components is installed

### API calls failing?
- Verify API URLs in `useAuthFlow.ts`
- Check network tab in browser DevTools
- Ensure CORS is configured on your backend

### Validation errors?
- Check that form fields match expected format
- See `hooks/useValidation.ts` for validation rules

---

## Next Steps

1. ✅ Test the modal with real API endpoints
2. ✅ Customize colors and styling (see `*.styles.ts` files)
3. ✅ Add protected routes (see `INTEGRATION_GUIDE.md`)
4. ✅ Set up state management (see `INTEGRATION_GUIDE.md`)
5. ✅ Add analytics tracking (optional)

---

## Full Documentation

- 📖 **Complete Guide:** `README.md`
- 🔧 **Integration Help:** `INTEGRATION_GUIDE.md`
- 💡 **Examples:** `Example.tsx`
- 📋 **Summary:** `CONVERSION_SUMMARY.md`

---

**Need Help?** Check the README.md or contact the development team.

**Enjoying the component?** Give us a ⭐ on GitHub!
