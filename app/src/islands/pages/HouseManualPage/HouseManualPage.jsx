/**
 * HouseManualPage Component
 *
 * Main page for AI-powered house manual creation.
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useHouseManualPageLogic hook
 *
 * Features:
 * - Multiple AI input methods (text, photo, voice, document, phone)
 * - Listing selection
 * - Structured data editor
 * - Save/update functionality
 *
 * @module HouseManualPage
 */

import { useEffect } from 'react';
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import { AIToolsProvider, useAITools, INPUT_METHODS } from '../../shared/AITools/AIToolsProvider';
import InputMethodSelector from '../../shared/AITools/InputMethodSelector';
import FreeformTextInput from '../../shared/AITools/FreeformTextInput';
import WifiPhotoExtractor from '../../shared/AITools/WifiPhotoExtractor';
import AudioRecorder from '../../shared/AITools/AudioRecorder';
import PdfDocUploader from '../../shared/AITools/PdfDocUploader';
import PhoneCallInterface from '../../shared/AITools/PhoneCallInterface';
import HouseManualEditor from '../../shared/AITools/HouseManualEditor';
import useHouseManualPageLogic from './useHouseManualPageLogic';
import '../../../styles/components/house-manual.css';
import '../../../styles/components/ai-tools.css';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState() {
  return (
    <div className="house-manual__loading">
      <div className="house-manual__spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

function ErrorState({ error }) {
  return (
    <div className="house-manual__error">
      <p>{error}</p>
      <button onClick={() => window.location.reload()}>Try Again</button>
    </div>
  );
}

// ============================================================================
// EMPTY LISTINGS STATE
// ============================================================================

function NoListingsState() {
  return (
    <div className="house-manual__empty">
      <div className="house-manual__empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <h2>No Listings Found</h2>
      <p>You need to create a listing before adding a house manual.</p>
      <a href="/self-listing" className="house-manual__cta-btn">
        Create Your First Listing
      </a>
    </div>
  );
}

// ============================================================================
// LISTING SELECTOR COMPONENT
// ============================================================================

function ListingSelector({ listings, selectedId, onChange, disabled }) {
  if (listings.length === 1) {
    return (
      <div className="house-manual__listing-info">
        <img
          src={listings[0].main_photo_url || '/assets/images/placeholder-listing.jpg'}
          alt={listings[0].title}
          className="house-manual__listing-thumb"
        />
        <span className="house-manual__listing-title">{listings[0].title}</span>
      </div>
    );
  }

  return (
    <div className="house-manual__listing-selector">
      <label htmlFor="listing-select">Select Listing:</label>
      <select
        id="listing-select"
        value={selectedId || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {listings.map((listing) => (
          <option key={listing.id} value={listing.id}>
            {listing.title}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// ACTIVE INPUT METHOD CONTENT
// ============================================================================

function ActiveInputContent({ onDataExtracted }) {
  const { activeMethod } = useAITools();

  switch (activeMethod) {
    case INPUT_METHODS.FREEFORM_TEXT:
      return <FreeformTextInput onDataExtracted={onDataExtracted} />;
    case INPUT_METHODS.WIFI_PHOTO:
      return <WifiPhotoExtractor onDataExtracted={onDataExtracted} />;
    case INPUT_METHODS.AUDIO_RECORDING:
      return <AudioRecorder onDataExtracted={onDataExtracted} />;
    case INPUT_METHODS.PDF_DOC:
      return <PdfDocUploader onDataExtracted={onDataExtracted} />;
    case INPUT_METHODS.PHONE_CALL:
      return <PhoneCallInterface onDataExtracted={onDataExtracted} />;
    default:
      return <FreeformTextInput onDataExtracted={onDataExtracted} />;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function HouseManualPageContent() {
  const {
    // Auth
    isAuthenticated,

    // Listings
    listings,
    selectedListingId,
    selectedListing,
    handleListingChange,

    // House manual
    existingManual,
    isLoadingManual,
    isSaving,
    handleSave,
    handleDataExtracted,

    // Loading/Error
    isLoading,
    error,
  } = useHouseManualPageLogic();

  // Add body class for page-specific styling
  useEffect(() => {
    document.body.classList.add('house-manual-page');
    return () => {
      document.body.classList.remove('house-manual-page');
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <main className="house-manual">
          <div className="house-manual__container">
            <LoadingState />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Header />
        <main className="house-manual">
          <div className="house-manual__container">
            <ErrorState error={error} />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Not authenticated (will redirect)
  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <main className="house-manual">
          <div className="house-manual__container">
            <LoadingState />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // No listings
  if (listings.length === 0) {
    return (
      <>
        <Header />
        <main className="house-manual">
          <div className="house-manual__container">
            <NoListingsState />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="house-manual">
        <div className="house-manual__container">
          {/* Page Header */}
          <div className="house-manual__header">
            <h1 className="house-manual__title">House Manual</h1>
            <p className="house-manual__subtitle">
              Create a comprehensive guide for your guests with AI-powered tools
            </p>
          </div>

          {/* Listing Selector */}
          <div className="house-manual__listing-section">
            <ListingSelector
              listings={listings}
              selectedId={selectedListingId}
              onChange={handleListingChange}
              disabled={isSaving}
            />
            {selectedListing && (
              <a
                href={`/listing-dashboard?id=${selectedListingId}`}
                className="house-manual__listing-link"
              >
                View Listing Dashboard →
              </a>
            )}
          </div>

          {/* AI Tools Section */}
          <div className="house-manual__ai-tools">
            <div className="house-manual__section-header">
              <h2>Add Content</h2>
              <p>Choose your preferred method to add information to your house manual</p>
            </div>

            {/* Input Method Selector */}
            <InputMethodSelector />

            {/* Active Input Method */}
            <div className="house-manual__input-area">
              <ActiveInputContent onDataExtracted={handleDataExtracted} />
            </div>
          </div>

          {/* House Manual Editor */}
          <div className="house-manual__editor-section">
            <HouseManualEditor onSave={handleSave} />
          </div>

          {/* Saving indicator */}
          {isSaving && (
            <div className="house-manual__saving-overlay">
              <div className="house-manual__spinner"></div>
              <p>Saving...</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// Wrap with AIToolsProvider
export default function HouseManualPage() {
  return (
    <AIToolsProvider>
      <HouseManualPageContent />
    </AIToolsProvider>
  );
}
