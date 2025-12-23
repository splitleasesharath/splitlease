// Icon components (inline SVGs)
const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export default function AlertBanner({ onScheduleCohost, existingRequest }) {
  const hasRequest = !!existingRequest;
  const status = existingRequest?.['Status - Co-Host Request'] || existingRequest?.status;

  return (
    <button
      className={`listing-dashboard-alert listing-dashboard-alert--clickable ${hasRequest ? 'listing-dashboard-alert--has-request' : ''}`}
      onClick={onScheduleCohost}
      type="button"
    >
      {/* Icon */}
      <div className="listing-dashboard-alert__icon">
        {hasRequest ? <CheckIcon /> : <InfoIcon />}
      </div>

      {/* Content */}
      <div className="listing-dashboard-alert__content">
        {hasRequest ? (
          <>
            <p className="listing-dashboard-alert__text">
              Co-Host Request Submitted
            </p>
            <span className="listing-dashboard-alert__subtext">
              Status: {status === 'pending' ? 'Pending assignment' : status} — Click to view details
            </span>
          </>
        ) : (
          <>
            <p className="listing-dashboard-alert__text">
              Need help setting up? Ask a Specialist Co-host!
            </p>
            <span className="listing-dashboard-alert__subtext">
              Our specialists can help you optimize your listing and attract more quality tenants.
            </span>
          </>
        )}
      </div>

      {/* Chevron Icon */}
      <div className="listing-dashboard-alert__chevron">
        <ChevronRightIcon />
      </div>
    </button>
  );
}
