# Design Implementation Plan: Proposal Submission Button Loading State

## 1. Overview

**Brief Description**: Add inline loading state to the "Submit Proposal" button in CreateProposalFlowV2 - disable the button and show a spinner while the API call is in progress.

**User's Original Vision/Reference Summary**:
- User clicks "Submit Proposal" button
- Button becomes disabled and shows a loading spinner inline
- API call proceeds in background
- On success: Show existing ProposalSuccessModal
- On error: Re-enable button and show toast error

**Scope Boundaries**:
- IS included: Button loading state, spinner inside button, disable during submission
- IS NOT included: Separate loading modal, new modal components, changes to success/error modal patterns

**Supersedes**: This plan replaces `20251216160532-design-proposal-submission-loading-modal.md` with a simpler button-focused approach.

---

## 2. Reference Analysis

**Key Visual Characteristics Identified**:

The codebase has established patterns for loading buttons:

1. **Shared Button Component** (`app/src/islands/shared/Button.jsx`):
   - Has `loading` prop that shows `Loader2` spinner from lucide-react
   - Automatically disables when `loading=true`
   - Pattern: `loading && 'btn-loading'` class, `Loader2` spinner rendered

2. **CancelProposalModal Pattern** (`app/src/islands/modals/CancelProposalModal.jsx`):
   - Uses `isSubmitting` state
   - Button text changes: `{isSubmitting ? 'Processing...' : buttonText}`
   - Buttons get `disabled={isSubmitting}`

3. **Footer Component Pattern** (`app/src/islands/shared/Footer.jsx`):
   - Uses `isSubmittingReferral` and `isSubmittingImport` states
   - Button text: `{isSubmitting ? 'Sharing...' : 'Share now'}`

**Design System Alignment Notes**:
- [FROM CODEBASE] Spinner: `Loader2` from lucide-react, size 18px
- [FROM CODEBASE] Button disabled state: `opacity: 0.6`, `cursor: not-allowed`
- [FROM CODEBASE] Loading text pattern: "Submitting..." during loading

---

## 3. Existing Codebase Integration

### Relevant Existing Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `CreateProposalFlowV2` | `app/src/islands/shared/CreateProposalFlowV2.jsx` | Contains the Submit button (line 720) |
| `Button` | `app/src/islands/shared/Button.jsx` | Reusable button with loading prop |
| `CancelProposalModal` | `app/src/islands/modals/CancelProposalModal.jsx` | Reference for isSubmitting pattern |

### Existing Styling Patterns to Follow

From `app/src/styles/create-proposal-flow-v2.css`:
```css
.nav-button.next {
  background: #5B2C6F;
  border: 2px solid #5B2C6F;
  color: white;
}

.nav-button.next:hover {
  background: #4a2359;
}
```

### Files That Will Be Affected

1. **Primary Changes**:
   - `app/src/islands/shared/CreateProposalFlowV2.jsx` - Add isSubmitting prop, modify submit button
   - `app/src/styles/create-proposal-flow-v2.css` - Add loading button styles

2. **Integration Points** (pass isSubmitting prop):
   - `app/src/islands/pages/ViewSplitLeasePage.jsx`
   - `app/src/islands/pages/SearchPage.jsx`
   - `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx`

---

## 4. Component Specifications

### CreateProposalFlowV2 - Submit Button Modification

**Current Implementation** (line 719-721):
```jsx
{currentSection === 1 ? (
  <button className="nav-button next" onClick={handleSubmit}>
    Submit Proposal
  </button>
)
```

**New Implementation**:

**Props Addition**:
```typescript
// Add to component props
isSubmitting?: boolean;  // Controls button loading state
```

**Visual Specifications for Loading State**:

#### Button - Loading State
- [FROM CODEBASE] Add class: `submitting` when isSubmitting is true
- Disabled: `true` when isSubmitting
- Cursor: `not-allowed`
- Opacity: `0.7` (slightly transparent)

#### Inline Spinner
- [FROM CODEBASE] Use CSS spinner (consistent with codebase pattern)
- Width/Height: `16px`
- Border: `2px solid rgba(255, 255, 255, 0.3)`
- Border top: `2px solid #FFFFFF` (white for contrast on purple button)
- Border radius: `50%`
- Animation: `spin 0.8s linear infinite`
- Margin right: `8px`
- Display: `inline-block`
- Vertical align: `middle`

#### Button Text - Loading State
- Text: "Submitting..."
- Font style: Same as normal state
- Display: `inline` with spinner

**States**:
| State | Button Text | Spinner | Disabled | Cursor |
|-------|-------------|---------|----------|--------|
| Default | "Submit Proposal" | Hidden | false | pointer |
| Submitting | "Submitting..." | Visible | true | not-allowed |

**Accessibility**:
- `aria-busy="true"` when submitting
- `aria-disabled="true"` when submitting
- Screen reader announcement for loading state

---

## 5. Layout & Composition

### Button Structure (Loading State)

```
[Submit Proposal Button]
├── Spinner (16x16, spinning animation)
└── Text ("Submitting...")
```

### Visual Flow

```
[User clicks Submit Proposal]
         │
         ▼
[Button shows spinner + "Submitting..."]
[Button disabled]
         │
         ├── (API Success) ──> [Enable button] ──> [Show Success Modal]
         │
         └── (API Error) ──> [Enable button] ──> [Show Toast Error]
```

---

## 6. Interactions & Animations

### Animation Specifications

**Spinner Rotation**:
```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
/* Duration: 0.8s, Easing: linear, Iteration: infinite */
```

### State Transitions

1. **Click Submit**:
   - Immediate: Button class adds `submitting`
   - Immediate: Button becomes disabled
   - Immediate: Text changes to "Submitting..."
   - Immediate: Spinner appears

2. **API Complete (Success)**:
   - Button state cleared (parent handles)
   - Success modal shown (existing behavior)

3. **API Complete (Error)**:
   - Button state cleared (parent handles)
   - Toast error shown (existing behavior)
   - User can click Submit again

---

## 7. Assets Required

### Icons

**Existing (No action needed)**:
- None - using CSS spinner (no icon import needed)

### CSS Additions

Add to `app/src/styles/create-proposal-flow-v2.css`:
```css
/* Submit button loading state */
.nav-button.next.submitting {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}

.nav-button.next .button-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## 8. Implementation Sequence

### Phase 1: Update CreateProposalFlowV2 Component

1. **Add isSubmitting prop** to CreateProposalFlowV2:
   - Location: `app/src/islands/shared/CreateProposalFlowV2.jsx`
   - Line: ~125 (in prop destructuring)
   - Add: `isSubmitting = false`

2. **Modify Submit Button** (lines 719-721):
   - Add conditional class for loading state
   - Add disabled attribute
   - Add spinner element
   - Add conditional text

### Phase 2: Add CSS Styles

3. **Add loading styles** to `app/src/styles/create-proposal-flow-v2.css`:
   - Add `.nav-button.next.submitting` styles
   - Add `.button-spinner` styles
   - Add `@keyframes spin` animation

### Phase 3: Update Parent Components

4. **Update ViewSplitLeasePage.jsx**:
   - Pass `isSubmitting={isSubmittingProposal}` to CreateProposalFlowV2
   - Existing state `isSubmittingProposal` already exists (line ~1153)

5. **Update SearchPage.jsx**:
   - Add `isSubmittingProposal` state if not exists
   - Pass to CreateProposalFlowV2

6. **Update FavoriteListingsPage.jsx**:
   - Add `isSubmittingProposal` state if not exists
   - Pass to CreateProposalFlowV2

### Phase 4: Testing

7. **Test scenarios**:
   - Click submit -> verify button disabled and shows spinner
   - Fast success (< 500ms) -> verify smooth transition to success modal
   - Slow success (> 2s) -> verify spinner continues
   - Error -> verify button re-enables
   - Click again after error -> verify works normally

---

## 9. Assumptions & Clarifications

### Assumptions Made

1. **[FROM CODEBASE]** The `isSubmittingProposal` state already exists in ViewSplitLeasePage (confirmed at line 1153).

2. **[SUGGESTED]** The spinner should be a CSS-based spinner rather than importing lucide-react's Loader2 to keep the CreateProposalFlowV2 component dependency-light.

3. **[FROM CODEBASE]** The existing success modal behavior (ProposalSuccessModal) remains unchanged.

4. **[FROM CODEBASE]** Error handling continues to use toast notifications.

### Design Decisions

1. **Simple Inline Spinner**: Use CSS animation rather than SVG/icon component for simplicity.

2. **Text Change**: Button text changes to "Submitting..." to provide clear feedback.

3. **Opacity Reduction**: Button at 70% opacity during loading to indicate disabled state while remaining visible.

4. **No Separate Loading Modal**: Per user requirement, the button loading state replaces the need for a separate loading modal.

---

## 10. Code Changes Summary

### CreateProposalFlowV2.jsx

**Prop Addition** (~line 125):
```jsx
export default function CreateProposalFlowV2({
  // ... existing props ...
  isSubmitting = false,  // NEW: Loading state for submit button
  onClose,
  onSubmit
}) {
```

**Submit Button Modification** (~lines 719-735):
```jsx
{currentSection === 1 ? (
  <button
    className={`nav-button next ${isSubmitting ? 'submitting' : ''}`}
    onClick={handleSubmit}
    disabled={isSubmitting}
    aria-busy={isSubmitting}
  >
    {isSubmitting && <span className="button-spinner" />}
    {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
  </button>
) : (
  // ... rest of button logic
)}
```

### create-proposal-flow-v2.css

**New Styles**:
```css
/* Submit button loading state */
.nav-button.next.submitting {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}

.nav-button.next .button-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #FFFFFF;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### ViewSplitLeasePage.jsx

**Pass isSubmitting prop** (~line where CreateProposalFlowV2 is rendered):
```jsx
<CreateProposalFlowV2
  // ... existing props ...
  isSubmitting={isSubmittingProposal}  // NEW
  onClose={() => setIsProposalModalOpen(false)}
  onSubmit={handleProposalSubmit}
/>
```

---

## 11. Files Referenced in This Plan

| File Path | Purpose |
|-----------|---------|
| `app/src/islands/shared/CreateProposalFlowV2.jsx` | Main component to modify (submit button) |
| `app/src/styles/create-proposal-flow-v2.css` | Add loading button styles |
| `app/src/islands/pages/ViewSplitLeasePage.jsx` | Pass isSubmitting prop |
| `app/src/islands/pages/SearchPage.jsx` | Pass isSubmitting prop |
| `app/src/islands/pages/FavoriteListingsPage/FavoriteListingsPage.jsx` | Pass isSubmitting prop |
| `app/src/islands/modals/CancelProposalModal.jsx` | Reference for isSubmitting pattern |
| `app/src/islands/shared/Button.jsx` | Reference for loading button pattern |
| `app/src/islands/modals/ProposalSuccessModal.jsx` | Existing success modal (unchanged) |

---

**Plan Version**: 2.0 (Replaces loading modal approach with button loading state)
**Created**: 2025-12-16T17:30:00
**Author**: Claude Code (Design Planner)
