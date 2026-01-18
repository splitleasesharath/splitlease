/**
 * HostProfileModal Component
 *
 * Shows host profile with verification badges and featured listings
 * Styled to match Guest Proposals V5 Balanced Design System
 */

import ExternalReviews from '../shared/ExternalReviews.jsx';
import '../../styles/components/host-profile-modal.css';

// LinkedIn icon SVG
const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

// Phone icon SVG
const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

// Email icon SVG
const EmailIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

// ID/Identity icon SVG
const IdentityIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <circle cx="8" cy="12" r="2"/>
    <path d="M14 10h4"/>
    <path d="M14 14h4"/>
  </svg>
);

// Location pin icon
const LocationIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>
);

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
    { icon: <LinkedInIcon />, label: 'LinkedIn', verified: host['linkedIn verification'] },
    { icon: <PhoneIcon />, label: 'Phone', verified: host['Phone Number Verified'] },
    { icon: <EmailIcon />, label: 'Email', verified: host['Email - Verified'] },
    { icon: <IdentityIcon />, label: 'Identity', verified: host['Identity Verified'] },
  ];

  return (
    <div className="host-profile-overlay" onClick={onClose}>
      <div className="host-profile-modal" onClick={(e) => e.stopPropagation()}>
        {/* Host section with photo and verification */}
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
            <div className="hpm-host-name">Host: {displayName}</div>
            <div className="hpm-verification-list">
              {verificationItems.map(({ icon, label, verified }) => (
                <div key={label} className="hpm-verification-item">
                  <span className="hpm-verification-icon">{icon}</span>
                  <span className="hpm-verification-label">{label}</span>
                  <span className={`hpm-verification-status ${verified ? 'verified' : 'unverified'}`}>
                    {verified ? 'Verified' : 'Unverified'}
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
                  <span className="hpm-location-icon"><LocationIcon /></span>
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

        {/* Close Button */}
        <div className="hpm-footer">
          <button className="hpm-close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
