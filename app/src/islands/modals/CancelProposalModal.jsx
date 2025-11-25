/**
 * CancelProposalModal Component
 *
 * Modal for confirming proposal cancellation with optional reason selection.
 * Following the Hollow Component pattern - all business logic handled by parent.
 */

import { useState } from 'react'
import { getCancellationReasonOptions } from '../../logic/index.js'

export default function CancelProposalModal({
  isOpen,
  proposal,
  buttonText = 'Cancel Proposal',
  onClose,
  onConfirm
}) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !proposal) {
    return null
  }

  const reasonOptions = getCancellationReasonOptions()
  const listingName = proposal._listing?.Name || proposal.listing?.name || 'this property'
  const isCounteroffer = buttonText.includes('Decline')

  async function handleConfirm() {
    try {
      setIsSubmitting(true)
      const reason = selectedReason === 'Other' ? customReason : selectedReason
      await onConfirm(reason)
    } catch (err) {
      console.error('[CancelProposalModal] Error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {isCounteroffer ? 'Decline Counteroffer' : 'Cancel Proposal'}
          </h2>
          <button
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <svg
                className="w-16 h-16 text-red-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
            </div>

            <p className="text-gray-600">
              {isCounteroffer
                ? `Are you sure you want to decline the host's counteroffer for ${listingName}?`
                : `Are you sure you want to cancel your proposal for ${listingName}?`}
            </p>
            <p className="text-red-600 text-sm mt-2 font-medium">
              This action cannot be undone.
            </p>
          </div>

          {/* Reason Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for {isCounteroffer ? 'declining' : 'cancellation'} (optional)
            </label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a reason...</option>
              {reasonOptions.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Reason Input */}
          {selectedReason === 'Other' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please specify
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your reason..."
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50 rounded-b-lg">
          <button
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Keep Proposal
          </button>
          <button
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}
