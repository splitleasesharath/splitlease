# Implementation Plan: Auth Flow Before Proposal Submission

## Overview

When a logged-out user clicks "Submit Proposal" in the `CreateProposalFlowV2` component, we need to:
1. Show the `SignUpLoginModal` to authenticate the user
2. Default user type to "Guest" during signup
3. After successful auth, automatically submit the proposal the user was creating
4. Redirect to rental application page (or show success)

## Current State Analysis

### Key Files
- `app/src/islands/pages/ViewSplitLeasePage.jsx` - Parent page containing proposal modal
- `app/src/islands/shared/CreateProposalFlowV2.jsx` - Proposal wizard component
- `app/src/islands/shared/SignUpLoginModal.jsx` - Auth modal (already exists)
- `app/src/lib/auth.js` - Auth utilities (`checkAuthStatus`, `loginUser`, `signupUser`)

### Current Flow
1. User selects days in `ListingScheduleSelector`
2. User clicks "Create Proposal" → opens `CreateProposalFlowV2` modal
3. User fills form and clicks "Submit" → `handleProposalSubmit` is called
4. Currently shows alert (backend integration pending)

### Existing Auth Modal Props
```jsx
<SignUpLoginModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  initialView="initial" // 'initial', 'login', 'signup'
  onAuthSuccess={(userData) => handleSuccess(userData)}
  defaultUserType="guest" // 'host' or 'guest'
  skipReload={false} // Set true to prevent page reload after auth
/>
```

---

## Implementation Steps

### Step 1: Add Auth State to ViewSplitLeasePage.jsx

Add new state variables to track auth modal and pending proposal:

```jsx
// In state declarations section (~line 436)
import { checkAuthStatus } from '../../lib/auth.js';
import SignUpLoginModal from '../shared/SignUpLoginModal.jsx';

// Add state
const [showAuthModal, setShowAuthModal] = useState(false);
const [pendingProposalData, setPendingProposalData] = useState(null);
```

### Step 2: Modify handleProposalSubmit Function

Update the submit handler to check auth before processing:

```jsx
const handleProposalSubmit = async (proposalData) => {
  console.log('Proposal submitted:', proposalData);

  // Check if user is logged in
  const isLoggedIn = await checkAuthStatus();

  if (!isLoggedIn) {
    // Store the proposal data for later submission
    setPendingProposalData(proposalData);
    // Close the proposal modal
    setIsProposalModalOpen(false);
    // Open auth modal
    setShowAuthModal(true);
    return;
  }

  // User is logged in, proceed with submission
  await submitProposal(proposalData);
};
```

### Step 3: Create Actual Proposal Submission Function

Create a separate function for the actual API call:

```jsx
const submitProposal = async (proposalData) => {
  try {
    // TODO: Integrate with backend API
    // const response = await supabase.functions.invoke('bubble-proxy', {
    //   body: {
    //     action: 'proposal',
    //     type: 'create',
    //     payload: proposalData
    //   }
    // });

    alert('Proposal submitted successfully! (Backend integration pending)');
    setIsProposalModalOpen(false);
    setPendingProposalData(null);

    // TODO: Redirect to rental application page
    // window.location.href = `/rental-application?proposalId=${response.data._id}`;

  } catch (error) {
    console.error('Error submitting proposal:', error);
    alert('Failed to submit proposal. Please try again.');
  }
};
```

### Step 4: Add Auth Success Handler

Create a handler for when user successfully authenticates:

```jsx
const handleAuthSuccess = async (authResult) => {
  console.log('Auth success:', authResult);

  // Close the auth modal
  setShowAuthModal(false);

  // If there's a pending proposal, submit it now
  if (pendingProposalData) {
    // Small delay to ensure auth state is fully updated
    setTimeout(async () => {
      await submitProposal(pendingProposalData);
    }, 500);
  }
};
```

### Step 5: Render SignUpLoginModal in JSX

Add the modal to the render section (after CreateProposalFlowV2):

```jsx
{/* Auth Modal for Proposal Submission */}
{showAuthModal && (
  <SignUpLoginModal
    isOpen={showAuthModal}
    onClose={() => {
      setShowAuthModal(false);
      // Clear pending proposal if user cancels
      setPendingProposalData(null);
    }}
    initialView="initial"
    onAuthSuccess={handleAuthSuccess}
    defaultUserType="guest"
    skipReload={true} // Prevent reload - we'll handle the post-auth flow
  />
)}
```

---

## Complete Code Changes

### File: ViewSplitLeasePage.jsx

#### Import Section (add)
```jsx
import { checkAuthStatus } from '../../lib/auth.js';
import SignUpLoginModal from '../shared/SignUpLoginModal.jsx';
```

#### State Section (~line 436, add after isProposalModalOpen)
```jsx
const [showAuthModal, setShowAuthModal] = useState(false);
const [pendingProposalData, setPendingProposalData] = useState(null);
```

#### Handler Section (~line 811, replace handleProposalSubmit)
```jsx
// Submit proposal to backend
const submitProposal = async (proposalData) => {
  try {
    // TODO: Integrate with backend API to submit the proposal
    // const response = await supabase.functions.invoke('bubble-proxy', {
    //   body: {
    //     action: 'proposal',
    //     type: 'create',
    //     payload: proposalData
    //   }
    // });

    alert('Proposal submitted successfully! (Backend integration pending)');
    setIsProposalModalOpen(false);
    setPendingProposalData(null);

    // TODO: Redirect to rental application page
    // window.location.href = `/rental-application?proposalId=${response.data._id}`;

  } catch (error) {
    console.error('Error submitting proposal:', error);
    alert('Failed to submit proposal. Please try again.');
  }
};

// Handle proposal submission - checks auth first
const handleProposalSubmit = async (proposalData) => {
  console.log('Proposal submitted:', proposalData);

  // Check if user is logged in
  const isLoggedIn = await checkAuthStatus();

  if (!isLoggedIn) {
    // Store the proposal data for later submission
    setPendingProposalData(proposalData);
    // Close the proposal modal
    setIsProposalModalOpen(false);
    // Open auth modal
    setShowAuthModal(true);
    return;
  }

  // User is logged in, proceed with submission
  await submitProposal(proposalData);
};

// Handle successful authentication
const handleAuthSuccess = async (authResult) => {
  console.log('Auth success:', authResult);

  // Close the auth modal
  setShowAuthModal(false);

  // If there's a pending proposal, submit it now
  if (pendingProposalData) {
    // Small delay to ensure auth state is fully updated
    setTimeout(async () => {
      await submitProposal(pendingProposalData);
    }, 500);
  }
};
```

#### Render Section (after CreateProposalFlowV2 modal, ~line 2255)
```jsx
{/* Auth Modal for Proposal Submission */}
{showAuthModal && (
  <SignUpLoginModal
    isOpen={showAuthModal}
    onClose={() => {
      setShowAuthModal(false);
      setPendingProposalData(null);
    }}
    initialView="initial"
    onAuthSuccess={handleAuthSuccess}
    defaultUserType="guest"
    skipReload={true}
  />
)}
```

---

## Flow Diagram

```
User fills proposal form
         │
         ▼
   Clicks "Submit"
         │
         ▼
  handleProposalSubmit()
         │
         ▼
  checkAuthStatus() ──── isLoggedIn? ────┐
         │                               │
         │ NO                           YES
         ▼                               │
  Store proposalData                     │
  in pendingProposalData                 │
         │                               │
         ▼                               │
  Close proposal modal                   │
         │                               │
         ▼                               │
  Open SignUpLoginModal                  │
  (defaultUserType: "guest")             │
         │                               │
         ▼                               │
  User signs up/logs in                  │
         │                               │
         ▼                               │
  onAuthSuccess()                        │
         │                               │
         ▼                               │
  submitProposal(pendingProposalData) ◄──┘
         │
         ▼
  Show success / redirect
```

---

## Testing Checklist

- [ ] Logged-in user can submit proposal directly
- [ ] Logged-out user sees auth modal when clicking submit
- [ ] After signup, proposal is automatically submitted
- [ ] After login, proposal is automatically submitted
- [ ] Closing auth modal clears pending proposal data
- [ ] User type defaults to "Guest" in signup form
- [ ] Page does not reload after auth (skipReload=true works)
- [ ] Proposal draft data persists in localStorage during auth flow

---

## Future Enhancements

1. **Show loading state** during proposal submission
2. **Redirect to rental application** after successful submission
3. **Pre-fill user details** in proposal form from auth data
4. **Show toast notification** instead of alert for success/error
5. **Handle edge case** where user was previously on signup step in proposal flow
