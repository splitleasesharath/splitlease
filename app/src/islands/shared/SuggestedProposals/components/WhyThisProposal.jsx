/**
 * WhyThisProposal
 *
 * Displays AI-generated explanation for why this proposal
 * was suggested to the guest.
 */

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
          <span className="sp-why-icon">💡</span>
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
        <span className="sp-why-icon">💡</span>
        Why This Listing?
      </h3>
      <p className="sp-why-text">{parseMarkdownBold(summary)}</p>
    </div>
  );
}
