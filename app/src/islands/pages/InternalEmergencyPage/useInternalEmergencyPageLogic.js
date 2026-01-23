/**
 * Internal Emergency Page Logic Hook
 * Split Lease - Emergency Management Dashboard
 *
 * Contains ALL business logic for the InternalEmergencyPage:
 * - State management
 * - Data fetching
 * - Event handlers
 * - Computed values
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchEmergencies,
  fetchEmergencyById,
  fetchTeamMembers,
  fetchPresetMessages,
  fetchPresetEmails,
  assignEmergency,
  updateEmergencyStatus,
  updateEmergencyVisibility,
  sendSMS,
  sendEmail,
} from '../../../lib/emergencyService.js';
import { checkAuthStatus } from '../../../lib/auth.js';

export function useInternalEmergencyPageLogic() {
  // ============================================================================
  // State
  // ============================================================================

  // Core data
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [presetMessages, setPresetMessages] = useState([]);
  const [presetEmails, setPresetEmails] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');

  // ============================================================================
  // Authentication Check
  // ============================================================================

  useEffect(() => {
    async function checkAuth() {
      try {
        const authResult = await checkAuthStatus();
        if (!authResult.authenticated) {
          window.location.href = '/?login=true&redirect=' + encodeURIComponent(window.location.pathname);
          return;
        }

        // Check admin status (will be validated by Edge Function anyway)
        if (!authResult.user?.admin) {
          setError('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }

        // Auth passed, load data
        loadInitialData();
      } catch (authError) {
        console.error('[InternalEmergencyPage] Auth check failed:', authError);
        setError('Authentication failed. Please log in again.');
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load all data in parallel
      const [emergencyData, teamData, presetMsgData, presetEmailData] = await Promise.all([
        fetchEmergencies({ status: statusFilter || undefined, limit: 100 }),
        fetchTeamMembers(),
        fetchPresetMessages(),
        fetchPresetEmails(),
      ]);

      setEmergencies(emergencyData || []);
      setTeamMembers(teamData || []);
      setPresetMessages(presetMsgData || []);
      setPresetEmails(presetEmailData || []);

      console.log('[InternalEmergencyPage] Loaded', emergencyData?.length || 0, 'emergencies');
    } catch (loadError) {
      console.error('[InternalEmergencyPage] Load error:', loadError);
      setError(loadError.message || 'Failed to load emergencies');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Reload when filter changes
  useEffect(() => {
    if (!loading && !error) {
      loadEmergencies();
    }
  }, [statusFilter]);

  const loadEmergencies = useCallback(async () => {
    try {
      const data = await fetchEmergencies({ status: statusFilter || undefined, limit: 100 });
      setEmergencies(data || []);
    } catch (loadError) {
      console.error('[InternalEmergencyPage] Refresh error:', loadError);
      showAlert('Failed to refresh emergencies', 'error');
    }
  }, [statusFilter]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSelectEmergency = useCallback(async (emergency) => {
    try {
      // Fetch full details including messages and emails
      const fullDetails = await fetchEmergencyById(emergency.id);
      setSelectedEmergency(fullDetails);
    } catch (fetchError) {
      console.error('[InternalEmergencyPage] Fetch details error:', fetchError);
      showAlert('Failed to load emergency details', 'error');
      // Fall back to basic data
      setSelectedEmergency(emergency);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await loadEmergencies();

    // Also refresh selected emergency if one is selected
    if (selectedEmergency) {
      try {
        const updated = await fetchEmergencyById(selectedEmergency.id);
        setSelectedEmergency(updated);
      } catch {
        // Ignore error, selected emergency might have been deleted
      }
    }
  }, [loadEmergencies, selectedEmergency]);

  const handleAssign = useCallback(async (emergencyId, assignedToUserId, guidanceInstructions) => {
    try {
      const updated = await assignEmergency(emergencyId, assignedToUserId, guidanceInstructions);
      showAlert('Emergency assigned successfully', 'success');

      // Refresh data
      await handleRefresh();

      // Update selected emergency
      if (selectedEmergency?.id === emergencyId) {
        const fullDetails = await fetchEmergencyById(emergencyId);
        setSelectedEmergency(fullDetails);
      }

      return updated;
    } catch (assignError) {
      console.error('[InternalEmergencyPage] Assign error:', assignError);
      showAlert(`Failed to assign emergency: ${assignError.message}`, 'error');
      throw assignError;
    }
  }, [selectedEmergency, handleRefresh]);

  const handleUpdateStatus = useCallback(async (emergencyId, status) => {
    try {
      const updated = await updateEmergencyStatus(emergencyId, status);
      showAlert(`Status updated to ${status}`, 'success');

      // Refresh data
      await handleRefresh();

      // Update selected emergency
      if (selectedEmergency?.id === emergencyId) {
        const fullDetails = await fetchEmergencyById(emergencyId);
        setSelectedEmergency(fullDetails);
      }

      return updated;
    } catch (statusError) {
      console.error('[InternalEmergencyPage] Status update error:', statusError);
      showAlert(`Failed to update status: ${statusError.message}`, 'error');
      throw statusError;
    }
  }, [selectedEmergency, handleRefresh]);

  const handleUpdateVisibility = useCallback(async (emergencyId, isHidden) => {
    try {
      const updated = await updateEmergencyVisibility(emergencyId, isHidden);
      showAlert(isHidden ? 'Emergency hidden' : 'Emergency visible', 'success');

      // Refresh data
      await handleRefresh();

      return updated;
    } catch (visibilityError) {
      console.error('[InternalEmergencyPage] Visibility update error:', visibilityError);
      showAlert(`Failed to update visibility: ${visibilityError.message}`, 'error');
      throw visibilityError;
    }
  }, [handleRefresh]);

  const handleSendSMS = useCallback(async (emergencyId, recipientPhone, messageBody) => {
    try {
      const result = await sendSMS(emergencyId, recipientPhone, messageBody);
      showAlert('SMS sent successfully', 'success');

      // Refresh to show in message history
      if (selectedEmergency?.id === emergencyId) {
        const fullDetails = await fetchEmergencyById(emergencyId);
        setSelectedEmergency(fullDetails);
      }

      return result;
    } catch (smsError) {
      console.error('[InternalEmergencyPage] SMS error:', smsError);
      showAlert(`Failed to send SMS: ${smsError.message}`, 'error');
      throw smsError;
    }
  }, [selectedEmergency]);

  const handleSendEmail = useCallback(async (emergencyId, emailData) => {
    try {
      const result = await sendEmail(emergencyId, emailData);
      showAlert('Email sent successfully', 'success');

      // Refresh to show in email history
      if (selectedEmergency?.id === emergencyId) {
        const fullDetails = await fetchEmergencyById(emergencyId);
        setSelectedEmergency(fullDetails);
      }

      return result;
    } catch (emailError) {
      console.error('[InternalEmergencyPage] Email error:', emailError);
      showAlert(`Failed to send email: ${emailError.message}`, 'error');
      throw emailError;
    }
  }, [selectedEmergency]);

  // ============================================================================
  // Alert Management
  // ============================================================================

  const showAlert = useCallback((message, type = 'success') => {
    setAlertMessage(message);
    setAlertType(type);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setAlertMessage('');
    }, 5000);
  }, []);

  const clearAlert = useCallback(() => {
    setAlertMessage('');
  }, []);

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
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
  };
}
