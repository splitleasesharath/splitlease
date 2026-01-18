/**
 * ProposalSuccessModal Component
 *
 * Displayed after successful proposal submission.
 * Provides CTAs to navigate to Rental Application or Guest Dashboard.
 *
 * Uses inline styles to ensure visibility (no Tailwind dependency)
 */

export default function ProposalSuccessModal({
  proposalId,
  listingName,
  onClose,
  hasSubmittedRentalApp = false
}) {
  // Handle navigation to rental application
  const handleGoToRentalApp = () => {
    window.location.href = `/rental-application?proposal=${proposalId}`;
  };

  // Handle navigation to guest dashboard
  const handleGoToGuestDashboard = () => {
    window.location.href = `/guest-proposals?proposal=${proposalId}`;
  };

  // Inline styles to ensure modal renders correctly without Tailwind
  const styles = {
    overlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      animation: 'fadeIn 0.2s ease-in-out'
    },
    modal: {
      position: 'relative',
      background: '#FFFFFF',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '420px',
      width: '90%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
      animation: 'slideUp 0.3s ease-out'
    },
    closeButton: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      background: 'transparent',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#666',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      transition: 'all 0.2s ease'
    },
    successIcon: {
      width: '64px',
      height: '64px',
      backgroundColor: '#dcfce7',
      color: '#16a34a',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px auto'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#1f2937',
      textAlign: 'center',
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#6b7280',
      textAlign: 'center',
      marginBottom: '20px',
      lineHeight: '1.5'
    },
    listingName: {
      fontWeight: '500',
      color: '#7c3aed'
    },
    infoBox: {
      backgroundColor: '#f5f3ff',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '24px',
      borderLeft: '4px solid #7c3aed'
    },
    infoTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#5b21b6',
      marginBottom: '8px'
    },
    infoText: {
      fontSize: '14px',
      color: '#6d28d9',
      lineHeight: '1.5',
      margin: 0
    },
    buttonContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    },
    primaryButton: {
      width: '100%',
      padding: '14px 20px',
      backgroundColor: '#7c3aed',
      color: '#FFFFFF',
      border: 'none',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.2s ease'
    },
    secondaryButton: {
      width: '100%',
      padding: '14px 20px',
      backgroundColor: '#FFFFFF',
      color: '#7c3aed',
      border: '2px solid #7c3aed',
      borderRadius: '10px',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      transition: 'all 0.2s ease'
    },
    recommendedBadge: {
      fontSize: '12px',
      opacity: '0.8'
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={styles.closeButton}
          aria-label="Close modal"
          onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
          onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          ×
        </button>

        {/* Success Icon */}
        <div style={styles.successIcon}>
          <svg
            width="32"
            height="32"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 style={styles.title}>
          Proposal Submitted!
        </h3>

        {/* Listing name */}
        {listingName && (
          <p style={styles.subtitle}>
            Your proposal for <span style={styles.listingName}>{listingName}</span> has been sent to the host.
          </p>
        )}

        {/* Next steps info - only show if rental app not submitted */}
        {!hasSubmittedRentalApp && (
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>
              What's Next?
            </h4>
            <p style={styles.infoText}>
              Complete your rental application to increase your chances of approval.
              The host will review your proposal and application together.
            </p>
          </div>
        )}

        {/* Already submitted info */}
        {hasSubmittedRentalApp && (
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>
              What's Next?
            </h4>
            <p style={styles.infoText}>
              Your rental application is already on file. The host will review your proposal and get back to you soon.
            </p>
          </div>
        )}

        {/* CTA Buttons */}
        <div style={styles.buttonContainer}>
          {/* Primary CTA - Rental Application (only show if not submitted) */}
          {!hasSubmittedRentalApp && (
            <button
              onClick={handleGoToRentalApp}
              style={styles.primaryButton}
              onMouseOver={(e) => e.target.style.backgroundColor = '#6d28d9'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#7c3aed'}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Submit Rental Application
              <span style={styles.recommendedBadge}>(Recommended)</span>
            </button>
          )}

          {/* Guest Dashboard - Primary when rental app submitted, Secondary otherwise */}
          <button
            onClick={handleGoToGuestDashboard}
            style={hasSubmittedRentalApp ? styles.primaryButton : styles.secondaryButton}
            onMouseOver={(e) => {
              if (hasSubmittedRentalApp) {
                e.target.style.backgroundColor = '#6d28d9';
              } else {
                e.target.style.backgroundColor = '#f5f3ff';
                e.target.style.borderColor = '#6d28d9';
              }
            }}
            onMouseOut={(e) => {
              if (hasSubmittedRentalApp) {
                e.target.style.backgroundColor = '#7c3aed';
              } else {
                e.target.style.backgroundColor = '#FFFFFF';
                e.target.style.borderColor = '#7c3aed';
              }
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Go to Guest Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
