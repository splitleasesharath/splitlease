/**
 * Jingle Section Component
 * AI Tools Page - Jingle Creation
 *
 * Four-column layout:
 * 1. House manual and visit selection (inherited)
 * 2. Lyrics generation and jingle creation
 * 3. Melody and content preferences
 * 4. Generated jingles list and attachment
 */

import PropTypes from 'prop-types';
import { MELODY_PREFERENCES, CONTENT_PREFERENCES } from '../types.js';

export default function JingleSection({
  selectedHouseManual,
  selectedVisit,
  jingles,
  melodyPreference,
  contentPreferences,
  jingleLyrics,
  jingleStatus,
  onMelodyPreferenceChange,
  onContentPreferenceToggle,
  onLyricsChange,
  onGenerateLyrics,
  onCreateJingle,
  onAttach,
}) {
  const isDisabled = !selectedHouseManual;

  return (
    <section className="tool-section jingle-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-icon jingle-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </span>
          Jingle Creator
        </h2>
        <p className="section-description">Create custom jingles with AI-generated lyrics and melodies</p>
      </div>

      {/* Status Message */}
      {(jingleStatus.error || jingleStatus.message) && (
        <div className={`status-message ${jingleStatus.error ? 'error' : 'success'}`}>
          {jingleStatus.error || jingleStatus.message}
        </div>
      )}

      <div className="section-grid jingle-grid">
        {/* Column 1: Preferences */}
        <div className="grid-column">
          <h3 className="column-title">Preferences</h3>

          <div className="form-group">
            <label htmlFor="melody-preference">Melody Style</label>
            <select
              id="melody-preference"
              className="select-input"
              value={melodyPreference}
              onChange={(e) => onMelodyPreferenceChange(e.target.value)}
              disabled={isDisabled}
            >
              {Object.entries(MELODY_PREFERENCES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Content to Include</label>
            <div className="checkbox-group">
              {Object.entries(CONTENT_PREFERENCES).map(([key, label]) => (
                <label key={key} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={contentPreferences.includes(key)}
                    onChange={() => onContentPreferenceToggle(key)}
                    disabled={isDisabled}
                  />
                  <span className="checkbox-text">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Lyrics & Generation */}
        <div className="grid-column">
          <h3 className="column-title">Lyrics & Generation</h3>

          <div className="form-group">
            <label htmlFor="jingle-lyrics">Jingle Lyrics</label>
            <textarea
              id="jingle-lyrics"
              className="textarea-input"
              placeholder="Enter or generate lyrics for your jingle..."
              value={jingleLyrics}
              onChange={(e) => onLyricsChange(e.target.value)}
              disabled={isDisabled}
              rows={8}
            />
            <span className="field-hint">
              Structure: Verse 1, Chorus, Verse 2, Chorus, Outro
            </span>
          </div>

          <div className="button-group">
            <button
              className="btn btn--secondary"
              onClick={onGenerateLyrics}
              disabled={isDisabled || jingleStatus.loading}
            >
              {jingleStatus.loading ? 'Generating...' : 'Generate Lyrics'}
            </button>
            <button
              className="btn btn--primary"
              onClick={onCreateJingle}
              disabled={isDisabled || !jingleLyrics || jingleStatus.loading}
            >
              {jingleStatus.loading ? 'Creating...' : 'Create Jingle'}
            </button>
          </div>
        </div>

        {/* Column 3: Generated Jingles */}
        <div className="grid-column">
          <h3 className="column-title">Generated Jingles</h3>

          {jingles.length === 0 ? (
            <div className="empty-list">
              <p>No jingles created yet.</p>
              <p className="hint">Set your preferences, generate lyrics, and create a jingle.</p>
            </div>
          ) : (
            <div className="items-list">
              {jingles.map((jingle) => (
                <div key={jingle._id} className="item-card">
                  <div className="item-header">
                    <span className="melody-badge">
                      {jingle['Melody Preferences'] || 'Custom'}
                    </span>
                    <span className="item-date">
                      {new Date(jingle['Created Date']).toLocaleDateString()}
                    </span>
                  </div>

                  {jingle['Narration/Jingle Audio'] && (
                    <div className="audio-preview">
                      <audio controls className="audio-player">
                        <source src={jingle['Narration/Jingle Audio']} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}

                  {jingle['Narration/Jingle Script'] && (
                    <details className="lyrics-details">
                      <summary>View Lyrics</summary>
                      <pre className="lyrics-text">
                        {jingle['Narration/Jingle Script']}
                      </pre>
                    </details>
                  )}

                  <div className="item-actions">
                    {!jingle['Jingle / Narration created?'] && (
                      <button
                        className="btn btn--small btn--primary"
                        onClick={() => onAttach(jingle._id)}
                        disabled={jingleStatus.loading}
                      >
                        Attach to Manual
                      </button>
                    )}
                    {jingle['Jingle / Narration created?'] && (
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

JingleSection.propTypes = {
  selectedHouseManual: PropTypes.string,
  selectedVisit: PropTypes.string,
  jingles: PropTypes.arrayOf(PropTypes.shape({
    _id: PropTypes.string.isRequired,
    'Melody Preferences': PropTypes.string,
    'Narration/Jingle Audio': PropTypes.string,
    'Narration/Jingle Script': PropTypes.string,
    'Created Date': PropTypes.string,
    'Jingle / Narration created?': PropTypes.bool,
  })),
  melodyPreference: PropTypes.string,
  contentPreferences: PropTypes.arrayOf(PropTypes.string),
  jingleLyrics: PropTypes.string,
  jingleStatus: PropTypes.shape({
    loading: PropTypes.bool,
    error: PropTypes.string,
    message: PropTypes.string,
  }),
  onMelodyPreferenceChange: PropTypes.func.isRequired,
  onContentPreferenceToggle: PropTypes.func.isRequired,
  onLyricsChange: PropTypes.func.isRequired,
  onGenerateLyrics: PropTypes.func.isRequired,
  onCreateJingle: PropTypes.func.isRequired,
  onAttach: PropTypes.func.isRequired,
};

JingleSection.defaultProps = {
  selectedHouseManual: '',
  selectedVisit: '',
  jingles: [],
  melodyPreference: 'optimistic-commercial',
  contentPreferences: ['host-name', 'house-rules'],
  jingleLyrics: '',
  jingleStatus: { loading: false, error: null, message: null },
};
