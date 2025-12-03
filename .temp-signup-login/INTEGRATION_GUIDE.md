# SignUpLoginModal - Integration Guide

## Quick Start (5 Minutes)

### Step 1: Import the Component

```tsx
import { SignUpLoginModal } from './components/SignUpLoginModal';
import type { User } from './components/SignUpLoginModal';
```

### Step 2: Add State Management

```tsx
function App() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsAuthModalOpen(true)}>
        Sign In
      </button>

      <SignUpLoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
```

### Step 3: Configure API Endpoints

Open `src/components/SignUpLoginModal/hooks/useAuthFlow.ts` and update the API endpoints:

```typescript
// Line 32: Update login endpoint
const response = await fetch('https://your-api.com/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// Line 61: Update signup endpoint
const response = await fetch('https://your-api.com/auth/signup', {
  // ...
});

// Line 90: Update password reset endpoint
const response = await fetch('https://your-api.com/auth/reset-password', {
  // ...
});
```

✅ **Done!** Your authentication modal is ready to use.

---

## Integration with Global State Management

### Option 1: React Context

```tsx
// AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';
import type { User } from './components/SignUpLoginModal';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (user: User) => {
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Usage in App.tsx
import { AuthProvider, useAuth } from './AuthContext';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { login, user, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleAuthSuccess = (user: User) => {
    login(user);
    setIsAuthModalOpen(false);
  };

  return (
    <>
      {user ? (
        <div>
          Welcome, {user.firstName}!
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={() => setIsAuthModalOpen(true)}>Sign In</button>
      )}

      <SignUpLoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
```

### Option 2: Zustand

```bash
npm install zustand
```

```tsx
// store/authStore.ts
import { create } from 'zustand';
import type { User } from '../components/SignUpLoginModal';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    set({ user: null, isAuthenticated: false });
  },
}));

// Usage in component
import { useAuthStore } from './store/authStore';

function App() {
  const { user, login, logout } = useAuthStore();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      {user ? (
        <button onClick={logout}>Logout</button>
      ) : (
        <button onClick={() => setIsAuthModalOpen(true)}>Sign In</button>
      )}

      <SignUpLoginModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={login}
      />
    </>
  );
}
```

---

## Protected Routes (React Router)

```tsx
// ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## API Token Management

### Automatic Token Attachment

```typescript
// utils/api.ts
export const apiClient = {
  async request(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('authToken');

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }

    return response;
  },

  get: (url: string) => apiClient.request(url, { method: 'GET' }),
  post: (url: string, data: any) =>
    apiClient.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Usage
const response = await apiClient.get('/api/user/profile');
```

### Update useAuthFlow Hook

```typescript
// hooks/useAuthFlow.ts
import { apiClient } from '../../../utils/api';

const login = async (data: LoginFormData) => {
  const response = await apiClient.post('/api/auth/login', data);
  const result = await response.json();

  if (result.token) {
    localStorage.setItem('authToken', result.token);
  }

  return result.user;
};
```

---

## Analytics Integration

```typescript
// utils/analytics.ts
export const trackAuthEvent = (event: string, properties?: object) => {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', event, properties);
  }

  // Mixpanel
  if (window.mixpanel) {
    window.mixpanel.track(event, properties);
  }

  // Segment
  if (window.analytics) {
    window.analytics.track(event, properties);
  }
};

// In SignUpLoginModal.tsx
import { trackAuthEvent } from '../../utils/analytics';

const handleLogin = async (email: string, password: string) => {
  trackAuthEvent('login_attempted', { method: 'email' });

  const user = await login({ email, password });

  if (user) {
    trackAuthEvent('login_success', {
      userId: user.id,
      method: 'email',
    });
    onAuthSuccess?.(user);
  } else {
    trackAuthEvent('login_failed', { method: 'email' });
  }

  return user;
};
```

---

## Environment Configuration

Create a `.env` file:

```bash
# .env
VITE_API_URL=https://api.yourapp.com
VITE_AUTH_TOKEN_KEY=authToken
```

Update `useAuthFlow.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = import.meta.env.VITE_AUTH_TOKEN_KEY;

const login = async (data: LoginFormData) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (result.token) {
    localStorage.setItem(TOKEN_KEY, result.token);
  }

  return result.user;
};
```

---

## Error Handling Best Practices

```typescript
// hooks/useAuthFlow.ts
const login = async (data: LoginFormData) => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    // Handle specific error codes
    if (response.status === 429) {
      throw new Error('Too many login attempts. Please try again later.');
    }

    if (response.status === 503) {
      throw new Error('Service temporarily unavailable. Please try again.');
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const result = await response.json();
    return result.user;

  } catch (err: any) {
    // Network errors
    if (err.message === 'Failed to fetch') {
      setError('Network error. Please check your connection.');
    } else {
      setError(err.message);
    }

    // Log errors for debugging
    console.error('Login error:', err);

    return null;
  } finally {
    setLoading(false);
  }
};
```

---

## Testing

### Unit Tests

```typescript
// SignUpLoginModal.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SignUpLoginModal } from './SignUpLoginModal';

// Mock fetch
global.fetch = jest.fn();

describe('SignUpLoginModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows welcome screen initially', () => {
    render(<SignUpLoginModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByText('Welcome to Split Lease!')).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com', firstName: 'Test' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser, token: 'abc123' }),
    });

    const onAuthSuccess = jest.fn();
    render(
      <SignUpLoginModal
        isOpen={true}
        onClose={jest.fn()}
        onAuthSuccess={onAuthSuccess}
      />
    );

    // Navigate to login
    fireEvent.click(screen.getByText('Log into my account'));

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/example@example.com/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: 'password123' },
    });

    // Submit
    fireEvent.click(screen.getByText('Log In'));

    await waitFor(() => {
      expect(onAuthSuccess).toHaveBeenCalledWith(mockUser);
    });
  });
});
```

---

## Performance Optimization

### Lazy Loading

```typescript
// App.tsx
import { lazy, Suspense } from 'react';

const SignUpLoginModal = lazy(() => import('./components/SignUpLoginModal'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpLoginModal
        isOpen={isOpen}
        onClose={onClose}
        onAuthSuccess={handleAuthSuccess}
      />
    </Suspense>
  );
}
```

### Memoization

```typescript
// Optimize re-renders
import { memo } from 'react';

export const LoginView = memo<LoginViewProps>(({ ... }) => {
  // Component code
});
```

---

## Common Issues & Solutions

### Issue: Modal doesn't close on Escape key

**Solution:** Ensure you're not preventing default keyboard events elsewhere in your app.

### Issue: Validation errors not clearing

**Solution:** Call `clearError(fieldName)` in the `onChange` handler.

### Issue: API calls failing with CORS errors

**Solution:** Configure CORS on your backend or use a proxy in development:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://your-backend.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

---

## Next Steps

1. ✅ Configure your API endpoints
2. ✅ Set up global state management
3. ✅ Add protected routes
4. ✅ Integrate analytics
5. ✅ Write tests
6. ✅ Deploy to production

Need help? Check the main README.md or contact the development team.
