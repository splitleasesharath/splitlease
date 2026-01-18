import { useListingDashboard } from '../context/ListingDashboardContext';

// Default icon for amenities without a database icon URL
const DefaultIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
  </svg>
);

// Renders the amenity icon from database URL or falls back to default
const AmenityIcon = ({ icon, name }) => {
  if (icon) {
    return (
      <img
        src={icon}
        alt={name}
        width="20"
        height="20"
        className="listing-dashboard-amenities__icon-img"
      />
    );
  }
  return <DefaultIcon />;
};

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

export default function AmenitiesSection() {
  const { listing, handleEditSection } = useListingDashboard();
  const inUnitAmenities = listing?.inUnitAmenities || [];
  const buildingAmenities = listing?.buildingAmenities || [];

  const hasInUnitAmenities = inUnitAmenities.length > 0;
  const hasBuildingAmenities = buildingAmenities.length > 0;

  return (
    <div id="amenities" className="listing-dashboard-section">
      {/* Section Header */}
      <div className="listing-dashboard-section__header">
        <h2 className="listing-dashboard-section__title">Amenities</h2>
        <button className="listing-dashboard-section__edit" onClick={() => handleEditSection('amenities')}>
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
                    <AmenityIcon icon={amenity.icon} name={amenity.name} />
                  </span>
                  <span className="listing-dashboard-amenities__name">{amenity.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyAmenityTag onClick={() => handleEditSection('amenities')} />
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
                    <AmenityIcon icon={amenity.icon} name={amenity.name} />
                  </span>
                  <span className="listing-dashboard-amenities__name">{amenity.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyAmenityTag onClick={() => handleEditSection('amenities', 'building')} />
          )}
        </div>
      </div>
    </div>
  );
}
