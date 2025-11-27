import React, { useState, useEffect, useCallback } from 'react';
import { Section1SpaceSnapshot } from './sections/Section1SpaceSnapshot';
import { Section2Features } from './sections/Section2Features';
import { Section3LeaseStyles } from './sections/Section3LeaseStyles';
import { Section4Pricing } from './sections/Section4Pricing';
import { Section5Rules } from './sections/Section5Rules';
import { Section6Photos } from './sections/Section6Photos';
import { Section7Review } from './sections/Section7Review';
import type { ListingFormData } from './types/listing.types';
import { useListingStore } from './store';
import Header from '../../shared/Header';
import Footer from '../../shared/Footer';
import { getListingById } from '../../../lib/bubbleAPI';
import './styles/SelfListingPage.css';

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
      const listingId = urlParams.get('listing_id');
      console.log('🏠 SelfListingPage: Listing ID from URL:', listingId);

      if (listingId) {
        // If there's a listing ID in the URL, fetch it from Bubble API
        setIsLoadingListing(true);
        try {
          console.log('📡 Fetching listing data from Bubble API...');
          const listingData = await getListingById(listingId);
          console.log('✅ Listing data fetched from Bubble:', listingData);

          // Preload the listing name into the form
          if (listingData?.Name) {
            console.log('✅ Preloading listing name:', listingData.Name);
            updateSpaceSnapshot({
              ...formData.spaceSnapshot,
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
        console.log('📂 No listing ID in URL, using stored draft data');
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
        // Section is not complete, show alert
        alert(`Please complete all required fields in Section ${currentSection} before proceeding.`);
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

  const handleSubmit = async () => {
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

      console.log('📦 Data staged for submission:', formData);
      console.log('📊 Store debug:', getDebugSummary());

      // TODO: Replace this mock with actual Edge Function call to Bubble
      // The staged data is available via getStagedData() and ready to be
      // transformed and sent to the bubble-proxy Edge Function
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mark as submitted (clears local storage)
      markSubmitted();

      // Show success message
      alert('Listing submitted successfully! You will receive a confirmation email shortly.');

      // Optionally redirect to a success page
      // window.location.href = '/listing-submitted';
    } catch (error) {
      console.error('Error submitting listing:', error);
      markSubmissionFailed(error instanceof Error ? error.message : 'Unknown error');
      alert('Error submitting listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
    if (formData.completedSections.includes(sectionNum)) return 'completed';
    if (sectionNum === currentSection) return 'active';
    if (isSectionLocked(sectionNum)) return 'locked';
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
                  strokeDasharray={`${(formData.completedSections.length / 7) * 100}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="progress-text">
                {formData.completedSections.length}/{sections.length}
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
                    <div className="nav-number">Section {section.number}</div>
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
              isSubmitting={isSubmitting}
            />
          )}
        </main>
      </div>
      </div>

      {/* Shared Footer Island */}
      {console.log('🎨 Rendering Footer component')}
      <Footer />
    </>
  );
};
