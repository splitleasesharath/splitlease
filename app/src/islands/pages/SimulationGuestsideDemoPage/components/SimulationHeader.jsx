/**
 * SimulationHeader Component
 *
 * Displays the page header with user info and current date/time.
 */

import { User, Calendar } from 'lucide-react';

export function SimulationHeader({ currentUser, currentDateTime }) {
  const firstName = currentUser?.firstName ||
    currentUser?.['Name - First'] ||
    currentUser?.email?.split('@')[0] ||
    'Guest';

  return (
    <div className="simulation-header">
      <h1 className="simulation-header__title">Guest-Side Usability Simulation</h1>
      <p className="simulation-header__subtitle">
        Walk through the complete guest rental journey
      </p>

      <div className="simulation-header__info">
        {currentUser && (
          <div className="simulation-header__user">
            <User size={16} />
            <span>Logged in as {firstName}</span>
          </div>
        )}
        <div className="simulation-header__datetime">
          <Calendar size={16} />
          <span>{currentDateTime}</span>
        </div>
      </div>
    </div>
  );
}

export default SimulationHeader;
