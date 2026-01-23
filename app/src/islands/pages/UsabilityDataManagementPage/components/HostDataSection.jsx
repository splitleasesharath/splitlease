/**
 * HostDataSection Component
 * Section for deleting host account data
 */

import React from 'react';

export default function HostDataSection({
  hosts,
  hostsLoading,
  selectedHost,
  hostActionLoading,
  onHostSelection,
  onClearHostData,
  onDeleteHostListings,
  onDeleteHostTestStatus,
}) {
  return (
    <section className="section">
      <h2 className="section-heading">Delete Host Account Data</h2>
      <div className="section-content host-section">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="hostDropdown">Choose A Host Account</label>
            <select
              id="hostDropdown"
              className="dropdown"
              value={selectedHost?.id || ''}
              onChange={(e) => onHostSelection(e.target.value)}
              disabled={hostsLoading}
            >
              <option value="">
                {hostsLoading ? 'Loading hosts...' : 'Choose A Host Account'}
              </option>
              {hosts.map((host) => (
                <option key={host.id} value={host.id}>
                  {host.fullName || host.email} ({host.email})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="hostEmail">Host Email Address</label>
            <input
              type="text"
              id="hostEmail"
              className="text-input readonly"
              readOnly
              placeholder="Insert Host Email Address"
              value={selectedHost?.email || ''}
            />
          </div>
          <div className="button-group">
            <button
              className={`btn btn-purple ${hostActionLoading === 'clearData' ? 'loading' : ''}`}
              onClick={onClearHostData}
              disabled={hostActionLoading !== null}
            >
              Clear threads, proposals and data on selected Host
            </button>
            <button
              className={`btn btn-navy ${hostActionLoading === 'deleteListings' ? 'loading' : ''}`}
              onClick={onDeleteHostListings}
              disabled={hostActionLoading !== null}
            >
              Delete Listings of selected Host
            </button>
          </div>
        </div>
        <div className="form-row">
          <button
            className={`btn btn-purple ${hostActionLoading === 'deleteTestStatus' ? 'loading' : ''}`}
            onClick={onDeleteHostTestStatus}
            disabled={hostActionLoading !== null}
          >
            Delete Host Usability Test Status &amp; Steps
          </button>
        </div>
      </div>
    </section>
  );
}
