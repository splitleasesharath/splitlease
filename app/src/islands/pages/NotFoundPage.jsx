import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import Button from '../shared/Button.jsx';

export default function NotFoundPage() {
  return (
    <div className="page-container">
      <Header />

      <main className="not-found-container">
        <div className="not-found-content">
          {/* Large 404 number display */}
          <h1 className="not-found-title" aria-label="Error 404">404</h1>

          {/* Error heading */}
          <h2 className="not-found-heading">Page Not Found</h2>

          {/* Descriptive text */}
          <p className="not-found-text">
            The page you're looking for doesn't exist or has been moved.
          </p>

          {/* Primary action buttons */}
          <div className="not-found-actions">
            <Button
              variant="primary"
              size="large"
              onClick={() => window.location.href = '/'}
              aria-label="Return to homepage"
            >
              Go Home
            </Button>
            <Button
              variant="outline"
              size="large"
              onClick={() => window.location.href = '/search'}
              aria-label="Browse available listings"
            >
              Search Listings
            </Button>
          </div>

          {/* Helpful navigation links */}
          <nav className="not-found-links" aria-label="Additional navigation">
            <a href="/faq.html">FAQ</a>
            <span className="separator" aria-hidden="true">•</span>
            <a href="/list-with-us.html">List With Us</a>
            <span className="separator" aria-hidden="true">•</span>
            <a href="/why-split-lease.html">Why Split Lease</a>
          </nav>
        </div>
      </main>

      <Footer />
    </div>
  );
}
