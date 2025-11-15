# Task: Investigate Hamburger Menu on splitlease.app

## Objective
Use Playwright MCP to investigate why the hamburger menu might be visible on desktop when it should be hidden.

## Required Steps

1. **Initial Setup**
   - Navigate to https://splitlease.app
   - Set browser viewport to desktop width (1920x1080)
   - Take screenshot of header area

2. **DOM Investigation**
   - Check if `.hamburger-menu` element exists in DOM
   - Get computed styles for the hamburger menu element
   - Check display property specifically

3. **CSS Analysis**
   - Capture all loaded CSS files from network requests
   - Get full URLs including content hashes
   - Check browser console for CSS file references
   - Examine actual CSS rules being applied to `.hamburger-menu`

4. **Cache Bypass Test**
   - Perform hard reload (Ctrl+Shift+R equivalent)
   - Re-check DOM element existence
   - Re-check computed styles
   - Re-check network requests for CSS files

5. **Media Query Investigation**
   - If possible, inspect the actual media query rules in loaded stylesheets
   - Determine breakpoints for hamburger menu visibility

## Expected Deliverables

- Screenshot of desktop header
- List of all CSS file URLs with hashes
- Hamburger menu computed display style
- DOM element existence confirmation
- Comparison before/after hard reload
- Media query rules if accessible
- Any console errors or warnings

## Context
User suspects hamburger menu is visible on desktop due to CSS file caching or incorrect media query application.
