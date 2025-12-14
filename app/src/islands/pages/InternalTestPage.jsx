import { useState } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { supabase } from '../../lib/supabase.js';

/**
 * InternalTestPage - Development/QA testing page
 *
 * Button 1: Send Email - Sends test email via SendGrid
 * Button 2: Send SMS - Sends test SMS via Twilio
 * Buttons 3-25: Placeholder test buttons for future functionality
 */
export default function InternalTestPage() {
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});

  /**
   * Send test email via send-email Edge Function
   * Uses SendGrid to deliver templated email
   */
  const handleSendEmail = async () => {
    setLoading(prev => ({ ...prev, 1: true }));
    setResults(prev => ({ ...prev, 1: null }));

    try {
      // Get current session for Bearer token
      const { data: { session } } = await supabase.auth.getSession();

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
              template_id: '1756320055390x685004717147094100', // "General Email Template 4"
              to_email: 'splitleasesharath@gmail.com',
              to_name: 'Sharath',
              from_email: 'tech@leasesplit.com',
              from_name: 'Split Lease Tech',
              subject: 'Test Email from Internal Test Page',
              variables: {
                test_message: 'This is a test email sent from the Internal Test Page.',
                timestamp: new Date().toLocaleString(),
              }
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
      setLoading(prev => ({ ...prev, 1: false }));
    }
  };

  /**
   * Send test SMS via send-sms Edge Function
   * Uses Twilio to deliver templated SMS
   */
  const handleSendSMS = async () => {
    setLoading(prev => ({ ...prev, 2: true }));
    setResults(prev => ({ ...prev, 2: null }));

    try {
      // Get current session for Bearer token
      const { data: { session } } = await supabase.auth.getSession();

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
              template_id: 'test_sms_template', // Will need a valid template ID
              to_phone: '+13137575323',
              variables: {
                test_message: 'Test SMS from Internal Test Page',
                timestamp: new Date().toLocaleTimeString(),
              }
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
    1: { label: 'Send Email', action: handleSendEmail, color: '#059669' },  // Green for email
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
            <li><strong>Send Email:</strong> To: splitleasesharath@gmail.com | From: tech@leasesplit.com</li>
            <li><strong>Send SMS:</strong> To: +1 (313) 757-5323</li>
            <li><strong>Email Template ID:</strong> 1756320055390x685004717147094100 ("General Email Template 4")</li>
            <li><strong>SMS Template ID:</strong> test_sms_template (needs valid ID)</li>
          </ul>
        </div>
      </main>

      <Footer />
    </>
  );
}
