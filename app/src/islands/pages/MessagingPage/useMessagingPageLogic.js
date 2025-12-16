/**
 * useMessagingPageLogic - WITH SUPABASE REALTIME
 *
 * All business logic for the Messaging Page following Hollow Component Pattern.
 *
 * Responsibilities:
 * - Authentication check (redirect if not logged in)
 * - Fetch threads on mount via Edge Function
 * - URL parameter sync (?thread=THREAD_ID)
 * - Fetch messages when thread selected
 * - Message sending handler
 * - REAL-TIME: Subscribe to thread channel for instant message delivery
 * - REAL-TIME: Typing indicators via Presence
 *
 * NO FALLBACK: Real data only, no mock data in production
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { checkAuthStatus, validateTokenAndFetchUser, getFirstName, getAvatarUrl } from '../../../lib/auth.js';
import { getUserId } from '../../../lib/secureStorage.js';
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

  // ============================================================================
  // REALTIME STATE
  // ============================================================================
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState(null);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Ref to track if initial load is complete
  const initialLoadDone = useRef(false);

  // ============================================================================
  // AUTH CHECK ON MOUNT
  // ============================================================================
  useEffect(() => {
    async function init() {
      try {
        // Step 1: Check basic auth status
        const isAuthenticated = await checkAuthStatus();

        if (!isAuthenticated) {
          console.log('[Messaging] User not authenticated, redirecting to home');
          setAuthState({ isChecking: false, shouldRedirect: true });
          setTimeout(() => {
            window.location.href = '/?login=true';
          }, 100);
          return;
        }

        // Step 2: Get user data using the gold standard pattern
        // Use clearOnFailure: false to preserve session even if profile fetch fails
        const userData = await validateTokenAndFetchUser({ clearOnFailure: false });

        if (userData) {
          // User profile fetched successfully
          setUser({
            id: userData.userId,
            email: userData.email,
            bubbleId: userData.userId,  // userId from validateTokenAndFetchUser is the Bubble _id
            firstName: userData.firstName,
            lastName: userData.fullName?.split(' ').slice(1).join(' ') || '',
            profilePhoto: userData.profilePhoto
          });
          console.log('[Messaging] User data loaded:', userData.firstName);
        } else {
          // Fallback: Use session metadata if profile fetch failed but session is valid
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email,
              bubbleId: session.user.user_metadata?.user_id || getUserId() || session.user.id,
              firstName: session.user.user_metadata?.first_name || getFirstName() || session.user.email?.split('@')[0] || 'User',
              lastName: session.user.user_metadata?.last_name || '',
              profilePhoto: getAvatarUrl() || null
            };
            setUser(fallbackUser);
            console.log('[Messaging] Using fallback user data from session:', fallbackUser.firstName);
          } else {
            // No session at all - redirect
            console.log('[Messaging] No valid session, redirecting');
            setAuthState({ isChecking: false, shouldRedirect: true });
            setTimeout(() => {
              window.location.href = '/?login=true';
            }, 100);
            return;
          }
        }

        setAuthState({ isChecking: false, shouldRedirect: false });

        // Fetch threads after auth is confirmed
        await fetchThreads();
        initialLoadDone.current = true;
      } catch (err) {
        console.error('[Messaging] Auth check failed:', err);
        setError('Failed to check authentication. Please refresh the page.');
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Ref to track if initial thread selection has been done
  const hasAutoSelectedThread = useRef(false);

  // ============================================================================
  // URL PARAM SYNC FOR THREAD SELECTION (runs once when threads load)
  // ============================================================================
  useEffect(() => {
    if (!initialLoadDone.current || threads.length === 0 || hasAutoSelectedThread.current) return;

    const params = new URLSearchParams(window.location.search);
    const threadId = params.get('thread');

    if (threadId) {
      const thread = threads.find(t => t._id === threadId);
      if (thread) {
        hasAutoSelectedThread.current = true;
        handleThreadSelectInternal(thread);
      }
    } else if (threads.length > 0) {
      hasAutoSelectedThread.current = true;
      handleThreadSelectInternal(threads[0]);
    }
  }, [threads]);

  // ============================================================================
  // REALTIME SUBSCRIPTION
  // ============================================================================
  useEffect(() => {
    if (!selectedThread || authState.isChecking || !user?.bubbleId) return;

    const channelName = `thread-${selectedThread._id}`;
    console.log('[Realtime] Subscribing to channel:', channelName);

    const channel = supabase.channel(channelName);

    // Listen for new messages via broadcast
    channel.on('broadcast', { event: 'new_message' }, (payload) => {
      console.log('[Realtime] New message received:', payload);

      const messageData = payload.payload?.message;
      if (messageData && messageData.thread_id === selectedThread._id) {
        // Add message to state (avoid duplicates)
        setMessages(prev => {
          if (prev.some(m => m._id === messageData._id)) return prev;

          // Transform to UI format
          const transformedMessage = {
            _id: messageData._id,
            message_body: messageData.message_body,
            sender_name: messageData.is_split_bot ? 'Split Bot' : messageData.sender_name,
            sender_avatar: messageData.sender_avatar,
            sender_type: messageData.is_split_bot ? 'splitbot' :
              (messageData.sender_id === payload.payload?.host_user ? 'host' : 'guest'),
            is_outgoing: messageData.sender_id === user?.bubbleId,
            timestamp: new Date(messageData.created_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            }),
            call_to_action: messageData.call_to_action ? {
              type: messageData.call_to_action,
              message: 'View Details'
            } : undefined,
            split_bot_warning: messageData.split_bot_warning,
          };

          return [...prev, transformedMessage];
        });

        // Clear typing indicator when message received
        setIsOtherUserTyping(false);
        setTypingUserName(null);
      }
    });

    // Listen for typing indicators via presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const typingUsers = Object.values(state)
        .flat()
        .filter(u => u.typing && u.user_id !== user?.bubbleId);

      if (typingUsers.length > 0) {
        setIsOtherUserTyping(true);
        setTypingUserName(typingUsers[0].user_name);
      } else {
        setIsOtherUserTyping(false);
        setTypingUserName(null);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Subscribed to channel:', channelName);
        // Track presence for typing indicators
        await channel.track({
          user_id: user?.bubbleId,
          user_name: user?.firstName || 'User',
          typing: false,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    // Cleanup
    return () => {
      console.log('[Realtime] Unsubscribing from channel:', channelName);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [selectedThread?._id, authState.isChecking, user?.bubbleId]);

  // ============================================================================
  // TYPING INDICATOR
  // ============================================================================

  /**
   * Track typing state via Presence
   */
  const trackTyping = useCallback(async (isTyping) => {
    if (!channelRef.current || !user) return;

    try {
      await channelRef.current.track({
        user_id: user.bubbleId,
        user_name: user.firstName || 'User',
        typing: isTyping,
        typing_at: isTyping ? new Date().toISOString() : null,
        online_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Realtime] Failed to track typing:', err);
    }
  }, [user]);

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
   * After sending, Realtime will deliver the message to all subscribers
   */
  async function sendMessage() {
    if (!messageInput.trim() || !selectedThread || isSending) return;

    try {
      setIsSending(true);

      // Clear typing indicator immediately
      trackTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

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
        // Clear input immediately
        setMessageInput('');

        // Note: We no longer need to fetch messages or threads here!
        // The Realtime subscription will automatically add the new message
        // when the database trigger broadcasts it.

        // However, for the sender's immediate feedback, add optimistically
        // (the Realtime broadcast might also arrive, but we'll dedupe)
        const optimisticMessage = {
          _id: result.data.message_id,
          message_body: messageInput.trim(),
          sender_name: 'You',
          sender_type: 'guest', // Will be corrected by Realtime if wrong
          is_outgoing: true,
          timestamp: new Date().toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
          }),
        };

        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m._id === optimisticMessage._id)) return prev;
          return [...prev, optimisticMessage];
        });

      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
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
    setIsOtherUserTyping(false);
    setTypingUserName(null);
    fetchMessages(thread._id);
  }

  /**
   * Handle thread selection from user interaction
   */
  const handleThreadSelect = useCallback((thread) => {
    setSelectedThread(thread);
    setMessages([]);
    setThreadInfo(null);
    setIsOtherUserTyping(false);
    setTypingUserName(null);

    // Update URL
    const params = new URLSearchParams(window.location.search);
    params.set('thread', thread._id);
    window.history.replaceState({}, '', `?${params.toString()}`);

    // Fetch messages for selected thread
    fetchMessages(thread._id);
  }, []);

  /**
   * Handle message input change with typing indicator
   */
  const handleMessageInputChange = useCallback((value) => {
    if (value.length <= 1000) {
      setMessageInput(value);

      // Track typing
      trackTyping(true);

      // Clear typing after 2 seconds of no input
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        trackTyping(false);
      }, 2000);
    }
  }, [trackTyping]);

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

    // Realtime state
    isOtherUserTyping,
    typingUserName,

    // Handlers
    handleThreadSelect,
    handleMessageInputChange,
    handleSendMessage,
    handleRetry,
  };
}
