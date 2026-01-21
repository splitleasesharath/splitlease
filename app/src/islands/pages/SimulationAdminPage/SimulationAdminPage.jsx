/**
 * SimulationAdminPage - Admin tool for managing usability testing simulation testers
 *
 * Hollow component pattern: All logic is in useSimulationAdminPageLogic.js
 * This component only handles rendering.
 *
 * Features:
 * - Tester selector dropdown with search
 * - Tester info display with progress visualization
 * - Reset to Day 1 action
 * - Advance to Day 2 action
 * - Statistics dashboard showing distribution by step
 * - URL parameter support (?tester=id)
 */

import useSimulationAdminPageLogic from './useSimulationAdminPageLogic.js';
import TesterSelector from './components/TesterSelector.jsx';
import TesterInfoDisplay from './components/TesterInfoDisplay.jsx';
import StatisticsBar from './components/StatisticsBar.jsx';
import ConfirmationModal from './components/ConfirmationModal.jsx';
import './SimulationAdminPage.css';

export default function SimulationAdminPage() {
  const {
    // List state
    testers,
    totalCount,
    currentPage,
    totalPages,
    isLoading,

    // Filter state
    searchText,

    // Selection state
    selectedTester,

    // Statistics state
    formattedStats,

    // Step config
    stepConfig,

    // Modal state
    isResetModalOpen,
    isAdvanceModalOpen,

    // Processing state
    isProcessing,
    error,

    // Data fetching
    fetchTesters,

    // Action handlers
    resetToDay1,
    advanceToDay2,

    // UI handlers
    handleTesterSelect,
    handleSearchChange,
    handlePageChange,
    clearSelection,
    openResetModal,
    closeResetModal,
    openAdvanceModal,
    closeAdvanceModal,

    // Computed values
    getStepLabel,
    getStepColor,
    formatDate,
    getTesterDisplayName,
  } = useSimulationAdminPageLogic();

  return (
    <div className="simulation-admin-page">
      {/* Header */}
      <header className="simulation-admin-header">
        <div className="header-content">
          <h1 className="header-title">Simulation Admin</h1>
          <p className="header-subtitle">
            Manage usability testing testers and their progress
          </p>
        </div>
        <button
          onClick={fetchTesters}
          className="refresh-button"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* Main Content */}
      <main className="simulation-admin-main">
        {/* Statistics Bar */}
        <StatisticsBar
          stats={formattedStats}
          totalCount={totalCount}
          getStepColor={getStepColor}
        />

        {/* Error State */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={fetchTesters} className="retry-button">
              Retry
            </button>
          </div>
        )}

        {/* Tester Selection Section */}
        <section className="selection-section">
          <h2 className="section-title">Select Tester</h2>

          <TesterSelector
            testers={testers}
            selectedTester={selectedTester}
            searchText={searchText}
            isLoading={isLoading}
            currentPage={currentPage}
            totalPages={totalPages}
            onSelect={handleTesterSelect}
            onSearchChange={handleSearchChange}
            onPageChange={handlePageChange}
            getTesterDisplayName={getTesterDisplayName}
            getStepLabel={getStepLabel}
          />

          {selectedTester && (
            <button
              onClick={clearSelection}
              className="clear-selection-button"
            >
              Clear Selection
            </button>
          )}
        </section>

        {/* Tester Info Section */}
        {selectedTester && (
          <TesterInfoDisplay
            tester={selectedTester}
            stepConfig={stepConfig}
            onResetToDay1={openResetModal}
            onAdvanceToDay2={openAdvanceModal}
            getStepLabel={getStepLabel}
            getStepColor={getStepColor}
            formatDate={formatDate}
            getTesterDisplayName={getTesterDisplayName}
            isProcessing={isProcessing}
          />
        )}

        {/* Empty State (no tester selected) */}
        {!selectedTester && !isLoading && (
          <div className="empty-state">
            <EmptyIcon />
            <h3 className="empty-title">No Tester Selected</h3>
            <p className="empty-text">
              Select a tester from the dropdown above to view their progress and manage their simulation.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="simulation-admin-footer">
        <p className="footer-text">
          Split Lease Admin Dashboard - Internal Use Only
        </p>
      </footer>

      {/* Reset Confirmation Modal */}
      {isResetModalOpen && selectedTester && (
        <ConfirmationModal
          title="Reset to Day 1"
          message={`Are you sure you want to reset ${getTesterDisplayName(selectedTester)} to Day 1? This will set their usability step back to "Not Started".`}
          confirmLabel="Reset to Day 1"
          confirmVariant="warning"
          onConfirm={resetToDay1}
          onCancel={closeResetModal}
          isProcessing={isProcessing}
        />
      )}

      {/* Advance Confirmation Modal */}
      {isAdvanceModalOpen && selectedTester && (
        <ConfirmationModal
          title="Advance to Day 2"
          message={`Are you sure you want to advance ${getTesterDisplayName(selectedTester)} to Day 2? This will set their usability step to "Day 2 - Introduction".`}
          confirmLabel="Advance to Day 2"
          confirmVariant="primary"
          onConfirm={advanceToDay2}
          onCancel={closeAdvanceModal}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

// ===== ICONS =====

function EmptyIcon() {
  return (
    <svg
      className="empty-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
