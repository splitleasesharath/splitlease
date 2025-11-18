import { useState } from 'react';
import AiSignupMarketReport from './AiSignupMarketReport.jsx';

/**
 * Test Page for AI Signup Market Report Component
 *
 * Use this page to test the component locally.
 * Add this to your router to preview: /test-ai-signup
 */
export default function AiSignupMarketReportTestPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastSubmission, setLastSubmission] = useState(null);

  const testScenarios = [
    {
      title: '✅ Perfect Data (Auto-Submit)',
      description: 'Valid email + complete phone = auto-submit',
      text: 'I need a quiet studio apartment near downtown SF for weekly stays.\nContact: john.smith@gmail.com or (415) 555-5555',
    },
    {
      title: '⚠️ Email Typo (Shows Form)',
      description: 'Corrected email typo = shows contact form',
      text: 'Looking for storage space in Oakland area\nEmail: john@gmail,com Phone: (415) 555-5555',
    },
    {
      title: '⚠️ Incomplete Phone (Shows Form)',
      description: 'Partial phone number = shows contact form',
      text: 'Need transport logistics support weekly\njohn@gmail.com call 7834',
    },
    {
      title: '⚠️ No Contact Info (Shows Form)',
      description: 'Missing contact = shows contact form',
      text: 'I need a place for my restaurant equipment storage, monthly basis, climate controlled preferred',
    },
    {
      title: '✅ Multiple Formats',
      description: 'Tests various email/phone formats',
      text: 'Contact me at jane.doe@yahoo.com or 415.555.5555 for lodging needs in San Francisco',
    },
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Test scenario copied to clipboard!');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}>
          <h1 style={{
            margin: '0 0 16px 0',
            fontSize: '32px',
            fontWeight: '700',
            color: '#1a202c',
          }}>
            🧪 AI Signup Market Report - Test Page
          </h1>
          <p style={{
            margin: '0 0 24px 0',
            fontSize: '16px',
            color: '#4a5568',
            lineHeight: '1.6',
          }}>
            Test the AI-powered market research signup modal with various scenarios.
            Click the button below to open the modal, or use the test scenarios to
            pre-fill different data patterns.
          </p>

          <button
            onClick={() => setIsOpen(true)}
            style={{
              padding: '14px 28px',
              background: '#31135D',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(49, 19, 93, 0.3)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#522580';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#31135D';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            🚀 Open AI Signup Modal
          </button>
        </div>

        {/* Test Scenarios */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a202c',
          }}>
            📝 Test Scenarios
          </h2>
          <p style={{
            margin: '0 0 24px 0',
            fontSize: '14px',
            color: '#718096',
          }}>
            Copy these test cases to verify different behaviors:
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {testScenarios.map((scenario, index) => (
              <div
                key={index}
                style={{
                  padding: '20px',
                  background: '#f7fafc',
                  borderRadius: '12px',
                  border: '2px solid #e2e8f0',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  marginBottom: '12px',
                }}>
                  <h3 style={{
                    margin: '0 0 4px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#2d3748',
                  }}>
                    {scenario.title}
                  </h3>
                  <p style={{
                    margin: '0',
                    fontSize: '13px',
                    color: '#718096',
                  }}>
                    {scenario.description}
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  color: '#2d3748',
                  marginBottom: '12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '120px',
                  overflowY: 'auto',
                }}>
                  {scenario.text}
                </div>

                <button
                  onClick={() => copyToClipboard(scenario.text)}
                  style={{
                    padding: '8px 16px',
                    background: '#31135D',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  📋 Copy Text
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Component Info */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a202c',
          }}>
            ℹ️ Component Information
          </h2>

          <div style={{
            display: 'grid',
            gap: '16px',
          }}>
            <InfoItem
              label="Import Path"
              value="./islands/shared/AiSignupMarketReport"
            />
            <InfoItem
              label="Dependencies"
              value="React, lottie-react (already installed)"
            />
            <InfoItem
              label="API Endpoint"
              value="https://app.split.lease/version-test/api/1.1/wf/ai-signup-guest"
            />
            <InfoItem
              label="Lines of Code"
              value="~900 lines (all-in-one)"
            />
            <InfoItem
              label="Features"
              value="Smart extraction, Auto-correction, Lottie animations, Multi-step flow"
            />
          </div>
        </div>

        {/* Integration Example */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '24px',
            fontWeight: '700',
            color: '#1a202c',
          }}>
            💻 Quick Integration Code
          </h2>

          <pre style={{
            padding: '20px',
            background: '#1a202c',
            color: '#e2e8f0',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '14px',
            lineHeight: '1.6',
            fontFamily: 'monospace',
          }}>
{`import { useState } from 'react';
import AiSignupMarketReport from './islands/shared/AiSignupMarketReport';

function MyPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Get Market Report
      </button>

      <AiSignupMarketReport
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}`}
          </pre>
        </div>

        {/* Last Submission Info */}
        {lastSubmission && (
          <div style={{
            background: '#d4edda',
            borderRadius: '16px',
            padding: '24px',
            marginTop: '32px',
            border: '2px solid #c3e6cb',
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#155724',
            }}>
              ✅ Last Submission
            </h3>
            <pre style={{
              margin: '0',
              fontSize: '13px',
              color: '#155724',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {JSON.stringify(lastSubmission, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* The actual component being tested */}
      <AiSignupMarketReport
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={(data) => {
          console.log('Form submitted:', data);
          setLastSubmission(data);
        }}
      />
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{
        fontSize: '13px',
        fontWeight: '600',
        color: '#718096',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '15px',
        color: '#2d3748',
        fontFamily: value.includes('/') || value.includes('~') ? 'monospace' : 'inherit',
      }}>
        {value}
      </div>
    </div>
  );
}
