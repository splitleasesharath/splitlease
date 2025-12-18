# Design Implementation Plan: Proposal Submission Loading Modal

## 1. Overview

**Brief Description**: Implement immediate visual feedback for proposal submission by displaying a loading modal with spinner as soon as the user clicks the submit button, then transition to a success modal upon successful creation.

**User's Original Vision/Reference Summary**:
- User clicks "Submit Proposal" button
- IMMEDIATELY show a loading modal with spinner and "Creating proposal..." message
- API call proceeds in the background
- On success: Transition the modal to show success state
- On error: Transition the modal to show error state

**Scope Boundaries**:
- IS included: Loading modal component, success/error state transitions, integration with ViewSplitLeasePage, SearchPage, and FavoriteListingsPage
- IS NOT included: Changes to the API layer, changes to CreateProposalFlowV2 internal flow

---

## 2. Reference Analysis

**Key Visual Characteristics Identified**:
- The existing `ProposalSuccessModal` already provides the success state UI (lines 1-253 of ProposalSuccessModal.jsx)
- The project has established spinner patterns using CSS `@keyframes spin` animation
- Existing loading modals use inline styles to ensure visibility without Tailwind dependency
- Brand colors: Primary purple `#7c3aed`, success green `#16a34a`

**Design System Alignment Notes**:
- Use existing spinner pattern: `border: 4px solid rgba(0,0,0,0.1); border-top-color: #31135D; animation: spin 1s linear infinite`
- Modal overlay: `rgba(0, 0, 0, 0.5)` background, `z-index: 10000`
- Modal container: White background, `border-radius: 16px`, `padding: 24px`, centered with flexbox
- Animation: `fadeIn 0.2s ease-in-out` for overlay, `slideUp 0.3s ease-out` for modal content

---

## 3. Existing Codebase Integration

### Relevant Existing Components to Reuse/Extend

| Component | Location | Purpose |
|-----------|----------|---------|
| `ProposalSuccessModal` | `app/src/islands/modals/ProposalSuccessModal.jsx` | Current success modal - will be enhanced to support loading state |
| `CreateProposalFlowV2` | `app/src/islands/shared/CreateProposalFlowV2.jsx` | Proposal wizard - triggers onSubmit callback |
| `Button` | `app/src/islands/shared/Button.jsx` | Has built-in `loading` prop with Loader2 spinner from lucide-react |

### Existing Styling Patterns to Follow

From `app/src/styles/components/modal.css` and `ProposalSuccessModal.jsx`:
```css
/* Spinner pattern used throughout codebase */
.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(0,0,0,0.1);
  border-top: 4px solid var(--bg-purple);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

### Files That Will Be Affected

1. **Primary - New Component**:
   - `app/src/islands/modals/ProposalSubmissionModal.jsx` (NEW FILE)
   - `app/src/styles/components/proposal-submission-modal.css` (NEW FILE)

2. **Integration Points**:
   - `app/src/islands/pages/ViewSplitLeasePage.jsx` (lines 1152-1294, 2840-2860)
   - `app/src/islands/pages/SearchPage.jsx` (lines 2072-2249, 2770-2785)
   - `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` (lines 900-1015, 1430-1450)

### Utilities and Helpers Available

- `useBodyScrollLock` hook pattern from `CreateProposalFlowV2.jsx` (lines 41-62)
- Existing toast notification system via `showToast` function

---

## 4. Component Specifications

### ProposalSubmissionModal (NEW COMPONENT)

**Purpose**: Multi-state modal showing loading -> success/error transitions during proposal submission

**Visual Specifications**:

#### Modal Overlay
- [FROM CODEBASE] Position: `fixed`, inset `0`
- [FROM CODEBASE] Background: `rgba(0, 0, 0, 0.5)`
- [FROM CODEBASE] Z-index: `10000`
- [FROM CODEBASE] Display: `flex`, centered content
- [FROM CODEBASE] Animation: `fadeIn 0.2s ease-in-out`

#### Modal Container
- [FROM CODEBASE] Background: `#FFFFFF`
- [FROM CODEBASE] Border radius: `16px`
- [FROM CODEBASE] Padding: `24px`
- [FROM CODEBASE] Max width: `420px`
- [FROM CODEBASE] Width: `90%`
- [FROM CODEBASE] Box shadow: `0 8px 32px rgba(0, 0, 0, 0.12)`
- [FROM CODEBASE] Animation: `slideUp 0.3s ease-out`

#### Loading State
- **Spinner Container**:
  - Width/Height: `64px`
  - Background: `#f5f3ff` (light purple)
  - Border radius: `50%`
  - Margin: `0 auto 20px auto`
  - Display: `flex`, centered content

- **Spinner**:
  - Width/Height: `40px`
  - Border: `4px solid rgba(0, 0, 0, 0.1)`
  - Border top: `4px solid #7c3aed` (brand purple)
  - Border radius: `50%`
  - Animation: `spin 1s linear infinite`

- **Loading Title**:
  - Font size: `20px`
  - Font weight: `600`
  - Color: `#1f2937`
  - Text align: `center`
  - Margin bottom: `8px`
  - Text: "Creating Proposal..."

- **Loading Subtitle**:
  - Font size: `14px`
  - Color: `#6b7280`
  - Text align: `center`
  - Line height: `1.5`
  - Text: "Please wait while we submit your proposal to the host."

#### Success State
- [FROM CODEBASE] Reuse exact styling from existing `ProposalSuccessModal`
- Success icon: Green checkmark in `#dcfce7` circle with `#16a34a` icon
- Title: "Proposal Submitted!"
- Subtitle: "Your proposal for {listingName} has been sent to the host."
- Info box with next steps
- Two CTAs: "Submit Rental Application" (primary) and "Go to Guest Dashboard" (secondary)

#### Error State
- **Error Icon Container**:
  - Width/Height: `64px`
  - Background: `#fee2e2` (light red)
  - Border radius: `50%`
  - Margin: `0 auto 20px auto`
  - Display: `flex`, centered content

- **Error Icon**:
  - Color: `#dc2626` (red)
  - Size: `32px`
  - X or exclamation mark SVG

- **Error Title**:
  - Font size: `20px`
  - Font weight: `600`
  - Color: `#1f2937`
  - Text: "Submission Failed"

- **Error Message**:
  - Font size: `14px`
  - Color: `#6b7280`
  - Text align: `center`
  - Dynamic error message

- **Retry Button**:
  - [FROM CODEBASE] Same styling as primary button from `ProposalSuccessModal`
  - Text: "Try Again"

- **Close Button**:
  - [FROM CODEBASE] Same styling as secondary button from `ProposalSuccessModal`
  - Text: "Close"

**Props/Variants**:
```typescript
interface ProposalSubmissionModalProps {
  isOpen: boolean;
  status: 'loading' | 'success' | 'error';
  proposalId?: string;
  listingName?: string;
  errorMessage?: string;
  onClose: () => void;
  onRetry?: () => void;
}
```

**Accessibility**:
- Role: `dialog`
- `aria-modal`: `true`
- `aria-labelledby`: title element ID
- `aria-describedby`: message element ID
- Focus trap within modal when open
- ESC key closes modal (except in loading state)
- Click outside closes modal (except in loading state)

---

## 5. Layout & Composition

### Modal Structure
```
ProposalSubmissionModal
├── Overlay (full screen backdrop)
│   └── Modal Container (centered card)
│       ├── Close Button (absolute positioned, hidden during loading)
│       ├── Icon Container (spinner/checkmark/error)
│       ├── Title
│       ├── Subtitle/Message
│       ├── Info Box (success state only)
│       └── Button Container (success/error states only)
```

### State Transitions
```
[Submit Button Click]
       │
       ▼
[Loading State] ──────────────────┐
       │                          │
       │ (API Success)            │ (API Error)
       ▼                          ▼
[Success State]              [Error State]
       │                          │
       │ (User Action)            │ (Retry)
       ▼                          ▼
[Navigation/Close]           [Loading State]
```

### Responsive Breakpoint Behaviors

**Desktop (> 768px)**:
- Modal max-width: `420px`
- Centered in viewport
- Padding: `24px`

**Mobile (< 768px)**:
- Modal width: `100%`
- Border radius: `20px 20px 0 0` (bottom sheet style)
- Positioned at bottom of screen
- Padding: `20px 16px`

---

## 6. Interactions & Animations

### Animation Specifications

**Overlay Fade In**:
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
/* Duration: 0.2s, Easing: ease-in-out */
```

**Modal Slide Up**:
```css
@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
/* Duration: 0.3s, Easing: ease-out */
```

**Spinner Rotation**:
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
/* Duration: 1s, Easing: linear, Iteration: infinite */
```

**Success Icon Pop**:
```css
@keyframes successPop {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
/* Duration: 0.4s, Easing: ease-out */
```

**State Transition (Loading -> Success/Error)**:
```css
@keyframes contentFade {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
/* Duration: 0.25s, Easing: ease-out */
```

### User Interaction Flows

1. **Submit Proposal Flow**:
   - User clicks "Submit Proposal" in CreateProposalFlowV2
   - CreateProposalFlowV2 calls `onSubmit(proposalData)`
   - Parent page IMMEDIATELY shows ProposalSubmissionModal in loading state
   - Parent page closes CreateProposalFlowV2
   - Parent page calls API
   - On API response, updates modal status to success/error

2. **Success Flow**:
   - User sees success state
   - User clicks "Submit Rental Application" -> Navigate to rental app
   - OR User clicks "Go to Guest Dashboard" -> Navigate to dashboard
   - Modal closes and navigates

3. **Error Flow**:
   - User sees error state with error message
   - User clicks "Try Again" -> Modal returns to loading, API retry
   - OR User clicks "Close" -> Modal closes, returns to listing page

---

## 7. Assets Required

### Icons

**Existing (No action needed)**:
- Document icon (used in success state) - inline SVG from ProposalSuccessModal
- Application icon - inline SVG from ProposalSuccessModal
- Dashboard icon - inline SVG from ProposalSuccessModal
- Checkmark icon - inline SVG from ProposalSuccessModal

**New Required**:
- Error/X icon - Create inline SVG:
```jsx
<svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
</svg>
```

### Images/Illustrations
None required.

### Fonts
[FROM CODEBASE] Uses system font stack already defined in variables.css

---

## 8. Implementation Sequence

### Phase 1: Create New Modal Component
1. Create `app/src/islands/modals/ProposalSubmissionModal.jsx`
   - Implement loading, success, and error states
   - Use inline styles (following ProposalSuccessModal pattern)
   - Include all animations
   - Include body scroll lock

2. Create `app/src/styles/components/proposal-submission-modal.css` (optional - if needed for complex animations)

### Phase 2: Integrate with ViewSplitLeasePage
3. Modify `app/src/islands/pages/ViewSplitLeasePage.jsx`:
   - Add state: `showSubmissionModal`, `submissionStatus`, `submissionError`
   - Modify `handleProposalSubmit` to immediately show loading modal
   - Modify `submitProposal` to update modal status on completion
   - Replace `ProposalSuccessModal` usage with `ProposalSubmissionModal`
   - Add retry handler for error state

### Phase 3: Integrate with SearchPage
4. Modify `app/src/islands/pages/SearchPage.jsx`:
   - Same modifications as ViewSplitLeasePage
   - Update state management for modal
   - Replace success modal with submission modal

### Phase 4: Integrate with FavoriteListingsPage
5. Modify `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`:
   - Same modifications as above
   - Update state management for modal
   - Replace success modal with submission modal

### Phase 5: Testing & Edge Cases
6. Test scenarios:
   - Fast successful submission (< 1s)
   - Slow successful submission (> 3s)
   - Network error
   - API validation error
   - User closes modal during error state
   - Retry after error

---

## 9. Assumptions & Clarifications Needed

### Assumptions Made

1. **[SUGGESTED]** The loading modal should NOT be dismissible during loading state (no close button, no click-outside, no ESC key) to prevent user confusion about submission status.

2. **[SUGGESTED]** Error retry should re-use the same proposal data from the failed attempt rather than requiring the user to re-enter information.

3. **[FROM CODEBASE]** The existing toast notification system will continue to be used for transient error messages, while the modal error state is for blocking errors.

4. **[SUGGESTED]** On successful submission, the CreateProposalFlowV2 modal should close immediately (before API response) since the submission modal takes over.

### Questions for User (If Details Are Ambiguous)

1. **Error State Duration**: Should the error state auto-dismiss after a timeout, or remain until user action?
   - [SUGGESTED] Remain until user action (close or retry)

2. **Retry Limit**: Should there be a maximum number of retry attempts?
   - [SUGGESTED] No limit - users should be able to retry as many times as needed

3. **Background Navigation**: If the user navigates away during loading (browser back button), should we:
   - a) Prevent navigation and show warning
   - b) Allow navigation but continue submission in background
   - c) Allow navigation and cancel submission
   - [SUGGESTED] (c) Allow navigation - the modal will simply close

4. **Success Modal Duration**: Should the success modal auto-navigate after a timeout, or wait for user action?
   - [SUGGESTED] Wait for user action (matches current ProposalSuccessModal behavior)

---

## 10. Code Structure Reference

### State Management Pattern (ViewSplitLeasePage example)

```javascript
// New state additions
const [showSubmissionModal, setShowSubmissionModal] = useState(false);
const [submissionStatus, setSubmissionStatus] = useState('loading'); // 'loading' | 'success' | 'error'
const [submissionError, setSubmissionError] = useState(null);
const [pendingRetryData, setPendingRetryData] = useState(null);

// Modified handleProposalSubmit
const handleProposalSubmit = async (proposalData) => {
  // ... auth check ...

  // IMMEDIATELY show loading modal
  setShowSubmissionModal(true);
  setSubmissionStatus('loading');
  setIsProposalModalOpen(false); // Close wizard
  setPendingRetryData(proposalData); // Store for retry

  await submitProposal(proposalData);
};

// Modified submitProposal
const submitProposal = async (proposalData) => {
  try {
    // ... existing API call logic ...

    // On success
    setSuccessProposalId(data.data?.proposalId);
    setSubmissionStatus('success');

  } catch (error) {
    // On error
    setSubmissionError(error.message || 'Failed to submit proposal');
    setSubmissionStatus('error');
  }
};

// Retry handler
const handleRetrySubmission = async () => {
  if (pendingRetryData) {
    setSubmissionStatus('loading');
    setSubmissionError(null);
    await submitProposal(pendingRetryData);
  }
};

// Close handler
const handleCloseSubmissionModal = () => {
  setShowSubmissionModal(false);
  setSubmissionStatus('loading');
  setSubmissionError(null);
  setPendingRetryData(null);
};
```

---

## 11. Files Referenced in This Plan

| File Path | Purpose |
|-----------|---------|
| `app/src/islands/modals/ProposalSuccessModal.jsx` | Reference for styling patterns and success state |
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Proposal wizard that triggers submission |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Primary integration point (lines 1152-1294) |
| `app/src/islands/pages/SearchPage.jsx` | Integration point (lines 2072-2249) |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Integration point (lines 900-1015) |
| `app/src/styles/components/modal.css` | Existing modal styling patterns |
| `app/src/styles/create-proposal-flow-v2.css` | Proposal flow styling reference |
| `app/src/islands/shared/Button.jsx` | Button with loading state reference |

---

**Plan Version**: 1.0
**Created**: 2025-12-16T16:05:32
**Author**: Claude Code (Design Planner)
