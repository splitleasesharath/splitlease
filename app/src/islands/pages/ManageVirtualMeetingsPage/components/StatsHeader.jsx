/**
 * StatsHeader - Statistics display for the page header
 */

export default function StatsHeader({
  totalRequests,
  pendingRequests,
  confirmedMeetings,
  completedMeetings
}) {
  return (
    <div className="manage-vm__stats">
      <div className="manage-vm__stat">
        <span className="manage-vm__stat-value">{totalRequests}</span>
        <span className="manage-vm__stat-label">Total</span>
      </div>
      <div className="manage-vm__stat manage-vm__stat--warning">
        <span className="manage-vm__stat-value">{pendingRequests}</span>
        <span className="manage-vm__stat-label">Pending</span>
      </div>
      <div className="manage-vm__stat manage-vm__stat--success">
        <span className="manage-vm__stat-value">{confirmedMeetings}</span>
        <span className="manage-vm__stat-label">Confirmed</span>
      </div>
      <div className="manage-vm__stat manage-vm__stat--info">
        <span className="manage-vm__stat-value">{completedMeetings}</span>
        <span className="manage-vm__stat-label">Completed</span>
      </div>
    </div>
  );
}
