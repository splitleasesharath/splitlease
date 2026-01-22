/**
 * ManageVirtualMeetingsPage - Admin Dashboard for Virtual Meeting Management
 *
 * This is a HOLLOW COMPONENT - it contains NO business logic.
 * All logic is delegated to useManageVirtualMeetingsPageLogic hook.
 *
 * Features:
 * - View new meeting requests (pending)
 * - View confirmed meetings
 * - Confirm/decline meeting requests
 * - Edit suggested dates
 * - Manage host availability (block/unblock time slots)
 * - Multi-timezone display
 *
 * @see useManageVirtualMeetingsPageLogic.js for all business logic
 */

import { useToast } from '../../shared/Toast';
import { useManageVirtualMeetingsPageLogic } from './useManageVirtualMeetingsPageLogic';

// Components
import SearchFilters from './components/SearchFilters';
import NewRequestsSection from './components/NewRequestsSection';
import ConfirmedMeetingsSection from './components/ConfirmedMeetingsSection';
import AvailabilityCalendar from './components/AvailabilityCalendar';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import ErrorState from './components/ErrorState';
import StatsHeader from './components/StatsHeader';

// Modals
import ConfirmMeetingModal from './modals/ConfirmMeetingModal';
import EditDatesModal from './modals/EditDatesModal';
import DeleteConfirmationModal from './modals/DeleteConfirmationModal';

export default function ManageVirtualMeetingsPage() {
  const { showToast } = useToast();
  const logic = useManageVirtualMeetingsPageLogic({ showToast });

  // Initial loading state
  if (logic.isLoading && logic.newRequests.length === 0 && logic.confirmedMeetings.length === 0) {
    return (
      <div className="manage-vm">
        <LoadingState message="Loading virtual meetings..." />
      </div>
    );
  }

  // Error state (when no data loaded)
  if (logic.error && logic.newRequests.length === 0 && logic.confirmedMeetings.length === 0) {
    return (
      <div className="manage-vm">
        <ErrorState
          message={logic.error}
          onRetry={logic.handleRetry}
        />
      </div>
    );
  }

  return (
    <div className="manage-vm">
      {/* Header with Stats */}
      <header className="manage-vm__header">
        <div className="manage-vm__header-content">
          <h1 className="manage-vm__title">Virtual Meeting Management</h1>
          <p className="manage-vm__subtitle">
            Manage meeting requests and host availability
          </p>
        </div>
        <StatsHeader
          totalRequests={logic.stats.totalRequests}
          pendingRequests={logic.stats.pendingRequests}
          confirmedMeetings={logic.stats.confirmedMeetings}
          completedMeetings={logic.stats.completedMeetings}
        />
      </header>

      {/* Error Banner (non-blocking) */}
      {logic.error && (
        <div className="manage-vm__error-banner">
          <span>{logic.error}</span>
          <button onClick={logic.handleDismissError}>Dismiss</button>
        </div>
      )}

      {/* Search and Filters */}
      <SearchFilters
        filters={logic.filters}
        onFilterChange={logic.handleFilterChange}
        onClearFilters={logic.handleClearFilters}
        hostOptions={logic.hostOptions}
      />

      {/* Main Content Grid */}
      <div className="manage-vm__content">
        {/* Left Column: Meeting Requests & Confirmed */}
        <div className="manage-vm__meetings">
          {/* New Requests Section */}
          <NewRequestsSection
            meetings={logic.filteredNewRequests}
            onConfirm={logic.handleOpenConfirmModal}
            onEdit={logic.handleOpenEditModal}
            onDelete={logic.handleOpenDeleteModal}
            isLoading={logic.isLoading}
          />

          {/* Confirmed Meetings Section */}
          <ConfirmedMeetingsSection
            meetings={logic.filteredConfirmedMeetings}
            onEdit={logic.handleOpenEditModal}
            onReschedule={logic.handleOpenRescheduleModal}
            isLoading={logic.isLoading}
          />
        </div>

        {/* Right Column: Availability Calendar */}
        <aside className="manage-vm__sidebar">
          <AvailabilityCalendar
            blockedSlots={logic.blockedSlots}
            selectedHost={logic.selectedHost}
            hosts={logic.hostOptions}
            onSelectHost={logic.handleSelectHost}
            onBlockSlot={logic.handleBlockSlot}
            onUnblockSlot={logic.handleUnblockSlot}
            onBlockFullDay={logic.handleBlockFullDay}
            onUnblockFullDay={logic.handleUnblockFullDay}
            weekStart={logic.calendarWeekStart}
            onNavigateWeek={logic.handleNavigateWeek}
            isLoading={logic.isLoadingBlockedSlots}
          />
        </aside>
      </div>

      {/* Modals */}
      {logic.modals.confirm.isOpen && (
        <ConfirmMeetingModal
          meeting={logic.modals.confirm.meeting}
          onConfirm={logic.handleConfirmMeeting}
          onClose={logic.handleCloseConfirmModal}
          isSubmitting={logic.isSubmitting}
        />
      )}

      {logic.modals.edit.isOpen && (
        <EditDatesModal
          meeting={logic.modals.edit.meeting}
          onSave={logic.handleUpdateMeetingDates}
          onClose={logic.handleCloseEditModal}
          isSubmitting={logic.isSubmitting}
        />
      )}

      {logic.modals.delete.isOpen && (
        <DeleteConfirmationModal
          meeting={logic.modals.delete.meeting}
          onConfirm={logic.handleDeleteMeeting}
          onClose={logic.handleCloseDeleteModal}
          isSubmitting={logic.isSubmitting}
        />
      )}

      {/* Loading Overlay (for background operations) */}
      {logic.isLoading && (logic.newRequests.length > 0 || logic.confirmedMeetings.length > 0) && (
        <div className="manage-vm__loading-overlay">
          <div className="manage-vm__loading-spinner" />
        </div>
      )}
    </div>
  );
}
