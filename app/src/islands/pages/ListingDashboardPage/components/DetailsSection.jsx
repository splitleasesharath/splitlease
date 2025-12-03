// Icon components (inline SVGs)
const HomeIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const TrainIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="16" height="16" x="4" y="3" rx="2" />
    <path d="M4 11h16" />
    <path d="M12 3v8" />
    <path d="m8 19-2 3" />
    <path d="m18 22-2-3" />
    <path d="M8 15h.01" />
    <path d="M16 15h.01" />
  </svg>
);

const CarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C1.4 11.3 1 12.1 1 13v3c0 .6.4 1 1 1h2" />
    <circle cx="7" cy="17" r="2" />
    <path d="M9 17h6" />
    <circle cx="17" cy="17" r="2" />
  </svg>
);

const KitchenIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 11v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3" />
    <path d="M12 19H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3.83" />
    <path d="m3 11 7.77-6.04a2 2 0 0 1 2.46 0L21 11H3Z" />
    <path d="M12.97 19.77 7 15h12.5l-3.75 4.5a2 2 0 0 1-2.78.27Z" />
  </svg>
);

export default function DetailsSection({ listing, onCancellationPolicyChange }) {
  const features = [
    {
      icon: <HomeIcon />,
      label: 'Type of Space',
      value: listing.features.typeOfSpace.label,
    },
    {
      icon: <TrainIcon />,
      label: 'Transit',
      value: 'Near public transit',
    },
    {
      icon: <CarIcon />,
      label: 'Parking',
      value: listing.features.parkingType.label,
    },
    {
      icon: <KitchenIcon />,
      label: 'Kitchen',
      value: listing.features.kitchenType.display,
    },
  ];

  return (
    <div className="listing-dashboard-details">
      {/* Section Header */}
      <div className="listing-dashboard-details__header">
        <h2 className="listing-dashboard-details__title">Details</h2>
      </div>

      {/* Features Grid */}
      <div className="listing-dashboard-details__features">
        {features.map((feature, index) => (
          <div key={index} className="listing-dashboard-details__feature">
            <div className="listing-dashboard-details__feature-icon">
              {feature.icon}
            </div>
            <div className="listing-dashboard-details__feature-content">
              <p className="listing-dashboard-details__feature-label">
                {feature.label}
              </p>
              <p className="listing-dashboard-details__feature-value">
                {feature.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Safety Features */}
      <div className="listing-dashboard-details__safety">
        <h3 className="listing-dashboard-details__subtitle">Safety Features</h3>
        <div className="listing-dashboard-details__safety-grid">
          {listing.safetyFeatures.map((feature) => (
            <div
              key={feature.id}
              className="listing-dashboard-details__safety-item"
            >
              {feature.name}
            </div>
          ))}
        </div>
      </div>

      {/* Cancellation Policy */}
      <div className="listing-dashboard-details__policy">
        <h3 className="listing-dashboard-details__subtitle">
          Cancellation Policy
        </h3>
        <select
          className="listing-dashboard-details__select"
          onChange={(e) => onCancellationPolicyChange?.(e.target.value)}
        >
          <option value="flexible">Flexible</option>
          <option value="moderate">Moderate</option>
          <option value="strict">Strict</option>
        </select>
      </div>

      {/* Complete House Manual Button */}
      <div className="listing-dashboard-details__cta">
        <button className="listing-dashboard-details__cta-btn">
          Complete House Manual
        </button>
      </div>
    </div>
  );
}
