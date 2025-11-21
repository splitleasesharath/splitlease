import React from 'react'
import './DeletePhotoModal.css'

const DeletePhotoModal = ({ photoName, onConfirm, onCancel }) => {
  return (
    <div className="delete-modal-overlay" onClick={onCancel}>
      <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="delete-modal-close" onClick={onCancel}>
          ×
        </button>

        <div className="delete-modal-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#E53E3E">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </div>

        <h3 className="delete-modal-title">Delete this Photo</h3>
        <p className="delete-modal-description">This action cannot be undone</p>
        <p className="delete-modal-reference">{photoName}</p>

        <div className="delete-modal-actions">
          <button className="delete-modal-btn delete-modal-btn-cancel" onClick={onCancel}>
            No
          </button>
          <button className="delete-modal-btn delete-modal-btn-delete" onClick={onConfirm}>
            Delete Photo
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeletePhotoModal
