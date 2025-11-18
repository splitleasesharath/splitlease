/**
 * Stored Items Section
 * Checkboxes for commonly stored items
 * Field: About - Commonly Stored Items (jsonb)
 */

import { useState, useEffect } from 'react';

const COMMON_ITEMS = [
  'Furniture',
  'Clothing',
  'Electronics',
  'Books',
  'Kitchen items',
  'Sports equipment',
  'Musical instruments',
  'Seasonal items'
];

export default function StoredItemsSection({ userData, onUpdate }) {
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (userData) {
      setSelectedItems(userData['About - Commonly Stored Items'] || []);
    }
  }, [userData]);

  const handleItemToggle = async (item) => {
    const newItems = selectedItems.includes(item)
      ? selectedItems.filter(i => i !== item)
      : [...selectedItems, item];

    setSelectedItems(newItems);
    await onUpdate('About - Commonly Stored Items', newItems);
  };

  return (
    <div className="stored-items-section">
      <h3 className="section-subtitle">What items will you typically store?</h3>

      <div className="checkbox-grid">
        {COMMON_ITEMS.map(item => (
          <label key={item} className="checkbox-label">
            <input
              type="checkbox"
              checked={selectedItems.includes(item)}
              onChange={() => handleItemToggle(item)}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
