# Split Lease - Complete Codebase Review

**GENERATED**: 2025-11-26
**REPOSITORY**: https://github.com/splitleasesharath/splitlease
**BRANCH**: main
**STATUS**: Production Ready

---

## ### FILE_STATISTICS ###

[TOTAL_FILES]: 150+ source files
[ENTRY_POINTS]: 19 JSX files (React page mounts)
[PAGE_COMPONENTS]: 17+ JSX files (page-level UI)
[SHARED_COMPONENTS]: 18+ JSX files (reusable UI)
[MODAL_COMPONENTS]: 7 JSX files (overlay dialogs)
[UTILITY_LIBRARIES]: 25+ JS files (helper functions)
[LOGIC_CALCULATORS]: 8 JS files (pure math functions)
[LOGIC_RULES]: 20+ JS files (boolean predicates)
[LOGIC_PROCESSORS]: 12+ JS files (data transformers)
[LOGIC_WORKFLOWS]: 12+ JS files (orchestration)
[EDGE_FUNCTIONS]: 4 main functions + 7 shared utilities
[DOCUMENTATION]: 18+ MD files (guides and plans)
[CUSTOM_COMMANDS]: 40+ MD files (Claude slash commands)
[DATABASE_TABLES]: 93 tables (Supabase PostgreSQL)
[HTML_ENTRY_PAGES]: 20 HTML files (static entry points)
[CONFIG_FILES]: 12 configuration files

---

## ### DEPENDENCY_GRAPH_OVERVIEW ###

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (app/)                          │
├─────────────────────────────────────────────────────────────────┤
│  Entry Points (*.jsx) ──imports──> Page Components              │
│         │                                │                      │
│         └──────────────┬─────────────────┘                      │
│                        ▼                                        │
│              Shared Components (islands/shared/)                │
│                        │                                        │
│         ┌──────────────┼──────────────┐                        │
│         ▼              ▼              ▼                        │
│    Logic Layer    Library (lib/)   Supabase Client             │
│    (logic/)            │                │                      │
│         │              └────────────────┤                      │
│         ▼                               ▼                      │
│  ┌─────────────┐                 Edge Functions                │
│  │ Calculators │                 (supabase/functions/)         │
│  │ Rules       │                        │                      │
│  │ Processors  │                        ▼                      │
│  │ Workflows   │                 Bubble.io API                 │
│  └─────────────┘                 (legacy backend)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## ### EXECUTIVE_SUMMARY ###

[PROJECT_TYPE]: Flexible Rental Marketplace for NYC Properties
[FRONTEND]: React 18 + Vite (Islands Architecture)
[BACKEND]: Supabase (PostgreSQL + Edge Functions)
[LEGACY_BACKEND]: Bubble.io (migrating to Edge Functions)
[DEPLOYMENT]: Cloudflare Pages
[DATABASE_TABLES]: 93

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

## ### ARCHITECTURE_PATTERNS ###

### Four-Layer Logic Architecture
[LAYER_1]: Calculators - Pure mathematical functions (no side effects)
[LAYER_2]: Rules - Boolean predicates expressing business rules
[LAYER_3]: Processors - Data transformation and adaptation
[LAYER_4]: Workflows - Orchestration combining lower layers

### Component Patterns
[PATTERN_1]: Hollow Component - UI delegates all logic to custom hooks
[PATTERN_2]: Multi-Step Form - Section-by-section with localStorage draft saving
[PATTERN_3]: Modal Flow - Multi-step wizards inside modals with callbacks

### Day Indexing Convention (CRITICAL)
[JAVASCRIPT]: 0=Sunday, 1=Monday... 6=Saturday (internal)
[BUBBLE_API]: 1=Sunday, 2=Monday... 7=Saturday (external)
[CONVERSION]: adaptDaysFromBubble() / adaptDaysToBubble()
[LOCATION]: app/src/logic/processors/external/

---

## ### HIERARCHICAL_FILE_STRUCTURE ###

---

# ROOT LEVEL FILES

### .gitattributes
[INTENT]: Define Git attribute behaviors for line endings, diff drivers, and merge strategies across file types

### .gitignore
[INTENT]: Specify files and directories excluded from version control including node_modules, dist, .env, and IDE files

### .node-version
[INTENT]: Lock Node.js version to 18 for consistent builds across development and CI/CD environments

### .pages.toml
[INTENT]: Cloudflare Pages deployment configuration specifying build commands, output directory, and environment variables
[DEPENDENCIES]: build.sh, app/dist/

### build.sh
[INTENT]: Shell script automating production build process with error handling and Vite compilation
[DEPENDENCIES]: app/package.json, vite.config.js

### CLAUDE.md
[INTENT]: Comprehensive root project guide for Claude Code containing architecture patterns, coding standards, and development workflows (primary reference document)
[DEPENDENCIES]: app/CLAUDE.md, DATABASE_SCHEMA_OVERVIEW.md

### DATABASE_SCHEMA_OVERVIEW.md
[INTENT]: Reference document detailing all 93 Supabase tables including user, listing, proposal, and lookup tables with field definitions

### package.json
[INTENT]: Root monorepo configuration with workspace scripts for running dev server, building, and managing dependencies
[DEPENDENCIES]: app/package.json

### package-lock.json
[INTENT]: Dependency lock file ensuring deterministic installs with exact versions across all environments

### PROJECT_STRUCTURE.md
[INTENT]: Detailed directory breakdown and organization guide explaining folder purposes and file locations

### README.md
[INTENT]: Main project documentation and overview for new developers including setup instructions and architecture summary

### test-help-center.js
[INTENT]: Node.js testing script for validating help center redirect functionality and routing behavior
[DEPENDENCIES]: app/public/_redirects

### HELP_CENTER_REDIRECT_TEST_REPORT.md
[INTENT]: Test results documenting help center redirect implementation outcomes and edge cases discovered

---

# APP DIRECTORY (`/app`)

## Root App Files

### app/.env
[INTENT]: Application-specific environment variables storing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_GOOGLE_MAPS_API_KEY for frontend configuration

### app/.env.example
[INTENT]: Template documenting required environment variables with placeholder values for developer onboarding

### app/.gitignore
[INTENT]: App-level Git ignore rules excluding node_modules, dist, .env, and Vite cache directories

### app/BUBBLE_WORKFLOW_SETUP.md
[INTENT]: Legacy Bubble.io integration guide documenting workflow API endpoints and data synchronization patterns

### app/CLAUDE.md
[INTENT]: App-specific developer guide detailing React Islands architecture, four-layer logic system, component patterns, and frontend coding standards
[DEPENDENCIES]: src/logic/, src/islands/, src/lib/

### app/package.json
[INTENT]: Frontend dependencies including React 18, Vite, @supabase/supabase-js, @react-google-maps/api, and development tools
[DEPENDENCIES]: react, react-dom, vite, @supabase/supabase-js

### app/tsconfig.json
[INTENT]: TypeScript configuration for the application enabling strict mode, JSX support, and path aliases for clean imports

### app/tsconfig.node.json
[INTENT]: TypeScript configuration for Node.js tooling used by Vite and build scripts with ES module support

### app/vite.config.js
[INTENT]: Vite build tool configuration defining entry points, output paths, dev server settings, and dynamic route handling for Islands Architecture
[DEPENDENCIES]: All src/*.jsx entry points

---

## Public Directory (`/app/public`)

### public/_headers
[INTENT]: Cloudflare header rules defining security headers (CSP, X-Frame-Options), caching policies, and CORS settings for all routes

### public/_redirects
[INTENT]: Cloudflare redirect rules for URL routing including SPA fallbacks, legacy URL support, and help center navigation

### public/_routes.json
[INTENT]: Route configuration for Cloudflare Functions specifying which paths should be handled by edge functions vs static assets

### public/404.html
[INTENT]: Custom 404 error page HTML entry point with navigation back to home and search suggestions
[IMPORTS]: src/404.jsx

### public/index.html
[INTENT]: Landing/home page HTML entry point serving as the main marketing and navigation hub
[IMPORTS]: src/main.jsx

### public/index-dev.html
[INTENT]: Development-only variant of index page with additional debugging tools and hot reload configuration
[IMPORTS]: src/main.jsx

### public/search.html
[INTENT]: Search/browse listings page HTML entry point for guests to discover available properties with filters
[IMPORTS]: src/search.jsx

### public/view-split-lease.html
[INTENT]: Listing detail page HTML entry point displaying property information, photos, pricing, and booking options
[IMPORTS]: src/view-split-lease.jsx

### public/account-profile.html
[INTENT]: User account profile page HTML entry point for managing personal information and preferences (protected route)
[IMPORTS]: src/account-profile.jsx

### public/careers.html
[INTENT]: Careers/jobs page HTML entry point displaying open positions and company culture information
[IMPORTS]: src/careers.jsx

### public/faq.html
[INTENT]: Frequently asked questions page HTML entry point with accordion-style Q&A for common inquiries
[IMPORTS]: src/faq.jsx

### public/guest-proposals.html
[INTENT]: Guest proposals management page HTML entry point for viewing, accepting, and managing booking proposals (protected route)
[IMPORTS]: src/guest-proposals.jsx

### public/guest-success.html
[INTENT]: Guest booking confirmation page HTML entry point shown after successful proposal acceptance
[IMPORTS]: src/guest-success.jsx

### public/help-center.html
[INTENT]: Help center main page HTML entry point with categorized support articles and search functionality
[IMPORTS]: src/help-center.jsx

### public/help-center-category.html
[INTENT]: Help center category view page HTML entry point displaying articles within a specific help category
[IMPORTS]: src/help-center-category.jsx

### public/host-success.html
[INTENT]: Host listing confirmation page HTML entry point shown after successful property listing creation
[IMPORTS]: src/host-success.jsx

### public/list-with-us.html
[INTENT]: Host signup/onboarding page HTML entry point for property owners to begin listing their spaces
[IMPORTS]: src/list-with-us.jsx

### public/logged-in-avatar-demo.html
[INTENT]: Avatar component demonstration page HTML entry point for testing user avatar dropdown functionality
[IMPORTS]: src/logged-in-avatar-demo.jsx

### public/policies.html
[INTENT]: Terms of service, privacy policy, and legal policies page HTML entry point
[IMPORTS]: src/policies.jsx

### public/search-test.html
[INTENT]: Search functionality test page HTML entry point for development and QA testing of search features
[IMPORTS]: src/search-test.jsx

### public/self-listing.html
[INTENT]: Host create/edit listing page HTML entry point with multi-section form for property details
[IMPORTS]: src/self-listing.jsx

### public/why-split-lease.html
[INTENT]: Marketing/value proposition page HTML entry point explaining Split Lease benefits and 45% savings claim
[IMPORTS]: src/why-split-lease.jsx

---

## Source Entry Points (`/app/src`)

### src/404.jsx
[INTENT]: 404 error page React entry point that mounts NotFoundPage component with React 18 createRoot for Islands Architecture
[IMPORTS]: react, react-dom/client, islands/pages/NotFoundPage

### src/account-profile.jsx
[INTENT]: Account profile page React entry point mounting user settings component with authentication check
[IMPORTS]: react, react-dom/client, islands/pages/AccountProfilePage, lib/auth

### src/careers.jsx
[INTENT]: Careers page React entry point mounting CareersPage component displaying job opportunities
[IMPORTS]: react, react-dom/client, islands/pages/CareersPage

### src/faq.jsx
[INTENT]: FAQ page React entry point mounting FAQPage component with accordion-style questions and answers
[IMPORTS]: react, react-dom/client, islands/pages/FAQPage

### src/guest-proposals.jsx
[INTENT]: Guest proposals page React entry point mounting GuestProposalsPage with authentication guard and proposal data fetching
[IMPORTS]: react, react-dom/client, islands/pages/GuestProposalsPage, lib/auth

### src/guest-success.jsx
[INTENT]: Guest success page React entry point mounting booking confirmation component with proposal details
[IMPORTS]: react, react-dom/client, islands/pages/GuestSuccessPage

### src/help-center.jsx
[INTENT]: Help center React entry point mounting HelpCenterPage component with category navigation and search
[IMPORTS]: react, react-dom/client, islands/pages/HelpCenterPage, data/helpCenterData

### src/help-center-category.jsx
[INTENT]: Help center category React entry point mounting category view with filtered articles based on URL params
[IMPORTS]: react, react-dom/client, islands/pages/HelpCenterCategoryPage, lib/urlParams

### src/host-success.jsx
[INTENT]: Host success page React entry point mounting listing confirmation component with share options
[IMPORTS]: react, react-dom/client, islands/pages/HostSuccessPage

### src/list-with-us.jsx
[INTENT]: List with us page React entry point mounting host signup flow with step-by-step onboarding
[IMPORTS]: react, react-dom/client, islands/pages/ListWithUsPage

### src/listing-schedule-selector.jsx
[INTENT]: Schedule selector component React entry point for embedding day/pricing selector as standalone island
[IMPORTS]: react, react-dom/client, islands/shared/ListingScheduleSelector

### src/logged-in-avatar-demo.jsx
[INTENT]: Avatar demo page React entry point for testing LoggedInAvatar component behavior and dropdown menu
[IMPORTS]: react, react-dom/client, islands/shared/LoggedInAvatar

### src/main.jsx
[INTENT]: Landing/home page React entry point mounting HomePage component as the primary marketing page
[IMPORTS]: react, react-dom/client, islands/pages/HomePage

### src/policies.jsx
[INTENT]: Policies page React entry point mounting terms/policies component with legal content sections
[IMPORTS]: react, react-dom/client, islands/pages/PoliciesPage

### src/search.jsx
[INTENT]: Search page React entry point mounting SearchPage with listing results, filters, and map integration
[IMPORTS]: react, react-dom/client, islands/pages/SearchPage, lib/supabase

### src/search-test.jsx
[INTENT]: Search test page React entry point for development testing of search functionality and filters
[IMPORTS]: react, react-dom/client, islands/pages/SearchPageTest

### src/self-listing.jsx
[INTENT]: Self-listing page React entry point mounting host listing form with 7 sections and draft saving
[IMPORTS]: react, react-dom/client, islands/pages/SelfListingPage, lib/auth

### src/view-split-lease.jsx
[INTENT]: View listing page React entry point mounting listing detail view with photos, pricing, and proposal flow
[IMPORTS]: react, react-dom/client, islands/pages/ViewSplitLeasePage, lib/listingDataFetcher

### src/why-split-lease.jsx
[INTENT]: Marketing page React entry point mounting value proposition content explaining Split Lease benefits
[IMPORTS]: react, react-dom/client, islands/pages/WhySplitLeasePage

---

## Data Directory (`/app/src/data`)

### data/helpCenterData.js
[INTENT]: Help center content data structure defining categories, articles, and navigation hierarchy for support pages
[EXPORTS]: helpCenterCategories, helpCenterArticles

---

## Islands - Modals (`/app/src/islands/modals`)

### modals/CompareTermsModal.jsx
[INTENT]: Modal component comparing original proposal terms vs counteroffer terms side-by-side for guest decision making
[IMPORTS]: react, islands/shared/Button
[DEPENDENCIES]: logic/processors/proposal/processProposalData

### modals/EditProposalModal.jsx
[INTENT]: Modal component for editing existing proposal details including dates, days, and special requests
[IMPORTS]: react, islands/shared/ListingScheduleSelector, logic/rules/proposals/canEditProposal

### modals/HostProfileModal.jsx
[INTENT]: Modal component displaying host profile information including photo, bio, response rate, and reviews
[IMPORTS]: react, logic/processors/user/processUserDisplayName

### modals/MapModal.jsx
[INTENT]: Modal component with full-screen Google Maps view showing listing location with neighborhood context
[IMPORTS]: react, @react-google-maps/api, lib/mapUtils

### modals/NotificationSettingsModal.jsx
[INTENT]: Modal component for user notification preferences including email, SMS, and push notification toggles
[IMPORTS]: react, lib/supabase

### modals/ProposalDetailsModal.jsx
[INTENT]: Modal component showing complete proposal information including pricing breakdown, dates, and status history
[IMPORTS]: react, logic/calculators/pricing/calculatePricingBreakdown, logic/rules/proposals/determineProposalStage

### modals/VirtualMeetingModal.jsx
[INTENT]: Modal component for scheduling virtual property tours with calendar integration and video call setup
[IMPORTS]: react, logic/rules/proposals/virtualMeetingRules, lib/supabase

---

## Islands - Pages (`/app/src/islands/pages`)

### pages/CareersPage.jsx
[INTENT]: Careers page component rendering job listings with department filters and application links
[IMPORTS]: react, islands/shared/Header, islands/shared/Footer

### pages/FAQPage.jsx
[INTENT]: FAQ page component with accordion-style questions organized by category (guests, hosts, payments)
[IMPORTS]: react, islands/shared/Header, islands/shared/Footer

### pages/GuestProposalsPage.jsx
[INTENT]: Guest proposals management page component displaying all proposals with status filters and action buttons (Hollow Component Pattern - delegates to hook)
[IMPORTS]: react, ./useGuestProposalsPageLogic, islands/shared/Header, islands/modals/ProposalDetailsModal
[DEPENDENCIES]: logic/workflows/proposals/, logic/rules/proposals/

### pages/GuestSuccessPage.jsx
[INTENT]: Success confirmation page component shown after guest booking with next steps and host contact info
[IMPORTS]: react, islands/shared/Header, islands/shared/Footer

### pages/HelpCenterCategoryPage.jsx
[INTENT]: Help center category view component displaying articles within a specific category with breadcrumb navigation
[IMPORTS]: react, data/helpCenterData, lib/urlParams

### pages/HelpCenterPage.jsx
[INTENT]: Help center main page component with category cards, search functionality, and popular articles section
[IMPORTS]: react, data/helpCenterData, islands/shared/Header

### pages/HomePage.jsx
[INTENT]: Landing page component with hero section, value propositions, featured listings, and call-to-action buttons
[IMPORTS]: react, islands/shared/Header, islands/shared/Footer, islands/shared/ListingCard

### pages/HostSuccessPage.jsx
[INTENT]: Success confirmation page component after host listing creation with share options and dashboard link
[IMPORTS]: react, islands/shared/Header, islands/shared/Footer

### pages/ListWithUsPage.jsx
[INTENT]: Host signup flow page component with step-by-step onboarding explaining listing process and benefits
[IMPORTS]: react, islands/shared/Header, islands/shared/SignUpLoginModal

### pages/NotFoundPage.jsx
[INTENT]: 404 error page component with navigation options, search suggestion, and home link
[IMPORTS]: react, islands/shared/Header, islands/shared/Footer

### pages/PoliciesPage.jsx
[INTENT]: Terms, privacy, and policies display page component with tabbed navigation between legal documents
[IMPORTS]: react, islands/shared/Header, islands/shared/Footer

### pages/SearchPage.jsx
[INTENT]: Search/browse listings page component with filters (price, location, amenities), map view, and results grid (Hollow Component Pattern)
[IMPORTS]: react, ./useSearchPageLogic, islands/shared/Header, islands/shared/ListingCard, islands/shared/GoogleMap
[DEPENDENCIES]: logic/rules/search/, lib/supabase

### pages/SearchPageTest.jsx
[INTENT]: Search page test variant component for development testing with additional console logging and debug UI
[IMPORTS]: react, ./useSearchPageLogic

### pages/SelfListingPage.jsx
[INTENT]: Host listing creation/edit multi-section form component with 7 sections (Space Snapshot, Location, Amenities, Pricing, Photos, House Rules, Review)
[IMPORTS]: react, ./SelfListingPage/sections/, ./SelfListingPage/store/, islands/shared/SubmitListingPhotos
[DEPENDENCIES]: lib/supabase, logic/processors/external/adaptDaysToBubble

### pages/ViewSplitLeasePage.jsx
[INTENT]: Listing detail page component displaying all property information, photo gallery, pricing calculator, and proposal creation flow (Hollow Component Pattern)
[IMPORTS]: react, ./useViewSplitLeasePageLogic, islands/shared/CreateProposalFlowV2, islands/shared/GoogleMap
[DEPENDENCIES]: logic/calculators/pricing/, logic/processors/listing/

### pages/ViewSplitLeasePage-old.jsx
[INTENT]: Legacy version of listing detail page component (deprecated - kept for reference during migration)
[IMPORTS]: react

### pages/WhySplitLeasePage.jsx
[INTENT]: Marketing page component explaining Split Lease value proposition, 45% savings, and flexible scheduling benefits
[IMPORTS]: react, islands/shared/Header, islands/shared/Footer

### pages/useGuestProposalsPageLogic.js
[INTENT]: Custom hook containing all guest proposals page business logic including data fetching, filtering, and action handlers (Hollow Component hook)
[IMPORTS]: react, lib/proposalDataFetcher, lib/auth
[DEPENDENCIES]: logic/workflows/proposals/cancelProposalWorkflow, logic/workflows/proposals/counterofferWorkflow, logic/rules/proposals/proposalRules

### pages/useSearchPageLogic.js
[INTENT]: Custom hook containing all search page business logic including filter state, pagination, and Supabase queries (Hollow Component hook)
[IMPORTS]: react, lib/supabase, lib/urlParams
[DEPENDENCIES]: logic/rules/search/isValidPriceTier, logic/rules/search/isValidWeekPattern, logic/processors/external/adaptDaysFromBubble

### pages/useViewSplitLeasePageLogic.js
[INTENT]: Custom hook containing all listing detail page business logic including data fetching, pricing calculations, and proposal state (Hollow Component hook)
[IMPORTS]: react, lib/listingDataFetcher, lib/auth
[DEPENDENCIES]: logic/calculators/pricing/, logic/processors/listing/, logic/processors/external/adaptDaysFromBubble

---

## SelfListingPage Subdirectory (`/app/src/islands/pages/SelfListingPage`)

### SelfListingPage/index.ts
[INTENT]: Main export barrel file for SelfListingPage module providing clean imports for sections and utilities
[EXPORTS]: SelfListingPage, useSelfListingStore

### SelfListingPage/types/listing.types.ts
[INTENT]: TypeScript type definitions for listing data structures including ListingDraft, ListingSection, and validation schemas
[EXPORTS]: ListingDraft, ListingSection, ValidationResult

### SelfListingPage/utils/amenitiesService.ts
[INTENT]: Service module for fetching and managing amenities data from Supabase zat_features_amenity table
[IMPORTS]: lib/supabase
[DEPENDENCIES]: Supabase table: zat_features_amenity

### SelfListingPage/utils/neighborhoodService.ts
[INTENT]: Service module for fetching neighborhood data by borough from Supabase zat_geo_hood_mediumlevel table
[IMPORTS]: lib/supabase
[DEPENDENCIES]: Supabase tables: zat_geo_borough_toplevel, zat_geo_hood_mediumlevel

---

## Islands - Proposals (`/app/src/islands/proposals`)

### proposals/EmptyState.jsx
[INTENT]: Empty state component displayed when guest has no proposals with call-to-action to browse listings
[IMPORTS]: react, islands/shared/Button

### proposals/ProposalSelector.jsx
[INTENT]: Component for selecting between multiple proposals when guest has several active bookings
[IMPORTS]: react, logic/rules/proposals/determineProposalStage

---

## Islands - Shared Components (`/app/src/islands/shared`)

### shared/Button.jsx
[INTENT]: Reusable button component with variants (primary, secondary, outline, ghost) and loading state support
[IMPORTS]: react
[EXPORTS]: Button

### shared/ContactHostMessaging.jsx
[INTENT]: Host messaging interface component for sending inquiries with message input and send functionality
[IMPORTS]: react, lib/bubbleAPI
[DEPENDENCIES]: supabase/functions/bubble-proxy/handlers/messaging

### shared/DayButton.jsx
[INTENT]: Day selection button component for schedule picker with selected/disabled/available states and accessibility support
[IMPORTS]: react
[DEPENDENCIES]: logic/processors/external/adaptDaysFromBubble (for day conversion)

### shared/ErrorOverlay.jsx
[INTENT]: Error display overlay component showing error messages with retry button and dismissal option
[IMPORTS]: react, islands/shared/Button

### shared/ExternalReviews.jsx
[INTENT]: External review display component showing Airbnb/VRBO reviews with star ratings and review text
[IMPORTS]: react

### shared/Footer.jsx
[INTENT]: Site footer component with navigation links, social media icons, and copyright information
[IMPORTS]: react

### shared/GoogleMap.jsx
[INTENT]: Google Maps integration component using @react-google-maps/api for displaying listing locations with markers
[IMPORTS]: react, @react-google-maps/api, lib/mapUtils
[DEPENDENCIES]: VITE_GOOGLE_MAPS_API_KEY environment variable

### shared/Header.jsx
[INTENT]: Site header/navigation component with logo, nav links, and authentication-aware user menu
[IMPORTS]: react, islands/shared/LoggedInAvatar, islands/shared/SignUpLoginModal, lib/auth

### shared/InformationalText.jsx
[INTENT]: CMS content display component fetching and rendering informational_texts from Supabase for dynamic content
[IMPORTS]: react, lib/informationalTextsFetcher
[DEPENDENCIES]: Supabase table: informational_texts

### shared/ListingCard.jsx
[INTENT]: Listing preview card component displaying photo, price, location, and key amenities for search results
[IMPORTS]: react, islands/shared/PriceDisplay
[DEPENDENCIES]: logic/calculators/pricing/calculateGuestFacingPrice

### shared/ListingScheduleSelector.jsx
[INTENT]: Day/pricing selector component for listing pages allowing guests to select days and see real-time pricing updates
[IMPORTS]: react, ./useScheduleSelector, ./DayButton, ./PriceDisplay
[DEPENDENCIES]: logic/calculators/pricing/, logic/processors/external/adaptDaysFromBubble

### shared/ListingScheduleSelectorV2.jsx
[INTENT]: Updated version of schedule selector with improved UX, week view toggle, and enhanced mobile support
[IMPORTS]: react, ./useScheduleSelectorLogicCore, ./DayButton
[DEPENDENCIES]: logic/calculators/pricing/, logic/processors/external/

### shared/PriceDisplay.jsx
[INTENT]: Price formatting and display component handling currency formatting, strikethrough for discounts, and price breakdowns
[IMPORTS]: react
[DEPENDENCIES]: logic/calculators/pricing/calculateGuestFacingPrice

### shared/SearchScheduleSelector.jsx
[INTENT]: Schedule selector component variant for search filters with simplified day selection for filtering listings
[IMPORTS]: react, ./DayButton
[DEPENDENCIES]: logic/processors/external/adaptDaysToBubble

### shared/SignUpLoginModal.jsx
[INTENT]: Authentication modal component for login/signup flows with email/password forms and OAuth options
[IMPORTS]: react, lib/auth
[DEPENDENCIES]: supabase/functions/bubble-auth-proxy/

### shared/Toast.jsx
[INTENT]: Notification toast component for displaying success/error/info messages with auto-dismiss and close button
[IMPORTS]: react

### shared/useScheduleSelector.js
[INTENT]: Custom hook for schedule selector state management including selected days, pricing updates, and validation
[IMPORTS]: react
[DEPENDENCIES]: logic/calculators/scheduling/, logic/calculators/pricing/, lib/scheduleSelector/

### shared/useScheduleSelectorLogicCore.js
[INTENT]: Core scheduling logic hook containing pure scheduling functions shared between selector variants
[IMPORTS]: react
[DEPENDENCIES]: logic/calculators/scheduling/calculateNightsFromDays, logic/calculators/pricing/getNightlyRateByFrequency

---

## Shared Component Subdirectories

### shared/AiSignupMarketReport/index.js
[INTENT]: AI market research component barrel export providing AiSignupMarketReport component for host onboarding
[EXPORTS]: AiSignupMarketReport

### shared/AiSignupMarketReport/Example.jsx
[INTENT]: Example usage component demonstrating AI market report integration in host signup flow
[IMPORTS]: react, ./index

### shared/AiSignupMarketReport/TestPage.jsx
[INTENT]: Test page component for validating AI market report functionality with mock data and edge cases
[IMPORTS]: react, ./index
[DEPENDENCIES]: supabase/functions/ai-gateway/

### shared/CreateDuplicateListingModal/index.js
[INTENT]: Duplicate listing modal barrel export for creating copies of existing listings with modifications
[EXPORTS]: CreateDuplicateListingModal

### shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx
[INTENT]: Modal component for duplicating existing listings allowing hosts to quickly create similar properties
[IMPORTS]: react, lib/bubbleAPI
[DEPENDENCIES]: supabase/functions/bubble-proxy/handlers/listing

### shared/CreateProposalFlowV2.jsx
[INTENT]: Multi-step proposal wizard component guiding guests through booking process (Schedule, Move-in, Review, Submit)
[IMPORTS]: react, ./CreateProposalFlowV2Components/, islands/shared/ListingScheduleSelector
[DEPENDENCIES]: logic/workflows/booking/, logic/calculators/pricing/

### shared/CreateProposalFlowV2Components/MoveInSection.jsx
[INTENT]: Move-in date selection section of proposal wizard with calendar picker and availability validation
[IMPORTS]: react
[DEPENDENCIES]: logic/calculators/scheduling/calculateNextAvailableCheckIn, logic/workflows/scheduling/validateMoveInDateWorkflow

### shared/CreateProposalFlowV2Components/ReviewSection.jsx
[INTENT]: Review section of proposal wizard displaying final pricing breakdown and terms before submission
[IMPORTS]: react, islands/shared/PriceDisplay
[DEPENDENCIES]: logic/calculators/pricing/calculatePricingBreakdown, logic/calculators/pricing/calculateReservationTotal

### shared/ImportListingModal/ImportListingModal.jsx
[INTENT]: Modal component for importing listings from external sources (Airbnb, VRBO) with URL parsing and data mapping
[IMPORTS]: react, lib/bubbleAPI
[DEPENDENCIES]: supabase/functions/bubble-proxy/

### shared/LoggedInAvatar/index.js
[INTENT]: User avatar dropdown component barrel export displaying user photo, name, and account menu options
[EXPORTS]: LoggedInAvatar
[DEPENDENCIES]: logic/processors/user/processProfilePhotoUrl, logic/processors/user/processUserInitials

### shared/SubmitListingPhotos/index.js
[INTENT]: Photo upload component barrel export for listing photo management with drag-drop and reordering
[EXPORTS]: SubmitListingPhotos

### shared/SubmitListingPhotos/SubmitListingPhotos.jsx
[INTENT]: Photo upload component for listings with drag-drop upload, preview thumbnails, and reordering capability
[IMPORTS]: react
[DEPENDENCIES]: supabase/functions/bubble-proxy/handlers/photos

### shared/SubmitListingPhotos/DeletePhotoModal.jsx
[INTENT]: Modal component for confirming photo deletion with preview and permanent deletion warning
[IMPORTS]: react, islands/shared/Button

---

## Library - Core (`/app/src/lib`)

### lib/auth.js
[INTENT]: Authentication functions module providing loginUser, logoutUser, validateTokenAndFetchUser, and checkAuthStatus with secure token handling
[IMPORTS]: ./secureStorage, ./supabase
[DEPENDENCIES]: supabase/functions/bubble-auth-proxy/
[EXPORTS]: loginUser, logoutUser, checkAuthStatus, validateTokenAndFetchUser, isAuthenticated

### lib/availabilityValidation.js
[INTENT]: Availability checking and validation logic for determining if dates/days are available for booking
[IMPORTS]: ./dayUtils
[DEPENDENCIES]: logic/rules/scheduling/isDateBlocked

### lib/bubbleAPI.js
[INTENT]: Bubble API client module (legacy) routing all requests through Edge Functions for security and rate limiting
[IMPORTS]: ./supabase
[DEPENDENCIES]: supabase/functions/bubble-proxy/, supabase/functions/bubble-auth-proxy/

### lib/config.js
[INTENT]: Application configuration settings module exporting environment-specific values and feature flags
[EXPORTS]: config, SUPABASE_URL, SUPABASE_ANON_KEY

### lib/constants.js
[INTENT]: All application constants and enumerations including proposal statuses, day names, price tiers, and API endpoints
[EXPORTS]: PROPOSAL_STATUSES, DAYS_OF_WEEK, PRICE_TIERS, API_ENDPOINTS, STORAGE_KEYS

### lib/dataLookups.js
[INTENT]: Data lookup functions for fetching boroughs, neighborhoods, amenities, and house rules from Supabase lookup tables
[IMPORTS]: ./supabase
[DEPENDENCIES]: Supabase tables: zat_geo_borough_toplevel, zat_geo_hood_mediumlevel, zat_features_amenity, zat_features_houserule

### lib/dayUtils.js
[INTENT]: Day/week utility functions for date manipulation, week calculations, and day name formatting
[EXPORTS]: getDayName, getWeekDays, formatDateRange, isWeekday

### lib/hotjar.js
[INTENT]: Hotjar analytics integration module for user behavior tracking, heatmaps, and session recording
[EXPORTS]: initHotjar, trackEvent

### lib/informationalTextsFetcher.js
[INTENT]: CMS content fetcher module retrieving informational_texts from Supabase for dynamic page content
[IMPORTS]: ./supabase
[DEPENDENCIES]: Supabase table: informational_texts
[EXPORTS]: fetchInformationalText, fetchAllInformationalTexts

### lib/listingDataFetcher.js
[INTENT]: Listing data retrieval module fetching complete listing information from Bubble.io via Edge Functions
[IMPORTS]: ./bubbleAPI
[DEPENDENCIES]: supabase/functions/bubble-proxy/handlers/listing
[EXPORTS]: fetchListing, fetchListingPhotos, fetchListingPricing

### lib/mapUtils.js
[INTENT]: Google Maps utility functions for geocoding, distance calculations, and map configuration
[IMPORTS]: @react-google-maps/api
[EXPORTS]: getMapCenter, calculateDistance, formatAddress

### lib/nycZipCodes.ts
[INTENT]: NYC zip code data and validation TypeScript module for address verification and borough detection
[EXPORTS]: NYC_ZIP_CODES, isValidNYCZipCode, getBoroughByZipCode

### lib/priceCalculations.js
[INTENT]: General pricing utility functions for formatting currency, calculating discounts, and fee computations
[EXPORTS]: formatCurrency, calculateDiscount, addServiceFee

### lib/proposalDataFetcher.js
[INTENT]: Proposal data retrieval module fetching proposal details from Bubble.io via Edge Functions
[IMPORTS]: ./bubbleAPI
[DEPENDENCIES]: supabase/functions/bubble-proxy/
[EXPORTS]: fetchProposal, fetchProposalsByGuest, fetchProposalHistory

### lib/sanitize.js
[INTENT]: HTML/input sanitization module for XSS prevention and secure user input handling
[EXPORTS]: sanitizeHTML, sanitizeInput, escapeHTML

### lib/SECURE_AUTH_README.md
[INTENT]: Authentication security documentation explaining token storage, encryption, and security best practices

### lib/secureStorage.js
[INTENT]: Encrypted storage module for auth tokens using AES encryption with secure key management
[EXPORTS]: setToken, getToken, clearToken, setSessionId, getSessionId

### lib/supabase.js
[INTENT]: Supabase client initialization module creating authenticated client instance with environment configuration
[IMPORTS]: @supabase/supabase-js
[DEPENDENCIES]: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
[EXPORTS]: supabase

### lib/supabaseUtils.js
[INTENT]: Supabase query helper functions providing typed wrappers for common database operations
[IMPORTS]: ./supabase
[EXPORTS]: fetchFromTable, insertIntoTable, updateInTable, deleteFromTable

### lib/urlParams.js
[INTENT]: URL parameter parsing utilities for extracting query parameters and route params from browser URL
[EXPORTS]: getUrlParam, getAllUrlParams, setUrlParam, removeUrlParam

---

## Library - Constants (`/app/src/lib/constants`)

### constants/proposalStages.js
[INTENT]: Proposal stage constant definitions mapping status codes to human-readable stage names for UI display
[EXPORTS]: PROPOSAL_STAGES, getStageLabel, getStageColor

### constants/proposalStatuses.js
[INTENT]: Proposal status value constants defining all possible proposal states in the booking lifecycle
[EXPORTS]: PROPOSAL_STATUSES, STATUS_TRANSITIONS, isTerminalStatus

---

## Library - Schedule Selector (`/app/src/lib/scheduleSelector`)

### scheduleSelector/dayHelpers.js
[INTENT]: Day calculation helper functions for schedule selector including contiguous day detection and gap analysis
[EXPORTS]: areContiguousDays, findGaps, mergeDayRanges

### scheduleSelector/nightCalculations.js
[INTENT]: Night count calculation functions determining number of nights from selected day array
[EXPORTS]: calculateNights, getNightRange

### scheduleSelector/priceCalculations.js
[INTENT]: Pricing calculations specific to schedule selector including per-night rates and total cost
[IMPORTS]: ../priceCalculations
[EXPORTS]: calculateTotalPrice, getPricePerNight

### scheduleSelector/validators.js
[INTENT]: Schedule validation functions ensuring selected days meet minimum stay and contiguity requirements
[EXPORTS]: isValidSchedule, validateMinimumNights, validateContiguity

---

## Logic Layer - Index (`/app/src/logic`)

### logic/index.js
[INTENT]: Central barrel export for all four logic layers providing clean imports for calculators, rules, processors, and workflows
[EXPORTS]: * from calculators, * from rules, * from processors, * from workflows

---

## Logic - Calculators (`/app/src/logic/calculators`)

### calculators/index.js
[INTENT]: Barrel export for all calculator functions aggregating pricing and scheduling calculators
[EXPORTS]: * from pricing/*, * from scheduling/*

### calculators/pricing/calculateFourWeekRent.js
[INTENT]: Pure function calculating monthly rent from nightly rate by multiplying rate by 28 nights (4 weeks)
[EXPORTS]: calculateFourWeekRent
[SIGNATURE]: (nightlyRate: number) => number

### calculators/pricing/calculateGuestFacingPrice.js
[INTENT]: Pure function calculating guest-visible pricing including service fees and applicable discounts
[IMPORTS]: ./getNightlyRateByFrequency
[EXPORTS]: calculateGuestFacingPrice
[SIGNATURE]: (basePrice: number, nights: number, fees: object) => object

### calculators/pricing/calculatePricingBreakdown.js
[INTENT]: Pure function generating itemized pricing breakdown with subtotal, fees, taxes, and total
[IMPORTS]: ./calculateGuestFacingPrice
[EXPORTS]: calculatePricingBreakdown
[SIGNATURE]: (listing: object, nights: number, selectedDays: array) => PricingBreakdown

### calculators/pricing/calculateReservationTotal.js
[INTENT]: Pure function calculating complete reservation total including all fees, taxes, and deposits
[IMPORTS]: ./calculatePricingBreakdown
[EXPORTS]: calculateReservationTotal
[SIGNATURE]: (listing: object, proposalDetails: object) => number

### calculators/pricing/getNightlyRateByFrequency.js
[INTENT]: Pure function retrieving nightly rate based on day count frequency from listing pricing tiers
[EXPORTS]: getNightlyRateByFrequency
[SIGNATURE]: (pricing: object, dayCount: number) => number

### calculators/scheduling/calculateCheckInOutDays.js
[INTENT]: Pure function calculating check-in and check-out days from selected day array
[EXPORTS]: calculateCheckInOutDays
[SIGNATURE]: (selectedDays: array) => { checkIn: number, checkOut: number }

### calculators/scheduling/calculateNextAvailableCheckIn.js
[INTENT]: Pure function finding next available check-in date considering blocked dates and minimum notice
[EXPORTS]: calculateNextAvailableCheckIn
[SIGNATURE]: (blockedDates: array, minimumNotice: number) => Date

### calculators/scheduling/calculateNightsFromDays.js
[INTENT]: Pure function counting number of nights from selected days array (nights = days - 1 for contiguous)
[EXPORTS]: calculateNightsFromDays
[SIGNATURE]: (selectedDays: array) => number

---

## Logic - Rules (`/app/src/logic/rules`)

### rules/auth/isProtectedPage.js
[INTENT]: Boolean predicate determining if current page path requires authentication before access
[EXPORTS]: isProtectedPage
[SIGNATURE]: (pathname: string) => boolean

### rules/auth/isSessionValid.js
[INTENT]: Boolean predicate checking if current session token is valid and not expired
[IMPORTS]: lib/secureStorage
[EXPORTS]: isSessionValid
[SIGNATURE]: () => boolean

### rules/pricing/isValidDayCountForPricing.js
[INTENT]: Boolean predicate validating that day count has corresponding pricing data in listing
[EXPORTS]: isValidDayCountForPricing
[SIGNATURE]: (pricing: object, dayCount: number) => boolean

### rules/proposals/canAcceptProposal.js
[INTENT]: Boolean predicate determining if guest can accept proposal based on current status and payment readiness
[IMPORTS]: ./proposalRules
[EXPORTS]: canAcceptProposal
[SIGNATURE]: (proposal: object) => boolean

### rules/proposals/canCancelProposal.js
[INTENT]: Boolean predicate determining if proposal can be cancelled based on status and cancellation policy
[IMPORTS]: ./proposalRules
[EXPORTS]: canCancelProposal
[SIGNATURE]: (proposal: object) => boolean

### rules/proposals/canEditProposal.js
[INTENT]: Boolean predicate determining if proposal can be modified based on status (only SUBMITTED allows edits)
[IMPORTS]: ./proposalRules
[EXPORTS]: canEditProposal
[SIGNATURE]: (proposal: object) => boolean

### rules/proposals/determineProposalStage.js
[INTENT]: Rule function calculating current proposal stage (1-5) from status code for progress display
[IMPORTS]: lib/constants/proposalStages
[EXPORTS]: determineProposalStage
[SIGNATURE]: (status: string) => number

### rules/proposals/proposalRules.js
[INTENT]: Consolidated proposal business rules module containing all proposal-related predicates and state machine
[IMPORTS]: lib/constants/proposalStatuses
[EXPORTS]: canAcceptProposal, canCancelProposal, canEditProposal, canCounteroffer, isTerminalStatus

### rules/proposals/virtualMeetingRules.js
[INTENT]: Virtual meeting availability rules determining if/when virtual tour can be scheduled
[EXPORTS]: canScheduleVirtualMeeting, isWithinMeetingWindow
[SIGNATURE]: (proposal: object, hostAvailability: object) => boolean

### rules/scheduling/isDateBlocked.js
[INTENT]: Boolean predicate checking if specific date is unavailable due to existing bookings or host blocks
[EXPORTS]: isDateBlocked
[SIGNATURE]: (date: Date, blockedDates: array) => boolean

### rules/scheduling/isDateInRange.js
[INTENT]: Boolean predicate checking if date falls within valid booking range (not too far future, not past)
[EXPORTS]: isDateInRange
[SIGNATURE]: (date: Date, minDate: Date, maxDate: Date) => boolean

### rules/scheduling/isScheduleContiguous.js
[INTENT]: Boolean predicate verifying selected schedule days are continuous without gaps
[EXPORTS]: isScheduleContiguous
[SIGNATURE]: (selectedDays: array) => boolean

### rules/search/isValidPriceTier.js
[INTENT]: Boolean predicate validating price range filter value against allowed price tiers
[IMPORTS]: lib/constants
[EXPORTS]: isValidPriceTier
[SIGNATURE]: (priceTier: string) => boolean

### rules/search/isValidSortOption.js
[INTENT]: Boolean predicate validating sort option parameter against allowed sort values
[IMPORTS]: lib/constants
[EXPORTS]: isValidSortOption
[SIGNATURE]: (sortOption: string) => boolean

### rules/search/isValidWeekPattern.js
[INTENT]: Boolean predicate validating week pattern filter value (every-week, alternating, custom)
[IMPORTS]: lib/constants
[EXPORTS]: isValidWeekPattern
[SIGNATURE]: (weekPattern: string) => boolean

### rules/users/hasProfilePhoto.js
[INTENT]: Boolean predicate checking if user has uploaded a profile photo (not using default avatar)
[EXPORTS]: hasProfilePhoto
[SIGNATURE]: (user: object) => boolean

### rules/users/isGuest.js
[INTENT]: Boolean predicate determining if user account type is guest (not host)
[EXPORTS]: isGuest
[SIGNATURE]: (user: object) => boolean

### rules/users/isHost.js
[INTENT]: Boolean predicate determining if user account type is host (property owner)
[EXPORTS]: isHost
[SIGNATURE]: (user: object) => boolean

### rules/users/shouldShowFullName.js
[INTENT]: Boolean predicate determining if full name should be displayed based on privacy settings and context
[EXPORTS]: shouldShowFullName
[SIGNATURE]: (user: object, context: string) => boolean

---

## Logic - Processors (`/app/src/logic/processors`)

### processors/display/formatHostName.js
[INTENT]: Data transformer formatting host name for display with optional truncation and honorifics
[EXPORTS]: formatHostName
[SIGNATURE]: (host: object, options?: object) => string

### processors/external/adaptDayFromBubble.js
[INTENT]: CRITICAL data transformer converting single day from Bubble.io format (1-7) to JavaScript format (0-6)
[EXPORTS]: adaptDayFromBubble
[SIGNATURE]: (bubbleDay: number) => number
[NOTE]: Bubble uses 1=Sunday, JS uses 0=Sunday

### processors/external/adaptDaysFromBubble.js
[INTENT]: CRITICAL data transformer converting day array from Bubble.io format (1-7) to JavaScript format (0-6)
[EXPORTS]: adaptDaysFromBubble
[SIGNATURE]: (bubbleDays: number[]) => number[]
[NOTE]: Essential for all Bubble API responses containing day data

### processors/external/adaptDayToBubble.js
[INTENT]: CRITICAL data transformer converting single day from JavaScript format (0-6) to Bubble.io format (1-7)
[EXPORTS]: adaptDayToBubble
[SIGNATURE]: (jsDay: number) => number
[NOTE]: Required when sending day data to Bubble API

### processors/external/adaptDaysToBubble.js
[INTENT]: CRITICAL data transformer converting day array from JavaScript format (0-6) to Bubble.io format (1-7)
[EXPORTS]: adaptDaysToBubble
[SIGNATURE]: (jsDays: number[]) => number[]
[NOTE]: Essential for all Bubble API requests containing day data

### processors/listing/extractListingCoordinates.js
[INTENT]: Data transformer extracting latitude/longitude coordinates from listing geographic_address field
[EXPORTS]: extractListingCoordinates
[SIGNATURE]: (listing: object) => { lat: number, lng: number } | null

### processors/listing/parseJsonArrayField.js
[INTENT]: Data transformer parsing JSON array fields from database that may be stored as strings
[EXPORTS]: parseJsonArrayField
[SIGNATURE]: (field: string | array) => array

### processors/proposal/processProposalData.js
[INTENT]: Data transformer converting raw Bubble proposal data to frontend-friendly format with computed fields
[IMPORTS]: ./external/adaptDaysFromBubble, ../rules/proposals/determineProposalStage
[EXPORTS]: processProposalData
[SIGNATURE]: (rawProposal: object) => ProcessedProposal

### processors/user/processProfilePhotoUrl.js
[INTENT]: Data transformer processing and validating profile photo URLs, handling Bubble storage URLs
[EXPORTS]: processProfilePhotoUrl
[SIGNATURE]: (url: string | null) => string

### processors/user/processUserDisplayName.js
[INTENT]: Data transformer generating display name from user data (first name, or first + last initial)
[EXPORTS]: processUserDisplayName
[SIGNATURE]: (user: object) => string

### processors/user/processUserInitials.js
[INTENT]: Data transformer extracting user initials from name for avatar fallback display
[EXPORTS]: processUserInitials
[SIGNATURE]: (user: object) => string

---

## Logic - Workflows (`/app/src/logic/workflows`)

### workflows/auth/checkAuthStatusWorkflow.js
[INTENT]: Orchestration workflow verifying user login status, validating token, and fetching user data if authenticated
[IMPORTS]: lib/auth, lib/secureStorage, ../rules/auth/isSessionValid
[EXPORTS]: checkAuthStatusWorkflow
[SIGNATURE]: () => Promise<{ isAuthenticated: boolean, user: object | null }>

### workflows/auth/validateTokenWorkflow.js
[INTENT]: Orchestration workflow validating auth token with backend and refreshing if needed
[IMPORTS]: lib/auth, lib/secureStorage
[DEPENDENCIES]: supabase/functions/bubble-auth-proxy/handlers/validate
[EXPORTS]: validateTokenWorkflow
[SIGNATURE]: (token: string) => Promise<{ valid: boolean, user: object | null }>

### workflows/booking/acceptProposalWorkflow.js
[INTENT]: Multi-step orchestration workflow for accepting proposal including validation, payment initiation, and status update
[IMPORTS]: ../rules/proposals/canAcceptProposal, lib/bubbleAPI
[DEPENDENCIES]: supabase/functions/bubble-proxy/
[EXPORTS]: acceptProposalWorkflow
[SIGNATURE]: (proposalId: string) => Promise<AcceptResult>

### workflows/booking/cancelProposalWorkflow.js
[INTENT]: Orchestration workflow for proposal cancellation including policy check, refund calculation, and status update
[IMPORTS]: ../rules/proposals/canCancelProposal, lib/bubbleAPI
[EXPORTS]: cancelProposalWorkflow
[SIGNATURE]: (proposalId: string, reason: string) => Promise<CancelResult>

### workflows/booking/loadProposalDetailsWorkflow.js
[INTENT]: Orchestration workflow loading and transforming complete proposal data including listing and host info
[IMPORTS]: lib/proposalDataFetcher, ../processors/proposal/processProposalData
[EXPORTS]: loadProposalDetailsWorkflow
[SIGNATURE]: (proposalId: string) => Promise<ProcessedProposal>

### workflows/proposals/cancelProposalWorkflow.js
[INTENT]: Proposal cancellation workflow (proposals context) with guest notification and refund processing
[IMPORTS]: ../rules/proposals/canCancelProposal, lib/bubbleAPI
[EXPORTS]: cancelProposalWorkflow
[SIGNATURE]: (proposalId: string, reason: string) => Promise<CancelResult>

### workflows/proposals/counterofferWorkflow.js
[INTENT]: Orchestration workflow for creating counteroffer with modified terms and host notification
[IMPORTS]: ../rules/proposals/canCounteroffer, lib/bubbleAPI, ../processors/external/adaptDaysToBubble
[EXPORTS]: counterofferWorkflow
[SIGNATURE]: (proposalId: string, newTerms: object) => Promise<CounterResult>

### workflows/proposals/navigationWorkflow.js
[INTENT]: Proposal page navigation workflow determining which view/modal to show based on proposal state
[IMPORTS]: ../rules/proposals/determineProposalStage
[EXPORTS]: navigationWorkflow
[SIGNATURE]: (proposal: object) => NavigationState

### workflows/proposals/virtualMeetingWorkflow.js
[INTENT]: Orchestration workflow for scheduling virtual property tours with calendar integration
[IMPORTS]: ../rules/proposals/virtualMeetingRules, lib/supabase
[DEPENDENCIES]: Supabase table: virtualmeetingschedulesandlinks
[EXPORTS]: virtualMeetingWorkflow
[SIGNATURE]: (proposalId: string, meetingDetails: object) => Promise<MeetingResult>

### workflows/scheduling/validateMoveInDateWorkflow.js
[INTENT]: Orchestration workflow validating move-in date against availability, minimum notice, and lease terms
[IMPORTS]: ../rules/scheduling/isDateBlocked, ../calculators/scheduling/calculateNextAvailableCheckIn
[EXPORTS]: validateMoveInDateWorkflow
[SIGNATURE]: (date: Date, listing: object) => Promise<ValidationResult>

### workflows/scheduling/validateScheduleWorkflow.js
[INTENT]: Orchestration workflow validating complete day selection against availability and booking rules
[IMPORTS]: ../rules/scheduling/isScheduleContiguous, ../rules/pricing/isValidDayCountForPricing
[EXPORTS]: validateScheduleWorkflow
[SIGNATURE]: (selectedDays: array, listing: object) => Promise<ValidationResult>

---

# SUPABASE DIRECTORY (`/supabase`)

## Root Supabase Files

### supabase/config.toml
[INTENT]: Supabase project configuration defining project ID, API settings, database connection, and Edge Function deployment options

### supabase/SECRETS_SETUP.md
[INTENT]: API key and secrets configuration guide documenting required Supabase secrets (BUBBLE_API_KEY, BUBBLE_API_BASE_URL, etc.) and setup instructions

---

## Shared Utilities (`/supabase/functions/_shared`)

### _shared/aiTypes.ts
[INTENT]: TypeScript type definitions for AI functionality including prompt types, completion responses, and streaming interfaces
[EXPORTS]: AIPrompt, AICompletion, StreamChunk, AIGatewayRequest

### _shared/bubbleSync.ts
[INTENT]: Bubble.io API interaction utilities providing authenticated fetch wrapper, error handling, and response parsing
[IMPORTS]: ./cors, ./errors
[EXPORTS]: bubbleFetch, bubblePost, bubblePut, bubbleDelete

### _shared/cors.ts
[INTENT]: CORS handling middleware for Edge Functions setting appropriate headers for cross-origin requests from frontend
[EXPORTS]: corsHeaders, handleCors

### _shared/errors.ts
[INTENT]: Error types and handlers for Edge Functions including APIError, ValidationError, and error response formatting
[EXPORTS]: APIError, ValidationError, formatErrorResponse

### _shared/openai.ts
[INTENT]: OpenAI API integration utilities for Edge Functions providing completion and streaming methods
[IMPORTS]: ./aiTypes
[EXPORTS]: createCompletion, createStreamingCompletion

### _shared/types.ts
[INTENT]: Core TypeScript type definitions shared across all Edge Functions including User, Listing, Proposal interfaces
[EXPORTS]: User, Listing, Proposal, APIResponse

### _shared/validation.ts
[INTENT]: Input validation utilities for Edge Functions using Zod schemas for request body validation
[EXPORTS]: validateRequest, schemas

---

## AI Gateway Function (`/supabase/functions/ai-gateway`)

### ai-gateway/deno.json
[INTENT]: Deno runtime configuration for AI gateway Edge Function specifying import maps, permissions, and TypeScript settings
[DEPENDENCIES]: _shared/*

### ai-gateway/index.ts
[INTENT]: Main entry point for AI gateway Edge Function routing requests to completion or streaming handlers based on request type
[IMPORTS]: ./handlers/complete, ./handlers/stream, _shared/cors
[EXPORTS]: Deno.serve handler

### ai-gateway/handlers/complete.ts
[INTENT]: Handler for non-streaming AI completions returning full response after OpenAI processing
[IMPORTS]: _shared/openai, _shared/validation, ../prompts/_registry
[EXPORTS]: handleComplete

### ai-gateway/handlers/stream.ts
[INTENT]: Handler for streaming AI responses using Server-Sent Events for real-time token delivery
[IMPORTS]: _shared/openai, _shared/validation, ../prompts/_registry
[EXPORTS]: handleStream

### ai-gateway/prompts/_registry.ts
[INTENT]: Prompt registry and routing system mapping prompt IDs to template configurations for AI requests
[IMPORTS]: ./_template
[EXPORTS]: getPrompt, registerPrompt, promptRegistry

### ai-gateway/prompts/_template.ts
[INTENT]: Prompt template system providing structured prompt generation with variable substitution
[EXPORTS]: createPrompt, PromptTemplate

---

## AI Signup Guest Function (`/supabase/functions/ai-signup-guest`)

### ai-signup-guest/index.ts
[INTENT]: AI-powered guest signup flow handler generating personalized market research reports during onboarding
[IMPORTS]: _shared/openai, _shared/cors, _shared/validation
[EXPORTS]: Deno.serve handler

---

## Bubble Auth Proxy Function (`/supabase/functions/bubble-auth-proxy`)

### bubble-auth-proxy/deno.json
[INTENT]: Deno runtime configuration for authentication proxy Edge Function with Bubble.io API permissions
[DEPENDENCIES]: _shared/*

### bubble-auth-proxy/index.ts
[INTENT]: Main entry point for authentication proxy routing login, signup, logout, and validate requests to appropriate handlers
[IMPORTS]: ./handlers/*, _shared/cors
[EXPORTS]: Deno.serve handler

### bubble-auth-proxy/handlers/login.ts
[INTENT]: Handler processing login requests by forwarding credentials to Bubble.io and returning JWT token
[IMPORTS]: _shared/bubbleSync, _shared/validation
[EXPORTS]: handleLogin

### bubble-auth-proxy/handlers/logout.ts
[INTENT]: Handler processing logout requests by invalidating session in Bubble.io and clearing server-side state
[IMPORTS]: _shared/bubbleSync
[EXPORTS]: handleLogout

### bubble-auth-proxy/handlers/signup.ts
[INTENT]: Handler processing signup requests creating new user in Bubble.io with email verification
[IMPORTS]: _shared/bubbleSync, _shared/validation
[EXPORTS]: handleSignup

### bubble-auth-proxy/handlers/validate.ts
[INTENT]: Handler validating JWT tokens with Bubble.io and returning current user data if valid
[IMPORTS]: _shared/bubbleSync
[EXPORTS]: handleValidate

---

## Bubble Proxy Function (`/supabase/functions/bubble-proxy`)

### bubble-proxy/deno.json
[INTENT]: Deno runtime configuration for general API proxy Edge Function with Bubble.io API permissions and rate limiting
[DEPENDENCIES]: _shared/*

### bubble-proxy/index.ts
[INTENT]: Main entry point for general API proxy routing requests to listing, messaging, photos, referral, and signup handlers
[IMPORTS]: ./handlers/*, _shared/cors
[EXPORTS]: Deno.serve handler

### bubble-proxy/handlers/listing.ts
[INTENT]: Handler for listing-related API calls including fetch, create, update, and search operations via Bubble.io
[IMPORTS]: _shared/bubbleSync, _shared/validation
[EXPORTS]: handleListing

### bubble-proxy/handlers/messaging.ts
[INTENT]: Handler for messaging API calls enabling guest-host communication through Bubble.io messaging system
[IMPORTS]: _shared/bubbleSync, _shared/validation
[EXPORTS]: handleMessaging

### bubble-proxy/handlers/photos.ts
[INTENT]: Handler for photo upload API calls managing listing image uploads to Bubble.io storage
[IMPORTS]: _shared/bubbleSync
[EXPORTS]: handlePhotos

### bubble-proxy/handlers/referral.ts
[INTENT]: Handler for referral system API calls managing referral codes, tracking, and reward attribution
[IMPORTS]: _shared/bubbleSync, _shared/validation
[EXPORTS]: handleReferral

### bubble-proxy/handlers/signup.ts
[INTENT]: Handler for signup-related API calls during guest/host registration flow through Bubble.io
[IMPORTS]: _shared/bubbleSync, _shared/validation
[EXPORTS]: handleSignup

---

# DOCS DIRECTORY (`/docs`)

### docs/AI_GATEWAY_IMPLEMENTATION_PLAN.md
[INTENT]: Original AI gateway specification document outlining architecture, endpoints, and prompt system design

### docs/AI_GATEWAY_IMPLEMENTATION_PLAN_V2.md
[INTENT]: Updated AI gateway design incorporating streaming support, prompt registry, and enhanced error handling

### docs/AI_SIGNUP_SUPABASE_MIGRATION.md
[INTENT]: Migration guide for moving AI signup functionality from Bubble.io to Supabase Edge Functions

### docs/AUTH_FLOW_COMPLETE.md
[INTENT]: Complete authentication flow documentation detailing login, signup, logout, token validation, and session management

### docs/AUTH_FLOW_DIAGRAM.md
[INTENT]: Visual authentication flow diagrams using Mermaid syntax showing request/response sequences

### docs/AUTH_QUICK_REFERENCE.md
[INTENT]: Quick reference guide for authentication functions, storage keys, and protected routes

### docs/BUBBLE_WORKFLOW_API_ENUMERATION.md
[INTENT]: Comprehensive Bubble.io API inventory documenting all available endpoints, parameters, and response formats

### docs/CODEBASE_COMPREHENSIVE_STRUCTURE.md
[INTENT]: Comprehensive codebase structure report with directory tree and file purposes

### docs/CONFIGURATION_AND_DEPLOYMENT.md
[INTENT]: Configuration and deployment reference documenting environment variables, build process, and Cloudflare Pages setup

### docs/DEPLOY_EDGE_FUNCTION.md
[INTENT]: Step-by-step guide for deploying Supabase Edge Functions including secrets configuration and testing

### docs/DIRECTORY_TREE.md
[INTENT]: Visual directory tree reference with annotations explaining folder and file purposes

### docs/GUEST_PROPOSALS_MIGRATION_PLAN.md
[INTENT]: Migration plan for guest proposals feature from Bubble.io to Supabase with data mapping

### docs/MIGRATION_CLEANUP_CHECKLIST.md
[INTENT]: Post-migration cleanup task checklist for removing legacy code and updating references

### docs/MIGRATION_PLAN_BUBBLE_TO_EDGE.md
[INTENT]: Master migration plan for transitioning all Bubble.io API calls to Supabase Edge Functions

### docs/MIGRATION_STATUS.md
[INTENT]: Current migration progress tracking document with completed, in-progress, and pending items

### docs/PHASE1_PURGE_EXECUTION.md
[INTENT]: Phase 1 cleanup execution record documenting removed legacy code and updated imports

### docs/PHOTO_UPLOAD_MIGRATION_NOTE.md
[INTENT]: Technical notes on photo upload migration including Bubble.io storage URL handling

### docs/QUICK_START_NAVIGATION.md
[INTENT]: Quick start navigation guide for new developers with "I want to..." task-based navigation

### docs/SEARCH_PAGE_CONSOLE_LOGS.md
[INTENT]: Search page debugging console logs documenting filter behavior and API call sequences

### docs/SIGNUP_FIX_TESTING.md
[INTENT]: Signup fix testing results documenting edge cases and validation improvements

---

# CLAUDE DIRECTORY (`/.claude`)

### .claude/settings.json
[INTENT]: Claude Code permissions and restrictions configuration defining allowed/blocked bash commands and tool access

### .claude/settings.local.json
[INTENT]: Local Claude Code setting overrides for developer-specific configuration (gitignored)

---

## Commands (`/.claude/commands`)

### commands/deploy.md
[INTENT]: Deploy command template executing build, Cloudflare Pages deployment, and git push workflow

### commands/preview.md
[INTENT]: Preview command template starting Vite dev server and opening browser for local testing

### commands/prime.md
[INTENT]: Project initialization command template reading CLAUDE.md files and establishing context

### commands/splitlease.md
[INTENT]: Project-specific operations command template for Split Lease common tasks

---

## Dump Commands (`/.claude/commands/Dump`)

### Dump/bug.md
[INTENT]: Bug report template command for standardized bug documentation with reproduction steps

### Dump/chore.md
[INTENT]: Chore task template command for maintenance and cleanup task documentation

### Dump/classify_adw.md
[INTENT]: Agent Development Workflow classification command for categorizing development tasks

### Dump/classify_issue.md
[INTENT]: Issue classification command for categorizing GitHub issues by type and priority

### Dump/cleanup_worktrees.md
[INTENT]: Git worktree cleanup command for removing stale worktrees and branches

### Dump/code_convention.md
[INTENT]: Code style guide command displaying project coding standards and conventions

### Dump/commit.md
[INTENT]: Commit message helper command generating conventional commit messages

### Dump/conditional_docs.md
[INTENT]: Conditional documentation generation command creating docs based on code changes

### Dump/document.md
[INTENT]: Documentation template command for creating standardized documentation files

### Dump/enforce_no_fallback.md
[INTENT]: No fallback enforcement command checking code for prohibited fallback patterns

### Dump/feature.md
[INTENT]: Feature implementation template command with planning and implementation steps

### Dump/generate_branch_name.md
[INTENT]: Branch naming command generating conventional branch names from issue descriptions

### Dump/health_check.md
[INTENT]: Health check command verifying project dependencies, environment, and build status

### Dump/implement.md
[INTENT]: Implementation helper command guiding through feature implementation workflow

### Dump/install.md
[INTENT]: Installation guide command displaying setup instructions for new developers

### Dump/install_worktree.md
[INTENT]: Git worktree setup command for creating isolated development environments

### Dump/in_loop_review.md
[INTENT]: Code review loop command for iterative review and improvement cycles

### Dump/no_fallback_check.md
[INTENT]: No fallback detection command scanning codebase for prohibited fallback patterns

### Dump/patch.md
[INTENT]: Patch creation command generating patches for specific fixes

### Dump/prepare_app.md
[INTENT]: App preparation command ensuring dependencies installed and environment configured

### Dump/prime.md
[INTENT]: Project prime command (Dump variant) for establishing full project context

### Dump/pull_request.md
[INTENT]: PR creation command generating pull request description from commits

### Dump/README_NO_FALLBACK.md
[INTENT]: No fallback principles documentation explaining why fallbacks are prohibited

### Dump/resolve_failed_e2e_test.md
[INTENT]: Failed E2E test resolution command guiding through Playwright test debugging

### Dump/resolve_failed_test.md
[INTENT]: Failed test resolution command for general test failure debugging

### Dump/review.md
[INTENT]: Code review command performing automated code quality checks

### Dump/start.md
[INTENT]: Start project command for beginning new development session

### Dump/test.md
[INTENT]: Test execution command running project test suites

### Dump/test_e2e.md
[INTENT]: E2E test command running Playwright end-to-end tests

### Dump/tools.md
[INTENT]: Tools documentation command displaying available development tools

### Dump/track_agentic_kpis.md
[INTENT]: Agentic KPI tracking command for monitoring AI agent performance metrics

---

## E2E Test Commands (`/.claude/commands/Dump/e2e`)

### e2e/test_advanced_filtering.md
[INTENT]: Advanced filtering E2E test command running Playwright tests for complex search filters

### e2e/test_ai_market_research.md
[INTENT]: AI market research E2E test command testing AI-powered market report generation

### e2e/test_basic_search.md
[INTENT]: Basic search E2E test command running Playwright tests for core search functionality

### e2e/test_contact_host.md
[INTENT]: Contact host E2E test command testing host messaging flow

### e2e/test_schedule_selector.md
[INTENT]: Schedule selector E2E test command testing day selection and pricing updates

---

## Tasks (`/.claude/tasks`)

### tasks/hamburger_menu_investigation.md
[INTENT]: Hamburger menu investigation task documenting mobile navigation debugging

### tasks/playwright_console_error_check.md
[INTENT]: Playwright console error check task for automated error detection in E2E tests

### tasks/verify-grid-layout.md
[INTENT]: Grid layout verification task ensuring responsive grid displays correctly

---

## Logs (`/.claude/logs`)

### logs/chat.json
[INTENT]: Chat interaction logs storing Claude Code conversation history for context

### logs/errors.json
[INTENT]: Error logs recording Claude Code errors and exceptions for debugging

### logs/notifications.json
[INTENT]: Notification logs tracking system notifications and alerts

### logs/stop.json
[INTENT]: Stop event logs recording session termination events

---

# CONTEXT DIRECTORY (`/Context`)

### Context/Refactoring Architecture for Logic Core.md
[INTENT]: Logic layer refactoring guide documenting four-layer architecture principles, naming conventions, and migration patterns

---

# VSCODE DIRECTORY (`/.vscode`)

### .vscode/settings.json
[INTENT]: VSCode workspace settings configuring editor preferences, formatting, and extension settings for project

### .vscode/launch.json
[INTENT]: Debug launch configurations for VSCode debugging of Node.js, Vite, and Playwright

### .vscode/extensions.json
[INTENT]: Recommended VSCode extensions list for project development (ESLint, Prettier, etc.)

### .vscode/tasks.json
[INTENT]: VSCode task definitions for common operations (build, test, deploy) accessible via command palette

---

## ### DATA_SOURCE ###

[PRIMARY_DATABASE]: Supabase PostgreSQL (93 tables)
[LEGACY_SOURCE]: Bubble.io (user, listing, proposal - source of truth during migration)
[LOOKUP_TABLES]: zat_geo_borough_toplevel, zat_geo_hood_mediumlevel, zat_features_amenity, zat_features_houserule
[CMS_CONTENT]: informational_texts table
[MEETING_DATA]: virtualmeetingschedulesandlinks table

---

## ### ENVIRONMENT_CONFIGURATION ###

### Client-Side (app/.env)
[VITE_SUPABASE_URL]: Supabase project URL for database and Edge Function calls
[VITE_SUPABASE_ANON_KEY]: Supabase anonymous key for client-side authentication
[VITE_GOOGLE_MAPS_API_KEY]: Google Maps API key for map components

### Server-Side (Supabase Secrets)
[BUBBLE_API_BASE_URL]: https://app.split.lease/version-test/api/1.1
[BUBBLE_API_KEY]: Stored securely in Supabase Dashboard (never in code)
[BUBBLE_AUTH_BASE_URL]: https://upgradefromstr.bubbleapps.io/api/1.1
[SUPABASE_SERVICE_ROLE_KEY]: From Supabase Dashboard for server-side operations

---

## ### BUILD_DEPLOYMENT ###

[DEV_COMMAND]: npm run dev (starts Vite at localhost:5173)
[BUILD_COMMAND]: npm run build (production build to app/dist/)
[PREVIEW_COMMAND]: npm run preview (preview production build locally)
[DEPLOY_COMMAND]: /deploy (Claude command: build + deploy + push)
[BUILD_OUTPUT]: app/dist/
[NODE_VERSION]: 18
[HOSTING]: Cloudflare Pages (auto-deploy on push to main)

---

## ### GIT_WORKFLOW ###

[MAIN_BRANCH]: main (production deployments)
[STAGING_BRANCH]: development (staging environment)
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
- Convert days at system boundaries (CRITICAL)
- Check auth status before protected resources
- Throw descriptive errors

### DON'Ts
- Never add fallback mechanisms or workarounds
- Never expose API keys in frontend
- Never call Bubble API directly from frontend
- Never mix day numbering systems (0-6 vs 1-7)
- Never hardcode color values (use CSS variables)
- Never use Redux (keep state simple)
- Never force push to main/master

---

**DOCUMENT_VERSION**: 2.0
**LAST_UPDATED**: 2025-11-26
**STATUS**: Enriched with Dependencies and Expanded Intents
