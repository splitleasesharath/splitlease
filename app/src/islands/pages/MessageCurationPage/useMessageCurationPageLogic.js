import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { useToast } from '../../shared/Toast';

/**
 * useMessageCurationPageLogic - Logic hook for Message Curation Admin Page
 *
 * Hollow Component Pattern: ALL business logic lives here.
 * The page component only handles rendering.
 *
 * Handles:
 * - Fetching and displaying threads with pagination
 * - Search filtering by listing name, user email
 * - Selecting threads and viewing messages
 * - Message moderation actions (delete, forward)
 * - Split Bot messaging functionality
 * - URL parameter support (?thread=id&message=id)
 *
 * Database tables: thread, _message, user, listing
 * Edge Function: message-curation
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Items per page for thread list
const PAGE_SIZE = 50;

/**
 * @typedef {Object} User
 * @property {string} id - User ID (_id from database)
 * @property {string} email - User email
 * @property {string} firstName - First name
 * @property {string} lastName - Last name
 * @property {string|null} profilePhoto - Profile photo URL
 */

/**
 * @typedef {Object} Thread
 * @property {string} id - Thread ID
 * @property {string} createdAt - Created timestamp
 * @property {string} modifiedAt - Modified timestamp
 * @property {User|null} guest - Guest user
 * @property {User|null} host - Host user
 * @property {{id: string, name: string}|null} listing - Associated listing
 */

/**
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} body - Message content
 * @property {string} createdAt - Created timestamp
 * @property {string} senderType - 'guest' | 'host' | 'splitbot'
 * @property {boolean} isSplitBotWarning - If sent by Split Bot
 * @property {boolean} isForwarded - If message was forwarded
 * @property {User|null} originator - Message sender
 */

export default function useMessageCurationPageLogic() {
  const { showToast } = useToast();

  // ===== THREAD STATE =====
  const [threads, setThreads] = useState([]);
  const [totalThreadCount, setTotalThreadCount] = useState(0);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // ===== MESSAGE STATE =====
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [currentThread, setCurrentThread] = useState(null);

  // ===== MODAL STATE =====
  const [isDeleteMessageModalOpen, setIsDeleteMessageModalOpen] = useState(false);
  const [isDeleteThreadModalOpen, setIsDeleteThreadModalOpen] = useState(false);

  // ===== PROCESSING STATE =====
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // ===== SPLIT BOT STATE =====
  const [splitBotMessageText, setSplitBotMessageText] = useState('');
  const [splitBotRecipientType, setSplitBotRecipientType] = useState('guest');

  // ===== EFFECTS =====

  // Initial data fetch
  useEffect(() => {
    fetchThreads();
  }, []);

  // Refetch when search or page changes
  useEffect(() => {
    fetchThreads();
  }, [searchText, currentPage]);

  // Handle URL parameters for direct thread/message selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const threadId = params.get('thread');
    const messageId = params.get('message');

    if (threadId && threads.length > 0 && !selectedThreadId) {
      handleThreadSelect(threadId);
    }
  }, [threads]);

  // ===== API HELPERS =====

  /**
   * Call the Edge Function with an action
   */
  async function callEdgeFunction(action, payload = {}) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to perform this action');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/message-curation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Request failed');
    }

    return result.data;
  }

  // ===== DATA FETCHING =====

  /**
   * Fetch threads with current filters
   */
  const fetchThreads = useCallback(async () => {
    try {
      setIsLoadingThreads(true);
      setError(null);

      const data = await callEdgeFunction('getThreads', {
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        search: searchText || undefined,
      });

      setThreads(data.threads || []);
      setTotalThreadCount(data.total || 0);
    } catch (err) {
      console.error('[useMessageCurationPageLogic] Fetch threads error:', err);
      setError(err.message);
      showToast(err.message || 'Failed to fetch threads', 'error');
    } finally {
      setIsLoadingThreads(false);
    }
  }, [currentPage, searchText, showToast]);

  /**
   * Fetch messages for a specific thread
   */
  const fetchThreadMessages = useCallback(async (threadId) => {
    if (!threadId) return;

    try {
      setIsLoadingMessages(true);
      setError(null);

      const data = await callEdgeFunction('getThreadMessages', { threadId });

      setMessages(data.messages || []);
      setCurrentThread(data.thread || null);
    } catch (err) {
      console.error('[useMessageCurationPageLogic] Fetch messages error:', err);
      setError(err.message);
      showToast(err.message || 'Failed to fetch messages', 'error');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [showToast]);

  /**
   * Fetch single message details
   */
  const fetchMessageDetails = useCallback(async (messageId) => {
    if (!messageId) return;

    try {
      const data = await callEdgeFunction('getMessage', { messageId });
      setSelectedMessage(data.message || null);
    } catch (err) {
      console.error('[useMessageCurationPageLogic] Fetch message error:', err);
      showToast(err.message || 'Failed to fetch message details', 'error');
    }
  }, [showToast]);

  // ===== ACTION HANDLERS =====

  /**
   * Handle thread selection
   */
  const handleThreadSelect = useCallback((threadId) => {
    setSelectedThreadId(threadId);
    setSelectedMessage(null);
    setSplitBotMessageText('');

    // Update URL
    const url = new URL(window.location.href);
    if (threadId) {
      url.searchParams.set('thread', threadId);
      url.searchParams.delete('message');
    } else {
      url.searchParams.delete('thread');
      url.searchParams.delete('message');
    }
    window.history.replaceState({}, '', url.toString());

    // Fetch messages for this thread
    if (threadId) {
      fetchThreadMessages(threadId);
    } else {
      setMessages([]);
      setCurrentThread(null);
    }
  }, [fetchThreadMessages]);

  /**
   * Handle message selection (click on message in conversation)
   */
  const handleMessageClick = useCallback((message) => {
    setSelectedMessage(message);

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('message', message.id);
    window.history.replaceState({}, '', url.toString());
  }, []);

  /**
   * Handle search text change
   */
  const handleSearchChange = useCallback((text) => {
    setSearchText(text);
    setCurrentPage(1); // Reset to first page
  }, []);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedThreadId(null);
    setSelectedMessage(null);
    setMessages([]);
    setCurrentThread(null);
    setSplitBotMessageText('');

    // Clear URL params
    const url = new URL(window.location.href);
    url.searchParams.delete('thread');
    url.searchParams.delete('message');
    window.history.replaceState({}, '', url.toString());
  }, []);

  /**
   * Delete selected message (soft delete)
   */
  const handleDeleteMessage = useCallback(async () => {
    if (!selectedMessage) return;

    try {
      setIsProcessing(true);
      await callEdgeFunction('deleteMessage', { messageId: selectedMessage.id });

      // Remove from local state
      setMessages(prev => prev.filter(m => m.id !== selectedMessage.id));
      setSelectedMessage(null);
      setIsDeleteMessageModalOpen(false);

      showToast('Message deleted successfully', 'success');
    } catch (err) {
      console.error('[useMessageCurationPageLogic] Delete message error:', err);
      showToast(err.message || 'Failed to delete message', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMessage, showToast]);

  /**
   * Delete all messages in thread (soft delete)
   */
  const handleDeleteThread = useCallback(async () => {
    if (!selectedThreadId) return;

    try {
      setIsProcessing(true);
      const result = await callEdgeFunction('deleteThread', { threadId: selectedThreadId });

      // Clear messages from local state
      setMessages([]);
      setSelectedMessage(null);
      setIsDeleteThreadModalOpen(false);

      showToast(`Deleted ${result.deletedCount} messages from thread`, 'success');
    } catch (err) {
      console.error('[useMessageCurationPageLogic] Delete thread error:', err);
      showToast(err.message || 'Failed to delete thread', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedThreadId, showToast]);

  /**
   * Forward selected message to support
   */
  const handleForwardMessage = useCallback(async () => {
    if (!selectedMessage) return;

    try {
      setIsProcessing(true);
      await callEdgeFunction('forwardMessage', { messageId: selectedMessage.id });

      // Update message in local state
      setMessages(prev => prev.map(m =>
        m.id === selectedMessage.id ? { ...m, isForwarded: true } : m
      ));
      setSelectedMessage(prev => prev ? { ...prev, isForwarded: true } : null);

      showToast('Message forwarded to support', 'success');
    } catch (err) {
      console.error('[useMessageCurationPageLogic] Forward message error:', err);
      showToast(err.message || 'Failed to forward message', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMessage, showToast]);

  /**
   * Send Split Bot message
   */
  const handleSendSplitBotMessage = useCallback(async () => {
    if (!selectedThreadId || !splitBotMessageText.trim()) return;

    try {
      setIsProcessing(true);
      const result = await callEdgeFunction('sendSplitBotMessage', {
        threadId: selectedThreadId,
        messageBody: splitBotMessageText.trim(),
        recipientType: splitBotRecipientType,
      });

      // Add new message to local state
      const newMessage = {
        id: result.message.id,
        body: result.message.body,
        createdAt: result.message.createdAt,
        senderType: 'splitbot',
        isSplitBotWarning: true,
        isForwarded: false,
        originator: null, // Split Bot doesn't have a profile
      };
      setMessages(prev => [...prev, newMessage]);

      // Clear input
      setSplitBotMessageText('');

      showToast('Split Bot message sent', 'success');
    } catch (err) {
      console.error('[useMessageCurationPageLogic] Send Split Bot message error:', err);
      showToast(err.message || 'Failed to send Split Bot message', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedThreadId, splitBotMessageText, splitBotRecipientType, showToast]);

  /**
   * Apply Split Bot message template
   */
  const applySplitBotTemplate = useCallback((templateKey) => {
    const templates = {
      redacted_contact_info: "We noticed your message contained contact information. For your safety and security, we've removed it. Please use Split Lease messaging for all communications.",
      limit_messages: "We noticed a high volume of messages in this conversation. Please consolidate your messages to help keep the conversation organized.",
      lease_documents_signed: "Great news! Your lease documents have been signed and processed. You can now proceed with your move-in arrangements.",
    };

    if (templates[templateKey]) {
      setSplitBotMessageText(templates[templateKey]);
    }
  }, []);

  // ===== MODAL HANDLERS =====

  const openDeleteMessageModal = useCallback(() => {
    if (selectedMessage) {
      setIsDeleteMessageModalOpen(true);
    }
  }, [selectedMessage]);

  const closeDeleteMessageModal = useCallback(() => {
    setIsDeleteMessageModalOpen(false);
  }, []);

  const openDeleteThreadModal = useCallback(() => {
    if (selectedThreadId) {
      setIsDeleteThreadModalOpen(true);
    }
  }, [selectedThreadId]);

  const closeDeleteThreadModal = useCallback(() => {
    setIsDeleteThreadModalOpen(false);
  }, []);

  // ===== COMPUTED VALUES =====

  /**
   * Total number of pages
   */
  const totalPages = useMemo(() => {
    return Math.ceil(totalThreadCount / PAGE_SIZE);
  }, [totalThreadCount]);

  /**
   * Get display name for a user
   */
  const getUserDisplayName = useCallback((user) => {
    if (!user) return 'Unknown';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || 'Unknown';
  }, []);

  /**
   * Get thread display label
   */
  const getThreadDisplayLabel = useCallback((thread) => {
    if (!thread) return '';
    const listingName = thread.listing?.name || 'No Listing';
    const guestEmail = thread.guest?.email || 'No Guest';
    return `${listingName} - ${guestEmail}`;
  }, []);

  /**
   * Format date for display
   */
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  /**
   * Get sender color class based on type
   */
  const getSenderColorClass = useCallback((senderType) => {
    switch (senderType) {
      case 'guest':
        return 'sender-guest';
      case 'host':
        return 'sender-host';
      case 'splitbot':
        return 'sender-splitbot';
      default:
        return 'sender-unknown';
    }
  }, []);

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard', 'success');
    } catch (err) {
      console.error('Copy to clipboard failed:', err);
      showToast('Failed to copy', 'error');
    }
  }, [showToast]);

  return {
    // ===== THREAD STATE =====
    threads,
    totalThreadCount,
    selectedThreadId,
    searchText,
    isLoadingThreads,
    currentPage,
    totalPages,

    // ===== MESSAGE STATE =====
    messages,
    selectedMessage,
    isLoadingMessages,
    currentThread,

    // ===== MODAL STATE =====
    isDeleteMessageModalOpen,
    isDeleteThreadModalOpen,

    // ===== PROCESSING STATE =====
    isProcessing,
    error,

    // ===== SPLIT BOT STATE =====
    splitBotMessageText,
    splitBotRecipientType,
    setSplitBotMessageText,
    setSplitBotRecipientType,

    // ===== DATA FETCHING =====
    fetchThreads,
    fetchThreadMessages,
    fetchMessageDetails,

    // ===== ACTION HANDLERS =====
    handleThreadSelect,
    handleMessageClick,
    handleSearchChange,
    handlePageChange,
    clearSelection,
    handleDeleteMessage,
    handleDeleteThread,
    handleForwardMessage,
    handleSendSplitBotMessage,
    applySplitBotTemplate,

    // ===== MODAL HANDLERS =====
    openDeleteMessageModal,
    closeDeleteMessageModal,
    openDeleteThreadModal,
    closeDeleteThreadModal,

    // ===== COMPUTED VALUES =====
    getUserDisplayName,
    getThreadDisplayLabel,
    formatDate,
    getSenderColorClass,
    copyToClipboard,
  };
}
