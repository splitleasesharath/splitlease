/**
 * Example usage of the SignUpLoginModal component
 * Demonstrates how to integrate the modal into your application
 */

import React, { useState } from 'react';
import { SignUpLoginModal } from './SignUpLoginModal';
import type { User } from './types';

export const SignUpLoginExample: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Example: Handle successful authentication
  const handleAuthSuccess = (user: User) => {
    console.log('User authenticated:', user);
    setCurrentUser(user);
    setIsModalOpen(false);

    // You might want to:
    // 1. Store user in global state (Redux, Zustand, Context, etc.)
    // 2. Save auth token to localStorage
    // 3. Redirect user to dashboard
    // 4. Initialize analytics
    // etc.
  };

  // Example: Logout
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('authToken');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>SignUpLoginModal Example</h1>

      {/* User Status Display */}
      <div style={{
        padding: '20px',
        background: '#f3f4f6',
        borderRadius: '8px',
        marginBottom: '24px'
      }}>
        {currentUser ? (
          <div>
            <p>✅ Logged in as: <strong>{currentUser.firstName} {currentUser.lastName}</strong></p>
            <p>Email: {currentUser.email}</p>
            <button
              onClick={handleLogout}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                marginTop: '8px'
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <p>❌ Not logged in</p>
        )}
      </div>

      {/* Example Buttons */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '12px 24px',
            background: '#7C3AED',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Open Auth Modal
        </button>
      </div>

      {/* Example: Modal with default props */}
      <SignUpLoginModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Example code snippets */}
      <div style={{ marginTop: '48px' }}>
        <h2>Usage Examples</h2>

        <ExampleSection
          title="1. Basic Usage"
          code={`
import { SignUpLoginModal } from './components/SignUpLoginModal';

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Login</button>
      <SignUpLoginModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAuthSuccess={(user) => console.log(user)}
      />
    </>
  );
}
          `}
        />

        <ExampleSection
          title="2. With Default Email"
          code={`
<SignUpLoginModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  defaultEmail="user@example.com"
  onAuthSuccess={handleAuthSuccess}
/>
          `}
        />

        <ExampleSection
          title="3. With Referral Data"
          code={`
const referralData = {
  id: 'ref_123',
  cashbackPoints: 50,
  cesScore: 10,
  referrantName: 'John Doe',
  code: 'FRIEND50'
};

<SignUpLoginModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  referral={referralData}
  onAuthSuccess={handleAuthSuccess}
/>
          `}
        />

        <ExampleSection
          title="4. Disable Close (Force Action)"
          code={`
<SignUpLoginModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  disableClose={true}
  onAuthSuccess={handleAuthSuccess}
/>
          `}
        />

        <ExampleSection
          title="5. With Context Tracking"
          code={`
<SignUpLoginModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  fromPageType="pricing-page"
  fromTrialHost={true}
  onAuthSuccess={handleAuthSuccess}
/>
          `}
        />
      </div>
    </div>
  );
};

// Helper component for displaying code examples
const ExampleSection: React.FC<{ title: string; code: string }> = ({ title, code }) => (
  <div style={{ marginBottom: '32px' }}>
    <h3 style={{ marginBottom: '12px' }}>{title}</h3>
    <pre style={{
      background: '#1e293b',
      color: '#e2e8f0',
      padding: '16px',
      borderRadius: '8px',
      overflow: 'auto',
      fontSize: '14px',
      lineHeight: '1.6'
    }}>
      <code>{code.trim()}</code>
    </pre>
  </div>
);

export default SignUpLoginExample;
