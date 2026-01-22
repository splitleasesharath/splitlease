/**
 * LeaseDropdown - Styled select dropdown
 */

export default function LeaseDropdown({ value, onChange, options, label }) {
  return (
    <div className="lease-dropdown">
      {label && <label className="lease-dropdown__label">{label}</label>}
      <div className="lease-dropdown__wrapper">
        <select
          className="lease-dropdown__select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="lease-dropdown__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}
