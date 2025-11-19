# Guest Proposals Page - Bubble vs Codebase Comparison Report

**Date:** November 19, 2025
**Tester:** Automated Browser Testing via Playwright MCP
**Bubble URL:** https://app.split.lease/guest-proposals
**Codebase URL:** http://localhost:5174/guest-proposals

---

## Executive Summary

The codebase version of the guest-proposals page has implemented most core functionality but is **missing several key features and has notable UI/UX differences** compared to the Bubble production version. The most significant gaps are in the action buttons, proposal details modal, pricing display, and overall visual polish.

---

## 1. HEADER & NAVIGATION

### Bubble Version
- **Proposal Count Display:** "My Proposals (6)" - shows total count
- **Proposal Selector:** Dropdown (combobox) showing:
  - Host name - Property title format
  - Example: "Sharath - Spacious Flatiron 3BR Condo with Doorman, Full Kitchen, Laundry, and Outdoor Space"
  - Lists 6 different proposals
- **Status Badge:** Prominent status badge showing "Proposal Accepted! Split Lease is Drafting Lease Documents"
- **User Display:** Shows "Leasesharath" in top navigation

### Codebase Version
- **Proposal Count Display:** "My Proposals (2)" - shows total count
- **Proposal Selector:** Button/dropdown showing:
  - Host name - Property title format in header
  - Dropdown items show: "Host - Property" + Status + Creation date
  - Example: "Host - Property Proposal or Counteroffer Accepted / Drafting Lease Documents • Created 9/12/2025"
  - Lists only 2 proposals
- **Status Badge:** ❌ **MISSING** - No prominent status badge at top
- **User Display:** Shows "Leasesharath" in top navigation ✅

### Key Differences
1. ❌ **MISSING:** Top-level status badge showing current proposal stage
2. ⚠️ **DIFFERENT:** Proposal selector dropdown format (codebase shows more verbose status info)
3. ⚠️ **DIFFERENT:** Proposal count discrepancy (6 vs 2 - likely due to different test data)

---

## 2. PROPERTY INFORMATION SECTION

### Bubble Version
- **Property Title:** "Spacious Flatiron 3BR Condo with Doorman, Full Kitchen, Laundry, and Outdoor Space"
- **Location:** "Carnegie Hill, Manhattan" - clean neighborhood display
- **Action Buttons:**
  - "View Listing" ✅
  - "View Map" ✅

### Codebase Version
- **Property Title:** Same title displayed ✅
- **Property IDs:** Shows raw database IDs: "1686665230152x267314860159501250, 1607041299687x679479834266385900"
- **Location:** ❌ **MISSING** - No clean location display
- **Action Buttons:**
  - "View Listing" ✅
  - "View Map" ✅

### Key Differences
1. ❌ **MISSING:** Clean location/neighborhood display (e.g., "Carnegie Hill, Manhattan")
2. ⚠️ **BUG:** Raw database IDs are being displayed instead of being hidden
3. ✅ **WORKING:** Both action buttons present

---

## 3. RENTAL DETAILS SECTION

### Bubble Version
- **Duration Display:** "Friday thru Saturday"
- **Duration Length:** "Duration 220000000 Weeks" (appears to be a data bug in Bubble too)
- **Day Selector:** Visual day selector showing S M T W T F S
- **Check-in/Check-out:**
  - "Check-in 2:00 pm Check-out 11:00 am" - single line format
- **Move-in Date:** "Anticipated Move-in 11/21/25" - formatted date

### Codebase Version
- **Duration Display:** "Friday to Saturday" ✅ (slightly different wording)
- **Duration Length:** "Duration: 220000000 Weeks" ✅ (same data)
- **Day Selector:** Visual day selector showing S M T W T F S ✅
- **Check-in/Check-out:**
  - Separate sections showing:
    - "Check-in" / "2:00 pm"
    - "Check-out" / "11:00 am"
- **Move-in Date:** "2025-11-21T05:00:00.000Z" - ⚠️ **RAW ISO FORMAT** (not user-friendly)

### Key Differences
1. ⚠️ **BUG:** Move-in date showing raw ISO timestamp instead of formatted date
2. ⚠️ **DIFFERENT:** Check-in/check-out layout (Bubble: single line, Codebase: stacked format)
3. ✅ **WORKING:** Duration display and day selector working correctly

---

## 4. HOST INFORMATION SECTION

### Bubble Version
- **Host Image:** Profile photo displayed
- **Host Name:** "Sharath"
- **Action Buttons:**
  - "Host Profile" ✅
  - "Send a Message" ✅

### Codebase Version
- **Host Image:** Profile photo displayed with alt text "Sharath Host Sept1" ✅
- **Host Name:** "Sharath" ✅
- **Action Buttons:**
  - "Host Profile" ✅
  - "Send a Message" ✅

### Key Differences
✅ **NO MAJOR DIFFERENCES** - This section is well-implemented

---

## 5. HOUSE RULES SECTION

### Bubble Version
- **Display:** Clickable link "See House Rules"
- **Functionality:** Opens house rules in a modal/expansion

### Codebase Version
- **Display:** ❌ **MISSING** - No house rules section visible in main card

### Key Differences
1. ❌ **MISSING:** "See House Rules" link/section

---

## 6. PRICING SECTION

### Bubble Version
**Main Card:**
- "Price unavailable. Contact split Lease" (for first proposal)

**Second Proposal (Samuel):**
- Clean display: "Total $35,933.63 No maintenance fee"
- "Damage deposit $500.00"
- "$345.52 / night"

### Codebase Version
- "Total $146,975,400,000"
- "$1 / night"
- "No maintenance fee"
- "Damage deposit $500"

### Key Differences
1. ⚠️ **DIFFERENT:** Pricing format and layout
2. ⚠️ **DIFFERENT:** Missing currency formatting consistency (should be "$500.00" not "$500")
3. ⚠️ **ISSUE:** Very large total price suggests possible calculation bug

---

## 7. ACTION BUTTONS SECTION

### Bubble Version
**Proposal 1 (Sharath):**
- "Virtual Meeting Accepted" (status button)
- "Remind Split Lease"
- "See Details" ⭐ **IMPORTANT**
- "Cancel Proposal"

**Proposal 2 (Samuel):**
- "Delete Proposal"

### Codebase Version
- "Request Virtual Meeting"
- "Cancel Proposal"

### Key Differences - **CRITICAL MISSING FEATURES**
1. ❌ **MISSING:** "See Details" button - This is a major feature that opens proposal details modal
2. ❌ **MISSING:** "Remind Split Lease" button
3. ❌ **MISSING:** Status-based button states (e.g., "Virtual Meeting Accepted" vs "Request Virtual Meeting")
4. ❌ **MISSING:** "Delete Proposal" option for certain proposal states

---

## 8. PROPOSAL DETAILS MODAL (See Details)

### Bubble Version - **FULL FEATURED MODAL** ⭐
When clicking "See Details" button, opens comprehensive modal showing:

**Header:**
- Back button
- "Proposal Details" title
- Close button

**Content:**
- **Move-in:** Friday, November 21, 2025
- **Check-in:** Friday
- **Check-out:** Saturday
- **Reservation Length:** 220000000 weeks
- **House Rules:** "House Rules (click to see)" with count badge "5"
- Visual separator lines

**Pricing Breakdown:**
- **Price per night:** $1.00
- **Nights reserved:** x 220000000
- **Total Price:** $220,000,000.00 (excluding Damage Deposit & Maintenance Fee)
- **Price per 4 weeks:** $4.00
- **Refundable Damage Deposit:** $500.00
- **Maintenance Fee:** $0.00
- **Note:** "*Refundable Damage Deposit is held with Split Lease"

### Codebase Version
❌ **COMPLETELY MISSING** - No "See Details" button means no modal implementation

### Key Differences
1. ❌ **CRITICAL MISSING FEATURE:** Entire proposal details modal is not implemented
2. This modal provides crucial information consolidation for users
3. Shows pricing breakdown, house rules access, and all key dates in one view

---

## 9. VIEW MAP MODAL

### Bubble Version
**Modal Content:**
- **Header:**
  - Close button (X icon)
  - Property title: "Spacious Flatiron 3BR Condo with Doorman, Full Kitchen, Laundry, and Outdoor Space"
  - Property description preview: "Experience vibrant city living..."
  - "View Listing" button

- **Map Section:**
  - Google Maps integration with property location
  - Multiple price markers on map showing nearby properties:
    - $346, $461, $289, $330, $234
  - Full map controls (zoom, street view, fullscreen)
  - Google Maps branding and terms

- **Footer Section:**
  - **Pricing:** "$146,975,400,000.00 in total | No maintenance fee | Damage deposit $500.00"
  - **Price per night:** "$1.00 / night"
  - **Action Buttons:**
    - "Remind Split Lease"
    - "See Details"
    - "Cancel Proposal"

### Codebase Version
**Modal Content:**
- **Header:**
  - Property title and raw database IDs
  - Close button (X icon)

- **Map Section:**
  - Google Maps integration ✅
  - Single property marker (no nearby properties shown)
  - Full map controls ✅
  - **Address Display:** Shows raw JSON string:
    - `{"address": "139 MacDougal St, New York, NY 10011, USA", "lat": 40.7308819, "lng": -73.9999528}`

- **Footer Section:**
  - "Close" button
  - "Open in Google Maps" link

### Key Differences
1. ❌ **MISSING:** Property description preview in header
2. ❌ **MISSING:** "View Listing" button in modal
3. ❌ **MISSING:** Nearby property price markers on map
4. ❌ **MISSING:** Pricing summary section in footer
5. ❌ **MISSING:** Action buttons in modal footer ("Remind Split Lease", "See Details", "Cancel Proposal")
6. ⚠️ **BUG:** Address showing as raw JSON string instead of formatted text
7. ✅ **WORKING:** Basic map display and "Open in Google Maps" functionality

---

## 10. PROGRESS TRACKER

### Bubble Version
Shows 6 stages:
1. Proposal Submitted
2. Rental Application Submitted
3. Host Review Complete
4. **Drafting Lease Docs** ⬅️ Current stage (highlighted)
5. Lease Documents
6. Initial Payment

**Visual Indicators:**
- Completed stages appear to be visually distinct from pending stages
- Current stage is highlighted/emphasized

### Codebase Version
Shows 6 stages:
1. Proposal Submitted
2. Rental App Submitted
3. Host Review
4. Review Documents
5. Lease Documents
6. Initial Payment

### Key Differences
1. ⚠️ **DIFFERENT:** Stage naming inconsistencies:
   - Bubble: "Rental Application Submitted" vs Codebase: "Rental App Submitted"
   - Bubble: "Host Review Complete" vs Codebase: "Host Review"
   - Bubble: "Drafting Lease Docs" vs Codebase: "Review Documents"
2. ⚠️ **UNCLEAR:** Cannot determine if current stage highlighting is working (need to verify visually)
3. ⚠️ **DIFFERENT:** Slight variations in stage names may confuse users

---

## 11. ADDITIONAL METADATA

### Bubble Version
- Not prominently displayed in main view

### Codebase Version
- **Proposal ID:** "17576742..." (truncated)
- **Created Date:** "9/12/2025"

### Key Differences
1. ℹ️ **ADDITIONAL:** Codebase shows proposal metadata that Bubble doesn't display prominently
2. This could be useful for debugging but may not be necessary for end users

---

## 12. FOOTER SECTION

### Bubble Version
**Referral Section:**
- "Refer a friend You get $50 and they get $50 *after their first booking"
- Radio buttons: Text, Email (selected), Link
- Input field: "Your friend's email address"
- "Share now" button

**Additional Footer Content:**
- "For Guests" links section
- "Company" links section
- App download promotion
- Alexa integration promotion
- Terms of Use link
- Copyright notice

### Codebase Version
**Referral Section:**
- "Refer a friend You get $50 and they get $50 *after their first booking" ✅
- Radio buttons: Text (selected), Email ✅
- Input field: "Your friend's phone number" (when Text selected)
- "Share now" button ✅

**Additional Footer Content:**
- "For Hosts" section ✅
- "For Guests" section ✅
- "Company" section ✅
- "Import your listing from another site" section ℹ️ (extra feature)
- App download promotion ✅
- Alexa integration promotion ✅
- Terms of Use link ✅
- Copyright notice: "Made with love in New York City © 2025 SplitLease" ✅

### Key Differences
1. ✅ **WELL IMPLEMENTED:** Footer is comprehensive and matches most Bubble features
2. ℹ️ **ADDITIONAL:** "Import your listing" section not in Bubble version
3. ⚠️ **MINOR:** Some link differences in sections

---

## 13. CONSOLE ERRORS & WARNINGS

### Bubble Version
**Errors:**
- Multiple "ResizeObserver loop completed with undelivered notifications" (cosmetic, can be ignored)
- "bubble_fn_checksContiguityListing is not defined" (Bubble internal error)
- Script errors related to custom HTML elements
- Multiple pixels conflict warning (Meta Pixel)

**Warnings:**
- Google Maps API loaded without async warning
- Google Maps Marker deprecation notice

### Codebase Version
**Errors:**
- Failed to load: `split-lease-purple-circle.png` (404)
- Failed to load: `logo.png` (404)

**Warnings:**
- LoadScript performance warning (Google Maps reloading)
- Google Maps Marker deprecation notice (same as Bubble)

### Key Differences
1. ⚠️ **MISSING ASSETS:** Two image files returning 404 errors
2. ⚠️ **PERFORMANCE:** Google Maps LoadScript warning about array prop reloading
3. ✅ **CLEANER:** Fewer JavaScript errors overall compared to Bubble

---

## SUMMARY OF MISSING FEATURES (Prioritized)

### 🔴 **CRITICAL - High Priority**

1. **"See Details" Button & Proposal Details Modal**
   - Complete modal missing with pricing breakdown, house rules, and date summary
   - This is a major user-facing feature

2. **Status Badge at Top**
   - Missing prominent status indicator showing current proposal stage
   - Example: "Proposal Accepted! Split Lease is Drafting Lease Documents"

3. **House Rules Section**
   - No "See House Rules" link in main card
   - No access to house rules in modal

### 🟡 **IMPORTANT - Medium Priority**

4. **"Remind Split Lease" Button**
   - Action button missing from main card and map modal

5. **Clean Location Display**
   - Missing neighborhood/location format (e.g., "Carnegie Hill, Manhattan")

6. **Map Modal Enhancements**
   - Missing property description preview
   - Missing "View Listing" button in modal
   - Missing nearby property price markers
   - Missing pricing summary in footer
   - Missing action buttons in footer

7. **Status-Based Action Buttons**
   - Buttons should change based on proposal state
   - Example: "Virtual Meeting Accepted" vs "Request Virtual Meeting"
   - Missing "Delete Proposal" option for certain states

### 🟢 **MINOR - Low Priority**

8. **Formatting Issues**
   - Move-in date showing raw ISO format instead of formatted date
   - Address in map modal showing raw JSON
   - Property IDs being displayed (should be hidden)
   - Currency formatting inconsistencies

9. **Progress Tracker Stage Names**
   - Inconsistent naming between Bubble and codebase versions

10. **Missing Image Assets**
    - `split-lease-purple-circle.png` (404)
    - `logo.png` (404)

---

## RECOMMENDED ACTION ITEMS

### Phase 1: Critical Features (Must Have)
1. Implement "See Details" button and full Proposal Details Modal
2. Add status badge component at top of page
3. Implement "See House Rules" section/link
4. Fix date formatting (move-in date, created date)
5. Hide raw database IDs from display

### Phase 2: Important Enhancements (Should Have)
1. Add "Remind Split Lease" button functionality
2. Implement clean location/neighborhood display
3. Enhance Map Modal with:
   - Property description
   - Pricing summary footer
   - Action buttons
   - Format address display properly
4. Implement status-based action button states
5. Add nearby property markers on map

### Phase 3: Polish & Refinement (Nice to Have)
1. Standardize progress tracker stage names
2. Fix missing image assets (404 errors)
3. Improve currency formatting consistency
4. Address Google Maps performance warning
5. Review and align all UI/UX differences

---

## CONCLUSION

The codebase version has implemented **approximately 60-70% of the Bubble version's functionality**. The core proposal viewing experience works, but several key user-facing features are missing, particularly:

1. **Proposal Details Modal** (critical user feature)
2. **Status indicators and badges**
3. **House rules access**
4. **Enhanced map modal features**
5. **Various action buttons and state-based UI**

The good news is that the foundation is solid - the main proposal card structure, navigation, host information, and footer are well-implemented. The missing features are primarily additional layers of functionality that need to be added on top of the existing structure.

**Estimated Completion:** The codebase needs approximately 30-40% more work to achieve feature parity with the Bubble version, focusing primarily on modals, action buttons, and data formatting improvements.
