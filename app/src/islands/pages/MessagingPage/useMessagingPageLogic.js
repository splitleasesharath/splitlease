/**
 * useMessagingPageLogic
 *
 * All business logic for the Messaging Page following Hollow Component Pattern.
 *
 * Responsibilities:
 * - Authentication check (redirect if not logged in)
 * - Fetch threads on mount via Edge Function
 * - URL parameter sync (?thread=THREAD_ID)
 * - Fetch messages when thread selected
 * - Message sending handler
 * - Real-time state management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkAuthStatus } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/messages`;

export function useMessagingPageLogic() {
  // ============================================================================
  // AUTH STATE
  // ============================================================================
  const [authState, setAuthState] = useState({
    isChecking: true,
    shouldRedirect: false
  });
  const [user, setUser] = useState(null);

  // ============================================================================
  // DATA STATE
  // ============================================================================
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadInfo, setThreadInfo] = useState(null);

  // ============================================================================
  // UI STATE
  // ============================================================================
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Ref to track if initial load is complete
  const initialLoadDone = useRef(false);

  // ============================================================================
  // AUTH CHECK ON MOUNT
  // ============================================================================
  useEffect(() => {
    async function init() {
      try {
        const authResult = await checkAuthStatus();

        if (!authResult.isAuthenticated) {
          setAuthState({ isChecking: false, shouldRedirect: true });
          // Redirect after short delay to show loading state
          setTimeout(() => {
            window.location.href = '/?login=true';
          }, 100);
          return;
        }

        setUser(authResult.user);
        setAuthState({ isChecking: false, shouldRedirect: false });

        // Fetch threads after auth is confirmed
        await fetchThreads();
        initialLoadDone.current = true;
      } catch (err) {
        console.error('Auth check failed:', err);
        setError('Failed to check authentication. Please refresh the page.');
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // ============================================================================
  // URL PARAM SYNC FOR THREAD SELECTION
  // ============================================================================
  useEffect(() => {
    if (!initialLoadDone.current || threads.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    const threadId = params.get('thread');

    if (threadId) {
      const thread = threads.find(t => t._id === threadId);
      if (thread) {
        // Only select if different from current
        if (!selectedThread || selectedThread._id !== threadId) {
          handleThreadSelectInternal(thread);
        }
      }
    } else if (threads.length > 0 && !selectedThread) {
      // Auto-select first thread if none selected and no URL param
      handleThreadSelectInternal(threads[0]);
    }
  }, [threads, initialLoadDone.current]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  /**
   * Fetch all threads for the authenticated user
   */
  async function fetchThreads() {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'get_threads',
          payload: {}
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch threads');
      }

      if (result.success) {
        setThreads(result.data.threads || []);
      } else {
        throw new Error(result.error || 'Failed to fetch threads');
      }
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Fetch messages for a specific thread
   */
  async function fetchMessages(threadId) {
    try {
      setIsLoadingMessages(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'get_messages',
          payload: { thread_id: threadId }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch messages');
      }

      if (result.success) {
        setMessages(result.data.messages || []);
        setThreadInfo(result.data.thread_info || null);
      } else {
        throw new Error(result.error || 'Failed to fetch messages');
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      // Don't set global error, just log it - user can still see threads
    } finally {
      setIsLoadingMessages(false);
    }
  }

  /**
   * Send a new message
   */
  async function sendMessage() {
    if (!messageInput.trim() || !selectedThread || isSending) return;

    try {
      setIsSending(true);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'send_message',
          payload: {
            thread_id: selectedThread._id,
            message_body: messageInput.trim(),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message');
      }

      if (result.success) {
        // Clear input
        setMessageInput('');

        // Refresh messages to show the new one
        await fetchMessages(selectedThread._id);

        // Update thread list to show updated last message
        await fetchThreads();
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Don't clear input on error so user can retry
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Internal thread selection (does not update URL, used by effect)
   */
  function handleThreadSelectInternal(thread) {
    setSelectedThread(thread);
    setMessages([]);
    setThreadInfo(null);
    fetchMessages(thread._id);
  }

  /**
   * Handle thread selection from user interaction
   */
  const handleThreadSelect = useCallback((thread) => {
    setSelectedThread(thread);
    setMessages([]);
    setThreadInfo(null);

    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('thread', thread._id);
    window.history.replaceState({}, '', `?${params.toString()}`);

    // Fetch messages for selected thread
    fetchMessages(thread._id);
  }, []);

  /**
   * Handle message input change
   */
  const handleMessageInputChange = useCallback((value) => {
    // Limit to 1000 characters as per plan
    if (value.length <= 1000) {
      setMessageInput(value);
    }
  }, []);

  /**
   * Handle send message
   */
  const handleSendMessage = useCallback(() => {
    sendMessage();
  }, [messageInput, selectedThread, isSending]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    fetchThreads();
  }, []);

  // ============================================================================
  // RETURN HOOK API
  // ============================================================================
  return {
    // Auth state
    authState,
    user,

    // Thread data
    threads,
    selectedThread,
    messages,
    threadInfo,

    // UI state
    isLoading,
    isLoadingMessages,
    error,
    messageInput,
    isSending,

    // Handlers
    handleThreadSelect,
    handleMessageInputChange,
    handleSendMessage,
    handleRetry,
  };
}
