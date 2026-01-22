/**
 * Internal Emergency Page - HOLLOW COMPONENT PATTERN
 * Split Lease - Emergency Management Dashboard
 *
 * Admin-only dashboard for managing guest-reported emergencies.
 *
 * Architecture:
 * - NO business logic in this file
 * - ALL state and handlers come from useInternalEmergencyPageLogic hook
 * - ONLY renders UI based on pre-calculated state
 */

import React from 'react';
import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useInternalEmergencyPageLogic } from './useInternalEmergencyPageLogic.js';
import EmergencyList from './components/EmergencyList.jsx';
import EmergencyDetails from './components/EmergencyDetails.jsx';
import CommunicationPanel from './components/CommunicationPanel.jsx';
import './InternalEmergencyPage.css';

export default function InternalEmergencyPage() {
  // ============================================================================
  // LOGIC HOOK - Provides all state and handlers
  // ============================================================================

  const {
    // Core data
    emergencies,
    selectedEmergency,
    teamMembers,
    presetMessages,
    presetEmails,

    // UI State
    loading,
    error,
    alertMessage,
    alertType,

    // Filter state
    statusFilter,
    setStatusFilter,

    // Action handlers
    handleSelectEmergency,
    handleRefresh,
    handleAssign,
    handleUpdateStatus,
    handleUpdateVisibility,
    handleSendSMS,
    handleSendEmail,
    showAlert,
    clearAlert,
  } = useInternalEmergencyPageLogic();

  // ============================================================================
  // RENDER - Loading State
  // ============================================================================

  if (loading) {
    return (
      <div className="internal-emergency-page">
        <Header />
        <main className="emergency-main">
          <div className="emergency-container">
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading emergencies...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Error State
  // ============================================================================

  if (error) {
    return (
      <div className="internal-emergency-page">
        <Header />
        <main className="emergency-main">
          <div className="emergency-container">
            <div className="error-state">
              <div className="error-icon">&#9888;</div>
              <h2>Unable to Load Emergencies</h2>
              <p className="error-message">{error}</p>
              <button onClick={handleRefresh} className="btn btn--primary">
                Reload Page
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Main Page
  // ============================================================================

  return (
    <div className="internal-emergency-page">
      <Header />

      <main className="emergency-main">
        <div className="emergency-container">
          {/* Page Header */}
          <header className="emergency-header">
            <h1>Emergency Management Dashboard</h1>
            <p className="emergency-subtitle">
              Manage guest-reported emergencies and communicate with guests
            </p>
          </header>

          {/* Alert Banner */}
          {alertMessage && (
            <div className={`alert alert--${alertType}`} role="alert">
              <span>{alertMessage}</span>
              <button
                onClick={clearAlert}
                className="alert__close"
                aria-label="Close alert"
              >
                &times;
              </button>
            </div>
          )}

          {/* Main Content */}
          <div className="emergency-layout">
            {/* Sidebar - Emergency List */}
            <aside className="emergency-sidebar">
              {/* Filter Controls */}
              <div className="filter-controls">
                <label htmlFor="status-filter" className="filter-label">
                  Filter by Status:
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Statuses</option>
                  <option value="REPORTED">Reported</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
                <button
                  onClick={handleRefresh}
                  className="btn btn--secondary btn--small"
                  title="Refresh emergencies"
                >
                  Refresh
                </button>
              </div>

              <EmergencyList
                emergencies={emergencies}
                selectedEmergency={selectedEmergency}
                onSelectEmergency={handleSelectEmergency}
              />
            </aside>

            {/* Main Panel */}
            <div className="emergency-main-panel">
              {selectedEmergency ? (
                <>
                  <EmergencyDetails
                    emergency={selectedEmergency}
                    teamMembers={teamMembers}
                    onAssign={handleAssign}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateVisibility={handleUpdateVisibility}
                    onAlert={showAlert}
                  />

                  <CommunicationPanel
                    emergency={selectedEmergency}
                    presetMessages={presetMessages}
                    presetEmails={presetEmails}
                    onSendSMS={handleSendSMS}
                    onSendEmail={handleSendEmail}
                    onRefresh={handleRefresh}
                    onAlert={showAlert}
                  />
                </>
              ) : (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <h2>No Emergency Selected</h2>
                  <p>Select an emergency from the list to view details and communicate with the guest.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
