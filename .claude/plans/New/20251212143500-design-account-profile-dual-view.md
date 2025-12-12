# Design Implementation Plan: Account Profile Dual-View System

## 1. Overview

### User's Original Vision
Redesign the account profile page with two distinct views:
1. **Editor View** - Full editing capabilities for users viewing their own profile
2. **Public View** - Read-only display for viewing someone else's profile

### Scope Boundaries

**INCLUDED:**
- Complete redesign of AccountProfilePage as a React component (migrating from current HTML+JS hybrid)
- Two-column layout (360px sidebar + main feed)
- Editor view with editable cards and form inputs
- Public view with read-only display
- View mode determination based on logged-in user ID vs. profile user ID
- Sticky sidebar with cover photo, avatar, profile strength meter
- Multiple content cards (Basic Info, About, Requirements, Schedule, Verification, etc.)
- Fixed save bar for editor view
- Day selector component supporting interactive and read-only modes
- Tag/chip components for reasons and items

**NOT INCLUDED:**
- Backend API changes (using existing Supabase endpoints)
- New database fields
- Photo upload functionality redesign (keeping existing pattern)
- LinkedIn OAuth integration (using existing flow)
- Video upload (placeholder/dropzone only)

---

## 2. Reference Analysis

### Design Tokens [FROM REFERENCE]
```css
:root {
  /* Primary Colors */
  --sl-primary: #31135D;
  --sl-primary-dark: #23083D;
  --sl-primary-light: #7B4FB5;
  --sl-primary-soft: #F3F0FF;

  /* Status Colors */
  --sl-success: #059669;
  --sl-success-bg: #ECFDF5;
  --sl-warning: #D97706;

  /* Text Colors */
  --sl-text-main: #111827;
  --sl-text-secondary: #4B5563;
  --sl-text-tertiary: #9CA3AF;

  /* Background & Border */
  --sl-bg-body: #F9FAFB;
  --sl-bg-card: #FFFFFF;
  --sl-border-subtle: #E5E7EB;

  /* Border Radius */
  --sl-radius-lg: 16px;
  --sl-radius-xl: 24px;

  /* Typography */
  --sl-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --sl-font-display: 'DM Sans', var(--sl-font-sans);
}
```

### Layout Specifications [FROM REFERENCE]

**Page Container:**
- Max-width: 1160px
- Padding: 24px
- Gap between columns: 32px
- Background: var(--sl-bg-body)

**Sidebar:**
- Width: 360px (fixed)
- Position: sticky
- Top offset: 112px (below header)
- Border-radius: var(--sl-radius-xl)

**Main Feed:**
- Width: 1fr (flexible)
- Gap between cards: 24px

### Editor View Components [FROM REFERENCE]

**Cover Photo Section:**
- Height: 140px
- Border-radius: var(--sl-radius-xl) var(--sl-radius-xl) 0 0
- Default background: linear-gradient(135deg, var(--sl-primary-soft), var(--sl-primary-light))
- Hover state: shows "Click to change cover" hint with camera icon

**Avatar:**
- Size: 120px x 120px
- Border-radius: 50%
- Border: 4px solid white
- Position: overlaps cover by 60px (transform: translateY(-60px))
- Camera button: 36px circle, positioned bottom-right, purple background

**Profile Name Display (Real-time):**
- Font: var(--sl-font-display)
- Size: 24px
- Weight: 700
- Color: var(--sl-text-main)

**Job Title Display:**
- Font: var(--sl-font-sans)
- Size: 14px
- Weight: 400
- Color: var(--sl-text-secondary)

**Profile Strength Meter:**
- Track height: 8px
- Track background: var(--sl-border-subtle)
- Fill background: var(--sl-primary)
- Border-radius: 4px
- Percentage text: 14px, weight 600, var(--sl-primary)

**Next Action Cards:**
- Background: var(--sl-primary-soft)
- Padding: 12px 16px
- Border-radius: 12px
- Icon size: 20px
- Text: 14px
- Badge: "+5 pts" style pill, green background

### Public View Differences [FROM REFERENCE]

**Avatar Changes:**
- No camera button
- Verified badge: 24px green circle with white checkmark, positioned bottom-right
- Border: 4px solid var(--sl-success-bg)

**Stats Section (replaces edit prompts):**
- 2x2 grid layout
- Items: Response Time, Response Rate
- Value: 20px, weight 600
- Label: 12px, var(--sl-text-tertiary)

**Verification List:**
- Compact list with check icons
- Items: Email, Phone, Gov ID, LinkedIn
- Icon: 16px, green for verified
- Text: 14px

**Member Since:**
- Text: "Member since [Month Year]"
- Size: 12px
- Color: var(--sl-text-tertiary)
- Icon: calendar, 14px

---

## 3. Existing Codebase Integration

### Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `app/src/account-profile.jsx` | **REPLACE** | Convert from island hydration to full React page |
| `app/public/account-profile.html` | **SIMPLIFY** | Remove inline JS, keep basic HTML shell |
| `app/src/routes.config.js` | **NO CHANGE** | Route already exists with dynamic pattern |

### Files to Create

| File | Purpose |
|------|---------|
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.jsx` | Main hollow component |
| `app/src/islands/pages/AccountProfilePage/useAccountProfilePageLogic.js` | Logic hook |
| `app/src/islands/pages/AccountProfilePage/AccountProfilePage.css` | Page styles |
| `app/src/islands/pages/AccountProfilePage/components/ProfileSidebar.jsx` | Sidebar component |
| `app/src/islands/pages/AccountProfilePage/components/EditorView.jsx` | Editor mode wrapper |
| `app/src/islands/pages/AccountProfilePage/components/PublicView.jsx` | Public mode wrapper |
| `app/src/islands/pages/AccountProfilePage/components/cards/BasicInfoCard.jsx` | Basic info form/display |
| `app/src/islands/pages/AccountProfilePage/components/cards/AboutCard.jsx` | About bio card |
| `app/src/islands/pages/AccountProfilePage/components/cards/RequirementsCard.jsx` | Why split lease card |
| `app/src/islands/pages/AccountProfilePage/components/cards/ScheduleCommuteCard.jsx` | Days + transport |
| `app/src/islands/pages/AccountProfilePage/components/cards/TrustVerificationCard.jsx` | Verification status |
| `app/src/islands/pages/AccountProfilePage/components/cards/ReasonsCard.jsx` | Reasons to host chips |
| `app/src/islands/pages/AccountProfilePage/components/cards/StorageItemsCard.jsx` | Storage item chips |
| `app/src/islands/pages/AccountProfilePage/components/cards/VideoIntroCard.jsx` | Video upload/display |
| `app/src/islands/pages/AccountProfilePage/components/cards/AccountSettingsCard.jsx` | Settings (editor only) |
| `app/src/islands/pages/AccountProfilePage/components/shared/ProfileCard.jsx` | Reusable card wrapper |
| `app/src/islands/pages/AccountProfilePage/components/shared/DaySelectorPills.jsx` | Day pills (interactive/readonly) |
| `app/src/islands/pages/AccountProfilePage/components/shared/SelectableChip.jsx` | Tag chip component |
| `app/src/islands/pages/AccountProfilePage/components/shared/CoverPhotoEditor.jsx` | Cover photo with edit |
| `app/src/islands/pages/AccountProfilePage/components/shared/AvatarWithBadge.jsx` | Avatar + edit/verified badge |
| `app/src/islands/pages/AccountProfilePage/components/shared/ProfileStrengthMeter.jsx` | Progress meter |
| `app/src/islands/pages/AccountProfilePage/components/shared/NextActionCard.jsx` | Improvement suggestion |
| `app/src/islands/pages/AccountProfilePage/components/shared/FixedSaveBar.jsx` | Bottom save bar |

### Patterns to Follow [FROM CODEBASE]

**Hollow Component Pattern:**
```jsx
// From useViewSplitLeasePageLogic.js
export function useAccountProfilePageLogic() {
  // ALL state, effects, handlers here
  return {
    // Data state
    loading, error, profileData,
    // View mode
    isEditorView, isPublicView,
    // Form state (editor)
    formData, formErrors,
    // Handlers
    handleFieldChange, handleSave, handleCancel, ...
  };
}

// From ViewSplitLeasePage.jsx pattern
export default function AccountProfilePage() {
  const logic = useAccountProfilePageLogic();

  if (logic.loading) return <LoadingState />;
  if (logic.error) return <ErrorState error={logic.error} />;

  return logic.isEditorView
    ? <EditorView {...logic} />
    : <PublicView {...logic} />;
}
```

**Auth Utilities [FROM CODEBASE]:**
```javascript
// From app/src/lib/auth.js
import { checkAuthStatus, getSessionId, validateTokenAndFetchUser } from '../../lib/auth.js';

// Get logged-in user ID
const loggedInUserId = getSessionId();

// Get profile user ID from URL
const profileUserId = getProfileUserIdFromUrl(); // /account-profile/:userId

// Determine view mode
const isEditorView = loggedInUserId === profileUserId;
```

**Day Selector Pattern [FROM CODEBASE]:**
```jsx
// From SearchScheduleSelector.jsx - adapt for profile use
// Key difference: Support readOnly prop for public view
<DaySelectorPills
  selectedDays={[1, 2, 3, 4, 5]} // 0-indexed
  onChange={handleDaysChange}   // null in public view
  readOnly={!isEditorView}
/>
```

### Existing Components to Reuse

| Component | Location | Use For |
|-----------|----------|---------|
| `Header` | `islands/shared/Header.jsx` | Page header |
| `Footer` | `islands/shared/Footer.jsx` | Page footer |
| `Button` | `islands/shared/Button.jsx` | Save/cancel buttons |
| `Toast` | `islands/shared/Toast.jsx` | Success/error notifications |
| `SignUpLoginModal` | `islands/shared/SignUpLoginModal.jsx` | Auth redirect |
| `NotificationSettingsModal` | `islands/modals/NotificationSettingsModal.jsx` | Settings modal |
| `EditPhoneNumberModal` | `islands/modals/EditPhoneNumberModal.jsx` | Phone edit modal |

### Data Sources [FROM CODEBASE]

```javascript
// User data - from Supabase user table
const { data: userData } = await supabase
  .from('user')
  .select('*')
  .eq('_id', profileUserId)
  .single();

// Storage items - from zat_storage table
const { data: storageItems } = await supabase
  .from('zat_storage')
  .select('_id, Name')
  .order('Name');

// Good guest reasons - from zat_goodguestreasons table
const { data: reasons } = await supabase
  .from('zat_goodguestreasons')
  .select('_id, name')
  .order('name');

// Verification status - from user fields
const verifications = {
  email: userData['is email confirmed'],
  phone: userData['Verify - Phone'],
  govId: userData['user verified?'],
  linkedin: !!userData['Verify - Linked In ID']
};
```

---

## 4. Component Specifications

### 4.1 AccountProfilePage.jsx (Main Component)

**Purpose:** Hollow page component that determines view mode and renders appropriate view

**Props:** None (reads from URL)

**Structure:**
```jsx
<div className="account-profile-page">
  <Header />
  <main className="account-profile-container">
    <ProfileSidebar {...sidebarProps} />
    <div className="account-profile-feed">
      {isEditorView ? <EditorView /> : <PublicView />}
    </div>
  </main>
  {isEditorView && <FixedSaveBar />}
  <Footer />
</div>
```

**CSS Specifications:**
```css
.account-profile-page {
  min-height: 100vh;
  background-color: var(--sl-bg-body);
}

.account-profile-container {
  max-width: 1160px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 32px;
  padding-top: 112px; /* Below header */
}

@media (max-width: 900px) {
  .account-profile-container {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 24px;
  }
}
```

### 4.2 ProfileSidebar.jsx

**Purpose:** Sticky sidebar with cover photo, avatar, profile info, and verification status

**Props:**
```typescript
interface ProfileSidebarProps {
  isEditorView: boolean;
  coverPhotoUrl: string | null;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  jobTitle: string;
  profileStrength: number; // 0-100
  verifications: {
    email: boolean;
    phone: boolean;
    govId: boolean;
    linkedin: boolean;
  };
  responseTime?: string; // Public view only
  responseRate?: number; // Public view only
  memberSince?: string;  // Public view only - ISO date
  nextActions?: NextAction[]; // Editor view only
  onCoverPhotoChange?: (file: File) => void;
  onAvatarChange?: (file: File) => void;
}
```

**Visual Specifications:**

**Container:**
- Width: 360px
- Position: sticky
- Top: 112px
- Background: var(--sl-bg-card)
- Border-radius: var(--sl-radius-xl)
- Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
- Overflow: hidden

**Cover Photo:**
- Height: 140px
- Width: 100%
- Object-fit: cover
- Default: linear-gradient(135deg, #F3F0FF 0%, #7B4FB5 100%)
- Editor hover: overlay with camera icon + text

**Avatar:**
- Size: 120px
- Border: 4px solid white
- Border-radius: 50%
- Position: absolute, centered horizontally
- Transform: translateY(-60px)
- Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)

**Avatar Badge (Editor):**
- Size: 36px
- Background: var(--sl-primary)
- Position: absolute, bottom: 4px, right: 4px
- Icon: Camera (white, 18px)
- Cursor: pointer

**Avatar Badge (Public - Verified):**
- Size: 28px
- Background: var(--sl-success)
- Position: absolute, bottom: 4px, right: 4px
- Icon: Check (white, 16px)

**Name Section:**
- Padding-top: 70px (for avatar overlap)
- Text-align: center
- Name: DM Sans, 24px, weight 700, var(--sl-text-main)
- Job Title: Inter, 14px, weight 400, var(--sl-text-secondary)

**Profile Strength (Editor):**
- Margin-top: 20px
- Padding: 0 24px
- Label: 12px, weight 500, var(--sl-text-tertiary), uppercase
- Progress bar: 8px height, 100% width, border-radius 4px
- Track: var(--sl-border-subtle)
- Fill: var(--sl-primary)
- Percentage: 14px, weight 600, var(--sl-primary)

**Stats Grid (Public):**
- Display: grid
- Grid: 2x2
- Gap: 16px
- Padding: 20px 24px
- Border-top: 1px solid var(--sl-border-subtle)
- Value: 20px, weight 600, var(--sl-text-main)
- Label: 12px, var(--sl-text-tertiary)

**Verification List (Public):**
- Padding: 16px 24px
- Border-top: 1px solid var(--sl-border-subtle)
- Item: flex, align-items center, gap 8px
- Icon: 16px, var(--sl-success) if verified, var(--sl-text-tertiary) if not
- Text: 14px, var(--sl-text-main)

**Next Actions (Editor):**
- Padding: 16px 24px
- Title: 14px, weight 600, margin-bottom 12px
- Gap between cards: 8px

### 4.3 ProfileCard.jsx (Shared Card Wrapper)

**Purpose:** Consistent card styling for all content cards

**Props:**
```typescript
interface ProfileCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode; // Optional edit button for public view
}
```

**Visual Specifications:**
- Background: var(--sl-bg-card)
- Border-radius: var(--sl-radius-lg)
- Box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)
- Padding: 24px
- Header margin-bottom: 16px
- Title: 18px, weight 600, var(--sl-text-main)

### 4.4 BasicInfoCard.jsx

**Purpose:** First name, last name, job title inputs (editor) or display (public)

**Editor View Fields:**
- First Name: text input
- Last Name: text input
- Job Title: text input

**Input Specifications:**
- Height: 44px
- Padding: 12px 16px
- Border: 1px solid var(--sl-border-subtle)
- Border-radius: 8px
- Font: 14px, var(--sl-text-main)
- Focus: border-color var(--sl-primary), box-shadow 0 0 0 3px var(--sl-primary-soft)
- Label: 14px, weight 500, margin-bottom 6px

**Public View:**
- Name displayed in sidebar
- This card not shown in public view

### 4.5 DaySelectorPills.jsx

**Purpose:** Day selection pills for schedule (works in both interactive and read-only modes)

**Props:**
```typescript
interface DaySelectorPillsProps {
  selectedDays: number[]; // 0-indexed (0=Sun, 1=Mon, ...)
  onChange?: (days: number[]) => void; // null/undefined for readonly
  readOnly?: boolean;
  className?: string;
}
```

**Visual Specifications:**

**Container:**
- Display: flex
- Gap: 8px
- Flex-wrap: wrap

**Pill (Unselected):**
- Height: 36px
- Padding: 0 16px
- Background: var(--sl-bg-body)
- Border: 1px solid var(--sl-border-subtle)
- Border-radius: 18px
- Font: 14px, weight 500, var(--sl-text-secondary)
- Cursor: pointer (interactive) / default (readonly)

**Pill (Selected):**
- Background: var(--sl-primary)
- Border-color: var(--sl-primary)
- Color: white

**Pill (Hover - Interactive only):**
- Border-color: var(--sl-primary)

**Day Labels:**
- Sun, Mon, Tue, Wed, Thu, Fri, Sat

### 4.6 SelectableChip.jsx

**Purpose:** Selectable tag chips for reasons and storage items

**Props:**
```typescript
interface SelectableChipProps {
  label: string;
  selected: boolean;
  onChange?: (selected: boolean) => void;
  readOnly?: boolean;
  variant?: 'default' | 'success'; // success = green for "reasons to host"
}
```

**Visual Specifications:**

**Chip (Unselected):**
- Height: 32px
- Padding: 0 12px
- Background: var(--sl-bg-body)
- Border: 1px solid var(--sl-border-subtle)
- Border-radius: 16px
- Font: 13px, weight 500, var(--sl-text-secondary)
- Display: inline-flex
- Align-items: center

**Chip (Selected - Default):**
- Background: var(--sl-primary-soft)
- Border-color: var(--sl-primary)
- Color: var(--sl-primary)

**Chip (Selected - Success/Green):**
- Background: var(--sl-success-bg)
- Border-color: var(--sl-success)
- Color: var(--sl-success)

### 4.7 TrustVerificationCard.jsx

**Purpose:** Email, phone, gov ID, LinkedIn verification status with action buttons

**Editor View:**
- Each item shows status (Verified/Unverified) and action button
- Email: "Verify" button if unverified
- Phone: "Verify" + "Edit" buttons
- Gov ID: "Verify" button if unverified
- LinkedIn: "Connect" button if unconnected

**Public View:**
- Compact list with check icons for verified items
- Non-verified items not shown or shown with X icon

**Visual Specifications:**

**Item Row:**
- Display: flex
- Align-items: center
- Justify-content: space-between
- Padding: 16px
- Border-bottom: 1px solid var(--sl-border-subtle)
- Last-child: no border

**Icon Container:**
- Width: 48px
- Height: 48px
- Background: var(--sl-primary-soft)
- Border-radius: 50%
- Display: flex
- Align-items: center
- Justify-content: center
- Icon size: 24px

**Status Badge (Verified):**
- Color: var(--sl-success)
- Font: 13px, weight 500
- Icon: Check circle

**Verify Button:**
- Height: 36px
- Padding: 0 20px
- Background: var(--sl-primary)
- Color: white
- Border-radius: 18px
- Font: 14px, weight 500

**Edit Button:**
- Height: 32px
- Padding: 0 16px
- Background: transparent
- Border: 1px solid var(--sl-primary)
- Color: var(--sl-primary)
- Border-radius: 16px
- Font: 13px

### 4.8 FixedSaveBar.jsx

**Purpose:** Fixed bottom bar with "Preview Public Profile" and "Save Changes" buttons

**Visual Specifications:**
- Position: fixed
- Bottom: 0
- Left: 0
- Right: 0
- Background: white
- Box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1)
- Padding: 16px 24px
- Display: flex
- Justify-content: center
- Gap: 16px
- Z-index: 1000

**Preview Button:**
- Height: 44px
- Padding: 0 24px
- Background: transparent
- Border: 1px solid var(--sl-primary)
- Color: var(--sl-primary)
- Border-radius: 8px
- Font: 15px, weight 500

**Save Button:**
- Height: 44px
- Padding: 0 32px
- Background: var(--sl-primary)
- Color: white
- Border-radius: 8px
- Font: 15px, weight 600
- Disabled state: opacity 0.5, cursor not-allowed

---

## 5. Layout & Composition

### Page Structure

```
+--------------------------------------------------+
|                    Header                         |
+--------------------------------------------------+
|                                                  |
|  +-----------+  +---------------------------+    |
|  |           |  |                           |    |
|  |  Sidebar  |  |        Main Feed          |    |
|  |  (360px)  |  |          (1fr)            |    |
|  |           |  |                           |    |
|  | - Cover   |  | [Card] Basic Information  |    |
|  | - Avatar  |  | [Card] About You          |    |
|  | - Name    |  | [Card] Why Split Lease?   |    |
|  | - Title   |  | [Card] Your Requirements  |    |
|  | - Meter   |  | [Card] Schedule & Commute |    |
|  | - Actions |  | [Card] Trust & Verify     |    |
|  |           |  | [Card] Reasons to Host    |    |
|  +-----------+  | [Card] Storage Items      |    |
|    (sticky)     | [Card] Video Intro        |    |
|                 | [Card] Account Settings   |    |
|                 +---------------------------+    |
|                                                  |
+--------------------------------------------------+
|              Fixed Save Bar (Editor only)        |
+--------------------------------------------------+
|                    Footer                         |
+--------------------------------------------------+
```

### Z-Index Layering

| Element | Z-Index |
|---------|---------|
| Base page | 0 |
| Sidebar (sticky) | 10 |
| Fixed Save Bar | 100 |
| Modals | 1000 |
| Toast notifications | 1100 |

### Responsive Breakpoints

**Desktop (> 900px):**
- Two-column grid (360px + 1fr)
- Sidebar sticky
- Full horizontal cards

**Tablet/Mobile (< 900px):**
- Single column
- Sidebar not sticky
- Full-width cards
- Reduced padding

---

## 6. Interactions & Animations

### Form Interactions

**Real-time Sidebar Update:**
- When first name, last name, or job title changes
- Debounce: 300ms
- Sidebar name/title updates immediately (optimistic)

**Profile Strength Calculation:**
- Recalculated on field changes
- Fields contributing to strength:
  - Profile photo: +20%
  - Bio: +15%
  - First name + Last name: +10%
  - Job title: +5%
  - Email verified: +10%
  - Phone verified: +10%
  - Gov ID verified: +15%
  - LinkedIn connected: +15%

### Animations

**Card Hover (Editor):**
- Transform: translateY(-2px)
- Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1)
- Transition: all 0.2s ease

**Button Hover:**
- Opacity: 0.9
- Transition: opacity 0.15s ease

**Progress Bar Fill:**
- Width transition: 0.3s ease-out

**Toast Notification:**
- Enter: slide in from right (300ms)
- Exit: slide out to right (200ms)

**Save Success:**
- Button shows checkmark briefly (1.5s)
- Then returns to "Save Changes"

---

## 7. Assets Required

### Icons Needed (Lucide React)

| Icon | Use |
|------|-----|
| Camera | Avatar edit, cover photo edit |
| Check | Verified badge, chip selected |
| CheckCircle | Verification confirmed |
| XCircle | Verification missing |
| Mail | Email verification |
| Phone | Phone verification |
| ShieldCheck | Gov ID verification |
| Linkedin | LinkedIn connect |
| Calendar | Days selector, member since |
| Car | Transportation dropdown |
| Plus | Add action |
| AlertCircle | Profile improvement hints |
| User | Default avatar |
| Edit | Edit buttons |
| ExternalLink | Preview profile |
| Save | Save button |

### Images

- Default cover gradient (CSS)
- Default avatar placeholder (existing `/assets/images/default-avatar.png`)

---

## 8. Implementation Sequence

### Phase 1: Foundation (2-3 hours)
1. Create `AccountProfilePage` directory structure
2. Implement `useAccountProfilePageLogic.js` hook with:
   - User ID extraction from URL
   - Auth check and view mode determination
   - Profile data fetching
   - Form state management
3. Create basic `AccountProfilePage.jsx` shell
4. Add CSS variables and base styles

### Phase 2: Sidebar (2-3 hours)
1. Implement `ProfileSidebar.jsx`
2. Create `CoverPhotoEditor.jsx` (editor mode)
3. Create `AvatarWithBadge.jsx` (editor + public modes)
4. Create `ProfileStrengthMeter.jsx`
5. Create `NextActionCard.jsx`
6. Style responsive behavior

### Phase 3: Shared Components (2-3 hours)
1. Create `ProfileCard.jsx` wrapper
2. Create `DaySelectorPills.jsx` with interactive/readonly modes
3. Create `SelectableChip.jsx` with variants
4. Style all shared components

### Phase 4: Editor View Cards (3-4 hours)
1. Implement `BasicInfoCard.jsx`
2. Implement `AboutCard.jsx`
3. Implement `RequirementsCard.jsx`
4. Implement `ScheduleCommuteCard.jsx`
5. Implement `TrustVerificationCard.jsx`
6. Implement `ReasonsCard.jsx`
7. Implement `StorageItemsCard.jsx`
8. Implement `VideoIntroCard.jsx` (placeholder)
9. Implement `AccountSettingsCard.jsx`

### Phase 5: Public View (2 hours)
1. Create `PublicView.jsx` wrapper
2. Adapt cards for read-only display
3. Add stats section to sidebar
4. Add member since date

### Phase 6: Save Flow & Polish (2-3 hours)
1. Implement `FixedSaveBar.jsx`
2. Add form validation
3. Implement save API call
4. Add toast notifications
5. Test all interactions
6. Responsive testing

### Phase 7: Migration (1-2 hours)
1. Update `account-profile.jsx` entry point
2. Simplify `account-profile.html`
3. Test routing with user ID
4. Test auth redirect

---

## 9. Assumptions & Clarifications Needed

### Assumptions Made [SUGGESTED]

1. **Profile Strength Algorithm** - Assumed percentage contributions based on typical profile completeness patterns. May need adjustment based on product requirements.

2. **Response Time/Rate** - Assumed these stats exist in user data or can be calculated from proposal response history.

3. **Video Upload** - Assumed placeholder dropzone only; actual upload to be implemented separately.

4. **LinkedIn OAuth** - Assumed existing flow works; just need to trigger it.

5. **Day Indexing** - Assumed 0-indexed (JavaScript standard) for internal use, converting at API boundaries per existing pattern.

### Clarifications Needed [NEEDS CLARIFICATION]

1. **Profile Photo Storage** - Should cover photos and avatars be stored in Supabase Storage or existing Bubble-linked storage?

2. **Notification Settings** - Should clicking "Notification Settings" open the existing modal or navigate to a new page?

3. **Password Change** - Should this open a modal or redirect to reset-password page?

4. **Video Player** - For public view, should this be a native video player or embedded (YouTube/Vimeo)?

5. **Response Time Calculation** - Is there existing logic to calculate average response time, or should this field be manual?

6. **Next Actions Priority** - What order should profile improvement suggestions appear in?

---

## 10. Files Referenced in This Plan

### Existing Files to Study

| File | Relevance |
|------|-----------|
| `app/src/account-profile.jsx` | Current implementation to replace |
| `app/public/account-profile.html` | Current HTML + inline JS |
| `app/src/islands/pages/useViewSplitLeasePageLogic.js` | Hollow component pattern reference |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | Day selector pattern reference |
| `app/src/islands/shared/Button.jsx` | Existing button component |
| `app/src/lib/auth.js` | Auth utilities (getSessionId, checkAuthStatus) |
| `app/src/lib/supabase.js` | Supabase client |
| `app/src/islands/modals/NotificationSettingsModal.jsx` | Existing modal to reuse |
| `app/src/islands/modals/EditPhoneNumberModal.jsx` | Existing modal to reuse |
| `app/src/routes.config.js` | Route configuration |

### New Files to Create

```
app/src/islands/pages/AccountProfilePage/
  AccountProfilePage.jsx
  useAccountProfilePageLogic.js
  AccountProfilePage.css
  components/
    ProfileSidebar.jsx
    EditorView.jsx
    PublicView.jsx
    cards/
      BasicInfoCard.jsx
      AboutCard.jsx
      RequirementsCard.jsx
      ScheduleCommuteCard.jsx
      TrustVerificationCard.jsx
      ReasonsCard.jsx
      StorageItemsCard.jsx
      VideoIntroCard.jsx
      AccountSettingsCard.jsx
    shared/
      ProfileCard.jsx
      DaySelectorPills.jsx
      SelectableChip.jsx
      CoverPhotoEditor.jsx
      AvatarWithBadge.jsx
      ProfileStrengthMeter.jsx
      NextActionCard.jsx
      FixedSaveBar.jsx
```

---

**Plan Created:** 2025-12-12T14:35:00
**Author:** Design Implementation Planner
**Status:** Ready for Execution
