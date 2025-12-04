# FAQ Page - Quick Reference

**GENERATED**: 2025-12-04
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
                    +-- zat_faq table
                    +-- Ordered by Category, sub-category
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
| `app/public/faq.html` | Static HTML entry with meta tags, stylesheets |

### Page Component
| File | Purpose |
|------|---------|
| `app/src/islands/pages/FAQPage.jsx` | Main component + FAQContent sub-component |

### Styles
| File | Purpose |
|------|---------|
| `app/src/styles/faq.css` | Complete page styling (852 lines) |

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
    if (openQuestionId && faqs?.length > 0) {
      const questionIndex = faqs.findIndex(faq =>
        (faq._id && faq._id.toString() === openQuestionId) ||
        faq.Question.toLowerCase().includes(openQuestionId)
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
    +-- section-title (sub-category name)
    |
    +-- accordion-item
            |
            +-- accordion-header (clickable)
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
| `name` | Yes | Non-empty |
| `email` | Yes | Email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `inquiry` | Yes | Non-empty |

### Form Submission Flow
```
1. User clicks "Can't find the answer?" CTA
2. Modal opens (setShowInquiryModal(true))
3. User fills form fields
4. Submit button triggers handleInquirySubmit
5. Client-side validation (required fields, email format)
6. POST to /api/faq-inquiry
7. On success: Show success message, auto-close after 2s
8. On error: Show error message, keep modal open
```

### Modal States
| State | Display |
|-------|---------|
| Form (default) | Input fields + Submit button |
| Submitting | Form disabled, "Sending..." button |
| Success | Green checkmark + "Thank you!" message |
| Error | Form + red error banner |

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

---

## ### CSS_STRUCTURE ###

### Page Layout Classes
| Class | Purpose |
|-------|---------|
| `.hero` | Purple header section (background: #31135d) |
| `.hero-title` | Main heading (clamp 22px-28px) |
| `.hero-subtitle` | Subheading text |
| `.tabs-container` | Sticky tab bar (top: 70px) |
| `.tabs` | Flexbox tab container |
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
| `.accordion-header` | Clickable header row |
| `.accordion-icon` | Arrow icon (transforms on active) |
| `.accordion-content` | Collapsible content (max-height transition) |
| `.accordion-content-inner` | Content padding wrapper |

### Modal Classes
| Class | Purpose |
|-------|---------|
| `.modal-overlay` | Dark backdrop (rgba(0,0,0,0.5)) |
| `.modal-content` | White modal box (max-width: 500px) |
| `.modal-close` | X button (32px, top-right) |
| `.modal-title` | Modal heading |
| `.modal-subtitle` | Modal description |
| `.inquiry-form` | Form container (flex column, gap: 20px) |
| `.form-group` | Label + input wrapper |
| `.submit-btn` | Submit button (purple #31135d) |
| `.error-message-form` | Error banner (red) |
| `.success-message` | Success state container |
| `.success-icon` | Green checkmark circle |

### State Classes
| Class | Purpose |
|-------|---------|
| `.loading-container` | Loading state wrapper |
| `.spinner` | CSS spinner animation |
| `.error-container` | Error state wrapper |
| `.retry-btn` | Retry button |

---

## ### RESPONSIVE_BREAKPOINTS ###

| Breakpoint | Changes |
|------------|---------|
| `< 1024px` | Market research widget width reduced (360px) |
| `< 768px` | Tabs overflow-x scroll, FAQ container margin/padding reduced, widgets hidden |
| `< 480px` | Compact padding, smaller fonts, accordion header 14px |

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
}
```

---

## ### COLOR_SCHEME ###

| Element | Color | Usage |
|---------|-------|-------|
| Primary Purple | `#31135d` | Hero bg, active tab, links, icons |
| Primary Hover | `#1e0a37` | Button hover states |
| Section Border | `#F3E5F5` | Section title underline |
| Text Primary | `#2C2C2C` | Question text |
| Text Secondary | `#555` | Answer text, descriptions |
| Answer Highlight | `#31135d` | Answer paragraph text |
| Border | `#E0E0E0` | Tab border, accordion dividers |
| Background Hover | `#F9F9F9` | Accordion hover state |
| Tab Inactive | `#F5F5F5` | Inactive tab background |
| Success | `#4CAF50` | Success icon, info-box success |
| Error | `#c33` | Error messages |

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
  setLoading(true);
  const { data, error } = await supabase
    .from('zat_faq')
    .select('_id, Question, Answer, Category, sub-category')
    .order('Category', { ascending: true })
    .order('sub-category', { ascending: true });

  // Group by category
  const grouped = { general: [], travelers: [], hosts: [] };
  data.forEach(faq => {
    if (faq.Category === 'General') grouped.general.push(faq);
    else if (faq.Category === 'Guest') grouped.travelers.push(faq);
    else if (faq.Category === 'Host') grouped.hosts.push(faq);
  });

  setFaqs(grouped);
  setLoading(false);
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
```

---

## ### COMPONENT_STRUCTURE ###

```
FAQPage (parent)
   Header
   <section class="hero">
      <h1 class="hero-title">
      <p class="hero-subtitle">
   <div class="tabs-container">
      <div class="tabs">
          <button class="tab">General Questions</button>
          <button class="tab">For Guests</button>
          <button class="tab">For Hosts</button>
   <main class="faq-container">
      Loading State (if loading)
      Error State (if error)
      Tab Contents (if !loading && !error)
          <div class="tab-content">
             FAQContent faqs={faqs.general}
          <div class="tab-content">
             FAQContent faqs={faqs.travelers}
          <div class="tab-content">
              FAQContent faqs={faqs.hosts}
   <section class="bottom-cta">
      <a class="cta-link" onClick={openInquiryModal}>
   Inquiry Modal (if showInquiryModal)
      <div class="modal-overlay">
         <div class="modal-content">
             <button class="modal-close">
             <h2 class="modal-title">
             <p class="modal-subtitle">
             Success Message OR Form
                 <form class="inquiry-form">
                     Name input
                     Email input
                     Inquiry textarea
                     Error message (if submitError)
                     <button class="submit-btn">
   Footer
```

---

## ### TROUBLESHOOTING ###

| Issue | Check |
|-------|-------|
| FAQs not loading | Verify Supabase connection in `lib/supabase.js` |
| Wrong tab selected | Check `section` URL parameter spelling |
| Question not auto-opening | Verify `question` param matches `_id` or question text |
| Inquiry not sending | Check Cloudflare env vars for Slack webhooks |
| Modal not closing | Verify `closeInquiryModal` handler is attached |
| Accordion not animating | Check CSS `max-height` transition on `.accordion-content` |
| Deep-link scroll not working | Check `data-question-index` attribute and setTimeout delay |
| Tab styling broken | Verify `faq.css` is imported in `faq.html` |

---

## ### RELATED_FILES ###

| Reference | Path |
|-----------|------|
| App CLAUDE.md | `app/CLAUDE.md` |
| Source CLAUDE.md | `app/src/CLAUDE.md` |
| Pages CLAUDE.md | `app/src/islands/pages/CLAUDE.md` |
| Styles CLAUDE.md | `app/src/styles/CLAUDE.md` |
| Functions CLAUDE.md | `app/functions/CLAUDE.md` |
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

**VERSION**: 1.0
**LAST_UPDATED**: 2025-12-04
**STATUS**: Complete documentation of FAQ page architecture
