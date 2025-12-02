# Self-Listing Page Regression Recovery Plan

**Generated**: 2025-12-02
**Branch**: development_fred
**Issue**: Multiple features lost due to merge conflicts in commit cc3b67a

---

## EXECUTIVE SUMMARY

The merge commit `cc3b67a` ("Merge main into development_fred") on 2025-11-30 caused multiple regressions in the Self-Listing page functionality. A partial recovery was attempted in commit `f03167d`, but several features remain broken.

---

## MEGA COMMIT CAUSING PROBLEMS

### Commit: cc3b67a
```
Author: Claude Code <claude@splitlease.com>
Date:   Sun Nov 30 12:32:52 2025 -0800
Message: Merge main into development_fred

Stats:
- 176 files changed
- 10,354 insertions(+)
- 3,526 deletions(-)
```

This merge overwrote changes from the following commits on development_fred:
- `5951355` - Auth check and success modal for listing submission
- `bda5f2d` - Progress indicator showing X/6
- `a5b4f6b` - AI-powered listing description generation
- `b574c12` - NightlyPriceSlider alignment fixes
- `85de86c` - Full-nights availability message
- `54fda5b` - Load common safety features

---

## ISSUE #1: Progress Bar Showing 0/6 Instead of 1/6

### Problem
When user is in Section 1, progress shows "0/6" instead of "1/6". The progress should show completed sections out of 6 (excluding Review section).

### Current Code (SelfListingPage.tsx:346-354)
```tsx
<div className="progress-text">
  {formData.completedSections.length}/{sections.length}
</div>
```

### Required Fix (from commit 5951355)
```tsx
<div className="progress-text">
  {formData.completedSections.filter(s => s <= 6).length}/6
</div>
```

Also update the progress circle strokeDasharray calculation (line 348):
```tsx
// CURRENT (wrong):
strokeDasharray={`${(formData.completedSections.length / 7) * 100}, 100`}

// REQUIRED:
strokeDasharray={`${(formData.completedSections.filter(s => s <= 6).length / 6) * 100}, 100`}
```

### Source Commit
`5951355` - feat(self-listing): add auth check and success modal for listing submission

---

## ISSUE #2: Load Template Using Hardcoded Text (Not AI)

### Problem
The "load template" button in Section 2 (Description of Lodging) uses a hardcoded generic template instead of calling the AI gateway to generate a personalized description.

### Current Code (Section2Features.tsx:93-103)
```tsx
const loadTemplate = () => {
  const template = `Welcome to our comfortable and well-appointed space! This listing offers a great location with easy access to local amenities and transportation.

The space features modern furnishings and all the essentials you need for a pleasant stay. You'll have access to [list specific areas/amenities].

The neighborhood is [describe neighborhood characteristics - quiet, vibrant, family-friendly, etc.] with [mention nearby attractions, restaurants, shops, or transit].

We look forward to hosting you!`;

  handleChange('descriptionOfLodging', template);
};
```

### Required Fix (from commit a5b4f6b)
```tsx
import { generateListingDescription, extractListingDataFromDraft } from '../../../../lib/aiService';

// Add state for loading
const [isLoadingDescription, setIsLoadingDescription] = useState(false);

const loadTemplate = async () => {
  setIsLoadingDescription(true);

  try {
    // Extract listing data from localStorage draft
    const listingData = extractListingDataFromDraft();

    if (!listingData) {
      alert('Please complete Section 1 (Address) first to generate a description.');
      return;
    }

    // Add current amenities from this section's data
    const dataForGeneration = {
      ...listingData,
      amenitiesInsideUnit: data.amenitiesInsideUnit,
      amenitiesOutsideUnit: data.amenitiesOutsideUnit,
    };

    const generatedDescription = await generateListingDescription(dataForGeneration);

    if (generatedDescription) {
      handleChange('descriptionOfLodging', generatedDescription);
    } else {
      alert('Could not generate description. Please try again.');
    }
  } catch (error) {
    console.error('Error generating description:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    alert(`Error generating description: ${errorMessage}`);
  } finally {
    setIsLoadingDescription(false);
  }
};
```

Also update the button JSX to show loading state:
```tsx
<button
  type="button"
  className="btn-link"
  onClick={loadTemplate}
  disabled={isLoadingDescription}
>
  {isLoadingDescription ? 'generating...' : 'load template'}
</button>
```

### Source Commit
`a5b4f6b` - feat(self-listing): add AI-powered listing description generation

### Supporting Files
- `app/src/lib/aiService.js` - Already exists with `generateListingDescription` function
- `supabase/functions/ai-gateway/prompts/listing-description.ts` - Already deployed

---

## ISSUE #3: 5-Night Price Label Alignment

### Problem
The 5-night price input field in NightlyPriceSlider is not aligned with the other inputs (1-night price and Discount).

### Current Code (NightlyPriceSlider.tsx:63)
```css
.row{ display:grid; grid-template-columns: 1fr auto auto; gap:16px; align-items:start; margin: 8px 0 16px; }
.field{ display:flex; flex-direction:column; gap:6px; min-width:0; }
.spin{ display:inline-flex; align-items:center; gap:8px; width:100%; min-height:54px; }
```

### Verification
The CSS alignment changes from b574c12 appear to be present. The issue may be that the 5-night price input is not wrapped in a `.spin` container.

### Current 5-Night Input (line 131-137)
```html
<div class="field">
  <div class="label">5-night price</div>
  <div class="spin">
    <input id="slw-n5" class="num" type="text" inputmode="numeric" value="" readonly />
  </div>
</div>
```

### Status
VERIFY - The code appears correct. Check if CSS is being applied correctly.

### Source Commit
`b574c12` - fix(pricing): align nightly rate calculator inputs

---

## ISSUE #4: Submit Listing Shows Terms Message Instead of Signup Modal

### Problem
When an unauthenticated user clicks "Submit Listing", they should see the SignUpLoginModal. Instead, they see a message about terms and conditions.

### Current Code (Section7Review.tsx:65-68)
```tsx
const handleSubmit = () => {
  // No validation needed - button is always clickable
  onSubmit();
};
```

### Current SelfListingPage Submit Handler (SelfListingPage.tsx:240-278)
```tsx
const handleSubmit = async () => {
  setIsSubmitting(true);
  markSubmitting();
  // ... mock submission with no auth check
};
```

### Required Fix (from commit 5951355)

#### 1. Add Auth State and Modal State
```tsx
// Auth and modal states
const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
const [showAuthModal, setShowAuthModal] = useState(false);
const [pendingSubmit, setPendingSubmit] = useState(false);

// Success modal state
const [showSuccessModal, setShowSuccessModal] = useState(false);
const [createdListingId, setCreatedListingId] = useState('');
```

#### 2. Add SuccessModal Component
```tsx
interface SuccessModalProps {
  isOpen: boolean;
  listingId: string;
  listingName: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, listingId, listingName }) => {
  if (!isOpen) return null;

  const handleViewListing = () => {
    window.location.href = `/view-split-lease.html?listing_id=${listingId}`;
  };

  return (
    <div style={successModalStyles.overlay}>
      <div style={successModalStyles.modal}>
        <div style={successModalStyles.iconWrapper}>
          <span style={successModalStyles.icon}>✓</span>
        </div>
        <h2 style={successModalStyles.title}>Listing Created Successfully!</h2>
        <p style={successModalStyles.subtitle}>
          Your listing <span style={successModalStyles.listingName}>"{listingName}"</span> has been submitted and is now pending review.
        </p>
        <button
          style={successModalStyles.button}
          onClick={handleViewListing}
        >
          View Your Listing
        </button>
        <p style={successModalStyles.secondaryText}>
          You'll be notified once your listing is approved.
        </p>
      </div>
    </div>
  );
};
```

#### 3. Replace handleSubmit with Auth-Aware Version
```tsx
// Handle auth success callback
const handleAuthSuccess = () => {
  setShowAuthModal(false);
  if (pendingSubmit) {
    setPendingSubmit(false);
    setTimeout(() => {
      proceedWithSubmit();
    }, 100);
  }
};

// Actual listing submission logic
const proceedWithSubmit = async () => {
  setIsSubmitting(true);
  try {
    const newListing = await createListing(formData);
    setFormData({ ...formData, isSubmitted: true, isDraft: false });
    localStorage.removeItem('selfListingDraft');
    setCreatedListingId(newListing.id);
    setShowSuccessModal(true);
  } catch (error) {
    console.error('[SelfListingPage] Error submitting listing:', error);
    alert(`Error submitting listing: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
  } finally {
    setIsSubmitting(false);
  }
};

// Handle submit button click - check auth first
const handleSubmit = async () => {
  const loggedIn = await checkAuthStatus();
  setIsLoggedIn(loggedIn);

  if (!loggedIn) {
    setPendingSubmit(true);
    setShowAuthModal(true);
    return;
  }

  proceedWithSubmit();
};
```

#### 4. Add SignUpLoginModal and SuccessModal to JSX
```tsx
{/* Auth Modal for logged-out users */}
<SignUpLoginModal
  isOpen={showAuthModal}
  onClose={() => {
    setShowAuthModal(false);
    setPendingSubmit(false);
  }}
  initialView="signup"
  defaultUserType="host"
  showUserTypeSelector={false}
  skipReload={true}
  onAuthSuccess={handleAuthSuccess}
/>

{/* Success Modal */}
<SuccessModal
  isOpen={showSuccessModal}
  listingId={createdListingId}
  listingName={formData.spaceSnapshot.listingName}
/>
```

### Source Commit
`5951355` - feat(self-listing): add auth check and success modal for listing submission

---

## ISSUE #5: Load Common Safety Features

### Status
ALREADY RECOVERED in commit f03167d. The button exists in Section7Review.tsx and calls `getCommonSafetyFeatures()` from `safetyService.ts`.

### Verification
- Section7Review.tsx:27-39 - `loadCommonSafetyFeatures` function exists
- Section7Review.tsx:87-95 - "load common" button exists
- utils/safetyService.ts - Service file exists

---

## ISSUE #6: Full-Time Selection Text

### Status
ALREADY RECOVERED in commit f03167d. Section3LeaseStyles.tsx shows "Full-Nights of the week Availability" when all 7 nights are selected.

### Verification
Section3LeaseStyles.tsx:211-213:
```tsx
{getAvailableNightsCount() === 7
  ? 'Full-Nights of the week Availability'
  : `${getAvailableNightsCount()} Nights Available, ${getNotAvailableNightsCount()} Nights Not Available`}
```

---

## RECOVERY IMPLEMENTATION ORDER

### Priority 1: Critical User Experience
1. **Submit Listing Auth Check + Success Modal** (Issue #4)
   - Files: SelfListingPage.tsx
   - Complexity: High
   - Time estimate: N/A

2. **Progress Bar Fix** (Issue #1)
   - Files: SelfListingPage.tsx
   - Complexity: Low
   - Changes: 2 lines

### Priority 2: Feature Completeness
3. **AI-Powered Load Template** (Issue #2)
   - Files: Section2Features.tsx
   - Complexity: Medium
   - Dependencies: aiService.js (exists), listing-description prompt (exists)

### Priority 3: Visual Polish
4. **5-Night Price Alignment** (Issue #3)
   - Files: NightlyPriceSlider.tsx
   - Complexity: Low
   - Status: Verify if already fixed

---

## COMMITS TO CHERRY-PICK OR REFERENCE

| Commit | Description | Status |
|--------|-------------|--------|
| `5951355` | Auth check and success modal | LOST - Must restore |
| `bda5f2d` | Progress X/6 fix | PARTIALLY LOST - Must restore |
| `a5b4f6b` | AI-powered description | LOST - Must restore |
| `b574c12` | NightlyPriceSlider alignment | VERIFY - May be present |
| `85de86c` | Full-nights message | RECOVERED in f03167d |
| `54fda5b` | Load common safety features | RECOVERED in f03167d |

---

## VERIFICATION CHECKLIST

After implementing fixes, verify:

- [ ] Progress indicator shows 1/6 when in Section 1, 2/6 when Section 1+2 complete, etc.
- [ ] "Load template" button in Section 2 calls AI and shows "generating..." loading state
- [ ] 5-night price input aligns vertically with 1-night price and Discount inputs
- [ ] Clicking "Submit Listing" when logged out shows SignUpLoginModal
- [ ] After successful signup, submission proceeds automatically
- [ ] Success modal appears with listing name and "View Your Listing" button
- [ ] Safety features "load common" button works in Section 7
- [ ] "Full-Nights of the week Availability" shows when all 7 nights selected

---

## ROLLBACK OPTION

If recovery fails, can rollback to pre-merge state:
```bash
git checkout 5951355 -- app/src/islands/pages/SelfListingPage/
```

However, this would lose changes from main branch. Better approach is selective restoration.

---

## APPENDIX: MEGA COMMIT DETAILS

### Merge Parents
- **Parent 1 (HEAD)**: `5951355` - feat(self-listing): add auth check and success modal
- **Parent 2 (main)**: `0f5bbe9` - feat: implement comprehensive proposal status conditionals

### Commits From Main Branch Merged In
```
0f5bbe9 feat: implement comprehensive proposal status conditionals from Bubble docs
659cbd9 Merge branch 'main'
9d99517 docs: add proposal status bar conditionals documentation
18c1445 Merge branch 'main'
1e17696 chore: update gdoc file references
04187b0 fix: trim status values to handle trailing spaces from Bubble data
3cb162d feat: add original price strikethrough and Go to Leases button
f795d2d docs: add usualOrder reference and banner visibility rule
599003c feat: add usualOrder and status banner visibility
ac77fa6 docs: add conditional patterns section
ceb30c8 feat: add dynamic VM states, See Details, Cancel Proposal buttons
b190abc fix: hide cancelled-by-Split-Lease banner
926adae fix: hide empty cancellation reason in status banner
cdd71e8 feat: implement dynamic UI for guest proposals page
bd165a3 docs: add comprehensive analysis of guest proposals dynamic UI gaps
91f7c8d docs: add comprehensive proposal table schema
ea7590c docs: add house rules data structure documentation
335d630 fix: parse double-encoded Days Selected JSONB
51732cd style: make house rules badges 50% wider
e62f4bd docs: add index and navigation guide
68840e7 docs: add comprehensive guest proposals investigation analysis
4c16484 fix: fetch house rules from proposal table
0e462e0 feat: add collapsible house rules section
f28670f fix: conditionally show See House Rules
0924b96 fix: handle text day names from Supabase
1a4e3ec docs: add comprehensive guest proposals page analysis
03105ce chore: remove desktop.ini files from tracking
590f209 style: change day badges from circles to squircles
21bb3bf feat: redesign GuestProposalsPage layout
7d646d3 fix: add top padding to prevent header overlap
```

### Key Files Modified by Merge
```
app/src/islands/pages/GuestProposalsPage.jsx       | 456 ++----
app/src/islands/pages/useGuestProposalsPageLogic.js| 960 ---- (deleted)
app/src/islands/pages/proposals/ProgressTracker.jsx|  80 +
app/src/islands/pages/proposals/ProposalCard.jsx   | 854 ++++
app/src/islands/pages/proposals/ProposalSelector.jsx|  37 +
app/src/islands/shared/LoggedInAvatar/LoggedInAvatar.jsx | 44 +-
app/src/lib/auth.js                                |   3 +-
app/src/lib/proposals/dataTransformers.js          | 247 +
app/src/lib/proposals/urlParser.js                 |  83 +
app/src/lib/proposals/userProposalQueries.js       | 520 +
app/src/logic/constants/proposalStages.js          | 243 +
app/src/logic/constants/proposalStatuses.js        | 365 +
app/src/logic/rules/auth/isProtectedPage.js        |   5 +-
app/src/styles/components/guest-proposals.css      |1655 +----
app/vite.config.js                                 |  54 +-
```

### Analysis
The merge primarily brought in Guest Proposals redesign work from main, which included:
1. New proposals/ directory with components
2. New lib/proposals/ services
3. New logic/constants/ for proposal statuses
4. Significant CSS changes

The conflict resolution "accepting main versions" may have inadvertently overwritten the SelfListingPage changes that were on development_fred.
