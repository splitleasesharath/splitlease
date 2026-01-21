/**
 * ReviewsSection - Reviews and safety features section
 *
 * @param {object} props - Component props
 * @param {object} props.listing - Current listing data
 * @param {function} props.onUpdate - Partial update callback
 * @param {Array} props.safetyFeatures - Safety features options from dataLookups
 */

import { FormInput, FormDatePicker, FormCheckboxGroup, SectionContainer } from '../shared';

export default function ReviewsSection({
  listing,
  onUpdate,
  safetyFeatures = [],
  isSaving,
  onSave,
  lastSaved
}) {
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const parsedValue = type === 'number' ? (value === '' ? null : Number(value)) : value;
    onUpdate({ [name]: parsedValue });
  };

  const handleSafetyFeaturesChange = (selectedValues) => {
    onUpdate({ 'Features - Safety': selectedValues });
  };

  // Format safety features for checkbox group
  const formatSafetyOptions = (features) => {
    return features.map(feature => ({
      value: feature._id || feature.value,
      label: feature.name || feature.Name || feature.label
    }));
  };

  return (
    <SectionContainer
      title="Safety & Details"
      onSave={onSave}
      isSaving={isSaving}
      lastSaved={lastSaved}
    >
      {/* Safety Features */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>Safety Features</h3>
        <p style={styles.helpText}>
          Select all safety features available in your property.
        </p>
        {safetyFeatures.length > 0 ? (
          <FormCheckboxGroup
            name="safetyFeatures"
            options={formatSafetyOptions(safetyFeatures)}
            selectedValues={listing['Features - Safety'] || []}
            onChange={handleSafetyFeaturesChange}
            columns={3}
          />
        ) : (
          <p style={styles.loadingText}>Loading safety features...</p>
        )}
        <p style={styles.selectedCount}>
          {(listing['Features - Safety'] || []).length} features selected
        </p>
      </div>

      {/* Property Details */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>Property Details</h3>
        <div style={styles.grid}>
          {/* Square Footage */}
          <FormInput
            label="Square Footage"
            name="Features - SQFT Area"
            value={listing['Features - SQFT Area']}
            onChange={handleChange}
            type="number"
            placeholder="e.g., 800"
            helpText="Total square feet of available space"
          />

          {/* First Day Available */}
          <FormDatePicker
            label="First Day Available"
            name=" First Available"
            value={listing[' First Available']}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            helpText="When can guests start booking?"
          />
        </div>
      </div>

      {/* External Reviews */}
      <div style={styles.section}>
        <h3 style={styles.subheading}>External Reviews</h3>
        <p style={styles.helpText}>
          If you have reviews on other platforms (Airbnb, VRBO, etc.), paste the link here.
        </p>
        <FormInput
          label="Previous Reviews Link"
          name="Source Link"
          value={listing['Source Link']}
          onChange={handleChange}
          placeholder="https://www.airbnb.com/rooms/12345678"
          helpText="Optional - helps build trust with potential guests"
        />
      </div>

      {/* Summary Card */}
      <div style={styles.summaryCard}>
        <h4 style={styles.summaryTitle}>Listing Summary</h4>
        <div style={styles.summaryGrid}>
          <SummaryItem
            label="Safety Features"
            value={`${(listing['Features - Safety'] || []).length} selected`}
          />
          <SummaryItem
            label="Square Footage"
            value={listing['Features - SQFT Area'] ? `${listing['Features - SQFT Area']} sq ft` : 'Not specified'}
          />
          <SummaryItem
            label="First Available"
            value={listing[' First Available'] ? formatDate(listing[' First Available']) : 'Not set'}
          />
          <SummaryItem
            label="External Reviews"
            value={listing['Source Link'] ? 'Link provided' : 'None'}
          />
        </div>
      </div>
    </SectionContainer>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div style={styles.summaryItem}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={styles.summaryValue}>{value}</span>
    </div>
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
  section: {
    marginBottom: '1.5rem'
  },
  subheading: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem'
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem'
  },
  summaryCard: {
    marginTop: '2rem',
    padding: '1.25rem',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem'
  },
  summaryTitle: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '1rem'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem'
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem'
  },
  summaryLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.025em'
  },
  summaryValue: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#111827'
  }
};
