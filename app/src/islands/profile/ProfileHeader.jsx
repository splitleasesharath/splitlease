/**
 * Profile Header Component
 *
 * Displays user's profile photo, name, and photo upload functionality
 * Based on Bubble.io design:
 * - Profile Photo uploader (PU:Profile Picture Uploader)
 * - Name display (First, Last, Full)
 * - Awards 5% profile completeness on first photo upload
 */

import { useState } from 'react';

export default function ProfileHeader({ userData, onPhotoUpload }) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }

    setUploading(true);
    try {
      await onPhotoUpload(file);
    } catch (error) {
      alert('Error uploading photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const profilePhotoUrl = userData?.['Profile Photo'] || '/assets/images/default-avatar.png';
  const fullName = userData?.['Name - Full'] || `${userData?.['Name - First'] || ''} ${userData?.['Name - Last'] || ''}`.trim() || 'User';

  return (
    <div className="profile-header">
      <div className="profile-photo-container">
        <div className="profile-photo-wrapper">
          <img
            src={profilePhotoUrl}
            alt={fullName}
            className="profile-photo"
            onError={(e) => {
              e.target.src = '/assets/images/default-avatar.png';
            }}
          />
          {uploading && (
            <div className="photo-upload-overlay">
              <div className="spinner-small" />
            </div>
          )}
        </div>

        <label className="photo-upload-button" htmlFor="profile-photo-upload">
          {uploading ? 'Uploading...' : 'Change Photo'}
          <input
            id="profile-photo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <div className="profile-header-info">
        <h1 className="profile-name">{fullName}</h1>
        {userData?.['Type - User Signup'] && (
          <p className="profile-type">
            {userData['Type - User Signup']}
          </p>
        )}
      </div>
    </div>
  );
}
