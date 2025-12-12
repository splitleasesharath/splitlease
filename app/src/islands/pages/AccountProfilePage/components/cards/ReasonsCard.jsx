/**
 * ReasonsCard.jsx
 *
 * "Reasons to Host Me" chip selection card.
 * Shows selectable chips for good guest reasons.
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';
import SelectableChip from '../shared/SelectableChip.jsx';

export default function ReasonsCard({
  selectedReasons = [],
  reasonsList = [],
  onChipToggle,
  readOnly = false
}) {
  // Get selected reason names for display
  const selectedReasonNames = reasonsList
    .filter(reason => selectedReasons.includes(reason._id))
    .map(reason => reason.name);

  if (readOnly) {
    return (
      <ProfileCard title="Reasons to Host">
        {selectedReasonNames.length > 0 ? (
          <div className="chip-container">
            {selectedReasonNames.map((name, index) => (
              <SelectableChip
                key={index}
                label={name}
                selected={true}
                variant="success"
                readOnly={true}
              />
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--sl-text-tertiary)', fontSize: '14px' }}>
            No reasons selected
          </p>
        )}
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="Reasons to Host Me">
      <p style={{ fontSize: '14px', color: 'var(--sl-text-secondary)', marginBottom: '16px' }}>
        Select the qualities that make you a great guest:
      </p>
      <div className="chip-container">
        {reasonsList.map(reason => (
          <SelectableChip
            key={reason._id}
            label={reason.name}
            selected={selectedReasons.includes(reason._id)}
            variant="success"
            onChange={() => onChipToggle('goodGuestReasons', reason._id)}
          />
        ))}
      </div>
    </ProfileCard>
  );
}
