/**
 * ModifyListingsPage - Admin tool for modifying listings
 *
 * Follows the Hollow Component Pattern - all business logic is in
 * useModifyListingsPageLogic.js, this component contains only JSX.
 */

import useModifyListingsPageLogic from './useModifyListingsPageLogic';
import { NavigationTabs, Alert } from './shared';
import {
  AddressSection,
  FeaturesSection,
  LeaseStylesSection,
  PhotosSection,
  RulesSection,
  ReviewsSection
} from './sections';
import {
  SearchOptimising,
  StatusSection,
  SpaceSnapshot,
  ListingPreview
} from './sidebar';

export default function ModifyListingsPage() {
  const logic = useModifyListingsPageLogic();

  // Show loading state
  if (logic.isLoading) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>Loading listing...</p>
        </div>
      </div>
    );
  }

  // Show search/select state when no listing loaded
  if (!logic.listing) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.searchContainer}>
          <h2 style={styles.searchTitle}>Modify Listings</h2>
          <p style={styles.searchSubtitle}>
            Search for a listing by name or ID to begin editing.
          </p>

          {/* Search Input */}
          <div style={styles.searchInputWrapper}>
            <SearchIcon style={styles.searchIcon} />
            <input
              type="text"
              value={logic.searchQuery}
              onChange={(e) => {
                logic.setSearchQuery(e.target.value);
                logic.searchListings(e.target.value);
              }}
              placeholder="Search listings by name or ID..."
              style={styles.searchInput}
            />
            {logic.isSearching && <div style={styles.miniSpinner} />}
          </div>

          {/* Search Results */}
          {logic.searchResults.length > 0 && (
            <div style={styles.searchResults}>
              {logic.searchResults.map(result => (
                <button
                  key={result._id}
                  onClick={() => logic.selectSearchResult(result)}
                  style={styles.searchResultItem}
                >
                  <div style={styles.searchResultMain}>
                    <span style={styles.searchResultName}>
                      {result.Name || 'Unnamed Listing'}
                    </span>
                    <span style={styles.searchResultAddress}>
                      {result['Address - Full Street Address'] || 'No address'}
                    </span>
                  </div>
                  <div style={styles.searchResultStatus}>
                    <StatusBadge
                      label={result.Approved ? 'Approved' : 'Pending'}
                      type={result.Approved ? 'success' : 'warning'}
                    />
                    <StatusBadge
                      label={result.Active ? 'Active' : 'Inactive'}
                      type={result.Active ? 'success' : 'neutral'}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Error State */}
          {logic.error && (
            <div style={styles.errorBox}>
              <p>{logic.error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render active section
  const renderSection = () => {
    const sectionProps = {
      listing: logic.listing,
      onUpdate: logic.updateListingData,
      isSaving: logic.isSaving,
      onSave: () => logic.saveSection(logic.activeSection),
      lastSaved: logic.lastSaved
    };

    switch (logic.activeSection) {
      case 'address':
        return <AddressSection {...sectionProps} />;
      case 'features':
        return (
          <FeaturesSection
            {...sectionProps}
            amenitiesInUnit={logic.amenitiesInUnit}
            amenitiesInBuilding={logic.amenitiesInBuilding}
          />
        );
      case 'leaseStyles':
        return <LeaseStylesSection {...sectionProps} />;
      case 'photos':
        return (
          <PhotosSection
            {...sectionProps}
            onUploadPhoto={logic.onUploadPhoto}
            onDeletePhoto={logic.onDeletePhoto}
          />
        );
      case 'rules':
        return (
          <RulesSection
            {...sectionProps}
            houseRules={logic.houseRules}
            cancellationPolicyOptions={logic.cancellationPolicyOptions}
          />
        );
      case 'reviews':
        return (
          <ReviewsSection
            {...sectionProps}
            safetyFeatures={logic.safetyFeatures}
          />
        );
      default:
        return <AddressSection {...sectionProps} />;
    }
  };

  return (
    <div style={styles.container}>
      <Header
        listingName={logic.listing?.Name}
        hasChanges={logic.hasUnsavedChanges}
        onSave={logic.saveChanges}
        onClear={logic.clearListing}
        isSaving={logic.isSaving}
      />

      {/* Alert */}
      {logic.alert && (
        <Alert
          type={logic.alert.type}
          message={logic.alert.message}
          onClose={logic.dismissAlert}
        />
      )}

      {/* Main Layout */}
      <div style={styles.layout}>
        {/* Left Sidebar - Navigation */}
        <div style={styles.leftSidebar}>
          <NavigationTabs
            sections={logic.sections}
            activeSection={logic.activeSection}
            onSectionChange={logic.setActiveSection}
            sectionStatus={logic.sectionStatus}
          />
        </div>

        {/* Main Content */}
        <div style={styles.mainContent}>
          {renderSection()}
        </div>

        {/* Right Sidebar */}
        <div style={styles.rightSidebar}>
          <ListingPreview listing={logic.listing} />
          <StatusSection
            listing={logic.listing}
            onUpdate={logic.updateListingData}
            isProcessing={logic.isSaving}
          />
          <SpaceSnapshot listing={logic.listing} />
          <SearchOptimising listing={logic.listing} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function Header({ listingName, hasChanges, onSave, onClear, isSaving }) {
  return (
    <header style={styles.header}>
      <div style={styles.headerLeft}>
        <a href="/" style={styles.logo}>
          Split Lease
        </a>
        <span style={styles.headerDivider}>/</span>
        <span style={styles.headerTitle}>Modify Listings</span>
        {listingName && (
          <>
            <span style={styles.headerDivider}>/</span>
            <span style={styles.listingName}>{listingName}</span>
          </>
        )}
        {hasChanges && (
          <span style={styles.unsavedBadge}>Unsaved changes</span>
        )}
      </div>
      <div style={styles.headerRight}>
        {listingName && (
          <>
            <button
              onClick={onClear}
              style={styles.headerButtonSecondary}
            >
              Close Listing
            </button>
            <button
              onClick={onSave}
              disabled={isSaving || !hasChanges}
              style={{
                ...styles.headerButtonPrimary,
                ...((isSaving || !hasChanges) ? styles.headerButtonDisabled : {})
              }}
            >
              {isSaving ? 'Saving...' : 'Save All'}
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function StatusBadge({ label, type }) {
  const colors = {
    success: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    neutral: { bg: '#f3f4f6', text: '#4b5563' }
  };
  const color = colors[type] || colors.neutral;

  return (
    <span style={{
      ...styles.statusBadge,
      backgroundColor: color.bg,
      color: color.text
    }}>
      {label}
    </span>
  );
}

function SearchIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  },

  // Header
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  logo: {
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#52ABEC',
    textDecoration: 'none'
  },
  headerDivider: {
    color: '#d1d5db'
  },
  headerTitle: {
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: '#374151'
  },
  listingName: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  unsavedBadge: {
    marginLeft: '0.75rem',
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    borderRadius: '9999px'
  },
  headerRight: {
    display: 'flex',
    gap: '0.5rem'
  },
  headerButtonSecondary: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    cursor: 'pointer'
  },
  headerButtonPrimary: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#52ABEC',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer'
  },
  headerButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },

  // Loading
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '1rem'
  },
  spinner: {
    width: '2.5rem',
    height: '2.5rem',
    border: '3px solid #e5e7eb',
    borderTopColor: '#52ABEC',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  miniSpinner: {
    width: '1.25rem',
    height: '1.25rem',
    border: '2px solid #e5e7eb',
    borderTopColor: '#52ABEC',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '0.9375rem',
    color: '#6b7280'
  },

  // Search
  searchContainer: {
    maxWidth: '600px',
    margin: '4rem auto',
    padding: '0 1.5rem'
  },
  searchTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.5rem'
  },
  searchSubtitle: {
    fontSize: '0.9375rem',
    color: '#6b7280',
    marginBottom: '1.5rem'
  },
  searchInputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  searchIcon: {
    position: 'absolute',
    left: '0.875rem',
    width: '1.25rem',
    height: '1.25rem',
    color: '#9ca3af'
  },
  searchInput: {
    width: '100%',
    padding: '0.875rem 1rem 0.875rem 2.75rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    outline: 'none'
  },
  searchResults: {
    marginTop: '0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  searchResultItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '0.875rem 1rem',
    backgroundColor: '#ffffff',
    border: 'none',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    textAlign: 'left'
  },
  searchResultMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem'
  },
  searchResultName: {
    fontSize: '0.9375rem',
    fontWeight: '500',
    color: '#111827'
  },
  searchResultAddress: {
    fontSize: '0.8125rem',
    color: '#6b7280'
  },
  searchResultStatus: {
    display: 'flex',
    gap: '0.375rem'
  },
  statusBadge: {
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: '500',
    borderRadius: '9999px'
  },
  errorBox: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.5rem',
    color: '#991b1b',
    fontSize: '0.875rem'
  },

  // Layout
  layout: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 280px',
    gap: '1.5rem',
    padding: '1.5rem',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  leftSidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  mainContent: {
    minHeight: '70vh'
  },
  rightSidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  }
};

// Add keyframes for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
