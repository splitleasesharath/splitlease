import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import useListingDashboardPageLogic from './useListingDashboardPageLogic';
import {
  NavigationHeader,
  ActionCardGrid,
  AlertBanner,
  SecondaryActions,
  PropertyInfoSection,
  DetailsSection,
  AmenitiesSection,
  DescriptionSection,
  PricingSection,
  RulesSection,
  AvailabilitySection,
  PhotosSection,
  CancellationPolicySection,
} from './components';
import '../../../styles/components/listing-dashboard.css';

export default function ListingDashboardPage() {
  const {
    activeTab,
    listing,
    counts,
    isLoading,
    error,
    handleTabChange,
    handleCardClick,
    handleBackClick,
    handleDescriptionChange,
    handleCancellationPolicyChange,
    handleCopyLink,
    handleAIAssistant,
  } = useListingDashboardPageLogic();

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
              <button onClick={() => window.location.reload()}>Retry</button>
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
              activeTab={activeTab}
              onTabChange={handleTabChange}
              counts={counts}
              onBackClick={handleBackClick}
            />

            {/* Alert Banner */}
            <AlertBanner />

            {/* Action Cards Grid */}
            <ActionCardGrid counts={counts} onCardClick={handleCardClick} />

            {/* Secondary Actions */}
            <SecondaryActions
              listingId={listing.id}
              onCopyLink={handleCopyLink}
              onAIAssistant={handleAIAssistant}
            />

            {/* Property Info Section */}
            <PropertyInfoSection
              listing={listing}
              onDescriptionChange={handleDescriptionChange}
            />

            {/* Description Section */}
            <DescriptionSection
              listing={listing}
              onEditLodging={() => console.log('Edit lodging description')}
              onEditNeighborhood={() => console.log('Edit neighborhood description')}
            />

            {/* Amenities Section */}
            <AmenitiesSection
              listing={listing}
              onEdit={() => console.log('Edit amenities')}
            />

            {/* Details Section */}
            <DetailsSection
              listing={listing}
              onEdit={() => console.log('Edit details')}
            />

            {/* Pricing & Lease Style Section */}
            <PricingSection
              listing={listing}
              onEdit={() => console.log('Edit pricing')}
            />

            {/* Rules Section */}
            <RulesSection
              listing={listing}
              onEdit={() => console.log('Edit rules')}
            />

            {/* Availability Section */}
            <AvailabilitySection
              listing={listing}
              onEdit={() => console.log('Edit availability')}
            />

            {/* Photos Section */}
            <PhotosSection
              listing={listing}
              onAddPhotos={() => console.log('Add photos')}
              onDeletePhoto={(id) => console.log('Delete photo', id)}
              onSetCover={(id) => console.log('Set cover photo', id)}
            />

            {/* Cancellation Policy Section */}
            <CancellationPolicySection
              listing={listing}
              onPolicyChange={handleCancellationPolicyChange}
            />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
