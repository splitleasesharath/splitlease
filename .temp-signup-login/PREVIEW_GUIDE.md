# 🎬 SignUpLoginModal - Preview Guide

## Quick Start

### Option 1: Automatic (Recommended)
```bash
cd signup-login
npm start
```
This will automatically:
- Start the development server
- Open your browser to http://localhost:3000
- Hot reload on file changes

### Option 2: Manual
```bash
cd signup-login
npm run dev
```
Then open: http://localhost:3000

---

## What's Included in the Preview

### 🎨 Interactive Demo Application

The preview includes a **fully functional demo application** where you can:

1. **Test All Authentication Flows**
   - ✅ Login with email/password
   - ✅ Register new account
   - ✅ Reset password
   - ✅ Passwordless login (placeholder)

2. **Configure Modal Options**
   - Toggle referral code display
   - Enable/disable close button
   - Pre-fill email address
   - See real-time configuration changes

3. **View Features List**
   - Complete overview of all features
   - Visual feature cards
   - Feature descriptions

4. **Monitor Authentication**
   - Real-time status display
   - User information after login
   - Console logs for debugging

---

## 🔧 Demo Features

### Mock API Responses

The preview uses **mock API responses** so you can test without a backend:

- **Login:** Any email/password combination will work
- **Signup:** Creates mock users in memory
- **Password Reset:** Simulates email sending
- **All operations:** Have realistic loading states and delays

### Console Logging

Open the browser console (F12) to see detailed logs:
```
🔐 Mock Login API called with: { email: "...", password: "..." }
✅ Mock Login Success: { user: {...}, token: "..." }
```

### Local Storage

The demo saves authentication data to localStorage:
- `authToken` - Mock JWT token
- `user` - User object

---

## 📱 Preview Features

### Responsive Design
- ✅ Desktop (1024px+)
- ✅ Tablet (768px - 1024px)
- ✅ Mobile (< 768px)

### Browser Testing
Test in multiple browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

### Keyboard Navigation
- `Tab` - Navigate between elements
- `Enter` - Submit forms
- `Escape` - Close modal

---

## 🎯 What to Test

### 1. Welcome Screen
- [ ] Opens on button click
- [ ] Shows referral banner (when enabled)
- [ ] Navigation buttons work
- [ ] Terms and privacy links

### 2. Login Flow
- [ ] Email validation
- [ ] Password visibility toggle
- [ ] "Forgot password" link
- [ ] "Sign up" link
- [ ] Loading state
- [ ] Success callback
- [ ] Error display

### 3. Signup Flow
- [ ] All form fields
- [ ] Name validation
- [ ] Email format check
- [ ] Password strength
- [ ] Password confirmation match
- [ ] Terms checkbox required
- [ ] Referral code field (when enabled)
- [ ] Loading state
- [ ] Success callback

### 4. Password Reset
- [ ] Email validation
- [ ] Success message
- [ ] Email sent confirmation
- [ ] Back to login

### 5. UI/UX
- [ ] Smooth animations
- [ ] Modal overlay
- [ ] Close button (when enabled)
- [ ] Click outside to close
- [ ] Escape key works
- [ ] Focus management
- [ ] Error messages clear
- [ ] Loading spinners

---

## 🔍 Customization Testing

### Change Colors

Edit `.styles.ts` files to test color schemes:

```typescript
// SignUpLoginModal.styles.ts
background: #7C3AED; // Change to your color
```

### Modify Validation

Edit `hooks/useValidation.ts`:

```typescript
if (password.length < 12) { // Change from 8 to 12
  return 'Password must be at least 12 characters';
}
```

### Update Copy

Edit view components (`LoginView.tsx`, etc.):

```tsx
<S.Title>Your Custom Title</S.Title>
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use a different port
npx vite --port 3001
```

### Dependencies Not Installed
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### TypeScript Errors
```bash
# Check types
npm run type-check
```

### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## 📊 Preview Structure

```
signup-login/
├── src/
│   ├── App.tsx                      # Demo application
│   ├── main.tsx                     # React entry point
│   ├── index.css                    # Global styles
│   ├── SignUpLoginModalDemo.tsx    # Modal with mock API
│   ├── useAuthFlowDemo.ts          # Mock auth hook
│   └── mockAuthApi.ts              # Mock API responses
│
├── index.html                       # HTML entry
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies
```

---

## 🚀 Next Steps After Preview

### 1. Replace Mock API

When ready for production, replace:
- `src/useAuthFlowDemo.ts` → Use `hooks/useAuthFlow.ts`
- `src/mockAuthApi.ts` → Remove this file
- Update API endpoints in `useAuthFlow.ts`

### 2. Remove Demo Files

Production won't need:
- `src/App.tsx` (demo only)
- `src/main.tsx` (demo only)
- `src/index.css` (demo only)
- `src/SignUpLoginModalDemo.tsx` (demo only)
- `src/useAuthFlowDemo.ts` (demo only)
- `src/mockAuthApi.ts` (demo only)

### 3. Use Real Component

Import the production component:
```tsx
import { SignUpLoginModal } from './SignUpLoginModal';
```

---

## 📝 Development Tips

### Hot Reload
Changes to files automatically reload the browser.

### Console Logs
Check browser console for:
- API call logs
- Authentication flows
- Error messages
- User data

### React DevTools
Install React DevTools browser extension to:
- Inspect component state
- View props
- Debug renders
- Profile performance

### Network Tab
Monitor network requests (even though they're mocked):
- Request/response timing
- Data payloads
- Error responses

---

## 🎨 Preview Screenshots

When you run the preview, you'll see:

1. **Landing Page**
   - Status card showing authentication state
   - Configuration options
   - Feature list
   - Action button

2. **Modal Views**
   - Welcome screen with options
   - Login form
   - Signup form
   - Password reset

3. **After Authentication**
   - User details displayed
   - Logout button
   - Success confirmation

---

## ⚡ Performance

The preview is optimized for development:
- Fast hot reload
- Source maps for debugging
- TypeScript checking
- ESLint integration

---

## 🎯 Test Scenarios

### Scenario 1: First-Time User
1. Click "Open Authentication Modal"
2. Click "Create Account"
3. Fill in signup form
4. Check "I agree to terms"
5. Click "Create Account"
6. Verify success message

### Scenario 2: Returning User
1. Open modal
2. Click "Log into my account"
3. Enter email/password
4. Click "Log In"
5. Verify user details displayed

### Scenario 3: Forgot Password
1. Open modal
2. Go to login
3. Click "Forgot password"
4. Enter email
5. Click "Send Reset Instructions"
6. Verify success message

### Scenario 4: With Referral
1. Check "Use Referral Code"
2. Open modal
3. Verify referral banner shows
4. Create account
5. See cashback points message

---

## 📞 Support

### Issues?
- Check browser console for errors
- Verify Node.js version (18+)
- Try clearing browser cache
- Restart development server

### Questions?
- Read the main README.md
- Check INTEGRATION_GUIDE.md
- Review Example.tsx

---

## ✅ Ready to Test!

Your preview server is ready. Run:

```bash
npm start
```

And start testing your SignUpLoginModal component!

---

**Happy Testing! 🎉**

Built with Vite + React + TypeScript
