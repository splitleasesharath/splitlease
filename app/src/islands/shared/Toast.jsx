import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import '../../styles/components/toast.css';

/**
 * Toast Notification System - Replicating Bubble "Alerts General" Custom Event
 *
 * ALERT TYPES (matching Bubble option set):
 * - success: Green (#22C55E) - confirmations, completed actions, positive feedback
 * - error: Red (#EF4444) - failures, validation errors, critical issues
 * - warning: Amber (#F59E0B) - cautions, non-critical issues, attention needed
 * - info: Blue (#3B82F6) - tips, general info, neutral messages
 * - default: Gray (#454444) - fallback when no type specified
 *
 * PARAMETERS (matching Bubble custom event):
 * - title (string, REQUIRED): Heading of the toast
 * - content (string, optional): Message body/description
 * - type (AlertType, optional): success | error | warning | info
 * - duration (number, optional): Auto-hide time in ms (default: 5000)
 * - showProgress (boolean, optional): Display progress bar (default: true)
 *
 * USAGE:
 * import { useToast } from './Toast';
 *
 * function MyComponent() {
 *   const { showToast } = useToast();
 *
 *   // Success alert
 *   showToast({ title: 'Success!', content: 'Your changes have been saved.', type: 'success' });
 *
 *   // Error alert
 *   showToast({ title: 'Error', content: 'Something went wrong.', type: 'error' });
 *
 *   // Warning alert
 *   showToast({ title: 'Warning', content: 'Session expires soon.', type: 'warning' });
 *
 *   // Info alert
 *   showToast({ title: 'Did you know?', content: 'You can customize settings.', type: 'info' });
 * }
 *
 * OR using the global function:
 * import { showToast } from './Toast';
 * showToast({ title: 'Saved!', type: 'success' });
 */

// Toast Context for global access
const ToastContext = createContext(null);

let toastId = 0;

// Alert type styles matching Bubble's configuration
const ALERT_STYLES = {
  success: {
    textColor: '#22C55E',
    progressColor: '#22C55E',
    icon: 'success'
  },
  error: {
    textColor: '#EF4444',
    progressColor: '#EF4444',
    icon: 'error'
  },
  warning: {
    textColor: '#F59E0B',
    progressColor: '#F59E0B',
    icon: 'warning'
  },
  info: {
    textColor: '#3B82F6',
    progressColor: '#3B82F6',
    icon: 'info'
  },
  default: {
    textColor: '#454444',
    progressColor: '#454444',
    icon: null
  }
};

// SVG Icons matching Bubble's toast icons
const ToastIcon = ({ type }) => {
  const iconColor = ALERT_STYLES[type]?.textColor || ALERT_STYLES.default.textColor;

  switch (type) {
    case 'success':
      return (
        <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'error':
      return (
        <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round"/>
          <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round"/>
        </svg>
      );
    case 'warning':
      return (
        <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round"/>
          <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round"/>
        </svg>
      );
    case 'info':
      return (
        <svg className="toast-icon" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12" strokeLinecap="round"/>
          <line x1="12" y1="8" x2="12.01" y2="8" strokeLinecap="round"/>
        </svg>
      );
    default:
      return null;
  }
};

/**
 * Toast Provider - Wraps app to provide toast context
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((options) => {
    // Support both old API (message, type, duration) and new API (options object)
    let toastConfig;

    if (typeof options === 'string') {
      // Legacy API: showToast(message, type, duration)
      const [message, type, duration] = [options, arguments[1], arguments[2]];
      toastConfig = {
        id: toastId++,
        title: message,
        content: null,
        type: type || 'info',
        duration: duration ?? 5000,
        showProgress: true
      };
    } else {
      // New API: showToast({ title, content, type, duration, showProgress })
      toastConfig = {
        id: toastId++,
        title: options.title,
        content: options.content || null,
        type: options.type || 'info',
        duration: options.duration ?? 5000,
        showProgress: options.showProgress ?? true
      };
    }

    setToasts(prev => {
      // Max 5 notifications at once (matching Bubble config)
      const updated = [...prev, toastConfig];
      if (updated.length > 5) {
        return updated.slice(-5);
      }
      return updated;
    });

    return toastConfig.id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Set global function for use outside React components
  useEffect(() => {
    setGlobalToastFunction(showToast);
    return () => setGlobalToastFunction(null);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast functions
 */
export function useToast() {
  const context = useContext(ToastContext);

  if (context) {
    return context;
  }

  // Fallback for components not wrapped in ToastProvider
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((options) => {
    let toastConfig;

    if (typeof options === 'string') {
      const [message, type, duration] = [options, arguments[1], arguments[2]];
      toastConfig = {
        id: toastId++,
        title: message,
        content: null,
        type: type || 'info',
        duration: duration ?? 5000,
        showProgress: true
      };
    } else {
      toastConfig = {
        id: toastId++,
        title: options.title,
        content: options.content || null,
        type: options.type || 'info',
        duration: options.duration ?? 5000,
        showProgress: options.showProgress ?? true
      };
    }

    setToasts(prev => {
      const updated = [...prev, toastConfig];
      if (updated.length > 5) {
        return updated.slice(-5);
      }
      return updated;
    });

    return toastConfig.id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return { toasts, showToast, removeToast };
}

/**
 * Toast Container - Renders all active toasts
 */
function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container" role="alert" aria-live="polite">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          index={index}
          onRemove={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}

/**
 * Individual Toast Item
 */
function ToastItem({ toast, index, onRemove }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const style = ALERT_STYLES[toast.type] || ALERT_STYLES.default;

  useEffect(() => {
    // Trigger show animation
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    // Auto-dismiss after duration
    if (toast.duration > 0) {
      const fadeTimer = setTimeout(() => {
        handleClose();
      }, toast.duration);
      return () => clearTimeout(fadeTimer);
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onRemove();
    }, 300); // Match CSS transition duration
  };

  const className = [
    'toast',
    `toast-${toast.type || 'default'}`,
    isVisible && !isFadingOut ? 'show' : '',
    isFadingOut ? 'fade-out' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      style={{ '--toast-color': style.textColor, '--progress-color': style.progressColor }}
    >
      {/* Icon */}
      {style.icon && <ToastIcon type={toast.type} />}

      {/* Content */}
      <div className="toast-content">
        <h4 className="toast-title">{toast.title}</h4>
        {toast.content && <p className="toast-message">{toast.content}</p>}
      </div>

      {/* Close Button */}
      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Close notification"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Progress Bar */}
      {toast.showProgress && toast.duration > 0 && (
        <div
          className="toast-progress"
          style={{
            animationDuration: `${toast.duration}ms`,
            backgroundColor: style.progressColor
          }}
        />
      )}
    </div>
  );
}

// Default export for backward compatibility
export default function Toast({ toasts, onRemove }) {
  return <ToastContainer toasts={toasts} onRemove={onRemove} />;
}

// Global toast function for use outside React components
let globalShowToast = null;

export function setGlobalToastFunction(showToastFn) {
  globalShowToast = showToastFn;
}

/**
 * Global showToast function - can be called from anywhere
 *
 * @param {Object|string} options - Toast configuration or message string
 * @param {string} options.title - Toast title (required)
 * @param {string} options.content - Toast message body (optional)
 * @param {'success'|'error'|'warning'|'info'} options.type - Alert type (optional, default: 'info')
 * @param {number} options.duration - Duration in ms (optional, default: 5000)
 * @param {boolean} options.showProgress - Show progress bar (optional, default: true)
 *
 * @example
 * // New API (recommended)
 * showToast({ title: 'Success!', content: 'Changes saved.', type: 'success' });
 *
 * // Legacy API (still supported)
 * showToast('Changes saved', 'success', 3000);
 */
export function showToast(options, type = 'info', duration = 5000) {
  if (globalShowToast) {
    if (typeof options === 'string') {
      // Legacy API support
      globalShowToast({ title: options, type, duration });
    } else {
      globalShowToast(options);
    }
  } else {
    console.warn('Toast system not initialized. Wrap your app with ToastProvider or use useToast hook.');
  }
}
