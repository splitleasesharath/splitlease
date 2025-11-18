/**
 * Transportation Section Component
 * Field: transportation medium (dropdown)
 * Workflow: D: transit options's value is changed (Workflow 24)
 */

import { useState, useEffect } from 'react';

const TRANSPORTATION_OPTIONS = [
  { value: '', label: 'Select transportation' },
  { value: 'Car', label: 'Car' },
  { value: 'Public Transit', label: 'Public Transit' },
  { value: 'Bike', label: 'Bike' },
  { value: 'Walk', label: 'Walk' },
  { value: 'Rideshare', label: 'Rideshare (Uber/Lyft)' },
  { value: 'Other', label: 'Other' }
];

export default function TransportationSection({ userData, onUpdate }) {
  const [transportation, setTransportation] = useState('');

  useEffect(() => {
    if (userData) {
      setTransportation(userData['transportation medium'] || '');
    }
  }, [userData]);

  const handleChange = async (e) => {
    const value = e.target.value;
    setTransportation(value);
    await onUpdate('transportation medium', value);
  };

  return (
    <div className="transportation-section">
      <h3 className="section-subtitle">How do you typically get around?</h3>
      <select
        className="form-select"
        value={transportation}
        onChange={handleChange}
      >
        {TRANSPORTATION_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
