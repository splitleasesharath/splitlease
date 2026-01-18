# Proposals Islands - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Proposal components directory status and migration

---

## QUICK_STATS

[TOTAL_FILES]: 1 (CLAUDE.md only)
[PRIMARY_LANGUAGE]: N/A
[KEY_PATTERNS]: Directory deprecated, components moved
[STATUS]: DEPRECATED

---

## DIRECTORY_STATUS

[CURRENT_STATE]: Empty directory (contains only CLAUDE.md)
[PREVIOUS_PURPOSE]: Specialized components for proposal display and management
[MIGRATION_DATE]: Unknown (pre-2025-11-26)
[NEW_LOCATION]: app/src/islands/pages/proposals/

---

## MIGRATION_NOTICE

This directory (`app/src/islands/proposals/`) is now **DEPRECATED**.

All proposal components have been relocated to:
```
app/src/islands/pages/proposals/
```

### Components Now Located at pages/proposals/

The following components were previously documented as being in this directory but are now located in `pages/proposals/`:

1. **ProgressTracker.jsx** - 6-stage progress indicator for proposal lifecycle
2. **ProposalCard.jsx** - Detailed proposal display card with status banners
3. **ProposalSelector.jsx** - Dropdown for selecting between multiple proposals
4. **VirtualMeetingsSection.jsx** - Displays scheduled virtual meetings
5. **useGuestProposalsPageLogic.js** - Business logic hook for Guest Proposals Page

---

## REASON_FOR_MIGRATION

[ARCHITECTURAL_DECISION]: Components are specific to GuestProposalsPage
[ORGANIZATIONAL_BENEFIT]: Co-locate page-specific components with their page logic
[PATTERN]: Follows React Islands pattern - page components grouped together

---

## CURRENT_FILES

### CLAUDE.md
[INTENT]: Documentation file explaining directory status
[EXPORTS]: None
[DEPENDS_ON]: None
[USED_BY]: LLM agents for codebase navigation

---

## ACTION_REQUIRED

[RECOMMENDATION]: Consider removing this empty directory
[ALTERNATIVE]: Repurpose for future shared proposal components (not page-specific)
[BREAKING_CHANGES]: None - no imports reference this location

---

## SEE_ALSO

- **Actual Proposal Components**: app/src/islands/pages/proposals/CLAUDE.md
- **GuestProposalsPage**: app/src/islands/pages/GuestProposalsPage.jsx
- **Architecture Guide**: app/src/islands/CLAUDE.md
- **Page Components**: app/src/islands/pages/CLAUDE.md

---

**LAST_UPDATED**: 2025-12-11
**DIRECTORY_PURPOSE**: Deprecated (empty)
**FUTURE_USE**: TBD
