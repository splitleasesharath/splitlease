# Host Editing Proposal Style Fix Plan

## Reference: import-listing-modal.css (The Gold Standard)

### Protocol Design Tokens (from import-listing-modal.css)
| Token | Value | Usage |
|-------|-------|-------|
| Primary Purple | #31135D | Buttons, icons, focus states |
| Hover Purple | #4A2F7C | Button hover |
| Light BG | #F7F2FA | Icon hover, info banners |
| Border/Handle | #E7E0EC | Borders, grab handle, dividers |
| Text Primary | #1C1B1F | Headings, labels |
| Text Secondary | #49454F | Body text, close icon |
| Text Muted | #79747E | Helper text, placeholders |
| Danger | #DC3545 | Error states, outlined only |

### Protocol Structural Rules
1. **Container**: border-radius 16px, max-height 92vh, overflow hidden
2. **Grab Handle**: 36x4px, #E7E0EC, hidden desktop, visible mobile
3. **Header**: flex-shrink: 0, padding 16px 20px, border-bottom 1px #E7E0EC
4. **Body**: flex-grow: 1, overflow-y: auto
5. **Footer**: flex-shrink: 0, padding 16px 20px, border-top 1px #E7E0EC
6. **Close Button**: 32x32px container, 20x20px icon, #49454F color, hover #F7F2FA
7. **Buttons**: pill-shaped (100px radius), height 44px, Inter font

### Mobile Bottom Sheet (<480px)
1. Overlay: align-items flex-end, padding 0
2. Container: 24px 24px 0 0 radius, max-height 90vh, slideUp animation
3. Grab handle: display block
4. Safe area: padding-bottom for iOS home indicator

---

## Current State Assessment (TO DO)

### Files Being Modified:
- `app/src/islands/shared/HostEditingProposal/HostEditingProposal.css`
- `app/src/islands/shared/HostEditingProposal/HostEditingProposal.jsx`
- `app/src/styles/components/host-proposals.css`

### User Feedback History:
1. "it doesnt seam to be rihft" (with screenshot)
2. "it is still not matching the styl"
3. "great almost there update the x icons and the edit state, the buttons on the bottom are overlapping the pop up on mobile"
4. "you are not acomplishing" - CURRENT

### Checklist - Protocol Compliance

**NEED TO VERIFY (compare side-by-side with import-listing-modal):**

- [ ] Header structure matches
- [ ] Close button styling matches (32x32, hover #F7F2FA)
- [ ] Edit icon styling matches (32x32, hover #F7F2FA)
- [ ] Body scrolling works properly
- [ ] Footer fixed at bottom with border-top
- [ ] Buttons are pill-shaped (100px radius)
- [ ] Button colors correct (#31135D primary, #DC3545 danger outline)
- [ ] Mobile grab handle visible and styled
- [ ] Mobile bottom-sheet animation correct
- [ ] Mobile buttons not overlapping

---

## ELEMENT-BY-ELEMENT VERIFICATION PLAN

User will act as visual verification (human MCP tool).
Process: I describe what each element SHOULD look like → User confirms ✅ or rejects ❌ → I fix if needed

---

### ELEMENT 1: Grab Handle (Mobile Only)
**Expected per protocol:**
- Size: 36px wide × 4px tall
- Color: #E7E0EC (light purple-gray)
- Position: Centered horizontally, 8px from top
- Visibility: HIDDEN on desktop, VISIBLE on mobile (<480px)

**Current CSS:**
```css
.hep-grab-handle {
  display: none;  /* hidden desktop */
  width: 36px;
  height: 4px;
  background: #E7E0EC;
  border-radius: 2px;
  margin: 8px auto 0;
}
@media (max-width: 480px) {
  .hep-grab-handle { display: block; }
}
```

**User verification:** Does grab handle show on mobile? Is it the right size/color?

---

### ELEMENT 2: Header Layout
**Expected per protocol:**
- Title on LEFT, icons on RIGHT
- Title: Font size 18px (mobile) / 26px (desktop), left-aligned
- Header should have border-bottom: 1px solid #E7E0EC
- Flex layout with space-between

**Current CSS check needed:** Does header have border-bottom?

**User verification:** Is title on left, icons on right? Is there a divider line below header?

---

### ELEMENT 3: Close Icon (X)
**Expected per protocol:**
- Container: 32px × 32px
- Icon inside: 20px × 20px
- Color: #49454F (gray)
- Hover background: #F7F2FA (light purple)
- Border-radius: 8px

**User verification:** Does X icon have hover effect? Is it the right size?

---

### ELEMENT 4: Edit Icon (Pencil)
**Expected per protocol:**
- Container: 32px × 32px
- Icon inside: 18px × 18px
- Color: #31135D (purple)
- Hover background: #F7F2FA (light purple)
- Border-radius: 8px

**User verification:** Does edit icon have hover effect? Is it purple?

---

### ELEMENT 5: Body Content
**Expected per protocol:**
- Scrollable area (overflow-y: auto)
- Fills available space (flex: 1)
- Content doesn't overlap with header or footer

**User verification:** Can you scroll the body content without buttons moving?

---

### ELEMENT 6: Footer Buttons
**Expected per protocol:**
- Position: Fixed at bottom, doesn't scroll
- Border-top: 1px solid #E7E0EC (divider line above buttons)
- Buttons: Pill-shaped (border-radius: 100px)
- Primary button: #31135D background, white text
- Reject button: Transparent bg, #DC3545 border and text (outlined)
- Button height: 44px

**User verification:** Are buttons pill-shaped? Is there a line above buttons? Do buttons stay at bottom when scrolling?

---

### ELEMENT 7: Mobile Bottom Sheet
**Expected per protocol:**
- Modal slides up from bottom
- Border-radius: 24px 24px 0 0 (rounded top only)
- Buttons stack vertically
- Safe area padding at bottom for iPhone

**User verification:** (Test on mobile) Does modal slide up? Are corners rounded at top only?

---

## VERIFICATION SESSION

**STEP 1:** Open the HostEditingProposal modal on desktop.
Tell me: Which elements look WRONG? (1-7 from above)

**STEP 2:** Open on mobile (<480px).
Tell me: Which elements look WRONG?
