/**
 * SearchOptimising - Display search ranking and listing metadata
 *
 * @param {object} props - Component props
 * @param {object} props.listing - Current listing data
 */

export default function SearchOptimising({ listing }) {
  const fields = [
    {
      label: 'Search Ranking',
      value: listing['Search Ranking'] ?? 'Not ranked',
      description: 'Position in search results'
    },
    {
      label: 'Listing Code',
      value: listing['_id'] || listing['id'] || 'N/A',
      description: 'Unique identifier'
    },
    {
      label: 'Click Counter',
      value: listing['Click Counter'] ?? 0,
      description: 'Total listing views'
    },
    {
      label: 'Bulk Upload ID',
      value: listing['Bulk Upload ID'] || 'None',
      description: 'Import batch reference'
    },
    {
      label: 'Created Date',
      value: formatDate(listing['Created Date']),
      description: 'When listing was created'
    },
    {
      label: 'Modified Date',
      value: formatDate(listing['Modified Date']),
      description: 'Last update'
    }
  ];

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Search Optimising</h3>
      <div style={styles.fieldList}>
        {fields.map(field => (
          <div key={field.label} style={styles.field}>
            <span style={styles.fieldLabel}>{field.label}</span>
            <span style={styles.fieldValue} title={field.description}>
              {field.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateString;
  }
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
  fieldList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  field: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem'
  },
  fieldLabel: {
    fontSize: '0.8125rem',
    color: '#6b7280'
  },
  fieldValue: {
    fontSize: '0.8125rem',
    fontWeight: '500',
    color: '#111827',
    textAlign: 'right',
    wordBreak: 'break-all',
    maxWidth: '60%'
  }
};
