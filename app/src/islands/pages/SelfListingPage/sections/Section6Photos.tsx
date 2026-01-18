import React, { useState, useRef, useCallback } from 'react';
import type { Photos, PhotoData } from '../types/listing.types';
import { supabase } from '../../../../lib/supabase.js';
import { deletePhoto as deleteFromStorage } from '../../../../lib/photoUpload.js';

const BUCKET_NAME = 'listing-photos';
const DRAFT_ID_KEY = 'selfListingDraftId';

interface Section6Props {
  data: Photos;
  onChange: (data: Photos) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * Get or generate a draft listing ID for photo uploads
 * This ID is used to organize photos in storage before final submission
 */
async function getOrCreateDraftId(): Promise<string> {
  // Check localStorage first
  let draftId = localStorage.getItem(DRAFT_ID_KEY);
  if (draftId) {
    return draftId;
  }

  // Generate a new Bubble-compatible ID via RPC
  const { data, error } = await supabase.rpc('generate_bubble_id');
  if (error || !data) {
    // Fallback to local ID if RPC fails
    draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  } else {
    draftId = data;
  }

  localStorage.setItem(DRAFT_ID_KEY, draftId);
  return draftId;
}

/**
 * Upload a single photo to Supabase Storage
 */
async function uploadPhotoToStorage(
  file: File,
  draftId: string,
  index: number
): Promise<{ url: string; storagePath: string }> {
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const timestamp = Date.now();
  const filename = `${index}_${timestamp}.${extension}`;
  const storagePath = `listings/${draftId}/${filename}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || `image/${extension}`
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    storagePath
  };
}

export const Section6Photos: React.FC<Section6Props> = ({
  data,
  onChange,
  onNext,
  onBack
}) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Scroll to first error field
  const scrollToFirstError = useCallback((errorKeys: string[]) => {
    if (errorKeys.length === 0) return;
    const firstErrorKey = errorKeys[0];
    const element = document.getElementById(firstErrorKey) ||
                   document.querySelector('.upload-area');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Filter valid image files
    const imageFiles = Array.from(files).filter((file: File) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    // Check file size (5MB limit)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = imageFiles.filter((file: File) => file.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      setErrors({
        photos: `${oversizedFiles.length} file(s) exceed the 5MB size limit. Please resize and try again.`
      });
      return;
    }

    setErrors({});
    setUploadingCount(imageFiles.length);

    try {
      const draftId = await getOrCreateDraftId();
      const startIndex = data.photos.length;
      const uploadedPhotos: PhotoData[] = [];

      // Upload files in parallel
      const uploadPromises = imageFiles.map(async (file: File, idx: number) => {
        const index = startIndex + idx;
        try {
          const { url, storagePath } = await uploadPhotoToStorage(file, draftId, index);
          return {
            id: `photo-${Date.now()}-${idx}`,
            url,
            storagePath,
            displayOrder: index,
            isUploading: false
          } as PhotoData;
        } catch (err) {
          console.error(`Failed to upload photo ${idx + 1}:`, err);
          return {
            id: `photo-${Date.now()}-${idx}`,
            url: '', // Empty URL indicates failure
            displayOrder: index,
            isUploading: false,
            uploadError: err instanceof Error ? err.message : 'Upload failed'
          } as PhotoData;
        }
      });

      const results = await Promise.all(uploadPromises);

      // Filter out failed uploads and add successful ones
      const successfulUploads = results.filter(p => p.url && !p.uploadError);
      const failedCount = results.length - successfulUploads.length;

      if (failedCount > 0) {
        setErrors({
          photos: `${failedCount} photo(s) failed to upload. Please try again.`
        });
      }

      if (successfulUploads.length > 0) {
        onChange({
          ...data,
          photos: [...data.photos, ...successfulUploads]
        });
      }
    } catch (err) {
      console.error('Photo upload error:', err);
      setErrors({
        photos: 'Failed to upload photos. Please try again.'
      });
    } finally {
      setUploadingCount(0);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = async (id: string) => {
    const photoToRemove = data.photos.find((photo) => photo.id === id);

    // Delete from Supabase storage if it has a storage path
    if (photoToRemove?.storagePath) {
      try {
        await deleteFromStorage(photoToRemove.storagePath);
        console.log('[Section6Photos] Deleted photo from storage:', photoToRemove.storagePath);
      } catch (err) {
        console.error('[Section6Photos] Failed to delete from storage:', err);
        // Continue with local removal even if storage delete fails
      }
    }

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

  const validateForm = (): string[] => {
    const newErrors: Record<string, string> = {};
    const errorOrder: string[] = [];

    if (data.photos.length < data.minRequired) {
      newErrors.photos = `Please upload at least ${data.minRequired} photos`;
      errorOrder.push('photos');
    }

    setErrors(newErrors);
    return errorOrder;
  };

  const handleNext = () => {
    // Don't allow proceeding while uploads are in progress
    if (uploadingCount > 0) {
      return;
    }

    const errorKeys = validateForm();
    if (errorKeys.length > 0) {
      scrollToFirstError(errorKeys);
      return;
    }

    // Photos are already uploaded to Supabase Storage
    onNext();
  };

  const isUploading = uploadingCount > 0;

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
          disabled={isUploading}
          style={{ display: 'none' }}
        />
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <button
            type="button"
            className="btn-upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? `Uploading ${uploadingCount} photo(s)...` : 'Upload Photos'}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={openMobileUpload}
            disabled={isUploading}
          >
            Do you want to continue on mobile?
          </button>
        </div>

        {isUploading && (
          <div className="upload-progress-indicator" style={{ marginTop: '12px', color: '#5B21B6' }}>
            Uploading photos to server...
          </div>
        )}

        {errors.photos && <div className="error-message">{errors.photos}</div>}

        <p className="upload-info">
          Please submit at least {data.minRequired} photos. Supported formats: JPG, PNG, HEIC. Max 5MB per photo.
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
        <button type="button" className="btn-back" onClick={onBack} disabled={isUploading}>
          Back
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            className="btn-skip"
            onClick={onNext}
            disabled={isUploading}
          >
            Skip for Now
          </button>
          <button
            type="button"
            className="btn-next"
            onClick={handleNext}
            disabled={data.photos.length < data.minRequired || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};
