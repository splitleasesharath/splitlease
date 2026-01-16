/**
 * QRCodeForm Component
 *
 * Form for creating or editing a QR code with live preview.
 */

import { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { QR_CODE_USE_CASES, getUseCaseById } from '../qrCodeUseCases.js';

/**
 * URL validation helper
 */
const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

/**
 * QRCodeForm Component
 */
const QRCodeForm = ({
  initialData = null,
  isEditing = false,
  onSubmit,
  onCancel,
  isSaving = false
}) => {
  // Form state
  const [useCaseId, setUseCaseId] = useState(initialData?.useCaseId || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [errors, setErrors] = useState({});

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setUseCaseId(initialData.useCaseId || '');
      setContent(initialData.content || '');
      setErrors({});
    }
  }, [initialData]);

  // Get selected use case
  const selectedUseCase = useMemo(() => {
    return getUseCaseById(useCaseId);
  }, [useCaseId]);

  // Form validation
  const validate = () => {
    const newErrors = {};

    if (!useCaseId) {
      newErrors.useCaseId = 'Please select a use case';
    }

    if (!content.trim()) {
      newErrors.content = 'Please enter a URL or content';
    } else if (!isValidUrl(content.trim())) {
      newErrors.content = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const formData = {
      useCaseId,
      useCaseName: selectedUseCase?.name || 'Custom',
      content: content.trim()
    };

    if (onSubmit) {
      onSubmit(formData);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setUseCaseId(initialData?.useCaseId || '');
    setContent(initialData?.content || '');
    setErrors({});
    if (onCancel) {
      onCancel();
    }
  };

  // Group use cases by category
  const useCasesByCategory = useMemo(() => {
    return QR_CODE_USE_CASES.reduce((acc, uc) => {
      if (!acc[uc.category]) {
        acc[uc.category] = [];
      }
      acc[uc.category].push(uc);
      return acc;
    }, {});
  }, []);

  // Preview content
  const previewContent = content.trim() || 'https://splitlease.com';

  return (
    <div className="qrcd-form">
      <div className="qrcd-form__header">
        <h2 className="qrcd-form__title">
          {isEditing ? 'Edit QR Code' : 'Create New QR Code'}
        </h2>
        <p className="qrcd-form__subtitle">
          {isEditing
            ? 'Update the details for this QR code'
            : 'Create a QR code for your house manual'
          }
        </p>
      </div>

      <form className="qrcd-form__body" onSubmit={handleSubmit}>
        <div className="qrcd-form__content">
          {/* Left side - Form fields */}
          <div className="qrcd-form__fields">
            {/* Use Case Selector */}
            <div className="qrcd-form__field">
              <label htmlFor="qrcd-usecase" className="qrcd-form__label">
                Use Case <span className="qrcd-form__required">*</span>
              </label>
              <select
                id="qrcd-usecase"
                className={`qrcd-form__select ${errors.useCaseId ? 'qrcd-form__select--error' : ''}`}
                value={useCaseId}
                onChange={(e) => {
                  setUseCaseId(e.target.value);
                  setErrors(prev => ({ ...prev, useCaseId: null }));
                }}
                disabled={isSaving}
              >
                <option value="">Select a use case...</option>
                {Object.entries(useCasesByCategory).map(([category, useCases]) => (
                  <optgroup key={category} label={category}>
                    {useCases.map(uc => (
                      <option key={uc.id} value={uc.id}>
                        {uc.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {selectedUseCase && (
                <p className="qrcd-form__hint">{selectedUseCase.description}</p>
              )}
              {errors.useCaseId && (
                <p className="qrcd-form__error">{errors.useCaseId}</p>
              )}
            </div>

            {/* URL Input */}
            <div className="qrcd-form__field">
              <label htmlFor="qrcd-content" className="qrcd-form__label">
                URL <span className="qrcd-form__required">*</span>
              </label>
              <input
                id="qrcd-content"
                type="url"
                className={`qrcd-form__input ${errors.content ? 'qrcd-form__input--error' : ''}`}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setErrors(prev => ({ ...prev, content: null }));
                }}
                placeholder="https://example.com/page"
                disabled={isSaving}
              />
              <p className="qrcd-form__hint">
                Enter the full URL that guests will see when they scan this QR code
              </p>
              {errors.content && (
                <p className="qrcd-form__error">{errors.content}</p>
              )}
            </div>
          </div>

          {/* Right side - Live Preview */}
          <div className="qrcd-form__preview">
            <h3 className="qrcd-form__preview-title">Preview</h3>
            <div className="qrcd-form__preview-card">
              <div className="qrcd-form__preview-qr">
                <QRCodeSVG
                  value={previewContent}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="qrcd-form__preview-info">
                <p className="qrcd-form__preview-label">
                  {selectedUseCase?.name || 'Select a use case'}
                </p>
                <p className="qrcd-form__preview-url" title={previewContent}>
                  {previewContent.length > 40
                    ? previewContent.substring(0, 40) + '...'
                    : previewContent
                  }
                </p>
              </div>
            </div>
            <p className="qrcd-form__preview-note">
              Scan with your phone to test
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="qrcd-form__actions">
          <button
            type="button"
            className="qrcd-form__btn qrcd-form__btn--cancel"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="qrcd-form__btn qrcd-form__btn--submit"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="qrcd-form__spinner" />
                Saving...
              </>
            ) : (
              isEditing ? 'Save Changes' : 'Create QR Code'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

QRCodeForm.propTypes = {
  initialData: PropTypes.shape({
    id: PropTypes.string,
    useCaseId: PropTypes.string,
    useCaseName: PropTypes.string,
    content: PropTypes.string
  }),
  isEditing: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSaving: PropTypes.bool
};

export default QRCodeForm;
