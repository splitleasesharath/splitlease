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

            {/* Details Section */}
            <DetailsSection
              listing={listing}
              onCancellationPolicyChange={handleCancellationPolicyChange}
            />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
