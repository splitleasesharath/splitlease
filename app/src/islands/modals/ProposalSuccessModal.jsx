/**
 * ProposalSuccessModal Component
 *
 * Displayed after successful proposal submission.
 * Provides CTAs to navigate to Rental Application or Guest Dashboard.
 */

export default function ProposalSuccessModal({
  proposalId,
  listingName,
  onClose
}) {
  // Handle navigation to rental application
  const handleGoToRentalApp = () => {
    window.location.href = `/rental-app-new-design?proposal=${proposalId}`;
  };

  // Handle navigation to guest dashboard
  const handleGoToGuestDashboard = () => {
    window.location.href = `/guest-proposals?proposal=${proposalId}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        {/* Modal */}
        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="bg-white px-6 pt-8 pb-6">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg
                className="h-10 w-10 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Proposal Submitted!
            </h3>

            {/* Listing name */}
            {listingName && (
              <p className="text-sm text-gray-600 text-center mb-4">
                Your proposal for <span className="font-medium text-purple-700">{listingName}</span> has been sent to the host.
              </p>
            )}

            {/* Next steps info */}
            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-purple-900 mb-2">
                What's Next?
              </h4>
              <p className="text-sm text-purple-800">
                Complete your rental application to increase your chances of approval.
                The host will review your proposal and application together.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              {/* Primary CTA - Rental Application */}
              <button
                onClick={handleGoToRentalApp}
                className="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-transparent shadow-sm px-4 py-3 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Submit Rental Application
                <span className="text-purple-200 text-sm">(Recommended)</span>
              </button>

              {/* Secondary CTA - Guest Dashboard */}
              <button
                onClick={handleGoToGuestDashboard}
                className="w-full inline-flex justify-center items-center gap-2 rounded-lg border border-gray-300 shadow-sm px-4 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Go to Guest Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
