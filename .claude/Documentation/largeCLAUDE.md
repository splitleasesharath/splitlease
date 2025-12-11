# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Split Lease - Flexible Rental Marketplace

React 18 + Vite Islands Architecture | Supabase Edge Functions | Cloudflare Pages

---

## Commands

```bash
# Development
bun run dev              # Start dev server at http://localhost:8000
bun run build            # Production build (runs generate-routes first)
bun run preview          # Preview production build locally
bun run generate-routes  # Regenerate _redirects and _routes.json

# Supabase Edge Functions
supabase functions serve           # Serve functions locally
supabase functions deploy          # Deploy all functions
supabase functions deploy <name>   # Deploy single function

# Deployment
/deploy                  # Claude slash command for deployment
```

---

## Project Map

### Complete Directory Structure

```
Split Lease/
├── app/                                    # React frontend application
│   ├── public/                             # Static assets & HTML entry points
│   │   ├── index.html                      # Homepage
│   │   ├── index-dev.html                  # Development homepage
│   │   ├── search.html                     # Search listings
│   │   ├── search-test.html                # Search test page
│   │   ├── view-split-lease.html           # Listing detail (dynamic: /view-split-lease/:id)
│   │   ├── preview-split-lease.html        # Listing preview
│   │   ├── guest-proposals.html            # Guest proposal dashboard
│   │   ├── host-proposals.html             # Host proposal dashboard
│   │   ├── self-listing.html               # Host listing creation wizard
│   │   ├── self-listing-v2.html            # Host listing creation wizard v2
│   │   ├── listing-dashboard.html          # Host listing management
│   │   ├── host-overview.html              # Host overview dashboard
│   │   ├── account-profile.html            # User profile
│   │   ├── favorite-listings.html          # User favorite listings
│   │   ├── rental-application.html         # Rental application form
│   │   ├── reset-password.html             # Password reset page
│   │   ├── faq.html                        # FAQ page
│   │   ├── help-center.html                # Help center
│   │   ├── help-center-category.html       # Help center category
│   │   ├── policies.html                   # Legal policies
│   │   ├── about-us.html                   # About us page
│   │   ├── careers.html                    # Careers page
│   │   ├── list-with-us.html               # Host signup landing
│   │   ├── why-split-lease.html            # Marketing page
│   │   ├── guest-success.html              # Guest success stories
│   │   ├── host-success.html               # Host success stories
│   │   ├── 404.html                        # Not found page
│   │   ├── _internal-test.html             # Internal testing
│   │   ├── logged-in-avatar-demo.html      # Avatar demo
│   │   ├── listing-card-demo.html          # Card demo
│   │   ├── listing-card-f.html             # Card variant
│   │   ├── _redirects                      # Cloudflare routing (auto-generated)
│   │   ├── _headers                        # Cloudflare security headers
│   │   └── assets/                         # Images, fonts, Lottie animations
│   │
│   ├── src/
│   │   ├── routes.config.js                # ⭐ ROUTE REGISTRY - Single source of truth
│   │   │
│   │   ├── # Entry Points (29 total)
│   │   ├── main.jsx                        # Entry: HomePage
│   │   ├── search.jsx                      # Entry: SearchPage
│   │   ├── search-test.jsx                 # Entry: SearchPageTest
│   │   ├── view-split-lease.jsx            # Entry: ViewSplitLeasePage
│   │   ├── preview-split-lease.jsx         # Entry: PreviewSplitLeasePage
│   │   ├── guest-proposals.jsx             # Entry: GuestProposalsPage
│   │   ├── host-proposals.jsx              # Entry: HostProposalsPage
│   │   ├── self-listing.jsx                # Entry: SelfListingPage
│   │   ├── self-listing-v2.jsx             # Entry: SelfListingPageV2
│   │   ├── listing-dashboard.jsx           # Entry: ListingDashboardPage
│   │   ├── host-overview.jsx               # Entry: HostOverviewPage
│   │   ├── account-profile.jsx             # Entry: AccountProfilePage
│   │   ├── favorite-listings.jsx           # Entry: FavoriteListingsPage
│   │   ├── rental-application.jsx          # Entry: RentalApplicationPage
│   │   ├── reset-password.jsx              # Entry: ResetPasswordPage
│   │   ├── faq.jsx                         # Entry: FAQPage
│   │   ├── help-center.jsx                 # Entry: HelpCenterPage
│   │   ├── help-center-category.jsx        # Entry: HelpCenterCategoryPage
│   │   ├── policies.jsx                    # Entry: PoliciesPage
│   │   ├── about-us.jsx                    # Entry: AboutUsPage
│   │   ├── careers.jsx                     # Entry: CareersPage
│   │   ├── list-with-us.jsx                # Entry: ListWithUsPage
│   │   ├── why-split-lease.jsx             # Entry: WhySplitLeasePage
│   │   ├── guest-success.jsx               # Entry: GuestSuccessPage
│   │   ├── host-success.jsx                # Entry: HostSuccessPage
│   │   ├── 404.jsx                         # Entry: NotFoundPage
│   │   ├── _internal-test.jsx              # Entry: InternalTestPage
│   │   ├── logged-in-avatar-demo.jsx       # Entry: LoggedInAvatarDemo
│   │   └── listing-schedule-selector.jsx   # Entry: ListingScheduleSelector
│   │   │
│   │   ├── islands/                        # React components (Islands Architecture)
│   │   │   ├── pages/                      # Page-level components
│   │   │   │   ├── HomePage.jsx
│   │   │   │   ├── SearchPage.jsx
│   │   │   │   ├── SearchPageTest.jsx
│   │   │   │   ├── ViewSplitLeasePage.jsx
│   │   │   │   ├── ViewSplitLeasePage-old.jsx
│   │   │   │   ├── PreviewSplitLeasePage.jsx
│   │   │   │   ├── GuestProposalsPage.jsx
│   │   │   │   ├── FAQPage.jsx
│   │   │   │   ├── PoliciesPage.jsx
│   │   │   │   ├── CareersPage.jsx
│   │   │   │   ├── ListWithUsPage.jsx
│   │   │   │   ├── WhySplitLeasePage.jsx
│   │   │   │   ├── GuestSuccessPage.jsx
│   │   │   │   ├── HostSuccessPage.jsx
│   │   │   │   ├── HelpCenterPage.jsx
│   │   │   │   ├── HelpCenterCategoryPage.jsx
│   │   │   │   ├── RentalApplicationPage.jsx
│   │   │   │   ├── ResetPasswordPage.jsx
│   │   │   │   ├── NotFoundPage.jsx
│   │   │   │   ├── InternalTestPage.jsx
│   │   │   │   ├── SelfListingPage.jsx
│   │   │   │   ├── SelfListingPageV2.jsx
│   │   │   │   │
│   │   │   │   ├── # Page Logic Hooks
│   │   │   │   ├── useSearchPageLogic.js
│   │   │   │   ├── useViewSplitLeasePageLogic.js
│   │   │   │   ├── useGuestProposalsPageLogic.js
│   │   │   │   ├── useRentalApplicationPageLogic.js
│   │   │   │   │
│   │   │   │   ├── proposals/              # Shared proposal components
│   │   │   │   │   ├── ProposalCard.jsx
│   │   │   │   │   ├── ProposalSelector.jsx
│   │   │   │   │   ├── ProgressTracker.jsx
│   │   │   │   │   ├── VirtualMeetingsSection.jsx
│   │   │   │   │   └── useGuestProposalsPageLogic.js
│   │   │   │   │
│   │   │   │   ├── HostProposalsPage/      # Host proposals with sub-components
│   │   │   │   │   ├── index.jsx
│   │   │   │   │   ├── HostProposalsPage.jsx
│   │   │   │   │   ├── useHostProposalsPageLogic.js
│   │   │   │   │   ├── ProposalCard.jsx
│   │   │   │   │   ├── ProposalDetailsModal.jsx
│   │   │   │   │   ├── ProposalGrid.jsx
│   │   │   │   │   ├── ListingSelector.jsx
│   │   │   │   │   ├── DayIndicator.jsx
│   │   │   │   │   ├── EmptyState.jsx
│   │   │   │   │   ├── formatters.js
│   │   │   │   │   └── types.js
│   │   │   │   │
│   │   │   │   ├── HostOverviewPage/       # Host overview dashboard
│   │   │   │   │   ├── HostOverviewPage.jsx
│   │   │   │   │   ├── useHostOverviewPageLogic.js
│   │   │   │   │   └── components/
│   │   │   │   │       ├── index.js
│   │   │   │   │       ├── HostOverviewButton.jsx
│   │   │   │   │       ├── HostOverviewCards.jsx
│   │   │   │   │       ├── HostOverviewModals.jsx
│   │   │   │   │       └── HostOverviewToast.jsx
│   │   │   │   │
│   │   │   │   ├── ListingDashboardPage/   # Listing management
│   │   │   │   │   ├── index.js
│   │   │   │   │   ├── ListingDashboardPage.jsx
│   │   │   │   │   ├── useListingDashboardPageLogic.js
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── index.js
│   │   │   │   │   │   ├── ActionCard.jsx
│   │   │   │   │   │   ├── ActionCardGrid.jsx
│   │   │   │   │   │   ├── AlertBanner.jsx
│   │   │   │   │   │   ├── AmenitiesSection.jsx
│   │   │   │   │   │   ├── AvailabilitySection.jsx
│   │   │   │   │   │   ├── CancellationPolicySection.jsx
│   │   │   │   │   │   ├── DescriptionSection.jsx
│   │   │   │   │   │   ├── DetailsSection.jsx
│   │   │   │   │   │   ├── NavigationHeader.jsx
│   │   │   │   │   │   ├── NightlyPricingLegend.jsx
│   │   │   │   │   │   ├── PhotosSection.jsx
│   │   │   │   │   │   ├── PricingSection.jsx
│   │   │   │   │   │   ├── PricingEditSection.jsx
│   │   │   │   │   │   ├── PropertyInfoSection.jsx
│   │   │   │   │   │   ├── RulesSection.jsx
│   │   │   │   │   │   └── SecondaryActions.jsx
│   │   │   │   │   └── data/
│   │   │   │   │       └── mockListing.js
│   │   │   │   │
│   │   │   │   ├── FavoriteListingsPage/   # User favorites
│   │   │   │   │   ├── index.js
│   │   │   │   │   ├── FavoriteListingsPage.jsx
│   │   │   │   │   ├── favoritesApi.js
│   │   │   │   │   ├── formatters.js
│   │   │   │   │   ├── types.js
│   │   │   │   │   └── components/
│   │   │   │   │       ├── EmptyState.jsx
│   │   │   │   │       ├── FavoriteButton.jsx
│   │   │   │   │       ├── ListingCard.jsx
│   │   │   │   │       ├── MapView.jsx
│   │   │   │   │       └── SplitScheduleSelector.jsx
│   │   │   │   │
│   │   │   │   └── AboutUsPage/
│   │   │   │       └── AboutUsPage.jsx
│   │   │   │
│   │   │   ├── shared/                     # Reusable components (50+)
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   ├── Toast.jsx
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── DayButton.jsx
│   │   │   │   ├── PriceDisplay.jsx
│   │   │   │   ├── ErrorOverlay.jsx
│   │   │   │   ├── InformationalText.jsx
│   │   │   │   ├── ExternalReviews.jsx
│   │   │   │   ├── GoogleMap.jsx
│   │   │   │   ├── ContactHostMessaging.jsx
│   │   │   │   ├── SignUpLoginModal.jsx
│   │   │   │   ├── ListingScheduleSelector.jsx
│   │   │   │   ├── ListingScheduleSelectorV2.jsx
│   │   │   │   ├── SearchScheduleSelector.jsx
│   │   │   │   ├── AuthAwareSearchScheduleSelector.jsx
│   │   │   │   ├── CreateProposalFlowV2.jsx        # Multi-step proposal wizard
│   │   │   │   │
│   │   │   │   ├── CreateProposalFlowV2Components/
│   │   │   │   │   ├── UserDetailsSection.jsx
│   │   │   │   │   ├── DaysSelectionSection.jsx
│   │   │   │   │   ├── MoveInSection.jsx
│   │   │   │   │   └── ReviewSection.jsx
│   │   │   │   │
│   │   │   │   ├── ListingCard/
│   │   │   │   │   └── ListingCardForMap.jsx
│   │   │   │   │
│   │   │   │   ├── AiSignupMarketReport/
│   │   │   │   │   ├── AiSignupMarketReport.jsx
│   │   │   │   │   ├── Example.jsx
│   │   │   │   │   └── TestPage.jsx
│   │   │   │   │
│   │   │   │   ├── AIImportAssistantModal/
│   │   │   │   │   └── AIImportAssistantModal.jsx
│   │   │   │   │
│   │   │   │   ├── EditListingDetails/
│   │   │   │   │   └── EditListingDetails.jsx
│   │   │   │   │
│   │   │   │   ├── FavoriteButton/
│   │   │   │   │   └── FavoriteButton.jsx
│   │   │   │   │
│   │   │   │   ├── HostScheduleSelector/
│   │   │   │   │   ├── HostScheduleSelector.jsx
│   │   │   │   │   └── SimpleHostScheduleSelector.jsx
│   │   │   │   │
│   │   │   │   ├── HostEditingProposal/
│   │   │   │   │   ├── HostEditingProposal.jsx
│   │   │   │   │   ├── FormInputs.jsx
│   │   │   │   │   ├── ScheduleSelector.jsx
│   │   │   │   │   └── ReservationPriceBreakdown.jsx
│   │   │   │   │
│   │   │   │   ├── ImportListingModal/
│   │   │   │   │   └── ImportListingModal.jsx
│   │   │   │   │
│   │   │   │   ├── ImportListingReviewsModal/
│   │   │   │   │   └── ImportListingReviewsModal.jsx
│   │   │   │   │
│   │   │   │   ├── CreateDuplicateListingModal/
│   │   │   │   │   └── CreateDuplicateListingModal.jsx
│   │   │   │   │
│   │   │   │   ├── LoggedInAvatar/
│   │   │   │   │   └── LoggedInAvatar.jsx
│   │   │   │   │
│   │   │   │   ├── ScheduleCohost/
│   │   │   │   │   └── ScheduleCohost.jsx
│   │   │   │   │
│   │   │   │   ├── SubmitListingPhotos/
│   │   │   │   │   ├── SubmitListingPhotos.jsx
│   │   │   │   │   └── DeletePhotoModal.jsx
│   │   │   │   │
│   │   │   │   └── VirtualMeetingManager/
│   │   │   │       ├── VirtualMeetingManager.jsx
│   │   │   │       ├── BookVirtualMeeting.jsx
│   │   │   │       ├── BookTimeSlot.jsx
│   │   │   │       ├── CancelVirtualMeetings.jsx
│   │   │   │       ├── DetailsOfProposalAndVM.jsx
│   │   │   │       └── RespondToVMRequest.jsx
│   │   │   │
│   │   │   └── modals/                     # Modal components (13 total)
│   │   │       ├── CancelProposalModal.jsx
│   │   │       ├── CompareTermsModal.jsx
│   │   │       ├── EditProposalModal.jsx
│   │   │       ├── EditPhoneNumberModal.jsx
│   │   │       ├── GuestEditingProposalModal.jsx
│   │   │       ├── HostProfileModal.jsx
│   │   │       ├── MapModal.jsx
│   │   │       ├── NotificationSettingsModal.jsx
│   │   │       ├── ProposalDetailsModal.jsx
│   │   │       ├── ProposalSuccessModal.jsx
│   │   │       └── VirtualMeetingModal.jsx
│   │   │
│   │   ├── logic/                          # ⭐ FOUR-LAYER BUSINESS LOGIC
│   │   │   ├── index.js                    # Main export barrel
│   │   │   │
│   │   │   ├── constants/                  # Business constants
│   │   │   │   ├── proposalStages.js
│   │   │   │   └── proposalStatuses.js
│   │   │   │
│   │   │   ├── calculators/                # Pure math functions
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
│   │   │   ├── rules/                      # Boolean predicates
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
│   │   │   │   │   ├── useProposalButtonStates.js
│   │   │   │   │   └── virtualMeetingRules.js
│   │   │   │   ├── scheduling/
│   │   │   │   │   ├── isDateBlocked.js
│   │   │   │   │   ├── isDateInRange.js
│   │   │   │   │   └── isScheduleContiguous.js
│   │   │   │   ├── search/
│   │   │   │   │   ├── hasListingPhotos.js
│   │   │   │   │   ├── isValidPriceTier.js
│   │   │   │   │   ├── isValidSortOption.js
│   │   │   │   │   └── isValidWeekPattern.js
│   │   │   │   └── users/
│   │   │   │       ├── hasProfilePhoto.js
│   │   │   │       ├── isGuest.js
│   │   │   │       ├── isHost.js
│   │   │   │       └── shouldShowFullName.js
│   │   │   │
│   │   │   ├── processors/                 # Data transformation
│   │   │   │   ├── index.js
│   │   │   │   ├── display/
│   │   │   │   │   └── formatHostName.js
│   │   │   │   ├── external/               # ⭐ API BOUNDARY ADAPTERS
│   │   │   │   │   ├── adaptDayFromBubble.js     # Single day Bubble → JS
│   │   │   │   │   ├── adaptDayToBubble.js       # Single day JS → Bubble
│   │   │   │   │   ├── adaptDaysFromBubble.js    # Array Bubble → JS (1-7 → 0-6)
│   │   │   │   │   └── adaptDaysToBubble.js      # Array JS → Bubble (0-6 → 1-7)
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
│   │   │   └── workflows/                  # Orchestration
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
│   │   ├── lib/                            # Utilities & Infrastructure
│   │   │   ├── auth.js                     # Authentication (comprehensive)
│   │   │   ├── supabase.js                 # Supabase client init
│   │   │   ├── supabaseUtils.js            # Query helpers, batch fetching
│   │   │   ├── config.js                   # App configuration
│   │   │   ├── constants.js                # App constants (days, prices, patterns)
│   │   │   ├── dataLookups.js              # Cached lookups (neighborhoods, amenities)
│   │   │   ├── navigation.js               # Route helpers (goToListing, getListingUrl)
│   │   │   ├── listingDataFetcher.js       # Complete listing enrichment
│   │   │   ├── listingService.js           # Listing CRUD operations
│   │   │   ├── priceCalculations.js        # Pricing formulas
│   │   │   ├── dayUtils.js                 # Day index conversion
│   │   │   ├── sanitize.js                 # XSS protection, input validation
│   │   │   ├── urlParams.js                # URL parameter management
│   │   │   ├── mapUtils.js                 # Google Maps helpers
│   │   │   ├── bubbleAPI.js                # Bubble API client (via Edge Functions)
│   │   │   ├── aiService.js                # AI completions client
│   │   │   ├── secureStorage.js            # Encrypted token storage
│   │   │   ├── photoUpload.js              # Photo upload handling
│   │   │   ├── proposalDataFetcher.js      # Proposal data fetching
│   │   │   ├── availabilityValidation.js   # Availability validation
│   │   │   ├── informationalTextsFetcher.js # Info text fetching
│   │   │   ├── slackService.js             # Slack notification client
│   │   │   ├── hotjar.js                   # Hotjar analytics
│   │   │   │
│   │   │   ├── constants/                  # Constant definitions
│   │   │   │   ├── proposalStages.js
│   │   │   │   └── proposalStatuses.js
│   │   │   │
│   │   │   ├── proposals/                  # Proposal utilities
│   │   │   │   ├── dataTransformers.js
│   │   │   │   ├── statusButtonConfig.js
│   │   │   │   ├── urlParser.js
│   │   │   │   └── userProposalQueries.js
│   │   │   │
│   │   │   └── scheduleSelector/           # Schedule picker logic
│   │   │       ├── dayHelpers.js
│   │   │       ├── nightCalculations.js
│   │   │       ├── priceCalculations.js
│   │   │       └── validators.js
│   │   │
│   │   ├── styles/                         # CSS (40+ files)
│   │   │   ├── variables.css               # CSS custom properties (colors, spacing)
│   │   │   ├── main.css                    # Global base styles
│   │   │   ├── careers.css
│   │   │   ├── faq.css
│   │   │   ├── help-center.css
│   │   │   ├── list-with-us.css
│   │   │   ├── listing-schedule-selector.css
│   │   │   ├── create-proposal-flow-v2.css
│   │   │   ├── reset-password.css
│   │   │   ├── why-split-lease.css
│   │   │   └── components/                 # Component-specific styles
│   │   │       ├── header.css
│   │   │       ├── footer.css
│   │   │       ├── modal.css
│   │   │       ├── toast.css
│   │   │       ├── hero.css
│   │   │       ├── listings.css
│   │   │       ├── search-page.css
│   │   │       ├── guest-proposals.css
│   │   │       ├── host-proposals.css
│   │   │       ├── host-overview.css
│   │   │       ├── listing-dashboard.css
│   │   │       ├── rental-application.css
│   │   │       ├── benefits.css
│   │   │       ├── floating-badge.css
│   │   │       ├── guest-success.css
│   │   │       ├── host-success.css
│   │   │       ├── import-listing-modal.css
│   │   │       ├── ai-import-assistant-modal.css
│   │   │       ├── edit-listing-details.css
│   │   │       ├── create-listing-modal.css
│   │   │       ├── local-section.css
│   │   │       ├── mobile.css
│   │   │       ├── not-found.css
│   │   │       ├── policies.css
│   │   │       ├── schedule.css
│   │   │       ├── support.css
│   │   │       ├── testimonials.css
│   │   │       ├── utilities.css
│   │   │       └── value-props.css
│   │   │
│   │   └── config/
│   │       └── proposalStatusConfig.js     # Proposal status mappings
│   │
│   ├── functions/                          # Cloudflare Pages Functions
│   │   └── view-split-lease/[id].js        # Dynamic route handler
│   │
│   ├── vite.config.js                      # Build config with routing plugins
│   └── package.json                        # Dependencies
│
├── supabase/                               # Backend
│   ├── config.toml                         # Supabase local config
│   └── functions/                          # Edge Functions (Deno 2) - 11 functions
│       ├── _shared/                        # Shared utilities (10 files)
│       │   ├── cors.ts                     # CORS headers
│       │   ├── errors.ts                   # Custom error classes
│       │   ├── validation.ts               # Input validation
│       │   ├── types.ts                    # TypeScript interfaces
│       │   ├── aiTypes.ts                  # AI-specific types
│       │   ├── bubbleSync.ts               # BubbleSyncService class
│       │   ├── queueSync.ts                # Queue sync utilities
│       │   ├── jsonUtils.ts                # JSON helpers
│       │   ├── openai.ts                   # OpenAI wrapper
│       │   └── slack.ts                    # Slack integration
│       │
│       ├── auth-user/                      # Authentication
│       │   ├── index.ts                    # Router
│       │   └── handlers/
│       │       ├── login.ts                # Supabase Auth login
│       │       ├── signup.ts               # Supabase Auth signup
│       │       ├── logout.ts               # Logout handler
│       │       ├── validate.ts             # Token validation
│       │       ├── resetPassword.ts        # Password reset
│       │       └── updatePassword.ts       # Password update
│       │
│       ├── bubble-proxy/                   # Bubble API proxy
│       │   ├── index.ts                    # Router
│       │   └── handlers/
│       │       ├── favorites.ts            # Toggle favorites
│       │       ├── getFavorites.ts         # Get user favorites
│       │       ├── messaging.ts            # Send messages
│       │       ├── photos.ts               # Upload photos
│       │       ├── referral.ts             # Submit referrals
│       │       ├── listingSync.ts          # Listing sync
│       │       ├── parseProfile.ts         # Profile parsing
│       │       └── aiInquiry.ts            # AI inquiry handling
│       │
│       ├── listing/                        # Listing operations
│       │   ├── index.ts                    # Router
│       │   └── handlers/
│       │       ├── create.ts               # Create listing
│       │       ├── get.ts                  # Get listing
│       │       └── submit.ts               # Submit listing
│       │
│       ├── proposal/                       # Proposal operations
│       │   ├── index.ts                    # Router
│       │   ├── actions/
│       │   │   ├── create.ts               # Create proposal
│       │   │   ├── get.ts                  # Get proposal
│       │   │   ├── update.ts               # Update proposal
│       │   │   └── suggest.ts              # Suggest proposal
│       │   └── lib/
│       │       ├── calculations.ts         # Price calculations
│       │       ├── dayConversion.ts        # Day index conversion
│       │       ├── validators.ts           # Validation logic
│       │       ├── status.ts               # Status management
│       │       ├── types.ts                # Type definitions
│       │       └── bubbleSyncQueue.ts      # Bubble sync queue
│       │
│       ├── ai-gateway/                     # AI completions
│       │   ├── index.ts                    # Router
│       │   ├── handlers/
│       │   │   ├── complete.ts             # Non-streaming
│       │   │   └── stream.ts               # SSE streaming
│       │   └── prompts/
│       │       ├── _registry.ts            # Prompt registry
│       │       ├── _template.ts            # Prompt template
│       │       ├── listing-description.ts  # Listing descriptions
│       │       ├── listing-title.ts        # Listing titles
│       │       └── proposal-summary.ts     # Proposal summaries
│       │
│       ├── bubble_sync/                    # Bubble↔Supabase sync
│       │   ├── index.ts                    # Router
│       │   ├── handlers/
│       │   │   ├── buildRequest.ts         # Build sync request
│       │   │   ├── cleanup.ts              # Queue cleanup
│       │   │   ├── getStatus.ts            # Get sync status
│       │   │   ├── processQueue.ts         # Process sync queue
│       │   │   ├── processQueueDataApi.ts  # Process via Data API
│       │   │   ├── propagateListingFK.ts   # Propagate FKs
│       │   │   ├── retryFailed.ts          # Retry failed syncs
│       │   │   ├── syncSingle.ts           # Sync single record
│       │   │   └── syncSignupAtomic.ts     # Atomic signup sync
│       │   └── lib/
│       │       ├── bubbleDataApi.ts        # Bubble Data API client
│       │       ├── bubblePush.ts           # Push to Bubble
│       │       ├── fieldMapping.ts         # Field mapping
│       │       ├── tableMapping.ts         # Table mapping
│       │       ├── transformer.ts          # Data transformer
│       │       └── queueManager.ts         # Queue management
│       │
│       ├── communications/                 # Communications
│       │   └── index.ts                    # Router
│       │
│       ├── pricing/                        # Pricing calculations
│       │   └── index.ts                    # Router
│       │
│       ├── slack/                          # Slack notifications
│       │   └── index.ts                    # Main handler
│       │
│       ├── ai-signup-guest/                # AI-powered guest signup
│       │   └── index.ts                    # Main handler
│       │
│       └── ai-parse-profile/               # AI profile parsing
│           └── index.ts                    # Main handler
│
├── .claude/                                # Claude Code configuration
│   ├── CLAUDE.md                           # This file
│   │
│   ├── commands/                           # Custom slash commands (6 commands)
│   │   ├── deploy.md                       # Deployment command
│   │   ├── generate_claude.md              # Generate CLAUDE.md
│   │   ├── preview.md                      # Preview command
│   │   ├── prime.md                        # Prime context
│   │   ├── splitlease.md                   # Split Lease context
│   │   └── supabase.md                     # Supabase commands
│   │
│   ├── plans/                              # Implementation plans
│   │   ├── New/                            # Active plans (80+ files)
│   │   ├── Done/                           # Completed plans (65+ files)
│   │   ├── Documents/                      # Analysis documents (30+ files)
│   │   └── Deprecated/                     # Deprecated context
│   │       └── Context/
│   │           ├── Database/
│   │           └── Option Sets/
│   │
│   └── Documentation/                      # Detailed docs by domain
│       ├── Auth/                           # Authentication docs
│       │   ├── LOGIN_FLOW.md
│       │   ├── SIGNUP_FLOW.md
│       │   └── AUTH_USER_EDGE_FUNCTION.md
│       │
│       ├── Backend(EDGE - Functions)/      # Edge function docs
│       │   ├── README.md
│       │   ├── QUICK_REFERENCE.md
│       │   ├── SEQUENCE_DIAGRAMS.md
│       │   ├── AUTH_USER.md
│       │   ├── BUBBLE_PROXY.md
│       │   ├── BUBBLE_SYNC.md
│       │   ├── AI_GATEWAY.md
│       │   ├── AI_SIGNUP_GUEST.md
│       │   ├── LISTING.md
│       │   ├── PROPOSAL.md
│       │   ├── SLACK.md
│       │   └── SHARED_UTILITIES.md
│       │
│       ├── Database/                       # Database docs
│       │   ├── REFERENCE_TABLES_FK_FIELDS.md
│       │   ├── DATABASE_TABLES_DETAILED.md
│       │   ├── DATABASE_OPTION_SETS_QUICK_REFERENCE.md
│       │   └── OPTION_SETS_DETAILED.md
│       │
│       ├── External/                       # External integrations
│       │   ├── GOOGLE_MAPS_API_IMPLEMENTATION.md
│       │   └── HOTJAR_IMPLEMENTATION.md
│       │
│       ├── Pages/                          # Page-specific docs (28 pages)
│       │   ├── HOME_QUICK_REFERENCE.md
│       │   ├── SEARCH_QUICK_REFERENCE.md
│       │   ├── VIEW_SPLIT_LEASE_QUICK_REFERENCE.md
│       │   ├── GUEST_PROPOSALS_QUICK_REFERENCE.md
│       │   ├── SELF_LISTING_QUICK_REFERENCE.md
│       │   ├── LISTING_DASHBOARD_QUICK_REFERENCE.md
│       │   ├── LISTING_DASHBOARD_PAGE_CONTEXT.md
│       │   ├── HOST_OVERVIEW_QUICK_REFERENCE.md
│       │   ├── FAVORITE_LISTINGS_QUICK_REFERENCE.md
│       │   ├── RENTAL_APPLICATION_QUICK_REFERENCE.md
│       │   ├── ACCOUNT_PROFILE_QUICK_REFERENCE.md
│       │   ├── FAQ_QUICK_REFERENCE.md
│       │   ├── HELP_CENTER_QUICK_REFERENCE.md
│       │   ├── POLICIES_QUICK_REFERENCE.md
│       │   ├── ABOUT_US_QUICK_REFERENCE.md
│       │   ├── CAREERS_QUICK_REFERENCE.md
│       │   ├── LIST_WITH_US_QUICK_REFERENCE.md
│       │   ├── WHY_SPLIT_LEASE_QUICK_REFERENCE.md
│       │   ├── GUEST_SUCCESS_QUICK_REFERENCE.md
│       │   ├── HOST_SUCCESS_QUICK_REFERENCE.md
│       │   ├── 404_QUICK_REFERENCE.md
│       │   ├── INDEX_DEV_QUICK_REFERENCE.md
│       │   └── SEARCH_TEST_QUICK_REFERENCE.md
│       │
│       └── Routing/
│           └── ROUTING_GUIDE.md            # **MUST READ** for routes
│
└── DATABASE_SCHEMA_OVERVIEW.md             # Complete Supabase schemas (93 tables)
```

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `react` 18.2 | UI library |
| `@supabase/supabase-js` | Database client |
| `@react-google-maps/api` | Google Maps integration |
| `framer-motion` | Animations |
| `lucide-react` | Icons |
| `date-fns` / `date-fns-tz` | Date handling |
| `react-hook-form` + `zod` | Form validation |
| `lottie-react` | Lottie animations |

### Architectural Decisions

| Pattern | Description |
|---------|-------------|
| **Islands Architecture** | Each page is an independent React root, not a SPA |
| **Hollow Components** | Page components contain NO logic, delegate to `useXxxPageLogic` hooks |
| **Four-Layer Logic** | Business logic in `logic/` separated into calculators→rules→processors→workflows |
| **Route Registry** | Single file (`routes.config.js`) defines all routes, generates Cloudflare configs |
| **Edge Function Proxy** | All Bubble API calls go through Edge Functions (API keys server-side) |
| **Action-Based Routing** | Edge Functions use `{ action, payload }` pattern, not REST |

---

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (app/)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Entry Points (*.jsx)                                                    │
│       ↓                                                                  │
│  Page Components (islands/pages/)                                        │
│       ↓ (Hollow Component Pattern)                                       │
│  Page Logic Hooks (useXxxPageLogic)                                      │
│       ↓                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    LOGIC LAYER (logic/)                          │    │
│  │  Calculators → Rules → Processors → Workflows                    │    │
│  │  (pure math)   (bool)   (transform)   (orchestrate)              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│       ↓                                                                  │
│  Library Utilities (lib/)                                                │
│  - auth.js, supabase.js, bubbleAPI.js                                   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS (11 functions)                │
├─────────────────────────────────────────────────────────────────────────┤
│  POST /functions/v1/{function}                                           │
│  Body: { "action": "...", "payload": {...} }                            │
│                                                                          │
│  auth-user/        → Supabase Auth (login/signup/reset)                 │
│  bubble-proxy/     → Proxies Bubble API calls                           │
│  listing/          → Listing CRUD with Supabase                         │
│  proposal/         → Proposal operations with Bubble sync               │
│  ai-gateway/       → OpenAI completions (streaming + non-streaming)     │
│  ai-signup-guest/  → AI-powered guest signup                            │
│  ai-parse-profile/ → AI profile parsing                                 │
│  bubble_sync/      → Bubble↔Supabase bidirectional sync                 │
│  communications/   → Communication handling                              │
│  pricing/          → Pricing calculations                                │
│  slack/            → Slack notifications                                 │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ↓                                 ↓
┌──────────────────────────┐    ┌──────────────────────────┐
│   SUPABASE (PostgreSQL)  │    │   BUBBLE.IO (Legacy)     │
│   93 tables              │    │   Source of truth for:   │
│   - listing              │    │   - proposals            │
│   - user                 │    │   - workflows            │
│   - proposal (replica)   │    │                          │
│   - zat_* (lookups)      │    │                          │
└──────────────────────────┘    └──────────────────────────┘
```

### Route Registry System
**Single Source of Truth**: `app/src/routes.config.js`

- All routes defined in one file
- Auto-generates `_redirects` and `_routes.json` via `bun run generate-routes`
- Vite dev/preview servers read from registry
- Run `bun run generate-routes` after adding/modifying routes

### Four-Layer Logic (`app/src/logic/`)
| Layer | Purpose | Naming | Example |
|-------|---------|--------|---------|
| **Calculators** | Pure math | `calculate*`, `get*` | `calculateFourWeekRent.js` |
| **Rules** | Boolean predicates | `can*`, `is*`, `has*`, `should*` | `canCancelProposal.js` |
| **Processors** | Data transformation | `adapt*`, `extract*`, `process*` | `adaptDaysFromBubble.js` |
| **Workflows** | Orchestration | `*Workflow` | `cancelProposalWorkflow.js` |

### Edge Functions Pattern
```typescript
POST /functions/v1/{function-name}
Body: { "action": "action_name", "payload": { ... } }
Response: { "success": true, "data": { ... } } | { "success": false, "error": "..." }
```

---

## Critical Patterns

### Day Indexing (CRITICAL)
| System | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
|--------|-----|-----|-----|-----|-----|-----|-----|
| JavaScript (internal) | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
| Bubble API (external) | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

**Always convert at API boundaries:**
```javascript
import { adaptDaysFromBubble } from 'src/logic/processors/external/adaptDaysFromBubble.js'
import { adaptDaysToBubble } from 'src/logic/processors/external/adaptDaysToBubble.js'

const jsDays = adaptDaysFromBubble({ bubbleDays: [2, 3, 4, 5, 6] }) // → [1, 2, 3, 4, 5]
const bubbleDays = adaptDaysToBubble({ jsDays: [1, 2, 3, 4, 5] }) // → [2, 3, 4, 5, 6]
```

### Unique ID Generation
```typescript
const { data: newId } = await supabaseAdmin.rpc('generate_bubble_id');
```

### Hollow Component Pattern
Pages delegate ALL logic to hooks:
```jsx
function ViewSplitLeasePage() {
  const { listing, selectedDays, handleDaySelection } = useViewSplitLeasePageLogic()
  return <div>{/* Pure rendering */}</div>
}
```

---

## Documentation Index

### Architecture & Code Guides
| File | Description |
|------|-------------|
| [app/CLAUDE.md](../../app/CLAUDE.md) | Frontend: React, components, islands pattern |
| [supabase/CLAUDE.md](../../supabase/CLAUDE.md) | Backend: Edge Functions, shared utilities |
| [DATABASE_SCHEMA_OVERVIEW.md](../../DATABASE_SCHEMA_OVERVIEW.md) | Complete Supabase table schemas (93 tables) |

### .claude/Documentation/

#### Architecture (2 files)
| File | Description |
|------|-------------|
| [Architecture/ARCHITECTURE_GUIDE_ESM_REACT_ISLAND.md](./Architecture/ARCHITECTURE_GUIDE_ESM_REACT_ISLAND.md) | ESM React Islands architecture guide |
| [Architecture/DIRECTORY_STRUCTURE.md](./Architecture/DIRECTORY_STRUCTURE.md) | Complete project directory tree |

#### Auth (3 files)
| File | Description |
|------|-------------|
| [Auth/LOGIN_FLOW.md](./Auth/LOGIN_FLOW.md) | Login flow, UI states, validation |
| [Auth/SIGNUP_FLOW.md](./Auth/SIGNUP_FLOW.md) | Guest/host signup flow |
| [Auth/AUTH_USER_EDGE_FUNCTION.md](./Auth/AUTH_USER_EDGE_FUNCTION.md) | Auth Edge Function details |

#### Backend - EDGE Functions (12 files)
| File | Description |
|------|-------------|
| [Backend(EDGE - Functions)/README.md](./Backend(EDGE%20-%20Functions)/README.md) | Edge functions overview |
| [Backend(EDGE - Functions)/QUICK_REFERENCE.md](./Backend(EDGE%20-%20Functions)/QUICK_REFERENCE.md) | Quick reference |
| [Backend(EDGE - Functions)/SEQUENCE_DIAGRAMS.md](./Backend(EDGE%20-%20Functions)/SEQUENCE_DIAGRAMS.md) | Sequence diagrams |
| [Backend(EDGE - Functions)/AUTH_USER.md](./Backend(EDGE%20-%20Functions)/AUTH_USER.md) | Auth user function |
| [Backend(EDGE - Functions)/BUBBLE_PROXY.md](./Backend(EDGE%20-%20Functions)/BUBBLE_PROXY.md) | Bubble proxy function |
| [Backend(EDGE - Functions)/BUBBLE_SYNC.md](./Backend(EDGE%20-%20Functions)/BUBBLE_SYNC.md) | Bubble sync function |
| [Backend(EDGE - Functions)/AI_GATEWAY.md](./Backend(EDGE%20-%20Functions)/AI_GATEWAY.md) | AI gateway function |
| [Backend(EDGE - Functions)/AI_SIGNUP_GUEST.md](./Backend(EDGE%20-%20Functions)/AI_SIGNUP_GUEST.md) | AI signup guest function |
| [Backend(EDGE - Functions)/LISTING.md](./Backend(EDGE%20-%20Functions)/LISTING.md) | Listing function |
| [Backend(EDGE - Functions)/PROPOSAL.md](./Backend(EDGE%20-%20Functions)/PROPOSAL.md) | Proposal function |
| [Backend(EDGE - Functions)/SLACK.md](./Backend(EDGE%20-%20Functions)/SLACK.md) | Slack function |
| [Backend(EDGE - Functions)/SHARED_UTILITIES.md](./Backend(EDGE%20-%20Functions)/SHARED_UTILITIES.md) | Shared utilities |

#### Database (4 files)
| File | Description |
|------|-------------|
| [Database/REFERENCE_TABLES_FK_FIELDS.md](./Database/REFERENCE_TABLES_FK_FIELDS.md) | Reference tables and FK fields |
| [Database/DATABASE_TABLES_DETAILED.md](./Database/DATABASE_TABLES_DETAILED.md) | Detailed table documentation |
| [Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md](./Database/DATABASE_OPTION_SETS_QUICK_REFERENCE.md) | Option sets quick reference |
| [Database/OPTION_SETS_DETAILED.md](./Database/OPTION_SETS_DETAILED.md) | Option sets documentation |

#### External Integrations (2 files)
| File | Description |
|------|-------------|
| [External/GOOGLE_MAPS_API_IMPLEMENTATION.md](./External/GOOGLE_MAPS_API_IMPLEMENTATION.md) | Google Maps integration guide |
| [External/HOTJAR_IMPLEMENTATION.md](./External/HOTJAR_IMPLEMENTATION.md) | Hotjar analytics implementation |

#### Routing (1 file)
| File | Description |
|------|-------------|
| [Routing/ROUTING_GUIDE.md](./Routing/ROUTING_GUIDE.md) | **MUST READ** for adding/modifying routes |

#### Pages (22 files)
| File | Description |
|------|-------------|
| [Pages/HOME_QUICK_REFERENCE.md](./Pages/HOME_QUICK_REFERENCE.md) | Homepage |
| [Pages/SEARCH_QUICK_REFERENCE.md](./Pages/SEARCH_QUICK_REFERENCE.md) | Search page |
| [Pages/SEARCH_TEST_QUICK_REFERENCE.md](./Pages/SEARCH_TEST_QUICK_REFERENCE.md) | Search test page |
| [Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md](./Pages/VIEW_SPLIT_LEASE_QUICK_REFERENCE.md) | Listing detail page |
| [Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md](./Pages/GUEST_PROPOSALS_QUICK_REFERENCE.md) | Guest proposals page |
| [Pages/SELF_LISTING_QUICK_REFERENCE.md](./Pages/SELF_LISTING_QUICK_REFERENCE.md) | Self listing wizard |
| [Pages/LISTING_DASHBOARD_QUICK_REFERENCE.md](./Pages/LISTING_DASHBOARD_QUICK_REFERENCE.md) | Listing dashboard |
| [Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md](./Pages/LISTING_DASHBOARD_PAGE_CONTEXT.md) | Listing dashboard context |
| [Pages/HOST_OVERVIEW_QUICK_REFERENCE.md](./Pages/HOST_OVERVIEW_QUICK_REFERENCE.md) | Host overview |
| [Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md](./Pages/FAVORITE_LISTINGS_QUICK_REFERENCE.md) | Favorite listings |
| [Pages/RENTAL_APPLICATION_QUICK_REFERENCE.md](./Pages/RENTAL_APPLICATION_QUICK_REFERENCE.md) | Rental application |
| [Pages/ACCOUNT_PROFILE_QUICK_REFERENCE.md](./Pages/ACCOUNT_PROFILE_QUICK_REFERENCE.md) | Account profile |
| [Pages/FAQ_QUICK_REFERENCE.md](./Pages/FAQ_QUICK_REFERENCE.md) | FAQ page |
| [Pages/HELP_CENTER_QUICK_REFERENCE.md](./Pages/HELP_CENTER_QUICK_REFERENCE.md) | Help center |
| [Pages/POLICIES_QUICK_REFERENCE.md](./Pages/POLICIES_QUICK_REFERENCE.md) | Policies page |
| [Pages/ABOUT_US_QUICK_REFERENCE.md](./Pages/ABOUT_US_QUICK_REFERENCE.md) | About us page |
| [Pages/CAREERS_QUICK_REFERENCE.md](./Pages/CAREERS_QUICK_REFERENCE.md) | Careers page |
| [Pages/LIST_WITH_US_QUICK_REFERENCE.md](./Pages/LIST_WITH_US_QUICK_REFERENCE.md) | List with us page |
| [Pages/WHY_SPLIT_LEASE_QUICK_REFERENCE.md](./Pages/WHY_SPLIT_LEASE_QUICK_REFERENCE.md) | Why Split Lease page |
| [Pages/GUEST_SUCCESS_QUICK_REFERENCE.md](./Pages/GUEST_SUCCESS_QUICK_REFERENCE.md) | Guest success stories |
| [Pages/HOST_SUCCESS_QUICK_REFERENCE.md](./Pages/HOST_SUCCESS_QUICK_REFERENCE.md) | Host success stories |
| [Pages/404_QUICK_REFERENCE.md](./Pages/404_QUICK_REFERENCE.md) | 404 Not found page |
| [Pages/INDEX_DEV_QUICK_REFERENCE.md](./Pages/INDEX_DEV_QUICK_REFERENCE.md) | Development index page |

---

## Rules

### DO
- Use Edge Functions for all Bubble API calls (never expose API keys in frontend)
- Store secrets in Supabase Dashboard > Project Settings > Secrets
- Run `bun run generate-routes` after route changes
- Commit after each meaningful change
- Convert day indices at system boundaries
- Use the four-layer logic architecture

### DON'T
- Expose API keys in frontend code
- Call Bubble API directly from frontend
- `git push --force` or push to main without review
- Modify database tables without explicit instruction
- Add fallback mechanisms or compatibility layers when things fail
- Over-engineer for hypothetical future needs

---

## Environment Variables

### app/.env
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_GOOGLE_MAPS_API_KEY=<google-maps-api-key>
```

### Supabase Secrets (Dashboard)
```
BUBBLE_API_BASE_URL, BUBBLE_API_KEY, OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY,
SLACK_WEBHOOK_ACQUISITION, SLACK_WEBHOOK_GENERAL
```

---

## Key Files Quick Reference

| What you need | Where to find it |
|---------------|------------------|
| Add/modify routes | `app/src/routes.config.js` |
| Vite build config | `app/vite.config.js` |
| App constants | `app/src/lib/constants.js` |
| App configuration | `app/src/lib/config.js` |
| Authentication | `app/src/lib/auth.js` |
| Supabase client | `app/src/lib/supabase.js` |
| Supabase utilities | `app/src/lib/supabaseUtils.js` |
| Data lookups (neighborhoods, amenities) | `app/src/lib/dataLookups.js` |
| Navigation helpers | `app/src/lib/navigation.js` |
| Day index conversion | `app/src/logic/processors/external/adaptDays*.js` |
| Proposal business rules | `app/src/logic/rules/proposals/` |
| Pricing calculations | `app/src/logic/calculators/pricing/` |
| Proposal data fetching | `app/src/lib/proposalDataFetcher.js` |
| Proposal utilities | `app/src/lib/proposals/` |
| Edge Function shared code | `supabase/functions/_shared/` |
| Bubble sync service | `supabase/functions/_shared/bubbleSync.ts` |
| Slack service | `app/src/lib/slackService.js` |
| Hotjar analytics | `app/src/lib/hotjar.js` |

---

## Statistics

| Category | Count |
|----------|-------|
| HTML Entry Points | 31 |
| JSX Entry Points | 29 |
| Page Components | 25+ |
| Shared Components | 50+ |
| Modal Components | 13 |
| Logic Layer Files | 55+ |
| Library Utilities | 32 |
| Edge Functions | 11 |
| Shared Edge Utilities | 10 |
| CSS Files | 40+ |
| Documentation Files (in .claude/Documentation/) | 46 |

---

**VERSION**: 7.1 | **UPDATED**: 2025-12-11
