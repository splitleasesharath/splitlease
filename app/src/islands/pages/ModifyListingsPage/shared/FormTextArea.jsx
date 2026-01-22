/**
 * FormTextArea - Multi-line text input component
 *
 * @param {object} props - Component props
 * @param {string} props.label - Field label
 * @param {string} props.name - Input name attribute
 * @param {string} props.value - Input value
 * @param {function} props.onChange - Change handler (receives event)
 * @param {number} [props.rows=4] - Number of visible rows
 * @param {string} [props.placeholder] - Placeholder text
 * @param {boolean} [props.required] - Whether field is required
 * @param {boolean} [props.disabled] - Whether field is disabled
 * @param {number} [props.maxLength] - Maximum character length
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.helpText] - Help text below the input
 */
export default function FormTextArea({
  label,
  name,
  value,
  onChange,
  rows = 4,
  placeholder = '',
  required = false,
  disabled = false,
  maxLength,
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
      <textarea
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        style={{
          ...styles.textarea,
          ...(error ? styles.textareaError : {}),
          ...(disabled ? styles.textareaDisabled : {})
        }}
      />
      {maxLength && (
        <span style={styles.charCount}>
          {(value || '').length}/{maxLength}
        </span>
      )}
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
  textarea: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.875rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  },
  textareaError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2'
  },
  textareaDisabled: {
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
    color: '#9ca3af'
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textAlign: 'right',
    marginTop: '0.25rem'
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
