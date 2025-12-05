// Icons
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const BedIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4v16" /><path d="M2 8h18a2 2 0 0 1 2 2v10" /><path d="M2 17h20" /><path d="M6 8v9" />
  </svg>
);

const BathIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" /><line x1="10" x2="8" y1="5" y2="7" /><line x1="2" x2="22" y1="12" y2="12" /><line x1="7" x2="7" y1="19" y2="21" /><line x1="17" x2="17" y1="19" y2="21" />
  </svg>
);

const SizeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
  </svg>
);

const StorageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /><path d="M3 12h4" /><path d="M17 12h4" />
  </svg>
);

const ParkingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" />
  </svg>
);

const KitchenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3" /><path d="M12 19H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3.83" /><path d="m3 11 7.77-6.04a2 2 0 0 1 2.46 0L21 11H3Z" />
  </svg>
);

// Safety feature icons
const safetyIcons = {
  'Smoke Detector': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  ),
  'Carbon Monoxide Detector': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  ),
  'First Aid Kit': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="14" x="3" y="6" rx="2" /><path d="M12 10v6" /><path d="M9 13h6" />
    </svg>
  ),
  'Fire Sprinklers': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  ),
  'Lock on Bedroom Door': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  'Fire Extinguisher': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6.5V3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3.5" /><path d="M9 18h6" /><path d="M18 3h-3" /><path d="M11 3.5V6" /><rect width="10" height="12" x="7" y="6" rx="2" />
    </svg>
  ),
};

const DefaultIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
  </svg>
);

export default function DetailsSection({ listing, onEdit }) {
  const features = listing?.features || {};
  const safetyFeatures = listing?.safetyFeatures || [];

  const getSafetyIcon = (name) => safetyIcons[name] || <DefaultIcon />;

  return (
    <div className="listing-dashboard-section">
      {/* Section Header */}
      <div className="listing-dashboard-section__header">
        <h2 className="listing-dashboard-section__title">Details</h2>
        <button className="listing-dashboard-section__edit" onClick={onEdit}>
          edit
        </button>
      </div>

      {/* Content */}
      <div className="listing-dashboard-details">
        {/* Property Specs Row */}
        <div className="listing-dashboard-details__specs">
          {/* Type of Space */}
          <div className="listing-dashboard-details__type">
            <span>Type of Space: {features.typeOfSpace?.label || 'N/A'}</span>
          </div>

          {/* Beds, Baths, Size */}
          <div className="listing-dashboard-details__counts">
            <div className="listing-dashboard-details__count-item">
              <BedIcon />
              <span>{features.bedrooms || 0} bedrooms</span>
            </div>
            <div className="listing-dashboard-details__count-item">
              <BathIcon />
              <span>{features.bathrooms || 0} bathrooms</span>
            </div>
            <div className="listing-dashboard-details__count-item">
              <SizeIcon />
              <span>{features.squareFootage || 0} sq.ft.</span>
            </div>
          </div>

          {/* Storage, Parking, Kitchen */}
          <div className="listing-dashboard-details__features-row">
            <div className="listing-dashboard-details__feature-item">
              <StorageIcon />
              <span>{features.storageType?.label || 'No storage'}</span>
            </div>
            <div className="listing-dashboard-details__feature-item">
              <ParkingIcon />
              <span>{features.parkingType?.label || 'No parking'}</span>
            </div>
            <div className="listing-dashboard-details__feature-item">
              <KitchenIcon />
              <span>{features.kitchenType?.display || 'No kitchen'}</span>
            </div>
          </div>
        </div>

        {/* Safety Features */}
        <div className="listing-dashboard-details__safety">
          <h3 className="listing-dashboard-details__subtitle">Safety Features</h3>
          <div className="listing-dashboard-details__safety-grid">
            {safetyFeatures.map((feature) => (
              <div key={feature.id} className="listing-dashboard-details__safety-item">
                <span className="listing-dashboard-details__safety-icon">
                  {getSafetyIcon(feature.name)}
                </span>
                <span>{feature.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
