import { useListingDashboard } from '../context/ListingDashboardContext';

export default function DescriptionSection() {
  const { listing, handleEditSection } = useListingDashboard();

  return (
    <div id="description" className="listing-dashboard-descriptions">
      {/* Description of Lodging */}
      <div className="listing-dashboard-section">
        <div className="listing-dashboard-section__header">
          <h2 className="listing-dashboard-section__title">Description of Lodging</h2>
          <button className="listing-dashboard-section__edit" onClick={() => handleEditSection('description')}>
            edit
          </button>
        </div>
        <div className="listing-dashboard-section__content">
          <p className="listing-dashboard-description__text">
            {listing?.description || 'No description provided.'}
          </p>
        </div>
      </div>

      {/* Neighborhood Description */}
      <div className="listing-dashboard-section">
        <div className="listing-dashboard-section__header">
          <h2 className="listing-dashboard-section__title">Neighborhood Description</h2>
          <button className="listing-dashboard-section__edit" onClick={() => handleEditSection('neighborhood')}>
            edit
          </button>
        </div>
        <div className="listing-dashboard-section__content">
          <p className="listing-dashboard-description__text">
            {listing?.descriptionNeighborhood || 'No neighborhood description provided.'}
          </p>
        </div>
      </div>
    </div>
  );
}
