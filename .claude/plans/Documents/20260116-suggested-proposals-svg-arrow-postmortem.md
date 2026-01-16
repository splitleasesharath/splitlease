# Post-Mortem: SVG Arrow Visibility Bug in SuggestedProposalPopup

**Date**: 2026-01-16
**Duration**: ~5 fix attempts before resolution
**Component**: `SuggestedProposalPopup.jsx`
**Final Solution**: Replace SVG with Unicode text characters

---

## The Problem

Navigation arrows (previous/next) in the SuggestedProposalPopup component were completely invisible despite:
- Correct SVG markup
- Correct CSS selectors matching the elements
- Inline styles showing correctly in browser DevTools

## What Made This Difficult

### 1. The "Ghost Element" Phenomenon

The SVG elements existed in the DOM with correct dimensions (`18x18`), correct styles (`stroke: #424242`, `strokeWidth: 2`), and were positioned correctly within visible button containers. Yet they rendered nothing.

This is the most frustrating type of bug: **everything looks correct but doesn't work**.

### 2. CSS Inheritance Quirks with SVG

SVG elements don't inherit CSS properties the same way HTML elements do. Properties like `stroke` and `fill` have different inheritance rules:

- `currentColor` relies on the `color` property being inherited
- SVG paths without explicit stroke are invisible by default
- CSS variable resolution can fail silently inside SVG elements

We tried:
```css
.sp-popup-nav-btn svg { stroke: var(--sp-text-dark); }
.sp-popup-nav-btn svg path { stroke: #424242; }
```

Both failed despite correct selector matching.

### 3. React's SVG Rendering

React handles SVG attributes differently:
- `stroke-width` → `strokeWidth` (camelCase)
- `stroke-linecap` → `strokeLinecap`

Even with correct React syntax for inline styles:
```jsx
style={{ stroke: '#424242', strokeWidth: 2, strokeLinecap: 'round' }}
```

The arrows remained invisible. The browser DevTools showed these styles applied correctly.

### 4. Different SVG Element Types

We tried both `<path>` and `<polyline>` approaches:

```jsx
// Path approach
<path d="M15 6l-6 6 6 6" stroke="#424242" strokeWidth="2" />

// Polyline approach
<polyline points="15,6 9,12 15,18" style={{ stroke: '#424242' }} />
```

Both rendered nothing despite being valid SVG markup.

### 5. No Error Messages

The most insidious aspect: **zero console errors**. The SVG was technically valid, React rendered it correctly, the browser accepted it—it just didn't paint any pixels.

---

## Failed Attempts (Chronological)

| Attempt | Approach | Result |
|---------|----------|--------|
| 1 | Add CSS `stroke` property | Invisible |
| 2 | Add explicit `width`/`height` to SVG | Invisible |
| 3 | Hardcode `stroke="#424242"` on path | Invisible |
| 4 | Add `xmlns` attribute to SVG | Invisible |
| 5 | Change to `<polyline>` with inline styles | Invisible |

---

## The Solution

Abandon SVG entirely and use Unicode text characters:

```jsx
<span className="sp-nav-arrow">‹</span>  // Previous
<span className="sp-nav-arrow">›</span>  // Next
```

With supporting CSS:
```css
.sp-nav-arrow {
  font-size: 24px;
  font-weight: 300;
  color: #424242;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**Result**: Immediately visible, no issues.

---

## Root Cause Analysis

**FOUND!** The root cause was in the **original commit** (`10b70883`) from January 7, 2026.

### The Bug Was There From Day One

The original implementation used this pattern:

**JSX (correct):**
```jsx
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M15 18l-6-6 6-6" />
</svg>
```

**CSS (incorrect):**
```css
.sp-popup-nav-btn svg {
  width: 18px;
  height: 18px;
  color: var(--sp-text-dark);  /* ← THIS IS THE BUG */
}
```

### Why This Failed

The SVG uses `stroke="currentColor"`, which means "use the CSS `color` property value for the stroke."

**But SVG elements don't inherit `color` the same way HTML elements do.**

The CSS set `color: var(--sp-text-dark)` on the `<svg>` element, expecting `currentColor` to resolve to `#424242`. However:

1. `currentColor` in SVG context doesn't reliably inherit from the `color` property set on the SVG element itself
2. The `color` property needs to be on the **parent element** (the button), not the SVG
3. Or you need to set `stroke` directly instead of relying on `currentColor`

### Contrast with the Close Button (which worked!)

The close button used the **same SVG pattern** but had similar CSS:
```css
.sp-popup-close-btn svg {
  width: 20px;
  height: 20px;
  color: var(--sp-text-muted);
}
```

If the close button's X icon was visible, then the issue might be even more subtle - perhaps related to the specific path geometry or how the browser's SVG renderer handled these particular chevron paths.

### The Real Fix Should Have Been

```css
.sp-popup-nav-btn svg {
  width: 18px;
  height: 18px;
  stroke: var(--sp-text-dark);  /* Use stroke, not color */
}
```

Or ensure the parent button has the color:
```css
.sp-popup-nav-btn {
  color: var(--sp-text-dark);  /* Then currentColor will inherit */
}
```

### Why We Missed This

1. The component was adapted from an external repo where it likely worked in a different CSS context
2. No one tested the navigation arrows when there was only 1 proposal (arrows hidden when `totalCount <= 1`)
3. The close button may have worked due to subtle DOM/CSS differences, masking the pattern issue

---

## Lessons Learned

### 1. SVG Debugging is Time-Consuming
When SVG elements are invisible with no errors, debugging requires checking:
- `fill` and `stroke` values (including `none`, `transparent`)
- `opacity` on element and ancestors
- `visibility` and `display` properties
- `clipPath` or `mask` interference
- `viewBox` and coordinate space
- CSS specificity conflicts from other stylesheets

### 2. Text Characters Are More Reliable
Unicode characters like `‹›`, `←→`, `◀▶` are:
- Rendered by the font engine, not the SVG renderer
- Subject to normal CSS `color` property
- Never have stroke/fill confusion
- Work consistently across browsers

### 3. Pragmatism Over Purity
Five failed attempts at "the right way" (SVG icons) cost more time than the "simple way" (text characters) would have from the start. The text solution:
- Works identically for users
- Is more maintainable (simpler code)
- Has no external dependencies

---

## Recommendations

1. **For simple directional icons**: Prefer Unicode characters over SVG
2. **For complex icons**: Use an icon library (Lucide, Heroicons) that handles SVG quirks
3. **When SVG fails mysteriously**: Don't sink hours debugging—pivot to alternatives
4. **Test SVG early**: If using inline SVG, verify it renders before building around it

---

## Files Changed

- [SuggestedProposalPopup.jsx](../../../app/src/islands/shared/SuggestedProposals/SuggestedProposalPopup.jsx) - Replaced SVG with text arrows
- [SuggestedProposalPopup.css](../../../app/src/islands/shared/SuggestedProposals/SuggestedProposalPopup.css) - Added `.sp-nav-arrow` styles

## Related Commits

- `342f793b` - Initial fix attempt (SVG with explicit dimensions)
- `d9247504` - Path-level stroke styling
- `de67a4c4` - Inline stroke attribute on path
- `58bbd051` - Polyline with inline styles
- `1879c69f` - Final fix with text characters
- Tag: `fix/suggested-proposals-nav-arrows`
