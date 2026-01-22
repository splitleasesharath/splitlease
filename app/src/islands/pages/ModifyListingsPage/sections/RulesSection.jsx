/**
 * RulesSection - Rules and availability section
 *
 * @param {object} props - Component props
 * @param {object} props.listing - Current listing data
 * @param {function} props.onUpdate - Partial update callback
 * @param {Array} props.houseRules - House rules options from dataLookups
 */

import { useState } from 'react';
import { FormDropdown, FormCheckboxGroup, FormInput, FormDatePicker, SectionContainer } from '../shared';
import { cancellationPolicies, genderOptions, guestCounts, checkInTimes, checkOutTimes, durationMonths } from '../data';

export default function RulesSection({
  listing,
  onUpdate,
  houseRules = [],
  cancellationPolicyOptions = [],
  isSaving,
  onSave,
  lastSaved
}) {
  const [newBlockedDate, setNewBlockedDate] = useState('');

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? (value === '' ? null : Number(value)) : value;
    onUpdate({ [name]: parsedValue });
  };

  const handleHouseRulesChange = (selectedValues) => {
    onUpdate({ 'Features - House Rules': selectedValues });
  };

  const handleAddBlockedDate = () => {
    if (!newBlockedDate) return;
    const currentBlocked = listing['Dates - Blocked'] || [];
    if (!currentBlocked.includes(newBlockedDate)) {
      onUpdate({ 'Dates - Blocked': [...currentBlocked, newBlockedDate].sort() });
    }
    setNewBlockedDate('');
  };

  const handleRemoveBlockedDate = (dateToRemove) => {
    const currentBlocked = listing['Dates - Blocked'] || [];
    onUpdate({ 'Dates - Blocked': currentBlocked.filter(d => d !== dateToRemove) });
  };

  // Format house rules for checkbox group
  const formatHouseRuleOptions = (rules) => {
    return rules.map(rule => ({
      value: rule._id || rule.value,
      label: rule.name || rule.Name || rule.label
    }));
  };

  // Use provided cancellation policy options or fallback to static data
  const policyOptions = cancellationPolicyOptions.length > 0
    ? cancellationPolicyOptions.map(p => ({ value: p.id, label: p.display }))
    : cancellationPolicies;

  const blockedDates = listing['Dates - Blocked'] || [];

  return (
    <SectionContainer
      title="Rules & Availability"
      onSave={onSave}
      isSaving={isSaving}
      lastSaved={lastSaved}
    >
      <div style={styles.grid}>
        {/* Cancellation Policy */}
        <FormDropdown
          label="Cancellation Policy"
          name="Cancellation Policy"
          value={listing['Cancellation Policy']}
          onChange={handleChange}
          options={policyOptions}
          placeholder="Select policy..."
        />

        {/* Preferred Gender */}
        <FormDropdown
          label="Preferred Gender"
          name="Preferred Gender"
          value={listing['Preferred Gender']}
          onChange={handleChange}
          options={genderOptions}
        />

        {/* Number of Guests */}
        <FormDropdown
          label="Maximum Guests"
          name="Features - Qty Guests"
          value={listing['Features - Qty Guests']}
          onChange={handleChange}
          options={guestCounts}
        />

        {/* Check-in Time */}
        <FormDropdown
          label="Check-in Time"
          name="NEW Date Check-in Time"
          value={listing['NEW Date Check-in Time']}
          onChange={handleChange}
          options={checkInTimes}
        />

        {/* Check-out Time */}
        <FormDropdown
          label="Check-out Time"
          name="NEW Date Check-out Time"
          value={listing['NEW Date Check-out Time']}
          onChange={handleChange}
          options={checkOutTimes}
        />

        {/* Minimum Duration */}
        <FormDropdown
          label="Minimum Stay (Months)"
          name="Minimum Months"
          value={listing['Minimum Months']}
          onChange={handleChange}
          options={durationMonths}
          placeholder="Select..."
        />

        {/* Maximum Duration */}
        <FormDropdown
          label="Maximum Stay (Months)"
          name="Maximum Months"
          value={listing['Maximum Months']}
          onChange={handleChange}
          options={durationMonths}
          placeholder="Select..."
        />
      </div>

      {/* House Rules */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>House Rules</h3>
        {houseRules.length > 0 ? (
          <FormCheckboxGroup
            name="houseRules"
            options={formatHouseRuleOptions(houseRules)}
            selectedValues={listing['Features - House Rules'] || []}
            onChange={handleHouseRulesChange}
            columns={3}
          />
        ) : (
          <p style={styles.loadingText}>Loading house rules...</p>
        )}
        <p style={styles.selectedCount}>
          {(listing['Features - House Rules'] || []).length} rules selected
        </p>
      </div>

      {/* Blocked Dates */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>Blocked Dates</h3>
        <p style={styles.helpText}>
          Add dates when your space is not available for booking.
        </p>

        <div style={styles.addDateRow}>
          <FormDatePicker
            name="newBlockedDate"
            value={newBlockedDate}
            onChange={(e) => setNewBlockedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <button
            type="button"
            onClick={handleAddBlockedDate}
            disabled={!newBlockedDate}
            style={{
              ...styles.addButton,
              ...(!newBlockedDate ? styles.addButtonDisabled : {})
            }}
          >
            Add Date
          </button>
        </div>

        {blockedDates.length > 0 && (
          <div style={styles.blockedDatesList}>
            {blockedDates.map(date => (
              <div key={date} style={styles.blockedDateTag}>
                <span>{formatDate(date)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveBlockedDate(date)}
                  style={styles.removeButton}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {blockedDates.length === 0 && (
          <p style={styles.emptyText}>No blocked dates added.</p>
        )}
      </div>
    </SectionContainer>
  );
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '1.5rem'
  },
  section: {
    marginTop: '1.5rem'
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
  loadingText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontStyle: 'italic'
  },
  selectedCount: {
    fontSize: '0.8125rem',
    color: '#6b7280',
    marginTop: '0.5rem',
    textAlign: 'right'
  },
  addDateRow: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-end',
    marginBottom: '1rem'
  },
  addButton: {
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#52ABEC',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  addButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed'
  },
  blockedDatesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem'
  },
  blockedDateTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.75rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '9999px',
    fontSize: '0.8125rem',
    color: '#991b1b'
  },
  removeButton: {
    padding: 0,
    width: '1.25rem',
    height: '1.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontStyle: 'italic'
  }
};
