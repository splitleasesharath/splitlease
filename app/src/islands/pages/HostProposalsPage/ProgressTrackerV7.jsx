/**
 * ProgressTrackerV7 Component (V7 Design)
 *
 * Horizontal progress steps for accepted proposals:
 * - Steps: Submitted → Reviewed → Accepted → Application → Lease → Active
 * - Completed steps: dark purple dot + line
 * - Current step: larger dot with shadow
 * - Future steps: gray dot + line
 *
 * Part of the Host Proposals V7 redesign.
 */
import React from 'react';

const PROGRESS_STEPS = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'application', label: 'Application' },
  { key: 'lease', label: 'Lease' },
  { key: 'active', label: 'Active' }
];

/**
 * Get current progress step index based on proposal status
 * @param {Object} proposal - The proposal object
 * @returns {number} Step index (0-5)
 */
function getCurrentStepIndex(proposal) {
  const status = typeof proposal?.status === 'string'
    ? proposal.status
    : (proposal?.status?.id || proposal?.status?._id || '');

  // Map status to step index
  const statusToStep = {
    proposal_submitted: 0,
    host_review: 1,
    host_counteroffer: 1,
    accepted: 3, // Accepted, waiting for application
    lease_documents_sent: 4,
    lease_documents_signatures: 4,
    lease_signed: 4,
    payment_submitted: 5
  };

  return statusToStep[status] ?? 0;
}

/**
 * Check if progress tracker should be shown
 * Only for accepted proposals (status >= accepted)
 * @param {Object} proposal - The proposal object
 * @returns {boolean} True if should show
 */
function shouldShowProgress(proposal) {
  const status = typeof proposal?.status === 'string'
    ? proposal.status
    : (proposal?.status?.id || proposal?.status?._id || '');

  const showStatuses = [
    'accepted',
    'lease_documents_sent',
    'lease_documents_signatures',
    'lease_signed',
    'payment_submitted'
  ];

  return showStatuses.includes(status);
}

/**
 * ProgressTrackerV7 displays the proposal progress
 *
 * @param {Object} props
 * @param {Object} props.proposal - The proposal object
 */
export function ProgressTrackerV7({ proposal }) {
  if (!shouldShowProgress(proposal)) {
    return null;
  }

  const currentStepIndex = getCurrentStepIndex(proposal);

  return (
    <div className="hp7-progress-row">
      {PROGRESS_STEPS.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isLast = index === PROGRESS_STEPS.length - 1;

        let stepClass = 'hp7-progress-step';
        if (isCompleted) stepClass += ' completed';
        if (isCurrent) stepClass += ' current';

        return (
          <div key={step.key} className={stepClass}>
            <div className="hp7-progress-dot" />
            <span className="hp7-progress-label">{step.label}</span>
            {!isLast && <div className="hp7-progress-line" />}
          </div>
        );
      })}
    </div>
  );
}

export default ProgressTrackerV7;
