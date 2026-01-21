/**
 * AlertOverlay Component
 * Simple alert/notification overlay
 */

import React from 'react';

export default function AlertOverlay({
  title,
  content,
  onClose,
}) {
  return (
    <div className="alert-overlay active">
      <div className="alert-box purple-alert">
        <h3>{title}</h3>
        <p>{content}</p>
        <button
          type="button"
          className="btn btn-purple"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
}
