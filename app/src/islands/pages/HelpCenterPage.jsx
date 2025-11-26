import { useState, useEffect } from 'react';
import { User, Users, Info, LifeBuoy, BookOpen, FileText, Search, HelpCircle, ChevronRight, ArrowRight } from 'lucide-react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { helpCenterCategories, searchHelpCenter } from '../../data/helpCenterData.js';
import '../../styles/help-center.css';

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
                    <a href={`/help-center/${article.categoryId}/${article.slug}`}>
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
              return (
                <a
                  key={category.id}
                  href={`/help-center/${category.slug}`}
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
          <div className="hc-info-box info" style={{ margin: '48px 0' }}>
            <div className="hc-info-box-icon">
              <HelpCircle />
            </div>
            <div className="hc-info-box-content">
              <p><strong>Still can't find what you're looking for?</strong></p>
              <p>Contact our support team and we'll be happy to help you out. We typically respond within 24 hours.</p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
