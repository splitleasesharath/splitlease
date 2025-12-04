# About Us Page - Quick Reference

**GENERATED**: 2025-12-04
**PAGE_URL**: `/about-us`
**ENTRY_POINT**: `app/src/about-us.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
about-us.jsx (Entry Point)
    |
    +-- AboutUsPage.jsx (Page Component)
            |
            +-- State Management (useState, useEffect)
            |       +-- teamMembers: Team data array
            |       +-- isLoading: Loading state
            |       +-- error: Error state
            |
            +-- Data Fetching
            |       +-- Supabase query to zat_splitleaseteam
            |       +-- Ordered by 'order' field ascending
            |
            +-- UI Sections
                +-- Header.jsx (Site navigation)
                +-- Section 1: Hero/Mission Statement
                +-- Section 2: Story ("Why We Created Split Lease")
                +-- Section 3: Team Grid (data-driven)
                |       +-- TeamCard (nested component)
                |       +-- TeamSkeleton (loading state)
                +-- Section 4: Features (Flexible, Fast, Affordable)
                +-- Footer.jsx (Site footer)
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/about-us.jsx` | Mounts AboutUsPage to #about-us-page |

### HTML Entry
| File | Purpose |
|------|---------|
| `app/public/about-us.html` | Static HTML with meta tags, fonts |

### Page Components
| File | Purpose |
|------|---------|
| `app/src/islands/pages/AboutUsPage/AboutUsPage.jsx` | Main page component (241 lines) |
| `app/src/islands/pages/AboutUsPage/AboutUsPage.css` | Complete page styling (397 lines) |

### Nested Components (within AboutUsPage.jsx)
| Component | Purpose |
|-----------|---------|
| `TeamCard` | Individual team member card with image, name, title |
| `TeamSkeleton` | Loading skeleton for team cards |

### Shared Components
| File | Purpose |
|------|---------|
| `app/src/islands/shared/Header.jsx` | Site navigation, auth modals |
| `app/src/islands/shared/Footer.jsx` | Site footer with links |

### Library Utilities
| File | Purpose |
|------|---------|
| `app/src/lib/supabase.js` | Supabase client for team data fetch |
| `app/src/lib/navigation.js` | `goToAboutUs()` navigation function |

### Configuration
| File | Purpose |
|------|---------|
| `app/src/routes.config.js` | Route definition (lines 154-160) |
| `app/vite.config.js` | Vite build entry (line 281) |
| `app/public/_redirects` | Cloudflare redirect rules |

---

## ### URL_ROUTING ###

```
/about-us              # Primary route (clean URL)
/about-us.html         # Legacy route (aliased)
```

### Route Configuration
```javascript
// routes.config.js
{
  path: '/about-us',
  file: 'about-us.html',
  aliases: ['/about-us.html'],
  protected: false,
  cloudflareInternal: false,
  hasDynamicSegment: false
}
```

### Navigation Function
```javascript
import { goToAboutUs } from 'lib/navigation.js'

goToAboutUs()  // window.location.href = '/about-us'
```

### Footer Link
```jsx
<a href="/about-us">About the Team</a>
```

---

## ### PAGE_SECTIONS ###

### Section 1: Hero / Mission Statement
```
+-------------------------------------------------------------+
| "Our Mission is to Make Repeat Travel Flexible, Fast and    |
|  Affordable"                                                |
+-------------------------------------------------------------+
```
- Class: `.about-hero-section`
- Background: White (`--about-body-bg`)
- Padding: 80px 20px
- Max-width: 800px centered

### Section 2: Story ("Why We Created Split Lease")
```
+-------------------------------------------------------------+
| "Why We Created Split Lease"                                |
|-------------------------------------------------------------|
| Story paragraphs with pain points list:                     |
| " We needed to be in the city part of the time              |
| " But we weren't willing to give up our primary residences  |
| " Random nights at hotels and Airbnbs add up                |
| " Carrying a suitcase around everywhere...                  |
+-------------------------------------------------------------+
```
- Class: `.about-story-section`
- Key classes: `.about-story-text`, `.about-highlight`, `.about-pain-points`
- Purple highlights: `strong` text in `.about-highlight` paragraphs

### Section 3: Team Grid (Data-Driven)
```
+-------------------------------------------------------------+
| "Meet the Team Empowering Multi-Locality"                   |
|-------------------------------------------------------------|
| +----------+  +----------+  +----------+  +----------+      |
| |  Photo   |  |  Photo   |  |  Photo   |  |  Photo   |      |
| |  Name    |  |  Name    |  |  Name    |  |  Name    |      |
| |  Title   |  |  Title   |  |  Title   |  |  Title   |      |
| +----------+  +----------+  +----------+  +----------+      |
+-------------------------------------------------------------+
```
- Class: `.about-team-section`
- Background: Light blue (`--about-section-bg-light: #F0F8FF`)
- Grid: 4 columns ’ 3 ’ 2 ’ 1 (responsive)

### Section 4: Features Grid
```
+-------------------------------------------------------------+
| "What Split Lease Can Do for You"                           |
|-------------------------------------------------------------|
| +----------------+  +----------------+  +----------------+   |
| |   [Icon]       |  |   [Icon]       |  |   [Icon]       |   |
| |   Flexible     |  |   Fast         |  |   Affordable   |   |
| |   Part-time... |  |   Less...      |  |   Extending... |   |
| +----------------+  +----------------+  +----------------+   |
+-------------------------------------------------------------+
```
- Class: `.about-features-section`
- Background: Light blue (`--about-section-bg-light`)
- Grid: 3 columns ’ 1 (mobile)
- Icons: Inline SVG (64x64px, purple #4B47CE)

---

## ### DATA_FLOW ###

### 1. Team Data Fetch (on mount)
```javascript
// In AboutUsPage.jsx useEffect
const { data, error: fetchError } = await supabase
  .from('zat_splitleaseteam')
  .select('_id, name, title, image, "click through link", "order"')
  .order('order', { ascending: true });
```

### 2. Data Transformation
```javascript
const transformedData = data.map(member => ({
  id: member._id,
  name: member.name,
  title: member.title,
  image: member.image,
  clickThroughLink: member['click through link'],
  order: member.order
}));
```

### 3. Image URL Formatting
```javascript
function formatImageUrl(imageUrl) {
  if (!imageUrl) return '/assets/images/team/placeholder.svg';

  // Handle protocol-relative URLs
  if (imageUrl.startsWith('//')) {
    return `https:${imageUrl}`;
  }

  return imageUrl;
}
```

### 4. Render States
| State | Component | Display |
|-------|-----------|---------|
| `isLoading: true` | `<TeamSkeleton />` × 4 | Animated skeleton cards |
| `error: string` | Error message | "Unable to load team members..." |
| `teamMembers.length === 0` | Empty state | "No team members to display." |
| `teamMembers.length > 0` | `<TeamCard />` × n | Team member cards |

---

## ### SUPABASE_TABLE ###

### zat_splitleaseteam
| Column | Type | Purpose |
|--------|------|---------|
| `_id` | UUID | Primary key |
| `name` | Text | Team member name |
| `title` | Text | Job title / role |
| `image` | Text | Profile photo URL |
| `click through link` | Text | LinkedIn or profile URL |
| `order` | Number | Display order (ascending) |

### Query Example
```javascript
const { data, error } = await supabase
  .from('zat_splitleaseteam')
  .select('_id, name, title, image, "click through link", "order"')
  .order('order', { ascending: true });
```

---

## ### TEAMCARD_COMPONENT ###

### Props
```javascript
{
  member: {
    id: string,           // UUID
    name: string,         // Display name
    title: string,        // Job title
    image: string,        // Photo URL
    clickThroughLink: string  // External link (optional)
  }
}
```

### Structure
```jsx
<div className={`about-team-card ${member.clickThroughLink ? 'clickable' : ''}`}>
  <div className="about-team-image">
    <img src={imageUrl} alt={member.name} onError={() => setImageError(true)} />
  </div>
  <h3 className="about-team-name">{member.name}</h3>
  <p className="about-team-title">{member.title}</p>
</div>
```

### Behavior
- **Click handler**: Opens `clickThroughLink` in new tab if defined
- **Image error**: Falls back to purple background (#4B47CE)
- **Hover effect**: Lifts card by 5px (`transform: translateY(-5px)`)
- **Cursor**: Pointer if clickable, default otherwise

### CSS Dimensions
| Element | Size |
|---------|------|
| Card min-height | 302px |
| Image container | 144px × 144px (circular) |
| Name font | 24px, bold (#31135D) |
| Title font | 18px, regular (#31135D) |
| Title max-width | 175px |

---

## ### TEAMSKELETON_COMPONENT ###

### Structure
```jsx
<div className="about-team-card about-team-skeleton">
  <div className="about-team-image skeleton-pulse"></div>
  <div className="about-team-name skeleton-pulse skeleton-text"></div>
  <div className="about-team-title skeleton-pulse skeleton-text-small"></div>
</div>
```

### Animation
```css
@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton-pulse {
  background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
```

---

## ### CSS_VARIABLES ###

```css
.about-us-main {
  --about-header-bg: #5A1868;
  --about-accent-purple: #800080;
  --about-team-name-color: #31135D;
  --about-image-placeholder: #4B47CE;
  --about-primary-text: #000000;
  --about-secondary-text: #222222;
  --about-body-bg: #FFFFFF;
  --about-section-bg-light: #F0F8FF;
  --about-border-gray: #6B6B6B;
  --about-font-family: 'Inter', 'Nunito Sans', 'Avenir Next LT Pro', -apple-system, ...;
  --about-container-max-width: 1200px;
  --about-section-padding: 80px 20px;
  --about-section-padding-mobile: 50px 16px;
}
```

---

## ### CSS_CLASS_INDEX ###

### Layout Classes
| Class | Purpose |
|-------|---------|
| `.about-us-main` | Main content wrapper with CSS variables |
| `.about-container` | Max-width container (1200px) |
| `.about-hero-section` | Mission statement section |
| `.about-story-section` | Story/Why section |
| `.about-team-section` | Team grid section (light blue bg) |
| `.about-features-section` | Features grid section (light blue bg) |

### Typography Classes
| Class | Purpose |
|-------|---------|
| `.about-mission-statement` | Hero heading (36px, bold) |
| `.about-section-heading` | Section heading (28px, semibold) |
| `.about-section-heading-large` | Large heading (36px, bold) |
| `.about-story-text` | Story paragraph (20px) |
| `.about-highlight` | Purple highlighted strong text |
| `.about-standalone` | Extra margin for emphasis |

### Team Classes
| Class | Purpose |
|-------|---------|
| `.about-team-grid` | 4-column team grid |
| `.about-team-card` | Individual team card |
| `.about-team-card.clickable` | Card with click handler |
| `.about-team-image` | Circular image container (144px) |
| `.about-team-name` | Member name (24px, #31135D) |
| `.about-team-title` | Job title (18px, #31135D) |
| `.about-team-skeleton` | Skeleton loading card |
| `.about-team-error` | Error state message |
| `.about-team-empty` | Empty state message |

### Feature Classes
| Class | Purpose |
|-------|---------|
| `.about-features-grid` | 3-column feature grid |
| `.about-feature-card` | Individual feature card |
| `.about-feature-icon` | Icon container (purple #4B47CE) |
| `.about-feature-title` | Feature title (24px) |
| `.about-feature-description` | Feature description (16px, max 300px) |

### Story Classes
| Class | Purpose |
|-------|---------|
| `.about-story-content` | Story container (max 800px) |
| `.about-pain-points` | Pain points list (custom bullets) |

### Skeleton Classes
| Class | Purpose |
|-------|---------|
| `.skeleton-pulse` | Animated gradient background |
| `.skeleton-text` | Name placeholder (24px height) |
| `.skeleton-text-small` | Title placeholder (18px height) |

### Utility Classes
| Class | Purpose |
|-------|---------|
| `.about-sr-only` | Screen reader only content |

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `d 954px` | Team grid: 4 ’ 3 columns |
| `d 760px` | Mission & section headings: 36px ’ 30px |
| `d 700px` | Team grid: 3 ’ 2 columns, Features: 3 ’ 1 column, Section padding reduced, Story text: 20px ’ 18px |
| `d 530px` | Team grid: 2 ’ 1 column, Headings: 30px ’ 26px |

### Mobile Padding
```css
@media (max-width: 700px) {
  .about-hero-section { padding: 50px 20px; }
  .about-story-section,
  .about-team-section,
  .about-features-section { padding: 50px 16px; }
}
```

---

## ### FEATURE_ICONS ###

### Flexible Icon (Sun burst pattern)
```svg
<svg viewBox="0 0 24 24" stroke-width="1.5">
  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
</svg>
```

### Fast Icon (Clock)
```svg
<svg viewBox="0 0 24 24" stroke-width="1.5">
  <circle cx="12" cy="12" r="10"/>
  <polyline points="12 6 12 12 16 14"/>
</svg>
```

### Affordable Icon (Dollar sign)
```svg
<svg viewBox="0 0 24 24" stroke-width="1.5">
  <line x1="12" y1="1" x2="12" y2="23"/>
  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
</svg>
```

---

## ### STATE_MANAGEMENT ###

### Component State
```javascript
const [teamMembers, setTeamMembers] = useState([]);  // Team data array
const [isLoading, setIsLoading] = useState(true);    // Loading indicator
const [error, setError] = useState(null);            // Error message
```

### TeamCard State (internal)
```javascript
const [imageError, setImageError] = useState(false); // Image load failure
```

---

## ### ERROR_HANDLING ###

### Fetch Error
```javascript
if (fetchError) {
  console.error('[AboutUsPage] Error fetching team members:', fetchError);
  setError(fetchError.message);
  return;
}
```

### Unexpected Error (try-catch)
```javascript
catch (err) {
  console.error('[AboutUsPage] Unexpected error:', err);
  setError(err.message);
}
```

### Image Error
```jsx
<img
  src={imageUrl}
  alt={member.name}
  onError={() => setImageError(true)}
/>
```

### UI Error Display
```jsx
{error && (
  <p className="about-team-error">
    Unable to load team members. Please try again later.
  </p>
)}
```

---

## ### KEY_IMPORTS ###

```javascript
// React
import { useState, useEffect } from 'react';

// Shared components
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';

// Supabase client
import { supabase } from '../../../lib/supabase.js';

// Styles
import './AboutUsPage.css';
```

---

## ### BUILD_CONFIGURATION ###

### Vite Entry (vite.config.js)
```javascript
input: {
  // ... other entries
  'about-us': resolve(__dirname, 'public/about-us.html')
}
```

### Cloudflare Redirects (_redirects)
```
# /about-us
/about-us.html  /about-us.html  200
```

### HTML Mount Point (about-us.html)
```html
<div id="about-us-page"></div>
<script type="module" src="/src/about-us.jsx"></script>
```

---

## ### FONTS ###

### Loaded in HTML
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet">
```

### Font Stack (CSS)
```css
--about-font-family: 'Inter', 'Nunito Sans', 'Avenir Next LT Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

---

## ### ACCESSIBILITY ###

### Screen Reader Support
```css
.about-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

### Image Alt Text
- Team images use `member.name` as alt text
- Placeholder fallback for missing images

### Link Behavior
- External links open in new tab (`target="_blank"`)
- Clickable cards have `cursor: pointer`

---

## ### PLACEHOLDER_ASSETS ###

| Asset | Path | Purpose |
|-------|------|---------|
| Team placeholder | `/assets/images/team/placeholder.svg` | Fallback for missing team photos |
| Favicon | `/assets/images/split-lease-purple-circle.png` | Page favicon |

---

## ### CONSOLE_LOGGING ###

```javascript
// Fetch start
console.log('[AboutUsPage] Fetching team members from Supabase...');

// Fetch success
console.log('[AboutUsPage] Fetched team members:', transformedData.length);

// Fetch error
console.error('[AboutUsPage] Error fetching team members:', fetchError);

// Unexpected error
console.error('[AboutUsPage] Unexpected error:', err);
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| No team members showing | Verify `zat_splitleaseteam` table has data in Supabase |
| Team images not loading | Check image URLs have correct protocol (not `//`) |
| Purple circles instead of photos | Image URL invalid or CORS blocked |
| Skeleton stuck loading | Check network tab for Supabase errors |
| Clickable card not working | Verify `click through link` field populated |
| Styling broken | Check CSS import in AboutUsPage.jsx |
| Grid not responsive | Verify media queries in AboutUsPage.css |

---

## ### DEPENDENCIES ###

### Direct Dependencies
| Package | Purpose |
|---------|---------|
| `react` | useState, useEffect hooks |
| `react-dom` | createRoot for mounting |
| `@supabase/supabase-js` | Team data fetching |

### Shared Components
| Component | Import Path |
|-----------|-------------|
| Header | `../../shared/Header.jsx` |
| Footer | `../../shared/Footer.jsx` |

### Supabase Client
| Module | Import Path |
|--------|-------------|
| supabase | `../../../lib/supabase.js` |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Src CLAUDE.md | `app/src/CLAUDE.md` |
| Islands CLAUDE.md | `app/src/islands/CLAUDE.md` |
| Pages CLAUDE.md | `app/src/islands/pages/CLAUDE.md` |
| Database Schema | `DATABASE_SCHEMA_OVERVIEW.md` |
| Database Tables | `Documentation/Database/DATABASE_TABLES_DETAILED.md` |
| Routing Guide | `Documentation/ROUTING_GUIDE.md` |

---

## ### CONTENT_SECTIONS_TEXT ###

### Mission Statement
> Our Mission is to Make Repeat Travel Flexible, Fast and Affordable

### Story Pain Points
1. We needed to be in the city part of the time
2. But we weren't willing to give up our primary residences
3. Random nights at hotels and Airbnbs add up
4. Carrying a suitcase around everywhere does not make you feel like a local

### Feature Descriptions
| Feature | Description |
|---------|-------------|
| **Flexible** | Part-time, furnished rentals on your terms; stay for a few days or a few months, without abandoning your current home. |
| **Fast** | Experience less booking, less packing, less hassle, to focus on the work at hand or the people you love. |
| **Affordable** | Extending your stay is saving on booking, cleaning and tax fees, meaning that money is going straight back into your pocket. |

---

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Comprehensive initial documentation
