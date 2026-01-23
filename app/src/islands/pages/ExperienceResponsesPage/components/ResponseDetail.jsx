/**
 * ResponseDetail - Detailed view of a selected survey response (right panel)
 *
 * Displays all 10 survey fields from the experiencesurvey table.
 *
 * Props:
 * - response: Full response object or null
 */

export default function ResponseDetail({ response }) {
  if (!response) {
    return (
      <div className="er-detail er-detail--empty">
        <div className="er-detail-placeholder">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <p>Select a response to view details</p>
        </div>
      </div>
    );
  }

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  // Define all survey questions with their corresponding data keys
  const surveyQuestions = [
    {
      question: 'How was your overall experience?',
      key: 'experience',
    },
    {
      question: 'What challenges did you face before using Split Lease?',
      key: 'challenge',
    },
    {
      question: 'How did those challenges make you feel?',
      key: 'challengeExperience',
    },
    {
      question: 'What has changed since using Split Lease?',
      key: 'change',
    },
    {
      question: 'What was most memorable about our service?',
      key: 'service',
    },
    {
      question: 'What additional services would you like to see?',
      key: 'additionalService',
    },
  ];

  return (
    <div className="er-detail">
      {/* Header */}
      <div className="er-detail-header">
        <div className="er-detail-identity">
          <h2 className="er-detail-name">{response.name || 'Anonymous'}</h2>
          <span
            className={`er-detail-type er-detail-type--${response.type?.toLowerCase() || 'unknown'}`}
          >
            {response.type || 'Unknown'}
          </span>
        </div>
        <div className="er-detail-date">{formatDate(response.date)}</div>
      </div>

      {/* Survey Responses */}
      <div className="er-detail-content">
        {/* Main Questions */}
        {surveyQuestions.map((item, index) => (
          <div key={index} className="er-detail-section">
            <h3 className="er-detail-question">{item.question}</h3>
            <p className="er-detail-answer">
              {response[item.key] || <em className="er-no-response">No response</em>}
            </p>
          </div>
        ))}

        {/* Permission to Share */}
        <div className="er-detail-section er-detail-section--inline">
          <h3 className="er-detail-question">Permission to share publicly?</h3>
          <span
            className={`er-detail-badge ${response.share ? 'er-detail-badge--yes' : 'er-detail-badge--no'}`}
          >
            {response.share ? 'Yes' : 'No'}
          </span>
        </div>

        {/* NPS Score */}
        <div className="er-detail-section er-detail-section--inline">
          <h3 className="er-detail-question">Would you recommend Split Lease?</h3>
          <div className="er-detail-nps">
            <span className="er-nps-score">{response.recommend ?? '—'}</span>
            <span className="er-nps-label">/ 10</span>
          </div>
        </div>

        {/* Staff Appreciation */}
        <div className="er-detail-section">
          <h3 className="er-detail-question">
            Any staff members you&apos;d like to recognize?
          </h3>
          <p className="er-detail-answer">
            {response.staff || <em className="er-no-response">No response</em>}
          </p>
        </div>

        {/* Follow-up Questions */}
        <div className="er-detail-section">
          <h3 className="er-detail-question">Any questions for us?</h3>
          <p className="er-detail-answer">
            {response.questions || <em className="er-no-response">No response</em>}
          </p>
        </div>
      </div>
    </div>
  );
}
