import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { supabase } from '../../lib/supabase.js';
// FAQ Page with inquiry modal

export default function FAQPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [faqs, setFaqs] = useState({ general: [], travelers: [], hosts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openQuestionId, setOpenQuestionId] = useState(null);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', inquiry: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const section = params.get('section');
    const question = params.get('question');

    // Set active tab based on section parameter
    if (section) {
      const sectionMap = {
        'travelers': 'travelers',
        'hosts': 'hosts',
        'general': 'general',
        'guest': 'travelers', // Alias
        'host': 'hosts' // Alias
      };
      const mappedSection = sectionMap[section.toLowerCase()];
      if (mappedSection) {
        setActiveTab(mappedSection);
      }
    }

    // Store question ID to open after FAQs load
    if (question) {
      setOpenQuestionId(question.toLowerCase());
    }

    loadFAQs();
  }, []);

  async function loadFAQs() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('zat_faq')
        .select('_id, Question, Answer, Category, sub-category')
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

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    const { name, email, inquiry } = inquiryForm;

    // Validate form
    if (!name || !email || !inquiry) {
      setSubmitError('Please fill in all fields');
      setSubmitting(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setSubmitError('Please enter a valid email address');
      setSubmitting(false);
      return;
    }

    try {
      // Send inquiry to serverless function
      const response = await fetch('/api/faq-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, inquiry })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send inquiry');
      }

      setSubmitSuccess(true);
      setInquiryForm({ name: '', email: '', inquiry: '' });

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowInquiryModal(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Error sending inquiry:', err);
      setSubmitError(err.message || 'Failed to send inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = (field, value) => {
    setInquiryForm(prev => ({ ...prev, [field]: value }));
  };

  const openInquiryModal = (e) => {
    e.preventDefault();
    setShowInquiryModal(true);
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const closeInquiryModal = () => {
    setShowInquiryModal(false);
    setInquiryForm({ name: '', email: '', inquiry: '' });
    setSubmitError(null);
    setSubmitSuccess(false);
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
              <FAQContent faqs={faqs.general} openQuestionId={activeTab === 'general' ? openQuestionId : null} />
            </div>
            <div className={`tab-content ${activeTab === 'travelers' ? 'active' : ''}`}>
              <FAQContent faqs={faqs.travelers} openQuestionId={activeTab === 'travelers' ? openQuestionId : null} />
            </div>
            <div className={`tab-content ${activeTab === 'hosts' ? 'active' : ''}`}>
              <FAQContent faqs={faqs.hosts} openQuestionId={activeTab === 'hosts' ? openQuestionId : null} />
            </div>
          </>
        )}
      </main>

      {/* Bottom CTA */}
      <section className="bottom-cta">
        <a href="#" className="cta-link" onClick={openInquiryModal}>
          Can't find the answer to your question?
        </a>
      </section>

      {/* Inquiry Modal */}
      {showInquiryModal && (
        <div className="modal-overlay" onClick={closeInquiryModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeInquiryModal} aria-label="Close modal">
              &times;
            </button>

            <h2 className="modal-title">Ask Us a Question</h2>
            <p className="modal-subtitle">We'll get back to you as soon as possible</p>

            {submitSuccess ? (
              <div className="success-message">
                <div className="success-icon">✓</div>
                <p>Thank you! Your inquiry has been sent successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleInquirySubmit} className="inquiry-form">
                <div className="form-group">
                  <label htmlFor="inquiry-name">Name *</label>
                  <input
                    type="text"
                    id="inquiry-name"
                    value={inquiryForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    placeholder="Enter your name"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="inquiry-email">Email *</label>
                  <input
                    type="email"
                    id="inquiry-email"
                    value={inquiryForm.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="inquiry-text">Your Question *</label>
                  <textarea
                    id="inquiry-text"
                    value={inquiryForm.inquiry}
                    onChange={(e) => handleFormChange('inquiry', e.target.value)}
                    placeholder="Tell us what you'd like to know..."
                    rows="5"
                    required
                    disabled={submitting}
                  />
                </div>

                {submitError && (
                  <div className="error-message-form">{submitError}</div>
                )}

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

// FAQ Content Component - Renders grouped FAQs with accordion
function FAQContent({ faqs, openQuestionId }) {
  const [activeAccordion, setActiveAccordion] = useState(null);

  // Open specific question when openQuestionId is provided
  useEffect(() => {
    if (openQuestionId && faqs && faqs.length > 0) {
      // Find the index of the question that matches the ID or text
      const questionIndex = faqs.findIndex(faq =>
        // First try to match by exact _id
        (faq._id && faq._id.toString() === openQuestionId) ||
        // Then try to match by question text
        faq.Question.toLowerCase().includes(openQuestionId) ||
        faq.Question.toLowerCase().replace(/[^a-z0-9]/g, '').includes(openQuestionId.replace(/[^a-z0-9]/g, ''))
      );

      if (questionIndex !== -1) {
        setActiveAccordion(questionIndex);
        // Scroll to the question after a short delay
        setTimeout(() => {
          const element = document.querySelector(`[data-question-index="${questionIndex}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    }
  }, [openQuestionId, faqs]);

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
                data-question-index={currentIndex}
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
