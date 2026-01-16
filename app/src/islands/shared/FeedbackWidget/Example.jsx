/**
 * FeedbackWidget Example Usage
 *
 * This file demonstrates various ways to use the FeedbackWidget component.
 * Copy and adapt these patterns for your specific use case.
 */

import FeedbackWidget from './FeedbackWidget';

/**
 * Basic Usage - Simplest form with just Slack email
 */
export function BasicExample() {
  return (
    <FeedbackWidget
      slackEmail="feedback-aaaablafdp7lezfibdmqqhuywa@splitlease.slack.com"
    />
  );
}

/**
 * With Custom Page Name - Override the auto-detected page title
 */
export function CustomPageNameExample() {
  return (
    <FeedbackWidget
      slackEmail="feedback-aaaablafdp7lezfibdmqqhuywa@splitlease.slack.com"
      pageName="House Manual - WiFi Instructions"
    />
  );
}

/**
 * With Custom Prompt - Different question text
 */
export function CustomPromptExample() {
  return (
    <FeedbackWidget
      slackEmail="feedback-aaaablafdp7lezfibdmqqhuywa@splitlease.slack.com"
      promptText="Did this answer your question?"
    />
  );
}

/**
 * With Custom Feedback Handler - Process feedback yourself
 */
export function CustomHandlerExample() {
  const handleFeedbackSend = async (feedbackData) => {
    // Custom logic to send feedback to your backend
    console.log('Feedback received:', feedbackData);

    // Example: Send to your own API
    // const response = await fetch('/api/feedback', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(feedbackData)
    // });
    // return response.ok;

    // Return true to indicate success
    return true;
  };

  const handleFeedbackSubmitted = (data) => {
    // Analytics or logging after successful submission
    console.log('Analytics:', data.sentiment, data.pageName);
  };

  return (
    <FeedbackWidget
      slackEmail="feedback-aaaablafdp7lezfibdmqqhuywa@splitlease.slack.com"
      onFeedbackSend={handleFeedbackSend}
      onFeedbackSubmitted={handleFeedbackSubmitted}
    />
  );
}

/**
 * Full Featured Example - All options
 */
export function FullFeaturedExample() {
  return (
    <FeedbackWidget
      slackEmail="feedback-aaaablafdp7lezfibdmqqhuywa@splitlease.slack.com"
      pageName="Listing Page - Amenities Section"
      promptText="Was this information helpful?"
      className="my-custom-class"
      onFeedbackSend={async (data) => {
        // Custom send logic
        console.log('Sending:', data);
        return true;
      }}
      onFeedbackSubmitted={(data) => {
        // Track analytics
        console.log('Submitted:', data);
      }}
    />
  );
}

/**
 * Multiple Widgets on Same Page
 * Each widget can track feedback for different sections
 */
export function MultipleWidgetsExample() {
  return (
    <div>
      <section>
        <h2>Check-in Instructions</h2>
        <p>Content about check-in...</p>
        <FeedbackWidget
          slackEmail="feedback@splitlease.slack.com"
          pageName="House Manual - Check-in Instructions"
        />
      </section>

      <section>
        <h2>WiFi Information</h2>
        <p>Content about WiFi...</p>
        <FeedbackWidget
          slackEmail="feedback@splitlease.slack.com"
          pageName="House Manual - WiFi Information"
        />
      </section>

      <section>
        <h2>House Rules</h2>
        <p>Content about rules...</p>
        <FeedbackWidget
          slackEmail="feedback@splitlease.slack.com"
          pageName="House Manual - House Rules"
        />
      </section>
    </div>
  );
}

/**
 * Demo Page Component
 * A complete page showing the widget in context
 */
export default function FeedbackWidgetDemo() {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: "'Lato', sans-serif"
    }}>
      <header style={{
        textAlign: 'center',
        marginBottom: '40px',
        padding: '40px',
        background: '#31135D',
        color: 'white',
        borderRadius: '12px'
      }}>
        <h1>Split Lease House Manual</h1>
      </header>

      <section style={{
        background: '#f8fafc',
        padding: '30px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2 style={{ color: '#31135D', marginTop: 0 }}>Maintenance Requests</h2>
        <p style={{ color: '#374151', lineHeight: 1.6 }}>
          For maintenance issues, log into your Split Lease dashboard and navigate to
          the &apos;Maintenance&apos; section. You can submit a request with photos and
          description. Expect a response within 24 hours.
        </p>

        <FeedbackWidget
          slackEmail="feedback-aaaablafdp7lezfibdmqqhuywa@splitlease.slack.com"
          pageName="House Manual - Maintenance Requests"
          promptText="Was this information helpful?"
        />
      </section>

      <section style={{
        background: '#f8fafc',
        padding: '30px',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <h2 style={{ color: '#31135D', marginTop: 0 }}>Rent Payments</h2>
        <p style={{ color: '#374151', lineHeight: 1.6 }}>
          Monthly rent is due on the 1st of each month. Payment can be made via
          bank transfer, credit card, or ACH direct debit. Set up autopay in your
          dashboard for convenience.
        </p>

        <FeedbackWidget
          slackEmail="feedback-aaaablafdp7lezfibdmqqhuywa@splitlease.slack.com"
          pageName="House Manual - Rent Payments"
          promptText="Was this information helpful?"
        />
      </section>
    </div>
  );
}
