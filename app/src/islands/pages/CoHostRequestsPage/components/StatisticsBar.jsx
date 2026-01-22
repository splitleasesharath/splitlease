/**
 * StatisticsBar - Displays status counts as clickable chips
 *
 * Shows quick statistics for each request status.
 * Clicking a status chip filters the list to that status.
 */

export default function StatisticsBar({
  stats,
  totalCount,
  onStatusClick,
  activeStatus,
}) {
  if (!stats || stats.length === 0) {
    return null;
  }

  return (
    <div className="statistics-bar">
      <div className="statistics-header">
        <h2 className="statistics-title">Overview</h2>
        <span className="statistics-total">{totalCount} total requests</span>
      </div>

      <div className="statistics-chips">
        {/* All status chip */}
        <button
          onClick={() => onStatusClick('')}
          className={`stat-chip ${activeStatus === '' ? 'stat-chip-active' : ''}`}
        >
          <span className="stat-chip-label">All</span>
          <span className="stat-chip-count">{totalCount}</span>
        </button>

        {/* Individual status chips */}
        {stats.map((stat) => (
          <button
            key={stat.status}
            onClick={() => onStatusClick(stat.status)}
            className={`stat-chip stat-chip-${stat.color} ${
              activeStatus === stat.status ? 'stat-chip-active' : ''
            }`}
          >
            <StatusDot color={stat.color} />
            <span className="stat-chip-label">{stat.label}</span>
            <span className="stat-chip-count">{stat.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatusDot({ color }) {
  return (
    <span className={`status-dot status-dot-${color}`} />
  );
}
