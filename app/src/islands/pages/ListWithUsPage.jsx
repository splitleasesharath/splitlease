import { useState, useMemo } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import CreateDuplicateListingModal from '../shared/CreateDuplicateListingModal/CreateDuplicateListingModal.jsx';
import ImportListingModal from '../shared/ImportListingModal/ImportListingModal.jsx';
import { useToast } from '../shared/Toast.jsx';
import Toast from '../shared/Toast.jsx';
import { SIGNUP_LOGIN_URL } from '../../lib/constants.js';

export default function ListWithUsPage() {
  const [showCreateListingModal, setShowCreateListingModal] = useState(false);
  const [showImportListingModal, setShowImportListingModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toasts, showToast, removeToast } = useToast();

  // Nightly pricing calculator state
  const [nightlyBaseRate, setNightlyBaseRate] = useState(150);
  const [nightlyDiscount, setNightlyDiscount] = useState(20);

  // Calculate nightly prices using decay curve algorithm
  const nightlyPrices = useMemo(() => {
    const p5Target = nightlyBaseRate * (1 - nightlyDiscount / 100);
    const decay = nightlyBaseRate > 0 ? Math.pow(p5Target / nightlyBaseRate, 0.25) : 1;
    const clampedDecay = Math.max(0.7, Math.min(1, decay));

    const prices = [Math.ceil(nightlyBaseRate)];
    for (let i = 1; i < 7; i++) {
      prices.push(Math.ceil(prices[i - 1] * clampedDecay));
    }
    return prices;
  }, [nightlyBaseRate, nightlyDiscount]);

  // Calculate average price for 5-night stay
  const avgPrice = useMemo(() => {
    const sum5 = nightlyPrices.slice(0, 5).reduce((a, b) => a + b, 0);
    return Math.round(sum5 / 5);
  }, [nightlyPrices]);

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="list-hero-section">
        {/* Floating people */}
        <div className="floating-person hero-person-1">
          <img src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1628195334709x669100317545697300/brad%20circle.png" alt="Host" />
        </div>
        <div className="floating-person hero-person-2">
          <img src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1606752112120x678210779169741800/arvind-image-success-story.jpg" alt="Host" />
        </div>
        <div className="floating-person hero-person-3">
          <img src="https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=,f=auto,dpr=1,fit=contain/f1756215264078x737048307341117100/Emily%20Johnson%20-%20Fake%20Profile%20Photo.jfif" alt="Host" />
        </div>

        <div className="list-hero-container">
          <div className="list-hero-badge">
            Turn Unused Nights Into Income
          </div>
          <h1 className="list-hero-title">
            List Your Property<br />
            <span className="highlight">Start Earning Today</span>
          </h1>
          <p className="list-hero-subtitle">
            Join Split Lease and transform your unused property into a reliable income stream. Flexible lease terms, transparent pricing, and comprehensive support.
          </p>
          <div className="list-hero-cta">
            <button
              onClick={() => setShowCreateListingModal(true)}
              className="cta-button cta-primary"
            >
              Start New Listing
            </button>
            <button
              onClick={() => setShowImportListingModal(true)}
              className="cta-button cta-secondary"
            >
              Import My Listing
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="list-how-it-works">
        <div className="gradient-blob gradient-blob-1"></div>
        <div className="gradient-blob gradient-blob-2"></div>

        <div className="list-how-it-works-container">
          <div className="list-how-header">
            <h2 className="list-how-title">How does it work?</h2>
            <p className="list-how-subtitle">Three simple steps to start earning from your property</p>
          </div>

          <div className="list-steps-grid">
            <div className="list-step-card">
              <div className="list-step-number">1</div>
              <h3 className="list-step-title">Property Details</h3>
              <p className="list-step-description">Provide comprehensive information about your property, including the full address, name, and bedrooms. Highlight amenities and unique features.</p>
            </div>

            <div className="list-step-card">
              <div className="list-step-number">2</div>
              <h3 className="list-step-title">Rental Period & Pricing Strategy</h3>
              <p className="list-step-description">Specify your preferred rental model: Nightly, Weekly, or Monthly. Set a competitive price reflecting your property's value.</p>
            </div>

            <div className="list-step-card">
              <div className="list-step-number">3</div>
              <h3 className="list-step-title">House Rules & Photo Portfolio</h3>
              <p className="list-step-description">Set clear expectations for guests. Include at least three high-quality photos showcasing key areas like the living room, bedroom, and bathroom.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Lease Styles Section */}
      <section className="list-lease-styles-section">
        <div className="outlined-bubble outlined-bubble-1"></div>
        <div className="outlined-bubble outlined-bubble-2"></div>

        <div className="list-lease-styles-container">
          <div className="list-lease-header">
            <div className="list-lease-eyebrow">Flexible Options</div>
            <h2 className="list-lease-title">Understanding Lease Styles</h2>
            <p className="list-lease-description">We offer lease terms ranging from 6 to 52 weeks, with a minimum stay of 30 nights. This sets us apart from short-term vacation rentals like Airbnb, providing a more stable and long-term housing solution.</p>
          </div>

          <div className="list-lease-grid">
            <div className="list-lease-card">
              <div className="list-lease-card-header">
                <div className="list-lease-type">Nightly</div>
                <div className="list-lease-pattern">Nights-of-the-week</div>
                <div className="list-lease-example">eg. every Thurs-Sun from August to December</div>
              </div>
              <div className="list-lease-separator"></div>
              <div className="list-lease-features">
                <div className="list-lease-feature">Certain nights are designated for the Guest's use according to a standardized weekly pattern</div>
                <div className="list-lease-feature">You may lease unused nights for extra income or keep them</div>
                <div className="list-lease-feature">You define $/night</div>
              </div>
            </div>

            <div className="list-lease-card">
              <div className="list-lease-card-header">
                <div className="list-lease-type">Weekly</div>
                <div className="list-lease-pattern">Weeks-of-the-month</div>
                <div className="list-lease-example">eg. two weeks on, two weeks off August to December</div>
              </div>
              <div className="list-lease-separator"></div>
              <div className="list-lease-features">
                <div className="list-lease-feature">Certain weeks are designated for the Guest's use according to a standardized monthly pattern</div>
                <div className="list-lease-feature">You may lease unused weeks for extra income or keep them</div>
                <div className="list-lease-feature">You define $/wk</div>
              </div>
            </div>

            <div className="list-lease-card">
              <div className="list-lease-card-header">
                <div className="list-lease-type">Monthly</div>
                <div className="list-lease-pattern">Month-to-month</div>
                <div className="list-lease-example">eg. continuous stay from August to December</div>
              </div>
              <div className="list-lease-separator"></div>
              <div className="list-lease-features">
                <div className="list-lease-feature">All nights available for Guest use</div>
                <div className="list-lease-feature">Split Lease can sublease unused nights</div>
                <div className="list-lease-feature">You define $/month</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nightly Pricing Calculator Section */}
      <section className="list-pricing-calculator-section">
        <div className="gradient-blob gradient-blob-1"></div>
        <div className="gradient-blob gradient-blob-2"></div>

        <div className="list-pricing-calculator-container">
          <div className="list-pricing-calculator-header">
            <div className="list-pricing-calculator-eyebrow">Try It Out</div>
            <h2 className="list-pricing-calculator-title">Nightly Pricing Calculator</h2>
            <p className="list-pricing-calculator-description">
              See how our Smart Pricing works. Set your base rate and discount to see how consecutive night prices adjust automatically to encourage longer bookings.
            </p>
          </div>

          <div className="pricing-calculator-card">
            {/* Base Nightly Rate Input */}
            <div className="calc-control-group calc-control-centered">
              <label className="calc-label">Base Nightly Rate</label>
              <div className="base-input-wrapper">
                <span className="currency-symbol">$</span>
                <input
                  type="number"
                  className="base-input"
                  value={nightlyBaseRate}
                  onChange={e => setNightlyBaseRate(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                />
              </div>
            </div>

            {/* Long Stay Discount Slider */}
            <div className="calc-control-group">
              <div className="calc-label-row">
                <span className="calc-label">Long Stay Discount</span>
                <span className="calc-value-display">{nightlyDiscount}%</span>
              </div>
              <div className="calc-range-wrapper">
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={nightlyDiscount}
                  onChange={e => setNightlyDiscount(parseInt(e.target.value))}
                />
              </div>
              <div className="calc-marks">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
              <p className="calc-hint">
                Consecutive nights get progressively cheaper. A 5-night stay averages <strong>${avgPrice}</strong>/night.
              </p>
            </div>

            {/* Color Palette Display */}
            <div className="nights-display-wrapper">
              <div className="nights-display-header">Price per consecutive night</div>
              <div className="palette-container">
                <div className="palette-row">
                  {[1, 2, 3, 4, 5, 6, 7].map(night => (
                    <div key={night} className={`palette-swatch n${night}`}>
                      <span className="swatch-number">Night {night}</span>
                      <span className="swatch-price">${nightlyPrices[night - 1] || 0}</span>
                      <span className="swatch-label">per night</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="formula-row">
                {[1, 2, 3, 4, 5, 6, 7].map(night => {
                  const pricePerNight = nightlyPrices[night - 1] || 0;
                  const total = night * pricePerNight;
                  return <div key={night} className="formula-item">${total}</div>;
                })}
              </div>
              <div className="formula-total-row">
                <div className="formula-total-label">7-Night Total</div>
                <div className="formula-total">
                  ${7 * (nightlyPrices[6] || 0)}
                </div>
              </div>
            </div>

            {/* Summary Row */}
            <div className="summary-row">
              <div className="summary-item">
                <div className="summary-label">Your Weekly Total</div>
                <div className="summary-value">${nightlyPrices.reduce((a, b) => a + b, 0)}</div>
                <div className="summary-sub">7 nights</div>
              </div>
              <div className="summary-item">
                <div className="summary-label">Est. Monthly</div>
                <div className="summary-value">${Math.round(nightlyPrices.reduce((a, b) => a + b, 0) * 4.33)}</div>
                <div className="summary-sub">x 4.33 weeks</div>
              </div>
            </div>

            {/* Smart Pricing explanation */}
            <details className="pricing-details">
              <summary>How does Smart Pricing work?</summary>
              <div className="details-content">
                We calculate a "decay curve" for your pricing. The first night is your full Base Rate.
                Each consecutive night gets slightly cheaper based on your Discount setting.
                This encourages guests to book longer blocks (like Mon-Fri) instead of just two nights,
                maximizing your occupancy and reducing turnover effort.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Pricing Policy Section */}
      <section className="list-pricing-policy-section">
        <div className="circle-accent circle-accent-1"></div>
        <div className="circle-accent circle-accent-2"></div>

        <div className="list-pricing-container">
          <div className="list-pricing-header">
            <h2 className="list-pricing-title">Pricing Policy</h2>
            <div className="list-pricing-formula">Guest Payment = Host Compensation + Additional Costs</div>
          </div>

          <div className="list-pricing-grid">
            <div className="list-pricing-card">
              <div className="list-pricing-card-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor"/>
                </svg>
              </div>
              <h3 className="list-pricing-card-title">Guest Payment</h3>
              <p className="list-pricing-card-content">Guest always pay Nightly, regardless of the Rental Style selected</p>
            </div>

            <div className="list-pricing-card">
              <div className="list-pricing-card-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor"/>
                </svg>
              </div>
              <h3 className="list-pricing-card-title">No Charges to Host</h3>
              <p className="list-pricing-card-content">Hosts incur no charges. Compensation is received as YOU define in your Listing</p>
            </div>

            <div className="list-pricing-card">
              <div className="list-pricing-card-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor"/>
                </svg>
              </div>
              <h3 className="list-pricing-card-title">Payment Schedule</h3>
              <p className="list-pricing-card-content">Nightly or Weekly Rental Style: Every 28 days<br /><br />Monthly Rental Style: Every 31 days</p>
            </div>
          </div>

          <div className="list-pricing-highlight">
            <h3 className="list-pricing-highlight-title">Additional Costs</h3>
            <p className="list-pricing-highlight-text">Split Lease adds an 8-14% markup to cover: Credit Card Processing Fees, Insurance, and other applicable expenses associated with maintaining the platform</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="list-cta-section">
        <div className="outlined-bubble outlined-bubble-1"></div>
        <div className="outlined-bubble outlined-bubble-2"></div>

        <div className="list-cta-container">
          <h2 className="list-cta-title">Start New Listing</h2>
          <p className="list-cta-subtitle">Takes less than a minute to do!</p>
          <div className="list-cta-buttons">
            <button
              onClick={() => setShowCreateListingModal(true)}
              className="cta-button cta-primary"
            >
              Create Your Listing
            </button>
            <a href="/faq.html" className="cta-button cta-secondary">General Questions</a>
          </div>
          <p className="list-cta-note">Need help? Our support team is here to assist you every step of the way.</p>
        </div>
      </section>

      <Footer />

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
          setIsImporting(true);
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
            setIsImporting(false);
          }
        }}
        currentUserEmail=""
        isLoading={isImporting}
      />

      {/* Toast Notifications */}
      {toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}
    </>
  );
}
