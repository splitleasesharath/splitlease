import { useState } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import EmailPreviewSidebar from '../shared/EmailPreviewSidebar.jsx';
import { supabase } from '../../lib/supabase.js';
import { renderGeneralEmailTemplate } from '../../lib/emailTemplateRenderer.js';

/**
 * InternalTestPage - Development/QA testing page
 *
 * Button 1: Send Email - Opens preview sidebar, then sends via SendGrid
 * Button 2: Send SMS - Sends test SMS via Twilio
 * Buttons 3-25: Placeholder test buttons for future functionality
 */
export default function InternalTestPage() {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  // Email preview sidebar state
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewData, setEmailPreviewData] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  /**
   * Get the email configuration for testing
   * Centralized so preview and send use identical data
   */
  const getTestEmailConfig = () => {
    const timestamp = new Date().toLocaleString();
    return {
      template_id: '1756320055390x685004717147094100', // "General Email Template 4"
      to_email: 'splitleasesharath@gmail.com',
      to_name: 'Sharath',
      from_email: 'tech@leasesplit.com',
      from_name: 'Split Lease Tech',
      subject: 'Test Email from Internal Test Page',
      variables: {
        // Required template placeholders for "General Email Template 4"
        title: 'Test Email Title',
        bodytext1: 'This is the first paragraph of the test email. It demonstrates that the email template system is working correctly.',
        bodytext2: 'This is the second paragraph with additional information. Sent at: ' + timestamp,
        button_url: 'https://splitlease.com',
        button_text: 'Visit Split Lease',
        logourl: 'https://splitlease.com/assets/images/split-lease-logo.png',
        preheadertext: 'Test email from Split Lease Internal Test Page',
        // Optional placeholders (can be empty)
        warningmessage: '',
        banner: '',
        cc_email: '',
        bcc_email: '',
        message_id: '',
        in_reply_to: '',
        references: '',
      }
    };
  };

  /**
   * Step 1: Open email preview sidebar
   * Generates a client-side preview of the email before sending
   */
  const handlePreviewEmail = () => {
    const config = getTestEmailConfig();

    // Generate HTML preview using the same template structure
    const htmlContent = renderGeneralEmailTemplate({
      subject: config.subject,
      title: config.variables.title,
      bodytext1: config.variables.bodytext1,
      bodytext2: config.variables.bodytext2,
      button_url: config.variables.button_url,
      button_text: config.variables.button_text,
      logourl: config.variables.logourl,
      preheadertext: config.variables.preheadertext,
      warningmessage: config.variables.warningmessage,
      banner: config.variables.banner,
    });

    setEmailPreviewData({
      ...config,
      htmlContent,
    });
    setShowEmailPreview(true);
  };

  /**
   * Step 2: Actually send the email after preview confirmation
   * Called from the sidebar's "Send" button
   */
  const handleSendEmail = async () => {
    setSendingEmail(true);
    setResults(prev => ({ ...prev, 1: null }));

    try {
      // Get current session for Bearer token
      const { data: { session } } = await supabase.auth.getSession();

      const config = getTestEmailConfig();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'send',
            payload: {
              template_id: config.template_id,
              to_email: config.to_email,
              to_name: config.to_name,
              from_email: config.from_email,
              from_name: config.from_name,
              subject: config.subject,
              variables: config.variables,
            }
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        setResults(prev => ({
          ...prev,
          1: { success: true, message: `Email sent! Message ID: ${result.data?.message_id || 'N/A'}` }
        }));
        console.log('[InternalTestPage] Email sent successfully:', result);
        // Close sidebar on success
        setShowEmailPreview(false);
      } else {
        setResults(prev => ({
          ...prev,
          1: { success: false, message: result.error || 'Unknown error' }
        }));
        console.error('[InternalTestPage] Email send failed:', result);
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        1: { success: false, message: error.message }
      }));
      console.error('[InternalTestPage] Email send error:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  /**
   * Send test SMS via send-sms Edge Function
   * Direct Twilio proxy - sends to/from/body
   */
  const handleSendSMS = async () => {
    setLoading(prev => ({ ...prev, 2: true }));
    setResults(prev => ({ ...prev, 2: null }));

    try {
      // Get current session for Bearer token
      const { data: { session } } = await supabase.auth.getSession();

      const timestamp = new Date().toLocaleTimeString();
      const messageBody = `Test SMS from Split Lease Internal Test Page. Sent at: ${timestamp}`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'send',
            payload: {
              to: '+13137575323',
              from: '+14155692985',
              body: messageBody,
            }
          })
        }
      );

      const result = await response.json();

      if (result.success) {
        setResults(prev => ({
          ...prev,
          2: { success: true, message: `SMS queued! SID: ${result.data?.message_sid || 'N/A'}` }
        }));
        console.log('[InternalTestPage] SMS sent successfully:', result);
      } else {
        setResults(prev => ({
          ...prev,
          2: { success: false, message: result.error || 'Unknown error' }
        }));
        console.error('[InternalTestPage] SMS send failed:', result);
      }
    } catch (error) {
      setResults(prev => ({
        ...prev,
        2: { success: false, message: error.message }
      }));
      console.error('[InternalTestPage] SMS send error:', error);
    } finally {
      setLoading(prev => ({ ...prev, 2: false }));
    }
  };

  /**
   * Generic button click handler for placeholder buttons
   */
  const handleButtonClick = (buttonNumber) => {
    console.log(`Button ${buttonNumber} clicked`);
    setResults(prev => ({
      ...prev,
      [buttonNumber]: { success: true, message: `Button ${buttonNumber} clicked at ${new Date().toLocaleTimeString()}` }
    }));
  };

  /**
   * Button configuration - defines label and action for each button
   */
  const buttonConfig = {
    1: { label: 'Send Email', action: handlePreviewEmail, color: '#059669' },  // Green for email - now opens preview
    2: { label: 'Send SMS', action: handleSendSMS, color: '#2563EB' },      // Blue for SMS
  };

  /**
   * Get button style based on state
   */
  const getButtonStyle = (num, isHovered) => {
    const config = buttonConfig[num];
    const baseColor = config?.color || '#7C3AED';
    const hoverColor = config?.color ? darkenColor(config.color) : '#6D28D9';

    return {
      padding: '16px 24px',
      fontSize: '14px',
      fontWeight: '500',
      backgroundColor: loading[num] ? '#9CA3AF' : (isHovered ? hoverColor : baseColor),
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: loading[num] ? 'wait' : 'pointer',
      transition: 'all 0.2s ease',
      minHeight: '60px',
      transform: isHovered && !loading[num] ? 'translateY(-2px)' : 'translateY(0)',
      opacity: loading[num] ? 0.7 : 1,
    };
  };

  /**
   * Darken a hex color by ~10%
   */
  const darkenColor = (hex) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - 25);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - 25);
    const b = Math.max(0, (num & 0x0000FF) - 25);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  return (
    <>
      <Header />

      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
        minHeight: 'calc(100vh - 200px)'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          Internal Test Page
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#6B7280',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          Test buttons for edge functions and internal functionality
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {Array.from({ length: 25 }, (_, i) => i + 1).map((num) => {
            const config = buttonConfig[num];
            const label = config?.label || `Button ${num}`;
            const action = config?.action || (() => handleButtonClick(num));

            return (
              <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={action}
                  disabled={loading[num]}
                  style={getButtonStyle(num, false)}
                  onMouseOver={(e) => {
                    if (!loading[num]) {
                      const config = buttonConfig[num];
                      e.target.style.backgroundColor = config?.color ? darkenColor(config.color) : '#6D28D9';
                      e.target.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loading[num]) {
                      const config = buttonConfig[num];
                      e.target.style.backgroundColor = config?.color || '#7C3AED';
                      e.target.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {loading[num] ? 'Sending...' : label}
                </button>

                {/* Result display */}
                {results[num] && (
                  <div style={{
                    fontSize: '12px',
                    padding: '8px',
                    borderRadius: '4px',
                    backgroundColor: results[num].success ? '#D1FAE5' : '#FEE2E2',
                    color: results[num].success ? '#065F46' : '#991B1B',
                    wordBreak: 'break-word'
                  }}>
                    {results[num].message}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Test Configuration Info */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#4B5563'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Test Configuration</h3>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
            <li><strong>Send Email:</strong> Opens preview sidebar → To: splitleasesharath@gmail.com</li>
            <li><strong>Send SMS:</strong> To: +1 (313) 757-5323 | From: +1 (415) 569-2985</li>
            <li><strong>Email Template ID:</strong> 1756320055390x685004717147094100 ("General Email Template 4")</li>
            <li><strong>Email Placeholders:</strong> title, bodytext1, bodytext2, button_url, button_text, logourl, preheadertext</li>
            <li><strong>SMS Payload:</strong> Direct Twilio proxy (to, from, body) - no templates</li>
          </ul>
        </div>
      </main>

      <Footer />

      {/* Email Preview Sidebar */}
      <EmailPreviewSidebar
        isOpen={showEmailPreview}
        onClose={() => setShowEmailPreview(false)}
        onSend={handleSendEmail}
        emailData={emailPreviewData}
        loading={sendingEmail}
      />
    </>
  );
}
