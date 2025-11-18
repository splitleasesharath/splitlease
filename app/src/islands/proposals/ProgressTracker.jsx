/**
 * ProgressTracker Component
 *
 * 6-stage proposal journey visualization
 * Shows current stage and completed stages with connected circles
 *
 * Stages:
 * 1. Proposal Submitted
 * 2. Rental App Submitted
 * 3. Host Review
 * 4. Review Documents
 * 5. Lease Documents
 * 6. Initial Payment
 */

export default function ProgressTracker({ status, proposalId, createdDate }) {
  const stages = [
    { id: 1, label: 'Proposal Submitted' },
    { id: 2, label: 'Rental App Submitted' },
    { id: 3, label: 'Host Review' },
    { id: 4, label: 'Review Documents' },
    { id: 5, label: 'Lease Documents' },
    { id: 6, label: 'Initial Payment' },
  ];

  // Map status to stage number
  function getCurrentStage(status) {
    if (!status) return 1;

    const statusMap = {
      'Proposal Submitted': 1,
      'Awaiting Host Review': 1,
      'Under Review': 1,
      'Rental App Submitted': 2,
      'Awaiting Rental Application': 2,
      'Host Review': 3,
      'Accepted': 3,
      'Drafting Lease Documents': 3,
      'Review Documents': 4,
      'Lease Documents Sent for Review': 4,
      'Lease Documents': 5,
      'Lease Documents Sent for Signatures': 5,
      'Initial Payment': 6,
      'Lease activated': 6,
      'Completed': 6,
    };

    return statusMap[status] || 1;
  }

  const currentStage = getCurrentStage(status);

  return (
    <div className="mt-6 pt-6">
      {/* Progress Bar - Matches screenshot with RED theme */}
      <div className="relative px-4">
        <div className="flex items-start justify-between">
          {stages.map((stage, index) => {
            const isCompleted = stage.id <= currentStage;
            const isCurrent = stage.id === currentStage;

            return (
              <div key={stage.id} className="flex flex-col items-center" style={{ flex: '0 0 auto', width: index < stages.length - 1 ? '16.666%' : 'auto' }}>
                {/* Circle */}
                <div className="relative z-10">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isCompleted ? 'bg-red-500' : 'bg-gray-300'
                    }`}
                  />
                </div>

                {/* Label below circle */}
                <div
                  className={`mt-2 text-[10px] text-center leading-tight max-w-[70px] ${
                    isCompleted ? 'text-red-500 font-medium' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </div>

                {/* Connecting Line */}
                {index < stages.length - 1 && (
                  <div
                    className={`absolute h-0.5 ${isCompleted ? 'bg-red-500' : 'bg-gray-300'}`}
                    style={{
                      top: '6px',
                      left: 'calc(50% + 10px)',
                      width: 'calc(16.666% - 12px)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
