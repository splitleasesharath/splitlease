import { COLORS } from '../../../../lib/constants.js';

export function LoadingState() {
  return (
    <div className="vsl-loading">
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        padding: '2rem'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: `4px solid ${COLORS.BG_LIGHT}`,
          borderTop: `4px solid ${COLORS.PRIMARY}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
