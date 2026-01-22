/**
 * SectionContainer - Wrapper for form sections with title and save button
 *
 * @param {object} props - Component props
 * @param {string} props.title - Section title
 * @param {React.ReactNode} props.children - Section content
 * @param {function} [props.onSave] - Save handler
 * @param {boolean} [props.isSaving] - Whether save is in progress
 * @param {string} [props.lastSaved] - Last saved timestamp
 * @param {boolean} [props.hasChanges] - Whether there are unsaved changes
 */
export default function SectionContainer({
  title,
  children,
  onSave,
  isSaving = false,
  lastSaved,
  hasChanges = false
}) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{title}</h2>
        <div style={styles.headerActions}>
          {lastSaved && (
            <span style={styles.lastSaved}>
              Last saved: {formatTimestamp(lastSaved)}
            </span>
          )}
          {hasChanges && (
            <span style={styles.unsavedBadge}>Unsaved changes</span>
          )}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              style={{
                ...styles.saveButton,
                ...(isSaving ? styles.saveButtonDisabled : {})
              }}
            >
              {isSaving ? (
                <>
                  <SpinnerIcon />
                  Saving...
                </>
              ) : (
                'Save Section'
              )}
            </button>
          )}
        </div>
      </div>
      <div style={styles.content}>{children}</div>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg
      style={styles.spinnerIcon}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        style={{ opacity: 0.25 }}
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function formatTimestamp(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timestamp;
  }
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    marginBottom: '1.5rem',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    flexWrap: 'wrap',
    gap: '0.75rem'
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  lastSaved: {
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  unsavedBadge: {
    fontSize: '0.75rem',
    fontWeight: '500',
    color: '#b45309',
    backgroundColor: '#fef3c7',
    padding: '0.125rem 0.5rem',
    borderRadius: '9999px'
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#52ABEC',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s'
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  spinnerIcon: {
    width: '1rem',
    height: '1rem',
    animation: 'spin 1s linear infinite'
  },
  content: {
    padding: '1.5rem'
  }
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
