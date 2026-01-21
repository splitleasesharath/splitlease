/**
 * StatusSection - Approval and activity toggles
 *
 * @param {object} props - Component props
 * @param {object} props.listing - Current listing data
 * @param {function} props.onUpdate - Partial update callback
 * @param {boolean} props.isProcessing - Whether a save operation is in progress
 */

import { FormToggle } from '../shared';

export default function StatusSection({
  listing,
  onUpdate,
  isProcessing = false
}) {
  const handleToggle = (fieldName) => (checked) => {
    onUpdate({ [fieldName]: checked });
  };

  const toggleFields = [
    {
      name: 'Approved',
      label: 'Approved',
      description: 'Listing is approved for display',
      checked: Boolean(listing['Approved'])
    },
    {
      name: 'Active',
      label: 'Active',
      description: 'Listing is currently active',
      checked: Boolean(listing['Active'])
    },
    {
      name: 'availability confirmed',
      label: 'Availability Confirmed',
      description: 'Host has confirmed availability',
      checked: Boolean(listing['availability confirmed'])
    },
    {
      name: 'Showcase',
      label: 'Showcase',
      description: 'Featured in showcase listings',
      checked: Boolean(listing['Showcase'])
    },
    {
      name: 'Claimable',
      label: 'Claimable',
      description: 'Can be claimed by a host',
      checked: Boolean(listing['Claimable'])
    }
  ];

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Status</h3>
      <div style={styles.toggleList}>
        {toggleFields.map(field => (
          <div key={field.name} style={styles.toggleRow}>
            <FormToggle
              label={field.label}
              name={field.name}
              checked={field.checked}
              onChange={handleToggle(field.name)}
              disabled={isProcessing}
            />
            <span style={styles.description}>{field.description}</span>
          </div>
        ))}
      </div>

      {/* Status Summary */}
      <div style={styles.summary}>
        <StatusIndicator
          label="Visibility"
          status={listing['Approved'] && listing['Active'] ? 'visible' : 'hidden'}
        />
        <StatusIndicator
          label="Booking"
          status={listing['availability confirmed'] ? 'available' : 'unavailable'}
        />
      </div>
    </div>
  );
}

function StatusIndicator({ label, status }) {
  const isPositive = status === 'visible' || status === 'available';

  return (
    <div style={styles.indicator}>
      <span style={styles.indicatorLabel}>{label}</span>
      <span style={{
        ...styles.indicatorValue,
        color: isPositive ? '#16a34a' : '#dc2626'
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '1rem'
  },
  title: {
    fontSize: '0.9375rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '1rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e5e7eb'
  },
  toggleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  toggleRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  description: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginLeft: '2.75rem'
  },
  summary: {
    marginTop: '1.25rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '1rem'
  },
  indicator: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem'
  },
  indicatorLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.025em'
  },
  indicatorValue: {
    fontSize: '0.875rem',
    fontWeight: '600'
  }
};
