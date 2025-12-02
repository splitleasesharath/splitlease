/**
 * Host Overview Toast Notifications
 *
 * Toast notification components for displaying:
 * - Success messages
 * - Error messages
 * - Information messages
 * - Warning messages
 *
 * Features:
 * - Auto-dismiss with progress bar
 * - Manual close button
 * - Multiple toast stacking
 */

import React, { useEffect, useState } from 'react';

export function Toast({ id, title, message, type = 'information', duration = 3000, onClose }) {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
        setProgress(remaining);

        if (remaining === 0) {
          clearInterval(interval);
          handleClose();
        }
      }, 16);

      return () => clearInterval(interval);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  const icons = {
    error: '\u2715',
    information: '\u24D8',
    warning: '\u26A0',
    success: '\u2713'
  };

  return (
    <div className={`host-toast host-toast--${type} ${isExiting ? 'host-toast--exiting' : ''}`}>
      <div className="host-toast__icon">
        {icons[type]}
      </div>
      <div className="host-toast__content">
        <div className="host-toast__title">{title}</div>
        {message && <div className="host-toast__message">{message}</div>}
      </div>
      <button className="host-toast__close" onClick={handleClose} aria-label="Close notification">
        &times;
      </button>
      {duration > 0 && (
        <div className="host-toast__progress">
          <div
            className="host-toast__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="host-toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </div>
  );
}
