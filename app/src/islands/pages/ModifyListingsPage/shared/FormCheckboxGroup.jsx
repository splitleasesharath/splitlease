/**
 * FormCheckboxGroup - Group of checkboxes for multi-select
 * Supports category grouping for amenities, house rules, etc.
 *
 * @param {object} props - Component props
 * @param {string} props.label - Group label
 * @param {string} props.name - Input name attribute
 * @param {Array<{value: string, label: string, category?: string}>} props.options - Checkbox options
 * @param {string[]} props.selectedValues - Array of selected values
 * @param {function} props.onChange - Change handler (receives updated array)
 * @param {number} [props.columns=2] - Number of columns (1-4)
 * @param {boolean} [props.required] - Whether at least one selection is required
 * @param {boolean} [props.groupByCategory] - Whether to group options by category
 * @param {string} [props.error] - Error message to display
 */
export default function FormCheckboxGroup({
  label,
  name,
  options = [],
  selectedValues = [],
  onChange,
  columns = 2,
  required = false,
  groupByCategory = false,
  error
}) {
  const handleChange = (value, isChecked) => {
    let newValues;
    if (isChecked) {
      newValues = [...selectedValues, value];
    } else {
      newValues = selectedValues.filter((v) => v !== value);
    }
    onChange(newValues);
  };

  // Group options by category if needed
  const groupedOptions = groupByCategory
    ? options.reduce((acc, option) => {
        const category = option.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(option);
        return acc;
      }, {})
    : { all: options };

  const gridStyle = {
    ...styles.grid,
    gridTemplateColumns: `repeat(${Math.min(columns, 4)}, 1fr)`
  };

  return (
    <div style={styles.container}>
      {label && (
        <label style={styles.label}>
          {label}
          {required && <span style={styles.required}>*</span>}
        </label>
      )}

      {groupByCategory ? (
        Object.entries(groupedOptions).map(([category, categoryOptions]) => (
          <div key={category} style={styles.categorySection}>
            <h4 style={styles.categoryTitle}>{category}</h4>
            <div style={gridStyle}>
              {categoryOptions.map((option) => (
                <CheckboxItem
                  key={option.value}
                  name={name}
                  value={option.value}
                  label={option.label}
                  checked={selectedValues.includes(option.value)}
                  onChange={handleChange}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={gridStyle}>
          {options.map((option) => (
            <CheckboxItem
              key={option.value}
              name={name}
              value={option.value}
              label={option.label}
              checked={selectedValues.includes(option.value)}
              onChange={handleChange}
            />
          ))}
        </div>
      )}

      {error && <p style={styles.errorText}>{error}</p>}
    </div>
  );
}

function CheckboxItem({ name, value, label, checked, onChange }) {
  return (
    <label style={styles.checkboxLabel}>
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => onChange(value, e.target.checked)}
        style={styles.checkbox}
      />
      <span style={{
        ...styles.customCheckbox,
        ...(checked ? styles.customCheckboxChecked : {})
      }}>
        {checked && <CheckIcon />}
      </span>
      <span style={styles.checkboxText}>{label}</span>
    </label>
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
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.75rem'
  },
  required: {
    color: '#ef4444',
    marginLeft: '0.25rem'
  },
  grid: {
    display: 'grid',
    gap: '0.5rem'
  },
  categorySection: {
    marginBottom: '1rem'
  },
  categoryTitle: {
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.025em'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
    padding: '0.25rem 0'
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
    width: '1rem',
    height: '1rem',
    border: '2px solid #d1d5db',
    borderRadius: '0.25rem',
    backgroundColor: '#ffffff',
    marginRight: '0.5rem',
    transition: 'all 0.15s',
    flexShrink: 0
  },
  customCheckboxChecked: {
    backgroundColor: '#52ABEC',
    borderColor: '#52ABEC'
  },
  checkIcon: {
    width: '0.625rem',
    height: '0.625rem',
    color: '#ffffff'
  },
  checkboxText: {
    fontSize: '0.8125rem',
    color: '#374151'
  },
  errorText: {
    fontSize: '0.75rem',
    color: '#ef4444',
    marginTop: '0.5rem',
    margin: 0
  }
};
