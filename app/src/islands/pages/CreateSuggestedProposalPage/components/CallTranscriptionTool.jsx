/**
 * CallTranscriptionTool - AI-powered call transcription parser
 *
 * Allows agents to paste call notes/transcriptions and use AI to
 * automatically extract guest profile information (aboutMe, needForSpace, specialNeeds).
 */

import { useState } from 'react';

export default function CallTranscriptionTool({
  onParsedData,
  isDisabled = false
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState(null);

  const handleToggle = () => {
    if (!isDisabled) {
      setIsExpanded(!isExpanded);
      setError(null);
    }
  };

  const handleTranscriptionChange = (e) => {
    setTranscription(e.target.value);
    setError(null);
  };

  const handleParse = async () => {
    if (!transcription.trim() || isParsing) return;

    setIsParsing(true);
    setError(null);

    try {
      // Dynamic import to avoid circular dependencies
      const { parseCallTranscription } = await import('../suggestedProposalService.js');
      const { data, error: parseError } = await parseCallTranscription(transcription);

      if (parseError) {
        setError(parseError);
        return;
      }

      if (data) {
        onParsedData(data);
        setTranscription('');
        setIsExpanded(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to parse transcription');
    } finally {
      setIsParsing(false);
    }
  };

  const handleClear = () => {
    setTranscription('');
    setError(null);
  };

  return (
    <div className="csp-transcription-tool">
      <button
        type="button"
        className={`csp-transcription-toggle ${isExpanded ? 'expanded' : ''} ${isDisabled ? 'disabled' : ''}`}
        onClick={handleToggle}
        disabled={isDisabled}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
        <span>AI: Parse Call Transcription</span>
        <svg
          className={`csp-transcription-chevron ${isExpanded ? 'rotated' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isExpanded && (
        <div className="csp-transcription-panel">
          <p className="csp-transcription-hint">
            Paste your call notes or transcription below. AI will extract the guest&apos;s bio,
            need for space, and special requirements.
          </p>

          <textarea
            className="csp-form-textarea csp-transcription-textarea"
            placeholder="Paste call transcription or notes here...

Example:
'Spoke with Sarah today. She's a traveling nurse from Chicago looking for a place in Brooklyn for 3 months starting mid-January. She works night shifts at a nearby hospital. Needs a quiet place to sleep during the day. Has a small dog named Max (very well-behaved). Budget is around $1800/month. Prefers her own bathroom if possible.'"
            rows="6"
            value={transcription}
            onChange={handleTranscriptionChange}
            disabled={isParsing}
          />

          {error && (
            <div className="csp-transcription-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div className="csp-transcription-actions">
            <button
              type="button"
              className="csp-btn csp-btn-secondary csp-btn-small"
              onClick={handleClear}
              disabled={isParsing || !transcription.trim()}
            >
              Clear
            </button>
            <button
              type="button"
              className="csp-btn csp-btn-primary csp-btn-small"
              onClick={handleParse}
              disabled={isParsing || !transcription.trim()}
            >
              {isParsing ? (
                <>
                  <span className="csp-btn-spinner" />
                  Parsing...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Extract with AI
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
