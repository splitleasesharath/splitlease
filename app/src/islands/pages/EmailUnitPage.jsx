import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import useEmailUnitPageLogic from './useEmailUnitPageLogic.js';

/**
 * EmailUnitPage - Internal page for previewing email templates
 *
 * Features:
 * - Dropdown selector for email templates from database
 * - Dynamic form fields based on template's Placeholder array
 * - Live preview of email HTML with placeholder substitution
 *
 * Follows the Hollow Component pattern - all logic is in useEmailUnitPageLogic.js
 */
export default function EmailUnitPage() {
  const {
    templates,
    selectedTemplateId,
    selectedTemplate,
    placeholders,
    placeholderValues,
    multiEmailValues,
    previewHtml,
    loading,
    error,
    canSendEmail,
    sending,
    sendResult,
    fromEmail,
    handleTemplateChange,
    handlePlaceholderChange,
    handleMultiEmailChange,
    addMultiEmail,
    removeMultiEmail,
    isMultiEmailPlaceholder,
    updatePreview,
    sendEmail,
    clearSendResult,
  } = useEmailUnitPageLogic();

  // Loading state
  if (loading) {
    return (
      <>
        <Header />
        <main style={styles.loadingContainer}>
          <p>Loading templates...</p>
        </main>
        <Footer />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Header />
        <main style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={styles.container}>
        {/* Left Panel - Template Selection & Form */}
        <section style={styles.leftPanel}>
          <h1 style={styles.pageTitle}>Email Template Preview</h1>

          {/* Template Selector */}
          <div style={styles.selectorContainer}>
            <label htmlFor="template-select" style={styles.label}>
              Select Template
            </label>
            <select
              id="template-select"
              value={selectedTemplateId || ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
              style={styles.select}
            >
              <option value="">-- Select a template --</option>
              {templates.map(t => (
                <option key={t._id} value={t._id}>
                  {t.Name || t.Description || t._id}
                </option>
              ))}
            </select>
          </div>

          {/* Template Description */}
          {selectedTemplate && (
            <p style={styles.description}>
              {selectedTemplate.Description || 'No description available'}
            </p>
          )}

          {/* From Email (non-editable) */}
          {selectedTemplate && (
            <div style={styles.formField}>
              <label style={styles.fieldLabel}>From Email</label>
              <input
                type="text"
                value={fromEmail}
                disabled
                style={styles.disabledInput}
              />
            </div>
          )}

          {/* Placeholder Form */}
          {placeholders.length > 0 && (
            <div style={styles.formContainer}>
              <h2 style={styles.formTitle}>Placeholder Values</h2>
              {placeholders.map(p => (
                <div key={p.key} style={styles.formField}>
                  <label style={styles.fieldLabel}>{p.label}</label>

                  {/* Multi-email fields (CC/BCC) with add/remove buttons */}
                  {isMultiEmailPlaceholder(p.key) ? (
                    <div style={styles.multiEmailContainer}>
                      {(multiEmailValues[p.key] || ['']).map((email, index) => (
                        <div key={index} style={styles.multiEmailRow}>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => handleMultiEmailChange(p.key, index, e.target.value)}
                            style={styles.multiEmailInput}
                            placeholder={`Enter email address`}
                          />
                          {/* Remove button (only show if more than 1 email) */}
                          {(multiEmailValues[p.key] || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeMultiEmail(p.key, index)}
                              style={styles.removeButton}
                              title="Remove email"
                            >
                              −
                            </button>
                          )}
                          {/* Add button (only on last row) */}
                          {index === (multiEmailValues[p.key] || []).length - 1 && (
                            <button
                              type="button"
                              onClick={() => addMultiEmail(p.key)}
                              style={styles.addButton}
                              title="Add another email"
                            >
                              +
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : /* Use textarea for body text, input for others */
                  p.key.toLowerCase().includes('body') || p.key.toLowerCase().includes('text') ? (
                    <textarea
                      value={placeholderValues[p.key] || ''}
                      onChange={(e) => handlePlaceholderChange(p.key, e.target.value)}
                      style={styles.textarea}
                      rows={3}
                      placeholder={`Enter value for ${p.label}`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={placeholderValues[p.key] || ''}
                      onChange={(e) => handlePlaceholderChange(p.key, e.target.value)}
                      style={styles.input}
                      placeholder={`Enter value for ${p.label}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty Placeholder State */}
          {selectedTemplate && placeholders.length === 0 && (
            <div style={styles.emptyPlaceholders}>
              <p>This template has no configurable placeholders</p>
            </div>
          )}

          {/* Action Buttons */}
          {selectedTemplate && (
            <div style={styles.actionButtons}>
              <button
                type="button"
                onClick={updatePreview}
                style={styles.updatePreviewButton}
              >
                Update Preview
              </button>
              <button
                type="button"
                onClick={sendEmail}
                disabled={!canSendEmail || sending}
                style={{
                  ...styles.sendEmailButton,
                  ...((!canSendEmail || sending) ? styles.disabledButton : {}),
                }}
              >
                {sending ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          )}

          {/* Send Result Message */}
          {sendResult && (
            <div
              style={{
                ...styles.resultMessage,
                ...(sendResult.success ? styles.successMessage : styles.errorMessage),
              }}
              onClick={clearSendResult}
            >
              {sendResult.message}
              <span style={styles.closeHint}>(click to dismiss)</span>
            </div>
          )}
        </section>

        {/* Right Panel - Email Preview */}
        <section style={styles.rightPanel}>
          <h2 style={styles.previewTitle}>Preview</h2>
          <div style={styles.previewContainer}>
            {previewHtml ? (
              <iframe
                srcDoc={previewHtml}
                style={styles.previewFrame}
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div style={styles.emptyPreview}>
                <p>{selectedTemplate ? 'Click "Update Preview" to see the email' : 'Select a template to get started'}</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

// Inline styles
const styles = {
  container: {
    display: 'flex',
    minHeight: 'calc(100vh - 200px)',
    padding: '20px',
    gap: '24px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  leftPanel: {
    flex: '0 0 40%',
    maxWidth: '500px',
    padding: '24px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 240px)',
  },
  rightPanel: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#111827',
  },
  selectorContainer: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#374151',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#ffffff',
  },
  description: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  formContainer: {
    marginTop: '24px',
  },
  formTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#111827',
  },
  formField: {
    marginBottom: '16px',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '6px',
    color: '#4b5563',
    fontFamily: 'monospace',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  emptyPlaceholders: {
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#fff7ed',
    borderRadius: '6px',
    border: '1px solid #fed7aa',
    color: '#9a3412',
    fontSize: '14px',
    textAlign: 'center',
  },
  previewTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#111827',
  },
  previewContainer: {
    flex: '1',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  previewFrame: {
    width: '100%',
    height: '100%',
    minHeight: '600px',
    border: 'none',
  },
  emptyPreview: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 200px)',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 200px)',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '16px',
  },
  // Multi-email styles (CC/BCC)
  multiEmailContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  multiEmailRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  multiEmailInput: {
    flex: '1',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  addButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  removeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  // Disabled input for From Email
  disabledInput: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    cursor: 'not-allowed',
  },
  // Action buttons container
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  updatePreviewButton: {
    flex: '1',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  sendEmailButton: {
    flex: '1',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  // Result message
  resultMessage: {
    marginTop: '16px',
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #6ee7b7',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
  },
  closeHint: {
    fontSize: '12px',
    opacity: 0.7,
  },
};
