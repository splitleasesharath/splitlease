# Split Lease - Complete Codebase Review

**GENERATED**: 2025-11-26
**REPOSITORY**: https://github.com/splitleasesharath/splitlease
**BRANCH**: main
**STATUS**: Production Ready

---

## ### EXECUTIVE_SUMMARY ###

[PROJECT_TYPE]: Flexible Rental Marketplace for NYC Properties
[FRONTEND]: React 18 + Vite (Islands Architecture)
[BACKEND]: Supabase (PostgreSQL + Edge Functions)
[LEGACY_BACKEND]: Bubble.io (migrating to Edge Functions)
[DEPLOYMENT]: Cloudflare Pages
[DATABASE_TABLES]: 93

---

## ### PRIMARY_SECTIONS ###

### 1. ROOT LEVEL
[DIRECTORY]: `/`
[PURPOSE]: Project root containing configuration, documentation, and subdirectories
[KEY_FILES]: CLAUDE.md, package.json, .pages.toml, build.sh

### 2. APP DIRECTORY
[DIRECTORY]: `/app`
[PURPOSE]: Main React frontend application with Islands Architecture
[ENTRY_POINTS]: 19 JSX files
[COMPONENTS]: 35+ reusable components

### 3. SUPABASE DIRECTORY
[DIRECTORY]: `/supabase`
[PURPOSE]: Backend infrastructure with Edge Functions and database config
[EDGE_FUNCTIONS]: 4 main functions
[SHARED_UTILITIES]: 7 TypeScript files

### 4. DOCS DIRECTORY
[DIRECTORY]: `/docs`
[PURPOSE]: Migration plans, implementation guides, architecture documentation
[FILES]: 18+ markdown documents

### 5. CLAUDE DIRECTORY
[DIRECTORY]: `/.claude`
[PURPOSE]: Claude Code configuration, custom slash commands, execution logs
[COMMANDS]: 40+ custom commands

### 6. CONTEXT DIRECTORY
[DIRECTORY]: `/Context`
[PURPOSE]: Architecture reference and refactoring guides

---

## ### TECHNOLOGY_STACK ###

[FRONTEND_FRAMEWORK]: React 18
[BUILD_TOOL]: Vite (ESM)
[STYLING]: CSS Modules + CSS Variables
[MAPS]: Google Maps React
[BACKEND_DB]: Supabase (PostgreSQL)
[EDGE_RUNTIME]: Deno
[TYPE_SAFETY]: TypeScript
[HOSTING]: Cloudflare Pages
[TESTING]: Playwright (E2E)
[ANALYTICS]: Hotjar

---

## ### ARCHITECTURE_PATTERNS ###

### Four-Layer Logic Architecture
[LAYER_1]: Calculators - Pure mathematical functions
[LAYER_2]: Rules - Boolean predicates (business rules)
[LAYER_3]: Processors - Data transformation
[LAYER_4]: Workflows - Orchestration & coordination

### Component Patterns
[PATTERN_1]: Hollow Component - UI delegates to hooks
[PATTERN_2]: Multi-Step Form - Section-by-section with draft saving
[PATTERN_3]: Modal Flow - Multi-step wizards inside modals

### Day Indexing Convention
[JAVASCRIPT]: 0=Sunday, 1=Monday... 6=Saturday
[BUBBLE_API]: 1=Sunday, 2=Monday... 7=Saturday
[CONVERSION]: adaptDaysFromBubble() / adaptDaysToBubble()

---

## ### HIERARCHICAL_FILE_STRUCTURE ###

---

# ROOT LEVEL FILES

### .gitattributes
[INTENT]: Define Git attribute behaviors for file handling

### .gitignore
[INTENT]: Specify files and directories excluded from version control

### .node-version
[INTENT]: Lock Node.js version to 18 for consistent builds

### .pages.toml
[INTENT]: Cloudflare Pages deployment configuration

### build.sh
[INTENT]: Shell script for production build automation

### CLAUDE.md
[INTENT]: Comprehensive root project guide for Claude Code (primary reference)

### DATABASE_SCHEMA_OVERVIEW.md
[INTENT]: Reference document for 93-table database schema

### package.json
[INTENT]: Root monorepo configuration with workspace scripts

### package-lock.json
[INTENT]: Dependency lock file for deterministic installs

### PROJECT_STRUCTURE.md
[INTENT]: Detailed directory breakdown and organization guide

### README.md
[INTENT]: Main project documentation and overview

### test-help-center.js
[INTENT]: Testing script for help center redirect functionality

### HELP_CENTER_REDIRECT_TEST_REPORT.md
[INTENT]: Test results for help center redirect implementation

---

# APP DIRECTORY (`/app`)

## Root App Files

### app/.env
[INTENT]: Application-specific environment variables (VITE_SUPABASE_URL, keys)

### app/.env.example
[INTENT]: Template for environment variable configuration

### app/.gitignore
[INTENT]: App-level Git ignore rules

### app/BUBBLE_WORKFLOW_SETUP.md
[INTENT]: Legacy Bubble integration guide and workflow documentation

### app/CLAUDE.md
[INTENT]: App-specific developer guide with architecture patterns

### app/package.json
[INTENT]: Frontend dependencies and npm scripts

### app/tsconfig.json
[INTENT]: TypeScript configuration for the application

### app/tsconfig.node.json
[INTENT]: TypeScript configuration for Node.js tooling

### app/vite.config.js
[INTENT]: Vite build tool configuration with routing setup

---

## Public Directory (`/app/public`)

### public/_headers
[INTENT]: Cloudflare header rules for security and caching

### public/_redirects
[INTENT]: Cloudflare redirect rules for URL routing

### public/_routes.json
[INTENT]: Route configuration for Cloudflare Functions

### public/404.html
[INTENT]: Custom error page for 404 responses

### public/index.html
[INTENT]: Landing/home page HTML entry point

### public/index-dev.html
[INTENT]: Development-only variant of index page

### public/search.html
[INTENT]: Search/browse listings page entry point

### public/view-split-lease.html
[INTENT]: Listing detail page entry point

### public/account-profile.html
[INTENT]: User account profile page entry point

### public/careers.html
[INTENT]: Careers/jobs page entry point

### public/faq.html
[INTENT]: Frequently asked questions page entry point

### public/guest-proposals.html
[INTENT]: Guest proposals management page entry point

### public/guest-success.html
[INTENT]: Guest booking confirmation page entry point

### public/help-center.html
[INTENT]: Help center main page entry point

### public/help-center-category.html
[INTENT]: Help center category view page entry point

### public/host-success.html
[INTENT]: Host listing confirmation page entry point

### public/list-with-us.html
[INTENT]: Host signup/onboarding page entry point

### public/logged-in-avatar-demo.html
[INTENT]: Avatar component demonstration page

### public/policies.html
[INTENT]: Terms and policies page entry point

### public/search-test.html
[INTENT]: Search functionality test page

### public/self-listing.html
[INTENT]: Host create/edit listing page entry point

### public/why-split-lease.html
[INTENT]: Marketing/value proposition page entry point

---

## Source Entry Points (`/app/src`)

### src/404.jsx
[INTENT]: 404 error page React entry - mounts NotFoundPage component

### src/account-profile.jsx
[INTENT]: Account profile page React entry - mounts user settings component

### src/careers.jsx
[INTENT]: Careers page React entry - mounts CareersPage component

### src/faq.jsx
[INTENT]: FAQ page React entry - mounts FAQPage component

### src/guest-proposals.jsx
[INTENT]: Guest proposals page React entry - mounts GuestProposalsPage

### src/guest-success.jsx
[INTENT]: Guest success page React entry - mounts booking confirmation

### src/help-center.jsx
[INTENT]: Help center React entry - mounts HelpCenterPage component

### src/help-center-category.jsx
[INTENT]: Help center category React entry - mounts category view

### src/host-success.jsx
[INTENT]: Host success page React entry - mounts listing confirmation

### src/list-with-us.jsx
[INTENT]: List with us page React entry - mounts host signup flow

### src/listing-schedule-selector.jsx
[INTENT]: Schedule selector component React entry for embedding

### src/logged-in-avatar-demo.jsx
[INTENT]: Avatar demo page React entry for testing avatar component

### src/main.jsx
[INTENT]: Landing/home page React entry - mounts HomePage component

### src/policies.jsx
[INTENT]: Policies page React entry - mounts terms/policies component

### src/search.jsx
[INTENT]: Search page React entry - mounts SearchPage with listings

### src/search-test.jsx
[INTENT]: Search test page React entry for development testing

### src/self-listing.jsx
[INTENT]: Self-listing page React entry - mounts host listing form

### src/view-split-lease.jsx
[INTENT]: View listing page React entry - mounts listing detail view

### src/why-split-lease.jsx
[INTENT]: Marketing page React entry - mounts value proposition

---

## Data Directory (`/app/src/data`)

### data/helpCenterData.js
[INTENT]: Help center content and navigation data structure

---

## Islands - Modals (`/app/src/islands/modals`)

### modals/CompareTermsModal.jsx
[INTENT]: Modal comparing original vs counteroffer proposal terms

### modals/EditProposalModal.jsx
[INTENT]: Modal for editing existing proposal details

### modals/HostProfileModal.jsx
[INTENT]: Modal displaying host profile information

### modals/MapModal.jsx
[INTENT]: Modal with full-screen Google Maps view

### modals/NotificationSettingsModal.jsx
[INTENT]: Modal for user notification preferences

### modals/ProposalDetailsModal.jsx
[INTENT]: Modal showing complete proposal information

### modals/VirtualMeetingModal.jsx
[INTENT]: Modal for scheduling virtual property tours

---

## Islands - Pages (`/app/src/islands/pages`)

### pages/CareersPage.jsx
[INTENT]: Careers page component with job listings

### pages/FAQPage.jsx
[INTENT]: FAQ page component with accordion questions

### pages/GuestProposalsPage.jsx
[INTENT]: Guest proposals page - manages all guest proposals

### pages/GuestSuccessPage.jsx
[INTENT]: Success confirmation page after guest booking

### pages/HelpCenterCategoryPage.jsx
[INTENT]: Help center category view with articles

### pages/HelpCenterPage.jsx
[INTENT]: Help center main page with categories

### pages/HomePage.jsx
[INTENT]: Landing page with hero section and value props

### pages/HostSuccessPage.jsx
[INTENT]: Success confirmation page after host listing

### pages/ListWithUsPage.jsx
[INTENT]: Host signup flow page with onboarding steps

### pages/NotFoundPage.jsx
[INTENT]: 404 error page component with navigation options

### pages/PoliciesPage.jsx
[INTENT]: Terms, privacy, and policies display page

### pages/SearchPage.jsx
[INTENT]: Search/browse listings page with filters and results

### pages/SearchPageTest.jsx
[INTENT]: Search page test variant for development

### pages/SelfListingPage.jsx
[INTENT]: Host listing creation/edit multi-section form

### pages/ViewSplitLeasePage.jsx
[INTENT]: Listing detail page with all listing information

### pages/ViewSplitLeasePage-old.jsx
[INTENT]: Legacy version of listing detail page (deprecated)

### pages/WhySplitLeasePage.jsx
[INTENT]: Marketing page explaining Split Lease value

### pages/useGuestProposalsPageLogic.js
[INTENT]: Hook containing all guest proposals page business logic

### pages/useSearchPageLogic.js
[INTENT]: Hook containing all search page business logic

### pages/useViewSplitLeasePageLogic.js
[INTENT]: Hook containing all listing detail page business logic

---

## SelfListingPage Subdirectory (`/app/src/islands/pages/SelfListingPage`)

### SelfListingPage/index.ts
[INTENT]: Main export for SelfListingPage module

### SelfListingPage/types/listing.types.ts
[INTENT]: TypeScript type definitions for listing data

### SelfListingPage/utils/amenitiesService.ts
[INTENT]: Service for fetching and managing amenities data

### SelfListingPage/utils/neighborhoodService.ts
[INTENT]: Service for fetching neighborhood data by borough

---

## Islands - Proposals (`/app/src/islands/proposals`)

### proposals/EmptyState.jsx
[INTENT]: Empty state component when no proposals exist

### proposals/ProposalSelector.jsx
[INTENT]: Component for selecting between multiple proposals

---

## Islands - Shared Components (`/app/src/islands/shared`)

### shared/Button.jsx
[INTENT]: Reusable button component with variants

### shared/ContactHostMessaging.jsx
[INTENT]: Host messaging interface component

### shared/DayButton.jsx
[INTENT]: Day selection button for schedule picker

### shared/ErrorOverlay.jsx
[INTENT]: Error display overlay component

### shared/ExternalReviews.jsx
[INTENT]: External review display component

### shared/Footer.jsx
[INTENT]: Site footer component with navigation

### shared/GoogleMap.jsx
[INTENT]: Google Maps integration component

### shared/Header.jsx
[INTENT]: Site header/navigation component

### shared/InformationalText.jsx
[INTENT]: CMS content display component

### shared/ListingCard.jsx
[INTENT]: Listing preview card component

### shared/ListingScheduleSelector.jsx
[INTENT]: Day/pricing selector for listing pages

### shared/ListingScheduleSelectorV2.jsx
[INTENT]: Updated version of schedule selector

### shared/PriceDisplay.jsx
[INTENT]: Price formatting and display component

### shared/SearchScheduleSelector.jsx
[INTENT]: Schedule selector for search filters

### shared/SignUpLoginModal.jsx
[INTENT]: Authentication modal for login/signup

### shared/Toast.jsx
[INTENT]: Notification toast component

### shared/useScheduleSelector.js
[INTENT]: Hook for schedule selector state management

### shared/useScheduleSelectorLogicCore.js
[INTENT]: Core scheduling logic hook

---

## Shared Component Subdirectories

### shared/AiSignupMarketReport/index.js
[INTENT]: AI market research component exports

### shared/AiSignupMarketReport/Example.jsx
[INTENT]: Example usage of AI market report

### shared/AiSignupMarketReport/TestPage.jsx
[INTENT]: Test page for AI market report component

### shared/CreateDuplicateListingModal/index.js
[INTENT]: Duplicate listing modal exports

### shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx
[INTENT]: Modal for duplicating existing listings

### shared/CreateProposalFlowV2.jsx
[INTENT]: Multi-step proposal wizard component

### shared/CreateProposalFlowV2Components/MoveInSection.jsx
[INTENT]: Move-in date selection section of proposal wizard

### shared/CreateProposalFlowV2Components/ReviewSection.jsx
[INTENT]: Review section of proposal wizard

### shared/ImportListingModal/ImportListingModal.jsx
[INTENT]: Modal for importing listings from external sources

### shared/LoggedInAvatar/index.js
[INTENT]: User avatar dropdown component exports

### shared/SubmitListingPhotos/index.js
[INTENT]: Photo upload component exports

### shared/SubmitListingPhotos/SubmitListingPhotos.jsx
[INTENT]: Photo upload component for listings

### shared/SubmitListingPhotos/DeletePhotoModal.jsx
[INTENT]: Modal for confirming photo deletion

---

## Library - Core (`/app/src/lib`)

### lib/auth.js
[INTENT]: Authentication functions (login, logout, validate, checkStatus)

### lib/availabilityValidation.js
[INTENT]: Availability checking and validation logic

### lib/bubbleAPI.js
[INTENT]: Bubble API client (legacy, proxied through Edge Functions)

### lib/config.js
[INTENT]: Application configuration settings

### lib/constants.js
[INTENT]: All application constants and enumerations

### lib/dataLookups.js
[INTENT]: Data lookup functions for boroughs, amenities, etc.

### lib/dayUtils.js
[INTENT]: Day/week utility functions

### lib/hotjar.js
[INTENT]: Hotjar analytics integration

### lib/informationalTextsFetcher.js
[INTENT]: CMS content fetcher from Supabase

### lib/listingDataFetcher.js
[INTENT]: Listing data retrieval functions

### lib/mapUtils.js
[INTENT]: Google Maps utility functions

### lib/nycZipCodes.ts
[INTENT]: NYC zip code data and validation

### lib/priceCalculations.js
[INTENT]: General pricing utility functions

### lib/proposalDataFetcher.js
[INTENT]: Proposal data retrieval functions

### lib/sanitize.js
[INTENT]: HTML/input sanitization for security

### lib/SECURE_AUTH_README.md
[INTENT]: Authentication security documentation

### lib/secureStorage.js
[INTENT]: Encrypted storage for auth tokens

### lib/supabase.js
[INTENT]: Supabase client initialization

### lib/supabaseUtils.js
[INTENT]: Supabase query helper functions

### lib/urlParams.js
[INTENT]: URL parameter parsing utilities

---

## Library - Constants (`/app/src/lib/constants`)

### constants/proposalStages.js
[INTENT]: Proposal stage constant definitions

### constants/proposalStatuses.js
[INTENT]: Proposal status value constants

---

## Library - Schedule Selector (`/app/src/lib/scheduleSelector`)

### scheduleSelector/dayHelpers.js
[INTENT]: Day calculation helper functions

### scheduleSelector/nightCalculations.js
[INTENT]: Night count calculation functions

### scheduleSelector/priceCalculations.js
[INTENT]: Pricing calculations for schedule selector

### scheduleSelector/validators.js
[INTENT]: Schedule validation functions

---

## Logic Layer - Index (`/app/src/logic`)

### logic/index.js
[INTENT]: Central exports for all four logic layers

---

## Logic - Calculators (`/app/src/logic/calculators`)

### calculators/index.js
[INTENT]: Exports all calculator functions

### calculators/pricing/calculateFourWeekRent.js
[INTENT]: Calculate monthly rent from nightly rate

### calculators/pricing/calculateGuestFacingPrice.js
[INTENT]: Calculate guest-visible pricing with fees

### calculators/pricing/calculatePricingBreakdown.js
[INTENT]: Generate itemized pricing breakdown

### calculators/pricing/calculateReservationTotal.js
[INTENT]: Calculate total cost for a reservation

### calculators/pricing/getNightlyRateByFrequency.js
[INTENT]: Get nightly rate based on day count frequency

### calculators/scheduling/calculateCheckInOutDays.js
[INTENT]: Calculate check-in and check-out day logic

### calculators/scheduling/calculateNextAvailableCheckIn.js
[INTENT]: Find next available check-in date

### calculators/scheduling/calculateNightsFromDays.js
[INTENT]: Count nights from selected days array

---

## Logic - Rules (`/app/src/logic/rules`)

### rules/auth/isProtectedPage.js
[INTENT]: Determine if page requires authentication

### rules/auth/isSessionValid.js
[INTENT]: Check if current session is still valid

### rules/pricing/isValidDayCountForPricing.js
[INTENT]: Validate day count has pricing data

### rules/proposals/canAcceptProposal.js
[INTENT]: Determine if guest can accept proposal

### rules/proposals/canCancelProposal.js
[INTENT]: Determine if proposal can be cancelled

### rules/proposals/canEditProposal.js
[INTENT]: Determine if proposal can be modified

### rules/proposals/determineProposalStage.js
[INTENT]: Calculate current proposal stage from status

### rules/proposals/proposalRules.js
[INTENT]: Consolidated proposal business rules

### rules/proposals/virtualMeetingRules.js
[INTENT]: Virtual meeting availability rules

### rules/scheduling/isDateBlocked.js
[INTENT]: Check if specific date is unavailable

### rules/scheduling/isDateInRange.js
[INTENT]: Check if date falls within valid range

### rules/scheduling/isScheduleContiguous.js
[INTENT]: Verify schedule days are continuous

### rules/search/isValidPriceTier.js
[INTENT]: Validate price range filter value

### rules/search/isValidSortOption.js
[INTENT]: Validate sort option parameter

### rules/search/isValidWeekPattern.js
[INTENT]: Validate week pattern filter value

### rules/users/hasProfilePhoto.js
[INTENT]: Check if user has uploaded profile photo

### rules/users/isGuest.js
[INTENT]: Determine if user is guest account type

### rules/users/isHost.js
[INTENT]: Determine if user is host account type

### rules/users/shouldShowFullName.js
[INTENT]: Determine if full name should be displayed

---

## Logic - Processors (`/app/src/logic/processors`)

### processors/display/formatHostName.js
[INTENT]: Format host name for display

### processors/external/adaptDayFromBubble.js
[INTENT]: Convert single day from Bubble (1-7) to JS (0-6)

### processors/external/adaptDaysFromBubble.js
[INTENT]: Convert day array from Bubble to JS format

### processors/external/adaptDayToBubble.js
[INTENT]: Convert single day from JS to Bubble format

### processors/external/adaptDaysToBubble.js
[INTENT]: Convert day array from JS to Bubble format

### processors/listing/extractListingCoordinates.js
[INTENT]: Extract lat/lng coordinates from listing

### processors/listing/parseJsonArrayField.js
[INTENT]: Parse JSON array fields from database

### processors/proposal/processProposalData.js
[INTENT]: Transform single proposal data for UI

### processors/user/processProfilePhotoUrl.js
[INTENT]: Process and validate profile photo URLs

### processors/user/processUserDisplayName.js
[INTENT]: Generate display name from user data

### processors/user/processUserInitials.js
[INTENT]: Extract initials from user name

---

## Logic - Workflows (`/app/src/logic/workflows`)

### workflows/auth/checkAuthStatusWorkflow.js
[INTENT]: Verify user login status workflow

### workflows/auth/validateTokenWorkflow.js
[INTENT]: Token validation and refresh workflow

### workflows/booking/acceptProposalWorkflow.js
[INTENT]: Multi-step proposal acceptance workflow

### workflows/booking/cancelProposalWorkflow.js
[INTENT]: Proposal cancellation workflow

### workflows/booking/loadProposalDetailsWorkflow.js
[INTENT]: Load and transform full proposal data

### workflows/proposals/cancelProposalWorkflow.js
[INTENT]: Cancel proposal workflow (proposals context)

### workflows/proposals/counterofferWorkflow.js
[INTENT]: Create counteroffer workflow

### workflows/proposals/navigationWorkflow.js
[INTENT]: Proposal page navigation workflow

### workflows/proposals/virtualMeetingWorkflow.js
[INTENT]: Schedule virtual meeting workflow

### workflows/scheduling/validateMoveInDateWorkflow.js
[INTENT]: Validate move-in date selection workflow

### workflows/scheduling/validateScheduleWorkflow.js
[INTENT]: Validate day selection workflow

---

# SUPABASE DIRECTORY (`/supabase`)

## Root Supabase Files

### supabase/config.toml
[INTENT]: Supabase project configuration

### supabase/SECRETS_SETUP.md
[INTENT]: API key and secrets configuration guide

---

## Shared Utilities (`/supabase/functions/_shared`)

### _shared/aiTypes.ts
[INTENT]: TypeScript types for AI functionality

### _shared/bubbleSync.ts
[INTENT]: Bubble.io API interaction utilities

### _shared/cors.ts
[INTENT]: CORS handling middleware

### _shared/errors.ts
[INTENT]: Error types and handlers

### _shared/openai.ts
[INTENT]: OpenAI API integration utilities

### _shared/types.ts
[INTENT]: Core TypeScript type definitions

### _shared/validation.ts
[INTENT]: Input validation utilities

---

## AI Gateway Function (`/supabase/functions/ai-gateway`)

### ai-gateway/deno.json
[INTENT]: Deno configuration for AI gateway function

### ai-gateway/index.ts
[INTENT]: Main entry point - routes AI requests

### ai-gateway/handlers/complete.ts
[INTENT]: Handle non-streaming AI completions

### ai-gateway/handlers/stream.ts
[INTENT]: Handle streaming AI responses

### ai-gateway/prompts/_registry.ts
[INTENT]: Prompt registry and routing system

### ai-gateway/prompts/_template.ts
[INTENT]: Prompt template system

---

## AI Signup Guest Function (`/supabase/functions/ai-signup-guest`)

### ai-signup-guest/index.ts
[INTENT]: AI-powered guest signup flow handler

---

## Bubble Auth Proxy Function (`/supabase/functions/bubble-auth-proxy`)

### bubble-auth-proxy/deno.json
[INTENT]: Deno configuration for auth proxy

### bubble-auth-proxy/index.ts
[INTENT]: Main entry - routes auth requests

### bubble-auth-proxy/handlers/login.ts
[INTENT]: Handle login requests to Bubble

### bubble-auth-proxy/handlers/logout.ts
[INTENT]: Handle logout requests

### bubble-auth-proxy/handlers/signup.ts
[INTENT]: Handle signup requests to Bubble

### bubble-auth-proxy/handlers/validate.ts
[INTENT]: Handle token validation requests

---

## Bubble Proxy Function (`/supabase/functions/bubble-proxy`)

### bubble-proxy/deno.json
[INTENT]: Deno configuration for general proxy

### bubble-proxy/index.ts
[INTENT]: Main entry - routes general API requests

### bubble-proxy/handlers/listing.ts
[INTENT]: Handle listing-related API calls

### bubble-proxy/handlers/messaging.ts
[INTENT]: Handle messaging API calls

### bubble-proxy/handlers/photos.ts
[INTENT]: Handle photo upload API calls

### bubble-proxy/handlers/referral.ts
[INTENT]: Handle referral system API calls

### bubble-proxy/handlers/signup.ts
[INTENT]: Handle signup-related API calls

---

# DOCS DIRECTORY (`/docs`)

### docs/AI_GATEWAY_IMPLEMENTATION_PLAN.md
[INTENT]: Original AI gateway specification

### docs/AI_GATEWAY_IMPLEMENTATION_PLAN_V2.md
[INTENT]: Updated AI gateway design

### docs/AI_SIGNUP_SUPABASE_MIGRATION.md
[INTENT]: AI signup migration guide

### docs/AUTH_FLOW_COMPLETE.md
[INTENT]: Complete authentication flow documentation

### docs/AUTH_FLOW_DIAGRAM.md
[INTENT]: Visual authentication flow diagrams

### docs/AUTH_QUICK_REFERENCE.md
[INTENT]: Quick auth reference guide

### docs/BUBBLE_WORKFLOW_API_ENUMERATION.md
[INTENT]: Bubble API inventory and reference

### docs/CODEBASE_COMPREHENSIVE_STRUCTURE.md
[INTENT]: Comprehensive codebase structure report

### docs/CONFIGURATION_AND_DEPLOYMENT.md
[INTENT]: Configuration and deployment reference

### docs/DEPLOY_EDGE_FUNCTION.md
[INTENT]: Edge function deployment guide

### docs/DIRECTORY_TREE.md
[INTENT]: Visual directory tree reference

### docs/GUEST_PROPOSALS_MIGRATION_PLAN.md
[INTENT]: Guest proposals migration plan

### docs/MIGRATION_CLEANUP_CHECKLIST.md
[INTENT]: Post-migration cleanup tasks

### docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md
[INTENT]: Main Bubble to Edge migration plan

### docs/MIGRATION_STATUS.md
[INTENT]: Current migration progress tracking

### docs/PHASE1_PURGE_EXECUTION.md
[INTENT]: Phase 1 cleanup execution record

### docs/PHOTO_UPLOAD_MIGRATION_NOTE.md
[INTENT]: Photo upload migration notes

### docs/QUICK_START_NAVIGATION.md
[INTENT]: Quick start navigation guide

### docs/SEARCH_PAGE_CONSOLE_LOGS.md
[INTENT]: Search debugging console logs

### docs/SIGNUP_FIX_TESTING.md
[INTENT]: Signup testing results

---

# CLAUDE DIRECTORY (`/.claude`)

### .claude/settings.json
[INTENT]: Claude Code permissions and restrictions

### .claude/settings.local.json
[INTENT]: Local Claude Code setting overrides

---

## Commands (`/.claude/commands`)

### commands/deploy.md
[INTENT]: Deploy to Cloudflare Pages command

### commands/preview.md
[INTENT]: Start dev server command

### commands/prime.md
[INTENT]: Project initialization command

### commands/splitlease.md
[INTENT]: Project-specific operations command

---

## Dump Commands (`/.claude/commands/Dump`)

### Dump/bug.md
[INTENT]: Bug report template command

### Dump/chore.md
[INTENT]: Chore task template command

### Dump/classify_adw.md
[INTENT]: ADW classification command

### Dump/classify_issue.md
[INTENT]: Issue classification command

### Dump/cleanup_worktrees.md
[INTENT]: Git worktree cleanup command

### Dump/code_convention.md
[INTENT]: Code style guide command

### Dump/commit.md
[INTENT]: Commit message helper command

### Dump/conditional_docs.md
[INTENT]: Conditional docs generation command

### Dump/document.md
[INTENT]: Documentation template command

### Dump/enforce_no_fallback.md
[INTENT]: No fallback enforcement command

### Dump/feature.md
[INTENT]: Feature implementation template command

### Dump/generate_branch_name.md
[INTENT]: Branch naming command

### Dump/health_check.md
[INTENT]: Health check command

### Dump/implement.md
[INTENT]: Implementation helper command

### Dump/install.md
[INTENT]: Installation guide command

### Dump/install_worktree.md
[INTENT]: Worktree setup command

### Dump/in_loop_review.md
[INTENT]: Code review loop command

### Dump/no_fallback_check.md
[INTENT]: No fallback detection command

### Dump/patch.md
[INTENT]: Patch creation command

### Dump/prepare_app.md
[INTENT]: App preparation command

### Dump/prime.md
[INTENT]: Project prime command (Dump variant)

### Dump/pull_request.md
[INTENT]: PR creation command

### Dump/README_NO_FALLBACK.md
[INTENT]: No fallback principles documentation

### Dump/resolve_failed_e2e_test.md
[INTENT]: Failed E2E test resolution command

### Dump/resolve_failed_test.md
[INTENT]: Failed test resolution command

### Dump/review.md
[INTENT]: Code review command

### Dump/start.md
[INTENT]: Start project command

### Dump/test.md
[INTENT]: Test execution command

### Dump/test_e2e.md
[INTENT]: E2E test command

### Dump/tools.md
[INTENT]: Tools documentation command

### Dump/track_agentic_kpis.md
[INTENT]: Agentic KPI tracking command

---

## E2E Test Commands (`/.claude/commands/Dump/e2e`)

### e2e/test_advanced_filtering.md
[INTENT]: Advanced filtering E2E test command

### e2e/test_ai_market_research.md
[INTENT]: AI market research E2E test command

### e2e/test_basic_search.md
[INTENT]: Basic search E2E test command

### e2e/test_contact_host.md
[INTENT]: Contact host E2E test command

### e2e/test_schedule_selector.md
[INTENT]: Schedule selector E2E test command

---

## Tasks (`/.claude/tasks`)

### tasks/hamburger_menu_investigation.md
[INTENT]: Hamburger menu investigation task

### tasks/playwright_console_error_check.md
[INTENT]: Playwright console error check task

### tasks/verify-grid-layout.md
[INTENT]: Grid layout verification task

---

## Logs (`/.claude/logs`)

### logs/chat.json
[INTENT]: Chat interaction logs

### logs/errors.json
[INTENT]: Error logs

### logs/notifications.json
[INTENT]: Notification logs

### logs/stop.json
[INTENT]: Stop event logs

---

# CONTEXT DIRECTORY (`/Context`)

### Context/Refactoring Architecture for Logic Core.md
[INTENT]: Logic layer refactoring guide and best practices

---

# VSCODE DIRECTORY (`/.vscode`)

### .vscode/settings.json
[INTENT]: VSCode workspace settings

### .vscode/launch.json
[INTENT]: Debug launch configurations

### .vscode/extensions.json
[INTENT]: Recommended VSCode extensions

### .vscode/tasks.json
[INTENT]: VSCode task definitions

---

## ### DATA_SOURCE ###

[PRIMARY_DATABASE]: Supabase PostgreSQL (93 tables)
[LEGACY_SOURCE]: Bubble.io (user, listing, proposal)
[LOOKUP_TABLES]: zat_geo_borough_toplevel, zat_geo_hood_mediumlevel, zat_features_amenity, zat_features_houserule
[CMS_CONTENT]: informational_texts table

---

## ### ENVIRONMENT_CONFIGURATION ###

### Client-Side (app/.env)
[VITE_SUPABASE_URL]: Supabase project URL
[VITE_SUPABASE_ANON_KEY]: Supabase anonymous key
[VITE_GOOGLE_MAPS_API_KEY]: Google Maps API key

### Server-Side (Supabase Secrets)
[BUBBLE_API_BASE_URL]: https://app.split.lease/version-test/api/1.1
[BUBBLE_API_KEY]: Stored securely in Supabase
[BUBBLE_AUTH_BASE_URL]: https://upgradefromstr.bubbleapps.io/api/1.1
[SUPABASE_SERVICE_ROLE_KEY]: From Supabase Dashboard

---

## ### BUILD_DEPLOYMENT ###

[DEV_COMMAND]: npm run dev
[BUILD_COMMAND]: npm run build
[PREVIEW_COMMAND]: npm run preview
[DEPLOY_COMMAND]: /deploy (Claude command)
[BUILD_OUTPUT]: app/dist/
[NODE_VERSION]: 18
[HOSTING]: Cloudflare Pages

---

## ### GIT_WORKFLOW ###

[MAIN_BRANCH]: main (production)
[STAGING_BRANCH]: development
[REMOTE]: https://github.com/splitleasesharath/splitlease.git
[COMMIT_STYLE]: Conventional (feat, fix, chore, docs)
[PUSH_RESTRICTION]: Never force push to main/master

---

## ### CORE_PRINCIPLES ###

### DO's
- Use four-layer logic architecture consistently
- Keep business logic in hooks (Hollow Component Pattern)
- Use Edge Functions for all Bubble API calls
- Store configuration in constants
- Convert days at system boundaries
- Check auth status before protected resources
- Throw descriptive errors

### DON'Ts
- Never add fallback mechanisms or workarounds
- Never expose API keys in frontend
- Never call Bubble API directly from frontend
- Never mix day numbering systems
- Never hardcode color values (use CSS variables)
- Never use Redux (keep state simple)
- Never force push to main/master

---

## ### FILE_STATISTICS ###

[ENTRY_POINTS]: 19 JSX files
[PAGE_COMPONENTS]: 17+ JSX files
[SHARED_COMPONENTS]: 18+ JSX files
[UTILITY_LIBRARIES]: 25+ JS files
[LOGIC_CALCULATORS]: 8 JS files
[LOGIC_RULES]: 20+ JS files
[LOGIC_PROCESSORS]: 12+ JS files
[LOGIC_WORKFLOWS]: 12+ JS files
[EDGE_FUNCTIONS]: 4 main + shared
[DOCUMENTATION]: 18+ MD files
[CUSTOM_COMMANDS]: 40+ MD files
[DATABASE_TABLES]: 93

---

**DOCUMENT_VERSION**: 1.0
**LAST_UPDATED**: 2025-11-26
**STATUS**: Complete and Ready for Reference
