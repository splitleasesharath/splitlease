import { useState } from 'react';
import AiSignupMarketReport from './AiSignupMarketReport.jsx';

/**
 * Example: Integrating AI Signup Market Report Modal
 *
 * This example demonstrates various ways to integrate the AI Signup Market Report
 * modal into your pages. Copy and adapt these examples for your use case.
 */

// ============================================
// Example 1: Basic Integration
// ============================================
export function BasicExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Get Market Report
      </button>

      <AiSignupMarketReport
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// ============================================
// Example 2: Integration with CTA Button
// ============================================
export function CTAExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h2>Need Market Research?</h2>
      <p>Get a comprehensive AI-powered market report delivered to your inbox</p>

      <button
        onClick={() => setIsModalOpen(true)}
        style={{
          padding: '14px 28px',
          background: '#31135D',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Generate Free Market Report
      </button>

      <AiSignupMarketReport
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

// ============================================
// Example 3: Header/Navbar Integration
// ============================================
export function HeaderExample() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '16px 24px',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div>Logo</div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '8px 16px',
            background: '#31135D',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Market Report
        </button>
      </nav>

      <AiSignupMarketReport
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

// ============================================
// Example 4: Card with Modal Trigger
// ============================================
export function CardExample() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <div style={{
        maxWidth: '400px',
        padding: '24px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      }}>
        <div style={{ marginBottom: '8px', fontSize: '24px' }}>📊</div>
        <h3>AI Market Research</h3>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Get detailed insights about lodging, storage, transport, restaurants and more
        </p>
        <button
          onClick={() => setModalVisible(true)}
          style={{
            width: '100%',
            padding: '12px',
            background: '#31135D',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '16px',
          }}
        >
          Request Report
        </button>
      </div>

      <AiSignupMarketReport
        isOpen={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

// ============================================
// Example 5: Auto-open on Page Load (with delay)
// ============================================
export function AutoOpenExample() {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open after 3 seconds
  useState(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <h1>Welcome to Split Lease</h1>
      <p>Browse our listings...</p>

      <AiSignupMarketReport
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// ============================================
// Example 6: Integration with Listing Page
// ============================================
export function ListingPageExample() {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <div style={{ padding: '24px' }}>
      {/* Listing Details */}
      <div style={{ marginBottom: '24px' }}>
        <h1>Beautiful Studio in Downtown SF</h1>
        <p>$2,500/month</p>
      </div>

      {/* CTA for Market Report */}
      <div style={{
        padding: '20px',
        background: '#f7fafc',
        borderRadius: '8px',
        marginBottom: '24px',
      }}>
        <h3 style={{ margin: '0 0 8px 0' }}>
          Want market insights for this area?
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
          Get a comprehensive market report with pricing trends, availability, and more
        </p>
        <button
          onClick={() => setIsReportModalOpen(true)}
          style={{
            padding: '10px 20px',
            background: '#31135D',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Get Free Market Report
        </button>
      </div>

      {/* More listing content */}
      <div>
        <h2>About this listing</h2>
        <p>Lorem ipsum...</p>
      </div>

      <AiSignupMarketReport
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}

// ============================================
// Example 7: Multiple Trigger Points
// ============================================
export function MultipleTriggerExample() {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return (
    <div>
      {/* Header CTA */}
      <header style={{ padding: '20px', background: '#f7fafc' }}>
        <button onClick={openModal}>Market Report</button>
      </header>

      {/* Main content with inline CTA */}
      <main style={{ padding: '40px' }}>
        <h1>Find Your Perfect Space</h1>
        <p>
          Browse thousands of listings or{' '}
          <button
            onClick={openModal}
            style={{
              background: 'none',
              border: 'none',
              color: '#31135D',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            get a market report
          </button>
          {' '}to help with your search.
        </p>
      </main>

      {/* Footer CTA */}
      <footer style={{ padding: '40px', background: '#31135D', color: 'white' }}>
        <h3>Ready to make an informed decision?</h3>
        <button
          onClick={openModal}
          style={{
            padding: '12px 24px',
            background: 'white',
            color: '#31135D',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Request Market Analysis
        </button>
      </footer>

      <AiSignupMarketReport
        isOpen={isOpen}
        onClose={closeModal}
      />
    </div>
  );
}

// ============================================
// Example 8: Conditional Rendering Based on User
// ============================================
export function ConditionalExample({ user }) {
  const [isOpen, setIsOpen] = useState(false);

  // Only show to users who haven't requested a report yet
  const hasRequestedReport = user?.hasRequestedMarketReport || false;

  if (hasRequestedReport) {
    return (
      <div>
        <p>✅ You've already requested a market report. Check your email!</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Get Your First Market Report (Free)
      </button>

      <AiSignupMarketReport
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}

// ============================================
// Example 9: With Success Callback
// ============================================
export function CallbackExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [reportRequested, setReportRequested] = useState(false);

  const handleClose = () => {
    setIsOpen(false);

    // Check if user completed the flow
    // (You might track this differently in production)
    if (reportRequested) {
      alert('Thank you! Check your email for the market report.');
    }
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        Request Market Report
      </button>

      {reportRequested && (
        <div style={{ padding: '12px', background: '#d4edda', borderRadius: '8px', marginTop: '16px' }}>
          ✅ Report requested! Check your inbox.
        </div>
      )}

      <AiSignupMarketReport
        isOpen={isOpen}
        onClose={handleClose}
      />
    </div>
  );
}

// ============================================
// Default Export: Kitchen Sink Example
// ============================================
export default function AiSignupMarketReportExample() {
  return (
    <div style={{ padding: '40px' }}>
      <h1>AI Signup Market Report - Examples</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', marginTop: '40px' }}>
        <section>
          <h2>Basic Example</h2>
          <BasicExample />
        </section>

        <section>
          <h2>CTA Example</h2>
          <CTAExample />
        </section>

        <section>
          <h2>Card Example</h2>
          <CardExample />
        </section>

        <section>
          <h2>Listing Page Integration</h2>
          <ListingPageExample />
        </section>
      </div>
    </div>
  );
}
