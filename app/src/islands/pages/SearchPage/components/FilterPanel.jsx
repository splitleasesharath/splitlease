/**
 * FilterPanel - Left sidebar with filters
 */
export function FilterPanel({
  isActive,
  selectedDays,
  onDaysChange,
  boroughs,
  selectedBorough,
  onBoroughChange,
  neighborhoods,
  selectedNeighborhoods,
  onNeighborhoodsChange,
  weekPattern,
  onWeekPatternChange,
  priceTier,
  onPriceTierChange,
  sortBy,
  onSortByChange
}) {
  return (
    <div className={`filter-panel ${isActive ? 'active' : ''}`}>
      <div className="filter-container">
        {/* Single Horizontal Filter Row - All filters inline */}
        <div className="horizontal-filters">
          {/* Borough Select */}
          <div className="filter-group compact">
            <label htmlFor="boroughSelect">Select Borough</label>
            <select
              id="boroughSelect"
              className="filter-select"
              value={selectedBorough}
              onChange={(e) => onBoroughChange(e.target.value)}
            >
              {boroughs.length === 0 ? (
                <option value="">Loading boroughs...</option>
              ) : (
                boroughs.map(borough => (
                  <option key={borough.id} value={borough.value}>
                    {borough.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Week Pattern */}
          <div className="filter-group compact">
            <label htmlFor="weekPattern">Select Week Pattern</label>
            <select
              id="weekPattern"
              className="filter-select"
              value={weekPattern}
              onChange={(e) => onWeekPatternChange(e.target.value)}
              aria-label="Filter by week pattern"
            >
              <option value="every-week">Every week</option>
              <option value="one-on-off">One week on, one week off</option>
              <option value="two-on-off">Two weeks on, two weeks off</option>
              <option value="one-three-off">One week on, three weeks off</option>
            </select>
          </div>

          {/* Price Tier */}
          <div className="filter-group compact">
            <label htmlFor="priceTier">Select Price Tier</label>
            <select
              id="priceTier"
              className="filter-select"
              value={priceTier}
              onChange={(e) => onPriceTierChange(e.target.value)}
              aria-label="Filter by price range"
            >
              <option value="under-200">&lt; $200/night</option>
              <option value="200-350">$200-$350/night</option>
              <option value="350-500">$350-$500/night</option>
              <option value="500-plus">$500+/night</option>
              <option value="all">All Prices</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="filter-group compact">
            <label htmlFor="sortBy">Sort By</label>
            <select
              id="sortBy"
              className="filter-select"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              aria-label="Sort listings by"
            >
              <option value="recommended">Our Recommendations</option>
              <option value="price-low">Price-Lowest to Highest</option>
              <option value="most-viewed">Most Viewed</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          {/* Neighborhood Dropdown */}
          <div className="filter-group compact">
            <label htmlFor="neighborhoodSelectMobile">Neighborhood</label>
            <select
              id="neighborhoodSelectMobile"
              className="filter-select"
              value={selectedNeighborhoods[0] || ''}
              onChange={(e) => {
                const value = e.target.value;
                onNeighborhoodsChange(value ? [value] : []);
              }}
            >
              <option value="">All Neighborhoods</option>
              {neighborhoods.map(neighborhood => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
