# Search Page Filter Style Update Plan

**Created**: 2026-01-09
**Type**: BUILD (Frontend-only CSS/Style changes)
**Risk Level**: LOW (No backend changes, visual only)

---

## Summary

Update the search page filter section to match the new design mockup. This involves restructuring the filter bar layout, adding a filter popup system, implementing filter tags, and updating the schedule selector styling.

---

## Design Analysis: Current vs. New

### Current Implementation
- All filters displayed inline in a horizontal flex container
- Schedule selector with emoji calendar icon
- Standard select dropdowns for Borough, Week Pattern, Price Tier, Sort By
- Neighborhood multi-select with chips
- No filter popup - all filters always visible
- Check-in/check-out text displayed below schedule selector

### New Design (from mockup)
1. **Two-row filter section**:
   - **Row 1**: Schedule selector (day pills) + Filter toggle button
   - **Row 2**: Filter tags row (only visible when filters are active)

2. **Schedule Selector Changes**:
   - Calendar icon: Light indigo background (#f5f3ff), border (#e0e7ff)
   - Day pills: Rounded squares (border-radius: 8px instead of 10px)
   - Selected: Blue (#4B47CE)
   - Inactive/Unselected: Gray (#B2B2B2)
   - Check-in/out text with sync icon below

3. **Filter Toggle Button**:
   - 44x44px square button with funnel icon
   - Appears next to schedule selector when NO filters active
   - Badge shows filter count when filters exist
   - Moves to filter tags row when filters are active

4. **Filter Tags Row**:
   - Only visible when filters exist (animated slide-in)
   - Contains: small filter button with badge + horizontally scrollable tags
   - Filter pills: Light indigo background (#f0f0ff), pill shape
   - Each tag has feather icon + text + X remove button
   - Staggered animation on appearance

5. **Filter Popup**:
   - Fixed position modal (not inline)
   - Contains: Neighborhood, Borough, Week Pattern, Price Range, Property Type
   - Header with "Filters" title + "Clear all" link
   - Footer with Cancel/Apply buttons
   - Backdrop overlay when open

6. **Results Header Changes**:
   - Simplified: Just count + sort dropdown
   - No inline filters

---

## Files to Modify

### Primary Files
| File | Changes |
|------|---------|
| `app/src/styles/components/search-page.css` | New filter bar styles, filter popup, filter tags |
| `app/src/islands/shared/SearchScheduleSelector.jsx` | Update styled-components for day pills |
| `app/src/islands/pages/SearchPage.jsx` | Restructure filter section JSX, add popup state |

### Secondary Files (may need minor tweaks)
| File | Changes |
|------|---------|
| `app/src/styles/components/search-page.css` (mobile section) | Mobile filter layout adjustments |

---

## Implementation Steps

### Phase 1: CSS Foundation (search-page.css)

#### 1.1 Add Filter Section Styles
Add new CSS at ~line 55 (after `.inline-filters`):

```css
/* ========================================
   FILTER SECTION - New Design
   ======================================== */

.filter-section {
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  position: sticky;
  top: 0;
  z-index: 100;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Schedule Selector Group */
.schedule-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Calendar Icon - New Design */
.calendar-icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f3ff;
  border: 1px solid #e0e7ff;
  border-radius: 8px;
  cursor: pointer;
  color: #6366f1;
}

.calendar-icon-btn svg {
  width: 18px;
  height: 18px;
}

/* Day Pills Container */
.day-pills {
  display: flex;
  gap: 6px;
}
```

#### 1.2 Add Filter Toggle Button Styles
```css
/* Filter Toggle Button */
.filter-popup-wrapper {
  position: relative;
}

.filter-toggle-btn {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid #e5e5e5;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.filter-toggle-btn:hover,
.filter-toggle-btn.active {
  border-color: #9ca3af;
  background: #f9fafb;
}

.filter-toggle-btn svg {
  width: 20px;
  height: 20px;
  color: #6b7280;
}

.filter-toggle-btn:hover svg,
.filter-toggle-btn.active svg {
  color: #374151;
}

.filter-toggle-btn:active {
  transform: scale(0.95);
}

.filter-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px;
  height: 20px;
  background: var(--secondary-purple, #6D31C2);
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

#### 1.3 Add Check-in/out Text Styles
```css
/* Check-in/out text */
.checkin-text {
  font-size: 13px;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
}

.checkin-text .sync-icon {
  color: var(--secondary-purple, #6D31C2);
  width: 16px;
  height: 16px;
}

.checkin-text strong {
  color: var(--secondary-purple, #6D31C2);
  font-weight: 600;
}
```

#### 1.4 Add Filter Tags Row Styles
```css
/* Filter Tags Row */
.filter-tags-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
  background: #fafafa;
  border-bottom: 1px solid transparent;
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s ease,
              padding 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.2s ease;
}

.filter-tags-row.has-filters {
  max-height: 80px;
  opacity: 1;
  padding: 12px 20px;
  border-bottom-color: #e5e7eb;
}

/* Filter Tags */
.filter-tags-single-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  min-width: 0;
}

.filter-tags-single-row::-webkit-scrollbar {
  height: 0;
  display: none;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f0f0ff;
  border: 1px solid #e0e0ff;
  border-radius: 9999px;
  font-size: 13px;
  color: #4338ca;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
  animation: tagSlideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.filter-tag:hover {
  background: #e8e8ff;
  border-color: #d0d0ff;
}

.filter-tag svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.filter-tag-sm {
  padding: 4px 10px;
  font-size: 12px;
}

.filter-tag-remove {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: #6366f1;
  border-radius: 50%;
  margin-left: 2px;
  padding: 0;
  transition: background 0.2s ease;
}

.filter-tag-remove:hover {
  background: #e0e7ff;
}

/* Stagger animation for tags */
.filter-tag:nth-child(1) { animation-delay: 0ms; }
.filter-tag:nth-child(2) { animation-delay: 50ms; }
.filter-tag:nth-child(3) { animation-delay: 100ms; }
.filter-tag:nth-child(4) { animation-delay: 150ms; }
.filter-tag:nth-child(5) { animation-delay: 200ms; }

@keyframes tagSlideIn {
  from {
    opacity: 0;
    transform: translateX(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}
```

#### 1.5 Add Filter Popup Styles
```css
/* Filter Popup */
.filter-popup {
  position: fixed;
  top: 140px;
  left: 20px;
  width: 340px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1);
  border: 1px solid #e5e5e5;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px) scale(0.98);
  transition: all 0.2s ease;
}

.filter-popup.open {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.filter-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.filter-popup-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.filter-popup-clear {
  font-size: 13px;
  color: var(--secondary-purple, #6D31C2);
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.filter-popup-clear:hover {
  text-decoration: underline;
}

.filter-popup-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-height: 400px;
  overflow-y: auto;
}

.filter-popup-footer {
  padding: 16px 20px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  gap: 12px;
}

.filter-popup .btn {
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.filter-popup .btn-secondary {
  background: white;
  border: 1px solid #e5e5e5;
  color: #374151;
}

.filter-popup .btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.filter-popup .btn-primary {
  background: var(--secondary-purple, #6D31C2);
  border: 1px solid var(--secondary-purple, #6D31C2);
  color: white;
}

.filter-popup .btn-primary:hover {
  background: var(--primary-purple, #31135D);
  border-color: var(--primary-purple, #31135D);
}

/* Backdrop */
.filter-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.1);
  z-index: 500;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
}

.filter-backdrop.open {
  opacity: 1;
  visibility: visible;
}
```

#### 1.6 Add Results Filter Button Styles
```css
/* Results Filter Button (in tags row) */
.results-filter-btn {
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 8px;
  border: 1px solid #e5e5e5;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.results-filter-btn:hover {
  border-color: #9ca3af;
  background: #f9fafb;
}

.results-filter-btn svg {
  width: 16px;
  height: 16px;
  color: #6b7280;
}

.results-filter-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 18px;
  height: 18px;
  background: var(--secondary-purple, #6D31C2);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

/* Hide top filter button when filters exist */
.has-active-filters #topFilterWrapper {
  opacity: 0;
  transform: scale(0.8);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

### Phase 2: Schedule Selector Updates (SearchScheduleSelector.jsx)

#### 2.1 Update DayCell Styled Component
Change border-radius from 10px to 8px and update sizing:

```jsx
const DayCell = styled.button`
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  /* ... rest stays same but border-radius: 8px */
  border-radius: 8px;
  /* ... */
`;
```

#### 2.2 Update CalendarIcon Styled Component
Add the new indigo background styling:

```jsx
const CalendarIcon = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f3ff;
  border: 1px solid #e0e7ff;
  border-radius: 8px;
  cursor: pointer;
  color: #6366f1;
  flex-shrink: 0;

  svg {
    width: 18px;
    height: 18px;
  }
`;
```

#### 2.3 Update CheckInOutRow for Sync Icon
Update the RepeatIcon/sync icon styling to match new design.

---

### Phase 3: SearchPage.jsx Structure Changes

#### 3.1 Add Filter Popup State
Add new state variables:
```jsx
const [isFilterPopupOpen, setIsFilterPopupOpen] = useState(false);
```

#### 3.2 Restructure Filter Section JSX
Replace the current `.inline-filters` structure with:

1. **New Filter Section** containing:
   - Filter bar with schedule selector + filter toggle button
   - Check-in/out text

2. **Filter Tags Row** (conditionally visible):
   - Results filter button with badge
   - Scrollable filter tags

3. **Filter Popup** (fixed position, outside scroll container):
   - Filter inputs for Neighborhood, Borough, Week Pattern, Price, Property Type
   - Cancel/Apply buttons

#### 3.3 Add Filter Tag Generation Logic
Create helper function to generate filter tags from current filter state:
```jsx
const getActiveFilterTags = () => {
  const tags = [];
  if (selectedBorough && selectedBorough !== 'all') {
    tags.push({ type: 'borough', icon: 'map-pin', label: boroughs.find(b => b.value === selectedBorough)?.name });
  }
  if (priceTier && priceTier !== 'all') {
    tags.push({ type: 'price', icon: 'dollar-sign', label: getPriceTierLabel(priceTier) });
  }
  // ... etc
  return tags;
};
```

#### 3.4 Add Filter Popup Component
Create the popup JSX with all filter inputs moved inside.

---

### Phase 4: Feather Icons Integration

The mockup uses Feather icons. Check if already available or add:
- calendar
- map-pin
- dollar-sign
- repeat
- home
- x (for remove buttons)
- filter (funnel icon)

Either use `react-feather` package or inline SVGs.

---

## Testing Checklist

- [ ] Desktop: Filter bar displays correctly with schedule selector + filter button
- [ ] Desktop: Filter popup opens/closes with animations
- [ ] Desktop: Filter tags appear when filters are applied
- [ ] Desktop: Filter tags row animates in/out smoothly
- [ ] Desktop: Removing individual filter tags works
- [ ] Desktop: "Clear all" in popup resets all filters
- [ ] Desktop: Schedule selector day pills have correct styling
- [ ] Desktop: Check-in/out text displays correctly with sync icon
- [ ] Mobile: Filter system still works (may need separate mobile-specific adjustments)
- [ ] Backend: NO changes to data fetching, filtering logic, or API calls
- [ ] Backend: URL parameters still work correctly

---

## Risk Mitigation

1. **Keep existing filter logic intact** - Only change presentation layer
2. **Preserve all existing class names** used by filter logic
3. **Test URL parameter synchronization** after changes
4. **Mobile layout** - May need follow-up plan for mobile-specific changes
5. **No changes to**:
   - `useSearchPageLogic.js` (filter state management)
   - Any Edge Functions
   - Any database queries
   - Any API calls

---

## Estimated Scope

- **CSS additions**: ~300-400 lines
- **JSX restructure**: ~150-200 lines modified
- **Styled-components updates**: ~20-30 lines

---

## References

- New design mockup: `search-page-complete-mockup.html` (provided)
- Implementation guide: `filter-implementation-guide.txt` (provided)
- Current CSS: `app/src/styles/components/search-page.css`
- Current JSX: `app/src/islands/pages/SearchPage.jsx` (lines 2714-2821)
- Schedule selector: `app/src/islands/shared/SearchScheduleSelector.jsx`
