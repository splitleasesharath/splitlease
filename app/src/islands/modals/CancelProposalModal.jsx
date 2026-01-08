/**
 * CancelProposalModal Component
 *
 * Unified modal for confirming proposal cancellation/rejection with reason selection.
 * Supports both guest cancellation and host rejection flows via userType prop.
 * Following the Hollow Component pattern - all business logic handled by parent.
 */

import { useState } from 'react'
import { getGuestCancellationReasons, getHostRejectionReasons } from '../../lib/dataLookups.js'

// Fallback reasons if cache is empty
const GUEST_FALLBACK_REASONS = [
  'Found another property',
  'Changed move-in dates',
  'Changed budget',
  'Changed location preference',
  'No longer need housing',
  'Host not responsive',
  'Terms not acceptable',
  'Other'
]

const HOST_FALLBACK_REASONS = [
  'Already have another guest',
  'Decided to change the price of my listing for that time frame',
  'Want a different schedule',
  'Other / Do not want to say'
]

/**
 * Get reason options based on user type
 * @param {'guest' | 'host'} userType
 * @returns {Array<{id: string, label: string}>}
 */
function getReasonOptions(userType) {
  if (userType === 'host') {
    const cached = getHostRejectionReasons()
    if (cached.length > 0) {
      return cached.map(r => ({ id: String(r.id), label: r.reason }))
    }
    return HOST_FALLBACK_REASONS.map((r, i) => ({ id: `fallback_${i}`, label: r }))
  }

  // Default to guest
  const cached = getGuestCancellationReasons()
  if (cached.length > 0) {
    return cached.map(r => ({ id: String(r.id), label: r.reason }))
  }
  return GUEST_FALLBACK_REASONS.map((r, i) => ({ id: `fallback_${i}`, label: r }))
}

/**
 * Check if a reason is the "Other" option
 * @param {string} label
 * @returns {boolean}
 */
function isOtherReason(label) {
  const lowerLabel = label.toLowerCase()
  return lowerLabel === 'other' || lowerLabel.startsWith('other ')
}

export default function CancelProposalModal({
  isOpen,
  proposal,
  listing,
  userType = 'guest',
  buttonText,
  onClose,
  onConfirm
}) {
  const [selectedReasonId, setSelectedReasonId] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) {
    return null
  }

  const isHost = userType === 'host'
  const reasonOptions = getReasonOptions(userType)
  const selectedReason = reasonOptions.find(r => r.id === selectedReasonId)
  const showCustomInput = selectedReason && isOtherReason(selectedReason.label)

  // Determine listing/proposal info
  const listingData = listing || proposal?._listing || proposal?.listing
  const listingName = listingData?.Name || listingData?.name || 'this property'
  const guestName = proposal?.guestName || proposal?.guest?.name || 'this guest'

  // Determine button text based on context
  const defaultButtonText = isHost ? 'Reject Proposal' : 'Cancel Proposal'
  const finalButtonText = buttonText || defaultButtonText
  const isCounteroffer = finalButtonText.includes('Decline')

  // Determine modal title
  const getTitle = () => {
    if (isCounteroffer) return 'Decline Counteroffer'
    if (isHost) return 'Reject Proposal'
    return 'Cancel Proposal'
  }

  // Determine confirmation message
  const getConfirmationMessage = () => {
    if (isCounteroffer) {
      return `Are you sure you want to decline the host's counteroffer for ${listingName}?`
    }
    if (isHost) {
      return <>Are you sure you want to reject this proposal from <strong>{guestName}</strong>?</>
    }
    return `Are you sure you want to cancel your proposal for ${listingName}?`
  }

  async function handleConfirm() {
    try {
      setIsSubmitting(true)

      // Build the reason string
      let reason = selectedReason?.label || ''
      if (showCustomInput && customReason.trim()) {
        reason = customReason.trim()
      } else if (customReason.trim()) {
        // Append additional details if provided (even for non-Other selections)
        reason = `${reason}: ${customReason.trim()}`
      }

      await onConfirm(reason || undefined)
    } catch (err) {
      console.error('[CancelProposalModal] Error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    setSelectedReasonId('')
    setCustomReason('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with inline icon */}
        <div className="flex items-start justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 7L5 7M14 11V17M10 11V17M5 7L6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19L19 7M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {getTitle()}?
              </h2>
              <p className="text-xs text-red-600">
                This action is irreversible
              </p>
            </div>
          </div>
          <button
            className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
            onClick={handleClose}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          {/* Confirmation Message */}
          <p className="text-sm text-gray-600 mb-4 text-center">
            {getConfirmationMessage()}
          </p>

          {/* Reason Selection - Simple Radio List */}
          <div className="space-y-2">
            {reasonOptions.map((reason) => (
              <label
                key={reason.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 py-1 px-1 rounded"
              >
                <input
                  type="radio"
                  name="cancellationReason"
                  value={reason.id}
                  checked={selectedReasonId === reason.id}
                  onChange={(e) => setSelectedReasonId(e.target.value)}
                  className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">{reason.label}</span>
              </label>
            ))}
          </div>

          {/* Custom Reason Input - Only show when "Other" is selected */}
          {showCustomInput && (
            <div className="mt-3">
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={2}
                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Please specify your reason..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t">
          <button
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm font-medium"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-colors disabled:opacity-50 text-sm font-medium"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : (isHost ? 'Yes, Reject' : 'Yes, Cancel')}
          </button>
        </div>
      </div>
    </div>
  )
}
