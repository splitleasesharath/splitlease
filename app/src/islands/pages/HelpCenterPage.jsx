import { useState, useEffect } from 'react';
import { User, Users, Info, LifeBuoy, BookOpen, FileText, Search, HelpCircle, ChevronRight, ArrowRight } from 'lucide-react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { helpCenterCategories, searchHelpCenter } from '../../data/helpCenterData.js';
import '../../styles/help-center.css';
import '../../styles/faq.css'; // For inquiry modal styles

const iconMap = {
  User,
  Users,
  Info,
  LifeBuoy,
  BookOpen
};

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Inquiry modal state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ name: '', email: '', inquiry: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      setIsSearching(true);
      const results = searchHelpCenter(searchQuery);
      setSearchResults(results);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
  }, [searchQuery]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // Already handled by useEffect
    }
  };

  // Inquiry modal handlers
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

      // Handle non-OK responses (404, 500, etc.)
      if (!response.ok) {
        let errorMessage = 'Failed to send inquiry';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      await response.json();

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

      {/* Search Banner */}
      <section className="hc-search-banner">
        <div className="hc-container">
          <h1>How can we help you?</h1>
          <p>Search for answers or browse our help articles below</p>
          <div className="hc-search-container">
            <div className="hc-search-input-wrapper">
              <Search className="hc-search-icon" />
              <input
                type="text"
                className="hc-search-input"
                placeholder="Search for help..."
                aria-label="Search help articles"
                value={searchQuery}
                onChange={handleSearch}
                onKeyPress={handleKeyPress}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="hc-container">
        {isSearching ? (
          /* Search Results */
          <div className="hc-search-results">
            <div className="hc-search-results-header">
              <h2>Search Results</h2>
              <p>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"</p>
            </div>

            {searchResults.length > 0 ? (
              <ul className="hc-article-list">
                {searchResults.map((article) => (
                  <li key={article.id} className="hc-article-list-item">
                    <a href={`/help-center-articles/${article.categoryId}/${article.slug}.html`}>
                      <ArrowRight />
                      <div>
                        <strong>{article.title}</strong>
                        <span style={{ display: 'block', fontSize: '12px', color: '#999', marginTop: '4px' }}>
                          {article.categoryTitle} &gt; {article.sectionTitle}
                        </span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="hc-no-results">
                <Search />
                <h3>No results found</h3>
                <p>Try different keywords or browse categories below</p>
              </div>
            )}
          </div>
        ) : (
          /* Categories Grid */
          <div className="hc-categories-grid">
            {helpCenterCategories.map((category) => {
              const Icon = iconMap[category.icon] || HelpCircle;
              // Redirect guests and hosts to FAQ page with section selected
              const getCategoryHref = (cat) => {
                if (cat.slug === 'guests') return 'https://split.lease/faq?section=travelers';
                if (cat.slug === 'hosts') return '/faq?section=hosts';
                return `/help-center/${cat.slug}`;
              };
              return (
                <a
                  key={category.id}
                  href={getCategoryHref(category)}
                  className="hc-category-card"
                >
                  <div className="hc-category-card-icon">
                    <Icon />
                  </div>
                  <h3>{category.title}</h3>
                  <p>{category.description}</p>
                  <div className="hc-category-card-meta">
                    <FileText />
                    <span>{category.articleCount} articles</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        {!isSearching && (
          <a
            href="#"
            onClick={openInquiryModal}
            className="hc-info-box info"
            style={{ margin: '24px 0 32px', cursor: 'pointer', textDecoration: 'none', display: 'flex' }}
          >
            <div className="hc-info-box-icon">
              <HelpCircle />
            </div>
            <div className="hc-info-box-content">
              <p><strong>Still can't find what you're looking for?</strong></p>
              <p>Contact our support team and we'll be happy to help you out. We typically respond within 24 hours.</p>
            </div>
          </a>
        )}
      </main>

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
