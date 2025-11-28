/**
 * VirtualMeetingsSection Component
 * Displays virtual meeting cards for the current proposal
 * Shows meeting date/time, host info, and response options
 *
 * Following the Hollow Component pattern - receives all data via props
 */

import { useState } from 'react'
import { cancelVirtualMeetingRequest } from '../../logic/index.js'

export default function VirtualMeetingsSection({ proposal, currentUser, onUpdate }) {
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState(null)

  // Get virtual meeting from proposal
  const virtualMeeting = proposal?._virtualMeeting

  // Don't show section if no virtual meeting exists
  if (!virtualMeeting) {
    return null
  }

  const hostName = proposal._host?.['Name - First'] || proposal._host?.['Name - Full'] || 'Host'
  const listingName = proposal._listing?.Name || 'Property'

  // Format suggested timeslots from JSONB array
  function formatTimeslots(timeslotsArray) {
    if (!timeslotsArray || !Array.isArray(timeslotsArray)) return []

    return timeslotsArray.map(isoString => {
      try {
        const date = new Date(isoString)
        return {
          formatted: date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          }),
          iso: isoString
        }
      } catch (err) {
        console.error('Error formatting timeslot:', err)
        return null
      }
    }).filter(Boolean)
  }

  const timeslots = formatTimeslots(virtualMeeting['suggested dates and times'])

  async function handleCancelMeeting() {
    try {
      setIsCancelling(true)
      setError(null)

      await cancelVirtualMeetingRequest(virtualMeeting._id)

      console.log('[VirtualMeetingsSection] Meeting cancelled successfully')
      setShowCancelModal(false)

      if (onUpdate) {
        onUpdate()
      }
    } catch (err) {
      console.error('[VirtualMeetingsSection] Cancel error:', err)
      setError(err.message || 'Failed to cancel meeting')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <div className="virtual-meetings-section mt-6">
      <div className="vm-section-header mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Virtual Meetings</h2>
      </div>

      <div className="vm-card bg-white rounded-lg shadow-md p-6">
        {/* Host Info & Property Name */}
        <div className="vm-card-host flex items-center gap-3 mb-4">
          {proposal._host?.['Profile Photo'] && (
            <img
              src={proposal._host['Profile Photo']}
              alt={hostName}
              className="w-12 h-12 rounded-full object-cover"
            />
          )}
          <div className="vm-host-info">
            <p className="font-medium text-gray-900">
              {hostName} - {listingName}
            </p>
          </div>
        </div>

        {/* Meeting Status Message */}
        <div className="vm-meeting-status flex items-center gap-2 mb-4 text-gray-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
            <path d="M19,4H18V2H16V4H8V2H6V4H5C3.89,4 3,4.9 3,6V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4M19,20H5V10H19V20M5,8V6H19V8H5Z" />
          </svg>
          <span>
            A virtual meeting with {hostName} has been suggested for the times:
          </span>
        </div>

        {/* Time Slots Pills */}
        {timeslots.length > 0 && (
          <div className="vm-timeslots flex flex-wrap gap-2 mb-4">
            {timeslots.map((slot, index) => (
              <div
                key={index}
                className="vm-timeslot-pill px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium"
              >
                {slot.formatted}
              </div>
            ))}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-red-600 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Cancel Button */}
        <div className="vm-card-actions">
          <button
            className="btn-vm-cancel px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            onClick={() => setShowCancelModal(true)}
          >
            Cancel Virtual Meeting
          </button>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setShowCancelModal(false)}
            >
              &times;
            </button>

            <div className="text-center">
              <div className="flex justify-center mb-4">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#ef4444">
                  <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Cancel Virtual Meeting?
              </h3>

              <p className="text-gray-500 text-sm mb-4">
                This action cannot be undone
              </p>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-6">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#9ca3af" style={{ flexShrink: 0 }}>
                  <path d="M19,4H18V2H16V4H8V2H6V4H5C3.89,4 3,4.9 3,6V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V6A2,2 0 0,0 19,4M19,20H5V10H19V20M5,8V6H19V8H5Z" />
                </svg>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Meeting with {hostName}</p>
                  <p className="text-sm text-gray-500">{listingName}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  onClick={() => setShowCancelModal(false)}
                >
                  No
                </button>
                <button
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  onClick={handleCancelMeeting}
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
