# ListingDashboardPage - LLM Reference

**GENERATED**: 2025-12-11
**SCOPE**: Host listing management dashboard with edit capabilities
**PATTERN**: Hollow Component Pattern (UI + Logic Hook)

---

## QUICK_STATS

[TOTAL_FILES]: 22
[PRIMARY_LANGUAGE]: JavaScript/JSX
[KEY_PATTERNS]: Hollow Component, Modal Editing, Real-time Calendar, Drag-and-Drop Photos
[FEATURES]: Listing management, AI import, photo management, pricing editor, availability calendar

---

## FILES

### ListingDashboardPage.jsx
[INTENT]: Main container orchestrating all dashboard sections and modals
[EXPORTS]: default ListingDashboardPage
[DEPENDS_ON]: useListingDashboardPageLogic, Header, Footer, EditListingDetails, ScheduleCohost, ImportListingReviewsModal, AIImportAssistantModal
[USED_BY]: listing-dashboard.jsx entry point
[PATTERN]: Hollow component - all logic delegated to hook
[SECTIONS]: NavigationHeader, AlertBanner, ActionCardGrid, SecondaryActions, PropertyInfoSection, DescriptionSection, AmenitiesSection, DetailsSection, PricingSection, RulesSection, AvailabilitySection, PhotosSection, CancellationPolicySection
[MODALS]: EditListingDetails (all sections), PricingEditSection (pricing only), ScheduleCohost, ImportListingReviewsModal, AIImportAssistantModal

### useListingDashboardPageLogic.js
[INTENT]: Business logic hook managing listing data, editing, AI generation, and photo operations
[EXPORTS]: default useListingDashboardPageLogic
[DEPENDS_ON]: supabase, auth, aiService, amenitiesService, safetyFeaturesService, houseRulesService, neighborhoodService
[USED_BY]: ListingDashboardPage.jsx
[KEY_FEATURES]: Dual-table support (listing_trial and listing), lookup table resolution, day conversion (Bubble 1-7 to JS 0-6), AI content generation, photo reordering, blocked dates management
[DATA_FLOW]: Fetches listing from listing_trial (by id) or listing (by _id), transforms to component format, resolves IDs to names via lookup tables
[AI_WORKFLOW]: Load amenities/neighborhood/rules/safety first, then generate AI title/description with enriched context
[PHOTO_OPS]: Set cover, delete, reorder with DB persistence

### index.js
[INTENT]: Barrel export for ListingDashboardPage module
[EXPORTS]: default (ListingDashboardPage), useListingDashboardPageLogic

### types/listing.types.ts
[INTENT]: TypeScript interfaces for listing data structures
[EXPORTS]: Listing, Location, Features, Photo, Video, Amenity, SafetyFeature, BlockedDate, HouseManual, HostRestrictions, ListingCounts, TabType
[USED_BY]: TypeScript-enabled components

### data/mockListing.js
[INTENT]: Mock data for development and testing
[EXPORTS]: mockListing, mockCounts
[USED_BY]: Development environment (not in production)
[DATA]: Full listing object with East Harlem property, photos, amenities, pricing

---

## COMPONENTS

### components/index.js
[INTENT]: Barrel export for all dashboard section components
[EXPORTS]: NavigationHeader, ActionCard, ActionCardGrid, AlertBanner, PropertyInfoSection, DetailsSection, SecondaryActions, AmenitiesSection, DescriptionSection, PricingSection, RulesSection, AvailabilitySection, PhotosSection, CancellationPolicySection, NightlyPricingLegend, PricingEditSection

### components/NavigationHeader.jsx
[INTENT]: Tab navigation with conditional visibility based on counts
[EXPORTS]: default NavigationHeader
[PROPS]: activeTab, onTabChange, counts, onBackClick
[FEATURES]: Dynamic tab visibility (proposals/meetings/leases only show if count > 0), badge counts, back button to host overview
[TABS]: All My Listings (always), Proposals (if > 0), Virtual Meetings (if > 0), Leases (if > 0)

### components/ActionCard.jsx
[INTENT]: Reusable card button for quick actions
[EXPORTS]: default ActionCard
[PROPS]: icon, label, onClick, badge
[PATTERN]: Generic presentational component

### components/ActionCardGrid.jsx
[INTENT]: Responsive grid of action cards with conditional visibility
[EXPORTS]: default ActionCardGrid
[PROPS]: counts, onCardClick
[FEATURES]: Dynamic card visibility based on counts, responsive 1/2/3 column layout
[CARDS]: Preview (always), Copy Link (always), Proposals (if > 0), Virtual Meetings (if > 0), Manage (always), Leases (if > 0)

### components/AlertBanner.jsx
[INTENT]: Clickable banner promoting co-host scheduling
[EXPORTS]: default AlertBanner
[PROPS]: onScheduleCohost
[PATTERN]: Call-to-action banner with icon and chevron

### components/PropertyInfoSection.jsx
[INTENT]: Listing name, address, status, and review actions
[EXPORTS]: default PropertyInfoSection
[PROPS]: listing, onImportReviews, onEdit
[FEATURES]: Edit listing name, import reviews button, show reviews button, online/offline status indicator, active since date

### components/DescriptionSection.jsx
[INTENT]: Display and edit lodging and neighborhood descriptions
[EXPORTS]: default DescriptionSection
[PROPS]: listing, onEditLodging, onEditNeighborhood
[FEATURES]: Two separate edit buttons for lodging vs neighborhood descriptions

### components/AmenitiesSection.jsx
[INTENT]: Display in-unit and building amenities with icons
[EXPORTS]: default AmenitiesSection
[PROPS]: listing, onEdit
[FEATURES]: Icon mapping for common amenities, default fallback icon, two groups (in-unit, building)
[ICONS]: AC, Closet, Hangers, Towels, TV, WiFi, Doorman, Laundry, Package Room, Elevator, Outdoor Space, Bike Storage

### components/DetailsSection.jsx
[INTENT]: Display property details and safety features
[EXPORTS]: default DetailsSection
[PROPS]: listing, onEdit
[FEATURES]: Type of space, bed/bath/sqft counts, storage/parking/kitchen types, safety features grid with icons
[SAFETY_ICONS]: Smoke Detector, CO Detector, First Aid, Fire Sprinklers, Lock, Fire Extinguisher

### components/PricingSection.jsx
[INTENT]: Display pricing, lease style, and weekly compensation
[EXPORTS]: default PricingSection
[PROPS]: listing, onEdit
[FEATURES]: Rental type display (Nightly/Weekly/Monthly), HostScheduleSelector in preview mode, NightlyPricingLegend, damage deposit, maintenance fee
[CONDITIONAL]: Shows monthly rate for monthly, nightly legend for nightly, weekly comp table for other types

### components/NightlyPricingLegend.jsx
[INTENT]: Visual gradient legend for nightly pricing (read-only)
[EXPORTS]: default NightlyPricingLegend
[PROPS]: weeklyCompensation, nightsPerWeekMin, nightsPerWeekMax
[FEATURES]: Gradient swatches (darker = fewer nights), weekly total and per-night rate display
[PATTERN]: Matches SelfListingPageV2 pricing display but without slider controls

### components/PricingEditSection.jsx
[INTENT]: Full-screen modal for editing pricing and lease style
[EXPORTS]: default PricingEditSection
[PROPS]: listing, onClose, onSave, isOwner
[FEATURES]: Rental type cards (Nightly/Weekly/Monthly), damage deposit/maintenance fee, HostScheduleSelector with editing, weekly compensation inputs, informational tooltips
[VALIDATION]: Min $500 damage deposit, 2+ nights for nightly, weekly pattern + rate for weekly, monthly agreement + $1000-$10000 for monthly
[DATA_CONVERSION]: Converts night IDs to Bubble day format (1-7), calculates per-night rates from weekly compensation

### components/RulesSection.jsx
[INTENT]: Display house rules and guest restrictions
[EXPORTS]: default RulesSection
[PROPS]: listing, onEdit
[FEATURES]: House rules grid with icons, preferred gender, max guests
[RULE_ICONS]: Take Out Trash, No Food In Sink, Lock Doors, Wash Dishes, No Smoking, No Candles

### components/AvailabilitySection.jsx
[INTENT]: Availability settings and interactive blocked dates calendar
[EXPORTS]: default AvailabilitySection
[PROPS]: listing, onEdit, onBlockedDatesChange
[FEATURES]: Lease term range (6-52 weeks), earliest available date, check-in/out times, interactive calendar with range/individual selection modes, blocked dates list with remove
[CALENDAR]: Month navigation, day grid (6 rows x 7 days), selectable future dates, drag mode toggle (range vs individual), blocked dates display with "show more" expansion
[PERSISTENCE]: Saves blocked dates to DB via onBlockedDatesChange callback

### components/PhotosSection.jsx
[INTENT]: Photo gallery with drag-and-drop reordering
[EXPORTS]: default PhotosSection
[PROPS]: listing, onAddPhotos, onDeletePhoto, onSetCover, onReorderPhotos
[FEATURES]: Drag-and-drop reordering, set cover photo (star button), delete photo, photo type selector dropdown, cover badge, empty state
[PHOTO_TYPES]: Dining Room, Bathroom, Bedroom, Kitchen, Living Room, Workspace, Other
[DRAG_STATES]: dragging, drag-over visual feedback

### components/CancellationPolicySection.jsx
[INTENT]: Cancellation policy selector with link to policy page
[EXPORTS]: default CancellationPolicySection
[PROPS]: listing, onPolicyChange
[FEATURES]: Dropdown (Standard, Additional Host Restrictions), link to /policies/cancellation-and-refund-policy

### components/SecondaryActions.jsx
[INTENT]: AI Import Assistant button and section navigation dropdown
[EXPORTS]: default SecondaryActions
[PROPS]: onAIAssistant
[FEATURES]: AI Import Assistant modal trigger, "Choose a Section" dropdown with smooth scroll to section ID
[SECTIONS]: Property Info, Description, Amenities, Details, Pricing & Lease Style, Rules, Availability, Photos, Cancellation Policy

---

## DATA_TRANSFORMATIONS

### transformListingData()
[INTENT]: Convert Supabase listing to component-friendly format
[INPUT]: dbListing (raw from listing_trial or listing), photos array, lookups object, isListingTrial flag
[OUTPUT]: Transformed listing object with resolved IDs and computed fields
[KEY_TRANSFORMS]: JSON array parsing (amenities, rules, safety, days), day conversion (Bubble 1-7 to JS 0-6), photo object mapping, location address parsing, pricing object construction
[ID_HANDLING]: listing_trial uses 'id' (UUID), listing uses '_id' (Bubble ID)
[COMPATIBILITY]: Returns both transformed properties and raw DB fields for EditListingDetails modal

### fetchLookupTables()
[INTENT]: Fetch all reference tables to resolve IDs to names/icons
[OUTPUT]: Object with amenities, safetyFeatures, houseRules, listingTypes, parkingOptions, storageOptions
[TABLES]: zat_features_amenity, zfut_safetyfeatures, zat_features_houserule, zat_features_listingtype, zat_features_parkingoptions, zat_features_storageoptions
[USAGE]: Passed to transformListingData to resolve ID arrays to name/icon objects

### safeParseJsonArray()
[INTENT]: Safely parse JSON string or return array as-is
[INPUT]: value (string, array, or null)
[OUTPUT]: Array (empty if parse fails)
[USE_CASE]: Handle mixed JSON string and array formats in DB columns

---

## KEY_FEATURES

### Dual Table Support
[DESCRIPTION]: Supports both listing_trial (new submissions, uses 'id') and listing (Bubble-synced, uses '_id')
[FLOW]: Try listing_trial first by 'id', fallback to listing by '_id'
[PHOTOS]: listing_trial stores inline in 'Features - Photos' JSON column, listing uses listing_photo table

### Day Indexing Conversion
[CRITICAL]: JS uses 0-6 (Sun-Sat), Bubble uses 1-7 (Sun-Sat)
[CONVERSION]: adaptDaysFromBubble (Bubble to JS), adaptDaysToBubble (JS to Bubble)
[NIGHT_IDS]: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
[STORAGE]: Bubble format in DB, JS format in component state

### AI Import Assistant Workflow
[PHASE_1]: Load common data (in-unit amenities, building amenities, neighborhood description, house rules, safety features)
[PHASE_2]: Generate AI content (title, description) with enriched listing context
[BENEFIT]: AI generates better content with full amenity/feature data already loaded
[SERVICES]: getCommonInUnitAmenities, getCommonBuildingAmenities, getNeighborhoodByZipCode, getCommonHouseRules, getCommonSafetyFeatures, generateListingTitle, generateListingDescription

### Photo Management
[SET_COVER]: Moves selected photo to index 0, updates isCover flag, persists to DB
[DELETE]: Soft-delete (Active=false) in listing_photo table or remove from JSON in listing_trial
[REORDER]: Updates SortOrder in listing_photo or reorders JSON array in listing_trial
[PERSISTENCE]: Separate logic for listing_trial (inline JSON) vs listing (table)

### Edit Modal System
[EDIT_SECTION]: State tracks which section is being edited (null = closed)
[PRICING]: Uses PricingEditSection full-screen overlay
[OTHER_SECTIONS]: Uses EditListingDetails modal (name, description, neighborhood, amenities, details, rules, availability, photos)
[SAVE_FLOW]: Modal saves to DB, calls handleSaveEdit to update local state, silently refreshes on close

---

## URL_PARAMETERS

[LISTING_ID]: ?id={listing_id} or ?listing_id={listing_id}
[USAGE]: Fetches listing by id (listing_trial) or _id (listing)

---

## STYLING

[CSS_FILE]: styles/components/listing-dashboard.css
[PREFIX]: .listing-dashboard-*
[APPROACH]: BEM naming convention
[RESPONSIVE]: Mobile-first with breakpoints
[VARIABLES]: CSS custom properties for colors, spacing

---

## TODO

[PRODUCTION]: Replace mock data with live Supabase queries (already implemented)
[NAVIGATION]: Implement tab-specific navigation for proposals/meetings/leases
[FORM_SAVE]: Add debounced save for inline edits (currently edit-in-modal only)
[PHOTO_TYPE]: Implement photo type change handler (currently logs to console)

---

## MODALS_USED

### EditListingDetails
[FROM]: shared/EditListingDetails
[TRIGGER]: handleEditSection (except 'pricing')
[PROPS]: listing (raw DB fields), editSection, onClose, onSave, updateListing
[SECTIONS]: name, description, neighborhood, amenities, details, rules, availability, photos

### PricingEditSection
[FROM]: local component
[TRIGGER]: handleEditSection('pricing')
[PROPS]: listing, onClose, onSave, isOwner
[PATTERN]: Full-screen overlay (not modal)

### ScheduleCohost
[FROM]: shared/ScheduleCohost
[TRIGGER]: handleScheduleCohost (from AlertBanner or elsewhere)
[PROPS]: userId, userEmail, userName, listingId, onRequestSubmitted, onClose

### ImportListingReviewsModal
[FROM]: shared/ImportListingReviewsModal
[TRIGGER]: handleImportReviews (from PropertyInfoSection)
[PROPS]: isOpen, onClose, onSubmit, currentUserEmail, listingId, isLoading

### AIImportAssistantModal
[FROM]: shared/AIImportAssistantModal
[TRIGGER]: handleAIAssistant (from SecondaryActions)
[PROPS]: isOpen, onClose, onComplete, generationStatus, isGenerating, isComplete, generatedData, onStartGeneration

---

## DATABASE_TABLES

### listing_trial
[PRIMARY_KEY]: id (UUID)
[PHOTOS]: Inline in 'Features - Photos' JSON column
[USE_CASE]: New self-listing submissions

### listing
[PRIMARY_KEY]: _id (Bubble ID string)
[PHOTOS]: Separate listing_photo table
[USE_CASE]: Bubble-synced listings

### listing_photo
[FOREIGN_KEY]: Listing (_id)
[FIELDS]: Photo (URL), toggleMainPhoto (boolean), SortOrder (int), Active (boolean), Type (string)
[USE_CASE]: Photos for Bubble-synced listings

### proposal
[FOREIGN_KEY]: Listing (_id)
[COUNT_USE]: Proposals badge in navigation

### bookings_leases
[FOREIGN_KEY]: Listing (_id)
[COUNT_USE]: Leases badge in navigation

### virtualmeetingschedulesandlinks
[FOREIGN_KEY]: Listing (_id)
[COUNT_USE]: Virtual meetings badge in navigation

---

**DOCUMENT_VERSION**: 2.0
**STATUS**: Production (fully functional with dual-table support and AI import)
