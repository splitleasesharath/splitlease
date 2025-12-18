import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { supabase } from '../../lib/supabase.js';

// FAQ IDs to display on this page
const FAQ_IDS = [
  '1598576324794x693327507784140000', // Tenant's rights protection
  '1585485787198x865624488127564500', // Cancellation policy
  '1621605643737x217621659116098430', // Payment after booking
  '1585860980462x241805081013604540', // Traveler verification
];

export default function HostGuaranteePage() {
  const [faqs, setFaqs] = useState([]);
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFaqs() {
      try {
        const { data, error } = await supabase
          .schema('reference_table')
          .from('zat_faq')
          .select('_id, Question, Answer')
          .in('_id', FAQ_IDS);

        if (error) throw error;

        // Sort FAQs to match the order of FAQ_IDS
        const sortedFaqs = FAQ_IDS.map(id =>
          data.find(faq => faq._id === id)
        ).filter(Boolean);

        setFaqs(sortedFaqs);
      } catch (err) {
        console.error('Error loading FAQs:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadFaqs();
  }, []);

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const handleKeyPress = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleAccordion(index);
    }
  };

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="guarantee-hero-section">
        <div className="guarantee-hero-container">
          <div className="guarantee-hero-badge">
            Property Protection
          </div>
          <h1 className="guarantee-hero-title">
            Split Lease<br />
            <span className="highlight">Host Guarantee</span>
          </h1>
          <p className="guarantee-hero-subtitle">
            Split Lease's Host Guarantee matches industry leaders. If a guest damages your place or belongings during a stay and doesn't reimburse you, you may be protected with up to <strong>$1,000,000 USD</strong> property damage protection.
          </p>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="guarantee-comparison-section">
        <div className="gradient-blob gradient-blob-1"></div>
        <div className="gradient-blob gradient-blob-2"></div>

        <div className="guarantee-comparison-container">
          <div className="guarantee-comparison-header">
            <h2 className="guarantee-comparison-title">What's in and what's out?</h2>
          </div>

          {/* Comparison Table */}
          <div className="comparison-table">
            {/* Table Header */}
            <div className="comparison-header-row">
              <div className="comparison-header-cell feature-cell"></div>
              <div className="comparison-header-cell provider-cell">
                <div className="provider-logo">
                  <span className="provider-name split-lease">Split Lease</span>
                </div>
              </div>
              <div className="comparison-header-cell provider-cell">
                <div className="provider-logo">
                  <span className="provider-name airbnb">Airbnb</span>
                </div>
              </div>
            </div>

            {/* Protected Section */}
            <div className="comparison-section-header">
              <span className="section-icon protected">✓</span>
              Host Guarantee may protect:
            </div>

            {/* Damage to place */}
            <div className="comparison-row">
              <div className="comparison-cell feature-cell">
                Damage to your place caused by guests
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon included">✓</span>
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon included">✓</span>
              </div>
            </div>

            {/* Damage to belongings */}
            <div className="comparison-row">
              <div className="comparison-cell feature-cell">
                Damage to your belongings caused by guests
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon included">✓</span>
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon included">✓</span>
              </div>
            </div>

            {/* Matches terms */}
            <div className="comparison-row">
              <div className="comparison-cell feature-cell">
                Matches Airbnb's Host Guarantee Terms
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon included">✓</span>
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon included">✓</span>
              </div>
            </div>

            {/* Not Protected Section */}
            <div className="comparison-section-header not-protected">
              <span className="section-icon not-protected">✗</span>
              Host Guarantee doesn't protect:
            </div>

            {/* Theft of cash */}
            <div className="comparison-row excluded">
              <div className="comparison-cell feature-cell">
                Theft of cash and securities (Eg: savings bonds, stock certificates)
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon excluded">✗</span>
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon excluded">✗</span>
              </div>
            </div>

            {/* Ordinary wear */}
            <div className="comparison-row excluded">
              <div className="comparison-cell feature-cell">
                Damage from ordinary wear and tear
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon excluded">✗</span>
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon excluded">✗</span>
              </div>
            </div>

            {/* Bodily injury */}
            <div className="comparison-row excluded">
              <div className="comparison-cell feature-cell">
                Bodily injury or property damage to guests or others
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon excluded">✗</span>
              </div>
              <div className="comparison-cell check-cell">
                <span className="check-icon excluded">✗</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* More Info Section */}
      <section className="guarantee-info-section">
        <div className="outlined-bubble outlined-bubble-1"></div>
        <div className="outlined-bubble outlined-bubble-2"></div>

        <div className="guarantee-info-container">
          <div className="guarantee-info-header">
            <h2 className="guarantee-info-title">Need more info?</h2>
          </div>

          <div className="guarantee-info-grid">
            {/* Split Lease TOS */}
            <div className="guarantee-info-card">
              <div className="guarantee-info-card-header">
                <span className="split-lease-badge">Our Policy</span>
                <h3 className="guarantee-info-card-title">Split Lease Host Guarantee Full TOS</h3>
              </div>
              <p className="guarantee-info-card-description">
                Split Lease Host Guarantee is subject to host guarantee terms and conditions
              </p>
              <a href="/policies?tab=host-guarantee" className="guarantee-info-link">
                Read Full Terms
                <svg viewBox="0 0 24 24" fill="none" className="link-arrow">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>

            {/* Airbnb TOS */}
            <div className="guarantee-info-card airbnb-card">
              <div className="guarantee-info-card-header">
                <span className="compare-badge">Compare to Airbnb</span>
                <h3 className="guarantee-info-card-title">Airbnb Host Guarantee Full TOS</h3>
              </div>
              <p className="guarantee-info-card-description">
                View Airbnb's official Host Guarantee terms for comparison
              </p>
              <a
                href="https://www.airbnb.com/help/article/279"
                target="_blank"
                rel="noopener noreferrer"
                className="guarantee-info-link external"
              >
                View Airbnb Terms
                <svg viewBox="0 0 24 24" fill="none" className="link-arrow">
                  <path d="M7 17L17 7M17 7H7M17 7V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="guarantee-faq-section">
        <div className="circle-accent circle-accent-1"></div>
        <div className="circle-accent circle-accent-2"></div>

        <div className="guarantee-faq-container">
          <div className="guarantee-faq-header">
            <h2 className="guarantee-faq-title">Frequently Asked Questions</h2>
          </div>

          <div className="guarantee-faq-accordion">
            {isLoading ? (
              <div className="faq-loading">Loading questions...</div>
            ) : faqs.length === 0 ? (
              <div className="faq-empty">No FAQs available.</div>
            ) : (
              faqs.map((faq, index) => {
                const isActive = activeAccordion === index;
                return (
                  <div
                    key={faq._id}
                    className={`guarantee-accordion-item ${isActive ? 'active' : ''}`}
                  >
                    <div
                      className="guarantee-accordion-header"
                      tabIndex="0"
                      role="button"
                      aria-expanded={isActive}
                      onClick={() => toggleAccordion(index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                    >
                      <span className="guarantee-accordion-icon"></span>
                      <h3>{faq.Question}</h3>
                    </div>
                    <div className="guarantee-accordion-content">
                      <div className="guarantee-accordion-content-inner">
                        <p>{faq.Answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="guarantee-faq-cta">
            <a href="/faq?section=hosts" className="cta-button cta-secondary">
              View All Host FAQs
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
