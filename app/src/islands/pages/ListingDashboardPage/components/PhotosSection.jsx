import { useState } from 'react';

// Icons
const StarIcon = ({ filled }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
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

export default function PhotosSection({ listing, onAddPhotos, onDeletePhoto, onSetCover }) {
  const photos = listing?.photos || [];

  return (
    <div className="listing-dashboard-section">
      {/* Section Header */}
      <div className="listing-dashboard-section__header">
        <h2 className="listing-dashboard-section__title">Photos</h2>
        <button
          className="listing-dashboard-section__add-btn"
          onClick={onAddPhotos}
        >
          Add Photos
        </button>
      </div>

      {/* Photos Grid */}
      <div className="listing-dashboard-photos__grid">
        {photos.map((photo, index) => (
          <div key={photo.id} className="listing-dashboard-photos__card">
            {/* Photo Image */}
            <div className="listing-dashboard-photos__image-container">
              <img
                src={photo.url}
                alt={photo.photoType || 'Listing photo'}
                className="listing-dashboard-photos__image"
              />

              {/* Cover Photo Badge */}
              {photo.isCover && (
                <div className="listing-dashboard-photos__cover-badge">
                  Cover Photo
                </div>
              )}

              {/* Action Buttons */}
              <div className="listing-dashboard-photos__actions">
                <button
                  className={`listing-dashboard-photos__star-btn ${photo.isCover ? 'listing-dashboard-photos__star-btn--active' : ''}`}
                  onClick={() => onSetCover?.(photo.id)}
                  title={photo.isCover ? 'Current cover photo' : 'Set as cover photo'}
                >
                  <StarIcon filled={photo.isCover} />
                </button>
                <button
                  className="listing-dashboard-photos__delete-btn"
                  onClick={() => onDeletePhoto?.(photo.id)}
                  title="Delete photo"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            {/* Photo Type Selector */}
            <div className="listing-dashboard-photos__type">
              <select
                value={photo.photoType || ''}
                onChange={(e) => {
                  // TODO: Handle photo type change
                  console.log('Photo type changed:', photo.id, e.target.value);
                }}
              >
                <option value="">Photo Type</option>
                {PHOTO_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {/* Empty state if no photos */}
        {photos.length === 0 && (
          <div className="listing-dashboard-photos__empty">
            <p>No photos uploaded yet.</p>
            <button onClick={onAddPhotos}>Add your first photo</button>
          </div>
        )}
      </div>
    </div>
  );
}
