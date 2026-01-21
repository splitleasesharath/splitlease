/**
 * FormToggle - Toggle switch for boolean values
 *
 * @param {object} props - Component props
 * @param {string} props.label - Toggle label
 * @param {string} props.name - Input name attribute
 * @param {boolean} props.checked - Whether toggle is on
 * @param {function} props.onChange - Change handler (receives new boolean value)
 * @param {boolean} [props.disabled] - Whether toggle is disabled
 * @param {string} [props.helpText] - Help text below the toggle
 */
export default function FormToggle({
  label,
  name,
  checked,
  onChange,
  disabled = false,
  helpText
}) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.toggleRow}>
        {label && (
          <span style={{
            ...styles.label,
            ...(disabled ? styles.labelDisabled : {})
          }}>
            {label}
          </span>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          name={name}
          onClick={handleClick}
          disabled={disabled}
          style={{
            ...styles.toggle,
            ...(checked ? styles.toggleActive : styles.toggleInactive),
            ...(disabled ? styles.toggleDisabled : {})
          }}
        >
          <span
            style={{
              ...styles.toggleKnob,
              ...(checked ? styles.toggleKnobActive : styles.toggleKnobInactive)
            }}
          />
        </button>
      </div>
      {helpText && <p style={styles.helpText}>{helpText}</p>}
    </div>
  );
}

const styles = {
  container: {
    marginBottom: '0.75rem'
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem'
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151'
  },
  labelDisabled: {
    color: '#9ca3af'
  },
  toggle: {
    position: 'relative',
    display: 'inline-flex',
    height: '1.5rem',
    width: '2.75rem',
    alignItems: 'center',
    borderRadius: '9999px',
    transition: 'background-color 0.2s',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
    flexShrink: 0
  },
  toggleActive: {
    backgroundColor: '#22c55e'
  },
  toggleInactive: {
    backgroundColor: '#d1d5db'
  },
  toggleDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  toggleKnob: {
    display: 'inline-block',
    height: '1.125rem',
    width: '1.125rem',
    borderRadius: '9999px',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.2s'
  },
  toggleKnobActive: {
    transform: 'translateX(1.375rem)'
  },
  toggleKnobInactive: {
    transform: 'translateX(0.1875rem)'
  },
  helpText: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
    margin: 0
  }
};
