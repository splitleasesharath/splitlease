import { useState, useEffect } from 'react';
import { SIGNUP_LOGIN_URL, SEARCH_URL } from '../../lib/constants.js';
import { supabase } from '../../lib/supabase.js';
import { checkAuthStatus, getUserType } from '../../lib/auth.js';
import { normalizeUserType, NORMALIZED_USER_TYPES } from './LoggedInAvatar/useLoggedInAvatarData.js';
import CreateDuplicateListingModal from './CreateDuplicateListingModal/CreateDuplicateListingModal.jsx';
import ImportListingModal from './ImportListingModal/ImportListingModal.jsx';
import ReferralModal from '../pages/AccountProfilePage/components/ReferralModal.jsx';
import { useToast } from './Toast.jsx';
import Toast from './Toast.jsx';

export default function Footer() {
  const [importUrl, setImportUrl] = useState('');
  const [importEmail, setImportEmail] = useState('');
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [showImportListingModal, setShowImportListingModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(null); // 'Host' or 'Guest'
  const { toasts, showToast, removeToast } = useToast();

  // Check auth status and user type on mount
  useEffect(() => {
    const checkAuth = async () => {
      const loggedIn = await checkAuthStatus();
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        const type = getUserType();
        setUserType(type);
      }
    };
    checkAuth();
  }, []);

  // Handle import submission (footer inline form)
  const handleImportSubmit = async () => {
    if (!importUrl.trim() || !importEmail.trim()) {
      showToast({
        title: 'Missing Information',
        content: 'Please fill in both fields.',
        type: 'error'
      });
      return;
    }

    // Validate email
    if (!importEmail.includes('@') || !importEmail.includes('.')) {
      showToast({
        title: 'Invalid Email',
        content: 'Please enter a valid email address.',
        type: 'error'
      });
      return;
    }

    setIsSubmittingImport(true);

    try {
      const response = await fetch('/api/import-listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingUrl: importUrl.trim(),
          emailAddress: importEmail.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit import request');
      }

      showToast({
        title: 'Request Submitted!',
        content: 'We will email you when your listing is ready.',
        type: 'success'
      });
      setImportUrl('');
      setImportEmail('');
    } catch (error) {
      console.error('Import error:', error);
      showToast({
        title: 'Import Failed',
        content: 'Please try again later.',
        type: 'error'
      });
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Determine which columns to show based on user type
  // If logged in as Guest, hide "For Hosts" column
  // If logged in as Host (or Trial Host), hide "For Guests" column
  // If not logged in, show both columns
  const normalizedType = normalizeUserType(userType);
  const showHostsColumn = !isLoggedIn || normalizedType !== NORMALIZED_USER_TYPES.GUEST;
  const showGuestsColumn = !isLoggedIn || (normalizedType !== NORMALIZED_USER_TYPES.HOST && normalizedType !== NORMALIZED_USER_TYPES.TRIAL_HOST);

  // Calculate column count for grid
  const columnCount = 3 + (showHostsColumn ? 1 : 0) + (showGuestsColumn ? 1 : 0);

  return (
    <>
      {/* Main Footer */}
      <footer className="main-footer">
        <div
          className="footer-container"
          style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
        >
          {/* Company Column - Now first */}
          <div className="footer-column">
            <h4>Company</h4>
            <a href="/faq?section=travelers&question=1692211080963x751695924087252700">About Periodic Tenancy</a>
            <a href="/about-us">About the Team</a>
            <a href="/careers">Careers at Split Lease</a>
            <a href="/help-center">Blog</a>
          </div>

          {/* For Hosts Column - hidden for logged-in guests */}
          {showHostsColumn && (
            <div className="footer-column">
              <h4>For Hosts</h4>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setShowCreateListingModal(true);
                }}
              >
                List Property Now
              </a>
              <a href="/list-with-us">How to List</a>
              <a href="/host-success">Success Stories</a>
              <a href="/policies">Legal Section</a>
              <a href="/host-guarantee">Guarantees</a>
              <a href="https://app.split.lease/demo-house-manual">Free House Manual</a>
            </div>
          )}

          {/* For Guests Column - hidden for logged-in hosts */}
          {showGuestsColumn && (
            <div className="footer-column">
              <h4>For Guests</h4>
              <a href={SEARCH_URL}>Explore Split Leases</a>
              <a href="/guest-success">Success Stories</a>
              <a href={SIGNUP_LOGIN_URL}>Speak to an Agent</a>
              <a href="/faq?section=travelers">View FAQ</a>
            </div>
          )}

          {/* Referral Column */}
          <div className="footer-column">
            <h4>Refer a friend</h4>
            <p className="referral-text">
              Give $50, Get $50
            </p>
            <p className="referral-subtext">
              Share via WhatsApp, Email, SMS, or copy your unique link
            </p>
            <button
              className="share-btn"
              onClick={() => setShowReferralModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 12 20 22 4 22 4 12"></polyline>
                <rect x="2" y="7" width="20" height="5"></rect>
                <line x1="12" y1="22" x2="12" y2="7"></line>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
              Invite Friends
            </button>
          </div>

          {/* Import Listing Column - Enhanced design */}
          <div className="footer-column import-column">
            <div className="import-header">
              <div className="import-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              <h4>Import Your Listing</h4>
            </div>
            <p className="import-tagline">Already listed elsewhere?</p>
            <p className="import-text">We'll copy everything over for you in minutes.</p>
            <input
              type="text"
              placeholder="Paste your listing URL"
              className="import-input"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
            <input
              type="email"
              placeholder="Your email address"
              className="import-input"
              value={importEmail}
              onChange={(e) => setImportEmail(e.target.value)}
            />
            <button
              className="import-btn"
              onClick={handleImportSubmit}
              disabled={isSubmittingImport}
            >
              {isSubmittingImport ? 'Importing...' : 'Import Now'}
            </button>
          </div>
        </div>
      </footer>

      {/* App Download Section */}
      <div className="app-download-section">
        <div className="app-card">
          <img
            src="/images/iphone-app-mockup.png"
            alt="Split Lease App"
            className="app-phone-image"
            loading="lazy"
          />
          <div className="app-content">
            <p className="app-tagline">
              Now you can change
              <br />
              your nights
              <br />
              <em>on the go.</em>
            </p>
            <a href="https://apps.apple.com/app/split-lease" className="app-store-btn">
              <img
                src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                alt="Download on the App Store"
                height="40"
              />
            </a>
            <p className="app-subtitle">Download at the App Store</p>
          </div>
        </div>

        <div className="alexa-card">
          <img
            src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=256,h=225,f=auto,dpr=1,fit=cover,q=75/f1625329487406x361063433051586300/402087-smart-speakers-amazon-echo-dot-4th-gen-10015594%201.png"
            alt="Amazon Alexa"
            className="alexa-device-image"
            loading="lazy"
          />
          <div className="alexa-content">
            <p className="alexa-tagline">
              Voice-controlled concierge,
              <br />
              at your service.
            </p>
            <a href="https://www.amazon.com/dp/B08XYZ123" className="alexa-btn">
              <span className="amazon-logo">
                Available on
                <br />
                <strong>amazon.com</strong>
              </span>
            </a>
            <p className="alexa-command">"Alexa, enable Split Lease"</p>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <a href="https://app.split.lease/terms">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="currentColor"
            style={{ marginRight: '0.5rem' }}
          >
            <path d="M2 2h8v8H2z" stroke="currentColor" strokeWidth="1" fill="none" />
            <path d="M4 6h4M4 8h3" />
          </svg>
          Terms of Use
        </a>
        <span>Made with love in New York City</span>
        <span>© 2025 SplitLease</span>
      </div>

      {/* Create Listing Modal */}
      <CreateDuplicateListingModal
        isVisible={showCreateListingModal}
        onClose={() => setShowCreateListingModal(false)}
        onSuccess={(newListing) => {
          console.log('New listing created:', newListing);
        }}
        currentUser={null}
        existingListings={[]}
        onNavigateToListing={(listingId) => {
          window.location.href = `https://app.split.lease/listing/${listingId}`;
        }}
      />

      {/* Import Listing Modal */}
      <ImportListingModal
        isOpen={showImportListingModal}
        onClose={() => setShowImportListingModal(false)}
        onSubmit={async (data) => {
          setIsSubmittingImport(true);
          try {
            const response = await fetch('/api/import-listing', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                listingUrl: data.listingUrl,
                emailAddress: data.emailAddress
              })
            });

            const result = await response.json();

            if (!response.ok) {
              throw new Error(result.error || 'Failed to submit import request');
            }

            showToast({
              title: 'Request Submitted!',
              content: 'We will email you when your listing is ready.',
              type: 'success'
            });
            setShowImportListingModal(false);
          } catch (error) {
            console.error('Import error:', error);
            showToast({
              title: 'Import Failed',
              content: 'Please try again later.',
              type: 'error'
            });
          } finally {
            setIsSubmittingImport(false);
          }
        }}
        currentUserEmail=""
        isLoading={isSubmittingImport}
      />

      {/* Referral Modal */}
      <ReferralModal
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        referralCode="splitlease"
        userType={normalizedType === NORMALIZED_USER_TYPES.HOST || normalizedType === NORMALIZED_USER_TYPES.TRIAL_HOST ? 'host' : 'guest'}
        referrerName="Split Lease"
      />

      {/* Toast Notifications */}
      {toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}
    </>
  );
}
