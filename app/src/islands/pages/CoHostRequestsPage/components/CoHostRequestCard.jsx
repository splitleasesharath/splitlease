/**
 * CoHostRequestCard - Card component displaying a single co-host request
 *
 * Shows:
 * - Status badge
 * - Host information (name, email)
 * - Listing information
 * - Subject and details preview
 * - Assigned co-host (if any)
 * - Created date
 * - Action buttons
 */

export default function CoHostRequestCard({
  request,
  onViewDetails,
  onAssignCoHost,
  onAddNotes,
  onCloseRequest,
  getStatusColor,
  getStatusLabel,
  formatDate,
  isProcessing,
}) {
  const statusColor = getStatusColor(request.status);
  const statusLabel = getStatusLabel(request.status);

  return (
    <div className="request-card">
      {/* Header with status */}
      <div className="card-header">
        <span className={`status-badge status-badge-${statusColor}`}>
          {statusLabel}
        </span>
        <span className="card-date">{formatDate(request.createdDate)}</span>
      </div>

      {/* Host Info */}
      <div className="card-section">
        <div className="card-section-header">
          <UserIcon />
          <span className="card-section-title">Host</span>
        </div>
        <div className="card-section-content">
          <p className="host-name">{request.hostName}</p>
          {request.hostEmail && (
            <p className="host-email">{request.hostEmail}</p>
          )}
        </div>
      </div>

      {/* Listing Info */}
      {request.listingName && (
        <div className="card-section">
          <div className="card-section-header">
            <HomeIcon />
            <span className="card-section-title">Listing</span>
          </div>
          <div className="card-section-content">
            <p className="listing-name">{request.listingName}</p>
            {request.listingBorough && (
              <p className="listing-borough">{request.listingBorough}</p>
            )}
          </div>
        </div>
      )}

      {/* Subject & Details */}
      <div className="card-section">
        <div className="card-section-header">
          <MessageIcon />
          <span className="card-section-title">Request</span>
        </div>
        <div className="card-section-content">
          <p className="request-subject">{request.subject || 'No subject'}</p>
          {request.details && (
            <p className="request-details-preview">
              {request.details.length > 100
                ? `${request.details.substring(0, 100)}...`
                : request.details}
            </p>
          )}
        </div>
      </div>

      {/* Assigned Co-Host */}
      {request.cohostName && (
        <div className="card-section">
          <div className="card-section-header">
            <CoHostIcon />
            <span className="card-section-title">Assigned Co-Host</span>
          </div>
          <div className="card-section-content">
            <p className="cohost-name">{request.cohostName}</p>
          </div>
        </div>
      )}

      {/* Notes Indicator */}
      {(request.adminNotes || request.requestNotes) && (
        <div className="card-notes-indicator">
          <NotesIcon />
          <span>Has notes</span>
        </div>
      )}

      {/* Actions */}
      <div className="card-actions">
        <button
          onClick={onViewDetails}
          className="card-action-button card-action-primary"
        >
          View Details
        </button>

        {request.canAssign && (
          <button
            onClick={onAssignCoHost}
            className="card-action-button card-action-secondary"
            disabled={isProcessing}
          >
            Assign Co-Host
          </button>
        )}

        <button
          onClick={onAddNotes}
          className="card-action-button card-action-tertiary"
        >
          Notes
        </button>

        {request.canClose && (
          <button
            onClick={onCloseRequest}
            className="card-action-button card-action-close"
            disabled={isProcessing}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// ===== ICONS =====

function UserIcon() {
  return (
    <svg
      className="section-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      className="section-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      className="section-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
      />
    </svg>
  );
}

function CoHostIcon() {
  return (
    <svg
      className="section-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg
      className="notes-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
