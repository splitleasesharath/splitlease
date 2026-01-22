/**
 * PhotosSection - Photo management section
 *
 * @param {object} props - Component props
 * @param {object} props.listing - Current listing data
 * @param {function} props.onUpdate - Partial update callback
 * @param {function} props.onUploadPhoto - Photo upload handler
 * @param {function} props.onDeletePhoto - Photo delete handler
 */

import { useState, useRef } from 'react';
import { SectionContainer } from '../shared';

export default function PhotosSection({
  listing,
  onUpdate,
  onUploadPhoto,
  onDeletePhoto,
  isSaving,
  onSave,
  lastSaved
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef(null);

  const photos = listing['Features - Photos'] || [];

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const uploadFiles = async (files) => {
    setUploadingCount(files.length);
    try {
      for (const file of files) {
        if (onUploadPhoto) {
          await onUploadPhoto(file);
        }
      }
    } finally {
      setUploadingCount(0);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDeleteClick = (photoId) => {
    if (onDeletePhoto) {
      onDeletePhoto(photoId);
    }
  };

  const handleSetMainPhoto = (photoId) => {
    const updatedPhotos = photos.map((photo, index) => ({
      ...photo,
      toggleMainPhoto: photo.id === photoId,
      SortOrder: photo.id === photoId ? 0 : (photo.SortOrder || index) + 1
    }));
    // Re-sort by SortOrder
    updatedPhotos.sort((a, b) => (a.SortOrder || 0) - (b.SortOrder || 0));
    onUpdate({ 'Features - Photos': updatedPhotos });
  };

  const handleDeleteAllPhotos = () => {
    if (window.confirm('Are you sure you want to delete all photos?')) {
      onUpdate({ 'Features - Photos': [] });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <SectionContainer
      title="Photos"
      onSave={onSave}
      isSaving={isSaving}
      lastSaved={lastSaved}
    >
      {/* Photo Count & Validation */}
      <div style={styles.validation}>
        <span style={{
          ...styles.validationText,
          color: photos.length >= 3 ? '#16a34a' : '#b91c1c'
        }}>
          {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded
          {photos.length < 3 && ' (minimum 3 required)'}
        </span>
        {photos.length > 0 && (
          <button
            type="button"
            onClick={handleDeleteAllPhotos}
            style={styles.deleteAllButton}
          >
            Delete All
          </button>
        )}
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={triggerFileInput}
        style={{
          ...styles.uploadArea,
          ...(isDragging ? styles.uploadAreaDragging : {})
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={styles.hiddenInput}
        />
        {uploadingCount > 0 ? (
          <div style={styles.uploadingMessage}>
            <SpinnerIcon />
            <span>Uploading {uploadingCount} photo{uploadingCount > 1 ? 's' : ''}...</span>
          </div>
        ) : (
          <>
            <UploadIcon />
            <p style={styles.uploadText}>
              Drag and drop photos here, or click to select
            </p>
            <p style={styles.uploadSubtext}>
              Supports JPG, PNG, WEBP up to 10MB each
            </p>
          </>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div style={styles.photoGrid}>
          {photos.map((photo, index) => (
            <div key={photo.id || index} style={styles.photoCard}>
              <div style={styles.photoImageWrapper}>
                <img
                  src={photo.url || photo.Photo}
                  alt={`Photo ${index + 1}`}
                  style={styles.photoImage}
                />
                {photo.toggleMainPhoto && (
                  <span style={styles.mainPhotoBadge}>Main Photo</span>
                )}
              </div>
              <div style={styles.photoActions}>
                {!photo.toggleMainPhoto && (
                  <button
                    type="button"
                    onClick={() => handleSetMainPhoto(photo.id)}
                    style={styles.actionButton}
                    title="Set as main photo"
                  >
                    <StarIcon />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteClick(photo.id)}
                  style={{...styles.actionButton, ...styles.deleteButton}}
                  title="Delete photo"
                >
                  <TrashIcon />
                </button>
              </div>
              <span style={styles.photoOrder}>#{index + 1}</span>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div style={styles.instructions}>
        <h4 style={styles.instructionsTitle}>Photo Guidelines</h4>
        <ul style={styles.instructionsList}>
          <li>Upload at least 3 high-quality photos</li>
          <li>First photo will be used as the main listing image</li>
          <li>Click the star icon to change the main photo</li>
          <li>Show different areas: bedroom, living room, kitchen, bathroom</li>
        </ul>
      </div>
    </SectionContainer>
  );
}

function UploadIcon() {
  return (
    <svg style={styles.uploadIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg style={styles.spinnerIcon} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ opacity: 0.25 }} />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg style={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg style={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

const styles = {
  validation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  validationText: {
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  deleteAllButton: {
    padding: '0.375rem 0.75rem',
    fontSize: '0.75rem',
    color: '#dc2626',
    backgroundColor: 'transparent',
    border: '1px solid #fecaca',
    borderRadius: '0.375rem',
    cursor: 'pointer'
  },
  uploadArea: {
    border: '2px dashed #d1d5db',
    borderRadius: '0.75rem',
    padding: '2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
    backgroundColor: '#fafafa'
  },
  uploadAreaDragging: {
    borderColor: '#52ABEC',
    backgroundColor: '#eff6ff'
  },
  hiddenInput: {
    display: 'none'
  },
  uploadIcon: {
    width: '3rem',
    height: '3rem',
    color: '#9ca3af',
    margin: '0 auto 1rem'
  },
  uploadText: {
    fontSize: '0.875rem',
    color: '#374151',
    margin: '0 0 0.25rem'
  },
  uploadSubtext: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: 0
  },
  uploadingMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    color: '#52ABEC'
  },
  spinnerIcon: {
    width: '1.5rem',
    height: '1.5rem',
    animation: 'spin 1s linear infinite'
  },
  photoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '1rem',
    marginTop: '1.5rem'
  },
  photoCard: {
    position: 'relative',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    backgroundColor: '#ffffff'
  },
  photoImageWrapper: {
    position: 'relative',
    aspectRatio: '4/3'
  },
  photoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  mainPhotoBadge: {
    position: 'absolute',
    top: '0.5rem',
    left: '0.5rem',
    padding: '0.125rem 0.5rem',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontSize: '0.625rem',
    fontWeight: '600',
    borderRadius: '9999px'
  },
  photoActions: {
    display: 'flex',
    gap: '0.25rem',
    padding: '0.5rem',
    borderTop: '1px solid #e5e7eb'
  },
  actionButton: {
    flex: 1,
    padding: '0.375rem',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    color: '#dc2626'
  },
  icon: {
    width: '1rem',
    height: '1rem'
  },
  photoOrder: {
    position: 'absolute',
    bottom: '2.5rem',
    right: '0.5rem',
    padding: '0.125rem 0.375rem',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#ffffff',
    fontSize: '0.625rem',
    borderRadius: '0.25rem'
  },
  instructions: {
    marginTop: '1.5rem',
    padding: '1rem',
    backgroundColor: '#eff6ff',
    borderRadius: '0.5rem'
  },
  instructionsTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: '0.5rem'
  },
  instructionsList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontSize: '0.8125rem',
    color: '#1d4ed8'
  }
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
