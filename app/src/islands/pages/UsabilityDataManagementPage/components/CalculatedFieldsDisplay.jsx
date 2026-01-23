/**
 * CalculatedFieldsDisplay Component
 * Shows calculated pricing breakdown
 */

import React from 'react';

export default function CalculatedFieldsDisplay({
  dayPattern,
  pricing,
  reservationWeeks,
}) {
  return (
    <div className="calculated-fields">
      <div className="calc-field">
        <label>Guest Desired Pattern:</label>
        <span>{dayPattern || '-------'}</span>
      </div>
      <div className="calc-field">
        <label>T: 4 x weeks&apos; rent:</label>
        <span>4 weeks rent: ${pricing.fourWeeksRent || 0}</span>
      </div>
      <div className="calc-field">
        <label>Actual Reservation Span:</label>
        <span>{reservationWeeks || 0} weeks</span>
      </div>
      <div className="calc-field">
        <label>Actual # of Weeks:</label>
        <span>{pricing.actualWeeks || 0}</span>
      </div>
      <div className="calc-field">
        <label>Initial Payment:</label>
        <span>${pricing.initialPayment || 0}</span>
      </div>
      <div className="calc-field">
        <label>Nightly Price:</label>
        <span>${pricing.nightlyPrice || 0}</span>
      </div>
      <div className="calc-field total">
        <label>Total Reservation Price:</label>
        <span>${pricing.totalPrice || 0}</span>
      </div>
    </div>
  );
}
