import React, { useState, useRef } from 'react';
import type { Photos, PhotoData } from '../types/listing.types';

interface Section6Props {
  data: Photos;
  onChange: (data: Photos) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Section6Photos: React.FC<Section6Props> = ({ data, onChange, onNext, onBack }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newPhotos: PhotoData[] = [];
    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const photoData: PhotoData = {
            id: `photo-${Date.now()}-${index}`,
            url: e.target?.result as string,
            file: file,
            displayOrder: data.photos.length + index
          };
          newPhotos.push(photoData);

          // Update when all files are processed
          if (newPhotos.length === files.length) {
            onChange({
              ...data,
              photos: [...data.photos, ...newPhotos]
            });
            setErrors({});
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removePhoto = (id: string) => {
    const updated = data.photos.filter((photo) => photo.id !== id);
    // Reorder display orders
    updated.forEach((photo, index) => {
      photo.displayOrder = index;
    });
    onChange({ ...data, photos: updated });
  };

  const movePhoto = (id: string, direction: 'up' | 'down') => {
    const currentIndex = data.photos.findIndex((p) => p.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= data.photos.length) return;

    const updated = [...data.photos];
    [updated[currentIndex], updated[newIndex]] = [updated[newIndex], updated[currentIndex]];

    // Update display orders
    updated.forEach((photo, index) => {
      photo.displayOrder = index;
    });

    onChange({ ...data, photos: updated });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...data.photos];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    // Update display orders
    updated.forEach((photo, index) => {
      photo.displayOrder = index;
    });

    onChange({ ...data, photos: updated });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (data.photos.length < data.minRequired) {
      newErrors.photos = `Please upload at least ${data.minRequired} photos`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const openMobileUpload = () => {
    // This would typically trigger a QR code or deep link to continue on mobile
    alert('Mobile upload feature would open here with a QR code or deep link');
  };

  return (
    <div className="section-container photos-section">
      <h2 className="section-title">Photos</h2>
      <p className="section-subtitle">Add photos of your property (minimum {data.minRequired} required)</p>

      {/* Photo Upload Area */}
      <div className="upload-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <button
            type="button"
            className="btn-upload"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Photos
          </button>

          <button type="button" className="btn-secondary" onClick={openMobileUpload}>
            Do you want to continue on mobile?
          </button>
        </div>

        {errors.photos && <div className="error-message">{errors.photos}</div>}

        <p className="upload-info">
          Please submit at least {data.minRequired} photos. Supported formats: JPG, PNG, HEIC
        </p>
      </div>

      {/* Photo Gallery */}
      {data.photos.length > 0 && (
        <div className="photo-gallery">
          <h3>Uploaded Photos ({data.photos.length})</h3>
          <p className="drag-drop-hint">💡 Drag and drop photos to reorder. First photo is the cover photo.</p>
          <div className="photo-grid">
            {data.photos.map((photo, index) => (
              <div
                key={photo.id}
                className={`photo-item ${draggedIndex === index ? 'dragging' : ''} ${
                  dragOverIndex === index ? 'drag-over' : ''
                }`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <img src={photo.url} alt={`Property photo ${index + 1}`} />
                <div className="photo-controls">
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="btn-delete"
                    title="Remove photo"
                  >
                    🗑️
                  </button>
                </div>
                {index === 0 && <div className="photo-badge">Cover Photo</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="photo-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${Math.min(100, (data.photos.length / data.minRequired) * 100)}%`
            }}
          />
        </div>
        <p>
          {data.photos.length} of {data.minRequired} minimum photos uploaded
          {data.photos.length >= data.minRequired && ' ✓'}
        </p>
      </div>

      {/* Navigation */}
      <div className="section-navigation">
        <button type="button" className="btn-back" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn-next"
          onClick={handleNext}
          disabled={data.photos.length < data.minRequired}
        >
          Next
        </button>
      </div>
    </div>
  );
};
