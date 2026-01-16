import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Section1SpaceSnapshot } from './sections/Section1SpaceSnapshot';
import { Section2Features } from './sections/Section2Features';
import { Section3LeaseStyles } from './sections/Section3LeaseStyles';
import { Section4Pricing } from './sections/Section4Pricing';
import { Section5Rules } from './sections/Section5Rules';
import { Section6Photos } from './sections/Section6Photos';
import { Section7Review } from './sections/Section7Review';
import type { ListingFormData } from './types/listing.types';
import { useListingStore, listingLocalStore } from './store';
import Header from '../../shared/Header';
import SignUpLoginModal from '../../shared/SignUpLoginModal';
import Toast, { useToast } from '../../shared/Toast';
import { getListingById } from '../../../lib/bubbleAPI';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth';
import { createListing } from '../../../lib/listingService';
import { isGuest } from '../../../logic/rules/users/isGuest.js';
import './styles/SelfListingPage.css';
import '../../../styles/components/toast.css';

// ============================================================================
// Success Modal Component
// ============================================================================

interface SuccessModalProps {
  isOpen: boolean;
  listingId: string;
  listingName: string;
  isLoading?: boolean;
}

const successModalStyles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '2.5rem',
    maxWidth: '480px',
    width: '90%',
    textAlign: 'center' as const,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    backgroundColor: '#10B981',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  icon: {
    fontSize: '40px',
    color: 'white',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700' as const,
    color: '#1a202c',
    margin: '0 0 0.75rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0 0 1.5rem',
    lineHeight: '1.5',
  },
  listingName: {
    fontWeight: '600' as const,
    color: '#5B21B6',
  },
  button: {
    display: 'inline-block',
    padding: '0.875rem 2rem',
    backgroundColor: '#5B21B6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600' as const,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background-color 0.15s ease',
  },
  secondaryText: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginTop: '1rem',
  },
  loadingIconWrapper: {
    width: '80px',
    height: '80px',
    backgroundColor: '#5B21B6',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.5rem',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingTitle: {
    fontSize: '1.5rem',
    fontWeight: '700' as const,
    color: '#1a202c',
    margin: '0 0 0.75rem',
  },
  loadingSubtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0 0 1.5rem',
    lineHeight: '1.5',
  },
};

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, listingId, listingName, isLoading = false }) => {
  if (!isOpen) return null;

  const handleGoToDashboard = () => {
    window.location.href = `/listing-dashboard.html?listing_id=${listingId}`;
  };

  const handleViewListing = () => {
    window.location.href = `/preview-split-lease?listing_id=${listingId}`;
  };

  // Loading state UI
  if (isLoading) {
    return (
      <div style={successModalStyles.overlay}>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={successModalStyles.modal}>
          <div style={successModalStyles.loadingIconWrapper}>
            <div style={successModalStyles.spinner} />
          </div>
          <h2 style={successModalStyles.loadingTitle}>Creating Your Listing...</h2>
          <p style={successModalStyles.loadingSubtitle}>
            Please wait while we set up <span style={successModalStyles.listingName}>"{listingName}"</span>. This may take a moment.
          </p>
        </div>
      </div>
    );
  }

  // Success state UI
  return (
    <div style={successModalStyles.overlay}>
      <div style={successModalStyles.modal}>
        <div style={successModalStyles.iconWrapper}>
          <span style={successModalStyles.icon}>✓</span>
        </div>
        <h2 style={successModalStyles.title}>Listing Created Successfully!</h2>
        <p style={successModalStyles.subtitle}>
          Your listing <span style={successModalStyles.listingName}>"{listingName}"</span> has been submitted and is now pending review.
        </p>
        <button
          style={successModalStyles.button}
          onClick={handleGoToDashboard}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4C1D95')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5B21B6')}
        >
          Go to My Dashboard
        </button>
        <button
          style={{
            ...successModalStyles.button,
            backgroundColor: 'transparent',
            color: '#5B21B6',
            border: '2px solid #5B21B6',
            marginTop: '0.75rem',
          }}
          onClick={handleViewListing}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F5F3FF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Preview Listing
        </button>
        <p style={successModalStyles.secondaryText}>
          You'll be notified once your listing is approved.
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const SelfListingPage: React.FC = () => {
  console.log('🏠 SelfListingPage: Component mounting');

  // Use the local store for all form data management
  const {
    formData,
    lastSaved,
    isDirty,
    stagingStatus,
    errors: storeErrors,
    updateFormData,
    updateSpaceSnapshot,
    updateFeatures,
    updateLeaseStyles,
    updatePricing,
    updateRules,
    updatePhotos,
    updateReview,
    setCurrentSection: setStoreSection,
    markSectionComplete,
    saveDraft,
    stageForSubmission,
    markSubmitting,
    markSubmitted,
    markSubmissionFailed,
    getDebugSummary,
  } = useListingStore();

  const [currentSection, setCurrentSection] = useState(formData.currentSection || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(false);

  // Auth and modal states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Access control state - guests should not access this page
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdListingId, setCreatedListingId] = useState('');

  // Toast notifications
  const { toasts, showToast, removeToast } = useToast();

  // Key to force Header re-render after auth change
  const [headerKey, setHeaderKey] = useState(0);

  // Access control: Redirect guest users to index page
  // This page is accessible to: logged-out users OR host users
  // Guest users should be redirected to the index page
  useEffect(() => {
    const checkAccess = async () => {
      console.log('🔐 SelfListingPage: Checking access control...');

      const loggedIn = await checkAuthStatus();

      if (!loggedIn) {
        // Logged out users can access - allow
        console.log('✅ SelfListingPage: User is logged out - access allowed');
        setIsCheckingAccess(false);
        return;
      }

      // User is logged in - check their type
      // CRITICAL: Use clearOnFailure: false to preserve session if Edge Function fails
      const userData = await validateTokenAndFetchUser({ clearOnFailure: false });
      const userType = userData?.userType;

      console.log('🔐 SelfListingPage: User type:', userType);

      if (isGuest({ userType })) {
        // Guest users should not access this page - redirect to index
        console.log('❌ SelfListingPage: Guest user detected - redirecting to index');
        window.location.href = '/';
        return;
      }

      // Host users (or any other type) can access
      console.log('✅ SelfListingPage: Host user - access allowed');
      setIsCheckingAccess(false);
    };

    checkAccess();
  }, []);

  // Sync current section with store
  useEffect(() => {
    if (formData.currentSection && formData.currentSection !== currentSection) {
      setCurrentSection(formData.currentSection);
    }
  }, [formData.currentSection]);

  // Initialize data: Check URL for listing_id to fetch existing listing from Bubble
  useEffect(() => {
    const initializeFromUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const listingIdFromUrl = urlParams.get('listing_id');
      console.log('🏠 SelfListingPage: Listing ID from URL:', listingIdFromUrl);

      if (listingIdFromUrl) {
        // If there's a listing ID in the URL, fetch it from Bubble API
        setIsLoadingListing(true);
        try {
          console.log('📡 Fetching listing data from Bubble API...');
          const listingData = await getListingById(listingIdFromUrl);
          console.log('✅ Listing data fetched from Bubble:', listingData);

          // Preload the listing name into the form
          // IMPORTANT: Get fresh data from store, not React state, to avoid race condition
          // where formData.spaceSnapshot hasn't been updated with localStorage data yet
          if (listingData?.Name) {
            console.log('✅ Preloading listing name:', listingData.Name);
            const currentStoreData = listingLocalStore.getData();
            updateSpaceSnapshot({
              ...currentStoreData.spaceSnapshot,
              listingName: listingData.Name,
            });
          } else {
            console.warn('⚠️ No listing name found in fetched data');
          }
        } catch (error) {
          console.error('❌ Error fetching listing from Bubble:', error);
        } finally {
          setIsLoadingListing(false);
          console.log('✅ Loading complete');
        }
      } else {
        console.log('📂 No listing ID in URL, checking for pending listing name');

        // Check if there's a pending listing name from the CreateDuplicateListingModal
        const pendingName = localStorage.getItem('pendingListingName');
        if (pendingName) {
          console.log('📝 Found pending listing name:', pendingName);
          const currentStoreData = listingLocalStore.getData();
          updateSpaceSnapshot({
            ...currentStoreData.spaceSnapshot,
            listingName: pendingName,
          });
          // Clean up the temporary storage key after use
          localStorage.removeItem('pendingListingName');
          console.log('✅ Pending listing name applied and cleaned up');
        } else {
          console.log('📂 No pending listing name, using stored draft data');
        }
      }
    };

    initializeFromUrl();
  }, []); // Only run once on mount

  // Log store debug summary on changes
  useEffect(() => {
    console.log('📊 Store Debug Summary:', getDebugSummary());
  }, [formData, getDebugSummary]);

  // Validation functions for each section
  const isSectionComplete = (sectionNum: number): boolean => {
    switch (sectionNum) {
      case 1: // Space Snapshot
        return !!(
          formData.spaceSnapshot.listingName &&
          formData.spaceSnapshot.typeOfSpace &&
          formData.spaceSnapshot.typeOfKitchen &&
          formData.spaceSnapshot.typeOfParking &&
          formData.spaceSnapshot.address.fullAddress &&
          formData.spaceSnapshot.address.validated
        );
      case 2: // Features
        return !!(
          formData.features.amenitiesInsideUnit.length > 0 &&
          formData.features.descriptionOfLodging
        );
      case 3: // Lease Styles
        return !!(
          formData.leaseStyles.rentalType &&
          (formData.leaseStyles.rentalType !== 'Nightly' ||
            (formData.leaseStyles.availableNights &&
             Object.values(formData.leaseStyles.availableNights).some(v => v))) &&
          (formData.leaseStyles.rentalType !== 'Weekly' || formData.leaseStyles.weeklyPattern)
        );
      case 4: // Pricing
        return !!(
          (formData.leaseStyles.rentalType === 'Monthly' && formData.pricing.monthlyCompensation) ||
          (formData.leaseStyles.rentalType === 'Weekly' && formData.pricing.weeklyCompensation) ||
          (formData.leaseStyles.rentalType === 'Nightly' && formData.pricing.nightlyPricing?.oneNightPrice)
        );
      case 5: // Rules
        return !!(
          formData.rules.cancellationPolicy &&
          formData.rules.checkInTime &&
          formData.rules.checkOutTime
        );
      case 6: // Photos
        return formData.photos.photos.length >= formData.photos.minRequired;
      case 7: // Review - always accessible once section 6 is complete
        return true;
      default:
        return false;
    }
  };

  const isSectionLocked = (sectionNum: number): boolean => {
    // Section 1 is always unlocked
    if (sectionNum === 1) return false;

    // Check if the previous section is completed
    const previousSection = sectionNum - 1;
    return !formData.completedSections.includes(previousSection);
  };

  const handleSectionChange = useCallback((section: number) => {
    // Prevent navigation to locked sections
    if (isSectionLocked(section)) {
      return;
    }

    setCurrentSection(section);
    setStoreSection(section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isSectionLocked, setStoreSection]);

  const handleNext = useCallback(() => {
    if (currentSection < 7) {
      // Only mark section as completed if validation passes
      if (isSectionComplete(currentSection)) {
        markSectionComplete(currentSection);
      } else {
        // Section is not complete, show toast notification
        showToast({
          title: 'Incomplete Section',
          content: `Please complete all required fields in Section ${currentSection} before proceeding.`,
          type: 'warning',
          duration: 6000
        });
        return;
      }

      const nextSection = currentSection + 1;
      setCurrentSection(nextSection);
      setStoreSection(nextSection);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentSection, isSectionComplete, markSectionComplete, setStoreSection]);

  const handleBack = useCallback(() => {
    if (currentSection > 1) {
      handleSectionChange(currentSection - 1);
    }
  }, [currentSection, handleSectionChange]);

  // Handle manual save draft
  const handleSaveDraft = useCallback(() => {
    const success = saveDraft();
    if (success) {
      alert('Draft saved successfully!');
    } else {
      alert('Failed to save draft. Please try again.');
    }
  }, [saveDraft]);

  // Handle auth success callback - called after user signs up/logs in via modal
  const handleAuthSuccess = (result: { success: boolean; isNewUser?: boolean }) => {
    console.log('[SelfListingPage] Auth success callback triggered', result);
    setShowAuthModal(false);

    // Show success toast
    const isSignup = result?.isNewUser !== false; // Default to signup message
    showToast(
      isSignup ? 'Account created successfully! Creating your listing...' : 'Logged in successfully! Creating your listing...',
      'success',
      4000
    );

    // User agreed to terms by signing up (modal shows "By signing up or logging in, you agree to...")
    // So we set agreedToTerms to true to pass validation
    updateReview({
      ...formData.review,
      agreedToTerms: true,
    });

    // Force Header to re-render after a brief delay to ensure token is stored
    setTimeout(() => {
      setHeaderKey(prev => prev + 1);
    }, 100);

    if (pendingSubmit) {
      setPendingSubmit(false);

      // Show the success modal immediately with loading state
      // This provides instant feedback after signup
      setIsSubmitting(true);
      setShowSuccessModal(true);

      // Delay submission to ensure auth state is fully updated
      setTimeout(() => {
        proceedWithSubmitAfterAuth();
      }, 300);
    }
  };

  // Submission logic specifically for after auth (modal already shown)
  const proceedWithSubmitAfterAuth = async () => {
    markSubmitting();

    try {
      // Stage the data for submission (validates all fields)
      const { success, errors } = stageForSubmission();

      if (!success) {
        console.error('❌ Validation errors:', errors);
        setShowSuccessModal(false);
        setIsSubmitting(false);
        alert(`Please fix the following errors:\n\n${errors.join('\n')}`);
        return;
      }

      console.log('[SelfListingPage] Submitting listing after auth...');
      console.log('[SelfListingPage] Form data:', formData);

      // Submit to listing table via listingService
      const newListing = await createListing(formData);

      console.log('[SelfListingPage] ✅ Listing created:', newListing);

      // Mark as submitted (clears local storage)
      markSubmitted();

      // Update modal with the listing ID (transitions from loading to success)
      setCreatedListingId(newListing._id);
    } catch (error) {
      console.error('[SelfListingPage] ❌ Error submitting listing:', error);
      markSubmissionFailed(error instanceof Error ? error.message : 'Unknown error');
      // Hide the modal on error
      setShowSuccessModal(false);
      alert(`Error submitting listing: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actual listing submission logic
  const proceedWithSubmit = async () => {
    setIsSubmitting(true);
    markSubmitting();

    try {
      // Stage the data for submission (validates all fields)
      const { success, errors } = stageForSubmission();

      if (!success) {
        console.error('❌ Validation errors:', errors);
        alert(`Please fix the following errors:\n\n${errors.join('\n')}`);
        setIsSubmitting(false);
        return;
      }

      // Show success modal immediately with loading state
      // This provides immediate feedback to the user
      setShowSuccessModal(true);

      console.log('[SelfListingPage] Submitting listing...');
      console.log('[SelfListingPage] Form data:', formData);

      // Submit to listing table via listingService
      const newListing = await createListing(formData);

      console.log('[SelfListingPage] ✅ Listing created:', newListing);

      // Mark as submitted (clears local storage)
      markSubmitted();

      // Update modal with the listing ID (transitions from loading to success)
      setCreatedListingId(newListing._id);
    } catch (error) {
      console.error('[SelfListingPage] ❌ Error submitting listing:', error);
      markSubmissionFailed(error instanceof Error ? error.message : 'Unknown error');
      // Hide the modal on error
      setShowSuccessModal(false);
      alert(`Error submitting listing: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle submit button click - check auth first
  const handleSubmit = async () => {
    console.log('[SelfListingPage] Submit clicked, checking auth status...');

    // Check current auth status
    const loggedIn = await checkAuthStatus();
    setIsLoggedIn(loggedIn);

    if (!loggedIn) {
      // User is not logged in - show auth modal
      console.log('[SelfListingPage] User not logged in, showing auth modal');
      setPendingSubmit(true);
      setShowAuthModal(true);
      return;
    }

    // User is logged in - proceed with submission
    console.log('[SelfListingPage] User is logged in, proceeding with submission');
    proceedWithSubmit();
  };


  const sections = [
    { number: 1, title: 'Address', icon: '📍' },
    { number: 2, title: 'Features', icon: '✨' },
    { number: 3, title: 'Lease Styles', icon: '📅' },
    { number: 4, title: 'Pricing', icon: '💰' },
    { number: 5, title: 'Rules', icon: '📋' },
    { number: 6, title: 'Photos', icon: '📷' },
    { number: 7, title: 'Review and Submit', icon: '✅' }
  ];

  const getSectionStatus = (sectionNum: number) => {
    const isCompleted = formData.completedSections.includes(sectionNum);
    const isActive = sectionNum === currentSection;

    // If section is both completed AND currently active, return combined class
    if (isCompleted && isActive) return 'completed active';
    if (isCompleted) return 'completed';
    if (isActive) return 'active';
    if (isSectionLocked(sectionNum)) return 'locked';
    return 'pending';
  };

  console.log('🎨 SelfListingPage: Rendering component');
  console.log('🎨 Current form data:', formData);
  console.log('🎨 Listing name in form:', formData.spaceSnapshot.listingName);

  // Show loading state while checking access
  if (isCheckingAccess) {
    return (
      <>
        <Header />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <p>Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Shared Header Island - key forces re-render after auth change */}
      {console.log('🎨 Rendering Header component')}
      <Header key={headerKey} autoShowLogin={false} />

      <div className="self-listing-page">
        {/* Page Header */}
        <header className="listing-header">
          <div className="header-content">
            <h1>Create Your Listing</h1>
            <div className="header-actions">
              <button
                className="btn-save-draft"
                onClick={handleSaveDraft}
                disabled={!isDirty && stagingStatus !== 'failed'}
              >
                {isDirty ? 'Save Draft' : lastSaved ? 'Saved' : 'Save Draft'}
              </button>
              <button className="btn-help">Need Help?</button>
            </div>
            {lastSaved && (
              <span className="last-saved-indicator">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </header>

      <div className="listing-container">
        {/* Navigation Sidebar */}
        <aside className="navigation-sidebar">
          <div className="progress-indicator">
            <div className="progress-circle">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path
                  className="circle-bg"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${(Math.min(currentSection, 6) / 6) * 100}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="progress-text">
                {Math.min(currentSection, 6)}/6
              </div>
            </div>
            <p className="progress-label">Sections Complete</p>
          </div>

          <nav className="section-nav">
            {sections.map((section) => {
              const status = getSectionStatus(section.number);
              const isLocked = status === 'locked';

              return (
                <button
                  key={section.number}
                  className={`nav-item ${status}`}
                  onClick={() => handleSectionChange(section.number)}
                  disabled={isLocked}
                  title={isLocked ? 'Complete previous section to unlock' : ''}
                >
                  <div className="nav-icon">{section.icon}</div>
                  <div className="nav-content">
                    <div className="nav-number">
                      {section.number <= 6 ? `Section ${section.number}` : 'Final Step'}
                    </div>
                    <div className="nav-title">{section.title}</div>
                  </div>
                  {formData.completedSections.includes(section.number) && (
                    <div className="nav-check">✓</div>
                  )}
                  {isLocked && (
                    <div className="nav-lock">🔒</div>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {currentSection === 1 && (
            <Section1SpaceSnapshot
              data={formData.spaceSnapshot}
              onChange={updateSpaceSnapshot}
              onNext={handleNext}
              isLoadingInitialData={isLoadingListing}
            />
          )}

          {currentSection === 2 && (
            <Section2Features
              data={formData.features}
              onChange={updateFeatures}
              onNext={handleNext}
              onBack={handleBack}
              zipCode={formData.spaceSnapshot.address.zip}
              showToast={showToast}
            />
          )}

          {currentSection === 3 && (
            <Section3LeaseStyles
              data={formData.leaseStyles}
              onChange={updateLeaseStyles}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentSection === 4 && (
            <Section4Pricing
              data={formData.pricing}
              rentalType={formData.leaseStyles.rentalType}
              onChange={updatePricing}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentSection === 5 && (
            <Section5Rules
              data={formData.rules}
              rentalType={formData.leaseStyles.rentalType}
              onChange={updateRules}
              onNext={handleNext}
              onBack={handleBack}
              showToast={showToast}
            />
          )}

          {currentSection === 6 && (
            <Section6Photos
              data={formData.photos}
              onChange={updatePhotos}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentSection === 7 && (
            <Section7Review
              formData={formData}
              reviewData={formData.review}
              onChange={updateReview}
              onSubmit={handleSubmit}
              onBack={handleBack}
              onNavigateToSection={handleSectionChange}
              isSubmitting={isSubmitting}
            />
          )}
        </main>
      </div>
      </div>

      {/* Auth Modal for logged-out users */}
      <SignUpLoginModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingSubmit(false);
        }}
        initialView="signup"
        defaultUserType="host"
        skipReload={true}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Success Modal - shows loading state while creating, success state when done */}
      <SuccessModal
        isOpen={showSuccessModal}
        listingId={createdListingId}
        listingName={formData.spaceSnapshot.listingName}
        isLoading={isSubmitting && !createdListingId}
      />
    </>
  );
};
