/**
 * HeyGen Section Component
 * AI Tools Page - Deepfake Video Generation
 *
 * Three-column layout:
 * 1. Voice ID and Video ID configuration
 * 2. Script generation and video creation
 * 3. Generated videos list and attachment
 */

import PropTypes from 'prop-types';

export default function HeyGenSection({
  selectedHouseManual,
  deepfakes,
  deepfakeForm,
  deepfakeStatus,
  onFormChange,
  onGenerateScript,
  onGenerateVideo,
  onCheckStatus,
  onAttach,
}) {
  const isDisabled = !selectedHouseManual;

  return (
    <section className="tool-section heygen-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-icon heygen-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </span>
          HeyGen Deepfake
        </h2>
        <p className="section-description">Generate AI-powered welcome videos using HeyGen avatars</p>
      </div>

      {/* Status Message */}
      {(deepfakeStatus.error || deepfakeStatus.message) && (
        <div className={`status-message ${deepfakeStatus.error ? 'error' : 'success'}`}>
          {deepfakeStatus.error || deepfakeStatus.message}
        </div>
      )}

      <div className="section-grid heygen-grid">
        {/* Column 1: Configuration */}
        <div className="grid-column">
          <h3 className="column-title">Configuration</h3>

          <div className="form-group">
            <label htmlFor="heygen-video-id">Video/Avatar ID</label>
            <input
              type="text"
              id="heygen-video-id"
              className="text-input"
              placeholder="Enter HeyGen video ID..."
              value={deepfakeForm.videoId}
              onChange={(e) => onFormChange('videoId', e.target.value)}
              disabled={isDisabled}
            />
            <span className="field-hint">The HeyGen avatar template ID to use</span>
          </div>

          <div className="form-group">
            <label htmlFor="heygen-voice-id">Voice ID</label>
            <input
              type="text"
              id="heygen-voice-id"
              className="text-input"
              placeholder="Enter HeyGen voice ID..."
              value={deepfakeForm.voiceId}
              onChange={(e) => onFormChange('voiceId', e.target.value)}
              disabled={isDisabled}
            />
            <span className="field-hint">The HeyGen voice to use for text-to-speech</span>
          </div>
        </div>

        {/* Column 2: Script & Generation */}
        <div className="grid-column">
          <h3 className="column-title">Script & Video</h3>

          <div className="form-group">
            <label htmlFor="heygen-script">Script</label>
            <textarea
              id="heygen-script"
              className="textarea-input"
              placeholder="Enter or generate a script for the welcome video..."
              value={deepfakeForm.script}
              onChange={(e) => onFormChange('script', e.target.value)}
              disabled={isDisabled}
              rows={6}
            />
          </div>

          <div className="button-group">
            <button
              className="btn btn--secondary"
              onClick={onGenerateScript}
              disabled={isDisabled || deepfakeStatus.loading}
            >
              {deepfakeStatus.loading ? 'Generating...' : 'Generate Script'}
            </button>
            <button
              className="btn btn--primary"
              onClick={onGenerateVideo}
              disabled={isDisabled || !deepfakeForm.script || deepfakeStatus.loading}
            >
              {deepfakeStatus.loading ? 'Processing...' : 'Generate Video'}
            </button>
          </div>
        </div>

        {/* Column 3: Generated Videos */}
        <div className="grid-column">
          <h3 className="column-title">Generated Videos</h3>

          {deepfakes.length === 0 ? (
            <div className="empty-list">
              <p>No deepfake videos generated yet.</p>
              <p className="hint">Generate a script and create a video to see it here.</p>
            </div>
          ) : (
            <div className="items-list">
              {deepfakes.map((deepfake) => (
                <div key={deepfake.id} className={`item-card status-${deepfake.status}`}>
                  <div className="item-header">
                    <span className={`status-badge ${deepfake.status}`}>
                      {deepfake.status}
                    </span>
                    <span className="item-date">
                      {new Date(deepfake.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {deepfake.video_url && (
                    <div className="video-preview">
                      <a
                        href={deepfake.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="preview-link"
                      >
                        View Video
                      </a>
                    </div>
                  )}

                  {deepfake.script && (
                    <p className="item-script">{deepfake.script.slice(0, 100)}...</p>
                  )}

                  <div className="item-actions">
                    {deepfake.status === 'processing' && (
                      <button
                        className="btn btn--small btn--secondary"
                        onClick={() => onCheckStatus(deepfake)}
                        disabled={deepfakeStatus.loading}
                      >
                        Check Status
                      </button>
                    )}
                    {deepfake.status === 'completed' && !deepfake.attached_to_manual && (
                      <button
                        className="btn btn--small btn--primary"
                        onClick={() => onAttach(deepfake.id)}
                        disabled={deepfakeStatus.loading}
                      >
                        Attach to Manual
                      </button>
                    )}
                    {deepfake.attached_to_manual && (
                      <span className="attached-badge">Attached</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

HeyGenSection.propTypes = {
  selectedHouseManual: PropTypes.string,
  deepfakes: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string,
    script: PropTypes.string,
    video_url: PropTypes.string,
    attached_to_manual: PropTypes.bool,
    created_at: PropTypes.string,
  })),
  deepfakeForm: PropTypes.shape({
    videoId: PropTypes.string,
    voiceId: PropTypes.string,
    script: PropTypes.string,
  }),
  deepfakeStatus: PropTypes.shape({
    loading: PropTypes.bool,
    error: PropTypes.string,
    message: PropTypes.string,
  }),
  onFormChange: PropTypes.func.isRequired,
  onGenerateScript: PropTypes.func.isRequired,
  onGenerateVideo: PropTypes.func.isRequired,
  onCheckStatus: PropTypes.func.isRequired,
  onAttach: PropTypes.func.isRequired,
};

HeyGenSection.defaultProps = {
  selectedHouseManual: '',
  deepfakes: [],
  deepfakeForm: { videoId: '', voiceId: '', script: '' },
  deepfakeStatus: { loading: false, error: null, message: null },
};
