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
 *
 * DEV MODE: Set USE_MOCK_DATA to true to bypass auth and use mock data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkAuthStatus } from '../../../lib/auth.js';
import { supabase } from '../../../lib/supabase.js';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/messages`;

// ============================================================================
// DEV MODE: Toggle this to bypass auth and use mock data
// ============================================================================
const USE_MOCK_DATA = true;

const MOCK_THREADS = [
  {
    _id: 'thread_1',
    contact_name: 'Sarah Johnson',
    contact_avatar: null,
    property_name: 'Cozy Studio in Williamsburg',
    last_message_preview: 'Looking forward to meeting you!',
    last_message_time: '2:30 PM',
    unread_count: 2,
    is_with_splitbot: false,
  },
  {
    _id: 'thread_2',
    contact_name: 'Michael Chen',
    contact_avatar: null,
    property_name: 'Spacious 1BR in East Village',
    last_message_preview: 'The dates work perfectly for me.',
    last_message_time: 'Yesterday',
    unread_count: 0,
    is_with_splitbot: false,
  },
  {
    _id: 'thread_3',
    contact_name: 'Split Bot',
    contact_avatar: null,
    property_name: null,
    last_message_preview: 'Your proposal has been submitted!',
    last_message_time: 'Dec 10',
    unread_count: 0,
    is_with_splitbot: true,
  },
];

const MOCK_MESSAGES = {
  thread_1: [
    {
      _id: 'msg_1',
      message_body: 'Hi! I saw your listing and I\'m very interested in the space.',
      sender_name: 'You',
      sender_type: 'guest',
      is_outgoing: true,
      timestamp: 'Dec 12, 2:15 PM',
    },
    {
      _id: 'msg_2',
      message_body: 'Thanks for reaching out! The space is available for your dates. Would you like to schedule a viewing?',
      sender_name: 'Sarah Johnson',
      sender_type: 'host',
      is_outgoing: false,
      timestamp: 'Dec 12, 2:25 PM',
    },
    {
      _id: 'msg_3',
      message_body: 'Looking forward to meeting you!',
      sender_name: 'Sarah Johnson',
      sender_type: 'host',
      is_outgoing: false,
      timestamp: 'Dec 12, 2:30 PM',
    },
  ],
  thread_2: [
    {
      _id: 'msg_4',
      message_body: 'Hi Michael, are you available for a split lease starting January?',
      sender_name: 'You',
      sender_type: 'guest',
      is_outgoing: true,
      timestamp: 'Dec 11, 10:00 AM',
    },
    {
      _id: 'msg_5',
      message_body: 'The dates work perfectly for me.',
      sender_name: 'Michael Chen',
      sender_type: 'host',
      is_outgoing: false,
      timestamp: 'Dec 11, 11:30 AM',
    },
  ],
  thread_3: [
    {
      _id: 'msg_6',
      message_body: 'Your proposal has been submitted! The host has 48 hours to respond.',
      sender_name: 'Split Bot',
      sender_type: 'splitbot',
      is_outgoing: false,
      timestamp: 'Dec 10, 3:00 PM',
    },
  ],
};

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
      // DEV MODE: Skip auth and use mock data
      if (USE_MOCK_DATA) {
        console.log('🔧 DEV MODE: Using mock data, skipping auth');
        setAuthState({ isChecking: false, shouldRedirect: false });
        setUser({ email: 'demo@splitlease.com', id: 'demo_user' });
        setThreads(MOCK_THREADS);
        setIsLoading(false);
        initialLoadDone.current = true;
        return;
      }

      try {
        // checkAuthStatus() returns a boolean, not an object
        const isAuthenticated = await checkAuthStatus();

        if (!isAuthenticated) {
          console.log('❌ Messaging: User not authenticated, redirecting to home');
          setAuthState({ isChecking: false, shouldRedirect: true });
          // Redirect after short delay to show loading state
          setTimeout(() => {
            window.location.href = '/?login=true';
          }, 100);
          return;
        }

        // Get user data from Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }

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
    // DEV MODE: Use mock messages
    if (USE_MOCK_DATA) {
      setIsLoadingMessages(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      const mockMsgs = MOCK_MESSAGES[threadId] || [];
      const thread = MOCK_THREADS.find(t => t._id === threadId);
      setMessages(mockMsgs);
      setThreadInfo({
        contact_name: thread?.contact_name || 'Unknown',
        contact_avatar: thread?.contact_avatar,
        property_name: thread?.property_name,
      });
      setIsLoadingMessages(false);
      return;
    }

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

    // DEV MODE: Simulate sending
    if (USE_MOCK_DATA) {
      setIsSending(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Add the new message to messages
      const newMsg = {
        _id: `msg_${Date.now()}`,
        message_body: messageInput.trim(),
        sender_name: 'You',
        sender_type: 'guest',
        is_outgoing: true,
        timestamp: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, newMsg]);
      setMessageInput('');
      setIsSending(false);
      return;
    }

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
