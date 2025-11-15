---
name: verify-grid-layout
description: Verify the cascading grid layout deployment on live site
agent: mcp-tool-specialist
---

Please perform the following verification steps using Playwright MCP:

1. Wait 30 seconds before starting (to allow Cloudflare Pages rebuild)
2. Navigate to: https://9d6020cb.splitlease.pages.dev/?days-selected=2%2C3%2C4%2C5%2C6
3. Wait for page to fully load
4. Refresh the page once to ensure latest version
5. Scroll to the "Check Out Some Listings" section
6. Take a screenshot showing the listings grid area, save it to: C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\grid-layout-verification.png
7. Using browser evaluate:
   - Check if `.listings-grid` element exists
   - Get computed style `grid-template-columns` value from `.listings-grid`
   - Check if `.home-page` class is present on root element
   - Count how many listing cards are visible
8. Click on the first listing card to test redirect functionality
9. Record the URL after click
10. Close browser properly

Return:
- Screenshot absolute file path
- Whether 4-column grid layout is applied (check for `repeat(4, 280px)` or similar)
- CSS inspection results (exact grid-template-columns value)
- Whether .home-page class is present
- Number of visible cards
- Whether redirect worked (what URL it navigated to)
