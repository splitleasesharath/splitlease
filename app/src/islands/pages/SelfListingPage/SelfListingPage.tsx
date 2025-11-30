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
import { createListing } from '../../../lib/listingService';
import './styles/SelfListingPage.css';

export const SelfListingPage: React.FC = () => {
  console.log('🏠 SelfListingPage: Component mounting');

  const [formData, setFormData] = useState<ListingFormData>(DEFAULT_LISTING_DATA);
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingListing, setIsLoadingListing] = useState(false);

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

  const handleSubmit = async () => {
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

      // Show success message
      alert('Listing submitted successfully! Your listing has been saved and is pending review.');

      // Redirect to view the listing (using the new UUID)
      window.location.href = `/host-success.html?listing_id=${newListing.id}`;
    } catch (error) {
      console.error('[SelfListingPage] ❌ Error submitting listing:', error);
      alert(`Error submitting listing: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
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
    </>
  );
};
