/**
 * OccupantsStep.jsx
 *
 * Step 3: Additional Occupants
 * Allows adding up to 6 additional occupants with name and relationship.
 */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function OccupantsStep({
  occupants,
  onAddOccupant,
  onRemoveOccupant,
  onUpdateOccupant,
  maxOccupants,
  relationshipOptions,
}) {
  const canAddMore = occupants.length < maxOccupants;

  return (
    <div className="wizard-step occupants-step">
      <p className="wizard-step__intro">
        Will anyone else be staying with you? Add their information below.
        This step is optional.
      </p>

      {occupants.length === 0 ? (
        <div className="wizard-empty-state">
          <p>No additional occupants added yet.</p>
          <button
            type="button"
            className="wizard-btn wizard-btn--secondary"
            onClick={onAddOccupant}
          >
            <Plus size={16} />
            Add Occupant
          </button>
        </div>
      ) : (
        <div className="occupants-list">
          {occupants.map((occupant, index) => (
            <div key={occupant.id} className="occupant-card">
              <div className="occupant-card__header">
                <span className="occupant-card__number">Occupant {index + 1}</span>
                <button
                  type="button"
                  className="occupant-card__remove"
                  onClick={() => onRemoveOccupant(occupant.id)}
                  aria-label="Remove occupant"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="occupant-card__fields">
                <div className="wizard-form-group">
                  <label className="wizard-label">Full Name</label>
                  <input
                    type="text"
                    className="wizard-input"
                    value={occupant.name || ''}
                    onChange={(e) => onUpdateOccupant(occupant.id, 'name', e.target.value)}
                    placeholder="Enter name"
                  />
                </div>

                <div className="wizard-form-group">
                  <label className="wizard-label">Relationship</label>
                  <select
                    className="wizard-select"
                    value={occupant.relationship || ''}
                    onChange={(e) => onUpdateOccupant(occupant.id, 'relationship', e.target.value)}
                  >
                    {relationshipOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {canAddMore && (
            <button
              type="button"
              className="wizard-btn wizard-btn--secondary wizard-btn--full"
              onClick={onAddOccupant}
            >
              <Plus size={16} />
              Add Another Occupant
            </button>
          )}

          {!canAddMore && (
            <p className="wizard-hint">Maximum of {maxOccupants} occupants reached.</p>
          )}
        </div>
      )}
    </div>
  );
}
