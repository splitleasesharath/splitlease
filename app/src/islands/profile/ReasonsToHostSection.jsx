/**
 * Reasons to Host Me Section
 * Checkboxes + custom text input
 * Fields: Reasons to Host me (jsonb), About - reasons to host me (text)
 */

import { useState, useEffect } from 'react';

const PRESET_REASONS = [
  'I\'m clean and organized',
  'I\'m quiet and respectful',
  'I have excellent references',
  'I\'m financially stable',
  'I\'m a working professional',
  'I\'m a student'
];

export default function ReasonsToHostSection({ userData, onUpdate, onProfileCompletenessUpdate }) {
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (userData) {
      setSelectedReasons(userData['Reasons to Host me'] || []);
      setCustomReason(userData['About - reasons to host me'] || '');
    }
  }, [userData]);

  const handleReasonToggle = async (reason) => {
    const newReasons = selectedReasons.includes(reason)
      ? selectedReasons.filter(r => r !== reason)
      : [...selectedReasons, reason];

    setSelectedReasons(newReasons);
    await onUpdate('Reasons to Host me', newReasons);
  };

  const handleCustomReasonBlur = async () => {
    if (customReason !== (userData?.['About - reasons to host me'] || '')) {
      await onUpdate('About - reasons to host me', customReason);
    }
  };

  return (
    <div className="reasons-section">
      <h3 className="section-subtitle">Why should hosts choose you?</h3>

      <div className="checkbox-grid">
        {PRESET_REASONS.map(reason => (
          <label key={reason} className="checkbox-label">
            <input
              type="checkbox"
              checked={selectedReasons.includes(reason)}
              onChange={() => handleReasonToggle(reason)}
            />
            <span>{reason}</span>
          </label>
        ))}
      </div>

      <div className="form-group">
        <label htmlFor="custom-reason" className="form-label">
          Add your own reason
        </label>
        <textarea
          id="custom-reason"
          className="form-textarea"
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          onBlur={handleCustomReasonBlur}
          placeholder="Add any additional reasons..."
          rows={2}
          maxLength={200}
        />
      </div>
    </div>
  );
}
