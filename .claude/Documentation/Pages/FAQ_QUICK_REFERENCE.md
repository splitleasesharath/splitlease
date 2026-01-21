# FAQ Page - Quick Reference

**GENERATED**: 2026-01-20
**PAGE_URL**: `/faq.html` or `/faq?section={tab}&question={id}`
**ENTRY_POINT**: `app/src/faq.jsx`

---

## ### ARCHITECTURE_OVERVIEW ###

```
faq.jsx (Entry Point)
    |
    +-- FAQPage.jsx (Main Component)
            |
            +-- State Management (built-in hooks)
            |       +-- activeTab: 'general' | 'travelers' | 'hosts'
            |       +-- faqs: { general: [], travelers: [], hosts: [] }
            |       +-- loading / error states
            |       +-- openQuestionId: deep-link target
            |       +-- Modal state (showInquiryModal, inquiryForm, submitting)
            |
            +-- UI Components
            |   +-- Header.jsx (Site navigation)
            |   +-- Hero Section (Purple banner)
            |   +-- Tab Navigation (3 tabs)
            |   +-- FAQContent (Sub-component)
            |   |       +-- Accordion items grouped by sub-category
            |   |       +-- Auto-scroll to deep-linked question
            |   +-- Bottom CTA ("Can't find the answer?")
            |   +-- Inquiry Modal
            |   +-- Footer.jsx
            |
            +-- Supabase Query
            |       +-- zat_faq table
            |       +-- Ordered by Category, sub-category
            |
            +-- Slack Service Integration
                    +-- sendFaqInquiry (via Cloudflare Pages Function)
```

---

## ### FILE_INVENTORY ###

### Entry Point
| File | Purpose |
|------|---------|
| `app/src/faq.jsx` | Mounts FAQPage to #faq-page |

### HTML Template
| File | Purpose |
|------|---------|
| `app/public/faq.html` | Static HTML entry with meta tags, stylesheets, Hotjar integration |

### Page Component
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FAQPage.jsx` | Main component + FAQContent sub-component (411 lines) |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/faq.css` | Complete page styling (852 lines) |

### Services
| File | Purpose |
|------|---------|
| `app/src/lib/slackService.js` | Slack service for FAQ inquiries via Cloudflare Pages Function |

### Serverless Function
| File | Purpose |
|------|---------|
| `app/functions/api/faq-inquiry.js` | Cloudflare Pages Function for inquiry submission |

---

## ### URL_ROUTING ###

```
/faq.html                                    # Default - General tab
/faq.html?section=general                    # General tab (explicit)
/faq.html?section=travelers                  # For Guests tab
/faq.html?section=guests                     # Alias for travelers
/faq.html?section=hosts                      # For Hosts tab
/faq.html?section=host                       # Alias for hosts
/faq.html?question={questionId}              # Deep-link to specific question
/faq.html?section=travelers&question={id}    # Tab + specific question
```

### URL Parameter Parsing
```javascript
// In FAQPage.jsx useEffect
const params = new URLSearchParams(window.location.search);
const section = params.get('section');      // Tab selection
const question = params.get('question');    // Question ID to open

// Section mapping
const sectionMap = {
  'travelers': 'travelers',
  'hosts': 'hosts',
  'general': 'general',
  'guest': 'travelers',   // Alias
  'host': 'hosts'         // Alias
};
```

---

## ### STATE_MANAGEMENT ###

### Primary State
| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `activeTab` | string | `'general'` | Current tab selection |
| `faqs` | object | `{ general: [], travelers: [], hosts: [] }` | FAQ data grouped by tab |
| `loading` | boolean | `true` | Loading indicator |
| `error` | string/null | `null` | Error message |
| `openQuestionId` | string/null | `null` | Deep-linked question ID |

### Modal State
| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `showInquiryModal` | boolean | `false` | Modal visibility |
| `inquiryForm` | object | `{ name: '', email: '', inquiry: '' }` | Form data |
| `submitting` | boolean | `false` | Submission in progress |
| `submitSuccess` | boolean | `false` | Successful submission |
| `submitError` | string/null | `null` | Submission error message |

---

## ### DATABASE_STRUCTURE ###

### Table: `zat_faq`
| Field | Type | Purpose |
|-------|------|---------|
| `_id` | UUID | Primary key, used for deep-linking |
| `Question` | text | FAQ question text |
| `Answer` | text | FAQ answer text |
| `Category` | text | Tab category ('General', 'Guest', 'Host') |
| `sub-category` | text | Sub-grouping within category |

### Category Mapping
| Database Value | Tab Name | Display Label |
|----------------|----------|---------------|
| `'General'` | `general` | "General Questions" |
| `'Guest'` | `travelers` | "For Guests" |
| `'Host'` | `hosts` | "For Hosts" |

### Supabase Query
```javascript
const { data, error } = await supabase
  .from('zat_faq')
  .select('_id, Question, Answer, Category, sub-category')
  .order('Category', { ascending: true })
  .order('sub-category', { ascending: true });
```

---

## ### TAB_NAVIGATION ###

### Tab Configuration
| Tab ID | Label | Database Category |
|--------|-------|-------------------|
| `general` | "General Questions" | `'General'` |
| `travelers` | "For Guests" | `'Guest'` |
| `hosts` | "For Hosts" | `'Host'` |

### Tab Behavior
```javascript
const handleTabClick = (tabName) => {
  setActiveTab(tabName);
};
```

### Active State
- Active tab has `.active` class
- Uses `aria-selected` for accessibility
- Content panels use `.tab-content.active` for visibility

---

## ### ACCORDION_COMPONENT ###

### FAQContent Sub-Component
```jsx
function FAQContent({ faqs, openQuestionId }) {
  const [activeAccordion, setActiveAccordion] = useState(null);

  // Auto-open question from URL parameter
  useEffect(() => {
    if (openQuestionId && faqs && faqs.length > 0) {
      const questionIndex = faqs.findIndex(faq =>
        // First try to match by exact _id
        (faq._id && faq._id.toString() === openQuestionId) ||
        // Then try to match by question text
        faq.Question.toLowerCase().includes(openQuestionId) ||
        faq.Question.toLowerCase().replace(/[^a-z0-9]/g, '').includes(openQuestionId.replace(/[^a-z0-9]/g, ''))
      );

      if (questionIndex !== -1) {
        setActiveAccordion(questionIndex);
        // Scroll into view
        setTimeout(() => {
          const element = document.querySelector(`[data-question-index="${questionIndex}"]`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [openQuestionId, faqs]);

  // Group by sub-category
  // Render accordion items
}
```

### Accordion Structure
```
faq-section (sub-category group)
    |
    +-- section-title (sub-category name, h2)
    |
    +-- accordion-item
            |
            +-- accordion-header (clickable, role="button")
            |       +-- accordion-icon (arrow)
            |       +-- h3 (question text)
            |
            +-- accordion-content (collapsible)
                    +-- accordion-content-inner
                            +-- p (answer text)
```

### Accordion State
- `activeAccordion` stores the global index of the open item
- Only one item open at a time
- Clicking same item closes it

---

## ### INQUIRY_MODAL ###

### Form Fields
| Field | Required | Validation |
|-------|----------|------------|
| `name` | Yes | Non-empty (trimmed) |
| `email` | Yes | Email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `inquiry` | Yes | Non-empty (trimmed) |

### Form Submission Flow
```
1. User clicks "Can't find the answer?" CTA
2. Modal opens (setShowInquiryModal(true))
3. User fills form fields
4. Submit button triggers handleInquirySubmit
5. Client-side validation (required fields, email format)
6. Call sendFaqInquiry from slackService.js
7. sendFaqInquiry POSTs to /api/faq-inquiry (Cloudflare Pages Function)
8. On success: Show success message, auto-close after 2s
9. On error: Show error message, keep modal open
```

### Modal States
| State | Display |
|-------|---------|
| Form (default) | Input fields + Submit button |
| Submitting | Form disabled, "Sending..." button |
| Success | Green checkmark + "Thank you!" message |
| Error | Form + red error banner |

---

## ### SLACK_SERVICE ###

### Module: `app/src/lib/slackService.js`

The FAQ inquiry submission is handled through a dedicated Slack service module that wraps the Cloudflare Pages Function call.

```javascript
import { sendFaqInquiry } from '../../lib/slackService.js';

// Usage in FAQPage.jsx
await sendFaqInquiry({ name, email, inquiry });
```

### Service Features
- Input validation (trims and checks for empty values)
- NO FALLBACK policy: throws errors on failure
- Console logging for debugging
- Wraps fetch call to `/api/faq-inquiry`

### Why Cloudflare Pages Function?
Per slackService.js comments:
> "Switched from Supabase Edge Functions due to known bug where secrets don't propagate to Edge Functions (GitHub issue #38329). Cloudflare Pages Functions work correctly with secrets."

---

## ### SERVERLESS_FUNCTION ###

### Endpoint: POST `/api/faq-inquiry`

### Request
```json
{
  "name": "string",
  "email": "string",
  "inquiry": "string"
}
```

### Response Codes
| Status | Body | Meaning |
|--------|------|---------|
| 200 | `{ success: true, message: "Inquiry sent successfully" }` | Success |
| 400 | `{ error: "All fields are required" }` | Missing fields |
| 400 | `{ error: "Invalid email address" }` | Email validation failed |
| 500 | `{ error: "Server configuration error" }` | Missing Slack webhooks |
| 500 | `{ error: "Failed to send inquiry to Slack" }` | Slack API failed |
| 500 | `{ error: "Internal server error" }` | Unexpected error |

### Environment Variables
| Variable | Purpose |
|----------|---------|
| `SLACK_WEBHOOK_ACQUISITION` | Slack channel for acquisition team |
| `SLACK_WEBHOOK_GENERAL` | Slack general channel |

### Slack Message Format
```javascript
const slackMessage = {
  text: `*New FAQ Inquiry*\n\n*Name:* ${name}\n*Email:* ${email}\n*Inquiry:*\n${inquiry}`
};
```

### CORS Headers
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};
```

### Handler Functions
| Export | Purpose |
|--------|---------|
| `onRequestOptions` | Handle CORS preflight requests (204 response) |
| `onRequestPost` | Handle POST requests with inquiry data |

---

## ### CSS_STRUCTURE ###

### Page Layout Classes
| Class | Purpose |
|-------|---------|
| `.hero` | Purple header section (background: #31135d) |
| `.hero-title` | Main heading (clamp 22px-28px) |
| `.hero-subtitle` | Subheading text |
| `.tabs-container` | Sticky tab bar (top: 70px, z-index: 999) |
| `.tabs` | Flexbox tab container (max-width: 900px) |
| `.tab` | Individual tab button (pill style) |
| `.tab.active` | Active tab (purple background) |
| `.faq-container` | Main content area (max-width: 900px) |
| `.tab-content` | Tab panel (display: none by default) |
| `.tab-content.active` | Visible tab panel |
| `.bottom-cta` | Footer CTA section |

### Accordion Classes
| Class | Purpose |
|-------|---------|
| `.faq-section` | Sub-category group |
| `.section-title` | Sub-category heading (purple, border-bottom) |
| `.accordion-item` | FAQ item container |
| `.accordion-item.active` | Expanded item |
| `.accordion-header` | Clickable header row (role="button") |
| `.accordion-icon` | Arrow icon (transforms on active) |
| `.accordion-content` | Collapsible content (max-height transition) |
| `.accordion-content-inner` | Content padding wrapper |

### Modal Classes
| Class | Purpose |
|-------|---------|
| `.modal-overlay` | Dark backdrop (rgba(0,0,0,0.5), z-index: 10000) |
| `.modal-content` | White modal box (max-width: 500px) |
| `.modal-close` | X button (40px, top-right) |
| `.modal-title` | Modal heading (28px) |
| `.modal-subtitle` | Modal description |
| `.inquiry-form` | Form container (flex column, gap: 20px) |
| `.form-group` | Label + input wrapper |
| `.submit-btn` | Submit button (purple #31135d) |
| `.error-message-form` | Error banner (red) |
| `.success-message` | Success state container |
| `.success-icon` | Green checkmark circle (64px) |

### State Classes
| Class | Purpose |
|-------|---------|
| `.loading-container` | Loading state wrapper |
| `.spinner` | CSS spinner animation |
| `.error-container` | Error state wrapper |
| `.error-message` | Error text styling |
| `.retry-btn` | Retry button |

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `min-width: 768px` | Hero padding increases |
| `< 1024px` | Market research widget width reduced (360px) |
| `< 768px` | Tabs overflow-x scroll, FAQ container margin/padding reduced, widgets hidden |
| `< 480px` | Compact padding, smaller fonts, accordion header 14px, modal padding reduced |

### Mobile Adjustments
```css
@media (max-width: 768px) {
  .tabs { overflow-x: auto; }
  .faq-container { padding: 20px; margin: 16px; }
  .market-research-widget { display: none; }
}

@media (max-width: 480px) {
  .faq-container { padding: 16px; margin: 12px; }
  .accordion-header { padding: 14px; }
  .accordion-header h3 { font-size: 14px; }
  .modal-content { padding: 30px 24px; }
  .modal-title { font-size: 24px; }
}
```

---

## ### COLOR_SCHEME ###

| Element | Color | Usage |
|---------|-------|-------|
| Primary Purple | `#31135d` | Hero bg, active tab, links, icons, buttons |
| Primary Hover | `#1e0a37` | Button hover states |
| Section Border | `#F3E5F5` | Section title underline |
| Text Primary | `#2C2C2C` | Question text |
| Text Secondary | `#555` | Answer text, descriptions, inactive tabs |
| Answer Highlight | `#31135d` | Answer paragraph text |
| Border | `#E0E0E0` | Tab border, accordion dividers, tabs-container |
| Background Hover | `#F9F9F9` | Accordion hover state, active accordion header |
| Tab Inactive | `#F5F5F5` | Inactive tab background |
| Success | `#4CAF50` | Success icon, info-box success |
| Error | `#c33` | Error messages |
| Error Background | `#fee` | Error banner background |

---

## ### ACCESSIBILITY ###

### Keyboard Navigation
```javascript
const handleKeyPress = (e, index) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleAccordion(index);
  }
};
```

### ARIA Attributes
| Element | Attribute | Value |
|---------|-----------|-------|
| Tab button | `role` | `tab` |
| Tab button | `aria-selected` | `true/false` |
| Accordion header | `role` | `button` |
| Accordion header | `tabIndex` | `0` |
| Accordion header | `aria-expanded` | `true/false` |
| Modal close | `aria-label` | `"Close modal"` |

### Form Accessibility
- Labels associated with inputs via `htmlFor`
- Required fields marked with `*` in label
- Disabled state handled with `disabled` attribute
- Focus styles on inputs (border-color: #31135d, box-shadow)

---

## ### DATA_FLOW ###

### 1. Initial Load
```javascript
useEffect(() => {
  // Parse URL params
  const params = new URLSearchParams(window.location.search);
  const section = params.get('section');
  const question = params.get('question');

  // Set tab from URL
  if (section) {
    const mappedSection = sectionMap[section.toLowerCase()];
    if (mappedSection) setActiveTab(mappedSection);
  }

  // Store question ID for FAQContent
  if (question) setOpenQuestionId(question.toLowerCase());

  // Fetch FAQs
  loadFAQs();
}, []);
```

### 2. FAQ Fetch & Grouping
```javascript
async function loadFAQs() {
  try {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('zat_faq')
      .select('_id, Question, Answer, Category, sub-category')
      .order('Category', { ascending: true })
      .order('sub-category', { ascending: true });

    if (fetchError) throw fetchError;

    // Map tab names to database Category values
    const categoryMapping = {
      'general': 'General',
      'travelers': 'Guest',
      'hosts': 'Host'
    };

    // Group FAQs by category
    const grouped = { general: [], travelers: [], hosts: [] };
    data.forEach(faq => {
      for (const [tabName, dbCategory] of Object.entries(categoryMapping)) {
        if (faq.Category === dbCategory) {
          grouped[tabName].push(faq);
          break;
        }
      }
    });

    setFaqs(grouped);
  } catch (err) {
    console.error('Error loading FAQs:', err);
    setError('Unable to load FAQs. Please try again later.');
  } finally {
    setLoading(false);
  }
}
```

### 3. Sub-Category Grouping (in FAQContent)
```javascript
const faqsBySubCategory = {};
faqs.forEach(faq => {
  const subCat = faq['sub-category'] || 'General';
  if (!faqsBySubCategory[subCat]) {
    faqsBySubCategory[subCat] = [];
  }
  faqsBySubCategory[subCat].push(faq);
});
```

---

## ### KEY_IMPORTS ###

```javascript
// FAQPage.jsx
import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { supabase } from '../../lib/supabase.js';
import { sendFaqInquiry } from '../../lib/slackService.js';
```

---

## ### COMPONENT_STRUCTURE ###

```
FAQPage (parent)
   Header
   <section class="hero">
      <h1 class="hero-title">Hi there! How can we help you?
      <p class="hero-subtitle">Select one of our pre-sorted categories
   <div class="tabs-container">
      <div class="tabs">
          <button class="tab" role="tab">General Questions</button>
          <button class="tab" role="tab">For Guests</button>
          <button class="tab" role="tab">For Hosts</button>
   <main class="faq-container">
      Loading State (if loading)
         <div class="loading-container">
            <div class="spinner">
            <p>Loading FAQs...
      Error State (if error)
         <div class="error-container">
            <p class="error-message">
            <button class="retry-btn">Retry
      Tab Contents (if !loading && !error)
          <div class="tab-content">
             FAQContent faqs={faqs.general} openQuestionId={...}
          <div class="tab-content">
             FAQContent faqs={faqs.travelers} openQuestionId={...}
          <div class="tab-content">
              FAQContent faqs={faqs.hosts} openQuestionId={...}
   <section class="bottom-cta">
      <a class="cta-link" onClick={openInquiryModal}>Can't find the answer...?
   Inquiry Modal (if showInquiryModal)
      <div class="modal-overlay" onClick={closeInquiryModal}>
         <div class="modal-content" onClick={stopPropagation}>
             <button class="modal-close" aria-label="Close modal">&times;
             <h2 class="modal-title">Ask Us a Question
             <p class="modal-subtitle">We'll get back to you as soon as possible
             Success Message (if submitSuccess)
                 <div class="success-message">
                     <div class="success-icon">checkmark
                     <p>Thank you! Your inquiry has been sent successfully.
             Form (if !submitSuccess)
                 <form class="inquiry-form" onSubmit={handleInquirySubmit}>
                     <div class="form-group">Name input
                     <div class="form-group">Email input
                     <div class="form-group">Inquiry textarea
                     Error message (if submitError)
                         <div class="error-message-form">
                     <button class="submit-btn" disabled={submitting}>
   Footer
```

---

## ### HTML_TEMPLATE ###

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Split Lease - FAQ | Frequently Asked Questions</title>
  <meta name="description" content="Find answers to frequently asked questions about flexible periodic tenancy solutions in NYC.">
  <link rel="icon" type="image/png" href="/assets/images/split-lease-purple-circle.png">
  <link rel="stylesheet" href="/src/styles/main.css">
  <link rel="stylesheet" href="/src/styles/faq.css">

  <!-- Load environment config FIRST - required for Hotjar -->
  <script type="module" src="/src/lib/config.js"></script>
  <script type="module" src="/src/lib/hotjar.js"></script>
</head>
<body>
  <div id="faq-page"></div>
  <script type="module" src="/src/faq.jsx"></script>
</body>
</html>
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| FAQs not loading | Verify Supabase connection in `lib/supabase.js` |
| Wrong tab selected | Check `section` URL parameter spelling |
| Question not auto-opening | Verify `question` param matches `_id` or question text |
| Inquiry not sending | Check Cloudflare env vars for Slack webhooks |
| Inquiry fails silently | Check browser console for slackService.js logs |
| Modal not closing | Verify `closeInquiryModal` handler is attached |
| Accordion not animating | Check CSS `max-height` transition on `.accordion-content` |
| Deep-link scroll not working | Check `data-question-index` attribute and setTimeout delay |
| Tab styling broken | Verify `faq.css` is imported in `faq.html` |
| Hotjar not loading | Verify config.js loads before hotjar.js |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Source CLAUDE.md | `app/src/CLAUDE.md` |
| Pages CLAUDE.md | `app/src/islands/pages/CLAUDE.md` |
| Styles CLAUDE.md | `app/src/styles/CLAUDE.md` |
| Functions API CLAUDE.md | `app/functions/api/CLAUDE.md` |
| Database Tables | `Documentation/Database/DATABASE_TABLES_DETAILED.md` |
| Option Sets | `Documentation/Database/OPTION_SETS_DETAILED.md` |

---

## ### DEPENDENCIES ###

### npm Packages
| Package | Usage |
|---------|-------|
| `react` | useState, useEffect hooks |
| `react-dom/client` | createRoot for mounting |
| `@supabase/supabase-js` | Database queries |

### Environment Variables
| Variable | Location | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | `app/.env` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `app/.env` | Supabase anonymous key |
| `SLACK_WEBHOOK_ACQUISITION` | Cloudflare Dashboard | Slack webhook URL |
| `SLACK_WEBHOOK_GENERAL` | Cloudflare Dashboard | Slack webhook URL |

---

## ### WIDGET_COMPONENTS (CSS only, not implemented) ###

The CSS includes styles for widgets that are not currently implemented in the React component:

| Widget | Description | Status |
|--------|-------------|--------|
| `.market-research-widget` | Floating widget for market research | CSS only |
| `.ai-chat-widget` | AI chat interface | CSS only |
| `.floating-chat-btn` | Chat button | CSS only |

These may be future features or were removed from the component.

---

## ### CSS_ANIMATIONS ###

| Animation | Purpose | Properties |
|-----------|---------|------------|
| `spin` | Loading spinner | rotate 0-360deg, 1s linear infinite |
| `fadeIn` | Modal overlay | opacity 0-1, 0.2s ease |
| `slideUp` | Modal content | translateY 30px-0, opacity 0-1, 0.3s ease |
| `scaleIn` | Success icon | scale 0-1, 0.3s ease |

---

**VERSION**: 2.0
**LAST_UPDATED**: 2026-01-20
**STATUS**: Complete documentation of FAQ page architecture
