/**
 * EmptyState Component
 *
 * Displayed when user has no proposals
 * Shows message and CTA to explore rentals
 */

export default function EmptyState() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md px-4">
        <div className="w-24 h-24 mx-auto mb-6 bg-purple-100 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          No Proposals Yet
        </h2>

        <p className="text-gray-600 mb-8">
          You don't have any proposals submitted yet. Start exploring available rentals to find your perfect space!
        </p>

        <a
          href="/search"
          className="inline-block px-8 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Explore Rentals
        </a>
      </div>
    </div>
  );
}
