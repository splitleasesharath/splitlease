import { useState, useEffect } from 'react';

/**
 * Toast Notification System - PORTED FROM ORIGINAL
 * Displays temporary notification messages to users
 * Types: info, success, warning, error
 */

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = toastId++;
    const newToast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return { toasts, showToast, removeToast };
}

export default function Toast({ toasts, onRemove }) {
  return (
    <div className="toast-container">
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

function ToastItem({ toast, index, onRemove }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

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

  const toastStyle = {
    top: `${20 + index * 70}px`, // Stack toasts vertically
  };

  const className = `toast toast-${toast.type} ${isVisible && !isFadingOut ? 'show' : ''} ${isFadingOut ? 'fade-out' : ''}`;

  return (
    <div className={className} style={toastStyle} onClick={handleClose}>
      {toast.message}
    </div>
  );
}

// Global toast function for use outside React components
let globalShowToast = null;

export function setGlobalToastFunction(showToastFn) {
  globalShowToast = showToastFn;
}

export function showToast(message, type = 'info', duration = 3000) {
  if (globalShowToast) {
    globalShowToast(message, type, duration);
  } else {
    console.warn('Toast system not initialized');
  }
}
