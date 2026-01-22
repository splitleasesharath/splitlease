# Guest Proposal Simulation Page Implementation Plan

**Date:** 2026-01-20
**Type:** BUILD - New Feature Implementation
**Status:** PLANNING
**Priority:** Medium
**Estimated Complexity:** Medium-High (multi-step wizard with backend integration)

---

## Executive Summary

This plan adapts the Bubble `simulation-guest-proposals-mobile-day1` page to our React/Supabase architecture. The original Bubble page is a 6-step usability testing simulation that guides testers through the guest proposal experience. We'll create a modern, maintainable implementation using our established patterns.

---

## Bubble → Supabase Architecture Translation

### Key Mapping Decisions

| Bubble Concept | Our Architecture | Rationale |
|---------------|------------------|-----------|
| 22 Page Workflows | Edge Function actions + React handlers | Edge functions for DB ops, React for UI state |
| 296 Backend Workflows | Existing proposal Edge Function | Leverage `proposal/index.ts` actions |
| State tracking via Custom States | React useState + database `Usability Step` column | Hybrid: UI state in React, persistent state in DB |
| Bubble alerts | Toast notification system | Use existing `Toast.jsx` component |
| JavaScript elements (JS2B) | React logic hooks | Four-layer architecture |
| Reusable "Atom Sign up & Login" | Existing auth system | Use `auth.js` patterns |

### Database Mapping

The existing database already supports usability testing:

| Bubble Field | Supabase Column | Table |
|-------------|-----------------|-------|
| "is usability tester" | `is usability tester` | `user` |
| "Usability Step" | `Usability Step` | `user` |
| "isForUsability" | `isForUsability` | `listing` |
| Proposal states | `Status` | `proposal` |
| Counter-offer fields | `hc_*` columns | `proposal` |

**No new tables required** - we leverage existing schema.

---

## Architecture Design

### Component Structure (Hollow Component Pattern)

```
app/src/islands/pages/
└── GuestSimulationPage/
    ├── index.jsx                    # Main page component (hollow)
    ├── useGuestSimulationLogic.js   # All business logic hook
    ├── components/
    │   ├── StepProgress.jsx         # Step indicator (1-6)
    │   ├── LoginSection.jsx         # Auth form for testers
    │   ├── StepA.jsx               # Mark as usability tester
    │   ├── StepB.jsx               # Receive suggested proposals
    │   ├── StepC.jsx               # Receive counteroffer
    │   ├── StepD.jsx               # Email response (disabled)
    │   ├── StepE.jsx               # Virtual meeting
    │   └── StepF.jsx               # Proposal acceptance
    └── styles.css                   # Page-specific styles
```

### State Management

```javascript
// useGuestSimulationLogic.js
const [state, setState] = useState({
  currentStep: 0,           // 0 = not started, 1-6 = steps
  completedSteps: [],       // [1, 2, 3] = completed steps
  isLoading: {},            // { stepA: false, stepB: true, ... }
  results: {},              // { stepA: { success: true, message: '...' }, ... }
  user: null,               // Current logged-in user
  testProposals: [],        // Created test proposals
  isMobileTesting: false,   // Mobile testing checkbox
});
```

### Page Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GUEST SIMULATION PAGE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ LOGIN SECTION (if not authenticated)                     │   │
│  │ - Email input                                            │   │
│  │ - Password input                                         │   │
│  │ - Login button                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STEP PROGRESS: ① ─ ② ─ ③ ─ ④ ─ ⑤ ─ ⑥                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STEP A: Mark as Usability Tester                        │   │
│  │ [Button] → Updates user.is_usability_tester = true      │   │
│  │ Result: ✅ "Marked as tester at 2:30 PM"                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STEP B: Receive 2 Suggested Proposals                   │   │
│  │ ☑ "I'm testing on mobile" (required checkbox)           │   │
│  │ [Button] → Creates 2 test proposals via Edge Function   │   │
│  │ Result: ✅ "Created proposals #123, #124"               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STEP C: Receive Counteroffer from Host                  │   │
│  │ [Button] → Updates proposal with hc_* fields            │   │
│  │ Result: ✅ "Counteroffer applied to proposal #123"      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STEP D: Email Response (DISABLED)                       │   │
│  │ [Button - Disabled] - Not implemented in original       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STEP E: Virtual Meeting from Host                       │   │
│  │ [Button] → Sets virtual_meeting on proposal             │   │
│  │ Result: ✅ "Virtual meeting scheduled"                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ↓                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ STEP F: Acceptance of 2 Proposals                       │   │
│  │ [Button] → Updates Status = 'accepted' for both         │   │
│  │ Result: ✅ "Both proposals accepted!"                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ INFO: Keep this page open during testing.               │   │
│  │ Progress will be lost if you reload.                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: File Setup & Route Registration

**Step 1.1: Register route in routes.config.js**
```javascript
// Add to INTERNAL/DEV PAGES section
{
  path: '/_internal/guest-simulation',
  file: 'guest-simulation.html',
  aliases: ['/_internal/guest-simulation.html'],
  protected: false,  // Auth handled in-page
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

**Step 1.2: Create HTML entry point**
- File: `app/public/guest-simulation.html`
- Mount point: `<div id="root"></div>`
- Entry script: `src/guest-simulation.jsx`

**Step 1.3: Create entry script**
- File: `app/src/guest-simulation.jsx`
- Import and render `GuestSimulationPage`

### Phase 2: Core Component Implementation

**Step 2.1: Create main page component (hollow)**
```javascript
// app/src/islands/pages/GuestSimulationPage/index.jsx
export default function GuestSimulationPage() {
  const logic = useGuestSimulationLogic();

  return (
    <>
      <Header />
      <main>
        {!logic.user && <LoginSection {...logic} />}
        {logic.user && (
          <>
            <StepProgress currentStep={logic.currentStep} completedSteps={logic.completedSteps} />
            <StepA {...logic} />
            <StepB {...logic} />
            <StepC {...logic} />
            <StepD {...logic} />
            <StepE {...logic} />
            <StepF {...logic} />
          </>
        )}
        <InfoPanel />
      </main>
      <Footer />
    </>
  );
}
```

**Step 2.2: Create logic hook**
- Handles all state management
- Auth checking via `checkAuthStatus()`
- Step execution handlers
- API calls to Edge Functions
- Toast notifications

### Phase 3: Step Components

**Step 3.1: StepProgress component**
- Visual indicator showing 6 steps
- Completed steps show checkmark
- Current step highlighted
- Follows existing `CreateSuggestedProposalPage` pattern

**Step 3.2: LoginSection component**
- Email/password inputs
- Login button using `loginUser()` from auth.js
- "Please log in" message when not authenticated

**Step 3.3: Step A - Mark as Usability Tester**
```javascript
const handleStepA = async () => {
  // Update user.is_usability_tester = true via Edge Function
  const response = await fetch(`${SUPABASE_URL}/functions/v1/user`, {
    method: 'POST',
    body: JSON.stringify({
      action: 'update',
      payload: {
        user_id: user._id,
        fields: { 'is usability tester': true }
      }
    })
  });
  // Show toast, update state
};
```

**Step 3.4: Step B - Receive Suggested Proposals**
- Mobile testing checkbox (required)
- Creates 2 test proposals using `proposal` Edge Function
- Action: `create_suggested` or `create_mockup`
- Links proposals to test listings (where `isForUsability = true`)

**Step 3.5: Step C - Counteroffer**
- Updates first test proposal with `hc_*` fields
- Simulates host counter-offer scenario

**Step 3.6: Step D - Email Response (Disabled)**
- Button rendered but disabled
- Tooltip: "This step is not implemented"

**Step 3.7: Step E - Virtual Meeting**
- Sets `virtual meeting` and `virtual meeting confirmed` on proposal
- Simulates host scheduling a meeting

**Step 3.8: Step F - Acceptance**
- Updates both proposals to `Status = 'Accepted'`
- Triggers success celebration toast

### Phase 4: Edge Function Integration

**Option A: Use existing proposal Edge Function**
- Add new action `simulate_guest_flow` that handles all simulation steps
- Keeps backend logic centralized

**Option B: Direct Supabase calls (simpler)**
- Use `supabase.from('user').update()` directly
- Avoids Edge Function changes
- Acceptable for internal test page

**Recommendation:** Option B for simplicity - this is an internal test page, not production-facing.

### Phase 5: Styling

- Follow existing `InternalTestPage` styling patterns
- Grid layout for steps
- Color-coded result feedback (green success, red error)
- Mobile-responsive design
- Use existing `toast.css` for notifications

---

## Differences from Bubble Original

| Bubble Feature | Our Adaptation | Reason |
|---------------|----------------|--------|
| Bubble workflows (22) | React handlers + direct Supabase | Simpler, more maintainable |
| JavaScript to Bubble (JS2B) | Native React state | No cross-platform bridge needed |
| Recurring width check | CSS media queries | Standard responsive approach |
| Password show/hide toggle | Standard input type toggle | HTML5 native pattern |
| Loading selfie indicator | React loading state | useState-based |
| List of Dates Calculation | Use existing `dayUtils.js` | Leverage existing calculators |
| Custom state tracking | React useState + DB persist | Hybrid approach |

---

## Test Data Requirements

For the simulation to work, we need:

1. **Test Listings**: At least 2 listings with `isForUsability = true`
2. **Test Host User**: A host account to "own" the test proposals
3. **Tester Account**: The user running the simulation

Query to verify test data exists:
```sql
SELECT COUNT(*) FROM listing WHERE "isForUsability" = true AND "Active" = true;
```

If no test listings exist, we should:
- Either create them via a seed script
- Or add a "Setup Test Data" button to the page

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `app/public/guest-simulation.html` | HTML entry point |
| `app/src/guest-simulation.jsx` | React entry script |
| `app/src/islands/pages/GuestSimulationPage/index.jsx` | Main page component |
| `app/src/islands/pages/GuestSimulationPage/useGuestSimulationLogic.js` | Logic hook |
| `app/src/islands/pages/GuestSimulationPage/components/StepProgress.jsx` | Step indicator |
| `app/src/islands/pages/GuestSimulationPage/components/LoginSection.jsx` | Auth section |
| `app/src/islands/pages/GuestSimulationPage/components/StepCard.jsx` | Reusable step card |
| `app/src/islands/pages/GuestSimulationPage/styles.css` | Page styles |

### Files to Modify

| File | Change |
|------|--------|
| `app/src/routes.config.js` | Add `/_internal/guest-simulation` route |

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| No test listings in DB | Medium | Add data verification + setup button |
| Edge Function auth issues | Low | Use anon key for internal page |
| State loss on refresh | Expected | Clear warning banner on page |
| Mobile testing accuracy | Low | Use actual device or browser devtools |

---

## Open Questions

1. **Test Data Setup**: Should we create test listings automatically, or require manual setup?
   - **Recommendation**: Add a "Verify Test Data" check that shows what's missing

2. **Persistence**: Should step progress persist in database or be session-only?
   - **Original Bubble**: Session-only (lost on reload)
   - **Recommendation**: Match original - session-only with warning

3. **Email Notifications**: Should the simulation actually send test emails?
   - **Recommendation**: No - mock the behavior, don't send real emails

4. **Access Control**: Should this page require admin access?
   - **Recommendation**: No - but only accessible via direct URL (not in navigation)

---

## Success Criteria

1. ✅ Page loads at `/_internal/guest-simulation`
2. ✅ User can log in within the page
3. ✅ All 6 steps execute successfully (Step D disabled by design)
4. ✅ Test proposals are created in database
5. ✅ Visual feedback (toasts) for each action
6. ✅ Mobile-responsive layout
7. ✅ Follows hollow component pattern
8. ✅ No regressions to existing functionality

---

## References

### Existing Patterns to Follow

- [InternalTestPage.jsx](../../app/src/islands/pages/InternalTestPage.jsx) - Button grid layout, result display
- [CreateSuggestedProposalPage/](../../app/src/islands/pages/CreateSuggestedProposalPage/) - Multi-step wizard pattern
- [Toast.jsx](../../app/src/islands/shared/Toast.jsx) - Notification system
- [auth.js](../../app/src/lib/auth.js) - Authentication patterns

### Database Schema

- `user` table: `is usability tester`, `Usability Step` columns
- `listing` table: `isForUsability` column
- `proposal` table: All `hc_*` columns for counter-offers

### Original Requirements Document

- [simulation-guest-proposals-mobile-day1 Requirements.md](./simulation-guest-proposals-mobile-day1%20Requirements.md) - Bubble page documentation

---

## Implementation Order

1. **Phase 1**: Route registration + HTML/JSX entry files
2. **Phase 2**: Main page component + logic hook skeleton
3. **Phase 3**: Login section (reuse existing auth)
4. **Phase 4**: StepProgress component
5. **Phase 5**: Step A implementation (simplest)
6. **Phase 6**: Step B implementation (proposal creation)
7. **Phase 7**: Steps C, E, F implementation
8. **Phase 8**: Step D (disabled state)
9. **Phase 9**: Styling and polish
10. **Phase 10**: Testing and documentation

---

**Ready for Implementation**: This plan provides a complete roadmap for building the guest simulation page while adapting Bubble concepts to our React/Supabase architecture.
