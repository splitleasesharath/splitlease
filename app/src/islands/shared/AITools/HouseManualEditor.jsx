/**
 * HouseManualEditor Component
 *
 * Displays and allows editing of extracted house manual data.
 * Shows structured fields for WiFi, check-in/out, house rules, etc.
 *
 * @module AITools/HouseManualEditor
 */

import React, { useState, useCallback } from 'react';
import { useAITools, INPUT_METHODS } from './AIToolsProvider';

// Icons
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const WifiIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
    <circle cx="6.5" cy="16.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const ToolIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

/**
 * Field configuration for the house manual sections
 */
const FIELD_CONFIG = [
  {
    key: 'wifi_name',
    label: 'WiFi Network Name',
    icon: WifiIcon,
    type: 'text',
    placeholder: 'Enter WiFi network name',
  },
  {
    key: 'wifi_password',
    label: 'WiFi Password',
    icon: WifiIcon,
    type: 'text',
    placeholder: 'Enter WiFi password',
  },
  {
    key: 'check_in_instructions',
    label: 'Check-in Instructions',
    icon: ClockIcon,
    type: 'textarea',
    placeholder: 'Instructions for guest check-in',
  },
  {
    key: 'check_out_instructions',
    label: 'Check-out Instructions',
    icon: ClockIcon,
    type: 'textarea',
    placeholder: 'Instructions for guest check-out',
  },
  {
    key: 'parking_info',
    label: 'Parking Information',
    icon: CarIcon,
    type: 'textarea',
    placeholder: 'Parking details and instructions',
  },
  {
    key: 'emergency_contacts',
    label: 'Emergency Contacts',
    icon: PhoneIcon,
    type: 'textarea',
    placeholder: 'Emergency contact information',
  },
  {
    key: 'house_rules',
    label: 'House Rules',
    icon: ListIcon,
    type: 'textarea',
    placeholder: 'Rules and guidelines for guests',
  },
  {
    key: 'appliance_instructions',
    label: 'Appliance Instructions',
    icon: ToolIcon,
    type: 'textarea',
    placeholder: 'How to use appliances',
  },
  {
    key: 'local_recommendations',
    label: 'Local Recommendations',
    icon: MapPinIcon,
    type: 'textarea',
    placeholder: 'Nearby restaurants, attractions, etc.',
  },
  {
    key: 'additional_notes',
    label: 'Additional Notes',
    icon: FileTextIcon,
    type: 'textarea',
    placeholder: 'Any other information for guests',
  },
];

/**
 * EditableField - Single editable field with inline editing
 */
function EditableField({ config, value, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  const handleEdit = useCallback(() => {
    setEditValue(value || '');
    setIsEditing(true);
  }, [value]);

  const handleSave = useCallback(() => {
    onChange(config.key, editValue);
    setIsEditing(false);
  }, [config.key, editValue, onChange]);

  const handleCancel = useCallback(() => {
    setEditValue(value || '');
    setIsEditing(false);
  }, [value]);

  const Icon = config.icon;
  const isEmpty = !value || value.trim() === '';

  return (
    <div className={`house-manual-editor__field ${isEmpty ? 'house-manual-editor__field--empty' : ''}`}>
      <div className="house-manual-editor__field-header">
        <div className="house-manual-editor__field-label">
          <Icon />
          <span>{config.label}</span>
        </div>
        {!isEditing && (
          <button
            type="button"
            className="house-manual-editor__field-edit-btn"
            onClick={handleEdit}
            aria-label={`Edit ${config.label}`}
          >
            <EditIcon />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="house-manual-editor__field-edit">
          {config.type === 'textarea' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={config.placeholder}
              rows={4}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={config.placeholder}
              autoFocus
            />
          )}
          <div className="house-manual-editor__field-actions">
            <button
              type="button"
              className="house-manual-editor__field-save"
              onClick={handleSave}
            >
              <CheckIcon />
              Save
            </button>
            <button
              type="button"
              className="house-manual-editor__field-cancel"
              onClick={handleCancel}
            >
              <XIcon />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="house-manual-editor__field-value">
          {isEmpty ? (
            <span className="house-manual-editor__field-placeholder">
              {config.placeholder}
            </span>
          ) : (
            <span>{value}</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * HouseManualEditor - Main editor component for house manual data
 */
export default function HouseManualEditor({ onSave, className = '' }) {
  const { extractedData, updateExtractedData, hasExtractedContent } = useAITools();

  const handleFieldChange = useCallback((fieldKey, value) => {
    // Merge the new field value with existing data
    // Determine which input method this came from (use FREEFORM_TEXT as default for manual edits)
    updateExtractedData(INPUT_METHODS.FREEFORM_TEXT, {
      ...extractedData[INPUT_METHODS.FREEFORM_TEXT],
      [fieldKey]: value,
    });
  }, [extractedData, updateExtractedData]);

  // Merge all extracted data from different input methods
  const mergedData = Object.values(extractedData).reduce((acc, methodData) => {
    if (methodData) {
      return { ...acc, ...methodData };
    }
    return acc;
  }, {});

  const handleSaveAll = useCallback(() => {
    if (onSave) {
      onSave(mergedData);
    }
  }, [mergedData, onSave]);

  // Count filled fields
  const filledCount = FIELD_CONFIG.filter(
    (config) => mergedData[config.key] && mergedData[config.key].trim() !== ''
  ).length;

  return (
    <div className={`house-manual-editor ${className}`}>
      <div className="house-manual-editor__header">
        <div className="house-manual-editor__header-info">
          <HomeIcon />
          <h3>House Manual Content</h3>
        </div>
        <div className="house-manual-editor__progress">
          <span className="house-manual-editor__progress-text">
            {filledCount} of {FIELD_CONFIG.length} fields filled
          </span>
          <div className="house-manual-editor__progress-bar">
            <div
              className="house-manual-editor__progress-fill"
              style={{ width: `${(filledCount / FIELD_CONFIG.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {!hasExtractedContent && (
        <div className="house-manual-editor__empty-notice">
          <p>Use one of the input methods above to extract or enter your house manual content.</p>
        </div>
      )}

      <div className="house-manual-editor__fields">
        {FIELD_CONFIG.map((config) => (
          <EditableField
            key={config.key}
            config={config}
            value={mergedData[config.key]}
            onChange={handleFieldChange}
          />
        ))}
      </div>

      {hasExtractedContent && (
        <div className="house-manual-editor__actions">
          <button
            type="button"
            className="house-manual-editor__save-btn"
            onClick={handleSaveAll}
          >
            Save House Manual
          </button>
        </div>
      )}
    </div>
  );
}
