import { useState, useEffect } from 'react';

/**
 * Alert - Display success/error/warning/info messages
 *
 * @param {object} props - Component props
 * @param {'success'|'error'|'warning'|'info'} props.type - Alert type
 * @param {string} props.message - Alert message
 * @param {function} [props.onClose] - Close handler
 * @param {number} [props.autoDismiss=5000] - Auto dismiss after ms (0 to disable)
 * @param {string} [props.title] - Optional title
 */
export default function Alert({
  type = 'info',
  message,
  onClose,
  autoDismiss = 5000,
  title
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          setTimeout(onClose, 300); // Wait for fade animation
        }
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(onClose, 300);
    }
  };

  if (!message) return null;

  const typeStyles = alertStyles[type] || alertStyles.info;

  return (
    <div
      style={{
        ...styles.container,
        ...typeStyles.container,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-0.5rem)'
      }}
      role="alert"
    >
      <div style={styles.iconContainer}>
        <AlertIcon type={type} />
      </div>
      <div style={styles.content}>
        {title && <p style={{...styles.title, ...typeStyles.title}}>{title}</p>}
        <p style={{...styles.message, ...typeStyles.message}}>{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={handleClose}
          style={styles.closeButton}
          aria-label="Close alert"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

function AlertIcon({ type }) {
  const icons = {
    success: (
      <svg style={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg style={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg style={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg style={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };

  return icons[type] || icons.info;
}

function CloseIcon() {
  return (
    <svg style={styles.closeIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '1rem',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
    transition: 'opacity 0.3s, transform 0.3s'
  },
  iconContainer: {
    flexShrink: 0,
    marginRight: '0.75rem'
  },
  icon: {
    width: '1.25rem',
    height: '1.25rem'
  },
  content: {
    flex: 1
  },
  title: {
    fontSize: '0.875rem',
    fontWeight: '600',
    marginBottom: '0.25rem',
    margin: 0
  },
  message: {
    fontSize: '0.875rem',
    margin: 0
  },
  closeButton: {
    flexShrink: 0,
    marginLeft: '0.75rem',
    padding: '0.25rem',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    opacity: 0.6,
    transition: 'opacity 0.15s'
  },
  closeIcon: {
    width: '1rem',
    height: '1rem'
  }
};

const alertStyles = {
  success: {
    container: {
      backgroundColor: '#ecfdf5',
      border: '1px solid #a7f3d0',
      color: '#065f46'
    },
    title: { color: '#065f46' },
    message: { color: '#047857' }
  },
  error: {
    container: {
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      color: '#991b1b'
    },
    title: { color: '#991b1b' },
    message: { color: '#b91c1c' }
  },
  warning: {
    container: {
      backgroundColor: '#fffbeb',
      border: '1px solid #fde68a',
      color: '#92400e'
    },
    title: { color: '#92400e' },
    message: { color: '#b45309' }
  },
  info: {
    container: {
      backgroundColor: '#eff6ff',
      border: '1px solid #bfdbfe',
      color: '#1e40af'
    },
    title: { color: '#1e40af' },
    message: { color: '#1d4ed8' }
  }
};
