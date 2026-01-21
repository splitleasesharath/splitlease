/**
 * SaveButton - Save button with loading state
 *
 * @param {object} props - Component props
 * @param {function} props.onClick - Click handler
 * @param {boolean} [props.isLoading] - Whether save is in progress
 * @param {boolean} [props.disabled] - Whether button is disabled
 * @param {string} [props.lastSaved] - Last saved timestamp
 * @param {string} [props.label='Save Changes'] - Button label
 * @param {string} [props.loadingLabel='Saving...'] - Loading state label
 */
export default function SaveButton({
  onClick,
  isLoading = false,
  disabled = false,
  lastSaved,
  label = 'Save Changes',
  loadingLabel = 'Saving...'
}) {
  const isDisabled = isLoading || disabled;

  return (
    <div style={styles.container}>
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        style={{
          ...styles.button,
          ...(isDisabled ? styles.buttonDisabled : {})
        }}
      >
        {isLoading ? (
          <>
            <SpinnerIcon />
            {loadingLabel}
          </>
        ) : (
          <>
            <SaveIcon />
            {label}
          </>
        )}
      </button>
      {lastSaved && (
        <span style={styles.lastSaved}>
          Saved at {formatTime(lastSaved)}
        </span>
      )}
    </div>
  );
}

function SaveIcon() {
  return (
    <svg
      style={styles.icon}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      style={{...styles.icon, ...styles.spinner}}
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

function formatTime(timestamp) {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '';
  }
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#ffffff',
    backgroundColor: '#52ABEC',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    transition: 'background-color 0.15s, transform 0.1s',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
    transform: 'none'
  },
  icon: {
    width: '1.125rem',
    height: '1.125rem'
  },
  spinner: {
    animation: 'spin 1s linear infinite'
  },
  lastSaved: {
    fontSize: '0.75rem',
    color: '#6b7280'
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
