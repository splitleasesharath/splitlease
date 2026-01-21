/**
 * HeaderSection Component
 *
 * Displays the house manual header with title, host info, and section controls.
 *
 * @param {Object} props
 * @param {string} props.title - Manual title
 * @param {string|null} props.hostName - Host's name
 * @param {string|null} props.propertyAddress - Property address
 * @param {string|null} props.arrivalDate - Guest arrival date
 * @param {number} props.sectionCount - Number of sections
 * @param {function} props.onExpandAll - Expand all sections handler
 * @param {function} props.onCollapseAll - Collapse all sections handler
 */
const HeaderSection = ({
  title,
  hostName = null,
  propertyAddress = null,
  arrivalDate = null,
  sectionCount = 0,
  onExpandAll,
  onCollapseAll,
}) => {
  // Format arrival date for display
  const formattedArrivalDate = arrivalDate
    ? new Date(arrivalDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <header className="vrhm-header">
      <div className="vrhm-header__top">
        <h1 className="vrhm-header__title">{title}</h1>
        <div className="vrhm-header__actions">
          <button
            type="button"
            className="vrhm-header__action-btn"
            onClick={onExpandAll}
            title="Expand all sections"
          >
            Expand All
          </button>
          <button
            type="button"
            className="vrhm-header__action-btn"
            onClick={onCollapseAll}
            title="Collapse all sections"
          >
            Collapse All
          </button>
        </div>
      </div>

      <div className="vrhm-header__meta">
        {hostName && (
          <p className="vrhm-header__host">
            Hosted by{' '}
            <span className="vrhm-header__host-name">{hostName}</span>
          </p>
        )}

        {propertyAddress && (
          <p className="vrhm-header__address">
            <span aria-hidden="true">&#128205;</span>
            {propertyAddress}
          </p>
        )}

        {formattedArrivalDate && (
          <p className="vrhm-header__arrival">
            <span className="vrhm-header__arrival-label">Check-in: </span>
            {formattedArrivalDate}
          </p>
        )}

        {sectionCount > 0 && (
          <p className="vrhm-header__section-count">
            {sectionCount} {sectionCount === 1 ? 'section' : 'sections'} in this
            manual
          </p>
        )}
      </div>
    </header>
  );
};

export default HeaderSection;
