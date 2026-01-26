/**
 * HostProfileModal Component - v2.0 PROTOCOL REDESIGN
 *
 * Shows host profile with verification badges and featured listings
 * Design: POPUP_REPLICATION_PROTOCOL - Monochromatic purple, pill buttons, mobile bottom sheet
 */

import { createPortal } from 'react-dom';
import { X, User, MapPin, Linkedin, Phone, Mail, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import ExternalReviews from '../shared/ExternalReviews.jsx';

export default function HostProfileModal({ host, listing, onClose }) {
  if (!host) return null;

  // Get host display name (initials or first name)
  const hostFirstName = host['Name - First'] || '';
  const hostLastInitial = host['Name - Last']?.charAt(0) || '';
  const displayName = hostLastInitial
    ? `${hostFirstName.charAt(0)}. ${hostLastInitial}. ${hostFirstName.charAt(hostFirstName.length - 1) || ''}`.replace(/\. \. /g, '. ')
    : hostFirstName;

  // Get photo URL
  const photoUrl = host['Profile Photo']
    ? (host['Profile Photo'].startsWith('//') ? `https:${host['Profile Photo']}` : host['Profile Photo'])
    : null;

  // Get listing location
  const listingLocation = [listing?.hoodName || listing?.['Location - Hood'], listing?.boroughName || listing?.['Location - Borough']]
    .filter(Boolean)
    .join(', ');

  // Get listing photo
  const listingPhotoUrl = listing?.featuredPhotoUrl || listing?.['Features - Photos']?.[0] || null;

  // Verification items data
  const verificationItems = [
    { icon: Linkedin, label: 'LinkedIn', verified: host['linkedIn verification'] },
    { icon: Phone, label: 'Phone', verified: host['Phone Number Verified'] },
    { icon: Mail, label: 'Email', verified: host['Email - Verified'] },
    { icon: CreditCard, label: 'Identity', verified: host['Identity Verified'] },
  ];

  const modalContent = (
    <div className="protocol-overlay" onClick={onClose}>
      <div className="protocol-modal host-profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Grab Handle */}
        <div className="protocol-grab-handle" />

        {/* Header */}
        <div className="protocol-header">
          <div className="protocol-header-left">
            <User size={24} strokeWidth={2} color="var(--protocol-primary)" aria-hidden="true" />
            <h2 className="protocol-title">Host Profile</h2>
          </div>
          <button
            className="protocol-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="protocol-body">
          {/* Host Info Section */}
          <div className="hpm-host-section">
            {/* Host Photo */}
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} className="hpm-host-photo" />
            ) : (
              <div className="hpm-host-photo-placeholder">
                {hostFirstName.charAt(0) || 'H'}
              </div>
            )}

            {/* Host Info and Verification */}
            <div className="hpm-host-info">
              <div className="hpm-host-name">{displayName}</div>
              <div className="hpm-verification-list">
                {verificationItems.map(({ icon: Icon, label, verified }) => (
                  <div key={label} className="hpm-verification-item">
                    <span className="hpm-verification-icon">
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    <span className="hpm-verification-label">{label}</span>
                    <span className={`hpm-verification-status ${verified ? 'verified' : 'unverified'}`}>
                      {verified ? (
                        <><CheckCircle size={14} strokeWidth={2} /> Verified</>
                      ) : (
                        <><XCircle size={14} strokeWidth={2} /> Unverified</>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Featured Listings */}
          {listing && (
            <div className="hpm-featured-section">
              <div className="hpm-featured-title">
                Featured Listings from {hostFirstName.charAt(0)}. {hostLastInitial}.
              </div>
              <div className="hpm-listing-card">
                {listingPhotoUrl ? (
                  <img src={listingPhotoUrl} alt={listing.Name} className="hpm-listing-photo" />
                ) : (
                  <div className="hpm-listing-photo-placeholder" />
                )}
                <div className="hpm-listing-info">
                  <a
                    href={`/view-split-lease/${listing._id}`}
                    className="hpm-listing-name"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {listing.Name}
                  </a>
                  <div className="hpm-listing-location">
                    <MapPin size={14} strokeWidth={2} />
                    <span>{listingLocation}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* External Reviews */}
          {listing && (
            <div className="hpm-reviews-section">
              <ExternalReviews listingId={listing._id} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="protocol-footer protocol-footer-full">
          <button className="protocol-btn protocol-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
