/**
 * Schedule Selector Component
 * Displays ideal split schedule
 * Guest view: Shows days
 * Host view: Shows nights (converted from days)
 * Field: Recent Days Selected (jsonb)
 */

export default function ScheduleSelector({ userData, userType, recentDaysSelected, isViewingOwnProfile }) {
  const isGuest = userType?.includes('Guest');

  return (
    <div className="schedule-selector-section">
      <h3 className="section-subtitle">Ideal Split Schedule</h3>
      <p className="section-description">
        {isGuest ? 'Your preferred days' : 'Preferred schedule (nights)'}
      </p>
      <div className="schedule-placeholder">
        <p className="placeholder-text">Schedule selector component placeholder</p>
        <p className="placeholder-hint">Displays {isGuest ? 'days' : 'nights'} selection</p>
      </div>
    </div>
  );
}
