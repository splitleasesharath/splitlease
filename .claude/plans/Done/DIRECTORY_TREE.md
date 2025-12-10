# Split Lease - Complete Directory Tree

**Generated**: 2025-11-26 | **Status**: Complete

---

## Root Directory Structure

```
Split Lease/
│
├── .claude/                                    [Claude Code Configuration]
│   ├── commands/
│   │   ├── deploy.md                          [Deploy to Cloudflare]
│   │   ├── preview.md                         [Dev server]
│   │   ├── prime.md                           [Initialize]
│   │   ├── splitlease.md                      [Project commands]
│   │   └── Dump/                              [Extended commands]
│   │       ├── bug.md
│   │       ├── chore.md
│   │       ├── classify_adw.md
│   │       ├── classify_issue.md
│   │       ├── cleanup_worktrees.md
│   │       ├── code_convention.md
│   │       ├── commit.md
│   │       ├── conditional_docs.md
│   │       ├── document.md
│   │       ├── e2e/ (test commands)
│   │       ├── enforce_no_fallback.md
│   │       ├── feature.md
│   │       ├── generate_branch_name.md
│   │       ├── health_check.md
│   │       ├── implement.md
│   │       ├── install.md
│   │       ├── install_worktree.md
│   │       ├── in_loop_review.md
│   │       ├── no_fallback_check.md
│   │       ├── patch.md
│   │       ├── prepare_app.md
│   │       ├── pull_request.md
│   │       ├── README_NO_FALLBACK.md
│   │       ├── resolve_failed_e2e_test.md
│   │       └── [more commands...]
│   ├── hooks.disabled/                        [Git hooks (disabled)]
│   ├── logs/                                  [Execution logs]
│   ├── tasks/                                 [Task definitions]
│   ├── settings.json                          [Permissions & restrictions]
│   └── settings.local.json                    [Local overrides]
│
├── .git/                                      [Git repository]
│
├── .playwright-mcp/                           [Playwright browser automation]
│
├── .temp-signup-login/                        [Temp testing directory]
│
├── .vscode/                                   [VSCode workspace settings]
│
├── .wrangler/                                 [Wrangler CLI cache]
│
├── .env                                       [Root environment (git-ignored)]
│
├── .gitattributes                             [Git attributes]
│
├── .gitignore                                 [Git ignore patterns]
│
├── .node-version                              [Node 18 lock]
│
├── .pages.toml                                [Cloudflare Pages config]
│
├── app/                                       [MAIN APPLICATION - React + Vite]
│   ├── .env                                   [App environment]
│   ├── .env.example                           [Env template]
│   ├── .gitignore                             [App-level ignore]
│   ├── .gitkeep-functions                     [Placeholder]
│   ├── .wrangler/                             [Wrangler cache]
│   ├── BUBBLE_WORKFLOW_SETUP.md               [Bubble integration guide]
│   ├── CLAUDE.md                              [App developer guide]
│   ├── dist/                                  [Build output - GENERATED]
│   ├── functions/                             [Local functions for dev]
│   ├── node_modules/                          [Dependencies]
│   ├── package.json                           [App dependencies]
│   ├── package-lock.json                      [Dependency lock]
│   ├── public/                                [Static assets]
│   │   ├── _headers                           [Cloudflare headers]
│   │   ├── _redirects                         [Cloudflare redirects]
│   │   ├── _routes.json                       [Routes config]
│   │   ├── 404.html                           [Error page]
│   │   ├── account-profile.html               [Account page]
│   │   ├── assets/                            [CSS & images]
│   │   ├── careers.html
│   │   ├── faq.html
│   │   ├── guest-proposals.html               [Proposals page]
│   │   ├── guest-success.html                 [Success page]
│   │   ├── help-center.html                   [Help page]
│   │   ├── help-center-category.html
│   │   ├── host-success.html
│   │   ├── images/                            [Image assets]
│   │   ├── index.html                         [Home page]
│   │   ├── index-dev.html                     [Dev variant]
│   │   ├── list-with-us.html                  [Host signup]
│   │   ├── logged-in-avatar-demo.html         [Avatar demo]
│   │   ├── policies.html                      [Policies]
│   │   ├── search.html                        [Search page]
│   │   ├── search-test.html                   [Search test]
│   │   ├── self-listing.html                  [Create listing]
│   │   ├── view-split-lease.html              [Listing detail]
│   │   └── why-split-lease.html               [Marketing]
│   │
│   ├── src/                                   [Source code]
│   │   ├── 404.jsx                            [Entry: 404 page]
│   │   ├── account-profile.jsx                [Entry: Account]
│   │   ├── careers.jsx                        [Entry: Careers]
│   │   ├── faq.jsx                            [Entry: FAQ]
│   │   ├── guest-proposals.jsx                [Entry: Proposals]
│   │   ├── guest-success.jsx                  [Entry: Success]
│   │   ├── help-center.jsx                    [Entry: Help]
│   │   ├── help-center-category.jsx           [Entry: Help Category]
│   │   ├── host-success.jsx                   [Entry: Host success]
│   │   ├── listing-schedule-selector.jsx
│   │   ├── list-with-us.jsx                   [Entry: List with us]
│   │   ├── logged-in-avatar-demo.jsx
│   │   ├── main.jsx                           [Entry: Home/Landing]
│   │   ├── policies.jsx                       [Entry: Policies]
│   │   ├── search.jsx                         [Entry: Search]
│   │   ├── search-test.jsx                    [Entry: Search test]
│   │   ├── self-listing.jsx                   [Entry: Self listing]
│   │   ├── view-split-lease.jsx               [Entry: View listing]
│   │   ├── why-split-lease.jsx                [Entry: Why Split]
│   │   │
│   │   ├── data/                              [Data & lookups]
│   │   │   └── helpCenterData.js              [Help center content]
│   │   │
│   │   ├── islands/                           [React Island Components]
│   │   │   ├── modals/                        [Modal components]
│   │   │   │
│   │   │   ├── pages/                         [Page-level components]
│   │   │   │   ├── CareersPage.jsx
│   │   │   │   ├── FAQPage.jsx
│   │   │   │   ├── GuestProposalsPage.jsx
│   │   │   │   ├── GuestSuccessPage.jsx
│   │   │   │   ├── HelpCenterCategoryPage.jsx
│   │   │   │   ├── HelpCenterPage.jsx
│   │   │   │   ├── HomePage.jsx
│   │   │   │   ├── HostSuccessPage.jsx
│   │   │   │   ├── ListWithUsPage.jsx
│   │   │   │   ├── NotFoundPage.jsx
│   │   │   │   ├── PoliciesPage.jsx
│   │   │   │   ├── SearchPage.jsx
│   │   │   │   ├── SearchPageTest.jsx
│   │   │   │   ├── SelfListingPage.jsx        [Multi-section form]
│   │   │   │   ├── SelfListingPage/           [Organized subsections]
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── sections/
│   │   │   │   │   ├── store/
│   │   │   │   │   ├── styles/
│   │   │   │   │   ├── types/
│   │   │   │   │   └── utils/
│   │   │   │   ├── useGuestProposalsPageLogic.js
│   │   │   │   ├── useSearchPageLogic.js
│   │   │   │   ├── useViewSplitLeasePageLogic.js
│   │   │   │   ├── ViewSplitLeasePage.jsx
│   │   │   │   ├── ViewSplitLeasePage-old.jsx
│   │   │   │   ├── ViewSplitLeasePage Components/
│   │   │   │   └── WhySplitLeasePage.jsx
│   │   │   │
│   │   │   ├── proposals/                     [Proposal components]
│   │   │   │
│   │   │   └── shared/                        [Reusable components]
│   │   │       ├── AiSignupMarketReport/      [AI market research]
│   │   │       ├── Button.jsx
│   │   │       ├── ContactHostMessaging.jsx
│   │   │       ├── CreateDuplicateListingModal/
│   │   │       ├── CreateProposalFlowV2.jsx   [Multi-step wizard]
│   │   │       ├── CreateProposalFlowV2Components/
│   │   │       ├── DayButton.jsx
│   │   │       ├── ErrorOverlay.jsx
│   │   │       ├── ExternalReviews.jsx
│   │   │       ├── Footer.jsx
│   │   │       ├── GoogleMap.jsx
│   │   │       ├── Header.jsx
│   │   │       ├── ImportListingModal/
│   │   │       ├── InformationalText.jsx
│   │   │       ├── ListingCard.jsx
│   │   │       ├── ListingScheduleSelector.jsx
│   │   │       ├── ListingScheduleSelectorV2.jsx
│   │   │       ├── LoggedInAvatar.jsx
│   │   │       ├── LoggedInHeaderAvatar2.jsx
│   │   │       ├── PriceDisplay.jsx
│   │   │       ├── SearchScheduleSelector.jsx
│   │   │       ├── SignUpLoginModal.jsx
│   │   │       ├── SubmitListingPhotos/
│   │   │       ├── Toast.jsx
│   │   │       ├── useScheduleSelector.js
│   │   │       └── useScheduleSelectorLogicCore.js
│   │   │
│   │   ├── lib/                               [Utility libraries]
│   │   │   ├── auth.js                        [Auth functions]
│   │   │   ├── availabilityValidation.js
│   │   │   ├── bubbleAPI.js                   [Bubble API client]
│   │   │   ├── config.js
│   │   │   ├── constants.js                   [App constants]
│   │   │   ├── constants/
│   │   │   │   ├── proposalStages.js
│   │   │   │   └── proposalStatuses.js
│   │   │   ├── dataLookups.js
│   │   │   ├── dayUtils.js
│   │   │   ├── hotjar.js
│   │   │   ├── informationalTextsFetcher.js
│   │   │   ├── listingDataFetcher.js
│   │   │   ├── mapUtils.js
│   │   │   ├── nycZipCodes.ts
│   │   │   ├── priceCalculations.js
│   │   │   ├── proposalDataFetcher.js
│   │   │   ├── sanitize.js
│   │   │   ├── scheduleSelector/
│   │   │   │   ├── dayHelpers.js
│   │   │   │   ├── nightCalculations.js
│   │   │   │   ├── priceCalculations.js
│   │   │   │   └── validators.js
│   │   │   ├── SECURE_AUTH_README.md
│   │   │   ├── secureStorage.js               [Encrypted tokens]
│   │   │   ├── supabase.js                    [Supabase client]
│   │   │   ├── supabaseUtils.js
│   │   │   └── urlParams.js
│   │   │
│   │   ├── logic/                             [FOUR-LAYER ARCHITECTURE]
│   │   │   ├── index.js
│   │   │   │
│   │   │   ├── calculators/                   [LAYER 1: Pure math]
│   │   │   │   ├── index.js
│   │   │   │   ├── pricing/
│   │   │   │   │   ├── calculateFourWeekRent.js
│   │   │   │   │   ├── calculateGuestFacingPrice.js
│   │   │   │   │   ├── calculatePricingBreakdown.js
│   │   │   │   │   ├── calculateReservationTotal.js
│   │   │   │   │   └── getNightlyRateByFrequency.js
│   │   │   │   └── scheduling/
│   │   │   │       ├── calculateCheckInOutDays.js
│   │   │   │       ├── calculateNextAvailableCheckIn.js
│   │   │   │       └── calculateNightsFromDays.js
│   │   │   │
│   │   │   ├── rules/                        [LAYER 2: Boolean predicates]
│   │   │   │   ├── index.js
│   │   │   │   ├── auth/
│   │   │   │   │   ├── isProtectedPage.js
│   │   │   │   │   └── isSessionValid.js
│   │   │   │   ├── pricing/
│   │   │   │   │   └── isValidDayCountForPricing.js
│   │   │   │   ├── proposals/
│   │   │   │   │   ├── canAcceptProposal.js
│   │   │   │   │   ├── canCancelProposal.js
│   │   │   │   │   ├── canEditProposal.js
│   │   │   │   │   ├── determineProposalStage.js
│   │   │   │   │   ├── proposalRules.js
│   │   │   │   │   └── virtualMeetingRules.js
│   │   │   │   ├── scheduling/
│   │   │   │   │   ├── isDateBlocked.js
│   │   │   │   │   ├── isDateInRange.js
│   │   │   │   │   └── isScheduleContiguous.js
│   │   │   │   ├── search/
│   │   │   │   │   ├── isValidPriceTier.js
│   │   │   │   │   ├── isValidSortOption.js
│   │   │   │   │   └── isValidWeekPattern.js
│   │   │   │   └── users/
│   │   │   │       ├── hasProfilePhoto.js
│   │   │   │       ├── isGuest.js
│   │   │   │       ├── isHost.js
│   │   │   │       └── shouldShowFullName.js
│   │   │   │
│   │   │   ├── processors/                   [LAYER 3: Data transformation]
│   │   │   │   ├── index.js
│   │   │   │   ├── display/
│   │   │   │   │   └── formatHostName.js
│   │   │   │   ├── external/                 [System boundary adapters]
│   │   │   │   │   ├── adaptDayFromBubble.js
│   │   │   │   │   ├── adaptDaysFromBubble.js
│   │   │   │   │   ├── adaptDaysToBubble.js
│   │   │   │   │   └── adaptDayToBubble.js
│   │   │   │   ├── listing/
│   │   │   │   │   ├── extractListingCoordinates.js
│   │   │   │   │   └── parseJsonArrayField.js
│   │   │   │   ├── proposal/
│   │   │   │   │   └── processProposalData.js
│   │   │   │   ├── proposals/
│   │   │   │   │   └── processProposalData.js
│   │   │   │   └── user/
│   │   │   │       ├── processProfilePhotoUrl.js
│   │   │   │       ├── processUserData.js
│   │   │   │       ├── processUserDisplayName.js
│   │   │   │       └── processUserInitials.js
│   │   │   │
│   │   │   └── workflows/                    [LAYER 4: Orchestration]
│   │   │       ├── index.js
│   │   │       ├── auth/
│   │   │       │   ├── checkAuthStatusWorkflow.js
│   │   │       │   └── validateTokenWorkflow.js
│   │   │       ├── booking/
│   │   │       │   ├── acceptProposalWorkflow.js
│   │   │       │   ├── cancelProposalWorkflow.js
│   │   │       │   └── loadProposalDetailsWorkflow.js
│   │   │       ├── proposals/
│   │   │       │   ├── cancelProposalWorkflow.js
│   │   │       │   ├── counterofferWorkflow.js
│   │   │       │   ├── navigationWorkflow.js
│   │   │       │   └── virtualMeetingWorkflow.js
│   │   │       └── scheduling/
│   │   │           ├── validateMoveInDateWorkflow.js
│   │   │           └── validateScheduleWorkflow.js
│   │   │
│   │   └── routes/                           [Routing config]
│   │       (Currently empty - handled by HTML pages)
│   │
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.js                        [Build configuration]
│
├── supabase/                                 [BACKEND - Edge Functions + DB]
│   ├── .gitignore
│   ├── .temp/                                [Temp files]
│   ├── config.toml                           [Supabase project config]
│   ├── functions/                            [Deno Edge Functions]
│   │   ├── _shared/                          [Shared utilities]
│   │   │   ├── aiTypes.ts                    [AI types]
│   │   │   ├── bubbleSync.ts                 [Bubble API utilities]
│   │   │   ├── cors.ts                       [CORS handling]
│   │   │   ├── errors.ts                     [Error types]
│   │   │   ├── openai.ts                     [OpenAI integration]
│   │   │   ├── types.ts                      [Core types]
│   │   │   └── validation.ts                 [Input validation]
│   │   │
│   │   ├── ai-gateway/                       [AI Service Gateway]
│   │   │   ├── deno.json
│   │   │   ├── index.ts                      [Main entry]
│   │   │   ├── handlers/
│   │   │   │   ├── complete.ts               [Non-streaming]
│   │   │   │   └── stream.ts                 [Streaming]
│   │   │   └── prompts/
│   │   │       ├── _registry.ts              [Prompt routing]
│   │   │       └── _template.ts              [Prompt templates]
│   │   │
│   │   ├── ai-signup-guest/                  [AI Guest Signup]
│   │   │   └── index.ts
│   │   │
│   │   ├── bubble-auth-proxy/                [Auth Proxy]
│   │   │   ├── deno.json
│   │   │   ├── index.ts                      [Main proxy]
│   │   │   ├── handlers/
│   │   │   │   ├── login.ts
│   │   │   │   ├── logout.ts
│   │   │   │   ├── signup.ts
│   │   │   │   └── validate.ts
│   │   │   └── .npmrc
│   │   │
│   │   └── bubble-proxy/                     [General API Proxy]
│   │       ├── deno.json
│   │       ├── index.ts                      [Main proxy router]
│   │       ├── handlers/
│   │       │   ├── listing.ts
│   │       │   ├── messaging.ts
│   │       │   ├── photos.ts
│   │       │   ├── referral.ts
│   │       │   └── signup.ts
│   │       └── .npmrc
│   │
│   └── SECRETS_SETUP.md                      [API key configuration]
│
├── Context/                                  [Architecture Reference]
│   └── Refactoring Architecture for Logic Core.md
│
├── docs/                                     [Implementation Guides]
│   ├── AI_GATEWAY_IMPLEMENTATION_PLAN.md
│   ├── AI_GATEWAY_IMPLEMENTATION_PLAN_V2.md
│   ├── AI_SIGNUP_SUPABASE_MIGRATION.md
│   ├── AUTH_FLOW_COMPLETE.md
│   ├── AUTH_FLOW_DIAGRAM.md
│   ├── AUTH_QUICK_REFERENCE.md
│   ├── BUBBLE_WORKFLOW_API_ENUMERATION.md
│   ├── CODEBASE_COMPREHENSIVE_STRUCTURE.md  [THIS PROJECT REPORT]
│   ├── DEPLOY_EDGE_FUNCTION.md
│   ├── DIRECTORY_TREE.md                    [THIS FILE]
│   ├── Done/                                [Completed docs]
│   ├── GUEST_PROPOSALS_MIGRATION_PLAN.md
│   ├── MIGRATION_CLEANUP_CHECKLIST.md
│   ├── MIGRATION_PLAN_BUBBLE_TO_EDGE.md
│   ├── MIGRATION_STATUS.md
│   ├── PHASE1_PURGE_EXECUTION.md
│   ├── PHOTO_UPLOAD_MIGRATION_NOTE.md
│   ├── SEARCH_PAGE_CONSOLE_LOGS.md
│   └── SIGNUP_FIX_TESTING.md
│
├── Misc/                                     [Miscellaneous files]
│
├── node_modules/                             [Root dependencies]
│
├── build.sh                                  [Build script]
│
├── CLAUDE.md                                 [ROOT PROJECT GUIDE]
│
├── DATABASE_SCHEMA_OVERVIEW.md               [Schema reference]
│
├── HELP_CENTER_REDIRECT_TEST_REPORT.md
│
├── package.json                              [Root monorepo config]
│
├── package-lock.json
│
├── PROJECT_STRUCTURE.md                      [Directory breakdown]
│
├── README.md                                 [Main documentation]
│
└── test-help-center.js                       [Testing script]
```

---

## Key Directory Functions Summary

| Directory | Primary Purpose | Key Files |
|-----------|-----------------|-----------|
| `app/src/` | React application code | Entry points, components, logic |
| `app/public/` | Static assets & routes | HTML pages, configs, images |
| `app/src/islands/pages/` | Page-level components | SearchPage, ViewSplitLeasePage, etc. |
| `app/src/islands/shared/` | Reusable components | Header, Footer, modals, flows |
| `app/src/lib/` | Utility libraries | Auth, Supabase, constants, fetchers |
| `app/src/logic/` | Four-layer business logic | Calculators, rules, processors, workflows |
| `supabase/functions/` | Deno Edge Functions | API proxies, AI gateway |
| `docs/` | Implementation guides | Migration plans, architecture docs |
| `.claude/` | Claude Code config | Custom commands, settings |
| `Context/` | Architecture reference | Design patterns, refactoring guides |

---

## File Count by Category

```
Entry Points:                19 JSX files
Reusable Components:         18+ JSX files
Page-Level Components:       17+ JSX files
Utility Libraries:           25+ JS files
Logic Calculators:           8 JS files
Logic Rules:                 20+ JS files
Logic Processors:            12+ JS files
Logic Workflows:             12+ JS files
Edge Functions:              4 main functions + _shared
Supabase Tables:             93 total (10+ lookups)
Configuration Files:         9 root-level files
Documentation Files:         18+ MD files
Custom Commands:             40+ MD files
```

---

## Quick Navigation

### To Find...
- **Authentication logic** → `app/src/lib/auth.js` + `supabase/functions/bubble-auth-proxy/`
- **Pricing calculations** → `app/src/logic/calculators/pricing/`
- **Proposal system** → `app/src/logic/rules/proposals/` + `app/src/islands/pages/GuestProposalsPage.jsx`
- **Search functionality** → `app/src/islands/pages/SearchPage.jsx` + `useSearchPageLogic.js`
- **Listing creation** → `app/src/islands/pages/SelfListingPage.jsx` + subdirectories
- **Day indexing** → `app/src/logic/processors/external/adaptDays*.js` (CRITICAL!)
- **Database schema** → `docs/DATABASE_SCHEMA_OVERVIEW.md`
- **API configuration** → `supabase/SECRETS_SETUP.md`
- **Deployment** → `.pages.toml` + `build.sh`
- **Build config** → `app/vite.config.js`

---

**Document Version**: 1.0
**Status**: Complete and Comprehensive
**Last Updated**: 2025-11-26
