/**
 * StatisticsBar - Display tester distribution by usability step
 *
 * Features:
 * - Visual bars showing count per step
 * - Color-coded by day (Day 1 = blue, Day 2 = green, Completed = purple)
 * - Total count display
 */

import './StatisticsBar.css';

export default function StatisticsBar({
  stats,
  totalCount,
  getStepColor,
}) {
  if (!stats || stats.length === 0) {
    return null;
  }

  // Calculate max count for scaling bars
  const maxCount = Math.max(...stats.map(s => s.count), 1);

  return (
    <div className="statistics-bar">
      <div className="statistics-bar__header">
        <h2 className="statistics-bar__title">Tester Distribution</h2>
        <span className="statistics-bar__total">
          {totalCount} total tester{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="statistics-bar__grid">
        {stats.map((stat) => (
          <div key={stat.step} className="statistics-bar__item">
            <div className="statistics-bar__item-header">
              <span className="statistics-bar__item-label">{stat.label}</span>
              <span className="statistics-bar__item-count">{stat.count}</span>
            </div>
            <div className="statistics-bar__item-bar-container">
              <div
                className={`statistics-bar__item-bar statistics-bar__item-bar--${getStepColor(stat.step)}`}
                style={{
                  width: `${(stat.count / maxCount) * 100}%`,
                  minWidth: stat.count > 0 ? '4px' : '0',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="statistics-bar__legend">
        <div className="statistics-bar__legend-item">
          <span className="statistics-bar__legend-dot statistics-bar__legend-dot--gray" />
          <span>Not Started</span>
        </div>
        <div className="statistics-bar__legend-item">
          <span className="statistics-bar__legend-dot statistics-bar__legend-dot--blue" />
          <span>Day 1</span>
        </div>
        <div className="statistics-bar__legend-item">
          <span className="statistics-bar__legend-dot statistics-bar__legend-dot--green" />
          <span>Day 2</span>
        </div>
        <div className="statistics-bar__legend-item">
          <span className="statistics-bar__legend-dot statistics-bar__legend-dot--purple" />
          <span>Completed</span>
        </div>
      </div>
    </div>
  );
}
