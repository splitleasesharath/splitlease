// Default icon for rules without a database icon URL
const DefaultRuleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

// Renders the rule icon from database URL or falls back to default
const RuleIcon = ({ icon, name }) => {
  if (icon) {
    return (
      <img
        src={icon}
        alt={name}
        width="20"
        height="20"
        className="listing-dashboard-rules__icon-img"
      />
    );
  }
  return <DefaultRuleIcon />;
};

// Guest icons
const GenderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" />
  </svg>
);

const GuestsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function RulesSection({ listing, onEdit }) {
  const houseRules = listing?.houseRules || [];
  const preferredGender = listing?.preferredGender?.display || 'Any';
  const maxGuests = listing?.maxGuests || 2;

  return (
    <div id="rules" className="listing-dashboard-section">
      {/* Section Header */}
      <div className="listing-dashboard-section__header">
        <h2 className="listing-dashboard-section__title">Rules</h2>
        <button className="listing-dashboard-section__edit" onClick={onEdit}>
          edit
        </button>
      </div>

      {/* Content */}
      <div className="listing-dashboard-rules">
        {/* House Rules Grid */}
        <div className="listing-dashboard-rules__grid">
          {houseRules.map((rule) => (
            <div key={rule.id} className="listing-dashboard-rules__item">
              <span className="listing-dashboard-rules__icon">
                <RuleIcon icon={rule.icon} name={rule.name} />
              </span>
              <span className="listing-dashboard-rules__name">{rule.name}</span>
            </div>
          ))}
        </div>

        {/* Guest Restrictions */}
        <div className="listing-dashboard-rules__restrictions">
          <div className="listing-dashboard-rules__item">
            <span className="listing-dashboard-rules__icon">
              <GenderIcon />
            </span>
            <span className="listing-dashboard-rules__name">
              Gender Preferred: {preferredGender}
            </span>
          </div>
          <div className="listing-dashboard-rules__item">
            <span className="listing-dashboard-rules__icon">
              <GuestsIcon />
            </span>
            <span className="listing-dashboard-rules__name">
              {maxGuests} max guests allowed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
