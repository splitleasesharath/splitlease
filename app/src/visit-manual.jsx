/**
 * Visit Manual Entry Point
 *
 * Mounts the VisitReviewerHouseManual component for guest access to house manuals.
 * Extracts visitId and token from URL parameters.
 *
 * URL Pattern: /visit-manual?visitId=xxx&token=yyy
 *
 * @module visit-manual
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import VisitReviewerHouseManual from './islands/shared/VisitReviewerHouseManual/VisitReviewerHouseManual.jsx';
import { ErrorBoundary } from './islands/shared/ErrorBoundary';

/**
 * Extract URL parameters for the house manual viewer.
 * @returns {{ visitId: string|null, token: string|null }}
 */
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    visitId: params.get('visitId'),
    token: params.get('token'),
  };
}

/**
 * Handle access denied callback.
 * Could redirect to login or show error message.
 * @param {string} reason - The reason access was denied
 */
function handleAccessDenied(reason) {
  console.warn('Access denied to house manual:', reason);
}

/**
 * Handle successful review submission.
 * @param {object} reviewData - The submitted review data
 */
function handleReviewSubmitted(reviewData) {
  console.log('Review submitted successfully:', reviewData);
}

/**
 * VisitManualPage Component
 *
 * Wrapper component that extracts URL params and renders the house manual viewer.
 * Handles the case where visitId is missing by showing an error message.
 */
function VisitManualPage() {
  const { visitId, token } = getUrlParams();

  // Missing visitId - show error
  if (!visitId) {
    return (
      <div className="vrhm-container">
        <div className="vrhm-error">
          <div className="vrhm-error__icon">!</div>
          <h2 className="vrhm-error__title">Invalid Link</h2>
          <p className="vrhm-error__message">
            This house manual link is invalid or incomplete. Please check the link
            you received and try again.
          </p>
          <a href="/" className="vrhm-button-primary">
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <VisitReviewerHouseManual
      visitId={visitId}
      accessToken={token}
      onAccessDenied={handleAccessDenied}
      onReviewSubmitted={handleReviewSubmitted}
    />
  );
}

// Mount the React application
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <VisitManualPage />
    </ErrorBoundary>
  </React.StrictMode>
);
