# Playwright MCP UI Verification Task

## Context
Verify the guest-proposals page UI at http://localhost:5180/guest-proposals

## Task Requirements

1. Navigate to http://localhost:5180/guest-proposals
2. Wait for the page to load completely (wait for network idle or key elements)
3. Take a screenshot and save it as "ui-verification-initial.png" in C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\
4. Look for a proposals dropdown selector at the top (should say "My Proposals (X)")
5. If there's a dropdown, click it to open it
6. Take a screenshot of the open dropdown and save it as "ui-verification-dropdown-open.png"
7. If there are any "See Details" or similar buttons visible, click one
8. Take a screenshot of any modal that opens and save it as "ui-verification-modal.png"
9. Close any modals (look for close button or ESC key)
10. Take a final screenshot of the page state
11. **IMPORTANT**: Close the browser when done

## Expected Output

Please capture and report:
- What UI elements are visible on the page
- Whether the layout matches expected design (dropdown, proposal cards, buttons, etc.)
- Any issues or missing elements
- Whether the styling (colors, spacing) looks correct
- If the page shows an error or doesn't load, report what you see

## Screenshot Save Location
All screenshots must be saved to: C:\Users\Split Lease\splitleaseteam\!Agent Context and Tools\SL6\Split Lease\

## Success Criteria
- All screenshots successfully captured
- Detailed report of UI elements and their states
- Any interactive elements tested (dropdown, modal)
- Browser properly closed after verification
