import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { supabase } from '../../lib/supabase.js';

/**
 * Transform Supabase document to match expected format
 */
function transformSupabaseDocument(supabaseDoc) {
  return {
    id: supabaseDoc._id,
    name: supabaseDoc.Name,
    slug: supabaseDoc.Slug || generateSlug(supabaseDoc.Name),
    type: supabaseDoc.Type || 'policy',
    pdfUrl: supabaseDoc['PDF Version'],
    visible_on_policies_page: supabaseDoc.Active,
    visible_on_logged_out: supabaseDoc['visible on logged out?'],
    createdDate: supabaseDoc['Created Date'],
    modifiedDate: supabaseDoc['Modified Date'],
    createdBy: supabaseDoc['Created By']
  };
}

/**
 * Generate slug from name
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Fetch policies from Supabase
  useEffect(() => {
    async function fetchPolicies() {
      try {
        setLoading(true);
        console.log('📡 Fetching policies from Supabase...');

        const { data, error } = await supabase
          .from('zat_policiesdocuments')
          .select('*')
          .eq('Active', true)
          .order('Name', { ascending: true });

        if (error) {
          console.error('❌ Supabase error:', error);
          throw error;
        }

        console.log('✅ Fetched policies:', data);
        const transformedPolicies = data.map(transformSupabaseDocument);
        setPolicies(transformedPolicies);

        // Load policy based on URL hash or default to first
        const hash = window.location.hash.substring(1);
        if (hash) {
          const policy = transformedPolicies.find(p => p.slug === hash);
          if (policy) {
            setCurrentPolicy(policy);
            return;
          }
        }

        // Load first policy by default
        if (transformedPolicies.length > 0) {
          setCurrentPolicy(transformedPolicies[0]);
          window.location.hash = transformedPolicies[0].slug;
        }
      } catch (err) {
        console.error('Error fetching policies:', err);
        setError('Failed to load policies. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }

    fetchPolicies();
  }, []);

  // Handle hash changes
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.substring(1);
      if (hash && policies.length > 0) {
        const policy = policies.find(p => p.slug === hash);
        if (policy) {
          setCurrentPolicy(policy);
        }
      }
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [policies]);

  // Handle scroll for back-to-top button
  useEffect(() => {
    function handleScroll() {
      setShowBackToTop(window.pageYOffset > 300);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update document title when policy changes
  useEffect(() => {
    if (currentPolicy) {
      document.title = `${currentPolicy.name} | Split Lease`;
    }
  }, [currentPolicy]);

  const handlePolicyClick = (policy) => {
    setCurrentPolicy(policy);
    window.location.hash = policy.slug;

    // Scroll to PDF on desktop
    if (window.innerWidth >= 900) {
      setTimeout(() => {
        const pdfContainer = document.querySelector('.policies-pdf-container');
        if (pdfContainer) {
          pdfContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (loading) {
    return (
      <div className="policies-page-container">
        <div className="policies-content-wrapper">
          <div className="policies-loading">Loading policies...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="policies-page-container">
        <div className="policies-content-wrapper">
          <div className="policies-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />

      <div className="policies-page-container">
        <div className="policies-content-wrapper">
          {/* Sidebar Navigation */}
          <aside className="policies-sidebar">
            <h2 className="policies-sidebar-title">Contents</h2>
            <nav className="policies-sidebar-nav">
              {policies.map((policy) => (
                <a
                  key={policy.id}
                  href={`#${policy.slug}`}
                  className={`policies-nav-item ${
                    currentPolicy?.slug === policy.slug ? 'active' : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    handlePolicyClick(policy);
                  }}
                >
                  {policy.name}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main Content Area */}
          <section className="policies-main-content">
            <div className="policies-content-header">
              <h1 className="policies-page-title">
                {currentPolicy?.name || 'Policy Document'}
              </h1>
              {currentPolicy?.pdfUrl && (
                <a
                  href={currentPolicy.pdfUrl}
                  className="policies-download-link"
                  download={`${currentPolicy.slug}.pdf`}
                  title="Download PDF"
                >
                  <i className="fa fa-download"></i>
                </a>
              )}
            </div>

            <div className="policies-pdf-container">
              {currentPolicy?.pdfUrl ? (
                <iframe
                  src={currentPolicy.pdfUrl}
                  width="100%"
                  height="1000px"
                  frameBorder="0"
                  title={`${currentPolicy.name} - Policy Document Viewer`}
                />
              ) : (
                <div className="policies-loading">No policy selected</div>
              )}
            </div>
          </section>
        </div>

        {/* Back to Top Button */}
        <button
          className={`policies-back-to-top ${showBackToTop ? 'visible' : ''}`}
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <i className="fa fa-chevron-up"></i>
          <span>Back to Top</span>
        </button>
      </div>

      <Footer />
    </>
  );
}
