import { getStatusConfig, PROPOSAL_STATUS } from '../../../config/proposalStatusConfig.js';

/**
 * Compute button states for a proposal card (pure function).
 * @param {object} params - Named parameters
 * @returns {object} Button states
 */
export function computeProposalButtonStates({ proposal, virtualMeeting, guest, listing, currentUserId }) {
  if (!proposal) {
    return {
      virtualMeeting: { visible: false },
      guestAction1: { visible: false },
      guestAction2: { visible: false },
      cancelProposal: { visible: false },
    };
  }

  const rawStatus = proposal.Status || proposal.status;
  const status = typeof rawStatus === 'string' ? rawStatus.trim() : rawStatus;
  const config = getStatusConfig(status);
  const vm = virtualMeeting;

  // ========== BUTTON 1: Virtual Meeting ==========
  const vmHiddenStatuses = [
    PROPOSAL_STATUS.REJECTED_BY_HOST,
    PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE,
    PROPOSAL_STATUS.INITIAL_PAYMENT_LEASE_ACTIVATED,
    PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION,
    PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION,
  ].map(s => (typeof s === 'string' ? s.trim() : s));

  let vmButton = { visible: !vmHiddenStatuses.includes(status) };

  if (vmButton.visible) {
    if (vm?.['meeting declined']) {
      vmButton = {
        ...vmButton,
        label: 'Virtual Meeting Declined',
        fontColor: '#DB2E2E',
        bold: true,
        tooltip: 'click to request another one',
        disabled: false,
      };
    } else if (vm?.['booked date'] && vm?.['confirmedBySplitLease']) {
      vmButton = { ...vmButton, label: 'Meeting confirmed', disabled: true };
    } else if (vm?.['booked date']) {
      vmButton = { ...vmButton, label: 'Virtual Meeting Accepted', disabled: true };
    } else if (vm?.['requested by'] === currentUserId) {
      vmButton = { ...vmButton, label: 'Virtual Meeting Requested', disabled: true };
    } else if (vm?.['requested by']) {
      vmButton = { ...vmButton, label: 'Respond to Virtual Meeting Request', disabled: false };
    } else {
      vmButton = { ...vmButton, label: 'Request Virtual Meeting', disabled: false };
    }
  }

  // ========== BUTTON 2: Guest Action 1 ==========
  let ga1Button = { visible: !!status && config.guestAction1 !== 'Invisible' };

  if (ga1Button.visible) {
    // Reminder limit check
    if (config.guestAction1 === 'Remind Split Lease' && (proposal['remindersByGuest (number)'] || 0) > 3) {
      ga1Button.visible = false;
    }
    // Lease docs finalized check
    if (status === PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT && !proposal['guest documents review finalized?']) {
      ga1Button.visible = false;
    }
  }

  if (ga1Button.visible) {
    if (status === PROPOSAL_STATUS.REJECTED_BY_HOST) {
      ga1Button = { ...ga1Button, label: 'Delete Proposal', backgroundColor: '#EF4444' };
    } else {
      ga1Button = { ...ga1Button, label: config.guestAction1 };
    }
  }

  // ========== BUTTON 3: Guest Action 2 ==========
  let ga2Button = { visible: config.guestAction2 !== 'Invisible' };

  if (ga2Button.visible) {
    // ID docs submitted check
    if (status === PROPOSAL_STATUS.LEASE_DOCUMENTS_SENT && !guest?.['ID documents submitted?']) {
      ga2Button.visible = false;
    }
  }

  if (ga2Button.visible) {
    ga2Button = { ...ga2Button, label: config.guestAction2 };
  }

  // ========== BUTTON 4: Cancel Proposal ==========
  const cancelHiddenStatuses = [
    PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_AWAITING_APPLICATION,
    PROPOSAL_STATUS.PROPOSAL_SUBMITTED_BY_SL_PENDING_CONFIRMATION,
  ].map(s => (typeof s === 'string' ? s.trim() : s));

  let cancelButton = { visible: !cancelHiddenStatuses.includes(status) };

  if (cancelButton.visible) {
    const terminalStatuses = [
      PROPOSAL_STATUS.CANCELLED_BY_GUEST,
      PROPOSAL_STATUS.CANCELLED_BY_SPLITLEASE,
      PROPOSAL_STATUS.REJECTED_BY_HOST,
    ].map(s => (typeof s === 'string' ? s.trim() : s));

    if (terminalStatuses.includes(status)) {
      cancelButton = { ...cancelButton, label: 'Delete Proposal' };
    } else if (status === PROPOSAL_STATUS.HOST_COUNTEROFFER) {
      cancelButton = { ...cancelButton, label: 'Reject Modified Terms' };
    } else if (config.usualOrder > 5 && listing?.['House manual']) {
      cancelButton = { ...cancelButton, label: 'See House Manual', backgroundColor: '#6D31C2' };
    } else if (config.usualOrder > 5) {
      cancelButton.visible = true;
      cancelButton.label = 'Cancel Proposal';
    } else {
      cancelButton = { ...cancelButton, label: 'Cancel Proposal' };
    }
  }

  return {
    virtualMeeting: vmButton,
    guestAction1: ga1Button,
    guestAction2: ga2Button,
    cancelProposal: cancelButton,
  };
}
