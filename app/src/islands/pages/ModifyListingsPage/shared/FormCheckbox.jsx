/**
 * FormCheckbox - Single checkbox input component
 *
 * @param {object} props - Component props
 * @param {string} props.label - Checkbox label
 * @param {string} props.name - Input name attribute
 * @param {boolean} props.checked - Whether checkbox is checked
 * @param {function} props.onChange - Change handler (receives event)
 * @param {boolean} [props.disabled] - Whether checkbox is disabled
 * @param {string} [props.helpText] - Help text below the checkbox
 */
export default function FormCheckbox({
  label,
  name,
  checked,
  onChange,
  disabled = false,
  helpText
}) {
  return (
    <div style={styles.container}>
      <label style={styles.label}>
        <input
          type="checkbox"
          name={name}
          checked={checked || false}
          onChange={onChange}
          disabled={disabled}
          style={styles.checkbox}
        />
        <span style={styles.customCheckbox}>
          {checked && <CheckIcon />}
        </span>
        <span style={{
          ...styles.labelText,
          ...(disabled ? styles.labelDisabled : {})
        }}>
          {label}
        </span>
      </label>
      {helpText && <p style={styles.helpText}>{helpText}</p>}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      style={styles.checkIcon}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

const styles = {
  container: {
    marginBottom: '0.5rem'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  },
  checkbox: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0
  },
  customCheckbox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.125rem',
    height: '1.125rem',
    border: '2px solid #d1d5db',
    borderRadius: '0.25rem',
    backgroundColor: '#ffffff',
    marginRight: '0.5rem',
    transition: 'all 0.15s',
    flexShrink: 0
  },
  checkIcon: {
    width: '0.75rem',
    height: '0.75rem',
    color: '#ffffff'
  },
  labelText: {
    fontSize: '0.875rem',
    color: '#374151'
  },
  labelDisabled: {
    color: '#9ca3af'
  },
  helpText: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
    marginLeft: '1.625rem',
    margin: 0
  }
};

// Add CSS for checked state
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  input[type="checkbox"]:checked + span {
    background-color: #52ABEC !important;
    border-color: #52ABEC !important;
  }
  input[type="checkbox"]:focus + span {
    box-shadow: 0 0 0 2px rgba(82, 171, 236, 0.3);
  }
  input[type="checkbox"]:disabled + span {
    background-color: #f3f4f6 !important;
    cursor: not-allowed;
  }
`;
document.head.appendChild(styleSheet);
