export default function CancellationPolicySection({ listing, onPolicyChange }) {
  return (
    <div id="cancellation-policy" className="listing-dashboard-section">
      {/* Section Header */}
      <div className="listing-dashboard-section__header">
        <h2 className="listing-dashboard-section__title">Cancellation Policy</h2>
      </div>

      {/* Content */}
      <div className="listing-dashboard-cancellation">
        <select
          className="listing-dashboard-cancellation__select"
          value={listing?.cancellationPolicy || 'Standard'}
          onChange={(e) => onPolicyChange?.(e.target.value)}
        >
          <option value="Standard">Standard</option>
          <option value="Additional Host Restrictions">Additional Host Restrictions</option>
        </select>

        <a
          href="/policies/cancellation-and-refund-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="listing-dashboard-cancellation__link"
        >
          Standard Policy
        </a>
      </div>
    </div>
  );
}
