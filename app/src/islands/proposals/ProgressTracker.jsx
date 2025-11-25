/**
 * ProgressTracker Component
 *
 * 6-stage proposal journey visualization
 * Shows current stage and completed stages with connected circles
 *
 * Stages:
 * 1. Proposal Sent (Draft, Pending)
 * 2. Host Countered (Host Countered)
 * 3. Virtual Meeting Scheduled (VM Requested, VM Confirmed)
 * 4. Accepted (Accepted, Verified)
 * 5. Completed (Completed)
 * 6. Cancelled (Cancelled by Guest, Cancelled by Host, Rejected, Expired)
 *
 * Uses Logic Core determineProposalStage rule for consistent status mapping.
 */

import { determineProposalStage } from '../../logic/index.js'

export default function ProgressTracker({ status, proposalId, createdDate }) {
  const stages = [
    { id: 1, label: 'Proposal Sent' },
    { id: 2, label: 'Host Countered' },
    { id: 3, label: 'Virtual Meeting' },
    { id: 4, label: 'Accepted' },
    { id: 5, label: 'Completed' },
    { id: 6, label: 'Cancelled' },
  ]

  /**
   * Get current stage using Logic Core rule.
   * Falls back to local mapping if Logic Core throws.
   */
  function getCurrentStage(status) {
    if (!status) return 1

    try {
      // Use Logic Core rule for consistent status mapping
      return determineProposalStage({
        proposalStatus: status,
        deleted: false
      })
    } catch (err) {
      // Fallback: Local status mapping
      console.warn('⚠️ Logic Core stage determination failed, using fallback:', err.message)

      const statusMap = {
        // Stage 1: Proposal Sent
        'Proposal Submitted': 1,
        'Awaiting Host Review': 1,
        'Under Review': 1,
        Draft: 1,
        Pending: 1,

        // Stage 2: Host Countered
        'Host Countered': 2,
        'Host Counteroffer Submitted': 2,
        'Rental App Submitted': 2,
        'Awaiting Rental Application': 2,

        // Stage 3: Virtual Meeting
        'VM Requested': 3,
        'VM Confirmed': 3,
        'Host Review': 3,

        // Stage 4: Accepted
        Accepted: 4,
        Verified: 4,
        'Review Documents': 4,
        'Lease Documents Sent for Review': 4,
        'Drafting Lease Documents': 4,

        // Stage 5: Completed
        Completed: 5,
        'Lease Documents': 5,
        'Lease Documents Sent for Signatures': 5,
        'Initial Payment': 5,
        'Lease activated': 5,

        // Stage 6: Cancelled/Rejected
        'Cancelled by Guest': 6,
        'Cancelled by Host': 6,
        Rejected: 6,
        Expired: 6,
      }

      return statusMap[status] || 1
    }
  }

  const currentStage = getCurrentStage(status)

  // For cancelled/rejected proposals, show different visual treatment
  const isCancelledOrRejected = currentStage === 6

  return (
    <div className="mt-6 pt-6">
      {/* Progress Bar */}
      <div className="relative px-4">
        <div className="flex items-start justify-between">
          {stages.map((stage, index) => {
            // For cancelled proposals, only show stages 1-5 as incomplete
            // and stage 6 as the current (cancelled) state
            const isCompleted = isCancelledOrRejected
              ? stage.id === 6
              : stage.id <= currentStage
            const isCurrent = stage.id === currentStage

            // Skip rendering cancelled stage for non-cancelled proposals
            if (stage.id === 6 && !isCancelledOrRejected) {
              return null
            }

            // For cancelled proposals, show all prior stages as incomplete
            if (isCancelledOrRejected && stage.id < 6) {
              return (
                <div
                  key={stage.id}
                  className="flex flex-col items-center"
                  style={{
                    flex: '0 0 auto',
                    width: index < 4 ? '20%' : 'auto',
                  }}
                >
                  {/* Circle - Gray for incomplete */}
                  <div className="relative z-10">
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                  </div>

                  {/* Label */}
                  <div className="mt-2 text-[10px] text-center leading-tight max-w-[70px] text-gray-400">
                    {stage.label}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={stage.id}
                className="flex flex-col items-center"
                style={{
                  flex: '0 0 auto',
                  width:
                    !isCancelledOrRejected && index < stages.length - 2
                      ? '20%'
                      : 'auto',
                }}
              >
                {/* Circle */}
                <div className="relative z-10">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isCancelledOrRejected && stage.id === 6
                        ? 'bg-red-500'
                        : isCompleted
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                    }`}
                  />
                </div>

                {/* Label below circle */}
                <div
                  className={`mt-2 text-[10px] text-center leading-tight max-w-[70px] ${
                    isCancelledOrRejected && stage.id === 6
                      ? 'text-red-500 font-medium'
                      : isCompleted
                        ? 'text-green-500 font-medium'
                        : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </div>

                {/* Connecting Line */}
                {index < stages.length - 1 && !isCancelledOrRejected && (
                  <div
                    className={`absolute h-0.5 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}
                    style={{
                      top: '6px',
                      left: 'calc(50% + 10px)',
                      width: 'calc(20% - 12px)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
