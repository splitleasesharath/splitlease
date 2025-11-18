/**
 * Profile Completeness Component
 *
 * Displays profile completion percentage and tasks completed
 * Based on Bubble.io profile completeness tracking system
 * - Shows percentage bar
 * - Lists completed tasks
 * - Visual indicator when ≥80% (reminder workflow cancelled)
 */

export default function ProfileCompleteness({ percentage, tasksCompleted }) {
  const percentageValue = percentage || 0;
  const completionLevel = percentageValue >= 80 ? 'high' : percentageValue >= 50 ? 'medium' : 'low';

  return (
    <div className="profile-completeness">
      <div className="completeness-header">
        <h3>Profile Completeness</h3>
        <span className={`completeness-percentage completeness-${completionLevel}`}>
          {percentageValue}%
        </span>
      </div>

      <div className="completeness-bar-container">
        <div
          className={`completeness-bar completeness-bar-${completionLevel}`}
          style={{ width: `${percentageValue}%` }}
        />
      </div>

      {percentageValue >= 80 && (
        <div className="completeness-message success">
          ✓ Your profile is complete! Great job.
        </div>
      )}

      {percentageValue < 80 && (
        <div className="completeness-message">
          Complete your profile to increase your visibility to hosts
        </div>
      )}

      {tasksCompleted && tasksCompleted.length > 0 && (
        <div className="completed-tasks">
          <p className="tasks-label">Completed:</p>
          <div className="tasks-list">
            {tasksCompleted.map((task, index) => (
              <span key={index} className="task-badge">
                {task.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
