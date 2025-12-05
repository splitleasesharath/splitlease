// Rule icons
const ruleIcons = {
  'Take Out Trash': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  'No Food In Sink': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" /><path d="M7 7v10a5 5 0 0 0 10 0V7" /><path d="M12 3v4" />
    </svg>
  ),
  'Lock Doors': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  'Wash Your Dishes': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" />
    </svg>
  ),
  'No Smoking Inside': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="4.93" x2="19.07" y1="4.93" y2="19.07" /><path d="M8 8v4h8" /><path d="M18 12v.01" /><path d="M18 8v.01" />
    </svg>
  ),
  'No Candles': (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="4.93" x2="19.07" y1="4.93" y2="19.07" /><path d="M12 6v1" /><path d="M9 10h6v8H9z" />
    </svg>
  ),
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

// Default icon
const DefaultIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

export default function RulesSection({ listing, onEdit }) {
  const houseRules = listing?.houseRules || [];
  const preferredGender = listing?.preferredGender?.display || 'Any';
  const maxGuests = listing?.maxGuests || 2;

  const getIcon = (name) => ruleIcons[name] || <DefaultIcon />;

  return (
    <div className="listing-dashboard-section">
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
                {getIcon(rule.name)}
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
