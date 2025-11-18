/**
 * VirtualMeetingModal Component
 *
 * 5-state VM workflow (documented in workflow/VM-IMPLEMENTATION-QUICKSTART.md)
 * States:
 * 1. "request" - Guest/Host requests a meeting
 * 2. "respond" - Other party responds to request
 * 3. "details" - View confirmed meeting details
 * 4. "cancel" - Cancel existing meeting
 * 5. "alternative" - Request alternative time after decline
 */

import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function VirtualMeetingModal({
  proposal,
  virtualMeeting,
  currentUser,
  view = 'request', // 'request', 'respond', 'details', 'cancel', 'alternative'
  onClose,
  onSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [bookedDate, setBookedDate] = useState('');
  const [bookedTime, setBookedTime] = useState('');
  const [notes, setNotes] = useState('');

  // Determine if user is suggesting alternative time
  const isSuggestingAlternative = view === 'alternative';

  // Handle request submission (guest or host requesting meeting)
  async function handleSubmitRequest() {
    if (!bookedDate || !bookedTime) {
      alert('Please select a date and time');
      return;
    }

    setLoading(true);
    try {
      const bookedDateTime = new Date(`${bookedDate}T${bookedTime}`).toISOString();

      if (virtualMeeting) {
        // Update existing VM (alternative request)
        const { error } = await supabase
          .from('virtualmeetingschedulesandlinks')
          .update({
            'booked date': bookedDateTime,
            'meeting declined': false,
            'Modified Date': new Date().toISOString(),
          })
          .eq('_id', virtualMeeting._id);

        if (error) throw error;
      } else {
        // Create new VM
        const { data: newVM, error: createError } = await supabase
          .from('virtualmeetingschedulesandlinks')
          .insert({
            proposal: proposal._id,
            guest: proposal['Guest'],
            host: proposal._listing?.['Created By'],
            'requested by': currentUser._id,
            'booked date': bookedDateTime,
            'meeting declined': false,
            'confirmedBySplitLease': false,
            'Created Date': new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;

        // Update proposal to link VM
        const { error: updateError } = await supabase
          .from('proposal')
          .update({
            'virtual meeting': newVM._id,
            'Modified Date': new Date().toISOString(),
          })
          .eq('_id', proposal._id);

        if (updateError) throw updateError;
      }

      alert('Virtual meeting request sent!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting VM request:', error);
      alert('Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Handle accepting a meeting request
  async function handleAcceptRequest() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('virtualmeetingschedulesandlinks')
        .update({
          'meeting declined': false,
          'confirmedBySplitLease': false, // Pending SL confirmation
          'Modified Date': new Date().toISOString(),
        })
        .eq('_id', virtualMeeting._id);

      if (error) throw error;

      alert('Meeting request accepted! Awaiting Split Lease confirmation.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error accepting VM:', error);
      alert('Failed to accept request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Handle declining a meeting request
  async function handleDeclineRequest() {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('virtualmeetingschedulesandlinks')
        .update({
          'meeting declined': true,
          'Modified Date': new Date().toISOString(),
        })
        .eq('_id', virtualMeeting._id);

      if (error) throw error;

      alert('Meeting request declined. They can suggest a different time.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error declining VM:', error);
      alert('Failed to decline request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Handle canceling an existing meeting
  async function handleCancelMeeting() {
    setLoading(true);
    try {
      // Delete VM
      const { error: deleteError } = await supabase
        .from('virtualmeetingschedulesandlinks')
        .delete()
        .eq('_id', virtualMeeting._id);

      if (deleteError) throw deleteError;

      // Update proposal to unlink VM
      const { error: updateError } = await supabase
        .from('proposal')
        .update({
          'virtual meeting': null,
          'Modified Date': new Date().toISOString(),
        })
        .eq('_id', proposal._id);

      if (updateError) throw updateError;

      alert('Virtual meeting cancelled.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error canceling VM:', error);
      alert('Failed to cancel meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* REQUEST VIEW */}
            {view === 'request' || view === 'alternative' ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {isSuggestingAlternative ? 'Suggest Alternative Time' : 'Request Virtual Meeting'}
                </h3>
                {isSuggestingAlternative && (
                  <p className="text-sm text-gray-600 mb-4">
                    The previous time was declined. Please suggest a different time.
                  </p>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meeting Date
                    </label>
                    <input
                      type="date"
                      value={bookedDate}
                      onChange={(e) => setBookedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meeting Time
                    </label>
                    <input
                      type="time"
                      value={bookedTime}
                      onChange={(e) => setBookedTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows="3"
                      placeholder="Any specific topics you'd like to discuss?"
                    />
                  </div>
                </div>
              </div>
            ) : view === 'respond' ? (
              /* RESPOND VIEW */
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Respond to Virtual Meeting Request
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Proposed Time:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(virtualMeeting?.['booked date']).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Requested By:</span>
                    <p className="font-medium text-gray-900">
                      {virtualMeeting?.['requested by'] === proposal['Guest'] ? 'Guest' : 'Host'}
                    </p>
                  </div>
                </div>
              </div>
            ) : view === 'details' ? (
              /* DETAILS VIEW */
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Virtual Meeting Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Meeting Time:</span>
                    <p className="font-medium text-gray-900">
                      {new Date(virtualMeeting?.['booked date']).toLocaleString()}
                    </p>
                  </div>
                  {virtualMeeting?.['meeting link'] && (
                    <div>
                      <span className="text-sm text-gray-600">Meeting Link:</span>
                      <a
                        href={virtualMeeting['meeting link']}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block font-medium text-purple-600 hover:text-purple-700 break-all"
                      >
                        {virtualMeeting['meeting link']}
                      </a>
                    </div>
                  )}
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Meeting confirmed by Split Lease
                    </p>
                  </div>
                </div>
              </div>
            ) : view === 'cancel' ? (
              /* CANCEL VIEW */
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Cancel Virtual Meeting
                </h3>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to cancel this virtual meeting?
                </p>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    This action cannot be undone. The other party will be notified.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* ACTION BUTTONS */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            {view === 'request' || view === 'alternative' ? (
              <>
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </>
            ) : view === 'respond' ? (
              <>
                <button
                  type="button"
                  onClick={handleAcceptRequest}
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {loading ? 'Accepting...' : 'Accept'}
                </button>
                <button
                  type="button"
                  onClick={handleDeclineRequest}
                  disabled={loading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none disabled:opacity-50 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  {loading ? 'Declining...' : 'Decline'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </>
            ) : view === 'details' ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
              >
                Close
              </button>
            ) : view === 'cancel' ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelMeeting}
                  disabled={loading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {loading ? 'Canceling...' : 'Yes, Cancel Meeting'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                >
                  No, Go Back
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
