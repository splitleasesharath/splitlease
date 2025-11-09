import React from 'react';
import Footer from '../src/Footer';
import type { FooterColumn } from '../src/Footer';

function App() {
  // Example: Using default configuration
  const handleReferralSubmit = async (method: 'text' | 'email', contact: string) => {
    console.log(`Referral submitted via ${method}:`, contact);
    // Add your API integration here
    // Example: await api.submitReferral({ method, contact });
  };

  const handleImportSubmit = async (url: string, email: string) => {
    console.log('Import listing submitted:', { url, email });
    // Add your API integration here
    // Example: await api.importListing({ url, email });
  };

  return (
    <div className="app">
      {/* Your main app content goes here */}
      <main style={{ minHeight: '80vh', padding: '2rem' }}>
        <h1>Split Lease Application</h1>
        <p>This is an example of using the Footer component.</p>
      </main>

      {/* Footer with all features enabled */}
      <Footer
        onReferralSubmit={handleReferralSubmit}
        onImportSubmit={handleImportSubmit}
      />
    </div>
  );
}

// Example: Custom columns configuration
export function AppWithCustomColumns() {
  const customColumns: FooterColumn[] = [
    {
      title: 'Products',
      links: [
        { text: 'Property Management', url: '/products/property' },
        { text: 'Tenant Screening', url: '/products/screening' },
        { text: 'Lease Management', url: '/products/lease' }
      ]
    },
    {
      title: 'Resources',
      links: [
        { text: 'Documentation', url: '/docs' },
        { text: 'API Reference', url: '/api' },
        { text: 'Support Center', url: '/support' },
        { text: 'Community Forum', url: '/forum' }
      ]
    },
    {
      title: 'Company',
      links: [
        { text: 'About Us', url: '/about' },
        { text: 'Careers', url: '/careers' },
        { text: 'Press Kit', url: '/press' },
        { text: 'Contact', url: '/contact' }
      ]
    }
  ];

  return (
    <div className="app">
      <main style={{ minHeight: '80vh', padding: '2rem' }}>
        <h1>Custom Footer Example</h1>
        <p>This example shows a footer with custom columns.</p>
      </main>

      <Footer
        columns={customColumns}
        showReferral={false}
        showImport={false}
        copyrightText="© 2025 Your Company Name"
        footerNote="Built with passion in San Francisco"
      />
    </div>
  );
}

// Example: Footer without referral and import features
export function AppMinimalFooter() {
  return (
    <div className="app">
      <main style={{ minHeight: '80vh', padding: '2rem' }}>
        <h1>Minimal Footer Example</h1>
        <p>This example shows a footer with only link columns.</p>
      </main>

      <Footer
        showReferral={false}
        showImport={false}
      />
    </div>
  );
}

export default App;
