import { useState, useEffect } from 'react';
import { User, Users, Info, LifeBuoy, BookOpen, ArrowRight, ArrowLeft, ChevronRight, MessageCircle, Heart, DollarSign, HelpCircle } from 'lucide-react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { helpCenterArticles, getCategoryBySlug } from '../../data/helpCenterData.js';
import '../../styles/help-center.css';

const iconMap = {
  User,
  Users,
  Info,
  LifeBuoy,
  BookOpen,
  MessageCircle,
  Heart,
  DollarSign
};

export default function HelpCenterCategoryPage() {
  const [category, setCategory] = useState(null);
  const [articles, setArticles] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get category from URL
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(Boolean);

    // Expected format: /help-center/{category}
    let categorySlug = null;

    if (pathParts.length >= 2 && pathParts[0] === 'help-center') {
      categorySlug = pathParts[1];
    } else if (pathParts.length === 1) {
      // Direct access like /guests or /hosts
      categorySlug = pathParts[0];
    }

    if (categorySlug) {
      const categoryData = getCategoryBySlug(categorySlug);
      const articlesData = helpCenterArticles[categorySlug];

      if (categoryData && articlesData) {
        setCategory(categoryData);
        setArticles(articlesData);
      }
    }

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <div className="hc-loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
        <Footer />
      </>
    );
  }

  if (!category || !articles) {
    return (
      <>
        <Header />
        <main className="hc-container" style={{ padding: '80px 16px', textAlign: 'center' }}>
          <h1>Category Not Found</h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>The category you're looking for doesn't exist.</p>
          <a href="/help-center" className="hc-back-link">
            <ArrowLeft />
            Back to Help Center
          </a>
        </main>
        <Footer />
      </>
    );
  }

  const Icon = iconMap[articles.icon] || HelpCircle;

  return (
    <>
      <Header />

      {/* Breadcrumb */}
      <div className="hc-container hc-page-content">
        <div className="hc-breadcrumb">
          <a href="/help-center">All Collections</a>
          <ChevronRight />
          <span className="current">{articles.title}</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="hc-container">
        {/* Page Header */}
        <div className="hc-article-header">
          <h1>
            <Icon />
            {articles.title}
          </h1>
          <p className="hc-text-muted">{articles.description}</p>
        </div>

        {/* Sections */}
        {articles.sections.map((section, sectionIndex) => (
          <section key={sectionIndex} className="hc-article-section">
            <h2>{section.title}</h2>
            <ul className="hc-article-list">
              {section.articles.map((article) => (
                <li key={article.id} className="hc-article-list-item">
                  {article.external ? (
                    <a href={article.external} target="_blank" rel="noopener noreferrer">
                      <ArrowRight />
                      {article.title}
                    </a>
                  ) : (
                    <a href={`/help-center-articles/${category.slug}/${article.slug}.html`}>
                      <ArrowRight />
                      {article.title}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* Info Boxes (for about category) */}
        {articles.infoBoxes && articles.infoBoxes.map((box, index) => {
          const BoxIcon = iconMap[box.icon] || HelpCircle;
          return (
            <div key={index} className={`hc-info-box ${box.type}`} style={{ marginTop: index === 0 ? '48px' : '24px' }}>
              <div className="hc-info-box-icon">
                <BoxIcon />
              </div>
              <div className="hc-info-box-content">
                <p><strong>{box.title}</strong></p>
                {box.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          );
        })}

        {/* Help Contact Box for guest/host pages */}
        {(category.slug === 'guests' || category.slug === 'hosts') && (
          <div className="hc-info-box success" style={{ marginTop: '48px' }}>
            <div className="hc-info-box-icon">
              <MessageCircle />
            </div>
            <div className="hc-info-box-content">
              <p><strong>Need more help?</strong></p>
              <p>Our support team is here to help. Contact us via live chat or email at <a href="mailto:support@split.lease">support@split.lease</a></p>
            </div>
          </div>
        )}

        {/* Tax Benefits Info Box for hosts */}
        {category.slug === 'hosts' && (
          <div className="hc-info-box info" style={{ marginTop: '24px' }}>
            <div className="hc-info-box-icon">
              <DollarSign />
            </div>
            <div className="hc-info-box-content">
              <p><strong>Did you know? Hosting with Split Lease can offer tax benefits</strong></p>
              <p>By hosting periodic tenancy guests, you generate passive income which may be federally non-taxable. Learn more at <a href="https://www.split.lease/why-host-with-us" target="_blank" rel="noopener noreferrer">split.lease/why-host-with-us</a></p>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
