/**
 * GuestDataSection Component
 * Section for deleting guest account data
 */

import React from 'react';

export default function GuestDataSection({
  guests,
  guestsLoading,
  selectedGuest,
  guestActionLoading,
  onGuestSelection,
  onClearGuestData,
  onDeleteGuestTestStatus,
}) {
  return (
    <section className="section">
      <h2 className="section-heading">Delete Guest Account Data</h2>
      <div className="section-content guest-section">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="guestDropdown">Choose a Guest Account</label>
            <select
              id="guestDropdown"
              className="dropdown"
              value={selectedGuest?.id || ''}
              onChange={(e) => onGuestSelection(e.target.value)}
              disabled={guestsLoading}
            >
              <option value="">
                {guestsLoading ? 'Loading guests...' : 'Choose a Guest Account'}
              </option>
              {guests.map((guest) => (
                <option key={guest.id} value={guest.id}>
                  {guest.fullName || guest.email} ({guest.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="guestEmail">Guest Email Address</label>
            <input
              type="text"
              id="guestEmail"
              className="text-input readonly"
              readOnly
              placeholder="Insert Guest Email Address"
              value={selectedGuest?.email || ''}
            />
          </div>
          <div className="button-group">
            <button
              className={`btn btn-purple ${guestActionLoading === 'clearData' ? 'loading' : ''}`}
              onClick={onClearGuestData}
              disabled={guestActionLoading !== null}
            >
              Clear Threads, Proposals &amp; Data on Selected Guest
            </button>
          </div>
        </div>
        <div className="form-row">
          <button
            className={`btn btn-purple ${guestActionLoading === 'deleteTestStatus' ? 'loading' : ''}`}
            onClick={onDeleteGuestTestStatus}
            disabled={guestActionLoading !== null}
          >
            Delete Guest Usability Test Status &amp; Steps
          </button>
        </div>
      </div>
    </section>
  );
}
