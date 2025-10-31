# Diagnostic Testing Guide

## 🔍 What is Diagnostic Testing?

Diagnostic tests **proactively identify potential problems** in your components before they reach production. Unlike functional tests that verify "does it work?", diagnostic tests answer "what could go wrong?"

---

## 🎯 Why Diagnostic Tests?

### Problems They Catch

**Before deployment:**
- ❌ Accessibility violations (users with disabilities can't use your component)
- ❌ Form validation bugs (security vulnerabilities, data integrity issues)
- ❌ Performance bottlenecks (slow page loads, laggy interactions)
- ❌ Memory leaks (browser crashes, degraded performance over time)
- ❌ Console errors (broken functionality, poor developer experience)
- ❌ Keyboard navigation issues (power users can't navigate efficiently)
- ❌ CSS layout problems (invisible elements, text overflow)
- ❌ Spec violations (missing features, incorrect behavior)

**Without diagnostic tests, these issues:**
1. Slip into production unnoticed
2. Get reported by users (bad UX)
3. Require emergency hotfixes
4. Damage brand reputation
5. Cost time and money to fix later

---

## 📊 Diagnostic Test Categories

### 1. 🎨 Accessibility Audits

**What it detects:**
- Missing alt text on images
- Form inputs without labels
- Buttons without accessible names
- Links without descriptive text

**Why it matters:**
- 15% of the world has disabilities
- Legal requirement (ADA, Section 508)
- Better SEO (screen reader content)
- Improves usability for everyone

**Example issue caught:**
```html
<!-- ❌ BAD: Button without accessible name -->
<button onClick={handleClick}>
  <svg>...</svg>
</button>

<!-- ✅ GOOD: Button with aria-label -->
<button onClick={handleClick} aria-label="Submit form">
  <svg>...</svg>
</button>
```

---

### 2. ⌨️ Keyboard Navigation

**What it detects:**
- Elements removed from tab order (negative tabindex)
- Broken focus management
- Inaccessible interactive elements

**Why it matters:**
- Power users rely on keyboard navigation
- Accessibility requirement
- Better developer experience (keyboard shortcuts)

**Example issue caught:**
```jsx
// ❌ BAD: Removes element from keyboard navigation
<div tabIndex={-1} onClick={handleClick}>Click me</div>

// ✅ GOOD: Keyboard accessible
<button onClick={handleClick}>Click me</button>
```

---

### 3. ✅ Form Validation

**What it detects:**
- Missing input validation
- Incorrect validation logic
- Security vulnerabilities (XSS, injection)

**Why it matters:**
- Data integrity
- Security (prevent malicious input)
- User experience (catch errors early)

**Example issue caught:**
```javascript
// ❌ BAD: No email validation
onSubmit={(email) => submitForm(email)}

// ✅ GOOD: Validates email format
onSubmit={(email) => {
  if (!email.includes('@') || !email.includes('.')) {
    return; // Reject invalid email
  }
  submitForm(email);
}}
```

---

### 4. 🚀 Performance Monitoring

**What it detects:**
- Slow initial load (> 5 seconds)
- Laggy re-renders (> 500ms)
- Large bundle size (> 500KB)

**Why it matters:**
- 53% of users abandon slow sites
- Google ranking factor (Core Web Vitals)
- User experience (perceived performance)

**Metrics tracked:**
- **Initial Load:** Time from page load to component render
- **Re-render Time:** Time to update component on state change
- **Bundle Size:** JavaScript file size (affects download time)

**Example issue caught:**
```javascript
// ❌ BAD: Re-renders entire component on every prop change
export const Component = (props) => {
  // Heavy computation on every render
  const data = expensiveCalculation(props.data);
  ...
}

// ✅ GOOD: Memoized to prevent unnecessary re-renders
export const Component = React.memo((props) => {
  const data = useMemo(() => expensiveCalculation(props.data), [props.data]);
  ...
});
```

---

### 5. 💾 Memory Leak Detection

**What it detects:**
- Components that break after re-renders
- Event listeners not cleaned up
- DOM nodes accumulating in memory

**Why it matters:**
- Browser crashes
- Performance degradation over time
- Poor user experience (app gets slower)

**Example issue caught:**
```javascript
// ❌ BAD: Event listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
});

// ✅ GOOD: Cleanup on unmount
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

---

### 6. 🎨 CSS & Layout Problems

**What it detects:**
- Invisible elements (0 width/height)
- Text overflow (truncated content)
- Missing CSS classes

**Why it matters:**
- Visual bugs
- Content accessibility
- Responsive design issues

**Example issue caught:**
```css
/* ❌ BAD: Element collapsed to 0 height */
.container {
  height: 0;
  overflow: hidden;
}

/* ✅ GOOD: Proper height */
.container {
  height: auto;
  min-height: 100px;
}
```

---

### 7. 📋 Spec Compliance

**What it detects:**
- Missing features from specification
- Incorrect behavior vs. spec
- Required elements not rendering

**Why it matters:**
- Ensures feature completeness
- Catches regression bugs
- Documents expected behavior

**Example issue caught:**
```javascript
// Spec says: "Footer must have 3 columns: For Hosts, For Guests, Company"

// ❌ BAD: Only 2 columns
const columns = [
  { title: 'For Hosts', ... },
  { title: 'For Guests', ... }
];

// ✅ GOOD: All 3 columns
const columns = [
  { title: 'For Hosts', ... },
  { title: 'For Guests', ... },
  { title: 'Company', ... }
];
```

---

### 8. 🐛 Console Warnings & Errors

**What it detects:**
- Console errors during operation
- React warnings (key props, deprecated APIs)
- Third-party library warnings

**Why it matters:**
- Indicates potential bugs
- Poor developer experience
- May break in future React versions

**Example issue caught:**
```jsx
// ❌ BAD: Missing key prop in list
{items.map(item => <div>{item.name}</div>)}

// ✅ GOOD: Proper key prop
{items.map(item => <div key={item.id}>{item.name}</div>)}
```

---

## 🚀 How to Use Diagnostic Tests

### Run All Diagnostics
```bash
cd test-harness
npx playwright test footer-diagnostics.spec.js
```

### Run Specific Diagnostic
```bash
# Accessibility only
npx playwright test -g "accessibility"

# Performance only
npx playwright test -g "performance"

# Form validation only
npx playwright test -g "validation"
```

### Continuous Integration
```bash
# Add to your CI/CD pipeline
npm test  # Runs all tests including diagnostics
```

---

## 📊 Understanding Results

### ✅ PASS - No Issues Found
```
✅ No accessibility issues detected
✅ Keyboard navigation working correctly
✅ Form validation working correctly
```

**Action:** None required, component is healthy!

---

### ⚠️ WARNING - Issue Detected (Not Critical)
```
⚠️ [WARNING] Slow initial load time: 5200ms (expected < 5000ms)
   Consider optimizing bundle size or lazy loading
```

**Action:** Investigate and optimize when time permits.

---

### ❌ FAIL - Critical Issue
```
❌ [CRITICAL] Input fields without labels or aria-label
   Details: [{ id: 'email-input', class: 'input-field', type: 'email' }]
```

**Action:** Fix immediately before deploying.

---

## 🎯 Best Practices

### 1. Run Diagnostics Before Every Deploy
```bash
# In your deployment script
npm run build
npm test  # Includes diagnostics
# Only deploy if tests pass
```

### 2. Fix Critical Issues Immediately
- ❌ Critical accessibility violations
- ❌ Broken form validation
- ❌ Console errors
- ❌ Missing spec requirements

### 3. Monitor Warnings Over Time
- ⚠️ Performance degradation
- ⚠️ Bundle size growth
- ⚠️ Layout issues

### 4. Add Diagnostics for New Components
When adding a new component:
1. Add component to `config.json`
2. Create diagnostic test file (copy template)
3. Run diagnostics
4. Fix all critical issues
5. Deploy

---

## 🔧 Customizing Diagnostic Tests

### Add New Diagnostic Category

```javascript
// tests/footer-diagnostics.spec.js

test('Your custom diagnostic', async ({ page }) => {
  const previewPath = path.join(__dirname, '../previews/footer-preview.html');
  await page.goto(`file://${previewPath}`);

  const issues = [];

  // Your custom checks
  const customCheck = await page.evaluate(() => {
    // Check for something specific
    return document.querySelectorAll('.problematic-class').length;
  });

  if (customCheck > 0) {
    issues.push({
      severity: 'WARNING',
      issue: 'Custom problem detected',
      count: customCheck
    });
  }

  // Report issues
  if (issues.length > 0) {
    console.log('\n⚠️ Custom Issues:\n');
    issues.forEach(issue => console.log(`   ${issue.issue}`));
  }

  // Only fail on critical
  const critical = issues.filter(i => i.severity === 'CRITICAL');
  expect(critical.length).toBe(0);
});
```

---

## 📈 Metrics & Thresholds

### Current Thresholds

| Metric | Threshold | Severity |
|--------|-----------|----------|
| Initial Load | > 5000ms | WARNING |
| Re-render Time | > 500ms | WARNING |
| Bundle Size | > 500KB | WARNING |
| Console Errors | > 0 | CRITICAL |
| Accessibility Issues | > 0 | CRITICAL |
| Validation Failures | > 0 | CRITICAL |
| Spec Violations | > 0 | CRITICAL |

### Adjusting Thresholds

Edit the test file to change thresholds:

```javascript
// tests/footer-diagnostics.spec.js

// Change load time threshold
if (loadTime > 3000) {  // Changed from 5000ms to 3000ms
  issues.push({ ... });
}

// Change bundle size threshold
if (sizeKB > 200) {  // Changed from 500KB to 200KB
  issues.push({ ... });
}
```

---

## 🎓 Learning Resources

### Accessibility
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Checklist](https://webaim.org/standards/wcag/checklist)
- [A11y Project](https://www.a11yproject.com/)

### Performance
- [Web.dev Performance](https://web.dev/performance/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Bundle Size Optimization](https://web.dev/reduce-javascript-payloads-with-code-splitting/)

### Testing
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## ✅ Checklist: Before Deploying

- [ ] Run all diagnostic tests (`npm test`)
- [ ] Zero critical issues
- [ ] All warnings investigated
- [ ] Performance metrics acceptable
- [ ] Accessibility checked
- [ ] Console is clean (no errors)
- [ ] Form validation working
- [ ] Spec requirements met

---

## 📞 Support

If you encounter issues with diagnostic tests:

1. **Check the diagnostic report:** `DIAGNOSTIC_REPORT.md`
2. **Review test output:** Look for specific issue details
3. **Consult this guide:** Find the relevant section
4. **Fix critical issues first:** Warnings can be addressed later

---

**Last Updated:** 2025-01-26
**Test Suite Version:** 1.0.0
