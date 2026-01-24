/**
 * WhyThisProposal
 *
 * Displays AI-generated explanation for why this proposal
 * was suggested to the guest.
 *
 * Icons: All icons from Feather Icons (https://feathericons.com)
 * - info: "Why This Listing?" header icon
 */

/**
 * Feather: info icon
 * Source: https://feathericons.com/?query=info
 */
const InfoIcon = () => (
  <svg
    className="sp-why-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

/**
 * Parse markdown bold syntax (**text**) and return React elements
 * @param {string} text - Text with markdown bold syntax
 * @returns {Array} Array of React elements (strings and <strong> elements)
 */
function parseMarkdownBold(text) {
  if (!text) return text;

  // Split by **text** pattern, capturing the bold content
  const parts = text.split(/\*\*([^*]+)\*\*/g);

  return parts.map((part, index) => {
    // Odd indices are the captured bold text
    if (index % 2 === 1) {
      return <strong key={index}>{part}</strong>;
    }
    return part;
  });
}

/**
 * @param {Object} props
 * @param {string} props.summary - AI-generated summary text (may contain **bold** markdown)
 */
export default function WhyThisProposal({ summary }) {
  if (!summary) {
    return (
      <div className="sp-why-section">
        <h3 className="sp-why-title">
          <span className="sp-why-icon">
            <InfoIcon />
          </span>
          Why This Listing?
        </h3>
        <p className="sp-why-text sp-why-text--placeholder">
          Our team selected this listing based on your preferences and requirements.
        </p>
      </div>
    );
  }

  return (
    <div className="sp-why-section">
      <h3 className="sp-why-title">
        <span className="sp-why-icon">
          <InfoIcon />
        </span>
        Why This Listing?
      </h3>
      <p className="sp-why-text">{parseMarkdownBold(summary)}</p>
    </div>
  );
}
