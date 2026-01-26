/**
 * CancelProposalModal Component - v3.0 PROTOCOL REDESIGN
 *
 * Unified modal for confirming proposal cancellation/rejection with reason selection.
 * Supports both guest cancellation and host rejection flows via userType prop.
 * Following the Hollow Component pattern - all business logic handled by parent.
 *
 * Design: POPUP_REPLICATION_PROTOCOL - Monochromatic purple, pill buttons, mobile bottom sheet
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle } from 'lucide-react'
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

  const modalContent = (
    <div className="protocol-overlay" onClick={handleClose}>
      <div className="protocol-modal" onClick={(e) => e.stopPropagation()}>
        {/* Mobile Grab Handle */}
        <div className="protocol-grab-handle" />

        {/* Header */}
        <div className="protocol-header">
          <div className="protocol-header-left">
            <AlertTriangle
              size={24}
              strokeWidth={2}
              color="var(--protocol-danger)"
              aria-hidden="true"
            />
            <div>
              <h2 className="protocol-title">{getTitle()}</h2>
              <p className="cancel-modal-subtitle">This action is irreversible</p>
            </div>
          </div>
          <button
            className="protocol-close-btn"
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="protocol-body">
          <p className="cancel-modal-message">{getConfirmationMessage()}</p>

          {/* Reason Selection */}
          <div className="protocol-radio-group">
            {reasonOptions.map((reason) => (
              <label
                key={reason.id}
                className={`protocol-radio-option ${selectedReasonId === reason.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="cancellationReason"
                  value={reason.id}
                  checked={selectedReasonId === reason.id}
                  onChange={(e) => setSelectedReasonId(e.target.value)}
                />
                <span className="protocol-radio-label">{reason.label}</span>
              </label>
            ))}
          </div>

          {/* Custom Reason Input */}
          {showCustomInput && (
            <textarea
              className="cancel-modal-textarea"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={2}
              placeholder="Please specify your reason..."
            />
          )}
        </div>

        {/* Footer */}
        <div className="protocol-footer">
          <button
            className="protocol-btn protocol-btn-secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Go Back
          </button>
          <button
            className="protocol-btn protocol-btn-danger"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : (isHost ? 'Yes, Reject' : 'Yes, Cancel')}
          </button>
        </div>
      </div>
    </div>
  )

  // Portal renders modal at document.body, escaping any parent CSS constraints
  return createPortal(modalContent, document.body)
}
