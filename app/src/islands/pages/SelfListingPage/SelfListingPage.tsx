import React, { useState, useEffect } from 'react';
import { Section1SpaceSnapshot } from './sections/Section1SpaceSnapshot';
import { Section2Features } from './sections/Section2Features';
import { Section3LeaseStyles } from './sections/Section3LeaseStyles';
import { Section4Pricing } from './sections/Section4Pricing';
import { Section5Rules } from './sections/Section5Rules';
import { Section6Photos } from './sections/Section6Photos';
import { Section7Review } from './sections/Section7Review';
import type { ListingFormData } from './types/listing.types';
import { DEFAULT_LISTING_DATA } from './types/listing.types';
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import SignUpLoginModal from '../../shared/SignUpLoginModal';
import { createListing } from '../../../lib/listingService';
import { checkAuthStatus } from '../../../lib/auth';
import './styles/SelfListingPage.css';

// ============================================================================
// Success Modal Component
// ============================================================================

interface SuccessModalProps {
  isOpen: boolean;
  listingId: string;
  listingName: string;
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background-color 0.15s ease',
  },
  secondaryText: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    marginTop: '1rem',
  },
};

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, listingId, listingName }) => {
  if (!isOpen) return null;

  const handleViewListing = () => {
    window.location.href = `/view-split-lease.html?listing_id=${listingId}`;
  };

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
          onClick={handleViewListing}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4C1D95')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#5B21B6')}
        >
          View Your Listing
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

  const [formData, setFormData] = useState<ListingFormData>(DEFAULT_LISTING_DATA);
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(false);

  // Auth and modal states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdListingId, setCreatedListingId] = useState('');

  // Initialize data: Load from localStorage draft or pending listing name
  // TODO: Re-add listing_id URL parameter handling when needed
  useEffect(() => {
    const initializeData = async () => {
      console.log('🔄 SelfListingPage: Initializing data...');

      // Check for pending listing name from CreateDuplicateListingModal
      const pendingListingName = localStorage.getItem('pendingListingName');
      if (pendingListingName) {
        console.log('📝 Found pending listing name:', pendingListingName);
        // Clear it so it's only used once
        localStorage.removeItem('pendingListingName');
        // Set the listing name in the form
        setFormData(prevData => ({
          ...prevData,
          spaceSnapshot: {
            ...prevData.spaceSnapshot,
            listingName: pendingListingName
          }
        }));
        console.log('✅ Preloaded listing name from modal');
        return;
      }

      // Load from localStorage draft
      console.log('📂 Checking localStorage for draft...');
      const savedData = localStorage.getItem('selfListingDraft');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          console.log('📂 Loaded draft from localStorage:', parsed);
          setFormData(parsed);
          setCurrentSection(parsed.currentSection || 1);
        } catch (error) {
          console.error('❌ Error loading saved draft:', error);
        }
      } else {
        console.log('📂 No draft found in localStorage, starting fresh');
      }
    };

    initializeData();
  }, []);

  useEffect(() => {
    // Save draft every time formData changes
    const dataToSave = { ...formData, currentSection };
    localStorage.setItem('selfListingDraft', JSON.stringify(dataToSave));
  }, [formData, currentSection]);

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

  const handleSectionChange = (section: number) => {
    // Prevent navigation to locked sections
    if (isSectionLocked(section)) {
      return;
    }

    setCurrentSection(section);
    setFormData({ ...formData, currentSection: section });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentSection < 7) {
      // Only mark section as completed if validation passes
      let completedSections = formData.completedSections;

      if (isSectionComplete(currentSection)) {
        completedSections = [...new Set([...formData.completedSections, currentSection])];
      } else {
        // Section is not complete, show alert
        alert(`Please complete all required fields in Section ${currentSection} before proceeding.`);
        return;
      }

      const nextSection = currentSection + 1;
      setFormData({ ...formData, completedSections, currentSection: nextSection });
      setCurrentSection(nextSection);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentSection > 1) {
      handleSectionChange(currentSection - 1);
    }
  };

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await checkAuthStatus();
      setIsLoggedIn(loggedIn);
      console.log('[SelfListingPage] Auth status:', loggedIn ? 'logged in' : 'logged out');
    };
    checkAuth();
  }, []);

  // Handle auth success - if there's a pending submit, proceed with it
  const handleAuthSuccess = async () => {
    console.log('[SelfListingPage] Auth success callback triggered');
    setIsLoggedIn(true);
    setShowAuthModal(false);

    // If user was trying to submit, proceed with the submission
    if (pendingSubmit) {
      setPendingSubmit(false);
      // Small delay to ensure auth state is fully updated
      setTimeout(() => {
        proceedWithSubmit();
      }, 100);
    }
  };

  // Actual listing submission logic
  const proceedWithSubmit = async () => {
    setIsSubmitting(true);
    try {
      console.log('[SelfListingPage] Submitting listing to Supabase...');
      console.log('[SelfListingPage] Form data:', formData);

      // Submit to listing_trial table via listingService
      const newListing = await createListing(formData);

      console.log('[SelfListingPage] ✅ Listing created:', newListing);

      // Mark as submitted in local state
      setFormData({ ...formData, isSubmitted: true, isDraft: false });

      // Clear draft from localStorage
      localStorage.removeItem('selfListingDraft');

      // Show success modal
      setCreatedListingId(newListing.id);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('[SelfListingPage] ❌ Error submitting listing:', error);
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
    const isLocked = isSectionLocked(sectionNum);

    // Return combined status classes for completed + active sections
    if (isCompleted && isActive) return 'completed active';
    if (isCompleted) return 'completed';
    if (isActive) return 'active';
    if (isLocked) return 'locked';
    return 'pending';
  };

  console.log('🎨 SelfListingPage: Rendering component');
  console.log('🎨 Current form data:', formData);
  console.log('🎨 Listing name in form:', formData.spaceSnapshot.listingName);

  return (
    <>
      {/* Shared Header Island */}
      {console.log('🎨 Rendering Header component')}
      <Header />

      <div className="self-listing-page">
        {/* Page Header */}
        <header className="listing-header">
          <div className="header-content">
            <h1>Create Your Listing</h1>
            <div className="header-actions">
              <button className="btn-save-draft">Save Draft</button>
              <button className="btn-help">Need Help?</button>
            </div>
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
                  strokeDasharray={`${(formData.completedSections.filter(s => s <= 6).length / 6) * 100}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="progress-text">
                {formData.completedSections.filter(s => s <= 6).length}/6
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
              onChange={(data) => setFormData({ ...formData, spaceSnapshot: data })}
              onNext={handleNext}
              isLoadingInitialData={isLoadingListing}
            />
          )}

          {currentSection === 2 && (
            <Section2Features
              data={formData.features}
              onChange={(data) => setFormData({ ...formData, features: data })}
              onNext={handleNext}
              onBack={handleBack}
              zipCode={formData.spaceSnapshot.address.zip}
            />
          )}

          {currentSection === 3 && (
            <Section3LeaseStyles
              data={formData.leaseStyles}
              onChange={(data) => setFormData({ ...formData, leaseStyles: data })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentSection === 4 && (
            <Section4Pricing
              data={formData.pricing}
              rentalType={formData.leaseStyles.rentalType}
              onChange={(data) => setFormData({ ...formData, pricing: data })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentSection === 5 && (
            <Section5Rules
              data={formData.rules}
              rentalType={formData.leaseStyles.rentalType}
              onChange={(data) => setFormData({ ...formData, rules: data })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentSection === 6 && (
            <Section6Photos
              data={formData.photos}
              onChange={(data) => setFormData({ ...formData, photos: data })}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentSection === 7 && (
            <Section7Review
              formData={formData}
              reviewData={formData.review}
              onChange={(data) => setFormData({ ...formData, review: data })}
              onSubmit={handleSubmit}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </main>
      </div>
      </div>

      {/* Shared Footer Island */}
      {console.log('🎨 Rendering Footer component')}
      <Footer />

      {/* Auth Modal for logged-out users */}
      <SignUpLoginModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingSubmit(false);
        }}
        initialView="signup"
        defaultUserType="host"
        showUserTypeSelector={false}
        skipReload={true}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        listingId={createdListingId}
        listingName={formData.spaceSnapshot.listingName}
      />
    </>
  );
};
