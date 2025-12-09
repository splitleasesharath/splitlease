# Listing Dashboard Page - Complete Context Documentation

**SOURCE**: Bubble.io Production App (https://app.split.lease/version-live/listing-dashboard/)
**CAPTURED**: December 4, 2025
**PURPOSE**: Reference for replicating the page in the React-based app

---

## Page Overview

The Listing Dashboard is a **host-facing page** for managing individual property listings. It displays comprehensive information about a listing and provides edit capabilities for each section.

**URL Pattern**: `/listing-dashboard/{listing_id}`
**Example**: `/listing-dashboard/1743790812920x538927313033625600`

---

## 1. HEADER / NAVIGATION BAR

### Top Navigation Bar (Sticky)
- **Logo**: Split Lease logo (links to home)
- **"All Listings" button**: Back navigation with left arrow icon
- **Tab Navigation**:
  - "Preview Listing" button
  - "Pricing/Lease Style" button
  - "Proposals" button with **badge count** (e.g., "3")
  - "Virtual Meetings" button with **badge count** (e.g., "1")
- **Right side**:
  - Notification bell icon with badge count
  - User avatar with name ("Rod")

### Alert Banner (Below nav)
- **Icon**: Purple circle with info icon
- **Text**: "Need help setting up? **Ask a Specialist Co-host!**"
- **Dismissible**: Yes (X button)

### Secondary Actions Bar
- **"Copy Listing Link"** button with link icon
- **Dropdown**: "CHOOSE A SECTION" - allows jumping to specific sections:
  - Address
  - Pricing & Lease Style
  - Details
  - Rules
  - Availability
  - Photos

---

## 2. PROPERTY INFO SECTION

### Header
- **Title**: "Property Info"
- **Edit button**: "edit" link (right-aligned)

### Content
- **Title/Description textarea** (disabled/read-only):
  - Shows listing title: "Sunny, Spacious One-Bedroom Apartment with Modern Finishes and City Views in Downtown Harlem, Featuring Doorman, Laundry Room, and Common Outdoor Space"
- **Import reviews link**: Icon + "Import reviews from other sites"

### Listing Details
- **Address**: "157 E 115th St, New York, NY 10029, USA"
- **Neighborhood**: "East Harlem"
- **Status**: "Listing In Split Lease Review" (or "Listing is online/offline")
- **Created date**: "Listing was created on: Apr 4, 2025"

---

## 3. AMENITIES SECTION

### Header
- **Title**: "Amenities"
- **Edit button**: "edit" link

### Content - Two Columns

#### In-unit Amenities
Grid of amenities with icons:
- Air Conditioned
- Closet
- Hangers
- Towels and Linens
- TV
- WiFi

#### Building / Neighborhood Amenities
Grid of amenities with icons:
- Doorman
- Laundry Room
- Package Room
- Elevator
- Common Outdoor Space
- Bike Storage

---

## 4. DESCRIPTION SECTIONS

### Description of Lodging
- **Header**: "Description of Lodging" + "edit" link
- **Content**: Multi-paragraph text describing the property
  - Example: "Sunny and spacious two-bedroom haven nestled in the vibrant heart of downtown! This stunning apartment boasts an open-concept living area..."

### Neighborhood Description
- **Header**: "Neighborhood Description" + "edit" link
- **Content**: Multi-paragraph text describing the neighborhood
  - Example: "Nestled within a vibrant community, this neighborhood offers a delightful blend of urban convenience and suburban serenity..."

---

## 5. PRICING AND LEASE STYLE SECTION

### Header
- **Title**: "Pricing and Lease Style"
- **Edit button**: "edit" link

### Content - Two Columns

#### Left Column - Lease Style Info
- **Selected Lease Style**: "Nightly"
- **Nights / Week**: "2 to 7"
- **Day Selector** (visual week display):
  - S M T W T F S buttons
  - Legend: "Available" indicator
  - Text: "All nights available"

#### Right Column - Pricing Info
- **Occupancy Compensation per Week**:
  - @2 nights/wk: $700
  - @3 nights/wk: $525
  - @4 nights/wk: $700
  - @5 nights/wk: $875
  - @6 nights/wk: $1,050
  - @7 nights/wk: $1,225

- **Additional Charges**:
  - Damage Deposit: $500
  - Maintenance Fee: $250

---

## 6. RULES SECTION

### Header
- **Title**: "Rules"
- **Edit button**: "edit" link

### Content - Grid Layout

#### House Rules (with icons)
- Take Out Trash
- No Food In Sink
- Lock Doors
- Wash Your Dishes
- No Smoking Inside
- No Candles

#### Guest Restrictions
- Gender Preferred: Female (with icon)
- 2 max guests allowed (with icon)

---

## 7. DETAILS SECTION

### Header
- **Title**: "Details"
- **Edit button**: "edit" link

### Content

#### Property Specs
- **Type of Space**: "Entire Place"
- **Bedrooms**: 1 bedrooms (with bed icon)
- **Bathrooms**: 1 bathrooms (with bath icon)
- **Size**: 200 sq.ft. (with size icon)

#### Additional Details (with icons)
- Storage: "In a locked closet"
- Parking: "Street Parking"
- Kitchen: "Kitchenette"

#### Safety Features
Grid with icons:
- Smoke Detector
- Carbon Monoxide Detector
- First Aid Kit
- Fire Sprinklers
- Lock on Bedroom Door
- Fire Extinguisher

---

## 8. CANCELLATION POLICY SECTION

### Header
- **Title**: "Cancellation Policy"

### Content
- **Dropdown selector** with options:
  - Standard (selected)
  - Additional Host Restrictions
- **Link**: "Standard Policy" (links to cancellation policy page)

---

## 9. LISTING AVAILABILITY SECTION (First)

### Header
- **Title**: "Listing Availability"

### Content

#### Lease Term
- **Label**: "What is the ideal Lease Term? (Enter between 6 and 52 weeks.)"
- **Inputs**: Two number inputs with dash between (e.g., "6" - "52")

#### Earliest Available Date
- **Label**: "What is the earliest date someone could rent from you?"
- **Date Picker**: Calendar input showing selected date (e.g., "12/05/2025")

#### Check In/Out Times
- **Check In Time**: Dropdown (1:00 pm, 2:00 pm, 3:00 pm, 4:00 pm)
- **Check Out Time**: Dropdown (10:00 am, 11:00 am, 12:00 pm, 1:00 pm)

---

## 10. LISTING AVAILABILITY SECTION (Calendar)

### Header
- **Title**: "Listing Availability"

### Content

#### Left Side - Instructions
- **Text**: "Add or remove blocked dates by selecting a range or individual days."
- **Toggle**: Radio buttons - "Range" / "Individual dates"
- **Info Display**:
  - "Nights Available per week"
  - "Dates Blocked by You" - "You don't have any future date blocked yet"

#### Right Side - Calendar
- **Month Navigation**: Left/Right arrows + Month/Year dropdown
- **Week Headers**: Sun, Mon, Tue, Wed, Thu, Fri, Sat
- **Calendar Grid**: Clickable date cells

#### Legend
- **M** Restricted Weekly (orange)
- **M** Blocked Manually (red/blocked)
- **M** Available (green)
- **M** First Available (special indicator)

---

## 11. PHOTOS SECTION

### Header
- **Title**: "Photos"
- **Add button**: "Add Photos" button (purple)

### Content - Photo Grid
6 photos displayed in a 3x2 grid:

Each photo card has:
- **Image thumbnail**
- **Cover Photo badge** (only on first photo)
- **Star icon** (to set as cover)
- **Delete button** (trash icon)
- **Photo Type dropdown**:
  - Dining Room
  - Bathroom
  - Bedroom
  - Kitchen
  - Living Room
  - Workspace
  - Other

---

## 12. VIRTUAL TOUR SECTION

### Header
- **Title**: "Virtual Tour"
- **Upload button**: "Upload Virtual Tour" button (purple)

---

## 13. FOOTER

Standard Split Lease footer with:

### Columns
1. **For Hosts**
   - List Property Now
   - How to List
   - Legal Section
   - House Manual
   - View FAQ

2. **Company**
   - About Periodic Tenancy
   - About the Team
   - Careers at Split Lease
   - View Blog
   - Emergency assistance (button)

3. **Refer a Friend**
   - Text: "You get $50 and they get $50 *after their first booking"
   - Toggle: Text / Email / Link
   - Input field + "Share now" button

4. **Import Listing**
   - Text: "Import your listing from another site"
   - URL input
   - Email input (pre-filled with user email)
   - Submit button

### App Download Section
- iPhone mockup with app
- "Now you can change your nights on the go."
- App Store download button

- Alexa device image
- "Voice-controlled concierge, at your service."
- Amazon button
- "Alexa, enable Split Lease"

### Bottom Bar
- Terms of Use link
- "Made with love in New York City"
- "© 2025 SplitLease"

---

## DATA FIELDS REFERENCE

### Listing Object Fields Used
```javascript
{
  id: string,                    // Listing ID
  title: string,                 // Property title/headline
  description: string,           // Description of lodging
  neighborhoodDescription: string,

  // Location
  address: string,               // Full street address
  neighborhood: string,          // e.g., "East Harlem"

  // Status
  status: string,                // "In Review", "Online", "Offline"
  createdDate: Date,
  isOnline: boolean,

  // Property Details
  typeOfSpace: string,           // "Entire Place", "Private Room", etc.
  bedrooms: number,
  bathrooms: number,
  squareFeet: number,
  storageType: string,           // "In a locked closet", etc.
  parkingType: string,           // "Street Parking", etc.
  kitchenType: string,           // "Full Kitchen", "Kitchenette", etc.

  // Amenities (arrays)
  inUnitAmenities: string[],     // ["Air Conditioned", "WiFi", ...]
  buildingAmenities: string[],   // ["Doorman", "Elevator", ...]
  safetyFeatures: string[],      // ["Smoke Detector", ...]

  // Rules
  houseRules: string[],          // ["No Smoking", "No Candles", ...]
  genderPreferred: string,       // "Female", "Male", "Any"
  maxGuests: number,

  // Pricing
  leaseStyle: string,            // "Nightly"
  nightsPerWeekMin: number,      // 2
  nightsPerWeekMax: number,      // 7
  availableDays: number[],       // [0,1,2,3,4,5,6] (all days)
  pricing: {
    2: number,                   // Price for 2 nights
    3: number,
    4: number,
    5: number,
    6: number,
    7: number,
  },
  damageDeposit: number,
  maintenanceFee: number,

  // Availability
  leaseTermMin: number,          // weeks (6)
  leaseTermMax: number,          // weeks (52)
  earliestAvailableDate: Date,
  checkInTime: string,           // "1:00 pm"
  checkOutTime: string,          // "1:00 pm"
  blockedDates: Date[],

  // Cancellation
  cancellationPolicy: string,    // "Standard", "Additional Host Restrictions"

  // Photos
  photos: Array<{
    url: string,
    isCover: boolean,
    photoType: string,           // "Bedroom", "Kitchen", etc.
  }>,

  // Virtual Tour
  virtualTourUrl: string,
}
```

### Badge Counts
```javascript
{
  proposals: number,             // e.g., 3
  virtualMeetings: number,       // e.g., 1
  notifications: number,         // Bell icon badge
}
```

---

## UI PATTERNS

### Section Pattern
Each section follows this pattern:
```
┌─────────────────────────────────────────┐
│ Section Title                    [edit] │
├─────────────────────────────────────────┤
│                                         │
│  Content...                             │
│                                         │
└─────────────────────────────────────────┘
```

### Edit Mode
- Sections have "edit" links that likely open edit modals or inline editing
- Some fields are disabled/read-only in view mode

### Icons
- Using consistent icon set throughout
- Icons appear before text labels in lists
- Action icons (edit, delete, star) appear on hover or always visible

### Color Scheme
- **Primary Purple**: #31135d (buttons, accents)
- **Success Green**: For "Available" indicators
- **Warning Orange**: For "Restricted" dates
- **Error Red**: For "Blocked" dates
- **Gray**: For disabled/inactive states

---

## COMPARISON WITH CURRENT IMPLEMENTATION

### Currently Implemented (React App)
- ✅ Header with navigation
- ✅ Footer
- ✅ Navigation tabs with badges
- ✅ Action cards grid
- ✅ Property Info section (basic)
- ✅ Details section (basic)
- ⚠️ Using mock data

### Missing/Needs Implementation
- ❌ Amenities section (In-unit + Building)
- ❌ Description of Lodging section
- ❌ Neighborhood Description section
- ❌ Pricing and Lease Style section (detailed)
- ❌ Rules section (house rules + restrictions)
- ❌ Cancellation Policy dropdown
- ❌ Listing Availability (lease term, dates, times)
- ❌ Calendar with blocked dates
- ❌ Photos section with grid and management
- ❌ Virtual Tour section
- ❌ Edit functionality for each section
- ❌ Real data fetching from Supabase/Bubble API

---

**DOCUMENT VERSION**: 1.0
**STATUS**: Reference Documentation
