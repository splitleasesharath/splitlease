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

The exact root cause was never definitively identified. Possible factors:

1. **CSS Specificity Conflict**: Another stylesheet may have set `stroke: none` or `fill: none` with higher specificity
2. **Build Process Issue**: Vite or a plugin may have transformed the SVG in unexpected ways
3. **Font/Rendering Context**: The SVG may have required a specific viewBox or coordinate system that wasn't being honored
4. **Shadow DOM or Isolation**: The popup's CSS isolation may have blocked SVG paint

Without spending hours in Chrome DevTools' computed styles panel, the pragmatic solution was to use a proven alternative.

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
