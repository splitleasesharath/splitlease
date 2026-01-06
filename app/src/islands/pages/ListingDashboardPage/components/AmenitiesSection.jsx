// Amenity icon mapping
const amenityIcons = {
  'Air Conditioned': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v8" /><path d="m4.93 10.93 1.41 1.41" /><path d="M2 18h2" /><path d="M20 18h2" /><path d="m19.07 10.93-1.41 1.41" /><path d="M22 22H2" /><path d="m8 6 4-4 4 4" /><path d="M16 18a4 4 0 0 0-8 0" />
    </svg>
  ),
  'Closet': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /><path d="M3 12h4" /><path d="M17 12h4" />
    </svg>
  ),
  'Hangers': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a2 2 0 0 0-2 2c0 .74.4 1.39 1 1.73V7h2V5.73c.6-.34 1-.99 1-1.73a2 2 0 0 0-2-2Z" /><path d="M12 7 2 17h20Z" />
    </svg>
  ),
  'Towels and Linens': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="6" x="3" y="3" rx="1" /><rect width="18" height="6" x="3" y="9" rx="1" /><rect width="18" height="6" x="3" y="15" rx="1" />
    </svg>
  ),
  'TV': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="15" x="2" y="7" rx="2" ry="2" /><polyline points="17 2 12 7 7 2" />
    </svg>
  ),
  'WiFi': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13a10 10 0 0 1 14 0" /><path d="M8.5 16.5a5 5 0 0 1 7 0" /><path d="M2 8.82a15 15 0 0 1 20 0" /><line x1="12" x2="12.01" y1="20" y2="20" />
    </svg>
  ),
  'Doorman': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  'Laundry Room': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="20" x="3" y="2" rx="2" /><circle cx="12" cy="13" r="5" /><path d="M12 8v1" /><path d="M6 6h.01" /><path d="M10 6h.01" />
    </svg>
  ),
  'Package Room': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  ),
  'Elevator': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="20" x="3" y="2" rx="2" /><path d="M12 6v12" /><path d="m9 9-3 3 3 3" /><path d="m15 9 3 3-3 3" />
    </svg>
  ),
  'Common Outdoor Space': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-7l-2-2" /><path d="M17 8v.8A6 6 0 0 1 13.8 14h-1.6A6 6 0 0 1 9 8.8V8a3 3 0 1 1 6 0Z" /><path d="M12 2v3" />
    </svg>
  ),
  'Bike Storage': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18.5" cy="17.5" r="3.5" /><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="15" cy="5" r="1" /><path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </svg>
  ),
};

// Default icon for unknown amenities
const DefaultIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
  </svg>
);

// Empty state component - clickable tag to add amenities
const EmptyAmenityTag = ({ onClick }) => (
  <button
    type="button"
    className="listing-dashboard-amenities__empty-tag"
    onClick={onClick}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </svg>
    <span>No amenities selected</span>
  </button>
);

export default function AmenitiesSection({ listing, onEdit }) {
  const inUnitAmenities = listing?.inUnitAmenities || [];
  const buildingAmenities = listing?.buildingAmenities || [];

  const getIcon = (name) => amenityIcons[name] || <DefaultIcon />;

  const hasInUnitAmenities = inUnitAmenities.length > 0;
  const hasBuildingAmenities = buildingAmenities.length > 0;

  return (
    <div id="amenities" className="listing-dashboard-section">
      {/* Section Header */}
      <div className="listing-dashboard-section__header">
        <h2 className="listing-dashboard-section__title">Amenities</h2>
        <button className="listing-dashboard-section__edit" onClick={onEdit}>
          edit
        </button>
      </div>

      {/* Content */}
      <div className="listing-dashboard-amenities">
        {/* In-unit Amenities */}
        <div className="listing-dashboard-amenities__group">
          <h3 className="listing-dashboard-amenities__group-title">In-unit</h3>
          {hasInUnitAmenities ? (
            <div className="listing-dashboard-amenities__grid">
              {inUnitAmenities.map((amenity) => (
                <div key={amenity.id} className="listing-dashboard-amenities__item">
                  <span className="listing-dashboard-amenities__icon">
                    {getIcon(amenity.name)}
                  </span>
                  <span className="listing-dashboard-amenities__name">{amenity.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyAmenityTag onClick={onEdit} />
          )}
        </div>

        {/* Building/Neighborhood Amenities */}
        <div className="listing-dashboard-amenities__group">
          <h3 className="listing-dashboard-amenities__group-title">Building / Neighborhood</h3>
          {hasBuildingAmenities ? (
            <div className="listing-dashboard-amenities__grid">
              {buildingAmenities.map((amenity) => (
                <div key={amenity.id} className="listing-dashboard-amenities__item">
                  <span className="listing-dashboard-amenities__icon">
                    {getIcon(amenity.name)}
                  </span>
                  <span className="listing-dashboard-amenities__name">{amenity.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyAmenityTag onClick={onEdit} />
          )}
        </div>
      </div>
    </div>
  );
}
