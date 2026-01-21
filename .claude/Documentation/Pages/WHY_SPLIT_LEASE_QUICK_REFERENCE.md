# Why Split Lease Page - Quick Reference

**GENERATED**: 2026-01-20
**PAGE_URL**: `/why-split-lease`
**ENTRY_POINT**: `app/src/why-split-lease.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
why-split-lease.jsx (Entry Point)
    |
    +-- WhySplitLeasePage.jsx (Self-Contained Component)
            |
            +-- State Management (inline hooks)
            |       +-- Dynamic text rotation (scenarios)
            |       +-- Schedule selector state (selectedDays + selectedDaysRef)
            |       +-- Borough filter state (selectedBorough)
            |       +-- Featured listings data (featuredListings)
            |
            +-- Data Fetching
            |       +-- initializeLookups() on mount
            |       +-- Borough list from zat_geo_borough_toplevel
            |       +-- Featured listings from listing table
            |
            +-- UI Components
                +-- Header.jsx (Site navigation)
                +-- HeroSection (Floating people + dynamic text)
                +-- WhyExistSection (Pain point cards)
                +-- ScheduleSection (SearchScheduleSelector)
                +-- HowItWorksSection (3-step cards)
                +-- FeaturedSpacesSection (Dynamic listings)
                +-- TrustStatsSection (4 stat boxes)
                +-- DifferentSection (Split schedule visual)
                +-- PricingExplanationSection (Comparison cards)
                +-- TestimonialsSection (Success stories)
                +-- FinalCTASection (Purple CTA)
                +-- Footer.jsx (Site footer)
```

**NOTE**: Unlike most pages, WhySplitLeasePage does NOT use the Hollow Component Pattern. All business logic is inline in the component rather than extracted to a separate `useWhySplitLeasePageLogic.js` hook.

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/why-split-lease.jsx` | Mounts WhySplitLeasePage to #why-split-lease-page |

### Page Component
| File | Purpose |
|------|---------|
| `app/src/islands/pages/WhySplitLeasePage.jsx` | Main component with inline logic (789 lines) |

### HTML Template
| File | Purpose |
|------|---------|
| `app/public/why-split-lease.html` | HTML shell with mount point and meta tags |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/why-split-lease.css` | Complete page styling (1746 lines) |

### Shared Components Used
| File | Purpose |
|------|---------|
| `app/src/islands/shared/Header.jsx` | Site-wide navigation header |
| `app/src/islands/shared/Footer.jsx` | Site-wide footer |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | Day selection component |

### Library Dependencies
| File | Purpose |
|------|---------|
| `app/src/lib/constants.js` | SEARCH_URL, VIEW_LISTING_URL constants |
| `app/src/lib/supabase.js` | Supabase client for database queries |
| `app/src/lib/supabaseUtils.js` | fetchPhotoUrls, parseJsonArray utilities |
| `app/src/lib/dataLookups.js` | getNeighborhoodName, getBoroughName, initializeLookups |

---

## ### URL_ROUTING ###

```
/why-split-lease            # Main page
/why-split-lease.html       # With extension
```

### Navigation Targets
```javascript
// CTA buttons navigate to search with day selection
window.location.href = `${SEARCH_URL}?days-selected=${daysParam}`

// Listing cards navigate to listing detail
window.location.href = `${VIEW_LISTING_URL}/${listing.id}`
```

---

## ### STATE_MANAGEMENT ###

### Component State Variables
```javascript
// Dynamic text rotation
const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
const [fadeOut, setFadeOut] = useState(false);

// Schedule selector - 0-based day indices
// Uses ref to ensure latest value at click time (avoids stale closure issues)
const selectedDaysRef = useRef([1, 2, 3]); // Mon, Tue, Wed default
const [selectedDays, setSelectedDays] = useState([1, 2, 3]);

// Borough filter
const [boroughs, setBoroughs] = useState([]);
const [selectedBorough, setSelectedBorough] = useState('all');

// Featured listings
const [featuredListings, setFeaturedListings] = useState([]);
const [isLoadingListings, setIsLoadingListings] = useState(true);
```

### Scenarios Data (Dynamic Text Rotation)
```javascript
const scenarios = [
  { city: "Philadelphia", purpose: "work" },
  { city: "Boston", purpose: "study" },
  { city: "DC", purpose: "visit" },
  { city: "Baltimore", purpose: "consult" },
  { city: "Providence", purpose: "teach" },
  { city: "Hartford", purpose: "perform" },
  { city: "Stamford", purpose: "train" },
  { city: "Albany", purpose: "care" }
];
```

---

## ### DATA_FLOW ###

### 1. Initialization (on mount)
```javascript
useEffect(() => {
  const init = async () => {
    // Initialize neighborhood/borough caches
    await initializeLookups();

    // Load NYC boroughs for filter
    const { data, error } = await supabase
      .from('zat_geo_borough_toplevel')
      .select('_id, "Display Borough"')
      .order('"Display Borough"', { ascending: true });

    if (error) throw error;

    // Filter to main NYC boroughs only
    const boroughList = data
      .filter(b => b['Display Borough'] && b['Display Borough'].trim())
      .map(b => ({
        id: b._id,
        name: b['Display Borough'].trim(),
        value: b['Display Borough'].trim().toLowerCase()
          .replace(/\s+county\s+nj/i, '')
          .replace(/\s+/g, '-')
      }))
      .filter(b => ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'].includes(b.value));

    setBoroughs(boroughList);
  };
  init();
}, []);
```

### 2. Fetch Featured Listings (on borough change)
```javascript
const fetchFeaturedListings = useCallback(async () => {
  if (boroughs.length === 0) return;

  setIsLoadingListings(true);
  try {
    let query = supabase
      .from('listing')
      .select(`
        _id, "Name", "Location - Borough", "Location - Hood",
        "Location - Address", "Features - Photos",
        "Features - Qty Bedrooms", "Features - Qty Bathrooms",
        "Features - Amenities In-Unit", "Days Available (List of Days)",
        "Standarized Minimum Nightly Price (Filter)"
      `)
      .eq('"Complete"', true)
      .or('"Active".eq.true,"Active".is.null')
      .or('"Location - Address".not.is.null,"Location - slightly different address".not.is.null');

    // Apply borough filter if not "all"
    if (selectedBorough !== 'all') {
      const borough = boroughs.find(b => b.value === selectedBorough);
      if (borough) {
        query = query.eq('"Location - Borough"', borough.id);
      }
    }

    query = query.limit(3);
    const { data: listings, error } = await query;

    // Handle photo URLs (both new embedded objects and legacy IDs)
    // Transform listings with location lookups
  } catch (err) {
    console.error('Failed to fetch featured listings:', err);
    setFeaturedListings([]);
  } finally {
    setIsLoadingListings(false);
  }
}, [boroughs, selectedBorough]);
```

### 3. Photo Handling (Dual Format Support)
```javascript
// Collect legacy photo IDs (strings) for batch fetching
// New format has embedded objects with URLs, no fetch needed
const legacyPhotoIds = [];
listings.forEach(listing => {
  const photos = parseJsonArray(listing['Features - Photos']);
  if (photos && photos.length > 0) {
    const firstPhoto = photos[0];
    // Only collect if it's a string ID (legacy format)
    if (typeof firstPhoto === 'string') {
      legacyPhotoIds.push(firstPhoto);
    }
  }
});

// Only fetch from listing_photo table if there are legacy photo IDs
const photoMap = legacyPhotoIds.length > 0
  ? await fetchPhotoUrls(legacyPhotoIds)
  : {};

// Transform listings - handle both formats
let photoUrl = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop';
if (typeof firstPhoto === 'object' && firstPhoto !== null) {
  // New format: extract URL from object
  let url = firstPhoto.url || firstPhoto.Photo || '';
  if (url.startsWith('//')) url = 'https:' + url;
  if (url) photoUrl = url;
} else if (typeof firstPhoto === 'string' && photoMap[firstPhoto]) {
  // Legacy format: look up in photoMap
  photoUrl = photoMap[firstPhoto];
}
```

### 4. Dynamic Text Rotation Effect
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    setFadeOut(true);
    setTimeout(() => {
      setCurrentScenarioIndex((prev) => (prev + 1) % scenarios.length);
      setFadeOut(false);
    }, 300); // Fade transition duration
  }, 3000); // Rotate every 3 seconds

  return () => clearInterval(interval);
}, [scenarios.length]);
```

### 5. Schedule Selection Handler (with Ref Pattern)
```javascript
const handleSelectionChange = (days) => {
  // days is array of day objects: { id, singleLetter, fullName, index }
  const dayIndices = days.map(d => d.index);
  // Update both state and ref to ensure we have the latest value
  setSelectedDays(dayIndices);
  selectedDaysRef.current = dayIndices;
};

const handleExploreSpaces = () => {
  // Use ref to get the latest selection (avoids stale closure issues)
  const currentSelection = selectedDaysRef.current;

  if (currentSelection.length === 0) {
    alert('Please select at least one night per week');
    return;
  }
  // Convert 0-based indices to 1-based for URL (0->1, 1->2, etc.)
  const oneBased = currentSelection.map(idx => idx + 1);
  const daysParam = oneBased.join(',');
  window.location.href = `${SEARCH_URL}?days-selected=${daysParam}`;
};
```

---

## ### PAGE_SECTIONS ###

### 1. Hero Section (hero-identity)
**Pattern**: White background with floating animated people
```
+------------------------------------------------------+
| [Floating Person 1]              [Floating Person 5] |
|         [Floating Person 4]                          |
|                                                      |
|              [Multi-Local Living Badge]              |
|                                                      |
|    You live in {city}                                |
|    And {purpose} in NYC.                             |
|                                                      |
|    Subtitle text describing Split Lease...           |
|                                                      |
|    [2,400+ NYC Multi-Locals] [$18K Avg Savings]      |
|              [200+ NYC Listings]                     |
|                                                      |
|         [Find Your NYC Space Button]                 |
|                                                      |
| [Floating Person 2]              [Floating Person 3] |
|         [Floating Person 6]                          |
+------------------------------------------------------+
```

### 2. Why We Exist Section (why-exist-section)
**Pattern**: Light gray (#f7f8f9) with purple circle accents
```
+------------------------------------------------------+
|          The Problem with Living in Two Cities       |
|                                                      |
|   "Hotels cost a fortune. Airbnb is a lottery..."    |
|                                                      |
| +---------------+ +---------------+ +---------------+ |
| | $ Icon       | | Box Icon      | | Lock Icon     | |
| |              | |               | |               | |
| | Hotels Drain | | Airbnb is     | | Pay for       | |
| | Your Wallet  | | a Gamble      | | Empty Nights  | |
| |              | |               | |               | |
| | $300/night = | | Different     | | 30 nights =   | |
| | $3,600/mo    | | place every   | | $3,200 for    | |
| | for 12 nights| | visit...      | | 12 used       | |
| +---------------+ +---------------+ +---------------+ |
+------------------------------------------------------+
```

### 3. Schedule Selector Section (schedule-section)
**Pattern**: White with outlined purple bubbles
```
+------------------------------------------------------+
|           Your Schedule, Your Way                    |
|       Pay Only for the Nights You Need               |
|                                                      |
|   +----------------------------------------------+   |
|   | Select your NYC nights ->                    |   |
|   |                                              |   |
|   |  [SearchScheduleSelector Component]          |   |
|   |  [S] [M] [T] [W] [T] [F] [S]                  |   |
|   |       *   *   *                              |   |
|   |                                              |   |
|   |  [See NYC Spaces for This Schedule]          |   |
|   +----------------------------------------------+   |
+------------------------------------------------------+
```

### 4. How It Works Section (how-it-works)
**Pattern**: Light gray with gradient purple blobs
```
+------------------------------------------------------+
|              How Split Lease Works                   |
|      Get your NYC home base in three simple steps    |
|                                                      |
| +----------------+ +----------------+ +---------------+
| |      (1)       | |      (2)       | |      (3)      |
| |                | |                | |               |
| | Select Your    | | Browse &       | | Move In &     |
| | Schedule       | | Book           | | Leave Stuff   |
| |                | |                | |               |
| | Choose which   | | View verified  | | Get keys,     |
| | nights you'll  | | spaces with    | | leave your    |
| | be in NYC...   | | quality setups | | belongings... |
| +----------------+ +----------------+ +---------------+
+------------------------------------------------------+
```

### 5. Featured Spaces Section (featured-spaces)
**Pattern**: White with outlined bubbles
```
+------------------------------------------------------+
|             Browse Spaces                            |
|           Featured NYC Spaces                        |
|                                                      |
| [All Spaces] [Manhattan] [Brooklyn] [Queens] ...     |
|                                                      |
| +----------------+ +----------------+ +---------------+
| | [Photo]        | | [Photo]        | | [Photo]       |
| | [Verified]     | | [Verified]     | | [Verified]    |
| |                | |                | |               |
| | Listing Title  | | Listing Title  | | Listing Title |
| | Location       | | Location       | | Location      |
| | [2 beds] [1ba] | | [1 bed] [1ba]  | | [Studio]      |
| |                | |                | |               |
| | X nights avail | | X nights avail | | Schedule flex |
| | [o o o o o o o]| | [o o o o o o o]| | [o o o o o o o]|
| +----------------+ +----------------+ +---------------+
|                                                      |
|           [Browse All NYC Spaces]                    |
+------------------------------------------------------+
```

### 6. Trust Stats Section (trust-section)
**Pattern**: Light gray with gradient purple blobs
```
+------------------------------------------------------+
|   200+     |    2,400+    |    $18K    |    4.8*    |
| NYC Spaces | Multi-Locals | Avg Yearly | Average    |
|            |              | Savings    | Rating     |
+------------------------------------------------------+
```

### 7. What Makes Us Different Section (different-section)
**Pattern**: Light gray with gradient blobs
```
+------------------------------------------------------+
|           The Split Lease Difference                 |
|    Share Spaces. Different Days. Lower Prices.       |
|                                                      |
|   +----------------------------------------------+   |
|   | Guest A - You                                |   |
|   | [S] [M*] [T*] [W*] [T] [F] [S]               |   |
|   | Consultant visiting NYC - 3 nights/week      |   |
|   +----------------------------------------------+   |
|   | Guest B - Someone Else                       |   |
|   | [S] [M] [T] [W] [T*] [F*] [S*]               |   |
|   | Visiting family on weekends - 3 nights/week  |   |
|   +----------------------------------------------+   |
|   | [checkmark] Same Space. Different Days.      |   |
|   |            Everyone Wins.                    |   |
|   +----------------------------------------------+   |
+------------------------------------------------------+
```

### 8. Pricing Explanation Section (pricing-explanation)
**Pattern**: Light gray with purple circle accents
```
+------------------------------------------------------+
|             Transparent Pricing                      |
|           How Are Prices So Low?                     |
|                                                      |
| +---------------+ +------------------+ +-------------+
| | Hotels/Airbnb | | Split Lease      | | Full-Time   |
| |               | | [HIGHLIGHTED]    | | Lease       |
| |    $3,600     | |     $1,400       | |   $3,200    |
| |   per month   | |    per month     | |  per month  |
| |               | |                  | |             |
| | 12 nights @   | | 12 nights in     | | Pay for 30  |
| | $300/night    | | same space       | | Use only 12 |
| | Inconsistent  | | Consistent       | | Long-term   |
| | No workspace  | | Workspace incl.  | | commitment  |
| | Pack/unpack   | | Storage included | | Utilities + |
| +---------------+ +------------------+ +-------------+
|                                                      |
|   "The math is simple: Hotels charge premium..."     |
+------------------------------------------------------+
```

### 9. Testimonials Section (testimonials-section)
**Pattern**: White with outlined bubbles
```
+------------------------------------------------------+
| Success Stories      |  +-------------+ +------------+|
|                      |  | [Photo]     | | [Photo]    ||
| Real stories from    |  | Priya S.    | | Marcus C.  ||
| NYC multi-locals     |  | Sr Product  | | Strategy   ||
|                      |  | Designer    | | Consultant ||
| See how people are   |  | 12 nights/mo| | 8 nights/mo||
| saving thousands...  |  | "I work..." | | "Every..." ||
|                      |  | [Read more] | | [Read more]||
| [View all stories]   |  +-------------+ +------------+|
|                      |  +-------------+ +------------+|
|                      |  | [Photo]     | | [Photo]    ||
|                      |  | David M.    | | Sarah K.   ||
|                      |  | Father      | | MBA Student||
|                      |  +-------------+ +------------+|
+------------------------------------------------------+
```

### 10. Final CTA Section (final-cta)
**Pattern**: Brand purple gradient with gradient circles
```
+------------------------------------------------------+
|     Ready to Stop Packing Every Trip?                |
|                                                      |
|  Find your NYC space with storage included...        |
|                                                      |
|         [Explore NYC Listings]                       |
+------------------------------------------------------+
```

---

## ### CSS_PATTERNS ###

### 5 Unique Background Patterns
| Pattern | Sections | Background | Accent Elements |
|---------|----------|------------|-----------------|
| **1** | Hero, Final CTA | Brand purple gradient | Gradient circles (blur) |
| **2** | Why Exist, Pricing | Light gray (#f7f8f9) | Solid purple circles (opacity) |
| **3** | Schedule, Featured, Testimonials | White | Outlined purple bubbles |
| **5** | How It Works, Trust, Different | Light gray (#f7f8f9) | Gradient purple blobs (blur) |

### CSS Variables
```css
:root {
  --gradient-purple-blue: linear-gradient(135deg, #31135D 0%, #4A2F7C 50%, #5B21B6 100%);
  --gradient-purple-pink: linear-gradient(135deg, #31135D 0%, #6B21A8 50%, #A855F7 100%);
  --brand-purple: #31135D;
}
```

### Key Animation Classes
| Animation | Duration | Description |
|-----------|----------|-------------|
| `hero-float-1` through `hero-float-6` | 6.5s-9s | Floating people movement |
| `shimmer` | 1.5s | Loading skeleton animation |
| `pulse-error` | 1.5s | Error state pulsing (in SearchScheduleSelector) |
| `.dynamic-text.fade-out` | 0.3s | City/purpose text transition |

---

## ### SEARCHSCHEDULESELECTOR_INTEGRATION ###

### Props Passed
```jsx
<SearchScheduleSelector
  initialSelection={selectedDays}        // [1, 2, 3] (Mon-Wed default)
  onSelectionChange={handleSelectionChange}
  onError={(error) => console.error('Schedule selector error:', error)}
  updateUrl={false}                       // Don't update URL from this page
  minDays={2}                             // Minimum 2 nights required
  requireContiguous={true}                // Days must be adjacent
/>
```

### Day Indexing Convention
| Display | JavaScript (0-based) | Bubble API (1-based) |
|---------|---------------------|---------------------|
| Sunday | 0 | 1 |
| Monday | 1 | 2 |
| Tuesday | 2 | 3 |
| Wednesday | 3 | 4 |
| Thursday | 4 | 5 |
| Friday | 5 | 6 |
| Saturday | 6 | 7 |

### URL Parameter Conversion
```javascript
// When navigating to search page:
const oneBased = selectedDaysRef.current.map(idx => idx + 1); // 0-based -> 1-based
const daysParam = oneBased.join(',');
window.location.href = `${SEARCH_URL}?days-selected=${daysParam}`;
// Example: [1, 2, 3] (Mon-Wed) -> "2,3,4" in URL
```

---

## ### FEATURED_LISTINGS_STRUCTURE ###

### Transformed Listing Object
```javascript
{
  id: listing._id,
  title: listing['Name'] || 'NYC Space',
  location: 'Neighborhood, Borough',  // From lookups
  image: photoUrl,                    // From fetchPhotoUrls or embedded object
  bedrooms: number,
  bathrooms: number,
  availableDays: [],                  // Day names or indices
  price: number                       // Standarized Minimum Nightly Price
}
```

### Borough Filter Values
| Display Name | Filter Value |
|--------------|--------------|
| All Spaces | `'all'` |
| Manhattan | `'manhattan'` |
| Brooklyn | `'brooklyn'` |
| Queens | `'queens'` |
| Bronx | `'bronx'` |
| Staten Island | `'staten-island'` |

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `< 968px` | Hero font 36px, hide extra floating people, stack grids to 1 column |
| `< 640px` | Trust grid single column, stats gap 32px, smaller titles |

### Mobile Adaptations
- Floating people: Only 3 visible on tablet, hidden on mobile
- Pain cards: Stack vertically
- Steps grid: Stack vertically
- Pricing cards: Stack vertically, remove scale transform
- Testimonials: Single column grid
- Schedule example: Stack guest schedules

---

## ### KEY_IMPORTS ###

```javascript
// React hooks
import { useState, useEffect, useCallback, useRef } from 'react';

// Shared components
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import SearchScheduleSelector from '../shared/SearchScheduleSelector.jsx';

// Constants
import { SEARCH_URL, VIEW_LISTING_URL } from '../../lib/constants.js';

// Database
import { supabase } from '../../lib/supabase.js';
import { fetchPhotoUrls, parseJsonArray } from '../../lib/supabaseUtils.js';
import { getNeighborhoodName, getBoroughName, initializeLookups } from '../../lib/dataLookups.js';
```

---

## ### DATABASE_DEPENDENCIES ###

### Supabase Tables Used
| Table | Purpose |
|-------|---------|
| `zat_geo_borough_toplevel` | NYC boroughs for filter pills |
| `listing` | Featured listings data |
| `zat_geo_hood_mediumlevel` | Neighborhood name lookup (via dataLookups) |
| `listing_photo` | Legacy photo URL lookup (via fetchPhotoUrls) |

### Listing Query Fields
```sql
SELECT
  _id,
  "Name",
  "Location - Borough",
  "Location - Hood",
  "Location - Address",
  "Features - Photos",
  "Features - Qty Bedrooms",
  "Features - Qty Bathrooms",
  "Features - Amenities In-Unit",
  "Days Available (List of Days)",
  "Standarized Minimum Nightly Price (Filter)"
FROM listing
WHERE "Complete" = true
  AND ("Active" = true OR "Active" IS NULL)
  AND ("Location - Address" IS NOT NULL
       OR "Location - slightly different address" IS NOT NULL)
LIMIT 3
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| No listings showing | Check Supabase connection, verify Complete=true listings exist |
| Borough filter not working | Verify borough IDs match zat_geo_borough_toplevel._id |
| Photos not loading | Check photo format (new embedded vs legacy), verify photo IDs exist |
| Day selection not working | Check SearchScheduleSelector props, verify minDays |
| Text not rotating | Check scenarios array length, verify interval is running |
| Floating people not animating | Check CSS animations, verify browser compatibility |
| Search redirect broken | Verify SEARCH_URL constant, check URL parameter format |
| Stale day selection on click | Ensure selectedDaysRef is being updated alongside state |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Source CLAUDE.md | `app/src/CLAUDE.md` |
| Pages CLAUDE.md | `app/src/islands/pages/CLAUDE.md` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Constants | `app/src/lib/constants.js` |
| Data Lookups | `app/src/lib/dataLookups.js` |
| Search Page | `Documentation/Pages/SEARCH_QUICK_REFERENCE.md` |

---

**VERSION**: 1.1
**LAST_UPDATED**: 2026-01-20
**STATUS**: Comprehensive - Full page analysis complete
