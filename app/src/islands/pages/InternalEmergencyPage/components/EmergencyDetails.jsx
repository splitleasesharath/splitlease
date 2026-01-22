/**
 * Emergency Details Component
 * Split Lease - Internal Emergency Dashboard
 *
 * Displays full emergency details and action controls
 */

import React, { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'REPORTED', label: 'Reported' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function EmergencyDetails({
  emergency,
  teamMembers,
  onAssign,
  onUpdateStatus,
  onUpdateVisibility,
  onAlert,
}) {
  // Assignment form state
  const [assigneeId, setAssigneeId] = useState(emergency.assigned_to_user_id || '');
  const [guidanceInstructions, setGuidanceInstructions] = useState(emergency.guidance_instructions || '');
  const [assigning, setAssigning] = useState(false);

  // Status update state
  const [newStatus, setNewStatus] = useState(emergency.status);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assigneeId) {
      onAlert('Please select a team member', 'error');
      return;
    }

    setAssigning(true);
    try {
      await onAssign(emergency.id, assigneeId, guidanceInstructions);
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async () => {
    if (newStatus === emergency.status) return;

    setUpdatingStatus(true);
    try {
      await onUpdateStatus(emergency.id, newStatus);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleToggleVisibility = async () => {
    try {
      await onUpdateVisibility(emergency.id, !emergency.is_hidden);
    } catch {
      // Error handled in hook
    }
  };

  return (
    <div className="emergency-details">
      {/* Header */}
      <div className="emergency-details__header">
        <h2 className="emergency-details__title">{emergency.emergency_type}</h2>
        <span className={`status-badge status-badge--${emergency.status.toLowerCase()}`}>
          {emergency.status}
        </span>
      </div>

      {/* Description */}
      <div className="emergency-details__section">
        <h3>Description</h3>
        <p className="emergency-details__description">{emergency.description}</p>
      </div>

      {/* Photos */}
      {(emergency.photo1_url || emergency.photo2_url) && (
        <div className="emergency-details__section">
          <h3>Photos</h3>
          <div className="emergency-details__photos">
            {emergency.photo1_url && (
              <a href={emergency.photo1_url} target="_blank" rel="noopener noreferrer">
                <img src={emergency.photo1_url} alt="Emergency photo 1" />
              </a>
            )}
            {emergency.photo2_url && (
              <a href={emergency.photo2_url} target="_blank" rel="noopener noreferrer">
                <img src={emergency.photo2_url} alt="Emergency photo 2" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Guest Information */}
      <div className="emergency-details__section">
        <h3>Guest Information</h3>
        {emergency.guest || emergency.reportedBy ? (
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <span>
                {(emergency.guest || emergency.reportedBy)?.firstName || ''}{' '}
                {(emergency.guest || emergency.reportedBy)?.lastName || ''}
              </span>
            </div>
            <div className="info-item">
              <label>Email</label>
              <span>{(emergency.guest || emergency.reportedBy)?.email || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Phone</label>
              <span>{(emergency.guest || emergency.reportedBy)?.phone || 'N/A'}</span>
            </div>
          </div>
        ) : (
          <p className="text-muted">No guest information available</p>
        )}
      </div>

      {/* Proposal/Listing Information */}
      {emergency.proposal && (
        <div className="emergency-details__section">
          <h3>Booking Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Agreement #</label>
              <span>{emergency.proposal.agreementNumber || 'N/A'}</span>
            </div>
            {emergency.listing && (
              <>
                <div className="info-item">
                  <label>Property</label>
                  <span>{emergency.listing.name || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Address</label>
                  <span>
                    {emergency.listing.streetAddress || ''}{' '}
                    {emergency.listing.city ? `, ${emergency.listing.city}` : ''}
                  </span>
                </div>
              </>
            )}
            <div className="info-item">
              <label>Move In</label>
              <span>{formatDate(emergency.proposal.moveIn)}</span>
            </div>
            <div className="info-item">
              <label>Move Out</label>
              <span>{formatDate(emergency.proposal.moveOut)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Section */}
      <div className="emergency-details__section">
        <h3>Assignment</h3>
        <form onSubmit={handleAssignSubmit} className="assignment-form">
          <div className="form-group">
            <label htmlFor="assignee">Assign To</label>
            <select
              id="assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="form-select"
            >
              <option value="">Select team member...</option>
              {teamMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.fullName || member.email}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="guidance">Guidance Instructions</label>
            <textarea
              id="guidance"
              value={guidanceInstructions}
              onChange={(e) => setGuidanceInstructions(e.target.value)}
              placeholder="Add instructions for the assigned team member..."
              rows={3}
              className="form-textarea"
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            disabled={assigning || !assigneeId}
          >
            {assigning ? 'Assigning...' : 'Assign Emergency'}
          </button>
        </form>

        {emergency.assignedTo && (
          <div className="current-assignment">
            <p>
              <strong>Currently assigned to:</strong>{' '}
              {emergency.assignedTo.firstName || ''} {emergency.assignedTo.lastName || ''}{' '}
              ({emergency.assignedTo.email})
            </p>
            {emergency.assigned_at && (
              <p className="text-muted">
                Assigned: {formatDateTime(emergency.assigned_at)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Update */}
      <div className="emergency-details__section">
        <h3>Update Status</h3>
        <div className="status-update">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="form-select"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleStatusChange}
            className="btn btn--secondary"
            disabled={updatingStatus || newStatus === emergency.status}
          >
            {updatingStatus ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>

      {/* Visibility Toggle */}
      <div className="emergency-details__section">
        <h3>Visibility</h3>
        <div className="visibility-toggle">
          <button
            onClick={handleToggleVisibility}
            className={`btn ${emergency.is_hidden ? 'btn--primary' : 'btn--outline'}`}
          >
            {emergency.is_hidden ? 'Show Emergency' : 'Hide Emergency'}
          </button>
          <p className="text-muted">
            {emergency.is_hidden
              ? 'This emergency is hidden from the default view.'
              : 'This emergency is visible in the default view.'}
          </p>
        </div>
      </div>

      {/* Timestamps */}
      <div className="emergency-details__section emergency-details__timestamps">
        <p><strong>Created:</strong> {formatDateTime(emergency.created_at)}</p>
        <p><strong>Updated:</strong> {formatDateTime(emergency.updated_at)}</p>
        {emergency.resolved_at && (
          <p><strong>Resolved:</strong> {formatDateTime(emergency.resolved_at)}</p>
        )}
        <p className="emergency-details__id">ID: {emergency.id}</p>
      </div>
    </div>
  );
}

/**
 * Format date string
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date-time string
 */
function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
