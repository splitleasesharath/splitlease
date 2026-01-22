/**
 * UserInfoHeader - Email + datetime display
 *
 * Shows the current user's email and real-time clock
 * for the simulation interface.
 */

export default function UserInfoHeader({ userEmail, currentDateTime }) {
  const formatDateTime = (date) => {
    if (!date) return '';

    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="user-info-header">
      <p className="user-info-header__email">
        {userEmail || 'Unknown User'}
      </p>
      <p className="user-info-header__datetime">
        {formatDateTime(currentDateTime)}
      </p>
    </div>
  );
}
