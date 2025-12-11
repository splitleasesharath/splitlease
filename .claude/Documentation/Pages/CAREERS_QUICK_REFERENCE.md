# Careers Page - Quick Reference

**GENERATED**: 2025-12-11
**PAGE_URL**: `/careers` or `/careers.html`
**ENTRY_POINT**: `app/src/careers.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
careers.jsx (Entry Point)
    |
    +-- CareersPage.jsx (Self-contained Component)
            |
            +-- State Management
            |       +-- typeformModalActive (boolean)
            |       +-- gameModalActive (boolean)
            |       +-- typeformContainerRef (ref)
            |
            +-- Effects
            |       +-- Feather icons initialization
            |       +-- Typeform embed loading
            |       +-- ESC key handler for modals
            |
            +-- UI Sections
            |   +-- Header.jsx (Site navigation)
            |   +-- Hero Section (Video background)
            |   +-- Mission Section (User example cards + Game modal link)
            |   +-- Company Journey Video Section
            |   +-- Values Section (4-value grid)
            |   +-- Why We'll Win Section (Future vision)
            |   +-- How We Work Section (3-step process)
            |   +-- What's Inside Section (6 resources)
            |   +-- Resources Section (PDF downloads)
            |   +-- Open Roles Section (Job cards)
            |   +-- Footer.jsx (Site footer)
            |
            +-- Typeform Modal (Application form embed)
            +-- Game Modal (Schedule Matcher iframe)
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/careers.jsx` | Mounts CareersPage to #careers-page |

### Page Component
| File | Purpose |
|------|---------|
| `app/src/islands/pages/CareersPage.jsx` | Main page component (~639 lines) |

### Shared Components
| File | Purpose |
|------|---------|
| `app/src/islands/shared/Header.jsx` | Site header navigation |
| `app/src/islands/shared/Footer.jsx` | Site footer |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/careers.css` | Complete page styling (~957 lines) |
| `app/src/styles/main.css` | Base global styles |

### HTML Entry
| File | Purpose |
|------|---------|
| `app/public/careers.html` | HTML shell with script/style links |

### Constants
| File | Purpose |
|------|---------|
| `app/src/lib/constants.js` | SIGNUP_LOGIN_URL (imported but unused) |

### Assets
| File | Purpose |
|------|---------|
| `/assets/games/schedule-matcher.html` | Interactive game embedded in game modal |

---

## ### URL_ROUTING ###

```
/careers           # Primary route (clean URL)
/careers.html      # Legacy HTML route
```

### Vite Config Entry
```javascript
// vite.config.js
careers: resolve(__dirname, 'public/careers.html')
```

---

## ### COMPONENT_STATE ###

### useState Hooks
```javascript
const [typeformModalActive, setTypeformModalActive] = useState(false);
const [gameModalActive, setGameModalActive] = useState(false);
```

### useRef Hooks
```javascript
const typeformContainerRef = useRef(null);  // Container for Typeform embed
```

### State Functions
```javascript
const openTypeformModal = () => {
  setTypeformModalActive(true);
  document.body.style.overflow = 'hidden';  // Prevent background scroll
};

const closeTypeformModal = () => {
  setTypeformModalActive(false);
  document.body.style.overflow = 'auto';    // Restore scroll
};

const openGameModal = () => {
  setGameModalActive(true);
  document.body.style.overflow = 'hidden';
};

const closeGameModal = () => {
  setGameModalActive(false);
  document.body.style.overflow = 'auto';
};
```

---

## ### EFFECTS ###

### 1. Feather Icons Initialization
```javascript
useEffect(() => {
  if (window.feather) {
    window.feather.replace();
  }
}, []);
```

### 2. Re-initialize Icons on Modal Open
```javascript
useEffect(() => {
  if (typeformModalActive && window.feather) {
    setTimeout(() => window.feather.replace(), 100);
  }
}, [typeformModalActive]);
```

### 3. Typeform Embed Loading
```javascript
useEffect(() => {
  if (typeformModalActive && typeformContainerRef.current) {
    // Clear previous content
    typeformContainerRef.current.innerHTML = '';

    // Create data-tf-live div
    const tfDiv = document.createElement('div');
    tfDiv.setAttribute('data-tf-live', '01JTV62WNGXMDX830477HVX7NZ');
    tfDiv.style.width = '100%';
    tfDiv.style.height = '100%';
    typeformContainerRef.current.appendChild(tfDiv);

    // Load Typeform script if needed
    if (!document.querySelector('script[src*="embed.typeform.com"]')) {
      const script = document.createElement('script');
      script.src = '//embed.typeform.com/next/embed.js';
      document.body.appendChild(script);
    } else if (window.tf && window.tf.load) {
      window.tf.load();  // Re-scan for new embeds
    }
  }
}, [typeformModalActive]);
```

### 4. ESC Key Handler (Handles Both Modals)
```javascript
useEffect(() => {
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      if (typeformModalActive) closeTypeformModal();
      if (gameModalActive) closeGameModal();
    }
  };

  document.addEventListener('keydown', handleEscKey);
  return () => document.removeEventListener('keydown', handleEscKey);
}, [typeformModalActive, gameModalActive]);
```

---

## ### PAGE_SECTIONS ###

### 1. Hero Section
| Element | Description |
|---------|-------------|
| `.hero-section` | Container with video background |
| `.hero-video-background` | Auto-playing muted loop video |
| `.hero-overlay` | Semi-transparent white overlay (85% opacity) |
| `.hero-badge` | "WE'RE HIRING" pill badge with zap icon |
| `.hero-title` | "Split Lease Careers" with "Start Here" highlight |
| `.hero-subtitle` | Mission statement text |
| `.cta-primary` | "Join our team" button linking to #roles |

### 2. Mission Section
| Element | Description |
|---------|-------------|
| `.mission-grid` | Two-column layout (examples + content) |
| `.mission-examples` | 3 user example cards (Sarah, Marcus, Jenna) |
| `.example-card` | Card with avatar, pattern, review, timeline |
| `.mission-content` | Section title + description |
| `.section-links` | Links to interactive game (opens modal), academic article |

### 3. Company Journey Video Section
| Element | Description |
|---------|-------------|
| `.video-section` | White background video section |
| `.video-container-wrapper` | Two-column grid (content + video) |
| `.video-player-container` | Video wrapper with play overlay |
| `.play-button-overlay` | Click-to-play purple button |
| `.video-caption` | "A time-lapse of Split Lease in motion" |

### 4. Values Section
| Element | Description |
|---------|-------------|
| `.values-grid` | 4-column responsive grid |
| `.value-item` | Card with icon, title, description |
| **Values**: | Speed, Build what's needed, Machine leverage, Always upgrading |

### 5. Why We'll Win Section (NEW)
| Element | Description |
|---------|-------------|
| `.content-section` | White background section |
| `.section-header` | Section label, title, description |
| **Content**: | Future vision combining pretotyping, AI, and consumer behavior research |

### 6. How We Work Section
| Element | Description |
|---------|-------------|
| `.process-steps` | Vertical step list |
| `.step-item` | Card with numbered circle + content |
| **Steps**: | Apply -> Show us your thinking -> Join the trial |

### 7. What's Inside Section
| Element | Description |
|---------|-------------|
| `.resources-list` | 2-column grid of resource items |
| `.resource-item` | Icon + text description |
| **Resources**: | Library, Typeform modules, Loom recordings, Slack knowledge, AI tools, Quiz |

### 8. Resources Section
| Element | Description |
|---------|-------------|
| `.resources-grid` | 2-column grid of PDF cards |
| `.resource-card` | Clickable card linking to PDF |
| **PDFs**: | What-Is-MultiLocal.pdf, Refactoring-UI.pdf |

### 9. Open Roles Section
| Element | Description |
|---------|-------------|
| `#roles` | Anchor ID for hero CTA |
| `.roles-list` | Vertical role card list |
| `.role-card` | Job posting with apply button |
| **Current Role**: | Executive Assistant (Remote, Full-time) |

---

## ### EXAMPLE_CARDS ###

3 user personas demonstrating Split Lease usage:

### Sarah
| Field | Value |
|-------|-------|
| Location | Lives in Philly |
| Pattern | Mon-Wed in NYC |
| Quote | "Before Split Lease, my life was a nightmare..." |
| Timeline | Active days: Mon, Tue, Wed |

### Marcus
| Field | Value |
|-------|-------|
| Location | Lives in Boston |
| Pattern | Thu-Sun in NYC |
| Quote | "I was burning out from the weekly grind..." |
| Timeline | Active days: Thu, Fri, Sat, Sun |

### Jenna
| Field | Value |
|-------|-------|
| Location | Lives in DC |
| Pattern | Mon-Thu in NYC |
| Quote | "I thought I had to choose between my career and quality of life..." |
| Timeline | Active days: Mon, Tue, Wed, Thu |

### Hover Behavior
- Header (avatar + name) fades out
- Pattern text fades out
- Review quote fades in
- Timeline fades out

---

## ### VALUES_CONTENT ###

| Value | Icon | Description |
|-------|------|-------------|
| Speed and iteration | zap | We ship fast, test quickly, and improve daily |
| Build what's needed | globe | No skyscrapers in small towns - we stay balanced |
| Machine leverage | users | We automate busy work to focus on what matters most |
| Always upgrading | book | We delete the old to make space for new ideas |

---

## ### WHY_WELL_WIN_CONTENT ###

| Field | Value |
|-------|-------|
| Label | WHY WE'LL WIN |
| Title | Built for the Future |
| Description | The world is changing fast - and so are the ways people live. We're combining pretotyping, AI, and insights from consumer behavior research to design products that meet real human needs. When flexibility becomes the new normal, we'll be ready. |

---

## ### PROCESS_STEPS ###

| Step | Title | Description |
|------|-------|-------------|
| 1 | Apply | Submit your application and answer a few quick questions |
| 2 | Show us your thinking | Record a short usability test video |
| 3 | Join the trial | Work with us for 3 weeks, collaborate on real projects |

**Post-steps note**: Everyone who completes a usability test gets access to our knowledge base - a library filled with product ideas, team resources, and ways to stay connected with us.

---

## ### TYPEFORM_INTEGRATION ###

### Form Configuration
| Setting | Value |
|---------|-------|
| Form ID | `01JTV62WNGXMDX830477HVX7NZ` |
| Embed Type | Live embed (`data-tf-live`) |
| SDK URL | `//embed.typeform.com/next/embed.js` |

### Modal Structure
```jsx
<div className={`modal ${typeformModalActive ? 'active' : ''}`} onClick={handleBackdropClick}>
  <div className="modal-content">
    <button className="modal-close" onClick={closeTypeformModal}>
      <i data-feather="x"></i>
    </button>
    <div ref={typeformContainerRef} style={{ width: '100%', height: '100%' }}></div>
  </div>
</div>
```

### Modal Trigger
```jsx
<button className="apply-button" onClick={openTypeformModal}>
  Apply Now
  <i data-feather="arrow-right"></i>
</button>
```

---

## ### GAME_MODAL_INTEGRATION ###

### Modal Configuration
| Setting | Value |
|---------|-------|
| Game Source | `/assets/games/schedule-matcher.html` |
| Modal Size | 98vw x 98vh |
| Background | rgba(0, 0, 0, 0.8) |
| Border Radius | 12px |

### Modal Structure
```jsx
{gameModalActive && (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) closeGameModal();
    }}
  >
    <div style={{
      width: '98vw',
      height: '98vh',
      background: 'white',
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <button onClick={closeGameModal} style={{ /* close button styles */ }}>
        x
      </button>
      <iframe
        src="/assets/games/schedule-matcher.html"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="Schedule Matcher Game"
      />
    </div>
  </div>
)}
```

### Modal Trigger
```jsx
<a href="#" className="section-link" onClick={(e) => { e.preventDefault(); openGameModal(); }}>
  <i data-feather="play-circle" style={{width: '18px', height: '18px'}}></i>
  <span>Start with our interactive game</span>
  <i data-feather="arrow-right"></i>
</a>
```

---

## ### VIDEO_PLAYER ###

### Hero Background Video
```jsx
<video autoPlay muted loop playsInline className="hero-video-background" id="heroVideo">
  <source src="/assets/videos/time-lapse.mp4" type="video/mp4" />
</video>
```

### Company Journey Video (Click to Play)
```jsx
<video className="video-player" id="careerVideo" preload="metadata">
  <source src="/assets/videos/time-lapse.mp4" type="video/mp4" />
</video>
<div className="play-button-overlay" id="playButtonOverlay" onClick={() => {
  const video = document.getElementById('careerVideo');
  if (video) {
    video.play();
    video.setAttribute('controls', 'controls');
    document.getElementById('playButtonOverlay').classList.add('hidden');
  }
}}>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
</div>
```

---

## ### CSS_VARIABLES ###

```css
:root {
  --gradient-purple-blue: linear-gradient(135deg, #31135D 0%, #4A2F7C 50%, #5B21B6 100%);
  --gradient-purple-pink: linear-gradient(135deg, #31135D 0%, #6B21A8 50%, #A855F7 100%);
  --brand-purple: #31135D;
}
```

---

## ### CSS_CLASSES ###

### Hero Section
| Class | Purpose |
|-------|---------|
| `.hero-section` | Full-width container with min-height 500px |
| `.hero-video-background` | Absolute positioned cover video |
| `.hero-overlay` | White semi-transparent overlay |
| `.hero-container` | Centered content wrapper (max-width 900px) |
| `.hero-badge` | Pill badge with icon + text |
| `.hero-title` | 56px bold title |
| `.hero-title .highlight` | Purple colored span |
| `.hero-subtitle` | 20px gray description |
| `.hero-cta` | CTA button container |
| `.cta-primary` | Purple gradient button with arrow |

### Content Sections
| Class | Purpose |
|-------|---------|
| `.content-section` | Standard section (80px padding) |
| `.content-section.alt-bg` | Gray background (#f7f8f9) |
| `.section-container` | Max-width 1000px centered |
| `.section-header` | Section title area |
| `.section-label` | Uppercase 14px purple label |
| `.section-title` | 40px bold black title |
| `.section-description` | 18px gray paragraph |
| `.section-link` | Purple link with icon + arrow |

### Example Cards
| Class | Purpose |
|-------|---------|
| `.mission-grid` | Two-column grid layout |
| `.mission-examples` | Vertical card stack |
| `.example-card` | 180px height card with hover effects |
| `.example-header` | Avatar + name row |
| `.example-avatar` | 48px circular image |
| `.example-name` | 18px bold name |
| `.example-pattern` | Schedule description |
| `.example-review` | Italic quote (hidden by default) |
| `.example-timeline` | Day block row |
| `.day-block` | 8px height gray bar |
| `.day-block.active` | Purple gradient fill |
| `.timeline-labels` | Mon/Sun labels |

### Values Grid
| Class | Purpose |
|-------|---------|
| `.values-grid` | Auto-fit grid (min 240px) |
| `.value-item` | White card with border |
| `.value-icon` | Purple 40px icon |
| `.value-title` | 18px bold title |
| `.value-description` | 15px gray text |

### Process Steps
| Class | Purpose |
|-------|---------|
| `.process-steps` | Step container |
| `.step-item` | Horizontal card with number |
| `.step-number` | 48px purple circle |
| `.step-content` | Title + description |
| `.step-title` | 18px bold |
| `.step-description` | 15px gray |

### Resources List
| Class | Purpose |
|-------|---------|
| `.resources-list` | Auto-fit grid (min 280px) |
| `.resource-item` | Icon + text card |
| `.resource-icon` | 32px purple icon |
| `.resource-text` | 16px text |

### Roles Section
| Class | Purpose |
|-------|---------|
| `.roles-list` | Vertical card list |
| `.role-card` | White card with 2px border |
| `.role-header` | Title + apply button row |
| `.role-title` | 28px bold |
| `.role-meta` | Location + type badges |
| `.role-location`, `.role-type` | Icon + text badge |
| `.apply-button` | Purple gradient button |
| `.role-description` | 16px description |

### Video Section
| Class | Purpose |
|-------|---------|
| `.video-section` | White background section |
| `.video-container-wrapper` | Two-column grid |
| `.video-content` | Text content column |
| `.video-player-container` | Video wrapper with border-radius |
| `.video-player` | Full-width video (scale 1.15 zoom) |
| `.play-button-overlay` | 80px purple play button |
| `.play-button-overlay.hidden` | Hidden after click |
| `.video-caption` | 14px italic caption |

### Modal (Typeform)
| Class | Purpose |
|-------|---------|
| `.modal` | Fixed overlay (hidden by default) |
| `.modal.active` | Visible flex display |
| `.modal-content` | 90% width, max 800px white card |
| `.modal-close` | 48px circular close button |

---

## ### RESPONSIVE_BREAKPOINTS ###

### 768px (Tablet)
| Change | Value |
|--------|-------|
| `.hero-title` | 32px font |
| `.hero-subtitle` | 16px font |
| `.section-title` | 28px font |
| `.values-grid` | Single column |
| `.resources-list` | Single column |
| `.step-item` | Vertical layout |
| `.video-container-wrapper` | Single column |
| `.mission-grid` | Single column |
| `.role-header` | Vertical layout |
| `.apply-button` | Full width |
| `.hero-section` | 80px top padding |
| `.content-section` | 50px padding |

### 480px (Mobile)
| Change | Value |
|--------|-------|
| `.hero-title` | 28px font |
| `.section-title` | 24px font |
| `.cta-primary`, `.apply-button` | 14px padding |
| `.example-card` | 160px height |
| `.role-meta` | Vertical layout |

---

## ### EXTERNAL_DEPENDENCIES ###

### Scripts (loaded in HTML)
| Dependency | Source | Purpose |
|------------|--------|---------|
| Feather Icons | unpkg.com/feather-icons | Icon library |
| Typeform SDK | embed.typeform.com/next/embed.js | Application form |

### Fonts (loaded in HTML)
| Font | Weights | Purpose |
|------|---------|---------|
| Inter | 400, 500, 600, 700 | Primary UI font |
| DM Sans | 400, 700 | Secondary font |

### Assets
| Asset | Path | Usage |
|-------|------|-------|
| Time-lapse video | `/assets/videos/time-lapse.mp4` | Hero + Company video |
| Schedule Matcher game | `/assets/games/schedule-matcher.html` | Interactive game modal |
| MultiLocal PDF | `/assets/resources/What-Is-MultiLocal.pdf` | Downloadable resource |
| Refactoring UI PDF | `/assets/resources/Refactoring-UI.pdf` | Downloadable resource |
| Sarah avatar | Unsplash (external) | Example card |
| Marcus avatar | Unsplash (external) | Example card |
| Jenna avatar | Unsplash (external) | Example card |

---

## ### FEATHER_ICONS_USED ###

| Icon | Location |
|------|----------|
| `zap` | Hero badge, Values (Speed) |
| `arrow-right` | CTA button, Section links, Apply button |
| `play-circle` | Mission section link (game modal trigger) |
| `book-open` | Mission section link, What's Inside |
| `edit-3` | Company section link |
| `globe` | Values (Build what's needed) |
| `users` | Values (Machine leverage) |
| `book` | Values (Always upgrading) |
| `cpu` | What's Inside (Typeform modules) |
| `video` | What's Inside (Loom recordings) |
| `message-circle` | What's Inside (Slack knowledge) |
| `settings` | What's Inside (AI tools) |
| `target` | What's Inside (Quiz) |
| `map` | Resources (MultiLocal PDF) |
| `layers` | Resources (Refactoring UI PDF) |
| `download` | Resource card CTA |
| `map-pin` | Role location |
| `clock` | Role type |
| `x` | Modal close button |

---

## ### KEY_IMPORTS ###

```javascript
// React hooks
import { useState, useEffect, useRef } from 'react';

// Shared components
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';

// Constants (imported but unused in current implementation)
import { SIGNUP_LOGIN_URL } from '../../lib/constants.js';
```

---

## ### HTML_STRUCTURE ###

```html
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Join Split Lease: We're redefining the way people live, work, and share space. Building tools for multilocal living.">
  <title>Careers at Split Lease | Join Our Team</title>
  <link rel="icon" type="image/png" href="/assets/images/split-lease-purple-circle.png">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap" rel="stylesheet">

  <!-- Styles -->
  <link rel="stylesheet" href="/src/styles/main.css">
  <link rel="stylesheet" href="/src/styles/careers.css">

  <!-- Config (Hotjar) -->
  <script type="module" src="/src/lib/config.js"></script>
  <script type="module" src="/src/lib/hotjar.js"></script>

  <!-- External Scripts -->
  <script src="https://unpkg.com/feather-icons"></script>
  <script src="//embed.typeform.com/next/embed.js"></script>
</head>
<body>
  <div id="careers-page"></div>
  <script type="module" src="/src/careers.jsx"></script>
</body>
</html>
```

---

## ### COMPONENT_FLOW ###

```
Page Load
    |
    +-- Mount CareersPage to #careers-page
    |
    +-- Initialize Feather icons (useEffect)
    |
    +-- Render page sections
    |
    +-- User clicks "Apply Now" button
    |       |
    |       +-- openTypeformModal()
    |               |
    |               +-- Set typeformModalActive = true
    |               +-- Disable body scroll
    |               +-- useEffect triggers Typeform embed load
    |               +-- Re-initialize Feather icons
    |
    +-- User clicks "Start with our interactive game" link
    |       |
    |       +-- openGameModal()
    |               |
    |               +-- Set gameModalActive = true
    |               +-- Disable body scroll
    |               +-- Render game iframe
    |
    +-- User presses ESC or clicks backdrop
            |
            +-- closeTypeformModal() or closeGameModal()
                    +-- Set respective modal state = false
                    +-- Restore body scroll
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| Icons not appearing | Verify Feather script loaded, check `window.feather.replace()` |
| Typeform not loading | Check form ID, verify SDK script loaded |
| Modal not closing | Check ESC handler, verify backdrop click handler |
| Game modal not opening | Check `openGameModal` function, verify click handler on link |
| Game iframe blank | Verify `/assets/games/schedule-matcher.html` exists |
| Video not playing | Check video file path, verify browser autoplay policy |
| Styles broken | Verify CSS imports in HTML, check careers.css loading |
| Layout issues | Check responsive breakpoint CSS |
| PDF download fails | Verify files exist in `/assets/resources/` |
| Hover effects not working | Check CSS transition and transform properties |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Styles CLAUDE.md | `app/src/styles/CLAUDE.md` |
| Islands CLAUDE.md | `app/src/islands/CLAUDE.md` |
| Pages CLAUDE.md | `app/src/islands/pages/CLAUDE.md` |
| Vite Config | `app/vite.config.js` |
| Routes Config | `app/src/routes.config.js` |

---

## ### NOTES ###

### Unused Import
The `SIGNUP_LOGIN_URL` constant is imported but not used in the current CareersPage implementation. It may have been intended for a login/signup integration that was not implemented.

### Video Zoom Effect
The company journey video has a `transform: scale(1.15)` applied to create a subtle zoom effect. This creates a cropped view initially that reveals more content when clicked.

### No State Persistence
Unlike other pages, the Careers page does not use localStorage or URL parameters for state persistence. All state is ephemeral and resets on page reload.

### External Images
User avatar images are loaded from Unsplash URLs. These are external dependencies and may change or become unavailable.

### Two Modal Systems
The page uses two different modal implementations:
1. **Typeform Modal**: Uses CSS classes (`.modal`, `.modal.active`) for visibility
2. **Game Modal**: Uses conditional rendering (`{gameModalActive && ...}`) with inline styles

### Interactive Game
The "Start with our interactive game" link now opens a modal containing the Schedule Matcher game (`/assets/games/schedule-matcher.html`) instead of navigating away from the page.

---

**VERSION**: 2.0
**LAST_UPDATED**: 2025-12-11
**STATUS**: Comprehensive documentation of Careers page (updated to reflect current implementation)
