/**
 * CoverPhotoEditor.jsx
 *
 * Cover photo section with edit overlay for editor view.
 * Shows default gradient when no image is set.
 */

import React, { useRef } from 'react';
import { Camera } from 'lucide-react';

export default function CoverPhotoEditor({
  imageUrl,
  editable = false,
  onChange
}) {
  const inputRef = useRef(null);

  const handleClick = () => {
    if (editable && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onChange) {
      onChange(file);
    }
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div
      className="cover-photo-container"
      onClick={handleClick}
      style={{ cursor: editable ? 'pointer' : 'default' }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="Cover photo"
          className="cover-photo"
        />
      ) : (
        <div className="cover-photo-default" />
      )}

      {editable && (
        <>
          <div className="cover-photo-overlay">
            <Camera size={24} />
            <span className="cover-photo-overlay-text">Click to change cover</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            aria-label="Upload cover photo"
          />
        </>
      )}
    </div>
  );
}
