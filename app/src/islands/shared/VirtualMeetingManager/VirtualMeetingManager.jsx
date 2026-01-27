/**
 * Virtual Meeting Manager - Main Component
 * Manages 4 different views for virtual meeting workflows:
 * 1. Respond to VM Request - Select from proposed times or decline
 * 2. Book/Request Virtual Meeting - Create new meeting request with calendar
 * 3. Cancel Virtual Meetings - Confirmation dialog for cancellation
 * 4. Details of proposal and VM - Display booked meeting info with Google Calendar integration
 */

import { useState, useEffect } from 'react';
import virtualMeetingService from './virtualMeetingService.js';
import RespondToVMRequest from './RespondToVMRequest.jsx';
import BookVirtualMeeting from './BookVirtualMeeting.jsx';
import CancelVirtualMeetings from './CancelVirtualMeetings.jsx';
import DetailsOfProposalAndVM from './DetailsOfProposalAndVM.jsx';
import VMRequestSuccessModal from './VMRequestSuccessModal.jsx';
import './VirtualMeetingManager.css';
import '../../pages/AccountProfilePage/AccountProfilePage.css'; // For ReferralModal card styles

/**
 * ViewState type: 'respond' | 'request' | 'cancel' | 'details' | ''
 *
 * @param {Object} props
 * @param {Object} props.proposal - Proposal object containing meeting info
 * @param {string} [props.initialView=''] - Initial view state
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Object} props.currentUser - Current user object
 * @param {Function} [props.onSuccess] - Optional callback when operation succeeds
 */
export default function VirtualMeetingManager({
  proposal,
  initialView = '',
  onClose,
  currentUser,
  onSuccess,
}) {
  // State management
  const [view, setView] = useState(initialView);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  /**
   * Handle confirming a time slot selection
   * @param {Date} selectedTime - Selected time slot
   */
  const handleConfirmTime = async (selectedTime) => {
    try {
      const userId = currentUser?._id || currentUser?.userId || currentUser?.id;
      const result = await virtualMeetingService.acceptMeeting(
        proposal._id || proposal.id,
        selectedTime,
        userId
      );

      if (result.status === 'success') {
        setSuccess('Meeting confirmed successfully!');
        // Switch to details view after successful confirmation
        setTimeout(() => {
          setView('details');
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to confirm meeting');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm meeting');
      throw err;
    }
  };

  /**
   * Handle declining a meeting request
   */
  const handleDecline = async () => {
    try {
      const result = await virtualMeetingService.declineMeeting(proposal._id || proposal.id);

      if (result.status === 'success') {
        setSuccess('Meeting declined');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to decline meeting');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline meeting');
      throw err;
    }
  };

  /**
   * Handle suggesting alternative times
   */
  const handleSuggestAlternatives = () => {
    setIsSuggesting(true);
    setView('request');
  };

  /**
   * Handle submitting meeting request or alternative times
   * @param {Date[]} slots - Selected time slots
   * @param {boolean} isSuggestingAlt - Whether this is suggesting alternatives
   */
  const handleSubmitRequest = async (slots, isSuggestingAlt) => {
    try {
      // Get user ID - check multiple field names for compatibility
      const userId = currentUser?._id || currentUser?.userId || currentUser?.id;
      console.log('[VM Manager] Submit request - userId:', userId, 'currentUser:', currentUser);

      if (!userId) {
        throw new Error('User ID not found - please refresh and try again');
      }

      const result = await virtualMeetingService.createRequest(
        proposal._id || proposal.id,
        slots,
        userId,
        isSuggestingAlt,
        'America/New_York'
      );

      if (result.status === 'success') {
        // Show success modal for new requests (not alternatives)
        if (!isSuggestingAlt) {
          setView(''); // Hide the booking view
          setShowSuccessModal(true);
        } else {
          setSuccess('Alternative times submitted successfully!');
          setTimeout(() => {
            onClose();
            if (onSuccess) onSuccess();
          }, 1500);
        }
      } else {
        throw new Error(result.message || 'Failed to submit request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
      throw err;
    }
  };

  /**
   * Handle closing the success modal
   */
  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    onClose();
    if (onSuccess) onSuccess();
  };

  /**
   * Handle canceling a virtual meeting
   */
  const handleCancelMeeting = async () => {
    const virtualMeeting = getVirtualMeeting();
    if (!virtualMeeting) return;

    try {
      const result = await virtualMeetingService.cancelMeeting(
        virtualMeeting._id || virtualMeeting.id,
        proposal._id || proposal.id
      );

      if (result.status === 'success') {
        setSuccess('Meeting canceled successfully');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        throw new Error(result.message || 'Failed to cancel meeting');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel meeting');
      throw err;
    }
  };

  /**
   * Handle going back from request view
   */
  const handleBack = () => {
    setIsSuggesting(false);
    setView('respond');
  };

  /**
   * Get virtual meeting object from proposal (handle different field names)
   */
  const getVirtualMeeting = () => {
    return proposal.virtualMeeting || proposal['virtual meeting'] || proposal.virtual_meeting;
  };

  /**
   * Get participant name for cancel dialog
   */
  const getParticipantName = () => {
    const isHost = currentUser?.typeUserSignup === 'host' ||
                   currentUser?.type_user_signup === 'host';

    if (isHost) {
      return proposal.guest?.firstName || proposal.guest?.name || 'Guest';
    }
    return proposal.host?.name || proposal.host?.firstName || 'Host';
  };

  /**
   * Get listing name
   */
  const getListingName = () => {
    return proposal.listing?.name || proposal._listing?.name || 'Property';
  };

  /**
   * Get host name for success modal
   */
  const getHostName = () => {
    return proposal.host?.name || proposal.host?.firstName || 'the host';
  };

  /**
   * Get current user's first name for referral modal
   */
  const getCurrentUserName = () => {
    return currentUser?.['Name - First'] || currentUser?.firstName || currentUser?.name || '';
  };

  /**
   * Get user type (host or guest)
   */
  const getUserType = () => {
    const isHost = currentUser?.typeUserSignup === 'host' ||
                   currentUser?.type_user_signup === 'host';
    return isHost ? 'host' : 'guest';
  };

  const virtualMeeting = getVirtualMeeting();

  // Show success modal if active
  if (showSuccessModal) {
    return (
      <VMRequestSuccessModal
        isOpen={true}
        onClose={handleSuccessModalClose}
        hostName={getHostName()}
        referralCode={currentUser?._id || currentUser?.id || 'user'}
        referrerName={getCurrentUserName()}
        userType={getUserType()}
      />
    );
  }

  // Don't render if no view is set
  if (!view) {
    return null;
  }

  return (
    <div className="vm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vm-container">
        {/* Close Button - Protocol compliant SVG */}
        <button
          type="button"
          className="vm-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, flexShrink: 0 }}
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Global Error/Success Messages */}
        {error && <div className="vm-error">{error}</div>}
        {success && <div className="vm-success">{success}</div>}

        {/* Respond to VM Request View */}
        {view === 'respond' && (
          <RespondToVMRequest
            proposal={proposal}
            onConfirm={handleConfirmTime}
            onDecline={handleDecline}
            onSuggestAlt={handleSuggestAlternatives}
          />
        )}

        {/* Book/Request Virtual Meeting View */}
        {view === 'request' && (
          <BookVirtualMeeting
            proposal={proposal}
            isSuggesting={isSuggesting}
            onSubmit={handleSubmitRequest}
            onBack={handleBack}
            currentUser={currentUser}
          />
        )}

        {/* Cancel Virtual Meeting View */}
        {view === 'cancel' && virtualMeeting && (
          <CancelVirtualMeetings
            meeting={virtualMeeting}
            participantName={getParticipantName()}
            listingName={getListingName()}
            onCancel={handleCancelMeeting}
            onClose={onClose}
          />
        )}

        {/* Details of Proposal and VM View */}
        {view === 'details' && virtualMeeting && (
          <DetailsOfProposalAndVM
            proposal={proposal}
            meeting={virtualMeeting}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
