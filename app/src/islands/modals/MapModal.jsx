/**
 * MapModal Component - UI ONLY VERSION (No Google Maps Integration)
 *
 * Shows listing location with a placeholder for map
 * Based on: DESIGN-FINAL-ASSIMILATION.md lines 221-278
 *
 * Features:
 * - Modal with location information
 * - Address display
 * - "Open in Google Maps" link
 * - Responsive design
 * - Ready for Google Maps integration later
 */

export default function MapModal({ listing, address, onClose }) {
  // Get location info from listing
  const locationAddress = address || listing?.['Location - Address'] || 'Address not available';
  const locationHood = listing?.['Location - Hood'] || '';
  const locationBorough = listing?.['Location - Borough'] || '';
  const listingName = listing?.Name || 'Listing Location';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {listingName}
                </h3>
                {(locationHood || locationBorough) && (
                  <p className="text-sm text-gray-600 mt-1">
                    {locationHood}{locationHood && locationBorough ? ', ' : ''}{locationBorough}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Map Placeholder - Ready for Google Maps integration */}
          <div className="bg-white px-4 pb-4">
            <div
              className="w-full h-[500px] bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center relative overflow-hidden"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            >
              {/* Map Icon */}
              <div className="text-center z-10">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600 rounded-full mb-4 shadow-lg">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium text-lg mb-2">
                  {locationHood || 'Location'}
                </p>
                <p className="text-gray-500 text-sm">
                  Interactive map will be integrated here
                </p>
              </div>

              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 w-16 h-16 bg-purple-200 rounded-full opacity-50"></div>
              <div className="absolute bottom-8 left-8 w-24 h-24 bg-blue-200 rounded-full opacity-30"></div>
              <div className="absolute top-1/3 left-1/4 w-12 h-12 bg-purple-300 rounded-full opacity-40"></div>
            </div>

            {/* Address Display */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="w-5 h-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Full Address</p>
                  <p className="text-sm text-gray-700">{locationAddress}</p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            {listing && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {listing['Location - Hood'] && (
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-700 font-medium mb-1">Neighborhood</p>
                    <p className="text-sm text-gray-900">{listing['Location - Hood']}</p>
                  </div>
                )}
                {listing['Location - Borough'] && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700 font-medium mb-1">Borough</p>
                    <p className="text-sm text-gray-900">{listing['Location - Borough']}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none transition-colors sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 w-full inline-flex justify-center items-center gap-2 rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors sm:mt-0 sm:w-auto sm:text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
