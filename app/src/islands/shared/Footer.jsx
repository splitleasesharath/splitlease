import { useState } from 'react';
import { REFERRAL_API_ENDPOINT, SIGNUP_LOGIN_URL } from '../../lib/constants.js';

export default function Footer() {
  const [referralMethod, setReferralMethod] = useState('text');
  const [referralContact, setReferralContact] = useState('');
  const [importUrl, setImportUrl] = useState('');
  const [importEmail, setImportEmail] = useState('');
  const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  // Handle referral method change
  const handleReferralMethodChange = (method) => {
    setReferralMethod(method);
    setReferralContact(''); // Clear input when switching methods
  };

  // Get placeholder text based on referral method
  const getReferralPlaceholder = () => {
    return referralMethod === 'text'
      ? "Your friend's phone number"
      : "Your friend's email";
  };

  // Handle referral submission
  const handleReferralSubmit = async () => {
    if (!referralContact.trim()) {
      alert('Please enter contact information');
      return;
    }

    // Basic validation
    if (referralMethod === 'email' && !referralContact.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSubmittingReferral(true);

    try {
      // Submit referral to API
      const response = await fetch(REFERRAL_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: referralMethod,
          contact: referralContact,
        }),
      });

      if (response.ok) {
        alert(`Referral sent successfully via ${referralMethod}!`);
        setReferralContact('');
      } else {
        throw new Error('Failed to send referral');
      }
    } catch (error) {
      console.error('Referral error:', error);
      alert('Failed to send referral. Please try again later.');
    } finally {
      setIsSubmittingReferral(false);
    }
  };

  // Handle import submission
  const handleImportSubmit = async () => {
    if (!importUrl.trim() || !importEmail.trim()) {
      alert('Please fill in both fields');
      return;
    }

    // Validate URL
    if (!importUrl.startsWith('http://') && !importUrl.startsWith('https://')) {
      alert('Please enter a valid URL');
      return;
    }

    // Validate email
    if (!importEmail.includes('@') || !importEmail.includes('.')) {
      alert('Please enter a valid email');
      return;
    }

    setIsSubmittingImport(true);

    try {
      // Simulate API call for import
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert('Listing imported successfully!');
      setImportUrl('');
      setImportEmail('');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import listing. Please try again later.');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  return (
    <>
      {/* Main Footer */}
      <footer className="main-footer">
        <div className="footer-container">
          {/* For Hosts Column */}
          <div className="footer-column">
            <h4>For Hosts</h4>
            <a href={SIGNUP_LOGIN_URL}>List Property Now</a>
            <a href="/list-with-us.html">How to List</a>
            <a href="/policies.html">Legal Section</a>
            <a href="https://app.split.lease/host-guarantees">Guarantees</a>
            <a href="https://app.split.lease/demo-house-manual">Free House Manual</a>
          </div>

          {/* For Guests Column */}
          <div className="footer-column">
            <h4>For Guests</h4>
            <a href="https://app.split.lease/search">Explore Split Leases</a>
            <a href="https://app.split.lease/success-stories-guest">Success Stories</a>
            <a href={SIGNUP_LOGIN_URL}>Speak to an Agent</a>
            <a href="/faq.html">View FAQ</a>
          </div>

          {/* Company Column */}
          <div className="footer-column">
            <h4>Company</h4>
            <a href="https://app.split.lease/periodic-tenancy">About Periodic Tenancy</a>
            <a href="https://app.split.lease/team">About the Team</a>
            <a href="https://app.split.lease/careers">Careers at Split Lease</a>
            <a href="https://app.split.lease/blog">View Blog</a>
          </div>

          {/* Referral Column */}
          <div className="footer-column">
            <h4>Refer a friend</h4>
            <p className="referral-text">
              You get $50 and they get $50 *after their first booking
            </p>
            <div className="referral-options">
              <label>
                <input
                  type="radio"
                  name="referral"
                  value="text"
                  checked={referralMethod === 'text'}
                  onChange={() => handleReferralMethodChange('text')}
                />
                Text
              </label>
              <label>
                <input
                  type="radio"
                  name="referral"
                  value="email"
                  checked={referralMethod === 'email'}
                  onChange={() => handleReferralMethodChange('email')}
                />
                Email
              </label>
            </div>
            <input
              type="text"
              placeholder={getReferralPlaceholder()}
              className="referral-input"
              value={referralContact}
              onChange={(e) => setReferralContact(e.target.value)}
            />
            <button
              className="share-btn"
              onClick={handleReferralSubmit}
              disabled={isSubmittingReferral}
            >
              {isSubmittingReferral ? 'Sharing...' : 'Share now'}
            </button>
          </div>

          {/* Import Listing Column */}
          <div className="footer-column">
            <h4>Import your listing from another site</h4>
            <p className="import-text">No need to start from scratch</p>
            <input
              type="text"
              placeholder="https://your-listing-link"
              className="import-input"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
            />
            <input
              type="email"
              placeholder="janedoe@your_email.com"
              className="import-input"
              value={importEmail}
              onChange={(e) => setImportEmail(e.target.value)}
            />
            <button
              className="import-btn"
              onClick={handleImportSubmit}
              disabled={isSubmittingImport}
            >
              {isSubmittingImport ? 'Importing...' : 'Submit'}
            </button>
          </div>
        </div>
      </footer>

      {/* App Download Section */}
      <div className="app-download-section">
        <div className="app-card">
          <img
            src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=256,h=330,f=auto,dpr=1,fit=contain/f1743107051105x956510081926083000/iphone-removebg-preview.png"
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
    </>
  );
}
