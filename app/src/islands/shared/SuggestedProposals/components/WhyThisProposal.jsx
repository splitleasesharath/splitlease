/**
 * WhyThisProposal
 *
 * Displays AI-generated explanation for why this proposal
 * was suggested to the guest.
 */

/**
 * @param {Object} props
 * @param {string} props.summary - AI-generated summary text
 */
export default function WhyThisProposal({ summary }) {
  // TODO(human): Implement the summary display logic
  // The summary comes from negotiationsummary table and explains
  // why this listing was suggested to the guest.
  // Consider: Should we show a default message when no summary exists?
  // Should we truncate long summaries with "Read more"?
  // Should we add visual indicators (icons, highlights)?

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
      <p className="sp-why-text">{summary}</p>
    </div>
  );
}
