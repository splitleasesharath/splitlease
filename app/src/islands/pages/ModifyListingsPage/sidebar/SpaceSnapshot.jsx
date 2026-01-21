/**
 * SpaceSnapshot - Quick view of property details
 *
 * @param {object} props - Component props
 * @param {object} props.listing - Current listing data
 */

export default function SpaceSnapshot({ listing }) {
  const propertyDetails = [
    {
      icon: BedIcon,
      label: 'Bedrooms',
      value: listing['Features - Qty Bedrooms'] ?? '-'
    },
    {
      icon: BedIcon,
      label: 'Beds',
      value: listing['Features - Qty Beds'] ?? '-'
    },
    {
      icon: BathIcon,
      label: 'Bathrooms',
      value: listing['Features - Qty Baths'] ?? '-'
    },
    {
      icon: KitchenIcon,
      label: 'Kitchen',
      value: listing['Features - Kitchen Type'] || '-'
    },
    {
      icon: CarIcon,
      label: 'Parking',
      value: listing['Features - Parking'] || '-'
    },
    {
      icon: SquareIcon,
      label: 'Square Feet',
      value: listing['Features - SQFT Area'] ? `${listing['Features - SQFT Area']} sq ft` : '-'
    }
  ];

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Space Snapshot</h3>

      {/* Property Name */}
      <div style={styles.nameSection}>
        <span style={styles.propertyName}>
          {listing['Name'] || 'Untitled Listing'}
        </span>
        <span style={styles.spaceType}>
          {listing['Type of Space'] || 'Space type not set'}
        </span>
      </div>

      {/* Address */}
      <div style={styles.addressSection}>
        <LocationIcon style={styles.locationIcon} />
        <div style={styles.addressText}>
          <span style={styles.streetAddress}>
            {listing['Address - Full Street Address'] || 'Address not set'}
          </span>
          <span style={styles.cityState}>
            {[
              listing['Address - City'],
              listing['Address - State'],
              listing['Address - Zip']
            ].filter(Boolean).join(', ') || 'City, State not set'}
          </span>
        </div>
      </div>

      {/* Property Details Grid */}
      <div style={styles.detailsGrid}>
        {propertyDetails.map(detail => (
          <div key={detail.label} style={styles.detailItem}>
            <detail.icon style={styles.detailIcon} />
            <div style={styles.detailContent}>
              <span style={styles.detailValue}>{detail.value}</span>
              <span style={styles.detailLabel}>{detail.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BedIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function BathIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  );
}

function KitchenIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function CarIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

function SquareIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" />
    </svg>
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
  nameSection: {
    marginBottom: '1rem'
  },
  propertyName: {
    display: 'block',
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.25rem'
  },
  spaceType: {
    fontSize: '0.8125rem',
    color: '#6b7280'
  },
  addressSection: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.375rem'
  },
  locationIcon: {
    width: '1.25rem',
    height: '1.25rem',
    color: '#6b7280',
    flexShrink: 0
  },
  addressText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem'
  },
  streetAddress: {
    fontSize: '0.875rem',
    color: '#111827',
    fontWeight: '500'
  },
  cityState: {
    fontSize: '0.8125rem',
    color: '#6b7280'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.375rem'
  },
  detailIcon: {
    width: '1rem',
    height: '1rem',
    color: '#9ca3af'
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column'
  },
  detailValue: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#111827'
  },
  detailLabel: {
    fontSize: '0.6875rem',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.025em'
  }
};
