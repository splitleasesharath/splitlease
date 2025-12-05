export default function DescriptionSection({ listing, onEditLodging, onEditNeighborhood }) {
  return (
    <div className="listing-dashboard-descriptions">
      {/* Description of Lodging */}
      <div className="listing-dashboard-section">
        <div className="listing-dashboard-section__header">
          <h2 className="listing-dashboard-section__title">Description of Lodging</h2>
          <button className="listing-dashboard-section__edit" onClick={onEditLodging}>
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
          <button className="listing-dashboard-section__edit" onClick={onEditNeighborhood}>
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
