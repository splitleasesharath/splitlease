/**
 * VideoIntroCard.jsx
 *
 * Video introduction card.
 * Editor view: Upload dropzone (placeholder)
 * Public view: Video player (placeholder)
 */

import React from 'react';
import ProfileCard from '../shared/ProfileCard.jsx';
import { Video, Upload } from 'lucide-react';

export default function VideoIntroCard({
  videoUrl,
  onUpload,
  readOnly = false
}) {
  if (readOnly) {
    return (
      <ProfileCard title="Video Introduction">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            style={{
              width: '100%',
              borderRadius: '8px',
              maxHeight: '300px',
              backgroundColor: '#000'
            }}
          >
            Your browser does not support the video tag.
          </video>
        ) : (
          <p style={{ color: 'var(--sl-text-tertiary)', fontSize: '14px' }}>
            No video introduction available
          </p>
        )}
      </ProfileCard>
    );
  }

  return (
    <ProfileCard title="Video Introduction">
      <p style={{ fontSize: '14px', color: 'var(--sl-text-secondary)', marginBottom: '16px' }}>
        Add a short video to introduce yourself to potential hosts. This helps build trust!
      </p>

      {videoUrl ? (
        <div style={{ marginBottom: '16px' }}>
          <video
            src={videoUrl}
            controls
            style={{
              width: '100%',
              borderRadius: '8px',
              maxHeight: '300px',
              backgroundColor: '#000'
            }}
          >
            Your browser does not support the video tag.
          </video>
          <button
            type="button"
            className="verification-btn verification-btn--secondary"
            style={{ marginTop: '12px' }}
            onClick={onUpload}
          >
            Replace Video
          </button>
        </div>
      ) : (
        <div
          className="video-upload-dropzone"
          onClick={onUpload}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onUpload?.();
            }
          }}
        >
          <Video className="video-upload-icon" size={48} />
          <p className="video-upload-text">Click to upload a video</p>
          <p className="video-upload-hint">MP4, MOV up to 50MB, 2 minutes max</p>
        </div>
      )}
    </ProfileCard>
  );
}
