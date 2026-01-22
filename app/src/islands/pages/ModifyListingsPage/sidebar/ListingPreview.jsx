/**
 * ListingPreview - Preview card showing how listing appears to guests
 *
 * @param {object} props - Component props
 * @param {object} props.listing - Current listing data
 */

export default function ListingPreview({ listing }) {
  const listingId = listing['_id'] || listing['id'];
  const previewUrl = listingId ? `/preview-split-lease/${listingId}` : null;
  const viewUrl = listingId ? `/view-split-lease/${listingId}` : null;

  // Get main photo
  const photos = listing['Features - Photos'] || [];
  const mainPhoto = photos.find(p => p.toggleMainPhoto) || photos[0];
  const photoUrl = mainPhoto?.url || mainPhoto?.Photo || '/assets/images/placeholder-listing.png';

  // Get price display
  const monthlyRate = listing['💰Monthly Host Rate'];
  const weeklyRate = listing['💰Weekly Host Rate'];
  const priceDisplay = monthlyRate
    ? `$${monthlyRate.toLocaleString()}/mo`
    : weeklyRate
      ? `$${weeklyRate.toLocaleString()}/wk`
      : 'Price not set';

  // Get location display
  const neighborhood = listing['Address - Neighborhood'] || listing['Address - City'] || 'Location not set';
  const borough = listing['Address - Borough'] || '';

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Listing Preview</h3>

      {/* Preview Card */}
      <div style={styles.card}>
        {/* Photo */}
        <div style={styles.photoContainer}>
          <img
            src={photoUrl}
            alt={listing['Name'] || 'Listing preview'}
            style={styles.photo}
            onError={(e) => {
              e.target.src = '/assets/images/placeholder-listing.png';
            }}
          />
          {listing['Showcase'] && (
            <span style={styles.showcaseBadge}>Featured</span>
          )}
        </div>

        {/* Info */}
        <div style={styles.info}>
          <span style={styles.price}>{priceDisplay}</span>
          <span style={styles.name}>
            {listing['Name'] || 'Untitled Listing'}
          </span>
          <span style={styles.location}>
            {neighborhood}{borough ? `, ${borough}` : ''}
          </span>

          {/* Quick Stats */}
          <div style={styles.stats}>
            <span style={styles.stat}>
              {listing['Features - Qty Bedrooms'] ?? 0} bed
            </span>
            <span style={styles.statDivider}>·</span>
            <span style={styles.stat}>
              {listing['Features - Qty Baths'] ?? 0} bath
            </span>
            {listing['Features - Qty Guests'] && (
              <>
                <span style={styles.statDivider}>·</span>
                <span style={styles.stat}>
                  {listing['Features - Qty Guests']} guests
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {viewUrl && (
          <a
            href={viewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.viewButton}
          >
            <EyeIcon style={styles.buttonIcon} />
            View as Guest
          </a>
        )}
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.previewButton}
          >
            <EditIcon style={styles.buttonIcon} />
            Host Preview
          </a>
        )}
      </div>

      {/* Status Indicators */}
      <div style={styles.statusRow}>
        <StatusPill
          label="Photos"
          count={photos.length}
          min={3}
        />
        <StatusPill
          label="Approved"
          isActive={listing['Approved']}
        />
        <StatusPill
          label="Active"
          isActive={listing['Active']}
        />
      </div>
    </div>
  );
}

function StatusPill({ label, count, min, isActive }) {
  let status = 'neutral';
  let displayValue = label;

  if (count !== undefined && min !== undefined) {
    status = count >= min ? 'success' : 'warning';
    displayValue = `${count}/${min}`;
  } else if (isActive !== undefined) {
    status = isActive ? 'success' : 'error';
    displayValue = isActive ? 'Yes' : 'No';
  }

  const statusColors = {
    success: { bg: '#dcfce7', text: '#166534' },
    warning: { bg: '#fef3c7', text: '#92400e' },
    error: { bg: '#fee2e2', text: '#991b1b' },
    neutral: { bg: '#f3f4f6', text: '#374151' }
  };

  const colors = statusColors[status];

  return (
    <div style={{
      ...styles.statusPill,
      backgroundColor: colors.bg,
      color: colors.text
    }}>
      <span style={styles.statusLabel}>{label}</span>
      <span style={styles.statusValue}>{displayValue}</span>
    </div>
  );
}

function EyeIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function EditIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    marginBottom: '1rem'
  },
  photoContainer: {
    position: 'relative',
    aspectRatio: '16/10',
    backgroundColor: '#f3f4f6'
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  showcaseBadge: {
    position: 'absolute',
    top: '0.5rem',
    left: '0.5rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: '#fbbf24',
    color: '#78350f',
    fontSize: '0.6875rem',
    fontWeight: '600',
    borderRadius: '0.25rem',
    textTransform: 'uppercase'
  },
  info: {
    padding: '0.75rem'
  },
  price: {
    display: 'block',
    fontSize: '1.125rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.25rem'
  },
  name: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.125rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  location: {
    display: 'block',
    fontSize: '0.8125rem',
    color: '#6b7280',
    marginBottom: '0.5rem'
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    color: '#6b7280'
  },
  stat: {},
  statDivider: {
    color: '#d1d5db'
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  viewButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    padding: '0.5rem',
    fontSize: '0.8125rem',
    fontWeight: '500',
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '0.375rem',
    textDecoration: 'none',
    cursor: 'pointer'
  },
  previewButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.375rem',
    padding: '0.5rem',
    fontSize: '0.8125rem',
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#52ABEC',
    border: 'none',
    borderRadius: '0.375rem',
    textDecoration: 'none',
    cursor: 'pointer'
  },
  buttonIcon: {
    width: '1rem',
    height: '1rem'
  },
  statusRow: {
    display: 'flex',
    gap: '0.5rem'
  },
  statusPill: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.5rem',
    borderRadius: '0.375rem'
  },
  statusLabel: {
    fontSize: '0.6875rem',
    textTransform: 'uppercase',
    letterSpacing: '0.025em'
  },
  statusValue: {
    fontSize: '0.8125rem',
    fontWeight: '600'
  }
};
