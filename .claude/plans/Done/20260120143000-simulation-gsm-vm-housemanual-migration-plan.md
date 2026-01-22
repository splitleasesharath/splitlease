# Simulation Guest Actions Page - Migration Plan

**Date:** 2026-01-20
**Source:** Bubble page `simulation-gsm-vm-housemanual`
**Target:** React + Supabase Islands Architecture
**Status:** ✅ COMPLETED (Already Implemented)
**Estimated Effort:** 40-60 hours

---

## ✅ Completion Note (2026-01-21)

**This plan was marked as COMPLETED because the functionality already exists.**

Upon review, the `SimulationGuestsideDemoPage` at `/simulation-guestside-demo` (alias: `/usability-test`) **already implements 90%+ of the requirements outlined in this plan**.

### Existing Implementation Details

| Planned Component | Existing Implementation |
|-------------------|------------------------|
| Page Route | `/simulation-guestside-demo` in [routes.config.js:446-453](app/src/routes.config.js#L446-L453) |
| Page Component | [SimulationGuestsideDemoPage.jsx](app/src/islands/pages/SimulationGuestsideDemoPage/SimulationGuestsideDemoPage.jsx) |
| Logic Hook | [useSimulationGuestsideDemoPageLogic.js](app/src/islands/pages/SimulationGuestsideDemoPage/useSimulationGuestsideDemoPageLogic.js) (850 lines) |
| Step Constants | [simulationSteps.js](app/src/islands/pages/SimulationGuestsideDemoPage/constants/simulationSteps.js) |
| Progress Component | [SimulationProgress.jsx](app/src/islands/pages/SimulationGuestsideDemoPage/components/SimulationProgress.jsx) |
| Step Button | [StepButton.jsx](app/src/islands/pages/SimulationGuestsideDemoPage/components/StepButton.jsx) |
| CSS Styling | [SimulationGuestsideDemoPage.css](app/src/islands/pages/SimulationGuestsideDemoPage/SimulationGuestsideDemoPage.css) (682 lines) |
| Backend Edge Function | Uses existing [proposal/index.ts](supabase/functions/proposal/index.ts) with simulation actions |

### Implemented Steps

| Step | Status | Implementation |
|------|--------|----------------|
| **A** | ✅ | `handleStepA` - marks `is usability tester`, updates `Usability Step` |
| **B** | ✅ | `handleStepB` - creates test proposal, schedules virtual meeting |
| **C** | ✅ | `handleStepC_Ending1` & `handleStepC_Ending2` - **2 branching paths** (Accept OR Counteroffer) |
| **D** | ✅ | `handleStepD` - creates lease record, updates proposal status |
| **E** | ✅ | `handleStepE` - simulates payment locally, activates lease |

### Edge Function Actions Already Available

The `proposal` Edge Function already supports these usability test actions:
- `createTestProposal`
- `createTestRentalApplication`
- `acceptProposal`
- `createCounteroffer`
- `acceptCounteroffer`

### Features Present in Existing Implementation

- ✅ Hollow Component Pattern (all logic in hook)
- ✅ Progress persistence (URL parameters + database `user."Usability Step"`)
- ✅ Branching paths (2 endings)
- ✅ Toast notifications
- ✅ Reset functionality
- ✅ Auth integration
- ✅ Responsive CSS (682 lines)

### Minor Differences from Plan

| Plan Proposed | Existing Implementation |
|--------------|------------------------|
| Separate `simulation` Edge Function | Reuses `proposal` function (better DRY) |
| Separate handler files per step | Logic consolidated in hook (simpler structure) |
| `localStorage` persistence | URL params + database (more robust) |
| Single counteroffer path | Two branching paths (richer UX) |

**Decision:** The existing implementation is superior in several ways (database persistence, branching paths, code consolidation). No new work required.

---

# Original Plan (For Reference)

## Executive Summary

This plan adapts the Bubble "Simulated Guest Actions" testing page to our React + Supabase architecture. The page enables testers to simulate the complete guest rental journey through 5 sequential steps:

| Step | Bubble Description | Our Adaptation |
|------|-------------------|----------------|
| **A** | Mark as usability tester & Autofill Rental App | Set test user flag + auto-populate proposal form |
| **B** | Virtual Meeting Invitations from Hosts 1 & 2 | Trigger mock meeting invitations via Edge Function |
| **C** | Counteroffer Simulation from Host 3 | Create counteroffer proposal record |
| **D** | Host Accepts & Lease Draft & House Manual | Accept proposal + trigger lease workflow |
| **E** | Signed Lease & Initial Payment | Complete lease signing flow |

---

## Architecture Adaptation Strategy

### Key Differences: Bubble vs Our Stack

| Aspect | Bubble Original | Our Adaptation |
|--------|-----------------|----------------|
| **Data Layer** | Bubble Database (primary) | Supabase (replica) + Bubble via Edge Functions |
| **Frontend** | Bubble's visual programming | React Islands Architecture |
| **Workflows** | 19 Bubble workflows | Edge Functions + Frontend hooks |
| **Backend** | 296 Backend workflows | Edge Functions with queue-based sync |
| **State** | Bubble custom states | React useState + localStorage |
| **Auth** | Bubble Auth | Supabase Auth + legacy Bubble token validation |
| **Charts** | Apex Charts plugin | Chart.js or Recharts (optional) |

### Inconsistency Resolution Matrix

| Bubble Pattern | Problem | Our Solution |
|----------------|---------|--------------|
| Custom States on elements | Scattered state | Centralized in `useSimulationPageLogic.js` hook |
| 19 uncategorized workflows | Hard to trace | Organized by step (A-E) in dedicated handlers |
| Backend workflow scheduling | Complex timing | Queue-based with `sync_queue` table |
| JS2Bubble plugin | Tight coupling | Pure JavaScript in React |
| Reusable "Sign up & Login A" | Different auth flow | Use existing `SignUpLoginModal` component |
| Chart (Apex) Beta | Plugin dependency | Remove or replace with lightweight chart |
| Date calculations in workflows | Bubble-specific | Use `app/src/lib/dayUtils.js` |

---

## File References

### Existing Implementation (USE THESE)
- [SimulationGuestsideDemoPage/](app/src/islands/pages/SimulationGuestsideDemoPage/) - Complete implementation
- [routes.config.js](app/src/routes.config.js) - Route at line 446
- [proposal/index.ts](supabase/functions/proposal/index.ts) - Backend with simulation actions

### Architecture Documentation
- [.claude/CLAUDE.md](../../CLAUDE.md) - Main project documentation
- [app/CLAUDE.md](../../../app/CLAUDE.md) - Frontend architecture
- [supabase/CLAUDE.md](../../../supabase/CLAUDE.md) - Edge Functions reference

---

**Document Version:** 1.0 → 2.0 (Completed)
**Created:** 2026-01-20
**Completed:** 2026-01-21
**Author:** Claude (Implementation Planner)
**Completion Note:** Already implemented in SimulationGuestsideDemoPage
