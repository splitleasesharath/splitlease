/**
 * CancelProposalModal Component - v2.0 REDESIGN
 *
 * Unified modal for confirming proposal cancellation/rejection with reason selection.
 * Supports both guest cancellation and host rejection flows via userType prop.
 * Following the Hollow Component pattern - all business logic handled by parent.
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
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

  // Inline styles to ensure rendering works in portal (outside Tailwind scope)
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999
  }

  const modalStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '10px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    width: '100%',
    maxWidth: '460px',
    margin: '0 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }

  const headerStyle = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px',
    borderBottom: '1px solid #e5e7eb'
  }

  const headerLeftStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }

  const titleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: 0
  }

  const subtitleStyle = {
    fontSize: '13px',
    color: '#dc2626',
    margin: 0
  }

  const closeButtonStyle = {
    color: '#9ca3af',
    fontSize: '24px',
    lineHeight: 1,
    padding: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer'
  }

  const bodyStyle = {
    padding: '20px'
  }

  const messageStyle = {
    fontSize: '15px',
    color: '#4b5563',
    marginBottom: '20px',
    textAlign: 'center'
  }

  const radioListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  }

  const radioLabelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '4px'
  }

  const radioInputStyle = {
    width: '18px',
    height: '18px',
    accentColor: '#7c3aed'
  }

  const radioTextStyle = {
    fontSize: '15px',
    color: '#374151'
  }

  const textareaStyle = {
    width: '100%',
    padding: '10px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    resize: 'none',
    marginTop: '14px',
    boxSizing: 'border-box'
  }

  const footerStyle = {
    display: 'flex',
    gap: '14px',
    padding: '20px',
    borderTop: '1px solid #e5e7eb'
  }

  const cancelButtonStyle = {
    flex: 1,
    padding: '10px 20px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    borderRadius: '6px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer'
  }

  const confirmButtonStyle = {
    flex: 1,
    padding: '10px 20px',
    backgroundColor: '#b91c1c',
    color: '#ffffff',
    borderRadius: '6px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    opacity: isSubmitting ? 0.5 : 1
  }

  const modalContent = (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header with inline icon */}
        <div style={headerStyle}>
          <div style={headerLeftStyle}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            >
              <path d="M19 7L5 7M14 11V17M10 11V17M5 7L6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19L19 7M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div>
              <h2 style={titleStyle}>{getTitle()}?</h2>
              <p style={subtitleStyle}>This action is irreversible</p>
            </div>
          </div>
          <button style={closeButtonStyle} onClick={handleClose}>×</button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          <p style={messageStyle}>{getConfirmationMessage()}</p>

          {/* Reason Selection */}
          <div style={radioListStyle}>
            {reasonOptions.map((reason) => (
              <label key={reason.id} style={radioLabelStyle}>
                <input
                  type="radio"
                  name="cancellationReason"
                  value={reason.id}
                  checked={selectedReasonId === reason.id}
                  onChange={(e) => setSelectedReasonId(e.target.value)}
                  style={radioInputStyle}
                />
                <span style={radioTextStyle}>{reason.label}</span>
              </label>
            ))}
          </div>

          {/* Custom Reason Input */}
          {showCustomInput && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={2}
              style={textareaStyle}
              placeholder="Please specify your reason..."
            />
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            style={cancelButtonStyle}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            style={confirmButtonStyle}
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
