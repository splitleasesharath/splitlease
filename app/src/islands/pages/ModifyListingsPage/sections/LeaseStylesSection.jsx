/**
 * LeaseStylesSection - Lease styles and pricing section
 *
 * @param {object} props - Component props
 * @param {object} props.listing - Current listing data
 * @param {function} props.onUpdate - Partial update callback
 */

import { FormInput, FormDropdown, FormCheckbox, SectionContainer } from '../shared';
import { rentalTypes, weeklyPatterns } from '../data';

const DAYS_OF_WEEK = [
  { key: 0, name: 'Sunday', short: 'Sun' },
  { key: 1, name: 'Monday', short: 'Mon' },
  { key: 2, name: 'Tuesday', short: 'Tue' },
  { key: 3, name: 'Wednesday', short: 'Wed' },
  { key: 4, name: 'Thursday', short: 'Thu' },
  { key: 5, name: 'Friday', short: 'Fri' },
  { key: 6, name: 'Saturday', short: 'Sat' }
];

export default function LeaseStylesSection({
  listing,
  onUpdate,
  isSaving,
  onSave,
  lastSaved
}) {
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? (value === '' ? null : Number(value)) : value;
    onUpdate({ [name]: parsedValue });
  };

  const handleDayToggle = (dayIndex) => {
    const currentDays = listing['Days Available (List of Days)'] || [];
    let newDays;
    if (currentDays.includes(dayIndex)) {
      newDays = currentDays.filter(d => d !== dayIndex);
    } else {
      newDays = [...currentDays, dayIndex].sort((a, b) => a - b);
    }
    onUpdate({ 'Days Available (List of Days)': newDays });
  };

  const rentalType = listing['rental type'] || 'Monthly';
  const selectedDays = listing['Days Available (List of Days)'] || [];

  return (
    <SectionContainer
      title="Lease Styles & Pricing"
      onSave={onSave}
      isSaving={isSaving}
      lastSaved={lastSaved}
    >
      {/* Rental Type */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>Rental Type</h3>
        <div style={styles.radioGroup}>
          {rentalTypes.map(type => (
            <label key={type.value} style={styles.radioLabel}>
              <input
                type="radio"
                name="rental type"
                value={type.value}
                checked={rentalType === type.value}
                onChange={handleChange}
                style={styles.radioInput}
              />
              <span style={styles.radioText}>{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Available Nights - Day Selection */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>Available Nights</h3>
        <p style={styles.helpText}>Select which nights of the week your space is available.</p>
        <div style={styles.daysGrid}>
          {DAYS_OF_WEEK.map(day => (
            <button
              key={day.key}
              type="button"
              onClick={() => handleDayToggle(day.key)}
              style={{
                ...styles.dayButton,
                ...(selectedDays.includes(day.key) ? styles.dayButtonActive : {})
              }}
            >
              <span style={styles.dayShort}>{day.short}</span>
            </button>
          ))}
        </div>
        <p style={styles.selectedCount}>
          {selectedDays.length} nights selected
        </p>
      </div>

      {/* Weekly Pattern */}
      <div style={styles.section}>
        <FormDropdown
          label="Weekly Pattern"
          name="Weeks offered"
          value={listing['Weeks offered']}
          onChange={handleChange}
          options={weeklyPatterns}
          placeholder="Select pattern..."
        />
      </div>

      {/* Pricing Section */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>Pricing</h3>

        <div style={styles.grid}>
          {/* Damage Deposit */}
          <FormInput
            label="Damage Deposit ($)"
            name="💰Damage Deposit"
            value={listing['💰Damage Deposit']}
            onChange={handleChange}
            type="number"
            placeholder="500"
            helpText="Minimum $500 recommended"
          />

          {/* Maintenance Fee */}
          <FormInput
            label="Cleaning/Maintenance Fee ($)"
            name="💰Cleaning Cost / Maintenance Fee"
            value={listing['💰Cleaning Cost / Maintenance Fee']}
            onChange={handleChange}
            type="number"
            placeholder="0"
          />

          {/* Monthly Rate */}
          {(rentalType === 'Monthly' || rentalType === 'Weekly') && (
            <FormInput
              label="Monthly Host Rate ($)"
              name="💰Monthly Host Rate"
              value={listing['💰Monthly Host Rate']}
              onChange={handleChange}
              type="number"
              placeholder="2000"
              helpText="Your monthly compensation"
            />
          )}

          {/* Weekly Rate */}
          {rentalType === 'Weekly' && (
            <FormInput
              label="Weekly Host Rate ($)"
              name="💰Weekly Host Rate"
              value={listing['💰Weekly Host Rate']}
              onChange={handleChange}
              type="number"
              placeholder="600"
              helpText="Your weekly compensation"
            />
          )}
        </div>

        {/* Nightly Rates - Only for Nightly rental type */}
        {rentalType === 'Nightly' && (
          <div style={styles.nightlyRates}>
            <h4 style={styles.nightlyHeading}>Nightly Rates by Duration</h4>
            <div style={styles.nightlyGrid}>
              {[1, 2, 3, 4, 5, 6, 7].map(nights => (
                <FormInput
                  key={nights}
                  label={`${nights} night${nights > 1 ? 's' : ''} ($)`}
                  name={`💰Nightly Host Rate for ${nights} night${nights > 1 ? 's' : ''}`}
                  value={listing[`💰Nightly Host Rate for ${nights} night${nights > 1 ? 's' : ''}`]}
                  onChange={handleChange}
                  type="number"
                  placeholder="0"
                />
              ))}
            </div>
          </div>
        )}

        {/* Extra Charges */}
        <FormInput
          label="Extra Charges Description"
          name="💰Extra Charges"
          value={listing['💰Extra Charges']}
          onChange={handleChange}
          placeholder="e.g., Parking $50/month, Pet fee $25/night"
        />
      </div>
    </SectionContainer>
  );
}

const styles = {
  section: {
    marginBottom: '1.5rem'
  },
  subheading: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.75rem'
  },
  helpText: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    marginBottom: '0.75rem'
  },
  radioGroup: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1rem'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer'
  },
  radioInput: {
    marginRight: '0.5rem'
  },
  radioText: {
    fontSize: '0.875rem',
    color: '#374151'
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '0.5rem',
    marginBottom: '0.5rem'
  },
  dayButton: {
    padding: '0.75rem 0.5rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.5rem',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'center'
  },
  dayButtonActive: {
    borderColor: '#52ABEC',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8'
  },
  dayShort: {
    fontSize: '0.75rem',
    fontWeight: '600'
  },
  selectedCount: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    textAlign: 'right'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem'
  },
  nightlyRates: {
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem'
  },
  nightlyHeading: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '1rem'
  },
  nightlyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.75rem'
  }
};
