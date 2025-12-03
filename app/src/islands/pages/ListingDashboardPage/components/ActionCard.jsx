export default function ActionCard({ icon, label, onClick, badge }) {
  return (
    <button onClick={onClick} className="listing-dashboard-action-card">
      {/* Badge */}
      {badge && <span className="listing-dashboard-action-card__badge" />}

      {/* Icon Container */}
      <div className="listing-dashboard-action-card__icon">{icon}</div>

      {/* Label */}
      <span className="listing-dashboard-action-card__label">{label}</span>
    </button>
  );
}
