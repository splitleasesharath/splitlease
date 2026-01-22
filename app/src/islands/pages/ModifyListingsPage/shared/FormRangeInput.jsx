/**
 * FormRangeInput - Numeric range input (min/max pair)
 *
 * @param {object} props - Component props
 * @param {string} props.label - Field label
 * @param {string} props.minName - Min input name attribute
 * @param {string} props.maxName - Max input name attribute
 * @param {number} props.minValue - Min value
 * @param {number} props.maxValue - Max value
 * @param {function} props.onMinChange - Min change handler (receives event)
 * @param {function} props.onMaxChange - Max change handler (receives event)
 * @param {number} [props.minLimit=0] - Minimum allowed value
 * @param {number} [props.maxLimit=100] - Maximum allowed value
 * @param {boolean} [props.required] - Whether field is required
 * @param {boolean} [props.disabled] - Whether field is disabled
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.helpText] - Help text below the inputs
 */
export default function FormRangeInput({
  label,
  minName,
  maxName,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minLimit = 0,
  maxLimit = 100,
  required = false,
  disabled = false,
  error,
  helpText
}) {
  return (
    <div style={styles.container}>
      {label && (
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}>*</span>}
        </label>
      )}
      <div style={styles.rangeRow}>
        <div style={styles.inputGroup}>
          <span style={styles.inputLabel}>Min</span>
          <input
            type="number"
            name={minName}
            value={minValue ?? ''}
            onChange={onMinChange}
            min={minLimit}
            max={maxValue || maxLimit}
            disabled={disabled}
            style={{
              ...styles.input,
              ...(error ? styles.inputError : {}),
              ...(disabled ? styles.inputDisabled : {})
            }}
          />
        </div>
        <span style={styles.separator}>to</span>
        <div style={styles.inputGroup}>
          <span style={styles.inputLabel}>Max</span>
          <input
            type="number"
            name={maxName}
            value={maxValue ?? ''}
            onChange={onMaxChange}
            min={minValue || minLimit}
            max={maxLimit}
            disabled={disabled}
            style={{
              ...styles.input,
              ...(error ? styles.inputError : {}),
              ...(disabled ? styles.inputDisabled : {})
            }}
          />
        </div>
      </div>
      {helpText && <p style={styles.helpText}>{helpText}</p>}
      {error && <p style={styles.errorText}>{error}</p>}
    </div>
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
  rangeRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.75rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  inputLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.25rem'
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
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
    color: '#9ca3af'
  },
  separator: {
    color: '#6b7280',
    fontSize: '0.875rem',
    paddingBottom: '0.75rem'
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
