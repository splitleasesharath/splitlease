# Documentation Enrichment Plan

**Created**: 2026-01-20T03:10:23
**Objective**: Update all documentation in `.claude/Documentation/` to be current, accurate, and comprehensive
**Scope**: 55 markdown files across 8 documentation categories

---

## Executive Summary

This plan addresses significant documentation drift discovered during codebase analysis. The documentation was last comprehensively updated on **2025-12-11**, but the codebase has undergone substantial changes since then, including:

- **16 new Edge Functions** added (documentation lists 10-11, actual count is 26+)
- **Major feature additions**: messaging system, reminder scheduler, payment records, virtual meetings, house manual, date change requests
- **Architectural changes**: De-barreling refactoring, day indexing migration from Bubble format to native 0-indexed
- **New components**: Mobile header dropdowns, floating avatars, schedule section updates
- **Logic layer changes**: New four-layer logic files for reminders, reviews, scheduling

---

## Documentation Categories & File Count

| Category | Files | Priority | Status |
|----------|-------|----------|--------|
| Backend (Edge Functions) | 13 | **HIGH** | Severely outdated |
| Pages | 24 | HIGH | Partially outdated |
| Architecture | 3 | HIGH | Outdated |
| Database | 6 | MEDIUM | Partially current |
| Auth | 4 | MEDIUM | Mostly current |
| Routing | 2 | LOW | Current |
| External | 2 | LOW | Current |
| Root (mini/largeCLAUDE) | 2 | **CRITICAL** | Outdated statistics |

---

## Phase 1: Critical Updates (Backend Edge Functions)

### 1.1 README.md - Complete Rewrite

**Current State**: Lists 10 Edge Functions
**Actual State**: 26+ Edge Functions exist

**Missing Edge Functions** (16 new):
1. `messages` - Real-time messaging threads with SplitBot
2. `reminder-scheduler` - Automated reminder system
3. `guest-payment-records` - Guest payment record generation
4. `host-payment-records` - Host payment record generation
5. `date-change-request` - Two-tier throttling date change system
6. `house-manual` - AI Tools suite for house manual creation
7. `virtual-meeting` - Virtual meeting scheduling
8. `qr-generator` - QR code generator
9. `query-leo` - Query interface
10. `rental-application` - Rental application processing
11. `send-email` - Email sending service
12. `send-sms` - SMS sending service
13. `cohost-request` - Cohost request handling
14. `cohost-request-slack-callback` - Slack callback for cohost
15. `workflow-enqueue` - Workflow queue system
16. `workflow-orchestrator` - Workflow orchestration

**Actions**:
- [ ] Update Edge Function count from 10 to 26+
- [ ] Add entries for all 16 missing functions
- [ ] Update shared utilities count (now 10+)
- [ ] Update "Quick Stats" section

### 1.2 New Documentation Files Required

Create documentation for each new Edge Function:

| Function | File to Create | Priority |
|----------|----------------|----------|
| messages | `MESSAGES.md` | HIGH |
| reminder-scheduler | `REMINDER_SCHEDULER.md` | HIGH |
| virtual-meeting | `VIRTUAL_MEETING.md` | HIGH |
| guest-payment-records | `GUEST_PAYMENT_RECORDS.md` | MEDIUM |
| host-payment-records | `HOST_PAYMENT_RECORDS.md` | MEDIUM |
| date-change-request | `DATE_CHANGE_REQUEST.md` | MEDIUM |
| house-manual | `HOUSE_MANUAL.md` | MEDIUM |
| qr-generator | `QR_GENERATOR.md` | LOW |
| send-email | `SEND_EMAIL.md` | LOW |
| send-sms | `SEND_SMS.md` | LOW |
| rental-application | `RENTAL_APPLICATION.md` | MEDIUM |
| cohost-request | `COHOST_REQUEST.md` | LOW |
| workflow-* | `WORKFLOW_SYSTEM.md` | LOW |

### 1.3 PROPOSAL.md - Major Update

**Changes since last update**:
- Removed Bubble sync from all proposal operations (commit `b9b31970`)
- Added mockup proposal creation action
- Added AI-powered negotiation summaries (commit `0204aabf`)
- Added 8-second timeout to AI summary generation
- Correct host compensation for monthly/weekly billing
- Thread creation and SplitBot messaging integration

**Actions**:
- [ ] Document removal of Bubble sync
- [ ] Add `createMockupProposal` action
- [ ] Document AI summary integration
- [ ] Update sync section to note Supabase-only operations

### 1.4 LISTING.md - Update

**Changes**:
- Removed Bubble sync from listing submission (commit `3ef77b4d`)
- Added delete action for Supabase-only operations (commit `e0707f12`)
- Removed createMockupProposal action (moved to proposal function)

**Actions**:
- [ ] Remove Bubble sync documentation
- [ ] Document delete action
- [ ] Update to reflect Supabase-only operations

### 1.5 AUTH_USER.md - Update

**Changes**:
- Removed Bubble dependency from validate action (commit `18cd61f9`)
- Added name trimming in OAuth signup handler (commit `f301c34f`)

**Actions**:
- [ ] Document removal of Bubble validation dependency
- [ ] Update validate action flow

---

## Phase 2: Architecture Documentation

### 2.1 DIRECTORY_STRUCTURE.md - Major Update

**Current State**: Lists 11 Edge Functions in directory tree
**Actual State**: 26+ Edge Functions

**Additional Changes**:
- New shared components (DateChangeRequest, ReminderHouseManual, etc.)
- New logic layer files
- De-barreled structure (removed index.js barrel files)

**Actions**:
- [ ] Update Edge Functions directory listing
- [ ] Add new shared component directories
- [ ] Update logic layer structure
- [ ] Remove outdated barrel file references
- [ ] Update statistics section

### 2.2 ARCHITECTURE_GUIDE_ESM_REACT_ISLAND.md - Review

**Check**:
- Day indexing documentation (now 0-indexed natively)
- Barrel file removal impact
- New component patterns

### 2.3 FP_BIBLE.md - Review

No changes expected - stable reference document.

---

## Phase 3: Page Documentation Updates

### 3.1 HOME_QUICK_REFERENCE.md - Update

**Changes since 2025-12-11**:
- Mobile hero responsiveness (commit `185f3c8e`)
- Floating avatars on mobile (commit `5907b014`)
- Hero stats hidden on mobile (commit `15c9790e`)
- White background, smaller button in hero (commit `8a41eca0`)
- Mobile dropdown navigation changes (commits `279ee2be`, etc.)
- Featured listings handling for direct URL strings (commit `3ee28264`)
- Different fallback images for listings without photos (commit `94168d74`)
- Lottie animation updates (commits `a764b691`, `3c4f406b`)
- "Full Week" renamed to "Weeks of the Month" (commit `25f4c563`)

**Actions**:
- [ ] Document mobile responsive changes
- [ ] Update hero section documentation
- [ ] Update InvertedScheduleCards section
- [ ] Document featured listings fallback behavior

### 3.2 GUEST_PROPOSALS_QUICK_REFERENCE.md - Update

**Changes**:
- Auto-expand proposal card from URL query parameter (commit `47ed5c77`)
- Display custom schedule preferences to hosts (commit `be47f969`)
- Host name and profile photo display (commit `7264782e`)
- Message display improvements (commits `fe32217f`, `ec6046ff`)
- Duplicate submission prevention (commit `a7cd3045`)

**Actions**:
- [ ] Document URL query parameter feature
- [ ] Update data flow section
- [ ] Document new display features

### 3.3 HOST_PROPOSALS_QUICK_REFERENCE.md - Create/Update

**Note**: This file may not exist. Check and create if needed.

**Changes**:
- Auto-open proposal details from URL (commit `a40d9b51`)
- Include rental type in query for dynamic label (commit `694103c7`)
- Include custom_schedule_description in query (commit `7864d046`)
- Leo DiCaprio mockup from database for demo (commit `9588896a`)

### 3.4 LISTING_DASHBOARD_QUICK_REFERENCE.md - Update

**Changes**:
- Messaging icon purple on listing dashboard (commit `3b1372b3`)

### 3.5 SEARCH_QUICK_REFERENCE.md - Update

**Changes**:
- Location pill button transformation (commits `b8e91451`, `a47bd240`)
- Expand button to collapsed header (commit `81add339`)
- PropertyCard component update for location pill (commit `64e76d53`)

### 3.6 VIEW_SPLIT_LEASE_QUICK_REFERENCE.md - Update

**Changes**:
- Favorite button added to booking section (commit `59bd2bda`)
- Message button hidden for all Host users (commit `038c0417`)

### 3.7 SELF_LISTING_QUICK_REFERENCE.md - Update

**Changes**:
- Skip user type selection, go directly to signup (commit `a77020e9`)
- Review card image constraint (commit `9a47d2cd`)

### 3.8 RENTAL_APPLICATION_QUICK_REFERENCE.md - Update

**Changes**:
- Pre-fill form from user profile data (commit `10501376`)
- Sync job title for business owners (commit `001f561f`)
- Stepper regression fixes

### 3.9 ACCOUNT_PROFILE_QUICK_REFERENCE.md - Update

**Changes**:
- Role-specific milestones to profile strength (commit `e31e1eb7`)

### 3.10 MESSAGING_PAGE_REFERENCE.md - Review/Create

**May need creation** - Messaging system has undergone major changes:
- Header messaging panel improvements
- Thread queries with hyphen-prefixed columns
- RPC functions for thread queries
- Legacy auth support
- Send welcome messages flag

---

## Phase 4: Database Documentation

### 4.1 DATABASE_TABLES_DETAILED.md - Update

**Check for new tables**:
- `virtualmeetingschedulesandlinks`
- `reminder_*` tables
- `sync_queue` table updates
- `date_change_request` table

### 4.2 REFERENCE_TABLES_FK_FIELDS.md - Update

**Changes**:
- 12 FK constraints on listing table
- New reference tables for cancellation reasons

### 4.3 DATABASE_RELATIONS.md - Update

**Check**:
- New thread table relationships
- Virtual meeting relationships

### 4.4 JUNCTIONS_SCHEMA_CONVENTION.md - Review

No major changes expected.

---

## Phase 5: Root Documentation (miniCLAUDE.md / largeCLAUDE.md)

### 5.1 miniCLAUDE.md - Major Update

**Current Statistics (OUTDATED)**:
```
Edge Functions: 11
```

**Actual Statistics**:
```
Edge Functions: 26+
```

**Actions**:
- [ ] Update Edge Functions count
- [ ] Update data flow diagram
- [ ] Add new Edge Functions to index
- [ ] Update Key Files reference

### 5.2 largeCLAUDE.md - Major Update

Same updates as miniCLAUDE.md plus:
- [ ] Update complete directory structure
- [ ] Update Edge Functions section with all 26 functions
- [ ] Update statistics table

---

## Phase 6: Auth Documentation

### 6.1 AUTH_GUIDE.md - Review

**Check**:
- OAuth signup handler changes
- Bubble dependency removal

### 6.2 LOGIN_FLOW.md - Review

No major changes expected.

### 6.3 SIGNUP_FLOW.md - Update

**Changes**:
- AI signup improvements (commits `a4f85fac`, `a311b379`, etc.)
- Welcome email, SMS, internal notifications
- Topic detection pattern improvements

### 6.4 AUTH_USER_EDGE_FUNCTION.md - Update

**Changes**:
- Bubble dependency removal from validate action

---

## Phase 7: External & Routing Documentation

### 7.1 GOOGLE_MAPS_API_IMPLEMENTATION.md - Review

Minor: Google Places Autocomplete debugging was added (commit `f2b90cd7`)

### 7.2 HOTJAR_IMPLEMENTATION.md - Review

No changes expected.

### 7.3 ROUTING_GUIDE.md - Review

Check for any new routes added.

---

## Execution Strategy

### Order of Operations

1. **Phase 1.1**: Update README.md first (establishes baseline)
2. **Phase 5**: Update miniCLAUDE.md and largeCLAUDE.md (most referenced)
3. **Phase 2**: Architecture documentation
4. **Phase 1.2-1.5**: Individual Edge Function docs
5. **Phase 3**: Page documentation (prioritize high-traffic pages)
6. **Phase 4**: Database documentation
7. **Phase 6-7**: Auth, External, Routing

### Verification Checklist

For each updated file:
- [ ] VERSION number incremented
- [ ] LAST_UPDATED date set to 2026-01-20
- [ ] Cross-references to other docs verified
- [ ] Statistics/counts verified against codebase
- [ ] File paths verified to exist
- [ ] Import statements verified to be current

---

## Key Files Referenced

### Source Files for Verification

| Documentation Area | Verify Against |
|-------------------|----------------|
| Edge Functions | `supabase/functions/*/index.ts` |
| Page Components | `app/src/islands/pages/*.jsx` |
| Logic Layer | `app/src/logic/` |
| Shared Components | `app/src/islands/shared/` |
| Routes | `app/src/routes.config.js` |
| Database Tables | Supabase MCP or schema files |

### Recent Commits to Reference

- `b9b31970` - Removed Bubble sync from proposals
- `3ef77b4d` - Removed Bubble sync from listing submission
- `18cd61f9` - Removed Bubble dependency from auth validate
- `128eb02b` - Complete de-barrel refactoring
- `fff721a0` - Reminder scheduler Edge Function
- `f6b5cc71` - Messaging thread creation
- `ba40621f` - DateChangeRequest component
- `90130a82` - Day indexing migration (0-indexed native)

---

## Estimated Effort

| Phase | Files | Estimated Time |
|-------|-------|----------------|
| Phase 1 | 17 | 3-4 hours |
| Phase 2 | 3 | 1 hour |
| Phase 3 | 15 | 2-3 hours |
| Phase 4 | 4 | 1 hour |
| Phase 5 | 2 | 1 hour |
| Phase 6 | 4 | 30 min |
| Phase 7 | 3 | 30 min |
| **Total** | **48** | **9-11 hours** |

---

## Success Criteria

1. All documentation VERSION and LAST_UPDATED fields reflect 2026-01-20
2. Edge Function count accurate (26+)
3. All new features from commits since 2025-12-11 documented
4. No broken file path references
5. Statistics match current codebase state
6. Day indexing documentation reflects 0-indexed native format
7. Bubble sync removal documented where applicable

---

## Post-Update Tasks

1. Run `git status` to verify all changed files
2. Commit with message: `docs: Comprehensive documentation update - Phase X`
3. Verify cross-references still work
4. Consider adding documentation changelog

---

**PLAN_VERSION**: 1.0
**CREATED_BY**: Claude (implementation-planner)
**STATUS**: Ready for execution
