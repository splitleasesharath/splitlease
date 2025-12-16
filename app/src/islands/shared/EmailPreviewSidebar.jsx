import { useEffect, useRef } from 'react';

/**
 * EmailPreviewSidebar - Sliding sidebar for email preview before sending
 *
 * Displays a live preview of the email using an iframe to render the HTML content,
 * with metadata display and send/cancel actions.
 *
 * Props:
 * - isOpen: boolean - Controls sidebar visibility
 * - onClose: () => void - Called when sidebar should close
 * - onSend: () => void - Called when user confirms sending
 * - emailData: object - Email configuration containing:
 *   - to_email: string
 *   - to_name?: string
 *   - from_email: string
 *   - from_name: string
 *   - subject: string
 *   - htmlContent: string - The rendered HTML email content
 * - loading: boolean - Shows loading state on send button
 */
export default function EmailPreviewSidebar({
  isOpen,
  onClose,
  onSend,
  emailData,
  loading = false,
}) {
  const sidebarRef = useRef(null);
  const iframeRef = useRef(null);

  // Handle escape key to close sidebar
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Update iframe content when emailData changes
  useEffect(() => {
    if (isOpen && iframeRef.current && emailData?.htmlContent) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
      doc.open();
      doc.write(emailData.htmlContent);
      doc.close();
    }
  }, [isOpen, emailData?.htmlContent]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '680px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#fff',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInFromRight 0.3s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F9FAFB',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Email Preview
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B7280' }}>
              Review the email before sending
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#E5E7EB')}
            onMouseOut={(e) => (e.target.style.backgroundColor = 'transparent')}
            aria-label="Close preview"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5l10 10"
                stroke="#6B7280"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Email Metadata */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#fff',
          }}
        >
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#6B7280', minWidth: '60px' }}>
                To:
              </span>
              <span style={{ fontSize: '13px', color: '#111827' }}>
                {emailData?.to_name ? `${emailData.to_name} <${emailData?.to_email}>` : emailData?.to_email}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#6B7280', minWidth: '60px' }}>
                From:
              </span>
              <span style={{ fontSize: '13px', color: '#111827' }}>
                {emailData?.from_name} &lt;{emailData?.from_email}&gt;
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: '#6B7280', minWidth: '60px' }}>
                Subject:
              </span>
              <span style={{ fontSize: '13px', color: '#111827', fontWeight: '500' }}>
                {emailData?.subject}
              </span>
            </div>
          </div>
        </div>

        {/* Email Preview (iframe) */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#F3F4F6',
            padding: '24px',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              maxWidth: '600px',
              margin: '0 auto',
            }}
          >
            <iframe
              ref={iframeRef}
              title="Email Preview"
              style={{
                width: '100%',
                minHeight: '500px',
                border: 'none',
                display: 'block',
              }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#fff',
              color: '#374151',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#F3F4F6';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#fff';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSend}
            disabled={loading}
            style={{
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: loading ? '#9CA3AF' : '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#047857';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.target.style.backgroundColor = '#059669';
              }
            }}
          >
            {loading ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: 'spin 1s linear infinite' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="30 60"
                  />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Send Email
              </>
            )}
          </button>
        </div>
      </div>

      {/* CSS Animation */}
      <style>
        {`
          @keyframes slideInFromRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </>
  );
}
