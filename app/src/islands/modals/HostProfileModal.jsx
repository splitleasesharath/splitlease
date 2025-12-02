/**
 * HostProfileModal Component
 *
 * Shows host profile with verification badges and featured listings
 * Based on screenshot: pass1-host-profile-modal.png
 */

import ExternalReviews from '../shared/ExternalReviews.jsx';

export default function HostProfileModal({ host, listing, onClose }) {
  if (!host) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                {/* Host Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-300">
                    {host['Profile Photo'] ? (
                      <img
                        src={host['Profile Photo'].startsWith('//') ? `https:${host['Profile Photo']}` : host['Profile Photo']}
                        alt={host['Name - Full']}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-gray-600">
                        {host['Name - First']?.charAt(0) || 'H'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Host: {host['Name - Full'] || host['Name - First']}
                    </h3>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Verification Status</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{host['linkedIn verification'] ? '✅' : '❌'}</span>
                      <span>LinkedIn - {host['linkedIn verification'] ? 'Verified' : 'Unverified'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{host['Phone Number Verified'] ? '✅' : '❌'}</span>
                      <span>Number - {host['Phone Number Verified'] ? 'Verified' : 'Unverified'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{host['Email - Verified'] ? '✅' : '❌'}</span>
                      <span>Email - {host['Email - Verified'] ? 'Verified' : 'Unverified'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{host['Identity Verified'] ? '✅' : '❌'}</span>
                      <span>Identity - {host['Identity Verified'] ? 'Verified' : 'Unverified'}</span>
                    </div>
                  </div>
                </div>

                {/* Featured Listing */}
                {listing && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Featured Listings from {host['Name - First']}</h4>
                    <div className="flex items-center gap-3">
                      {listing['Features - Photos']?.[0] && (
                        <img
                          src={listing['Features - Photos'][0]}
                          alt={listing.Name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{listing.Name}</p>
                        <p className="text-sm text-gray-600">{listing['Location - Hood']}, {listing['Location - Borough']}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* External Reviews */}
                {listing && <ExternalReviews listingId={listing._id} />}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
