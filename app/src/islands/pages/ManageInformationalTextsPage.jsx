/**
 * ManageInformationalTextsPage - Admin tool for managing informational text content
 *
 * Hollow component pattern: All logic is in useManageInformationalTextsPageLogic.js
 * This component only handles rendering.
 */

import useManageInformationalTextsPageLogic from './useManageInformationalTextsPageLogic.js';

export default function ManageInformationalTextsPage() {
  const {
    // Entries state
    filteredEntries,
    loading,
    error,

    // Form state
    mode,
    formData,
    isSubmitting,
    formErrors,
    canSubmit,

    // UI state
    searchQuery,
    setSearchQuery,
    previewDevice,
    setPreviewDevice,
    deleteConfirmId,

    // Handlers
    loadEntries,
    handleFieldChange,
    startCreate,
    startEdit,
    cancelForm,
    handleSubmit,
    confirmDelete,
    cancelDelete,
    executeDelete,
    getPreviewContent,
  } = useManageInformationalTextsPageLogic();

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>Manage Informational Texts</h1>
        <p style={styles.subtitle}>
          Create and edit informational text content displayed across the application
        </p>
      </header>

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        {/* Left Panel - List or Form */}
        <div style={styles.leftPanel}>
          {mode === 'list' ? (
            <ListPanel
              entries={filteredEntries}
              loading={loading}
              error={error}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onRefresh={loadEntries}
              onCreate={startCreate}
              onEdit={startEdit}
              onDelete={confirmDelete}
              deleteConfirmId={deleteConfirmId}
              onCancelDelete={cancelDelete}
              onConfirmDelete={executeDelete}
              isDeleting={isSubmitting}
            />
          ) : (
            <FormPanel
              mode={mode}
              formData={formData}
              formErrors={formErrors}
              isSubmitting={isSubmitting}
              canSubmit={canSubmit}
              onFieldChange={handleFieldChange}
              onSubmit={handleSubmit}
              onCancel={cancelForm}
            />
          )}
        </div>

        {/* Right Panel - Preview (only shown when editing/creating) */}
        {mode !== 'list' && (
          <div style={styles.rightPanel}>
            <PreviewPanel
              formData={formData}
              previewDevice={previewDevice}
              setPreviewDevice={setPreviewDevice}
              getPreviewContent={getPreviewContent}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <DeleteConfirmModal
          onCancel={cancelDelete}
          onConfirm={executeDelete}
          isDeleting={isSubmitting}
        />
      )}
    </div>
  );
}

// ===== LIST PANEL =====

function ListPanel({
  entries,
  loading,
  error,
  searchQuery,
  setSearchQuery,
  onRefresh,
  onCreate,
  onEdit,
  onDelete,
}) {
  return (
    <div style={styles.panel}>
      {/* Panel Header */}
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>Entries ({entries.length})</h2>
        <div style={styles.panelActions}>
          <button onClick={onRefresh} style={styles.iconButton} title="Refresh">
            <RefreshIcon />
          </button>
          <button onClick={onCreate} style={styles.primaryButton}>
            + New Entry
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search by tag or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div style={styles.loadingState}>
          <div style={styles.spinner} />
          <span>Loading entries...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div style={styles.errorState}>
          <span>{error}</span>
          <button onClick={onRefresh} style={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && entries.length === 0 && (
        <div style={styles.emptyState}>
          <span>No entries found</span>
          <button onClick={onCreate} style={styles.primaryButton}>
            Create First Entry
          </button>
        </div>
      )}

      {/* Entry List */}
      {!loading && !error && entries.length > 0 && (
        <div style={styles.entryList}>
          {entries.map(entry => (
            <EntryCard
              key={entry._id}
              entry={entry}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ===== ENTRY CARD =====

function EntryCard({ entry, onEdit, onDelete }) {
  return (
    <div style={styles.entryCard}>
      <div style={styles.entryHeader}>
        <span style={styles.entryTag}>{entry.tagTitle}</span>
        <div style={styles.entryActions}>
          <button
            onClick={() => onEdit(entry)}
            style={styles.smallButton}
            title="Edit"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(entry._id)}
            style={styles.dangerSmallButton}
            title="Delete"
          >
            Delete
          </button>
        </div>
      </div>
      <p style={styles.entryPreview}>
        {entry.desktop?.substring(0, 100)}
        {entry.desktop?.length > 100 ? '...' : ''}
      </p>
      <div style={styles.entryMeta}>
        {entry.showMore && <span style={styles.badge}>Show More</span>}
        {entry.hasLink && <span style={styles.badge}>Has Link</span>}
        <span style={styles.metaText}>
          Updated: {new Date(entry.modifiedDate || entry['Modified Date']).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

// ===== FORM PANEL =====

function FormPanel({
  mode,
  formData,
  formErrors,
  isSubmitting,
  canSubmit,
  onFieldChange,
  onSubmit,
  onCancel,
}) {
  return (
    <div style={styles.panel}>
      {/* Panel Header */}
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>
          {mode === 'create' ? 'Create New Entry' : 'Edit Entry'}
        </h2>
        <button onClick={onCancel} style={styles.iconButton} title="Cancel">
          <CloseIcon />
        </button>
      </div>

      {/* Form Fields */}
      <div style={styles.form}>
        {/* Tag Title */}
        <FormField
          label="Tag Title"
          required
          error={formErrors.tagTitle}
        >
          <input
            type="text"
            value={formData.tagTitle}
            onChange={(e) => onFieldChange('tagTitle', e.target.value)}
            placeholder="e.g., How It Works"
            style={{
              ...styles.input,
              ...(formErrors.tagTitle ? styles.inputError : {})
            }}
          />
        </FormField>

        {/* Desktop Content */}
        <FormField
          label="Desktop Content"
          required
          error={formErrors.desktop}
        >
          <textarea
            value={formData.desktop}
            onChange={(e) => onFieldChange('desktop', e.target.value)}
            placeholder="Main content displayed on desktop screens"
            rows={4}
            style={{
              ...styles.textarea,
              ...(formErrors.desktop ? styles.inputError : {})
            }}
          />
        </FormField>

        {/* Desktop+ Content */}
        <FormField
          label="Desktop+ Content"
          hint="Extended content for larger screens (optional)"
        >
          <textarea
            value={formData.desktopPlus}
            onChange={(e) => onFieldChange('desktopPlus', e.target.value)}
            placeholder="Leave empty to use desktop content"
            rows={3}
            style={styles.textarea}
          />
        </FormField>

        {/* Mobile Content */}
        <FormField
          label="Mobile Content"
          hint="Content for mobile screens (optional)"
        >
          <textarea
            value={formData.mobile}
            onChange={(e) => onFieldChange('mobile', e.target.value)}
            placeholder="Leave empty to use desktop content"
            rows={3}
            style={styles.textarea}
          />
        </FormField>

        {/* iPad Content */}
        <FormField
          label="iPad Content"
          hint="Content for iPad screens (optional)"
        >
          <textarea
            value={formData.ipad}
            onChange={(e) => onFieldChange('ipad', e.target.value)}
            placeholder="Leave empty to use desktop content"
            rows={3}
            style={styles.textarea}
          />
        </FormField>

        {/* Toggles */}
        <div style={styles.toggleRow}>
          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={formData.showMore}
              onChange={(e) => onFieldChange('showMore', e.target.checked)}
            />
            <span>Show More Available</span>
          </label>

          <label style={styles.toggle}>
            <input
              type="checkbox"
              checked={formData.hasLink}
              onChange={(e) => onFieldChange('hasLink', e.target.checked)}
            />
            <span>Has Link</span>
          </label>
        </div>

        {/* Submit Buttons */}
        <div style={styles.formActions}>
          <button
            onClick={onCancel}
            style={styles.secondaryButton}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            style={{
              ...styles.primaryButton,
              ...((!canSubmit || isSubmitting) ? styles.disabledButton : {})
            }}
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting
              ? 'Saving...'
              : mode === 'create'
                ? 'Create Entry'
                : 'Save Changes'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== FORM FIELD =====

function FormField({ label, required, hint, error, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>
      {hint && <span style={styles.hint}>{hint}</span>}
      {children}
      {error && <span style={styles.errorText}>{error}</span>}
    </div>
  );
}

// ===== PREVIEW PANEL =====

function PreviewPanel({ formData, previewDevice, setPreviewDevice, getPreviewContent }) {
  const devices = [
    { key: 'desktop', label: 'Desktop' },
    { key: 'desktopPlus', label: 'Desktop+' },
    { key: 'ipad', label: 'iPad' },
    { key: 'mobile', label: 'Mobile' },
  ];

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>Preview</h2>
      </div>

      {/* Device Tabs */}
      <div style={styles.deviceTabs}>
        {devices.map(device => (
          <button
            key={device.key}
            onClick={() => setPreviewDevice(device.key)}
            style={{
              ...styles.deviceTab,
              ...(previewDevice === device.key ? styles.deviceTabActive : {})
            }}
          >
            {device.label}
          </button>
        ))}
      </div>

      {/* Preview Box */}
      <div style={styles.previewBox}>
        <div style={styles.previewHeader}>
          <div style={styles.previewIcon}>
            <InfoIcon />
          </div>
          <h3 style={styles.previewTitle}>
            {formData.tagTitle || 'Information'}
          </h3>
        </div>
        <div style={styles.previewContent}>
          <p style={styles.previewText}>
            {getPreviewContent()}
          </p>
        </div>
        {formData.showMore && (
          <button style={styles.showMoreButton}>
            Show more
            <ChevronDownIcon />
          </button>
        )}
      </div>

      {/* Content Status */}
      <div style={styles.contentStatus}>
        <StatusItem
          label="Desktop"
          hasContent={!!formData.desktop}
          required
        />
        <StatusItem
          label="Desktop+"
          hasContent={!!formData.desktopPlus}
          fallback="desktop"
        />
        <StatusItem
          label="iPad"
          hasContent={!!formData.ipad}
          fallback="desktop"
        />
        <StatusItem
          label="Mobile"
          hasContent={!!formData.mobile}
          fallback="desktop"
        />
      </div>
    </div>
  );
}

function StatusItem({ label, hasContent, required, fallback }) {
  return (
    <div style={styles.statusItem}>
      <span style={styles.statusLabel}>{label}</span>
      {hasContent ? (
        <span style={styles.statusGreen}>Custom</span>
      ) : required ? (
        <span style={styles.statusRed}>Required</span>
      ) : (
        <span style={styles.statusGray}>Uses {fallback}</span>
      )}
    </div>
  );
}

// ===== DELETE CONFIRM MODAL =====

function DeleteConfirmModal({ onCancel, onConfirm, isDeleting }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <h3 style={styles.modalTitle}>Delete Entry?</h3>
        <p style={styles.modalText}>
          This action cannot be undone. The informational text will be permanently deleted.
        </p>
        <div style={styles.modalActions}>
          <button
            onClick={onCancel}
            style={styles.secondaryButton}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...styles.dangerButton,
              ...(isDeleting ? styles.disabledButton : {})
            }}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== ICONS =====

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 4v6h-6M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="#3b82f6">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ===== STYLES =====

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '1.5rem',
  },
  header: {
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
  mainContent: {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'flex-start',
  },
  leftPanel: {
    flex: '1 1 60%',
    minWidth: 0,
  },
  rightPanel: {
    flex: '1 1 40%',
    minWidth: 0,
    position: 'sticky',
    top: '1.5rem',
  },
  panel: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  panelTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  panelActions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },

  // Search
  searchContainer: {
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
  },
  searchInput: {
    width: '100%',
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    outline: 'none',
    boxSizing: 'border-box',
  },

  // States
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1.5rem',
    color: '#6b7280',
    gap: '1rem',
  },
  spinner: {
    width: '2rem',
    height: '2rem',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1.5rem',
    color: '#dc2626',
    gap: '1rem',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1.5rem',
    color: '#6b7280',
    gap: '1rem',
  },

  // Entry List
  entryList: {
    padding: '1rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxHeight: 'calc(100vh - 300px)',
    overflowY: 'auto',
  },
  entryCard: {
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    backgroundColor: '#fafafa',
  },
  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.5rem',
  },
  entryTag: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#111827',
  },
  entryActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  entryPreview: {
    fontSize: '0.875rem',
    color: '#4b5563',
    margin: '0 0 0.5rem 0',
    lineHeight: '1.5',
  },
  entryMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  badge: {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '0.25rem',
  },
  metaText: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },

  // Form
  form: {
    padding: '1.5rem',
  },
  field: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.375rem',
  },
  required: {
    color: '#dc2626',
    marginLeft: '0.25rem',
  },
  hint: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.375rem',
  },
  input: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorText: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#dc2626',
    marginTop: '0.375rem',
  },
  toggleRow: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#374151',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },

  // Preview
  deviceTabs: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
  },
  deviceTab: {
    flex: 1,
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  deviceTabActive: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  previewBox: {
    margin: '1.5rem',
    padding: '1rem',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  previewIcon: {
    flexShrink: 0,
  },
  previewTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  previewContent: {
    color: '#374151',
    fontSize: '0.875rem',
    lineHeight: '1.5',
  },
  previewText: {
    margin: 0,
    whiteSpace: 'pre-line',
  },
  showMoreButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    marginTop: '0.75rem',
    padding: 0,
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#2563eb',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  contentStatus: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e5e7eb',
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.375rem 0',
  },
  statusLabel: {
    fontSize: '0.875rem',
    color: '#374151',
  },
  statusGreen: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#059669',
  },
  statusRed: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#dc2626',
  },
  statusGray: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },

  // Buttons
  primaryButton: {
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  secondaryButton: {
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  iconButton: {
    padding: '0.5rem',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  smallButton: {
    padding: '0.375rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '0.25rem',
    cursor: 'pointer',
  },
  dangerSmallButton: {
    padding: '0.375rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#dc2626',
    backgroundColor: 'white',
    border: '1px solid #fecaca',
    borderRadius: '0.25rem',
    cursor: 'pointer',
  },
  dangerButton: {
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  retryButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: 'white',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    padding: '1.5rem',
    maxWidth: '400px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 0.75rem 0',
  },
  modalText: {
    fontSize: '0.875rem',
    color: '#4b5563',
    margin: '0 0 1.5rem 0',
    lineHeight: '1.5',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
  },
};

// Add keyframes for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
