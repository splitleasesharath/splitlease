/**
 * EmptyState - Displayed when no data is available
 */

export default function EmptyState({ title, message }) {
  return (
    <div className="manage-vm__empty-state">
      <svg
        className="manage-vm__empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
      <h3 className="manage-vm__empty-title">{title}</h3>
      {message && <p className="manage-vm__empty-message">{message}</p>}
    </div>
  );
}
