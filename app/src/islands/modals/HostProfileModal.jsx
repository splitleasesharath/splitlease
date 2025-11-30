/**
 * HostProfileModal Component
 *
 * Shows host profile with verification badges and featured listings
 * Based on Bubble's Host Profile popup design
 */

import ExternalReviews from '../shared/ExternalReviews.jsx';

// Inline styles to match Bubble design
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2002,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '100px',
    overflowY: 'auto'
  },
  modal: {
    background: '#FFFFFF',
    borderRadius: '5px',
    boxShadow: 'rgba(0, 0, 0, 0.38) 0px -10px 80px 0px',
    width: 'calc(100% - 20px)',
    maxWidth: '500px',
    position: 'relative',
    padding: '20px',
    marginBottom: '20px'
  },
  hostSection: {
    display: 'flex',
    gap: '20px',
    marginBottom: '20px'
  },
  hostPhoto: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    objectFit: 'cover',
    flexShrink: 0
  },
  hostPhotoPlaceholder: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: '#E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    fontWeight: '600',
    color: '#6B7280',
    flexShrink: 0
  },
  hostName: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: '16px',
    fontWeight: '600',
    color: '#424242',
    marginBottom: '8px'
  },
  verificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  verificationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#424242'
  },
  verificationIcon: {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  verifiedText: {
    color: '#22C55E',
    fontWeight: '500'
  },
  unverifiedText: {
    color: '#DC2626',
    fontWeight: '500'
  },
  featuredSection: {
    borderTop: '1px solid #E5E7EB',
    paddingTop: '15px',
    marginTop: '10px'
  },
  featuredTitle: {
    fontFamily: "'Open Sans', sans-serif",
    fontSize: '14px',
    fontWeight: '600',
    color: '#424242',
    marginBottom: '12px'
  },
  listingCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px',
    background: '#F9FAFB',
    borderRadius: '8px',
    border: '1px solid #E5E7EB'
  },
  listingPhoto: {
    width: '60px',
    height: '60px',
    borderRadius: '8px',
    objectFit: 'cover',
    flexShrink: 0
  },
  listingPhotoPlaceholder: {
    width: '60px',
    height: '60px',
    borderRadius: '8px',
    background: '#E5E7EB',
    flexShrink: 0
  },
  listingInfo: {
    flex: 1,
    minWidth: 0
  },
  listingName: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#4F46E5',
    textDecoration: 'none',
    display: 'block',
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  listingLocation: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#6B7280'
  },
  locationIcon: {
    color: '#EF4444'
  },
  closeButtonContainer: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center'
  },
  closeButtonMain: {
    background: '#6D31C2',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 48px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s'
  }
};

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

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Host section with photo and verification */}
        <div style={styles.hostSection}>
          {/* Host Photo */}
          {photoUrl ? (
            <img src={photoUrl} alt={displayName} style={styles.hostPhoto} />
          ) : (
            <div style={styles.hostPhotoPlaceholder}>
              {hostFirstName.charAt(0) || 'H'}
            </div>
          )}

          {/* Host Info and Verification */}
          <div>
            <div style={styles.hostName}>Host: {displayName}</div>
            <div style={styles.verificationList}>
              {/* LinkedIn */}
              <div style={styles.verificationItem}>
                <span style={styles.verificationIcon}><LinkedInIcon /></span>
                <span>Linkedin</span>
                <span style={host['linkedIn verification'] ? styles.verifiedText : styles.unverifiedText}>
                  {host['linkedIn verification'] ? 'Verified' : 'Unverified'}
                </span>
              </div>
              {/* Phone */}
              <div style={styles.verificationItem}>
                <span style={styles.verificationIcon}><PhoneIcon /></span>
                <span>Number</span>
                <span style={host['Phone Number Verified'] ? styles.verifiedText : styles.unverifiedText}>
                  {host['Phone Number Verified'] ? 'Verified' : 'Unverified'}
                </span>
              </div>
              {/* Email */}
              <div style={styles.verificationItem}>
                <span style={styles.verificationIcon}><EmailIcon /></span>
                <span>Email</span>
                <span style={host['Email - Verified'] ? styles.verifiedText : styles.unverifiedText}>
                  {host['Email - Verified'] ? 'Verified' : 'Unverified'}
                </span>
              </div>
              {/* Identity */}
              <div style={styles.verificationItem}>
                <span style={styles.verificationIcon}><IdentityIcon /></span>
                <span>Identity</span>
                <span style={host['Identity Verified'] ? styles.verifiedText : styles.unverifiedText}>
                  {host['Identity Verified'] ? 'Verified' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Listings */}
        {listing && (
          <div style={styles.featuredSection}>
            <div style={styles.featuredTitle}>Featured Listings from {hostFirstName.charAt(0)}. {hostLastInitial}.</div>
            <div style={styles.listingCard}>
              {listingPhotoUrl ? (
                <img src={listingPhotoUrl} alt={listing.Name} style={styles.listingPhoto} />
              ) : (
                <div style={styles.listingPhotoPlaceholder} />
              )}
              <div style={styles.listingInfo}>
                <a
                  href={`/view-split-lease/${listing._id}`}
                  style={styles.listingName}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {listing.Name}
                </a>
                <div style={styles.listingLocation}>
                  <span style={styles.locationIcon}><LocationIcon /></span>
                  <span>{listingLocation}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* External Reviews */}
        {listing && <ExternalReviews listingId={listing._id} />}

        {/* Close Button */}
        <div style={styles.closeButtonContainer}>
          <button
            style={styles.closeButtonMain}
            onClick={onClose}
            onMouseEnter={(e) => e.target.style.background = '#5A28A0'}
            onMouseLeave={(e) => e.target.style.background = '#6D31C2'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
