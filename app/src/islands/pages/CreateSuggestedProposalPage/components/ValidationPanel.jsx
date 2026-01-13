/**
 * ValidationPanel - Preview calculated values before submission
 */

import { getDayName } from '../../../../lib/dayUtils.js';

export default function ValidationPanel({ selectedDays, reservationWeeks }) {
  // Generate pattern string from selected days
  const getPattern = () => {
    if (selectedDays.length === 0) return '-';

    const sortedDays = [...selectedDays].sort((a, b) => a - b);
    const dayNames = sortedDays.map(d => getDayName(d).slice(0, 3));
    return `${dayNames.join(', ')} (${sortedDays.length} nights/week)`;
  };

  return (
    <div className="csp-config-section csp-validation-panel">
      <h3>Validation Preview</h3>

      <div className="csp-validation-warning">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span>Before creating the proposal, make sure that the values below are correct and not weird data (like some values being 0)</span>
      </div>

      <div className="csp-validation-values">
        <div className="csp-validation-row">
          <span className="csp-validation-label">Guest Desired Pattern:</span>
          <span className="csp-validation-value">{getPattern()}</span>
        </div>
        <div className="csp-validation-row">
          <span className="csp-validation-label">Actual Reservation Span:</span>
          <span className="csp-validation-value">{reservationWeeks ? `${reservationWeeks} weeks` : '-'}</span>
        </div>
        <div className="csp-validation-row">
          <span className="csp-validation-label">Actual # of Weeks during 4 weeks:</span>
          <span className="csp-validation-value">{reservationWeeks ? Math.min(reservationWeeks, 4) : '-'}</span>
        </div>
      </div>
    </div>
  );
}
