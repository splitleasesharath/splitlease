import { useState } from 'react';
import { useListingDashboard } from '../context/ListingDashboardContext';

// Icons
const StarIcon = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? '#f59e0b' : 'none'}
    stroke={filled ? '#f59e0b' : '#374151'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}
    className="photo-action-icon"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#374151"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0 }}
    className="photo-action-icon"
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const DragHandleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="5" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="19" r="1" fill="currentColor" />
    <circle cx="15" cy="5" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="19" r="1" fill="currentColor" />
  </svg>
);

const PHOTO_TYPES = [
  'Dining Room',
  'Bathroom',
  'Bedroom',
  'Kitchen',
  'Living Room',
  'Workspace',
  'Other',
];

export default function PhotosSection() {
  const {
    listing,
    handleEditSection,
    handleDeletePhoto,
    handleSetCoverPhoto,
    handleReorderPhotos
  } = useListingDashboard();
  const photos = listing?.photos || [];

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay to allow the drag image to be captured
    setTimeout(() => {
      e.target.closest('.listing-dashboard-photos__card')?.classList.add('listing-dashboard-photos__card--dragging');
    }, 0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the card entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Call the reorder handler
    if (handleReorderPhotos) {
      handleReorderPhotos(draggedIndex, dropIndex);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = (e) => {
    e.target.closest('.listing-dashboard-photos__card')?.classList.remove('listing-dashboard-photos__card--dragging');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Helper to get a valid image URL
  const getImageUrl = (photo) => {
    // Handle different photo URL formats
    const url = photo?.url || photo?.Photo || photo?.URL || '';
    if (!url) return null;
    // If it's already a full URL, use it
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return url;
    }
    return url;
  };

  // Handle image load error
  const handleImageError = (e) => {
    e.target.style.display = 'none';
    e.target.parentElement.classList.add('listing-dashboard-photos__image-error');
  };

  return (
    <div id="photos" className="listing-dashboard-section">
      {/* Section Header */}
      <div className="listing-dashboard-section__header">
        <h2 className="listing-dashboard-section__title">Photos</h2>
        <button
          className="listing-dashboard-section__add-btn"
          onClick={() => handleEditSection('photos')}
        >
          Add Photos
        </button>
      </div>

      {/* Drag hint */}
      {photos.length > 1 && (
        <p className="listing-dashboard-photos__hint">
          Drag and drop photos to reorder. First photo is the cover photo.
        </p>
      )}

      {/* Photos Grid */}
      <div className="listing-dashboard-photos__grid">
        {photos.map((photo, index) => {
          const imageUrl = getImageUrl(photo);
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={photo.id || index}
              className={`listing-dashboard-photos__card ${isDragging ? 'listing-dashboard-photos__card--dragging' : ''} ${isDragOver ? 'listing-dashboard-photos__card--drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              {/* Drag Handle */}
              <div className="listing-dashboard-photos__drag-handle" title="Drag to reorder">
                <DragHandleIcon />
              </div>

              {/* Photo Image */}
              <div className="listing-dashboard-photos__image-container">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={photo.photoType || `Photo ${index + 1}`}
                    className="listing-dashboard-photos__image"
                    onError={handleImageError}
                    draggable={false}
                  />
                ) : (
                  <div className="listing-dashboard-photos__placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21,15 16,10 5,21"/>
                    </svg>
                    <span>No image</span>
                  </div>
                )}

                {/* Cover Photo Badge */}
                {(photo.isCover || index === 0) && (
                  <div className="listing-dashboard-photos__cover-badge">
                    Cover Photo
                  </div>
                )}

                {/* Action Buttons - Always visible */}
                <div className="listing-dashboard-photos__actions">
                  <button
                    className={`listing-dashboard-photos__star-btn ${(photo.isCover || index === 0) ? 'listing-dashboard-photos__star-btn--active' : ''}`}
                    onClick={() => handleSetCoverPhoto?.(photo.id)}
                    title={(photo.isCover || index === 0) ? 'Current cover photo' : 'Set as cover photo'}
                  >
                    <StarIcon filled={photo.isCover || index === 0} />
                  </button>
                  <button
                    className="listing-dashboard-photos__delete-btn"
                    onClick={() => handleDeletePhoto?.(photo.id)}
                    title="Delete photo"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>

              {/* Photo Type Selector */}
              <div className="listing-dashboard-photos__type">
                <select
                  value={photo.photoType || 'Other'}
                  onChange={(e) => {
                    // TODO: Handle photo type change
                    console.log('Photo type changed:', photo.id, e.target.value);
                  }}
                >
                  {PHOTO_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}

        {/* Empty state if no photos */}
        {photos.length === 0 && (
          <div className="listing-dashboard-photos__empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
            <p>No photos uploaded yet.</p>
            <button onClick={() => handleEditSection('photos')}>Add your first photo</button>
          </div>
        )}
      </div>
    </div>
  );
}
