/**
 * SimulationComplete Component
 *
 * Displayed when the simulation is completed.
 * Shows a success message and option to reset.
 */

import { PartyPopper, RotateCcw } from 'lucide-react';

export function SimulationComplete({ selectedPath, onReset }) {
  return (
    <div className="simulation-complete">
      <div className="simulation-complete__icon">
        <PartyPopper size={64} />
      </div>

      <h2 className="simulation-complete__title">Simulation Complete!</h2>

      <p className="simulation-complete__message">
        Congratulations! You have successfully completed the guest-side rental journey
        through {selectedPath === 1 ? 'Path 1 (Host Accept)' : 'Path 2 (Host Counteroffer)'}.
      </p>

      <div className="simulation-complete__summary">
        <h3>What you experienced:</h3>
        <ul>
          <li>Marked yourself as a usability tester</li>
          <li>Received a virtual meeting invitation from a host</li>
          <li>
            {selectedPath === 1
              ? 'Had your proposal accepted by Host #2'
              : 'Received and accepted a counteroffer from Host #3'
            }
          </li>
          <li>Had lease documents drafted and house manual created</li>
          <li>Signed the lease and made initial payment</li>
        </ul>
      </div>

      <div className="simulation-complete__actions">
        <button
          className="simulation-complete__reset-button"
          onClick={onReset}
        >
          <RotateCcw size={18} />
          <span>Reset & Start Over</span>
        </button>
      </div>

      <p className="simulation-complete__note">
        Note: Test data will be automatically cleaned up after 72 hours.
      </p>
    </div>
  );
}

export default SimulationComplete;
