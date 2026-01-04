/**
 * StorageItemsCard.jsx
 *
 * Storage items chip selection card.
 * Shows selectable chips for items the guest needs to store.
 *
 * Public View: Shows gray item tags with subtle border (per design).
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';
import SelectableChip from '../shared/SelectableChip.jsx';

export default function StorageItemsCard({
  selectedItems = [],
  itemsList = [],
  onChipToggle,
  readOnly = false
}) {
  // Get selected item names for display
  const selectedItemNames = itemsList
    .filter(item => selectedItems.includes(item._id))
    .map(item => item.Name);

  if (readOnly) {
    return (
      <ProfileCard
        title="Items I Typically Store"
        subtitle="Things I may keep at the space"
      >
        {selectedItemNames.length > 0 ? (
          <div className="public-items-grid">
            {selectedItemNames.map((name, index) => (
              <span key={index} className="public-item-tag">{name}</span>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--sl-text-tertiary)', fontSize: '14px' }}>
            No storage needs specified
          </p>
        )}
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="What You'll Need to Store">
      <p style={{ fontSize: '14px', color: 'var(--sl-text-secondary)', marginBottom: '16px' }}>
        Select the items you typically bring with you:
      </p>
      <div className="chip-container">
        {itemsList.map(item => (
          <SelectableChip
            key={item._id}
            label={item.Name}
            selected={selectedItems.includes(item._id)}
            onChange={() => onChipToggle('storageItems', item._id)}
          />
        ))}
      </div>
    </ProfileCard>
  );
}
