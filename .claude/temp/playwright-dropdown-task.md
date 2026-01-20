# Task: Inspect Guest Dropdown Menu Styling on Dev Site

## Objective
Navigate to http://localhost:8000 and diagnose CSS styling issues with the Guest dropdown menu on mobile viewport.

## MCP Server to Use
Use `playwright-guest-dev` MCP server for all browser operations.

## Steps

1. **Navigate to dev site**
   - URL: http://localhost:8000
   - Wait for page to load completely

2. **Set mobile viewport**
   - Resize to 375x667 (typical mobile dimensions)

3. **Take initial snapshot**
   - Capture the page state before interaction

4. **Locate Guest dropdown**
   - Look for user profile button/avatar (likely in header)
   - Identify the clickable element that opens the Guest dropdown menu

5. **Open dropdown and inspect**
   - Click the dropdown trigger
   - Take snapshot with dropdown open
   - Examine CSS classes applied to dropdown menu
   - Check for width, positioning, styling attributes

6. **Check console for errors**
   - Report any CSS-related console errors or warnings

## Expected Findings

Report on:
- Dropdown menu visibility and appearance
- CSS classes present on dropdown elements
- Width constraints (should be narrow on mobile)
- Any styling issues observed
- Console errors related to CSS or rendering

## Context
We recently applied CSS changes to narrow the dropdown menu width, but need to verify it's working correctly on mobile viewport.
