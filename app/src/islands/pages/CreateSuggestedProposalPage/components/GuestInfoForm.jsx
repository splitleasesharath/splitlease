/**
 * GuestInfoForm - Step 3: Guest information fields
 */

import CallTranscriptionTool from './CallTranscriptionTool.jsx';

export default function GuestInfoForm({
  guestName,
  aboutMe,
  needForSpace,
  specialNeeds,
  onAboutMeChange,
  onNeedForSpaceChange,
  onSpecialNeedsChange,
  onTranscriptionParsed
}) {
  return (
    <section className="csp-step-section">
      <div className="csp-section-header">
        <h2>Step 3: Guest Information</h2>
      </div>

      {/* AI Transcription Tool */}
      <CallTranscriptionTool
        onParsedData={onTranscriptionParsed}
      />

      <div className="csp-user-info-form">
        <div className="csp-form-group">
          <label htmlFor="aboutMe">
            Tell us about <span className="csp-guest-name-placeholder">{guestName}</span>
          </label>
          <textarea
            id="aboutMe"
            className="csp-form-textarea"
            placeholder="About Me / Bio"
            rows="3"
            value={aboutMe}
            onChange={onAboutMeChange}
          />
        </div>

        <div className="csp-form-group">
          <label htmlFor="needForSpace">
            Why does <span className="csp-guest-name-placeholder">{guestName}</span> want this space?
          </label>
          <textarea
            id="needForSpace"
            className="csp-form-textarea"
            placeholder="Need for Space"
            rows="3"
            value={needForSpace}
            onChange={onNeedForSpaceChange}
          />
        </div>

        <div className="csp-form-group">
          <label htmlFor="specialNeeds">
            Write <span className="csp-guest-name-placeholder">{guestName}</span>&apos;s unique requirements
          </label>
          <textarea
            id="specialNeeds"
            className="csp-form-textarea"
            placeholder="Special needs"
            rows="3"
            value={specialNeeds}
            onChange={onSpecialNeedsChange}
          />
        </div>
      </div>
    </section>
  );
}
