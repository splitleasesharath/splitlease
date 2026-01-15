import { COLORS } from '../../../../lib/constants.js';

export function ErrorState({ error, onRetry }) {
  const message = typeof error === 'string' ? error : error?.message;

  return (
    <div className="vsl-error">
      <div style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: '1rem',
          color: COLORS.TEXT_DARK
        }}>
          Property Not Found
        </h2>
        <p style={{
          fontSize: '1.125rem',
          color: COLORS.TEXT_LIGHT,
          marginBottom: '2rem'
        }}>
          {message || 'The property you are looking for does not exist or has been removed.'}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                display: 'inline-block',
                padding: '1rem 2rem',
                background: COLORS.PRIMARY,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Retry
            </button>
          )}
          <a
            href="/search.html"
            style={{
              display: 'inline-block',
              padding: '1rem 2rem',
              background: onRetry ? COLORS.BG_LIGHT : COLORS.PRIMARY,
              color: onRetry ? COLORS.TEXT_DARK : 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              transition: 'background 0.2s'
            }}
          >
            Browse All Listings
          </a>
        </div>
      </div>
    </div>
  );
}
