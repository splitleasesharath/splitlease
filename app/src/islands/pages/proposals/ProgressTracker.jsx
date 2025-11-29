/**
 * Progress Tracker Component
 *
 * Displays the 6-stage progress of a proposal from submission to lease activation.
 * Shows completed, current, and pending stages with visual indicators.
 */

export default function ProgressTracker({ stages, currentStage, statusConfig }) {
  if (!stages || stages.length === 0) {
    return null;
  }

  return (
    <div className="progress-tracker">
      <h4>Proposal Progress</h4>

      <div className="progress-stages">
        {stages.map((stage, index) => (
          <div key={stage.id} className="progress-stage">
            {/* Connector line (not for first stage) */}
            {index > 0 && (
              <div
                className={`stage-connector ${stage.isCompleted ? 'completed' : ''}`}
              />
            )}

            {/* Stage circle */}
            <div
              className={`stage-circle ${
                stage.isCompleted
                  ? 'completed'
                  : stage.isCurrent
                  ? 'current'
                  : ''
              }`}
            >
              {stage.isCompleted ? (
                <span>&#10003;</span>
              ) : (
                stage.icon
              )}
            </div>

            {/* Stage label */}
            <span className="stage-label">{stage.shortName}</span>
          </div>
        ))}
      </div>

      {/* Current status message */}
      {statusConfig && (
        <div className="progress-status-message" style={{ marginTop: '1rem', textAlign: 'center' }}>
          <span
            className={`status-badge status-${statusConfig.color}`}
            style={{
              backgroundColor:
                statusConfig.color === 'green' ? '#D1FAE5' :
                statusConfig.color === 'blue' ? '#DBEAFE' :
                statusConfig.color === 'yellow' ? '#FEF3C7' :
                statusConfig.color === 'red' ? '#FEE2E2' :
                '#F3F4F6',
              color:
                statusConfig.color === 'green' ? '#065F46' :
                statusConfig.color === 'blue' ? '#1E40AF' :
                statusConfig.color === 'yellow' ? '#92400E' :
                statusConfig.color === 'red' ? '#991B1B' :
                '#374151',
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            {statusConfig.label}
          </span>
        </div>
      )}
    </div>
  );
}
