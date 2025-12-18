import { useState, useEffect } from 'react';

// Policy IDs from reference_table.zat_features_cancellationpolicy
const POLICY_IDS = {
  STANDARD: '1665431440883x653177548350901500',
  ADDITIONAL_RESTRICTIONS: '1665431684611x656977293321267800',
};

export default function CancellationPolicySection({ listing, onPolicyChange, onRestrictionsChange }) {
  // Determine if the current policy is "Additional Host Restrictions"
  const isAdditionalRestrictions = listing?.cancellationPolicy === POLICY_IDS.ADDITIONAL_RESTRICTIONS ||
    listing?.cancellationPolicy === 'Additional Host Restrictions';

  const [showRestrictionsInput, setShowRestrictionsInput] = useState(isAdditionalRestrictions);
  const [restrictionsText, setRestrictionsText] = useState(listing?.cancellationPolicyAdditionalRestrictions || '');
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when listing data changes
  useEffect(() => {
    const isAdditional = listing?.cancellationPolicy === POLICY_IDS.ADDITIONAL_RESTRICTIONS ||
      listing?.cancellationPolicy === 'Additional Host Restrictions';
    setShowRestrictionsInput(isAdditional);
    setRestrictionsText(listing?.cancellationPolicyAdditionalRestrictions || '');
  }, [listing?.cancellationPolicy, listing?.cancellationPolicyAdditionalRestrictions]);

  const handlePolicyChange = async (e) => {
    const selectedValue = e.target.value;
    const isAdditional = selectedValue === 'Additional Host Restrictions';

    setShowRestrictionsInput(isAdditional);
    setIsSaving(true);

    try {
      // Convert display value to policy ID for database storage
      const policyId = isAdditional ? POLICY_IDS.ADDITIONAL_RESTRICTIONS : POLICY_IDS.STANDARD;
      await onPolicyChange?.(policyId);

      // If switching away from additional restrictions, clear the text
      if (!isAdditional && restrictionsText) {
        setRestrictionsText('');
        await onRestrictionsChange?.('');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestrictionsBlur = async () => {
    if (restrictionsText !== listing?.cancellationPolicyAdditionalRestrictions) {
      setIsSaving(true);
      try {
        await onRestrictionsChange?.(restrictionsText);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Convert policy ID to display value for the select
  const getDisplayValue = () => {
    if (listing?.cancellationPolicy === POLICY_IDS.ADDITIONAL_RESTRICTIONS ||
        listing?.cancellationPolicy === 'Additional Host Restrictions') {
      return 'Additional Host Restrictions';
    }
    return 'Standard';
  };

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
          value={getDisplayValue()}
          onChange={handlePolicyChange}
          disabled={isSaving}
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

      {/* Additional Restrictions Input */}
      {showRestrictionsInput && (
        <div className="listing-dashboard-cancellation__restrictions">
          <label
            htmlFor="cancellation-restrictions"
            className="listing-dashboard-cancellation__restrictions-label"
          >
            Specify your additional restrictions:
          </label>
          <textarea
            id="cancellation-restrictions"
            className="listing-dashboard-cancellation__restrictions-input"
            placeholder="Enter your additional cancellation restrictions here..."
            value={restrictionsText}
            onChange={(e) => setRestrictionsText(e.target.value)}
            onBlur={handleRestrictionsBlur}
            disabled={isSaving}
            rows={4}
          />
          {isSaving && (
            <span className="listing-dashboard-cancellation__saving">Saving...</span>
          )}
        </div>
      )}
    </div>
  );
}
