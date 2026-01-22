/**
 * VerifyUsersPage - Admin tool for verifying user identity documents
 *
 * Hollow component pattern: All logic is in useVerifyUsersPageLogic.js
 * This component only handles rendering.
 *
 * Features:
 * - Search users by email or name
 * - View verification documents (profile photo, selfie, ID front/back)
 * - Toggle verification status
 * - Image modal for full-size document review
 * - Responsive design for desktop and mobile
 */

import useVerifyUsersPageLogic from './useVerifyUsersPageLogic.js';

export default function VerifyUsersPage() {
  const {
    // User selection state
    selectedUser,
    searchQuery,
    searchResults,
    isSearching,
    isDropdownOpen,
    dropdownRef,

    // Verification state
    isProcessing,

    // Image modal state
    modalImage,

    // Loading/error state
    loading,
    error,

    // User selection handlers
    handleSelectUser,
    clearSelection,
    handleSearchChange,
    handleDropdownToggle,
    setIsDropdownOpen,

    // Verification handlers
    toggleVerification,

    // Image modal handlers
    openImageModal,
    closeImageModal,
    openImageExternal,

    // Computed values
    getCompletenessColor,
    documentSections,
  } = useVerifyUsersPageLogic();

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>User Verification</h1>
        <p style={styles.subtitle}>
          Verify user identity by reviewing their submitted documents
        </p>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* User Selection */}
        <UserSelect
          selectedUser={selectedUser}
          searchQuery={searchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          isDropdownOpen={isDropdownOpen}
          dropdownRef={dropdownRef}
          onSearchChange={handleSearchChange}
          onDropdownToggle={handleDropdownToggle}
          onSelectUser={handleSelectUser}
          onClear={clearSelection}
          setIsDropdownOpen={setIsDropdownOpen}
        />

        {/* Identity Verification Container - Only shown when user is selected */}
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} />
        ) : selectedUser ? (
          <IdentityVerificationContainer
            user={selectedUser}
            isProcessing={isProcessing}
            onToggleVerification={toggleVerification}
            onImageClick={openImageModal}
            documentSections={documentSections}
            getCompletenessColor={getCompletenessColor}
          />
        ) : (
          <EmptyState />
        )}

        {/* Instructions */}
        <Instructions />
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Split Lease Admin Dashboard - Internal Use Only
        </p>
      </footer>

      {/* Image Modal */}
      {modalImage && (
        <ImageModal
          imageUrl={modalImage.url}
          title={modalImage.title}
          onClose={closeImageModal}
          onOpenExternal={() => openImageExternal(modalImage.url)}
        />
      )}
    </div>
  );
}

// ===== USER SELECT COMPONENT =====

function UserSelect({
  selectedUser,
  searchQuery,
  searchResults,
  isSearching,
  isDropdownOpen,
  dropdownRef,
  onSearchChange,
  onDropdownToggle,
  onSelectUser,
  onClear,
  setIsDropdownOpen,
}) {
  return (
    <div style={styles.userSelectContainer}>
      <h2 style={styles.sectionTitle}>Select User</h2>

      <div style={styles.userSelectRow}>
        {/* Email Input Field */}
        <div style={styles.emailInputContainer}>
          <input
            type="text"
            placeholder="Type user's email"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
            style={styles.emailInput}
            disabled={!!selectedUser}
          />
        </div>

        {/* User Dropdown Selector */}
        <div style={styles.dropdownContainer} ref={dropdownRef}>
          <div
            onClick={onDropdownToggle}
            style={{
              ...styles.dropdownTrigger,
              ...(isDropdownOpen ? styles.dropdownTriggerActive : {}),
            }}
            tabIndex={0}
          >
            <span style={selectedUser ? styles.dropdownTextSelected : styles.dropdownTextPlaceholder}>
              {selectedUser
                ? `${selectedUser.fullName} - ${selectedUser.email}`
                : 'Choose an option...'}
            </span>
            <ChevronIcon isOpen={isDropdownOpen} />
          </div>

          {/* Dropdown List */}
          {isDropdownOpen && (
            <div style={styles.dropdownList}>
              {isSearching ? (
                <div style={styles.dropdownLoading}>Searching...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map((user) => (
                  <UserDropdownItem
                    key={user._id}
                    user={user}
                    isSelected={selectedUser?._id === user._id}
                    onSelect={onSelectUser}
                  />
                ))
              ) : (
                <div style={styles.dropdownEmpty}>No users found</div>
              )}
            </div>
          )}
        </div>

        {/* Clear Selection Button */}
        {selectedUser && (
          <button onClick={onClear} style={styles.clearButton}>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function UserDropdownItem({ user, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(user)}
      style={{
        ...styles.dropdownItem,
        ...(isSelected ? styles.dropdownItemSelected : {}),
      }}
    >
      <div style={styles.dropdownItemContent}>
        {user.profilePhoto ? (
          <img
            src={user.profilePhoto}
            alt={user.fullName}
            style={styles.dropdownAvatar}
          />
        ) : (
          <div style={styles.dropdownAvatarPlaceholder}>
            <span style={styles.dropdownAvatarInitial}>
              {user.fullName?.charAt(0) || '?'}
            </span>
          </div>
        )}
        <div>
          <p style={styles.dropdownItemName}>{user.fullName}</p>
          <p style={styles.dropdownItemEmail}>{user.email}</p>
        </div>
        {user.isVerified && (
          <span style={styles.verifiedBadge}>Verified</span>
        )}
      </div>
    </div>
  );
}

// ===== IDENTITY VERIFICATION CONTAINER =====

function IdentityVerificationContainer({
  user,
  isProcessing,
  onToggleVerification,
  onImageClick,
  documentSections,
  getCompletenessColor,
}) {
  return (
    <div style={styles.verificationContainer}>
      <h2 style={styles.verificationTitle}>Identity Verification</h2>

      <div style={styles.verificationContent}>
        {/* Image Grid - 2x2 layout */}
        <div style={styles.imageGrid}>
          {documentSections.map((section) => (
            <ImageCard
              key={section.key}
              imageUrl={user[section.key]}
              label={`${user.fullName}'s ${section.label}`}
              title={section.title}
              userName={user.fullName}
              onClick={onImageClick}
            />
          ))}
        </div>

        {/* Verification Toggle - Right side */}
        <div style={styles.toggleSection}>
          <VerificationToggle
            isVerified={user.isVerified}
            onToggle={onToggleVerification}
            disabled={isProcessing}
          />
          {isProcessing && (
            <p style={styles.processingText}>Processing...</p>
          )}
        </div>
      </div>

      {/* User Info Summary */}
      <div style={styles.userSummary}>
        <div style={styles.userSummaryItem}>
          <span style={styles.userSummaryLabel}>Email:</span> {user.email}
        </div>
        <div style={styles.userSummaryItem}>
          <span style={styles.userSummaryLabel}>Phone:</span>{' '}
          {user.phoneNumber || 'Not provided'}
        </div>
        <div style={styles.userSummaryItem}>
          <span style={styles.userSummaryLabel}>Profile Completeness:</span>{' '}
          <span style={{ color: getCompletenessColor(user.profileCompleteness || 0) }}>
            {user.profileCompleteness || 0}%
          </span>
        </div>
        <div style={styles.userSummaryItem}>
          <span style={styles.userSummaryLabel}>Tasks Completed:</span>{' '}
          {user.tasksCompleted?.length > 0
            ? user.tasksCompleted.join(', ')
            : 'None'}
        </div>
      </div>
    </div>
  );
}

function ImageCard({ imageUrl, label, title, userName, onClick }) {
  const handleClick = () => {
    if (imageUrl) {
      onClick(imageUrl, `${userName}'s ${title}`);
    }
  };

  return (
    <div style={styles.imageCardContainer}>
      <label style={styles.imageCardLabel}>{label}</label>
      <div
        onClick={handleClick}
        style={{
          ...styles.imageCard,
          ...(imageUrl ? styles.imageCardWithImage : styles.imageCardEmpty),
        }}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={label}
              style={styles.imageCardImg}
            />
            <div style={styles.imageCardOverlay}>
              <span style={styles.imageCardOverlayText}>Click to view</span>
            </div>
          </>
        ) : (
          <div style={styles.imageCardPlaceholder}>
            <ImagePlaceholderIcon />
            <span style={styles.imageCardPlaceholderText}>No image available</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== VERIFICATION TOGGLE =====

function VerificationToggle({ isVerified, onToggle, disabled }) {
  return (
    <div style={styles.toggleContainer}>
      <label style={styles.toggleLabel}>User Verified?</label>
      <button
        type="button"
        onClick={() => !disabled && onToggle(!isVerified)}
        disabled={disabled}
        style={{
          ...styles.toggleButton,
          ...(isVerified ? styles.toggleButtonActive : styles.toggleButtonInactive),
          ...(disabled ? styles.toggleButtonDisabled : {}),
        }}
        role="switch"
        aria-checked={isVerified}
      >
        <span
          style={{
            ...styles.toggleKnob,
            ...(isVerified ? styles.toggleKnobActive : styles.toggleKnobInactive),
          }}
        />
      </button>
      <span
        style={{
          ...styles.toggleStatus,
          ...(isVerified ? styles.toggleStatusVerified : styles.toggleStatusNotVerified),
        }}
      >
        {isVerified ? 'Verified' : 'Not Verified'}
      </span>
    </div>
  );
}

// ===== IMAGE MODAL =====

function ImageModal({ imageUrl, title, onClose, onOpenExternal }) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={handleBackdropClick}>
      <div style={styles.modalContent}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>{title}</h3>
          <div style={styles.modalActions}>
            <button
              onClick={onOpenExternal}
              style={styles.modalIconButton}
              title="Open in new tab"
            >
              <ExternalLinkIcon />
            </button>
            <button
              onClick={onClose}
              style={styles.modalIconButton}
              title="Close"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Image */}
        <div style={styles.modalImageContainer}>
          <img
            src={imageUrl}
            alt={title}
            style={styles.modalImage}
          />
        </div>
      </div>
    </div>
  );
}

// ===== STATE COMPONENTS =====

function LoadingState() {
  return (
    <div style={styles.stateContainer}>
      <div style={styles.spinner} />
      <span>Loading user...</span>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div style={styles.errorContainer}>
      <span>{message}</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={styles.emptyContainer}>
      <UserIcon />
      <h3 style={styles.emptyTitle}>No User Selected</h3>
      <p style={styles.emptyText}>
        Search for a user by email or select from the dropdown above to begin verification
      </p>
    </div>
  );
}

function Instructions() {
  return (
    <div style={styles.instructions}>
      <h4 style={styles.instructionsTitle}>Verification Instructions</h4>
      <ul style={styles.instructionsList}>
        <li>1. Select a user from the dropdown or search by email address</li>
        <li>2. Review all four identity documents (profile photo, selfie with ID, front and back of government ID)</li>
        <li>3. Click on any image to view it in full size</li>
        <li>4. Once verified, toggle the "User Verified?" switch to ON</li>
        <li>5. The system will automatically update the user's profile and send notifications</li>
      </ul>
    </div>
  );
}

// ===== ICONS =====

function ChevronIcon({ isOpen }) {
  return (
    <svg
      style={{
        ...styles.chevronIcon,
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      }}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      style={styles.userIcon}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg
      style={styles.imagePlaceholderIcon}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// ===== STYLES =====

const styles = {
  // Container
  container: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    flexDirection: 'column',
  },

  // Header
  header: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 2rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.25rem 0',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },

  // Main
  main: {
    flex: 1,
    maxWidth: '80rem',
    width: '100%',
    margin: '0 auto',
    padding: '2rem',
  },

  // Footer
  footer: {
    backgroundColor: 'white',
    borderTop: '1px solid #e5e7eb',
    padding: '1rem 2rem',
    marginTop: 'auto',
  },
  footerText: {
    textAlign: 'center',
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },

  // User Select
  userSelectContainer: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '1rem',
  },
  userSelectRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: '1rem',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  emailInputContainer: {
    width: '290px',
  },
  emailInput: {
    width: '100%',
    height: '43px',
    padding: '0 1rem',
    border: '2px solid #d1d5db',
    borderRadius: '0.5rem',
    backgroundColor: 'white',
    color: '#374151',
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  dropdownContainer: {
    position: 'relative',
    width: '451px',
  },
  dropdownTrigger: {
    width: '100%',
    height: '44px',
    padding: '0 1rem',
    border: '2px solid #d1d5db',
    borderRadius: '0.5rem',
    backgroundColor: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  dropdownTriggerActive: {
    borderColor: '#52ABEC',
  },
  dropdownTextSelected: {
    color: '#1f2937',
    fontSize: '0.875rem',
  },
  dropdownTextPlaceholder: {
    color: '#9ca3af',
    fontSize: '0.875rem',
  },
  chevronIcon: {
    width: '20px',
    height: '20px',
    color: '#9ca3af',
    transition: 'transform 0.15s',
  },
  dropdownList: {
    position: 'absolute',
    zIndex: 10,
    width: '100%',
    marginTop: '0.25rem',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    maxHeight: '240px',
    overflowY: 'auto',
  },
  dropdownLoading: {
    padding: '0.75rem 1rem',
    color: '#6b7280',
    textAlign: 'center',
    fontSize: '0.875rem',
  },
  dropdownEmpty: {
    padding: '0.75rem 1rem',
    color: '#6b7280',
    textAlign: 'center',
    fontSize: '0.875rem',
  },
  dropdownItem: {
    padding: '0.75rem 1rem',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s',
  },
  dropdownItemSelected: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  dropdownAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  dropdownAvatarPlaceholder: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownAvatarInitial: {
    color: '#6b7280',
    fontSize: '0.875rem',
  },
  dropdownItemName: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#1f2937',
    margin: 0,
  },
  dropdownItemEmail: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: 0,
  },
  verifiedBadge: {
    marginLeft: 'auto',
    padding: '0.125rem 0.5rem',
    backgroundColor: '#dcfce7',
    color: '#15803d',
    fontSize: '0.75rem',
    borderRadius: '9999px',
  },
  clearButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    color: '#4b5563',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },

  // Verification Container
  verificationContainer: {
    border: '2px solid #4D4D4D',
    borderRadius: '20px',
    backgroundColor: 'white',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  verificationTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '1.5rem',
  },
  verificationContent: {
    display: 'flex',
    flexDirection: 'row',
    gap: '1.5rem',
  },
  imageGrid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  toggleSection: {
    width: '128px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderLeft: '1px solid #e5e7eb',
    paddingLeft: '1.5rem',
  },
  processingText: {
    marginTop: '0.5rem',
    fontSize: '0.75rem',
    color: '#6b7280',
  },

  // Image Card
  imageCardContainer: {
    display: 'flex',
    flexDirection: 'column',
  },
  imageCardLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  imageCard: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4/3',
    border: '2px dashed',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    transition: 'all 0.15s',
  },
  imageCardWithImage: {
    borderColor: '#d1d5db',
    cursor: 'pointer',
  },
  imageCardEmpty: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  imageCardImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imageCardOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'all 0.15s',
  },
  imageCardOverlayText: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  imageCardPlaceholder: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
  },
  imagePlaceholderIcon: {
    width: '40px',
    height: '40px',
    marginBottom: '0.5rem',
  },
  imageCardPlaceholderText: {
    fontSize: '0.875rem',
  },

  // Verification Toggle
  toggleContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  toggleLabel: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
  },
  toggleButton: {
    position: 'relative',
    display: 'inline-flex',
    height: '32px',
    width: '56px',
    alignItems: 'center',
    borderRadius: '9999px',
    transition: 'background-color 0.2s',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  toggleButtonActive: {
    backgroundColor: '#22c55e',
  },
  toggleButtonInactive: {
    backgroundColor: '#d1d5db',
  },
  toggleButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  toggleKnob: {
    display: 'inline-block',
    height: '24px',
    width: '24px',
    borderRadius: '9999px',
    backgroundColor: 'white',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s',
  },
  toggleKnobActive: {
    transform: 'translateX(28px)',
  },
  toggleKnobInactive: {
    transform: 'translateX(4px)',
  },
  toggleStatus: {
    fontSize: '0.75rem',
    fontWeight: '500',
  },
  toggleStatusVerified: {
    color: '#16a34a',
  },
  toggleStatusNotVerified: {
    color: '#6b7280',
  },

  // User Summary
  userSummary: {
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    fontSize: '0.875rem',
    color: '#4b5563',
  },
  userSummaryItem: {
    display: 'inline',
  },
  userSummaryLabel: {
    fontWeight: '500',
  },

  // States
  stateContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#6b7280',
    gap: '1rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#dc2626',
    gap: '1rem',
  },
  emptyContainer: {
    border: '2px dashed #d1d5db',
    borderRadius: '20px',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: '3rem',
    textAlign: 'center',
    marginBottom: '2rem',
  },
  userIcon: {
    width: '64px',
    height: '64px',
    margin: '0 auto 1rem',
    color: '#9ca3af',
  },
  emptyTitle: {
    fontSize: '1.125rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  emptyText: {
    color: '#6b7280',
    margin: 0,
  },

  // Instructions
  instructions: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '0.5rem',
    padding: '1rem',
  },
  instructionsTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '0.5rem',
  },
  instructionsList: {
    fontSize: '0.875rem',
    color: '#1d4ed8',
    margin: 0,
    paddingLeft: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    position: 'relative',
    maxWidth: '56rem',
    maxHeight: '90vh',
    margin: '1rem',
  },
  modalHeader: {
    backgroundColor: 'white',
    borderTopLeftRadius: '0.5rem',
    borderTopRightRadius: '0.5rem',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  modalActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  modalIconButton: {
    padding: '0.5rem',
    color: '#4b5563',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageContainer: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: '0.5rem',
    borderBottomRightRadius: '0.5rem',
    overflow: 'hidden',
  },
  modalImage: {
    maxWidth: '100%',
    maxHeight: '75vh',
    objectFit: 'contain',
    display: 'block',
    margin: '0 auto',
  },
};

// Add keyframes for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Hover effects */
  .image-card-with-image:hover {
    border-color: #52ABEC;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .image-card-with-image:hover .image-card-overlay {
    background-color: rgba(0, 0, 0, 0.2);
    opacity: 1;
  }
`;
document.head.appendChild(styleSheet);
