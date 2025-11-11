import { useState } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { SIGNUP_LOGIN_URL } from '../../lib/constants.js';

export default function ListWithUsPage() {
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
            <a href={SIGNUP_LOGIN_URL} className="cta-button cta-primary">Start New Listing</a>
            <a href={SIGNUP_LOGIN_URL} className="cta-button cta-secondary">Import My Listing</a>
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
            <a href={SIGNUP_LOGIN_URL} className="cta-button cta-primary">Create Your Listing</a>
            <a href="/faq.html" className="cta-button cta-secondary">General Questions</a>
          </div>
          <p className="list-cta-note">Need help? Our support team is here to assist you every step of the way.</p>
        </div>
      </section>

      <Footer />
    </>
  );
}
