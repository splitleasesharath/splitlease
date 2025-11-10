import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { supabase } from '../../lib/supabase.js';

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [faqs, setFaqs] = useState({ general: [], travelers: [], hosts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFAQs();
  }, []);

  async function loadFAQs() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('zat_faq')
        .select('Question, Answer, Category, sub-category')
        .order('Category', { ascending: true })
        .order('sub-category', { ascending: true });

      if (fetchError) throw fetchError;

      // Map tab names to database Category values
      const categoryMapping = {
        'general': 'General',
        'travelers': 'Guest',
        'hosts': 'Host'
      };

      // Group FAQs by category
      const grouped = {
        general: [],
        travelers: [],
        hosts: []
      };

      data.forEach(faq => {
        for (const [tabName, dbCategory] of Object.entries(categoryMapping)) {
          if (faq.Category === dbCategory) {
            grouped[tabName].push(faq);
            break;
          }
        }
      });

      setFaqs(grouped);
    } catch (err) {
      console.error('Error loading FAQs:', err);
      setError('Unable to load FAQs. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const handleTabClick = (tabName) => {
    setActiveTab(tabName);
    // Scroll to FAQ container smoothly
    const container = document.querySelector('.faq-container');
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="hero">
        <h1 className="hero-title">Hi there! How can we help you?</h1>
        <p className="hero-subtitle">Select one of our pre-sorted categories</p>
      </section>

      {/* Tab Navigation */}
      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => handleTabClick('general')}
            role="tab"
            aria-selected={activeTab === 'general'}
          >
            General Questions
          </button>
          <button
            className={`tab ${activeTab === 'travelers' ? 'active' : ''}`}
            onClick={() => handleTabClick('travelers')}
            role="tab"
            aria-selected={activeTab === 'travelers'}
          >
            For Travelers
          </button>
          <button
            className={`tab ${activeTab === 'hosts' ? 'active' : ''}`}
            onClick={() => handleTabClick('hosts')}
            role="tab"
            aria-selected={activeTab === 'hosts'}
          >
            For Hosts
          </button>
        </div>
      </div>

      {/* FAQ Content */}
      <main className="faq-container">
        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading FAQs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={loadFAQs} className="retry-btn">Retry</button>
          </div>
        )}

        {/* FAQ Content - Only show when not loading and no error */}
        {!loading && !error && (
          <>
            <div className={`tab-content ${activeTab === 'general' ? 'active' : ''}`}>
              <FAQContent faqs={faqs.general} />
            </div>
            <div className={`tab-content ${activeTab === 'travelers' ? 'active' : ''}`}>
              <FAQContent faqs={faqs.travelers} />
            </div>
            <div className={`tab-content ${activeTab === 'hosts' ? 'active' : ''}`}>
              <FAQContent faqs={faqs.hosts} />
            </div>
          </>
        )}
      </main>

      {/* Bottom CTA */}
      <section className="bottom-cta">
        <a href="#" className="cta-link">Can't find the answer to your question?</a>
      </section>

      <Footer />
    </>
  );
}

// FAQ Content Component - Renders grouped FAQs with accordion
function FAQContent({ faqs }) {
  const [activeAccordion, setActiveAccordion] = useState(null);

  if (!faqs || faqs.length === 0) {
    return <p style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No FAQs available in this category.</p>;
  }

  // Group FAQs by sub-category
  const faqsBySubCategory = {};
  faqs.forEach(faq => {
    const subCat = faq['sub-category'] || 'General';
    if (!faqsBySubCategory[subCat]) {
      faqsBySubCategory[subCat] = [];
    }
    faqsBySubCategory[subCat].push(faq);
  });

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const handleKeyPress = (e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleAccordion(index);
    }
  };

  let globalIndex = 0;

  return (
    <>
      {Object.entries(faqsBySubCategory).map(([subCategory, subCategoryFaqs]) => (
        <section key={subCategory} className="faq-section">
          <h2 className="section-title">{subCategory}</h2>
          {subCategoryFaqs.map((faq) => {
            const currentIndex = globalIndex++;
            const isActive = activeAccordion === currentIndex;

            return (
              <div
                key={currentIndex}
                className={`accordion-item ${isActive ? 'active' : ''}`}
              >
                <div
                  className="accordion-header"
                  tabIndex="0"
                  role="button"
                  aria-expanded={isActive}
                  onClick={() => toggleAccordion(currentIndex)}
                  onKeyPress={(e) => handleKeyPress(e, currentIndex)}
                >
                  <h3>{faq.Question}</h3>
                  <span className="accordion-icon"></span>
                </div>
                <div className="accordion-content">
                  <p>{faq.Answer}</p>
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}
