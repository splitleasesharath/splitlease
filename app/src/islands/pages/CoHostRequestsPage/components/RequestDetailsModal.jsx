/**
 * RequestDetailsModal - Full details view for a co-host request
 *
 * Shows all request information including:
 * - Host details with contact info
 * - Listing details
 * - Full request message
 * - Meeting information (if scheduled)
 * - Admin and request notes
 * - Status change history
 * - Action buttons
 */

export default function RequestDetailsModal({
  request,
  onClose,
  onAssignCoHost,
  onAddNotes,
  onCloseRequest,
  onUpdateStatus,
  getStatusColor,
  getStatusLabel,
  formatDate,
  isProcessing,
}) {
  const statusColor = getStatusColor(request.status);
  const statusLabel = getStatusLabel(request.status);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-content modal-large">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <h2 className="modal-title">Request Details</h2>
            <span className={`status-badge status-badge-${statusColor}`}>
              {statusLabel}
            </span>
          </div>
          <button onClick={onClose} className="modal-close-button" title="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Two Column Layout */}
          <div className="details-grid">
            {/* Left Column - Host & Listing */}
            <div className="details-column">
              {/* Host Information */}
              <section className="details-section">
                <h3 className="details-section-title">
                  <UserIcon />
                  Host Information
                </h3>
                <div className="details-content">
                  <div className="detail-row">
                    <span className="detail-label">Name</span>
                    <span className="detail-value">{request.hostName}</span>
                  </div>
                  {request.hostEmail && (
                    <div className="detail-row">
                      <span className="detail-label">Email</span>
                      <a href={`mailto:${request.hostEmail}`} className="detail-value detail-link">
                        {request.hostEmail}
                      </a>
                    </div>
                  )}
                  {request.hostPhone && (
                    <div className="detail-row">
                      <span className="detail-label">Phone</span>
                      <a href={`tel:${request.hostPhone}`} className="detail-value detail-link">
                        {request.hostPhone}
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* Listing Information */}
              {request.listingName && (
                <section className="details-section">
                  <h3 className="details-section-title">
                    <HomeIcon />
                    Listing Information
                  </h3>
                  <div className="details-content">
                    <div className="detail-row">
                      <span className="detail-label">Name</span>
                      <span className="detail-value">{request.listingName}</span>
                    </div>
                    {request.listingBorough && (
                      <div className="detail-row">
                        <span className="detail-label">Borough</span>
                        <span className="detail-value">{request.listingBorough}</span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Assigned Co-Host */}
              <section className="details-section">
                <h3 className="details-section-title">
                  <CoHostIcon />
                  Assigned Co-Host
                </h3>
                <div className="details-content">
                  {request.cohostName ? (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Name</span>
                        <span className="detail-value">{request.cohostName}</span>
                      </div>
                      {request.cohostEmail && (
                        <div className="detail-row">
                          <span className="detail-label">Email</span>
                          <a href={`mailto:${request.cohostEmail}`} className="detail-value detail-link">
                            {request.cohostEmail}
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="detail-empty">No co-host assigned yet</p>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column - Request Details */}
            <div className="details-column">
              {/* Request Content */}
              <section className="details-section">
                <h3 className="details-section-title">
                  <MessageIcon />
                  Request Details
                </h3>
                <div className="details-content">
                  <div className="detail-row">
                    <span className="detail-label">Subject</span>
                    <span className="detail-value">{request.subject || 'No subject'}</span>
                  </div>
                  {request.details && (
                    <div className="detail-row detail-row-full">
                      <span className="detail-label">Message</span>
                      <p className="detail-value detail-message">{request.details}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Meeting Information */}
              {(request.meetingLink || request.meetingDateTime) && (
                <section className="details-section">
                  <h3 className="details-section-title">
                    <VideoIcon />
                    Meeting Information
                  </h3>
                  <div className="details-content">
                    {request.meetingDateTime && (
                      <div className="detail-row">
                        <span className="detail-label">Scheduled</span>
                        <span className="detail-value">{formatDate(request.meetingDateTime)}</span>
                      </div>
                    )}
                    {request.meetingLink && (
                      <div className="detail-row">
                        <span className="detail-label">Link</span>
                        <a
                          href={request.meetingLink.startsWith('http') ? request.meetingLink : `https://${request.meetingLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="detail-value detail-link"
                        >
                          {request.meetingLink}
                        </a>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Notes */}
              <section className="details-section">
                <h3 className="details-section-title">
                  <NotesIcon />
                  Notes
                </h3>
                <div className="details-content">
                  {request.adminNotes ? (
                    <div className="detail-row detail-row-full">
                      <span className="detail-label">Admin Notes</span>
                      <p className="detail-value detail-notes">{request.adminNotes}</p>
                    </div>
                  ) : (
                    <p className="detail-empty">No admin notes</p>
                  )}
                  {request.requestNotes && (
                    <div className="detail-row detail-row-full">
                      <span className="detail-label">Request Notes</span>
                      <p className="detail-value detail-notes">{request.requestNotes}</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Timestamps */}
              <section className="details-section">
                <h3 className="details-section-title">
                  <ClockIcon />
                  Timeline
                </h3>
                <div className="details-content">
                  <div className="detail-row">
                    <span className="detail-label">Created</span>
                    <span className="detail-value">{formatDate(request.createdDate)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Last Updated</span>
                    <span className="detail-value">{formatDate(request.modifiedDate)}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="modal-footer">
          <div className="modal-actions-left">
            {request.canAssign && (
              <button
                onClick={onAssignCoHost}
                className="modal-action-button modal-action-primary"
                disabled={isProcessing}
              >
                Assign Co-Host
              </button>
            )}
            <button
              onClick={onAddNotes}
              className="modal-action-button modal-action-secondary"
            >
              Edit Notes
            </button>
          </div>
          <div className="modal-actions-right">
            {request.canClose && (
              <button
                onClick={onCloseRequest}
                className="modal-action-button modal-action-danger"
                disabled={isProcessing}
              >
                Close Request
              </button>
            )}
            <button onClick={onClose} className="modal-action-button modal-action-cancel">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== ICONS =====

function CloseIcon() {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CoHostIcon() {
  return (
    <svg className="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg className="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="section-title-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
