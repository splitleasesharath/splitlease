import { useState, useEffect } from 'react';
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import { EditListingDetails } from '../../shared/EditListingDetails/EditListingDetails';
import ScheduleCohost from '../../shared/ScheduleCohost/ScheduleCohost.jsx';
import ImportListingReviewsModal from '../../shared/ImportListingReviewsModal/ImportListingReviewsModal.jsx';
import AIImportAssistantModal from '../../shared/AIImportAssistantModal/AIImportAssistantModal.jsx';
import ReferralModal from '../AccountProfilePage/components/ReferralModal';
import { ListingDashboardProvider, useListingDashboard } from './context/ListingDashboardContext';
import NavigationHeader from './components/NavigationHeader.jsx';
import ActionCardGrid from './components/ActionCardGrid.jsx';
import AlertBanner from './components/AlertBanner.jsx';
import SecondaryActions from './components/SecondaryActions.jsx';
import PropertyInfoSection from './components/PropertyInfoSection.jsx';
import DetailsSection from './components/DetailsSection.jsx';
import AmenitiesSection from './components/AmenitiesSection.jsx';
import DescriptionSection from './components/DescriptionSection.jsx';
import PricingSection from './components/PricingSection.jsx';
import PricingEditSection from './components/PricingEditSection.jsx';
import RulesSection from './components/RulesSection.jsx';
import AvailabilitySection from './components/AvailabilitySection.jsx';
import PhotosSection from './components/PhotosSection.jsx';
import CancellationPolicySection from './components/CancellationPolicySection.jsx';
import '../../../styles/components/listing-dashboard.css';
import '../AccountProfilePage/AccountProfilePage.css'; // For ReferralModal styles

// Inner component that uses context
function ListingDashboardContent() {
  const [showReferralModal, setShowReferralModal] = useState(false);
  const {
    activeTab,
    listing,
    counts,
    isLoading,
    error,
    editSection,
    showScheduleCohost,
    showImportReviews,
    currentUser,
    existingCohostRequest,
    handleTabChange,
    handleCardClick,
    handleBackClick,
    handleScheduleCohost,
    handleCloseScheduleCohost,
    handleCohostRequestSubmitted,
    handleImportReviews,
    handleCloseImportReviews,
    handleSubmitImportReviews,
    isImportingReviews,
    showAIImportAssistant,
    handleCloseAIImportAssistant,
    handleAIImportComplete,
    handleStartAIGeneration,
    aiGenerationStatus,
    isAIGenerating,
    isAIComplete,
    aiGeneratedData,
    highlightedFields,
    handleEditSection,
    handleCloseEdit,
    handleSaveEdit,
    updateListing,
    editFocusField,
    handleAIAssistant,
  } = useListingDashboard();

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <div className="listing-dashboard">
          <div className="listing-dashboard__container">
            <div className="listing-dashboard__loading">
              <p>Loading listing...</p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Header />
        <div className="listing-dashboard">
          <div className="listing-dashboard__container">
            <div className="listing-dashboard__error">
              <p>Error: {error}</p>
              <button onClick={() => (window.location.href = '/host-overview')}>
                Go to My Listings
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // No listing found
  if (!listing) {
    return (
      <>
        <Header />
        <div className="listing-dashboard">
          <div className="listing-dashboard__container">
            <div className="listing-dashboard__not-found">
              <p>Listing not found</p>
              <button onClick={() => (window.location.href = '/host-dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="listing-dashboard">
        {/* Main Container */}
        <div className="listing-dashboard__container">
          <div className="listing-dashboard__card">
            {/* Navigation Header */}
            <NavigationHeader
              onInviteClick={() => setShowReferralModal(true)}
            />

            {/* Alert Banner - Schedule Cohost CTA */}
            <AlertBanner />

            {/* Action Cards Grid */}
            <ActionCardGrid />

            {/* Secondary Actions */}
            <SecondaryActions />

            {/* Property Info Section */}
            <div className={highlightedFields?.has('name') ? 'listing-dashboard-section--ai-highlighted' : ''}>
              <PropertyInfoSection />
            </div>

            {/* Description Section */}
            <div className={
              (highlightedFields?.has('description') || highlightedFields?.has('neighborhood'))
                ? 'listing-dashboard-section--ai-highlighted'
                : ''
            }>
              <DescriptionSection />
            </div>

            {/* Amenities Section */}
            <div className={highlightedFields?.has('amenities') ? 'listing-dashboard-section--ai-highlighted' : ''}>
              <AmenitiesSection />
            </div>

            {/* Details Section */}
            <DetailsSection />

            {/* Pricing & Lease Style Section */}
            <PricingSection />

            {/* Rules Section */}
            <div className={
              (highlightedFields?.has('rules') || highlightedFields?.has('safety'))
                ? 'listing-dashboard-section--ai-highlighted'
                : ''
            }>
              <RulesSection />
            </div>

            {/* Availability Section */}
            <AvailabilitySection />

            {/* Photos Section */}
            <PhotosSection />

            {/* Cancellation Policy Section */}
            <CancellationPolicySection />
          </div>
        </div>
      </div>
      <Footer />

      {/* Pricing Edit Section (Full-screen overlay) */}
      {editSection === 'pricing' && (
        <PricingEditSection
          listing={listing}
          onClose={handleCloseEdit}
          onSave={async (updates) => {
            await updateListing(listing.id, updates);
            handleSaveEdit(updates);
          }}
          isOwner={true}
        />
      )}

      {/* Edit Listing Details Modal */}
      {editSection && editSection !== 'pricing' && (
        <EditListingDetails
          focusField={editFocusField}
          listing={{
            _id: listing.id,
            Name: listing.title,
            Description: listing.description,
            'Description - Neighborhood': listing.descriptionNeighborhood,
            'Location - Address': { address: listing.location?.address },
            'Location - City': listing.location?.city,
            'Location - State': listing.location?.state,
            'Location - Zip Code': listing.location?.zipCode,
            'Location - Borough': listing.location?.boroughDisplay,
            'Location - Hood': listing.location?.hoodsDisplay,
            'Features - Type of Space': listing.features?.typeOfSpace?.id,
            'Features - Qty Bedrooms': listing.features?.bedrooms,
            'Features - Qty Bathrooms': listing.features?.bathrooms,
            'Features - Qty Beds': listing.features?.bedrooms,
            'Features - Qty Guests': listing.maxGuests,
            'Features - SQFT Area': listing.features?.squareFootage,
            'Features - SQFT of Room': listing.features?.squareFootageRoom,
            'Kitchen Type': listing.features?.kitchenType?.id,
            'Features - Parking type': listing.features?.parkingType?.label,
            'Features - Secure Storage Option': listing.features?.storageType?.label,
            'Features - House Rules': listing.houseRules?.map(r => r.name) || [],
            'Features - Photos': listing.photos?.map(p => p.url) || [],
            'Features - Amenities In-Unit': listing.inUnitAmenities?.map(a => a.name) || [],
            'Features - Amenities In-Building': listing.buildingAmenities?.map(a => a.name) || [],
            'Features - Safety': listing.safetyFeatures?.map(s => s.name) || [],
            'First Available': listing.earliestAvailableDate,
            'Minimum Nights': listing.nightsPerWeekMin,
            'Maximum Nights': listing.nightsPerWeekMax,
            'Cancellation Policy': listing.cancellationPolicy,
          }}
          editSection={editSection}
          onClose={handleCloseEdit}
          onSave={handleSaveEdit}
          updateListing={(id, updates) => updateListing(updates)}
        />
      )}

      {/* Schedule Cohost Modal */}
      {showScheduleCohost && (
        <ScheduleCohost
          userId={currentUser?.userId || currentUser?._id || currentUser?.id || ''}
          userEmail={currentUser?.email || ''}
          userName={currentUser?.firstName || currentUser?.name || ''}
          listingId={listing?.id}
          existingRequest={existingCohostRequest}
          onRequestSubmitted={handleCohostRequestSubmitted}
          onClose={handleCloseScheduleCohost}
        />
      )}

      {/* Import Listing Reviews Modal */}
      <ImportListingReviewsModal
        isOpen={showImportReviews}
        onClose={handleCloseImportReviews}
        onSubmit={handleSubmitImportReviews}
        currentUserEmail={currentUser?.email || ''}
        listingId={listing?.id}
        isLoading={isImportingReviews}
      />

      {/* AI Import Assistant Modal */}
      <AIImportAssistantModal
        isOpen={showAIImportAssistant}
        onClose={handleCloseAIImportAssistant}
        onComplete={handleAIImportComplete}
        generationStatus={aiGenerationStatus}
        isGenerating={isAIGenerating}
        isComplete={isAIComplete}
        generatedData={aiGeneratedData}
        onStartGeneration={handleStartAIGeneration}
      />

      {/* Referral Modal */}
      <ReferralModal
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        referralCode={currentUser?.userId || currentUser?._id || currentUser?.id || 'user'}
        userType="host"
        referrerName={currentUser?.['Name - First'] || currentUser?.firstName || currentUser?.name || ''}
      />
    </>
  );
}

// Main component with Provider
export default function ListingDashboardPage() {
  // Add body class for page-specific header styling
  useEffect(() => {
    document.body.classList.add('listing-dashboard-page');
    return () => {
      document.body.classList.remove('listing-dashboard-page');
    };
  }, []);

  return (
    <ListingDashboardProvider>
      <ListingDashboardContent />
    </ListingDashboardProvider>
  );
}
