/**
 * FormDatePicker - Date input with native calendar
 *
 * @param {object} props - Component props
 * @param {string} props.label - Field label
 * @param {string} props.name - Input name attribute
 * @param {string} props.value - Date value (YYYY-MM-DD format)
 * @param {function} props.onChange - Change handler (receives event)
 * @param {string} [props.min] - Minimum date (YYYY-MM-DD)
 * @param {string} [props.max] - Maximum date (YYYY-MM-DD)
 * @param {boolean} [props.required] - Whether field is required
 * @param {boolean} [props.disabled] - Whether field is disabled
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.helpText] - Help text below the input
 */
export default function FormDatePicker({
  label,
  name,
  value,
  onChange,
  min,
  max,
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
      <div style={styles.inputWrapper}>
        <input
          id={name}
          name={name}
          type="date"
          value={value || ''}
          onChange={onChange}
          min={min}
          max={max}
          disabled={disabled}
          style={{
            ...styles.input,
            ...(error ? styles.inputError : {}),
            ...(disabled ? styles.inputDisabled : {})
          }}
        />
        <CalendarIcon />
      </div>
      {helpText && <p style={styles.helpText}>{helpText}</p>}
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      style={styles.calendarIcon}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
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
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    padding: '0.625rem 2.5rem 0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box'
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2'
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
    color: '#9ca3af'
  },
  calendarIcon: {
    position: 'absolute',
    right: '0.75rem',
    width: '1.125rem',
    height: '1.125rem',
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
