/**
 * UserDetailsSection - Collect user information for proposal
 */

export default function UserDetailsSection({ data, updateData }) {
  return (
    <div className="section user-details-section">
      <div className="form-group">
        <label htmlFor="needForSpace" className="form-label">
          Why do you want this space?
        </label>
        <textarea
          id="needForSpace"
          className="form-textarea"
          placeholder="How will you use the space? (minimum of 10 words)"
          value={data.needForSpace}
          onChange={(e) => updateData('needForSpace', e.target.value)}
          rows={4}
        />
      </div>

      <div className="form-group">
        <label htmlFor="aboutYourself" className="form-label">
          Tell us about yourself
        </label>
        <textarea
          id="aboutYourself"
          className="form-textarea"
          placeholder="Please take a moment to share some details about yourself, such as your interests, travel preferences, etc. (minimum of 10 words)"
          value={data.aboutYourself}
          onChange={(e) => updateData('aboutYourself', e.target.value)}
          rows={4}
        />
      </div>

      <div className="form-group" style={{ marginBottom: data.hasUniqueRequirements ? '25px' : '0' }}>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={data.hasUniqueRequirements}
            onChange={(e) => updateData('hasUniqueRequirements', e.target.checked)}
          />
          <span style={{ marginLeft: '8px' }}>Do you have any unique requirements?</span>
        </label>
      </div>

      {data.hasUniqueRequirements && (
        <div className="form-group" style={{ marginBottom: '0' }}>
          <label htmlFor="uniqueRequirements" className="form-label">
            Write your unique requirements
          </label>
          <textarea
            id="uniqueRequirements"
            className="form-textarea"
            placeholder="Any special needs, personal preference or specific requirements you may have (minimum of 10 words)"
            value={data.uniqueRequirements}
            onChange={(e) => updateData('uniqueRequirements', e.target.value)}
            rows={4}
          />
        </div>
      )}
    </div>
  );
}
