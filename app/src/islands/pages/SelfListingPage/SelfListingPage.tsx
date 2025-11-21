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
import './styles/SelfListingPage.css';

export const SelfListingPage: React.FC = () => {
  const [formData, setFormData] = useState<ListingFormData>(DEFAULT_LISTING_DATA);
  const [currentSection, setCurrentSection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-save to localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('selfListingDraft');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setFormData(parsed);
        setCurrentSection(parsed.currentSection || 1);
      } catch (error) {
        console.error('Error loading saved draft:', error);
      }
    }
  }, []);

  useEffect(() => {
    // Save draft every time formData changes
    const dataToSave = { ...formData, currentSection };
    localStorage.setItem('selfListingDraft', JSON.stringify(dataToSave));
  }, [formData, currentSection]);

  const handleSectionChange = (section: number) => {
    setCurrentSection(section);
    setFormData({ ...formData, currentSection: section });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentSection < 7) {
      const completedSections = [...new Set([...formData.completedSections, currentSection])];
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
      // Here you would make an API call to submit the listing
      // For now, we'll simulate with a timeout
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('Submitting listing:', formData);

      // Mark as submitted
      setFormData({ ...formData, isSubmitted: true, isDraft: false });

      // Clear draft from localStorage
      localStorage.removeItem('selfListingDraft');

      // Show success message
      alert('Listing submitted successfully! You will receive a confirmation email shortly.');

      // Optionally redirect to a success page
      // window.location.href = '/listing-submitted';
    } catch (error) {
      console.error('Error submitting listing:', error);
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
    return 'pending';
  };

  return (
    <div className="self-listing-page">
      {/* Header */}
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
            {sections.map((section) => (
              <button
                key={section.number}
                className={`nav-item ${getSectionStatus(section.number)}`}
                onClick={() => handleSectionChange(section.number)}
              >
                <div className="nav-icon">{section.icon}</div>
                <div className="nav-content">
                  <div className="nav-number">Section {section.number}</div>
                  <div className="nav-title">{section.title}</div>
                </div>
                {formData.completedSections.includes(section.number) && (
                  <div className="nav-check">✓</div>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {currentSection === 1 && (
            <Section1SpaceSnapshot
              data={formData.spaceSnapshot}
              onChange={(data) => setFormData({ ...formData, spaceSnapshot: data })}
              onNext={handleNext}
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
  );
};
