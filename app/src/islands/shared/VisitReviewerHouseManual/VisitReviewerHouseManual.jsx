/**
 * VisitReviewerHouseManual Component
 *
 * Guest-facing house manual viewer with collapsible sections and review form.
 * Follows the Hollow Component Pattern - delegates all logic to useVisitReviewerHouseManualLogic.
 *
 * Features:
 * - Collapsible manual sections (WiFi, Check-in, Rules, etc.)
 * - Guest review form with star ratings
 * - Engagement tracking (link viewed, map viewed, narration heard)
 * - Access control (authenticated guests only)
 *
 * @param {object} props
 * @param {string} props.visitId - Visit ID to display manual for
 * @param {string} [props.accessToken] - Optional magic link access token
 * @param {function} [props.onAccessDenied] - Callback when access is denied
 * @param {function} [props.onReviewSubmitted] - Callback after successful review
 *
 * @module islands/shared/VisitReviewerHouseManual/VisitReviewerHouseManual
 */

import useVisitReviewerHouseManualLogic from './useVisitReviewerHouseManualLogic.js';
import HeaderSection from './components/HeaderSection.jsx';
import ContentSection from './components/ContentSection.jsx';
import GuestReviewForm from './components/GuestReviewForm.jsx';
import LoadingState from './components/AccessStates/LoadingState.jsx';
import AccessDenied from './components/AccessStates/AccessDenied.jsx';
import './VisitReviewerHouseManual.css';

const VisitReviewerHouseManual = ({
  visitId,
  accessToken = null,
  onAccessDenied = null,
  onReviewSubmitted = null,
}) => {
  const logic = useVisitReviewerHouseManualLogic({
    visitId,
    accessToken,
    onAccessDenied,
    onReviewSubmitted,
  });

  // Loading state
  if (logic.isLoading) {
    return (
      <div className="vrhm-container">
        <LoadingState />
      </div>
    );
  }

  // Access denied state
  if (logic.hasAccessDenied) {
    return (
      <div className="vrhm-container">
        <AccessDenied
          reason={logic.accessDeniedReason}
          isAuthenticated={logic.isAuthenticated}
        />
      </div>
    );
  }

  // Error state
  if (logic.error) {
    return (
      <div className="vrhm-container">
        <div className="vrhm-error">
          <div className="vrhm-error__icon">!</div>
          <h2 className="vrhm-error__title">Unable to Load House Manual</h2>
          <p className="vrhm-error__message">{logic.error}</p>
          <button
            type="button"
            className="vrhm-button-primary"
            onClick={logic.loadManualData}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!logic.houseManual) {
    return (
      <div className="vrhm-container">
        <div className="vrhm-empty">
          <p>No house manual found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vrhm-container">
      {/* Header */}
      <HeaderSection
        title={logic.houseManual.title}
        hostName={logic.houseManual.hostName}
        propertyAddress={logic.houseManual.propertyAddress}
        arrivalDate={logic.visit?.arrivalDate}
        sectionCount={logic.sectionCount}
        onExpandAll={logic.expandAllSections}
        onCollapseAll={logic.collapseAllSections}
      />

      {/* Messages */}
      {logic.reviewSuccess && (
        <div className="vrhm-message vrhm-message--success">
          Thank you for your review! Your feedback helps future guests.
        </div>
      )}

      {/* Main Content */}
      <div className="vrhm-content">
        {/* Sections by Category */}
        {Object.entries(logic.groupedSections).map(([category, sections]) => {
          if (sections.length === 0) return null;

          return (
            <div key={category} className="vrhm-category">
              <h3 className="vrhm-category__title">
                {getCategoryTitle(category)}
              </h3>
              <div className="vrhm-category__sections">
                {sections.map((section) => (
                  <ContentSection
                    key={section.id}
                    section={section}
                    isExpanded={logic.isSectionExpanded(section.id)}
                    onToggle={() => logic.toggleSection(section.id)}
                    onMapView={logic.trackMapSaw}
                    onNarrationPlay={logic.trackNarrationHeard}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Review Section */}
        <div className="vrhm-review-section">
          {logic.reviewSubmitted ? (
            <div className="vrhm-review-submitted">
              <div className="vrhm-review-submitted__icon">&#10003;</div>
              <h3 className="vrhm-review-submitted__title">
                Thank You for Your Review
              </h3>
              <p className="vrhm-review-submitted__text">
                Your feedback helps other guests make informed decisions.
              </p>
            </div>
          ) : logic.canUserSubmitReview ? (
            logic.showReviewForm ? (
              <GuestReviewForm
                formData={logic.reviewFormData}
                onReviewTextChange={logic.handleReviewTextChange}
                onRatingChange={logic.handleRatingChange}
                onSubmit={logic.handleSubmitReview}
                onCancel={logic.handleHideReviewForm}
                canSubmit={logic.canSubmitReviewForm}
                isSubmitting={logic.isSubmittingReview}
                error={logic.reviewError}
              />
            ) : (
              <div className="vrhm-review-cta">
                <h3 className="vrhm-review-cta__title">
                  How was your stay?
                </h3>
                <p className="vrhm-review-cta__text">
                  Share your experience to help future guests.
                </p>
                <button
                  type="button"
                  className="vrhm-button-primary"
                  onClick={logic.handleShowReviewForm}
                >
                  Write a Review
                </button>
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Footer */}
      <div className="vrhm-footer">
        <p className="vrhm-footer__text">
          Powered by <strong>Split Lease</strong>
        </p>
      </div>
    </div>
  );
};

/**
 * Get display title for a category.
 * @param {string} category - Category key
 * @returns {string} Display title
 */
function getCategoryTitle(category) {
  const titles = {
    essentials: 'Essentials',
    living: 'Living in the Space',
    local: 'Local Area',
    other: 'Additional Information',
  };
  return titles[category] || category;
}

export default VisitReviewerHouseManual;
