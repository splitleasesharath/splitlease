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

export default function AlertBanner({ onScheduleCohost }) {
  return (
    <button
      className="listing-dashboard-alert listing-dashboard-alert--clickable"
      onClick={onScheduleCohost}
      type="button"
    >
      {/* Info Icon */}
      <div className="listing-dashboard-alert__icon">
        <InfoIcon />
      </div>

      {/* Content */}
      <div className="listing-dashboard-alert__content">
        <p className="listing-dashboard-alert__text">
          Need help setting up? Ask a Specialist Co-host!
        </p>
        <span className="listing-dashboard-alert__subtext">
          Our specialists can help you optimize your listing and attract more quality tenants.
        </span>
      </div>

      {/* Chevron Icon */}
      <div className="listing-dashboard-alert__chevron">
        <ChevronRightIcon />
      </div>
    </button>
  );
}
