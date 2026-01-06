# Design Extraction Patterns

JavaScript snippets to extract design elements via Playwright's `browser_evaluate`.

## Color Extraction

### Extract All Background Colors

```javascript
(() => {
  const colors = new Set();
  document.querySelectorAll('*').forEach(el => {
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      colors.add(bg);
    }
  });
  return Array.from(colors);
})();
```

### Extract Text Colors

```javascript
(() => {
  const colors = new Set();
  document.querySelectorAll('*').forEach(el => {
    const color = getComputedStyle(el).color;
    if (color) colors.add(color);
  });
  return Array.from(colors);
})();
```

### Extract Brand Colors (from logos, buttons, links)

```javascript
(() => {
  const brandElements = document.querySelectorAll('a, button, [class*="brand"], [class*="primary"], [class*="accent"]');
  const colors = new Set();
  brandElements.forEach(el => {
    const style = getComputedStyle(el);
    colors.add(style.backgroundColor);
    colors.add(style.color);
    colors.add(style.borderColor);
  });
  return Array.from(colors).filter(c => c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)');
})();
```

## Typography Extraction

### Extract Font Families

```javascript
(() => {
  const fonts = new Set();
  document.querySelectorAll('*').forEach(el => {
    const font = getComputedStyle(el).fontFamily;
    if (font) fonts.add(font);
  });
  return Array.from(fonts);
})();
```

### Extract Heading Styles

```javascript
(() => {
  const headings = {};
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
    const el = document.querySelector(tag);
    if (el) {
      const style = getComputedStyle(el);
      headings[tag] = {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        color: style.color,
        letterSpacing: style.letterSpacing
      };
    }
  });
  return headings;
})();
```

### Extract Body Text Style

```javascript
(() => {
  const body = document.querySelector('p, .content, main, article');
  if (!body) return null;
  const style = getComputedStyle(body);
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    color: style.color,
    letterSpacing: style.letterSpacing
  };
})();
```

## Spacing Extraction

### Extract Common Margins/Padding

```javascript
(() => {
  const spacings = new Set();
  document.querySelectorAll('section, div, p, h1, h2, h3, .card, .container').forEach(el => {
    const style = getComputedStyle(el);
    spacings.add(style.marginTop);
    spacings.add(style.marginBottom);
    spacings.add(style.paddingTop);
    spacings.add(style.paddingBottom);
    spacings.add(style.paddingLeft);
    spacings.add(style.paddingRight);
  });
  return Array.from(spacings).filter(s => s !== '0px').sort((a, b) => parseFloat(a) - parseFloat(b));
})();
```

### Extract Container Max-Widths

```javascript
(() => {
  const widths = new Set();
  document.querySelectorAll('[class*="container"], [class*="wrapper"], main, .content').forEach(el => {
    const style = getComputedStyle(el);
    if (style.maxWidth && style.maxWidth !== 'none') {
      widths.add(style.maxWidth);
    }
  });
  return Array.from(widths);
})();
```

## Component Style Extraction

### Button Styles

```javascript
(() => {
  const buttons = document.querySelectorAll('button, [class*="btn"], a[class*="button"]');
  if (!buttons.length) return null;

  return Array.from(buttons).slice(0, 5).map(btn => {
    const style = getComputedStyle(btn);
    return {
      text: btn.textContent.trim().substring(0, 20),
      backgroundColor: style.backgroundColor,
      color: style.color,
      borderRadius: style.borderRadius,
      padding: `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      border: style.border,
      boxShadow: style.boxShadow
    };
  });
})();
```

### Card Styles

```javascript
(() => {
  const cards = document.querySelectorAll('[class*="card"], [class*="Card"], .listing, .item');
  if (!cards.length) return null;

  return Array.from(cards).slice(0, 3).map(card => {
    const style = getComputedStyle(card);
    return {
      backgroundColor: style.backgroundColor,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      border: style.border,
      padding: style.padding
    };
  });
})();
```

### Navigation Styles

```javascript
(() => {
  const nav = document.querySelector('nav, header, [class*="nav"], [class*="header"]');
  if (!nav) return null;

  const style = getComputedStyle(nav);
  const links = nav.querySelectorAll('a');

  return {
    container: {
      backgroundColor: style.backgroundColor,
      height: style.height,
      padding: style.padding,
      position: style.position,
      boxShadow: style.boxShadow
    },
    links: links.length > 0 ? {
      color: getComputedStyle(links[0]).color,
      fontSize: getComputedStyle(links[0]).fontSize,
      fontWeight: getComputedStyle(links[0]).fontWeight
    } : null
  };
})();
```

## Layout Extraction

### Grid/Flexbox Analysis

```javascript
(() => {
  const layouts = [];
  document.querySelectorAll('*').forEach(el => {
    const style = getComputedStyle(el);
    if (style.display === 'grid' || style.display === 'flex') {
      layouts.push({
        tagName: el.tagName,
        className: el.className.substring(0, 50),
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        gridGap: style.gap,
        flexDirection: style.flexDirection,
        justifyContent: style.justifyContent,
        alignItems: style.alignItems,
        gap: style.gap
      });
    }
  });
  return layouts.slice(0, 20);
})();
```

## Shadow/Effect Extraction

### Box Shadows

```javascript
(() => {
  const shadows = new Set();
  document.querySelectorAll('*').forEach(el => {
    const shadow = getComputedStyle(el).boxShadow;
    if (shadow && shadow !== 'none') {
      shadows.add(shadow);
    }
  });
  return Array.from(shadows);
})();
```

### Border Radii

```javascript
(() => {
  const radii = new Set();
  document.querySelectorAll('*').forEach(el => {
    const radius = getComputedStyle(el).borderRadius;
    if (radius && radius !== '0px') {
      radii.add(radius);
    }
  });
  return Array.from(radii).sort((a, b) => parseFloat(a) - parseFloat(b));
})();
```

## Full Page Design Summary

### Comprehensive Extraction

```javascript
(() => {
  const summary = {
    colors: { backgrounds: new Set(), texts: new Set() },
    typography: {},
    spacing: new Set(),
    shadows: new Set(),
    borderRadii: new Set()
  };

  document.querySelectorAll('*').forEach(el => {
    const style = getComputedStyle(el);

    // Colors
    if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      summary.colors.backgrounds.add(style.backgroundColor);
    }
    summary.colors.texts.add(style.color);

    // Spacing
    ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom'].forEach(prop => {
      if (style[prop] !== '0px') summary.spacing.add(style[prop]);
    });

    // Effects
    if (style.boxShadow !== 'none') summary.shadows.add(style.boxShadow);
    if (style.borderRadius !== '0px') summary.borderRadii.add(style.borderRadius);
  });

  // Typography
  ['h1', 'h2', 'h3', 'p'].forEach(tag => {
    const el = document.querySelector(tag);
    if (el) {
      const s = getComputedStyle(el);
      summary.typography[tag] = {
        font: s.fontFamily.split(',')[0],
        size: s.fontSize,
        weight: s.fontWeight,
        lineHeight: s.lineHeight
      };
    }
  });

  return {
    colors: {
      backgrounds: Array.from(summary.colors.backgrounds).slice(0, 10),
      texts: Array.from(summary.colors.texts).slice(0, 10)
    },
    typography: summary.typography,
    spacing: Array.from(summary.spacing).slice(0, 15),
    shadows: Array.from(summary.shadows).slice(0, 5),
    borderRadii: Array.from(summary.borderRadii).slice(0, 10)
  };
})();
```

## Usage with Playwright MCP

```
// Via mcp-tool-specialist subagent:

1. Navigate to target:
   mcp__playwright__browser_navigate → { url: "https://example.com" }

2. Wait for load:
   mcp__playwright__browser_wait_for → { selector: "body" }

3. Extract design:
   mcp__playwright__browser_evaluate → { script: "[extraction script above]" }

4. Screenshot for reference:
   mcp__playwright__browser_take_screenshot → { fullPage: true }
```
