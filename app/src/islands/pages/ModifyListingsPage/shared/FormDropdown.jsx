/**
 * FormDropdown - Select dropdown with options
 *
 * @param {object} props - Component props
 * @param {string} props.label - Field label
 * @param {string} props.name - Select name attribute
 * @param {string|number} props.value - Selected value
 * @param {function} props.onChange - Change handler (receives event)
 * @param {Array<{value: string|number, label: string}>} props.options - Dropdown options
 * @param {string} [props.placeholder='Select...'] - Placeholder text
 * @param {boolean} [props.required] - Whether field is required
 * @param {boolean} [props.disabled] - Whether field is disabled
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.helpText] - Help text below the input
 */
export default function FormDropdown({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  required = false,
  disabled = false,
  error,
  helpText
}) {
  return (
    <div style={styles.container}>
      {label && (
        <label htmlFor={name} style={styles.label}>
          {label}
          {required && <span style={styles.required}>*</span>}
        </label>
      )}
      <div style={styles.selectWrapper}>
        <select
          id={name}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          style={{
            ...styles.select,
            ...(error ? styles.selectError : {}),
            ...(disabled ? styles.selectDisabled : {}),
            ...(value === '' || value === null || value === undefined ? styles.selectPlaceholder : {})
          }}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>
      {helpText && <p style={styles.helpText}>{helpText}</p>}
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
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
  container: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '1rem'
  },
  label: {
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
  selectDisabled: {
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
    color: '#9ca3af'
  },
  chevron: {
    position: 'absolute',
    right: '0.75rem',
    width: '1rem',
    height: '1rem',
    color: '#6b7280',
    pointerEvents: 'none'
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
  }
};
