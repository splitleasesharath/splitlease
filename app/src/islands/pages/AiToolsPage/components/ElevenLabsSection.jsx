/**
 * ElevenLabs Section Component
 * AI Tools Page - Voice-over Narration Generation
 *
 * Two-column layout:
 * 1. Narrator selection and script generation
 * 2. Generated narrations list and attachment
 */

import PropTypes from 'prop-types';

export default function ElevenLabsSection({
  selectedHouseManual,
  selectedVisit,
  narrations,
  narrators,
  selectedNarrator,
  narrationScript,
  narrationStatus,
  onNarratorSelect,
  onScriptChange,
  onGenerateScript,
  onGenerateNarration,
  onAttach,
}) {
  const isDisabled = !selectedHouseManual;

  return (
    <section className="tool-section elevenlabs-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-icon elevenlabs-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </span>
          ElevenLabs Narration
        </h2>
        <p className="section-description">Generate professional voice-over narrations for house manuals</p>
      </div>

      {/* Status Message */}
      {(narrationStatus.error || narrationStatus.message) && (
        <div className={`status-message ${narrationStatus.error ? 'error' : 'success'}`}>
          {narrationStatus.error || narrationStatus.message}
        </div>
      )}

      <div className="section-grid elevenlabs-grid">
        {/* Column 1: Narrator & Script */}
        <div className="grid-column">
          <h3 className="column-title">Narrator & Script</h3>

          <div className="form-group">
            <label htmlFor="narrator-select">Select Narrator</label>
            <select
              id="narrator-select"
              className="select-input"
              value={selectedNarrator}
              onChange={(e) => onNarratorSelect(e.target.value)}
              disabled={isDisabled}
            >
              <option value="">Choose a narrator...</option>
              {narrators.map((narrator) => (
                <option key={narrator.id} value={narrator.id}>
                  {narrator.name} - {narrator.description}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="narration-script">Narration Script</label>
            <textarea
              id="narration-script"
              className="textarea-input"
              placeholder="Enter or generate a script for the narration..."
              value={narrationScript}
              onChange={(e) => onScriptChange(e.target.value)}
              disabled={isDisabled}
              rows={8}
            />
            <span className="field-hint">
              Tip: Include pauses with "..." and emphasis with CAPS for better narration.
            </span>
          </div>

          <div className="button-group">
            <button
              className="btn btn--secondary"
              onClick={onGenerateScript}
              disabled={isDisabled || narrationStatus.loading}
            >
              {narrationStatus.loading ? 'Generating...' : 'Generate Script'}
            </button>
            <button
              className="btn btn--primary"
              onClick={onGenerateNarration}
              disabled={isDisabled || !narrationScript || !selectedNarrator || narrationStatus.loading}
            >
              {narrationStatus.loading ? 'Processing...' : 'Generate Narration'}
            </button>
          </div>
        </div>

        {/* Column 2: Generated Narrations */}
        <div className="grid-column">
          <h3 className="column-title">Generated Narrations</h3>

          {narrations.length === 0 ? (
            <div className="empty-list">
              <p>No narrations generated yet.</p>
              <p className="hint">Select a narrator, generate a script, and create a narration.</p>
            </div>
          ) : (
            <div className="items-list">
              {narrations.map((narration) => (
                <div key={narration._id} className="item-card">
                  <div className="item-header">
                    <span className="narrator-name">
                      {narration['Narrator data'] || 'Unknown Narrator'}
                    </span>
                    <span className="item-date">
                      {new Date(narration['Created Date']).toLocaleDateString()}
                    </span>
                  </div>

                  {narration['Narration/Jingle Audio'] && (
                    <div className="audio-preview">
                      <audio controls className="audio-player">
                        <source src={narration['Narration/Jingle Audio']} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {narration['Narration/Jingle Script'] && (
                    <p className="item-script">
                      {narration['Narration/Jingle Script'].slice(0, 150)}...
                    </p>
                  )}

                  <div className="item-actions">
                    {selectedVisit && !narration.Visit && (
                      <button
                        className="btn btn--small btn--primary"
                        onClick={() => onAttach(narration._id)}
                        disabled={narrationStatus.loading}
                      >
                        Attach to Visit
                      </button>
                    )}
                    {narration.Visit && (
                      <span className="attached-badge">Attached to Visit</span>
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

ElevenLabsSection.propTypes = {
  selectedHouseManual: PropTypes.string,
  selectedVisit: PropTypes.string,
  narrations: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string.isRequired,
    'Narrator data': PropTypes.string,
    'Narration/Jingle Audio': PropTypes.string,
    'Narration/Jingle Script': PropTypes.string,
    'Created Date': PropTypes.string,
    Visit: PropTypes.string,
  })),
  narrators: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
  })),
  selectedNarrator: PropTypes.string,
  narrationScript: PropTypes.string,
  narrationStatus: PropTypes.shape({
    loading: PropTypes.bool,
    error: PropTypes.string,
    message: PropTypes.string,
  }),
  onNarratorSelect: PropTypes.func.isRequired,
  onScriptChange: PropTypes.func.isRequired,
  onGenerateScript: PropTypes.func.isRequired,
  onGenerateNarration: PropTypes.func.isRequired,
  onAttach: PropTypes.func.isRequired,
};

ElevenLabsSection.defaultProps = {
  selectedHouseManual: '',
  selectedVisit: '',
  narrations: [],
  narrators: [],
  selectedNarrator: '',
  narrationScript: '',
  narrationStatus: { loading: false, error: null, message: null },
};
