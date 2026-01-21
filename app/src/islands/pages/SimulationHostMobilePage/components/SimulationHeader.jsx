/**
 * Simulation Header Component
 * Displays page title, user info, and current date/time
 */

export default function SimulationHeader({ currentUser, currentDateTime }) {
  const userName = currentUser?.firstName ||
    currentUser?.['Name - First'] ||
    currentUser?.email?.split('@')[0] ||
    'Host';

  return (
    <header className="simulation-host-header">
      <h1 className="simulation-host-header__title">Host Simulation</h1>
      <p className="simulation-host-header__subtitle">
        Walk through the guest proposal workflow on mobile
      </p>
      <div className="simulation-host-header__info">
        <span className="simulation-host-header__user">
          👤 {userName}
        </span>
        <span className="simulation-host-header__datetime">
          🕐 {currentDateTime}
        </span>
      </div>
    </header>
  );
}
