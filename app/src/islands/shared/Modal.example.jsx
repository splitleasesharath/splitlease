import { useState } from 'react';
import Modal from './Modal.jsx';

/**
 * Modal Component Usage Examples
 *
 * This file demonstrates various ways to use the Modal component
 * following the architecture requirements and best practices.
 */

export default function ModalExamples() {
  const [basicModalOpen, setBasicModalOpen] = useState(false);
  const [titleModalOpen, setTitleModalOpen] = useState(false);
  const [noCloseModalOpen, setNoCloseModalOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Modal Component Examples</h1>

      {/* Example 1: Basic Modal */}
      <section style={{ marginBottom: '40px' }}>
        <h2>1. Basic Modal</h2>
        <p>Simple modal with default settings - close on ESC and overlay click</p>
        <button onClick={() => setBasicModalOpen(true)}>Open Basic Modal</button>

        <Modal
          isOpen={basicModalOpen}
          onClose={() => setBasicModalOpen(false)}
        >
          <p>This is a basic modal with default settings.</p>
          <p>Click the X button, press ESC, or click outside to close.</p>
        </Modal>
      </section>

      {/* Example 2: Modal with Title */}
      <section style={{ marginBottom: '40px' }}>
        <h2>2. Modal with Title</h2>
        <p>Modal with a title header</p>
        <button onClick={() => setTitleModalOpen(true)}>Open Modal with Title</button>

        <Modal
          isOpen={titleModalOpen}
          onClose={() => setTitleModalOpen(false)}
          title="Welcome to Split Lease"
        >
          <p>This modal has a title and can be customized with various options.</p>
          <p>The title appears at the top with proper spacing and styling.</p>
        </Modal>
      </section>

      {/* Example 3: Modal with No Overlay/ESC Close */}
      <section style={{ marginBottom: '40px' }}>
        <h2>3. Modal with Restricted Close Options</h2>
        <p>Modal that requires explicit button click to close</p>
        <button onClick={() => setNoCloseModalOpen(true)}>Open Restricted Modal</button>

        <Modal
          isOpen={noCloseModalOpen}
          onClose={() => setNoCloseModalOpen(false)}
          title="Important Message"
          closeOnOverlayClick={false}
          closeOnEsc={false}
        >
          <p>This modal can only be closed by clicking the X button.</p>
          <p>ESC key and overlay clicks are disabled.</p>
          <p>Use this for critical confirmations.</p>
        </Modal>
      </section>

      {/* Example 4: Custom Styled Modal */}
      <section style={{ marginBottom: '40px' }}>
        <h2>4. Custom Styled Modal</h2>
        <p>Modal with custom className for additional styling</p>
        <button onClick={() => setCustomModalOpen(true)}>Open Custom Modal</button>

        <Modal
          isOpen={customModalOpen}
          onClose={() => setCustomModalOpen(false)}
          title="Custom Styled Modal"
          className="custom-modal"
        >
          <div style={{ padding: '20px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <p style={{ color: '#5B21B6', fontWeight: 'bold' }}>This modal has custom styling.</p>
            <p>You can add any className to apply your own styles.</p>
          </div>
        </Modal>
      </section>

      {/* Example 5: Form Modal */}
      <section style={{ marginBottom: '40px' }}>
        <h2>5. Form Modal</h2>
        <p>Modal containing a form with submit and cancel actions</p>
        <button onClick={() => setFormModalOpen(true)}>Open Form Modal</button>

        <Modal
          isOpen={formModalOpen}
          onClose={() => setFormModalOpen(false)}
          title="Sign In to Split Lease"
          closeOnOverlayClick={false}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert('Form submitted!');
              setFormModalOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <div>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '8px' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '8px' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#5B21B6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            </div>
          </form>
        </Modal>
      </section>

      {/* Usage Documentation */}
      <section style={{ marginTop: '60px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
        <h2>Props Documentation</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px', textAlign: 'left' }}>Prop</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Default</th>
              <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}><code>isOpen</code></td>
              <td style={{ padding: '12px' }}>boolean</td>
              <td style={{ padding: '12px' }}>false</td>
              <td style={{ padding: '12px' }}>Controls modal visibility</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}><code>onClose</code></td>
              <td style={{ padding: '12px' }}>function</td>
              <td style={{ padding: '12px' }}>required</td>
              <td style={{ padding: '12px' }}>Callback when modal should close</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}><code>children</code></td>
              <td style={{ padding: '12px' }}>React.ReactNode</td>
              <td style={{ padding: '12px' }}>-</td>
              <td style={{ padding: '12px' }}>Modal content</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}><code>title</code></td>
              <td style={{ padding: '12px' }}>string</td>
              <td style={{ padding: '12px' }}>-</td>
              <td style={{ padding: '12px' }}>Optional modal title</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}><code>className</code></td>
              <td style={{ padding: '12px' }}>string</td>
              <td style={{ padding: '12px' }}>''</td>
              <td style={{ padding: '12px' }}>Additional CSS classes</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}><code>closeOnOverlayClick</code></td>
              <td style={{ padding: '12px' }}>boolean</td>
              <td style={{ padding: '12px' }}>true</td>
              <td style={{ padding: '12px' }}>Close when clicking overlay</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}><code>closeOnEsc</code></td>
              <td style={{ padding: '12px' }}>boolean</td>
              <td style={{ padding: '12px' }}>true</td>
              <td style={{ padding: '12px' }}>Close when pressing ESC</td>
            </tr>
            <tr>
              <td style={{ padding: '12px' }}><code>showCloseButton</code></td>
              <td style={{ padding: '12px' }}>boolean</td>
              <td style={{ padding: '12px' }}>true</td>
              <td style={{ padding: '12px' }}>Show X close button</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
