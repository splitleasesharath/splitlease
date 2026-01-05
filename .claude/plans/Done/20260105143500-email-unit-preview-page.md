# Implementation Plan: Email Unit Preview Page (`_email-unit`)

## Overview
Create a new internal page `_email-unit` for previewing email templates with live editing and dynamic placeholder support. The page enables users to select templates from the database, dynamically generate input fields based on the template's `Placeholder` array, and see real-time preview updates as they edit placeholder values.

## Success Criteria
- [ ] Page accessible at `/_email-unit` route
- [ ] Dropdown selector populated with email templates from `reference_table.zat_email_html_template_eg_sendbasicemailwf_`
- [ ] Dynamic form fields generated from template's `Placeholder` array (NOT hardcoded)
- [ ] Placeholders displayed as-is (e.g., `$$header$$` as the label)
- [ ] Left panel contains template selector + dynamic key-value form
- [ ] Right panel displays live email preview that updates in real-time
- [ ] Preview renders HTML from `Email Template JSON` column with placeholder substitution
- [ ] Page follows Hollow Component pattern with separate logic hook

## Context & References

### Relevant Files
| File | Purpose | Changes Needed |
|------|---------|----------------|
| `app/src/routes.config.js` | Route registry | Add `_email-unit` route entry |
| `app/public/_email-unit.html` | HTML entry point | Create new file |
| `app/src/_email-unit.jsx` | React entry point | Create new file |
| `app/src/islands/pages/EmailUnitPage.jsx` | Page component (Hollow) | Create new file |
| `app/src/islands/pages/useEmailUnitPageLogic.js` | Logic hook | Create new file |
| `app/src/lib/supabase.js` | Supabase client | Reference only (no changes) |
| `app/src/lib/emailTemplateRenderer.js` | Existing renderer | Reference for pattern (may not use directly) |

### Related Documentation
- `app/CLAUDE.md` - Frontend architecture overview
- `app/src/CLAUDE.md` - Source code structure and patterns
- `app/src/islands/pages/CLAUDE.md` - Page component patterns

### Existing Patterns to Follow
- **Route Registration**: See `routes.config.js` lines 318-326 (`_internal-test` pattern)
- **HTML Template**: See `_internal-test.html` for internal page HTML structure
- **Entry Point**: See `_internal-test.jsx` for mount pattern
- **Page Component**: See `InternalTestPage.jsx` for internal page component structure
- **Supabase Query**: See `FAQPage.jsx` lines 48-58 for `reference_table` schema query pattern

## Implementation Steps

### Step 1: Register Route in Route Registry
**Files:** `app/src/routes.config.js`
**Purpose:** Add the `_email-unit` route to the single source of truth for all routes
**Details:**
- Add new route entry after the existing `_internal-test` route (around line 326)
- Follow the internal page convention (underscore prefix)
- Set `protected: false` for development accessibility
- Set `cloudflareInternal: false` (internal dev page)

```javascript
// Add after _internal-test route entry
{
  path: '/_email-unit',
  file: '_email-unit.html',
  aliases: ['/_email-unit.html'],
  protected: false,
  cloudflareInternal: false,
  hasDynamicSegment: false
},
```

**Validation:** Run `bun run generate-routes` and verify no errors

---

### Step 2: Create HTML Entry Point
**Files:** `app/public/_email-unit.html`
**Purpose:** Static HTML shell that loads the React application
**Details:**
- Use `_internal-test.html` as template
- Set appropriate `<title>` and `<meta>` description
- Mount div ID: `email-unit-page`
- Link to main.css (no custom CSS file needed initially)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Split Lease - Email Unit Preview</title>
  <meta name="description" content="Internal page for previewing email templates">
  <link rel="icon" type="image/png" href="/assets/images/split-lease-purple-circle.png">
  <link rel="stylesheet" href="/src/styles/main.css">
</head>
<body>
  <div id="email-unit-page"></div>
  <script type="module" src="/src/_email-unit.jsx"></script>
</body>
</html>
```

**Validation:** File exists and HTML is valid

---

### Step 3: Create React Entry Point
**Files:** `app/src/_email-unit.jsx`
**Purpose:** Mount the EmailUnitPage component to the DOM
**Details:**
- Import `createRoot` from `react-dom/client`
- Import `EmailUnitPage` from `./islands/pages/EmailUnitPage.jsx`
- Mount to `#email-unit-page`

```javascript
import { createRoot } from 'react-dom/client';
import EmailUnitPage from './islands/pages/EmailUnitPage.jsx';

createRoot(document.getElementById('email-unit-page')).render(<EmailUnitPage />);
```

**Validation:** File exists and imports are correct

---

### Step 4: Create Logic Hook
**Files:** `app/src/islands/pages/useEmailUnitPageLogic.js`
**Purpose:** Encapsulate all business logic for the email unit page
**Details:**

**State Management:**
- `templates` - Array of email templates from database
- `selectedTemplateId` - Currently selected template ID
- `selectedTemplate` - Full template object for selected template
- `placeholderValues` - Object mapping placeholder keys to user-entered values
- `loading` - Loading state for template fetch
- `error` - Error state

**Data Fetching:**
- Fetch all templates from `reference_table.zat_email_html_template_eg_sendbasicemailwf_`
- Query columns: `_id`, `Name`, `Description`, `Placeholder`, `Email Template JSON`, `Logo`

**Computed Values:**
- `placeholders` - Extracted from `selectedTemplate.Placeholder` array
- `previewHtml` - Generated HTML with placeholders replaced by user values

**Handlers:**
- `handleTemplateChange(templateId)` - Update selected template, reset placeholder values
- `handlePlaceholderChange(key, value)` - Update single placeholder value
- `generatePreview()` - Parse `Email Template JSON`, extract HTML content, replace placeholders

**Placeholder Extraction Logic:**
```javascript
// Template Placeholder array format: ["$$header$$", "$$to$$", "$$body text$$", ...]
// Convert to form-friendly format
const extractPlaceholders = (placeholderArray) => {
  if (!placeholderArray || !Array.isArray(placeholderArray)) return [];
  return placeholderArray.map(p => ({
    key: p,           // "$$header$$" - used as form field name
    label: p,         // "$$header$$" - displayed as-is per requirements
    defaultValue: ''  // Empty default
  }));
};
```

**Preview Generation Logic:**
```javascript
const generatePreviewHtml = (templateJson, placeholderValues) => {
  try {
    // Parse the Email Template JSON
    const parsed = JSON.parse(templateJson);

    // Find the HTML content in the content array
    const htmlContent = parsed.content?.find(c => c.type === 'text/html')?.value || '';

    // Replace all placeholders with user values
    let preview = htmlContent;
    Object.entries(placeholderValues).forEach(([key, value]) => {
      // key is like "$$header$$", value is user input
      const regex = new RegExp(key.replace(/\$/g, '\\$'), 'g');
      preview = preview.replace(regex, value || key); // Show placeholder if empty
    });

    return preview;
  } catch (e) {
    console.error('Failed to parse template JSON:', e);
    return '<p>Error parsing template</p>';
  }
};
```

**Return Object:**
```javascript
return {
  // State
  templates,
  selectedTemplateId,
  selectedTemplate,
  placeholders,
  placeholderValues,
  previewHtml,
  loading,
  error,

  // Handlers
  handleTemplateChange,
  handlePlaceholderChange,
};
```

**Validation:** Hook exports all required state and handlers

---

### Step 5: Create Page Component (Hollow Component)
**Files:** `app/src/islands/pages/EmailUnitPage.jsx`
**Purpose:** Render the email unit preview UI with two-panel layout
**Details:**

**Imports:**
- React hooks from 'react'
- `useEmailUnitPageLogic` from `./useEmailUnitPageLogic.js`
- `Header` and `Footer` from `../shared/`

**Layout Structure:**
```
<Header />
<main> (flex container)
  <LeftPanel> (40% width)
    <TemplateSelector>
      <select> with templates
    </TemplateSelector>
    <PlaceholderForm>
      {placeholders.map(p => (
        <FormField key={p.key}>
          <label>{p.label}</label>  // Shows "$$header$$" as-is
          <input/textarea value={placeholderValues[p.key]} onChange={...} />
        </FormField>
      ))}
    </PlaceholderForm>
  </LeftPanel>
  <RightPanel> (60% width)
    <PreviewHeader>Email Preview</PreviewHeader>
    <PreviewFrame>
      <iframe srcDoc={previewHtml} />  // Sandboxed preview
    </PreviewFrame>
  </RightPanel>
</main>
<Footer />
```

**Component Code Structure:**
```jsx
import { useState } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import useEmailUnitPageLogic from './useEmailUnitPageLogic.js';

export default function EmailUnitPage() {
  const {
    templates,
    selectedTemplateId,
    selectedTemplate,
    placeholders,
    placeholderValues,
    previewHtml,
    loading,
    error,
    handleTemplateChange,
    handlePlaceholderChange,
  } = useEmailUnitPageLogic();

  // Loading state
  if (loading) {
    return (
      <>
        <Header />
        <main style={styles.loadingContainer}>
          <p>Loading templates...</p>
        </main>
        <Footer />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Header />
        <main style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={styles.container}>
        {/* Left Panel - Template Selection & Form */}
        <section style={styles.leftPanel}>
          <h1 style={styles.pageTitle}>Email Template Preview</h1>

          {/* Template Selector */}
          <div style={styles.selectorContainer}>
            <label htmlFor="template-select" style={styles.label}>
              Select Template
            </label>
            <select
              id="template-select"
              value={selectedTemplateId || ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
              style={styles.select}
            >
              <option value="">-- Select a template --</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>
                  {t.Name || t.Description || t._id}
                </option>
              ))}
            </select>
          </div>

          {/* Template Description */}
          {selectedTemplate && (
            <p style={styles.description}>
              {selectedTemplate.Description || 'No description available'}
            </p>
          )}

          {/* Placeholder Form */}
          {placeholders.length > 0 && (
            <div style={styles.formContainer}>
              <h2 style={styles.formTitle}>Placeholder Values</h2>
              {placeholders.map(p => (
                <div key={p.key} style={styles.formField}>
                  <label style={styles.fieldLabel}>{p.label}</label>
                  {/* Use textarea for body text, input for others */}
                  {p.key.includes('body') || p.key.includes('text') ? (
                    <textarea
                      value={placeholderValues[p.key] || ''}
                      onChange={(e) => handlePlaceholderChange(p.key, e.target.value)}
                      style={styles.textarea}
                      rows={3}
                      placeholder={`Enter value for ${p.label}`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={placeholderValues[p.key] || ''}
                      onChange={(e) => handlePlaceholderChange(p.key, e.target.value)}
                      style={styles.input}
                      placeholder={`Enter value for ${p.label}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Panel - Email Preview */}
        <section style={styles.rightPanel}>
          <h2 style={styles.previewTitle}>Live Preview</h2>
          <div style={styles.previewContainer}>
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                style={styles.previewFrame}
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div style={styles.emptyPreview}>
                <p>Select a template to see preview</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// Inline styles (can be extracted to CSS file later)
const styles = {
  container: {
    display: 'flex',
    minHeight: 'calc(100vh - 200px)',
    padding: '20px',
    gap: '24px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  leftPanel: {
    flex: '0 0 40%',
    maxWidth: '500px',
    padding: '24px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 240px)',
  },
  rightPanel: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#111827',
  },
  selectorContainer: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#374151',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
  },
  description: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  formContainer: {
    marginTop: '24px',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#111827',
  },
  formField: {
    marginBottom: '16px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px',
    color: '#4b5563',
    fontFamily: 'monospace',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  previewTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#111827',
  },
  previewContainer: {
    flex: '1',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  previewFrame: {
    width: '100%',
    height: '100%',
    minHeight: '600px',
    border: 'none',
  },
  emptyPreview: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 200px)',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 200px)',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '16px',
  },
};
```

**Validation:** Component renders without errors, layout displays correctly

---

### Step 6: Run Route Generation Script
**Files:** N/A (runs existing script)
**Purpose:** Regenerate `_redirects` and `_routes.json` from updated route config
**Details:**
- Run `bun run generate-routes` from `app/` directory
- Verify script completes without errors
- Check `app/public/_redirects` includes new route
- Check `app/public/_routes.json` is updated

**Validation:** No errors, new route appears in generated files

---

### Step 7: Test Local Development
**Files:** N/A (runtime verification)
**Purpose:** Verify the page works in local development
**Details:**
1. Start dev server: `bun run dev`
2. Navigate to `http://localhost:8000/_email-unit`
3. Verify page loads without errors
4. Verify template dropdown populates from database
5. Select a template - verify placeholder form generates dynamically
6. Edit placeholder values - verify preview updates in real-time
7. Test with multiple templates to ensure dynamic behavior

**Validation:** All functionality works as expected

---

## Edge Cases & Error Handling

### Template Loading Errors
- Display error message if Supabase query fails
- Provide retry mechanism
- Log detailed error to console for debugging

### Empty Placeholder Array
- Some templates may have empty or null `Placeholder` arrays
- Display message: "This template has no configurable placeholders"
- Still show preview with raw template

### Invalid JSON in Email Template JSON
- Wrap JSON.parse in try-catch
- Display error message in preview area
- Log parsing error with template ID for debugging

### Missing HTML Content Type
- If `content` array lacks `text/html` entry, check for `text/plain`
- Display warning that preview may not render correctly
- Fall back to plain text display

### Long Placeholder Values
- Use textarea for text/body placeholders
- Input fields should handle long values gracefully
- Preview should handle overflow appropriately

### Special Characters in Placeholders
- Escape regex special characters when replacing placeholders
- The `$$` wrapper should be preserved in the regex pattern

## Testing Considerations

### Manual Testing Checklist
- [ ] Page loads at `/_email-unit`
- [ ] Template dropdown shows all templates from database
- [ ] Selecting template generates correct placeholder fields
- [ ] Placeholder labels show as-is (e.g., `$$header$$`)
- [ ] Editing placeholders updates preview in real-time
- [ ] Preview renders HTML email correctly
- [ ] Switching templates resets form fields
- [ ] Empty/null placeholders handled gracefully
- [ ] Error states display appropriately
- [ ] Responsive layout works on different screen sizes

### Templates to Test
- "Basic" template (ID: `1560447575939x331870423481483500`) - 13 placeholders
- "Basic Email with Reply Headers" template (ID: `1738694045230x107294017858615700`) - 11 placeholders

## Rollback Strategy
- Delete files: `_email-unit.html`, `_email-unit.jsx`, `EmailUnitPage.jsx`, `useEmailUnitPageLogic.js`
- Remove route entry from `routes.config.js`
- Run `bun run generate-routes` to regenerate routing files
- Verify `/_email-unit` returns 404

## Dependencies & Blockers
- **Required**: Supabase MCP connection for database access
- **Required**: Templates must exist in `reference_table.zat_email_html_template_eg_sendbasicemailwf_`
- **No blockers identified**

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Database query fails | Low | Medium | Add error handling and loading states |
| JSON parsing fails | Medium | Low | Wrap in try-catch, display fallback |
| Placeholder regex fails | Low | Low | Escape special characters properly |
| Preview iframe security | Low | Low | Use sandbox attribute on iframe |

---

## File Summary

### Files to Create
1. `app/public/_email-unit.html` - HTML entry point
2. `app/src/_email-unit.jsx` - React entry point
3. `app/src/islands/pages/EmailUnitPage.jsx` - Page component
4. `app/src/islands/pages/useEmailUnitPageLogic.js` - Logic hook

### Files to Modify
1. `app/src/routes.config.js` - Add route entry

### Files Referenced (No Changes)
1. `app/src/lib/supabase.js` - Database client
2. `app/src/lib/emailTemplateRenderer.js` - Existing renderer (pattern reference)
3. `app/src/islands/shared/Header.jsx` - Shared header component
4. `app/src/islands/shared/Footer.jsx` - Shared footer component
5. `app/src/islands/pages/InternalTestPage.jsx` - Pattern reference
6. `app/src/islands/pages/FAQPage.jsx` - Supabase query pattern reference

---

## Database Schema Reference

### Table: `reference_table.zat_email_html_template_eg_sendbasicemailwf_`

| Column | Type | Description |
|--------|------|-------------|
| `_id` | text | Primary key (Bubble ID format) |
| `Name` | text | Template name (nullable) |
| `Description` | text | Template description |
| `Placeholder` | ARRAY | Array of placeholder strings e.g., `["$$header$$", "$$to$$"]` |
| `Email Template JSON` | text | SendGrid format JSON with content array |
| `Logo` | text | Logo URL (nullable) |
| `Created Date` | timestamptz | Creation timestamp |
| `Modified Date` | timestamptz | Last modification timestamp |

### Sample Placeholder Array
```json
["$$header$$", "$$to$$", "$$from name$$", "$$bcc$$", "$$attachment$$", "$$subject$$", "$$reply_to$$", "$$cc$$", "$$from email$$", "$$button$$", "$$body text$$", "$$year$$", "$$logo url$$"]
```

### Email Template JSON Structure
```json
{
  "personalizations": [...],
  "from": {...},
  "subject": "$$subject$$",
  "content": [
    { "type": "text/plain", "value": "..." },
    { "type": "text/html", "value": "<!DOCTYPE html>..." }
  ]
}
```
