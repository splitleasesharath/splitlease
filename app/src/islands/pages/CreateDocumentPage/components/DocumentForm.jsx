/**
 * DocumentForm - Form for creating and assigning documents
 *
 * Renders:
 * - Policy document selector dropdown
 * - Editable document title input
 * - Host user selector dropdown
 * - Submit button
 *
 * Uses the existing FormDropdown and FormInput patterns from ModifyListingsPage
 */

import React from 'react';

export default function DocumentForm({
  policyDocuments,
  hostUsers,
  formState,
  formErrors,
  isLoading,
  isSubmitting,
  onFieldChange,
  onSubmit
}) {
  // Convert policy documents to dropdown options
  const policyOptions = policyDocuments.map((policy) => ({
    value: policy.id || policy._id,
    label: policy.Name || policy.name || 'Unnamed Policy'
  }));

  // Convert host users to dropdown options
  const hostOptions = hostUsers.map((host) => ({
    value: host._id,
    label: host.Name ? `${host.Name} (${host.email})` : host.email
  }));

  const handlePolicyChange = (event) => {
    onFieldChange('selectedPolicyId', event.target.value);
  };

  const handleTitleChange = (event) => {
    onFieldChange('documentTitle', event.target.value);
  };

  const handleHostChange = (event) => {
    onFieldChange('selectedHostId', event.target.value);
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading form data...</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={styles.form}>
      {/* Policy Document Selector */}
      <div style={styles.field}>
        <label htmlFor="selectedPolicyId" style={styles.label}>
          Policy Document
          <span style={styles.required}>*</span>
        </label>
        <div style={styles.selectWrapper}>
          <select
            id="selectedPolicyId"
            name="selectedPolicyId"
            value={formState.selectedPolicyId}
            onChange={handlePolicyChange}
            disabled={isSubmitting}
            style={{
              ...styles.select,
              ...(formErrors.selectedPolicyId ? styles.selectError : {}),
              ...(formState.selectedPolicyId === '' ? styles.selectPlaceholder : {})
            }}
          >
            <option value="" disabled>
              Select a policy document...
            </option>
            {policyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronIcon />
        </div>
        {formErrors.selectedPolicyId && (
          <p style={styles.errorText}>{formErrors.selectedPolicyId}</p>
        )}
        <p style={styles.helpText}>
          Select the policy document template to use
        </p>
      </div>

      {/* Document Title Input */}
      <div style={styles.field}>
        <label htmlFor="documentTitle" style={styles.label}>
          Document Title
          <span style={styles.required}>*</span>
        </label>
        <input
          id="documentTitle"
          name="documentTitle"
          type="text"
          value={formState.documentTitle}
          onChange={handleTitleChange}
          placeholder="Enter document title..."
          disabled={isSubmitting}
          maxLength={255}
          style={{
            ...styles.input,
            ...(formErrors.documentTitle ? styles.inputError : {})
          }}
        />
        <div style={styles.inputMeta}>
          <span style={styles.charCount}>
            {formState.documentTitle.length}/255
          </span>
        </div>
        {formErrors.documentTitle && (
          <p style={styles.errorText}>{formErrors.documentTitle}</p>
        )}
        <p style={styles.helpText}>
          This title will be shown to the host. Auto-fills from selected policy.
        </p>
      </div>

      {/* Host User Selector */}
      <div style={styles.field}>
        <label htmlFor="selectedHostId" style={styles.label}>
          Assign to Host
          <span style={styles.required}>*</span>
        </label>
        <div style={styles.selectWrapper}>
          <select
            id="selectedHostId"
            name="selectedHostId"
            value={formState.selectedHostId}
            onChange={handleHostChange}
            disabled={isSubmitting}
            style={{
              ...styles.select,
              ...(formErrors.selectedHostId ? styles.selectError : {}),
              ...(formState.selectedHostId === '' ? styles.selectPlaceholder : {})
            }}
          >
            <option value="" disabled>
              Select a host...
            </option>
            {hostOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronIcon />
        </div>
        {formErrors.selectedHostId && (
          <p style={styles.errorText}>{formErrors.selectedHostId}</p>
        )}
        <p style={styles.helpText}>
          The host who will receive this document
        </p>
      </div>

      {/* Submit Button */}
      <div style={styles.actions}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            ...styles.submitButton,
            ...(isSubmitting ? styles.submitButtonDisabled : {})
          }}
        >
          {isSubmitting ? 'Creating...' : 'Create Document'}
        </button>
      </div>
    </form>
  );
}

function ChevronIcon() {
  return (
    <svg
      style={styles.chevron}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

const styles = {
  form: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  },
  loadingContainer: {
    padding: '2rem',
    textAlign: 'center',
    color: '#6b7280'
  },
  field: {
    marginBottom: '1.5rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.375rem'
  },
  required: {
    color: '#ef4444',
    marginLeft: '0.25rem'
  },
  selectWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  select: {
    width: '100%',
    padding: '0.625rem 2.5rem 0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box'
  },
  selectPlaceholder: {
    color: '#9ca3af'
  },
  selectError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2'
  },
  chevron: {
    position: 'absolute',
    right: '0.75rem',
    width: '1rem',
    height: '1rem',
    color: '#6b7280',
    pointerEvents: 'none'
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box'
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2'
  },
  inputMeta: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '0.25rem'
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#9ca3af'
  },
  helpText: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
    margin: 0
  },
  errorText: {
    fontSize: '0.75rem',
    color: '#ef4444',
    marginTop: '0.25rem',
    margin: 0
  },
  actions: {
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #e5e7eb'
  },
  submitButton: {
    width: '100%',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#6366f1',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s'
  },
  submitButtonDisabled: {
    backgroundColor: '#a5b4fc',
    cursor: 'not-allowed'
  }
};
