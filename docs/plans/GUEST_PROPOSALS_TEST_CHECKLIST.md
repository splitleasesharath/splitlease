# Guest Proposals Page - Test Checklist

**Created**: 2025-11-29
**Related Plan**: `GUEST_PROPOSALS_IMPLEMENTATION_PLAN.md`
**Purpose**: Comprehensive verification of implementation success

---

## Test Categories

- [Infrastructure](#1-infrastructure-tests)
- [Authentication](#2-authentication-tests)
- [Data Loading](#3-data-loading-tests)
- [Component Rendering](#4-component-rendering-tests)
- [Proposal Card Tests](#5-proposal-card-tests)
- [Modal Tests](#6-modal-tests)
- [Workflow Tests](#7-workflow-tests)
- [Virtual Meeting Tests](#8-virtual-meeting-tests)
- [Navigation Tests](#9-navigation-tests)
- [Responsive Design](#10-responsive-design-tests)
- [Build & Deploy](#11-build--deploy-tests)
- [Edge Cases](#12-edge-case-tests)

---

## 1. Infrastructure Tests

### 1.1 Development Server Routing

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1.1.1 | Clean URL works | Navigate to `http://localhost:5173/guest-proposals` | Page loads without 404 | [ ] |
| 1.1.2 | URL with user ID | Navigate to `/guest-proposals/USER_ID` | Page loads, extracts user ID | [ ] |
| 1.1.3 | Query parameter | Navigate to `/guest-proposals?proposal=PROP_ID` | Page loads, selects proposal | [ ] |
| 1.1.4 | Legacy .html URL | Navigate to `/guest-proposals.html` | Redirects/rewrites correctly | [ ] |
| 1.1.5 | 404 fallback | Navigate to `/guest-proposals/invalid/path/deep` | Handles gracefully | [ ] |

### 1.2 File Structure

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1.2.1 | HTML entry exists | Check `app/public/guest-proposals.html` | File exists with correct structure | [ ] |
| 1.2.2 | Entry point exists | Check `app/src/guest-proposals.jsx` | File exists, imports correctly | [ ] |
| 1.2.3 | Page component exists | Check `app/src/islands/pages/GuestProposalsPage.jsx` | File exists | [ ] |
| 1.2.4 | Logic hook exists | Check `app/src/islands/pages/useGuestProposalsPageLogic.js` | File exists | [ ] |
| 1.2.5 | Proposals dir exists | Check `app/src/islands/proposals/` | Directory exists with all components | [ ] |

### 1.3 Vite Configuration

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 1.3.1 | Dev server middleware | Start dev server, check console | No routing errors | [ ] |
| 1.3.2 | Build input configured | Run `npm run build` | `guest-proposals` in output | [ ] |
| 1.3.3 | HTML moved to root | Check `dist/guest-proposals.html` | File in dist root | [ ] |
| 1.3.4 | Internal file created | Check `dist/_internal/guest-proposals-view` | File exists | [ ] |

---

## 2. Authentication Tests

### 2.1 Auth Flow

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 2.1.1 | Unauthenticated redirect | Visit `/guest-proposals` while logged out | Redirect to login or show auth modal | [ ] |
| 2.1.2 | Authenticated access | Visit while logged in | Page loads with user data | [ ] |
| 2.1.3 | Token validation | Visit with expired token | Re-authenticate or redirect | [ ] |
| 2.1.4 | User ID extraction | Visit `/guest-proposals` | Current user's ID used | [ ] |
| 2.1.5 | Different user ID | Visit `/guest-proposals/OTHER_ID` | Shows appropriate response | [ ] |

### 2.2 Auth State UI

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 2.2.1 | Header shows user | Check header component | Logged-in avatar visible | [ ] |
| 2.2.2 | Logout works | Click logout in header | Redirects to home/login | [ ] |

---

## 3. Data Loading Tests

### 3.1 User Data

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.1.1 | User fetch success | Load page | User data loaded | [ ] |
| 3.1.2 | User not found | Use invalid user ID | Error state shown | [ ] |
| 3.1.3 | Proposals List parsed | Check user data | `Proposals List` JSONB array extracted | [ ] |

### 3.2 Proposal Data

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.2.1 | Proposals fetch | Load page with proposals | All proposals loaded | [ ] |
| 3.2.2 | No proposals | User with no proposals | Empty state shown | [ ] |
| 3.2.3 | Listing enrichment | Check proposal data | Listing name, location populated | [ ] |
| 3.2.4 | Host enrichment | Check proposal data | Host name, photo populated | [ ] |
| 3.2.5 | Guest enrichment | Check proposal data | Guest info populated | [ ] |
| 3.2.6 | Featured photo | Check listing data | Featured photo URL present | [ ] |
| 3.2.7 | Borough resolved | Check listing data | Borough name (not ID) shown | [ ] |
| 3.2.8 | Hood resolved | Check listing data | Neighborhood name shown | [ ] |

### 3.3 House Rules

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.3.1 | Rules fetched | Expand house rules | Names shown (not IDs) | [ ] |
| 3.3.2 | Icons displayed | Check rule items | Icons rendered | [ ] |
| 3.3.3 | Counteroffer rules | Proposal with counteroffer | Shows correct rules set | [ ] |
| 3.3.4 | Empty rules | Listing with no rules | "No rules" or hidden section | [ ] |

### 3.4 Virtual Meetings

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 3.4.1 | VM data fetched | Proposal with VM | VM data populated | [ ] |
| 3.4.2 | No VM | Proposal without VM | Shows "Request" button | [ ] |
| 3.4.3 | VM states | Test various VM states | Correct state shown | [ ] |

---

## 4. Component Rendering Tests

### 4.1 Page Layout

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.1.1 | Header renders | Load page | Header visible with nav | [ ] |
| 4.1.2 | Footer renders | Scroll to bottom | Footer visible | [ ] |
| 4.1.3 | Main content area | Check page layout | Content area correct width | [ ] |
| 4.1.4 | Page title | Check browser tab | "My Proposals | Split Lease" | [ ] |

### 4.2 Proposal Selector

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.2.1 | Dropdown renders | Check selector | Dropdown visible | [ ] |
| 4.2.2 | Options populated | Click dropdown | All proposals listed | [ ] |
| 4.2.3 | Option format | Check option text | "Listing Name - Status" format | [ ] |
| 4.2.4 | Selection works | Select proposal | Card updates | [ ] |
| 4.2.5 | URL updates | Select proposal | URL query param updates | [ ] |
| 4.2.6 | Pre-selection | Visit with `?proposal=X` | Correct proposal selected | [ ] |

### 4.3 Loading/Error States

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 4.3.1 | Loading spinner | Initial load | Spinner shown while fetching | [ ] |
| 4.3.2 | Error display | Force error | Error message shown | [ ] |
| 4.3.3 | Retry button | Error state | "Retry" button works | [ ] |
| 4.3.4 | Empty state | No proposals | Empty state with CTA | [ ] |

---

## 5. Proposal Card Tests

### 5.1 Listing Section

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 5.1.1 | Listing name | Check card | Name displayed | [ ] |
| 5.1.2 | Location | Check card | Borough, neighborhood shown | [ ] |
| 5.1.3 | View Listing button | Check card | Button visible | [ ] |
| 5.1.4 | View Map button | Check card | Button visible | [ ] |

### 5.2 Status Section

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 5.2.1 | Status banner | Check card | Banner visible | [ ] |
| 5.2.2 | Status color - Approved | Approved proposal | Green banner | [ ] |
| 5.2.3 | Status color - Pending | Pending proposal | Blue banner | [ ] |
| 5.2.4 | Status color - Rejected | Rejected proposal | Red banner | [ ] |
| 5.2.5 | Status color - Cancelled | Cancelled proposal | Red/gray banner | [ ] |
| 5.2.6 | Status label | Various statuses | Correct text shown | [ ] |

### 5.3 Schedule Section

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 5.3.1 | Weekly badges | Check schedule | S M T W T F S badges | [ ] |
| 5.3.2 | Selected days | Check badges | Selected days highlighted | [ ] |
| 5.3.3 | Check-in day | Check details | Check-in day shown | [ ] |
| 5.3.4 | Check-out day | Check details | Check-out day shown | [ ] |
| 5.3.5 | Duration | Check details | X weeks shown | [ ] |
| 5.3.6 | Nights per week | Check details | X nights/week shown | [ ] |
| 5.3.7 | Move-in range | Check details | Date range shown | [ ] |

### 5.4 Host Section

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 5.4.1 | Host photo | Check card | Avatar displayed | [ ] |
| 5.4.2 | Host name | Check card | Name shown | [ ] |
| 5.4.3 | Profile button | Check card | "View Profile" button | [ ] |
| 5.4.4 | Message button | Check card | "Send Message" button | [ ] |
| 5.4.5 | Featured photo bg | Check host section | Background image from listing | [ ] |

### 5.5 House Rules Section

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 5.5.1 | Accordion collapsed | Initial state | Rules hidden | [ ] |
| 5.5.2 | Accordion expand | Click expand | Rules visible | [ ] |
| 5.5.3 | Rule names | Expanded state | Rule names (not IDs) | [ ] |
| 5.5.4 | Rule icons | Expanded state | Icons displayed | [ ] |

### 5.6 Pricing Section

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 5.6.1 | Total price | Check pricing | Total displayed | [ ] |
| 5.6.2 | Nightly rate | Check pricing | Per night rate shown | [ ] |
| 5.6.3 | Damage deposit | Check pricing | Deposit shown | [ ] |
| 5.6.4 | Cleaning fee | Check pricing | Fee shown (if applicable) | [ ] |
| 5.6.5 | Price formatting | Check all prices | $X,XXX.XX format | [ ] |

### 5.7 Progress Tracker

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 5.7.1 | 6 stages shown | Check tracker | All stages visible | [ ] |
| 5.7.2 | Current stage | Check tracker | Current highlighted | [ ] |
| 5.7.3 | Completed stages | Check tracker | Past stages filled | [ ] |
| 5.7.4 | Pending stages | Check tracker | Future stages empty | [ ] |
| 5.7.5 | Stage names | Check labels | Correct names shown | [ ] |

### 5.8 Action Buttons

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 5.8.1 | Buttons match status | Various proposals | Correct buttons shown | [ ] |
| 5.8.2 | Cancel hidden for cancelled | Cancelled proposal | No cancel button | [ ] |
| 5.8.3 | Primary action visible | Active proposal | Primary CTA shown | [ ] |

### 5.9 Metadata Section

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 5.9.1 | Proposal ID | Check metadata | ID displayed | [ ] |
| 5.9.2 | Created date | Check metadata | Date formatted | [ ] |

---

## 6. Modal Tests

### 6.1 Compare Terms Modal

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 6.1.1 | Opens on click | Click "Compare Terms" | Modal opens | [ ] |
| 6.1.2 | Original terms | Check left column | Your proposal terms | [ ] |
| 6.1.3 | Counteroffer terms | Check right column | Host's terms | [ ] |
| 6.1.4 | Changed fields | Check highlight | Differences highlighted | [ ] |
| 6.1.5 | Accept button | Click "Accept Host's Terms" | Action triggered | [ ] |
| 6.1.6 | Decline button | Click "Decline" | Modal closes or workflow | [ ] |
| 6.1.7 | Close button | Click X | Modal closes | [ ] |
| 6.1.8 | Click outside | Click overlay | Modal closes | [ ] |

### 6.2 Modify Proposal Modal

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 6.2.1 | Opens on click | Click "Modify Proposal" | Modal opens | [ ] |
| 6.2.2 | Pre-filled values | Check form | Current values loaded | [ ] |
| 6.2.3 | Day selector | Change days | Updates correctly | [ ] |
| 6.2.4 | Duration selector | Change weeks | Updates correctly | [ ] |
| 6.2.5 | Price updates | Change inputs | Total recalculates | [ ] |
| 6.2.6 | Submit changes | Click submit | Workflow executes | [ ] |
| 6.2.7 | Validation | Submit invalid | Error shown | [ ] |

### 6.3 Cancel Proposal Modal

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 6.3.1 | Opens on click | Click "Cancel Proposal" | Modal opens | [ ] |
| 6.3.2 | Confirmation message | Check content | Warning text shown | [ ] |
| 6.3.3 | Listing preview | Check preview | Image + name shown | [ ] |
| 6.3.4 | Cancel action | Click "Yes, Cancel" | Proposal cancelled | [ ] |
| 6.3.5 | Keep proposal | Click "No, Keep" | Modal closes | [ ] |
| 6.3.6 | UI updates | After cancel | Status updated in UI | [ ] |

### 6.4 Maps Modal

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 6.4.1 | Opens on click | Click "View Map" | Modal opens | [ ] |
| 6.4.2 | Map loads | Check map area | Google Map renders | [ ] |
| 6.4.3 | Marker shown | Check map | Property marker visible | [ ] |
| 6.4.4 | Address displayed | Check footer | Address text shown | [ ] |
| 6.4.5 | Google Maps link | Click external link | Opens Google Maps | [ ] |
| 6.4.6 | Map controls | Test zoom/pan | Controls work | [ ] |

### 6.5 Host Profile Modal

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 6.5.1 | Opens on click | Click "View Profile" | Modal opens | [ ] |
| 6.5.2 | Host photo | Check content | Avatar large displayed | [ ] |
| 6.5.3 | Host name | Check content | Full name shown | [ ] |
| 6.5.4 | Verification badges | Check badges | Verified badges if applicable | [ ] |
| 6.5.5 | Bio | Check content | Bio text if available | [ ] |
| 6.5.6 | Message button | Click "Send Message" | Navigation triggered | [ ] |

---

## 7. Workflow Tests

### 7.1 Cancel Proposal Workflow

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 7.1.1 | Standard cancel | Cancel active proposal | Status → Cancelled by Guest | [ ] |
| 7.1.2 | Soft delete | After cancel | `Deleted` flag set | [ ] |
| 7.1.3 | Modified date | After cancel | `Modified Date` updated | [ ] |
| 7.1.4 | Already cancelled | Try cancel cancelled | Action blocked | [ ] |
| 7.1.5 | Already rejected | Try cancel rejected | Action blocked | [ ] |
| 7.1.6 | UI refresh | After cancel | Proposal list refreshes | [ ] |

### 7.2 Accept Counteroffer Workflow

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 7.2.1 | Accept terms | Click accept | Status updates | [ ] |
| 7.2.2 | Terms applied | After accept | hc_* values become active | [ ] |
| 7.2.3 | Progress advances | After accept | Stage moves forward | [ ] |

### 7.3 Decline Counteroffer Workflow

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 7.3.1 | Decline terms | Click decline | Workflow triggered | [ ] |
| 7.3.2 | Status update | After decline | Appropriate status set | [ ] |

---

## 8. Virtual Meeting Tests

### 8.1 Request Virtual Meeting

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 8.1.1 | Button visible | No VM exists | "Request Virtual Meeting" shown | [ ] |
| 8.1.2 | Request creates VM | Click request | VM record created | [ ] |
| 8.1.3 | State updates | After request | Shows "Awaiting response" | [ ] |
| 8.1.4 | Proposal linked | After request | `proposal.virtual meeting` set | [ ] |

### 8.2 Respond to Virtual Meeting

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 8.2.1 | Button visible | Host requested | "Respond to VM" shown | [ ] |
| 8.2.2 | Date picker | Click respond | Calendar shown | [ ] |
| 8.2.3 | Book date | Select date | VM updated with date | [ ] |

### 8.3 Virtual Meeting States

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 8.3.1 | No meeting | VM is null | "Request" button | [ ] |
| 8.3.2 | Requested by guest | VM.requested_by = guestId | "Awaiting response" | [ ] |
| 8.3.3 | Requested by host | VM.requested_by = hostId | "Respond" button | [ ] |
| 8.3.4 | Booked | VM.booked_date set | "Awaiting confirmation" | [ ] |
| 8.3.5 | Confirmed | VM.confirmed = true | "Join Meeting" with link | [ ] |
| 8.3.6 | Declined | VM.meeting_declined = true | "Request Alternative" | [ ] |

### 8.4 Virtual Meeting Section

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 8.4.1 | Section renders | Has VM | Section visible | [ ] |
| 8.4.2 | Meeting details | Confirmed VM | Date, time, link shown | [ ] |
| 8.4.3 | Calendar view | Has meeting | Calendar with event | [ ] |

---

## 9. Navigation Tests

### 9.1 Internal Navigation

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 9.1.1 | View Listing | Click button | Navigates to listing page | [ ] |
| 9.1.2 | House Manual | Activated lease | Navigates to house manual | [ ] |
| 9.1.3 | Rental Application | Awaiting app | Navigates to rental app | [ ] |
| 9.1.4 | Document Review | Docs sent | Navigates to review page | [ ] |
| 9.1.5 | Initial Payment | Payment stage | Navigates to payment page | [ ] |

### 9.2 External Navigation

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 9.2.1 | Send Message | Click button | Goes to messaging | [ ] |
| 9.2.2 | Explore Rentals | Empty state | Goes to search page | [ ] |
| 9.2.3 | Google Maps link | In maps modal | Opens external Maps | [ ] |
| 9.2.4 | VM meeting link | Confirmed VM | Opens external video | [ ] |

### 9.3 URL State

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 9.3.1 | Selection updates URL | Select proposal | `?proposal=ID` added | [ ] |
| 9.3.2 | URL loads selection | Visit with param | Correct proposal selected | [ ] |
| 9.3.3 | Browser back | Navigate then back | Previous selection restored | [ ] |

---

## 10. Responsive Design Tests

### 10.1 Desktop (1200px+)

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 10.1.1 | Layout | View on desktop | Full layout, sidebar visible | [ ] |
| 10.1.2 | Cards | Check cards | Full card layout | [ ] |
| 10.1.3 | Modals | Open modals | Centered, max-width | [ ] |

### 10.2 Tablet (768px - 1199px)

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 10.2.1 | Layout | View on tablet | Stacked layout | [ ] |
| 10.2.2 | Cards | Check cards | Adjusted card layout | [ ] |
| 10.2.3 | Modals | Open modals | Wider percentage | [ ] |

### 10.3 Mobile (< 768px)

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 10.3.1 | Layout | View on mobile | Single column | [ ] |
| 10.3.2 | Dropdown | Check selector | Full width | [ ] |
| 10.3.3 | Cards | Check cards | Stacked sections | [ ] |
| 10.3.4 | Modals | Open modals | Full screen or 95vw | [ ] |
| 10.3.5 | Touch targets | Check buttons | Min 44px tap targets | [ ] |
| 10.3.6 | Text readable | Check text | Readable font sizes | [ ] |

---

## 11. Build & Deploy Tests

### 11.1 Build

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 11.1.1 | Build succeeds | Run `npm run build` | No errors | [ ] |
| 11.1.2 | HTML output | Check `dist/` | `guest-proposals.html` exists | [ ] |
| 11.1.3 | JS bundle | Check `dist/assets/` | JS files generated | [ ] |
| 11.1.4 | CSS bundle | Check `dist/assets/` | CSS files generated | [ ] |
| 11.1.5 | Internal file | Check `dist/_internal/` | `guest-proposals-view` exists | [ ] |

### 11.2 Preview

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 11.2.1 | Preview starts | Run `npm run preview` | Server starts | [ ] |
| 11.2.2 | Page loads | Visit `/guest-proposals` | Page renders | [ ] |
| 11.2.3 | Assets load | Check network | All assets 200 | [ ] |
| 11.2.4 | No console errors | Check console | No JS errors | [ ] |

### 11.3 Deploy (Cloudflare)

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 11.3.1 | Deploy succeeds | Deploy to CF Pages | Build completes | [ ] |
| 11.3.2 | Route works | Visit production URL | Page loads | [ ] |
| 11.3.3 | Clean URL | Visit `/guest-proposals` | No redirect loop | [ ] |
| 11.3.4 | User ID route | Visit `/guest-proposals/ID` | Works correctly | [ ] |
| 11.3.5 | Query params | Visit `?proposal=X` | Selection works | [ ] |

---

## 12. Edge Case Tests

### 12.1 Data Edge Cases

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 12.1.1 | Null proposal | Missing proposal data | Graceful handling | [ ] |
| 12.1.2 | Missing listing | Proposal without listing | Shows "Unknown Listing" | [ ] |
| 12.1.3 | Missing host | Listing without host | Shows placeholder | [ ] |
| 12.1.4 | Empty days array | No days selected | Shows empty schedule | [ ] |
| 12.1.5 | Null prices | Missing price fields | Shows $0.00 or "N/A" | [ ] |
| 12.1.6 | Invalid dates | Malformed date strings | Doesn't crash | [ ] |
| 12.1.7 | Missing photos | No featured photo | Shows placeholder | [ ] |
| 12.1.8 | Long listing name | 100+ char name | Truncated properly | [ ] |

### 12.2 Status Edge Cases

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 12.2.1 | Unknown status | Status not in map | Gray badge, raw status | [ ] |
| 12.2.2 | Status with typo | Slightly different | Fallback handling | [ ] |
| 12.2.3 | Null status | Status is null | Default handling | [ ] |

### 12.3 Auth Edge Cases

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 12.3.1 | Token expires mid-use | Long session | Re-auth triggered | [ ] |
| 12.3.2 | Storage cleared | Clear localStorage | Redirect to login | [ ] |
| 12.3.3 | Concurrent tabs | Login in another tab | State syncs or handles | [ ] |

### 12.4 Network Edge Cases

| # | Test Case | Steps | Expected Result | Pass/Fail |
|---|-----------|-------|-----------------|-----------|
| 12.4.1 | Slow network | Throttle connection | Loading states shown | [ ] |
| 12.4.2 | Network error | Disconnect network | Error state shown | [ ] |
| 12.4.3 | Partial failure | One query fails | Partial data + error | [ ] |
| 12.4.4 | Timeout | Very slow response | Timeout handling | [ ] |

---

## Test Execution Log

### Test Run Information

| Field | Value |
|-------|-------|
| Tester | |
| Date | |
| Environment | Dev / Preview / Production |
| Browser | |
| Device | |

### Summary

| Category | Total | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| Infrastructure | 14 | | | |
| Authentication | 7 | | | |
| Data Loading | 17 | | | |
| Component Rendering | 12 | | | |
| Proposal Card | 30 | | | |
| Modal Tests | 26 | | | |
| Workflow Tests | 12 | | | |
| Virtual Meeting | 15 | | | |
| Navigation | 12 | | | |
| Responsive Design | 12 | | | |
| Build & Deploy | 11 | | | |
| Edge Cases | 15 | | | |
| **TOTAL** | **183** | | | |

### Issues Found

| # | Test ID | Description | Severity | Notes |
|---|---------|-------------|----------|-------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Notes

- Tests should be run in order: Infrastructure -> Auth -> Data -> Components -> Workflows
- Failed tests should be documented with screenshots when possible
- Edge case tests are particularly important for robustness
- Run full suite after each major milestone completion
