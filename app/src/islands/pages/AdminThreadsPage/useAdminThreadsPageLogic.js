/**
 * useAdminThreadsPageLogic - All business logic for AdminThreadsPage
 *
 * This hook follows the Hollow Component pattern - ALL logic lives here,
 * the page component is purely presentational.
 *
 * State Management:
 * - threads: Raw thread data from API
 * - filteredThreads: Filtered view of threads
 * - messages: Messages for expanded thread
 * - UI state: loading, error, pagination, filters
 *
 * @returns {Object} All state and handlers for the page
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { checkAuthStatus } from '../../../lib/auth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PAGE_SIZE = 20;

/**
 * Derive sender type from message fields
 * @param {Object} message - Message object with Bubble field names
 * @param {string} hostUserId - Thread's host user ID
 * @param {string} guestUserId - Thread's guest user ID
 * @returns {'host'|'guest'|'bot-to-host'|'bot-to-guest'|'bot-to-both'|'unknown'}
 */
function deriveSenderType(message, hostUserId, guestUserId) {
  const isSplitBot = message['is Split Bot'];

  if (isSplitBot) {
    const visibleToHost = message['is Visible to Host'];
    const visibleToGuest = message['is Visible to Guest'];

    if (visibleToHost && !visibleToGuest) return 'bot-to-host';
    if (visibleToGuest && !visibleToHost) return 'bot-to-guest';
    return 'bot-to-both';
  }

  const originatorId = message['-Originator User'];
  if (originatorId === hostUserId) return 'host';
  if (originatorId === guestUserId) return 'guest';
  return 'unknown';
}

/**
 * Adapt thread data from Supabase to frontend model
 * @param {Object} rawThread - Raw thread from database
 * @returns {Object} Adapted thread object
 */
function adaptThread(rawThread) {
  return {
    id: rawThread._id,
    subject: rawThread['Thread Subject'] || 'No Subject',
    createdDate: rawThread['Created Date'],
    modifiedDate: rawThread['Modified Date'],
    lastMessageDate: rawThread['~Date Last Message'],
    callToAction: rawThread['Call to Action'],
    proposalId: rawThread.Proposal,
    listingId: rawThread.Listing,
    maskedEmail: rawThread['Masked Email'],
    fromLoggedOutUser: rawThread['from logged out user?'],

    // Host user
    host: rawThread.hostUser ? {
      id: rawThread.hostUser._id,
      name: rawThread.hostUser['Name - Full'] || 'Unknown Host',
      email: rawThread.hostUser.email,
      phone: rawThread.hostUser['Phone Number (as text)'],
      photo: rawThread.hostUser['Profile Photo'],
    } : null,

    // Guest user
    guest: rawThread.guestUser ? {
      id: rawThread.guestUser._id,
      name: rawThread.guestUser['Name - Full'] || 'Unknown Guest',
      email: rawThread.guestUser.email,
      phone: rawThread.guestUser['Phone Number (as text)'],
      photo: rawThread.guestUser['Profile Photo'],
    } : null,

    // Messages (adapted if present)
    messages: rawThread.threadMessages?.map(msg => adaptMessage(msg, rawThread)) || [],
    messageCount: rawThread.threadMessages?.length || 0,
  };
}

/**
 * Adapt message data from Supabase to frontend model
 * @param {Object} rawMessage - Raw message from database
 * @param {Object} rawThread - Parent thread for context
 * @returns {Object} Adapted message object
 */
function adaptMessage(rawMessage, rawThread) {
  const hostUserId = rawThread['-Host User'];
  const guestUserId = rawThread['-Guest User'];

  return {
    id: rawMessage._id,
    body: rawMessage['Message Body'] || '',
    createdDate: rawMessage['Created Date'],
    senderType: deriveSenderType(rawMessage, hostUserId, guestUserId),
    isSplitBot: rawMessage['is Split Bot'] || false,
    isVisibleToHost: rawMessage['is Visible to Host'] ?? true,
    isVisibleToGuest: rawMessage['is Visible to Guest'] ?? true,
    isDeleted: rawMessage['is deleted (is hidden)'] || false,
    callToAction: rawMessage['Call to Action'],
    notLoggedInName: rawMessage['Not Logged In Name'],
    notLoggedInEmail: rawMessage['Not Logged In Email'],
  };
}

export function useAdminThreadsPageLogic() {
  // ===== AUTH STATE =====
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'authorized' | 'unauthorized'
  const [accessToken, setAccessToken] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // ===== DATA STATE =====
  const [threads, setThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ===== FILTER STATE =====
  const [filters, setFilters] = useState({
    guestEmail: '',
    hostEmail: '',
    threadId: '',
    proposalId: '',
  });

  // ===== PAGINATION =====
  const [page, setPage] = useState(1);

  // ===== UI STATE =====
  const [expandedThreadId, setExpandedThreadId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [reminderModal, setReminderModal] = useState(null);
  const [isSendingReminder, setIsSendingReminder] = useState(false);

  // ===== AUTH CHECK =====
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user, session } = await checkAuthStatus();

        if (!user || !session) {
          setAuthState('unauthorized');
          toast.error('Authentication required');
          window.location.href = '/?auth=login&redirect=' + encodeURIComponent(window.location.pathname);
          return;
        }

        setAccessToken(session.access_token);
        setCurrentUser(user);

        // Admin check will be done server-side
        // For now, assume authorized if authenticated
        setAuthState('authorized');
      } catch (err) {
        console.error('[AdminThreads] Auth check failed:', err);
        setAuthState('unauthorized');
        toast.error('Authentication failed');
      }
    };

    checkAuth();
  }, []);

  // ===== FETCH THREADS =====
  const fetchThreads = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'admin_get_all_threads',
          payload: {
            limit: 500,
            includeMessages: true,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch threads');
      }

      const adaptedThreads = (result.data || []).map(adaptThread);
      setThreads(adaptedThreads);
    } catch (err) {
      console.error('[AdminThreads] Fetch error:', err);
      setError(err.message);
      toast.error('Failed to load threads');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken && authState === 'authorized') {
      fetchThreads();
    }
  }, [accessToken, authState, fetchThreads]);

  // ===== FILTERING =====
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(v => v.trim() !== '');
  }, [filters]);

  const filteredThreads = useMemo(() => {
    let result = threads;

    if (filters.guestEmail) {
      const search = filters.guestEmail.toLowerCase();
      result = result.filter(t =>
        t.guest?.email?.toLowerCase().includes(search) ||
        t.maskedEmail?.toLowerCase().includes(search)
      );
    }

    if (filters.hostEmail) {
      const search = filters.hostEmail.toLowerCase();
      result = result.filter(t =>
        t.host?.email?.toLowerCase().includes(search)
      );
    }

    if (filters.threadId) {
      const search = filters.threadId.toLowerCase();
      result = result.filter(t =>
        t.id?.toLowerCase().includes(search)
      );
    }

    if (filters.proposalId) {
      const search = filters.proposalId.toLowerCase();
      result = result.filter(t =>
        t.proposalId?.toLowerCase().includes(search)
      );
    }

    // Sort by last message date (most recent first)
    return result.sort((a, b) => {
      const dateA = new Date(a.lastMessageDate || a.modifiedDate || 0);
      const dateB = new Date(b.lastMessageDate || b.modifiedDate || 0);
      return dateB - dateA;
    });
  }, [threads, filters]);

  // ===== PAGINATION =====
  const totalPages = Math.ceil(filteredThreads.length / PAGE_SIZE);

  const paginatedThreads = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredThreads.slice(start, start + PAGE_SIZE);
  }, [filteredThreads, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // ===== STATS =====
  const stats = useMemo(() => {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

    return {
      total: threads.length,
      withMessages: threads.filter(t => t.messageCount > 0).length,
      recentActivity: threads.filter(t => {
        const lastDate = new Date(t.lastMessageDate || t.modifiedDate || 0);
        return lastDate > dayAgo;
      }).length,
    };
  }, [threads]);

  // ===== HANDLERS =====
  const handleFilterChange = useCallback((field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      guestEmail: '',
      hostEmail: '',
      threadId: '',
      proposalId: '',
    });
  }, []);

  const handleSearch = useCallback(() => {
    // Filters are applied reactively, this is for explicit search button
    setPage(1);
  }, []);

  const handleToggleExpand = useCallback((threadId) => {
    setExpandedThreadId(prev => prev === threadId ? null : threadId);
  }, []);

  const handleViewMessages = useCallback((thread) => {
    // Toggle expansion to show messages
    setExpandedThreadId(prev => prev === thread.id ? null : thread.id);
  }, []);

  const handleDeleteThread = useCallback((thread) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Thread',
      message: `Are you sure you want to delete this thread? This will soft-delete the thread and all its messages. The data will be recoverable.`,
      confirmLabel: 'Delete Thread',
      confirmType: 'danger',
      onConfirm: async () => {
        try {
          setIsLoading(true);

          const response = await fetch(`${SUPABASE_URL}/functions/v1/messages`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              action: 'admin_delete_thread',
              payload: { threadId: thread.id },
            }),
          });

          const result = await response.json();

          if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to delete thread');
          }

          // Remove from local state
          setThreads(prev => prev.filter(t => t.id !== thread.id));
          toast.success('Thread deleted');
          setConfirmDialog(null);
        } catch (err) {
          console.error('[AdminThreads] Delete error:', err);
          toast.error(err.message || 'Failed to delete thread');
        } finally {
          setIsLoading(false);
        }
      },
    });
  }, [accessToken]);

  const handleCloseConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const handleOpenReminderModal = useCallback((thread) => {
    setReminderModal({
      isOpen: true,
      thread,
    });
  }, []);

  const handleCloseReminderModal = useCallback(() => {
    setReminderModal(null);
  }, []);

  const handleSendReminder = useCallback(async (options) => {
    const { threadId, recipientType, method } = options;

    setIsSendingReminder(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'admin_send_reminder',
          payload: { threadId, recipientType, method },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send reminder');
      }

      toast.success(`Reminder sent to ${recipientType}`);
      setReminderModal(null);
    } catch (err) {
      console.error('[AdminThreads] Reminder error:', err);
      toast.error(err.message || 'Failed to send reminder');
    } finally {
      setIsSendingReminder(false);
    }
  }, [accessToken]);

  const handleRetry = useCallback(() => {
    fetchThreads();
  }, [fetchThreads]);

  // ===== RETURN =====
  return {
    // Auth
    authState,
    currentUser,

    // Data
    threads,
    filteredThreads: paginatedThreads,
    stats,

    // Loading & Error
    isLoading,
    error,

    // Filters
    filters,
    hasActiveFilters,
    handleFilterChange,
    handleClearFilters,
    handleSearch,

    // Pagination
    page,
    setPage,
    totalPages,

    // UI State
    expandedThreadId,
    handleToggleExpand,

    // Actions
    handleViewMessages,
    handleDeleteThread,
    handleOpenReminderModal,
    handleSendReminder,
    isSendingReminder,

    // Dialogs
    confirmDialog,
    handleCloseConfirmDialog,
    reminderModal,
    handleCloseReminderModal,

    // Utility
    handleRetry,
  };
}
