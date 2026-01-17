/**
 * useHeaderMessagingPanelLogic
 *
 * All business logic for the Header Messaging Panel following Hollow Component Pattern.
 * Adapted from useMessagingPageLogic.js for the compact panel context.
 *
 * Responsibilities:
 * - Fetch threads on panel open
 * - Fetch messages when thread selected
 * - Message sending handler
 * - Real-time subscriptions for instant message delivery
 * - Typing indicators via Presence
 * - View state management (list vs thread)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { getUserId } from '../../../lib/secureStorage.js';
import { useCTAHandler } from '../../pages/MessagingPage/useCTAHandler.js';

/**
 * @param {object} options
 * @param {boolean} options.isOpen - Whether the panel is currently open
 * @param {string} options.userBubbleId - The user's Bubble ID
 * @param {string} options.userName - The user's first name (for typing indicator)
 * @param {string} options.userAvatar - The user's avatar URL
 * @param {function} options.onClose - Callback to close the panel
 */
export function useHeaderMessagingPanelLogic({
  isOpen,
  userBubbleId,
  userName,
  userAvatar,
  onClose,
}) {
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
  const [viewState, setViewState] = useState('list'); // 'list' | 'thread'
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

  // Track if threads have been loaded this session
  const hasLoadedThreads = useRef(false);

  // ============================================================================
  // CTA HANDLER (reuse from MessagingPage)
  // ============================================================================
  const user = { bubbleId: userBubbleId };
  const { handleCTAClick, getCTAButtonConfig } = useCTAHandler({
    user,
    selectedThread,
    threadInfo,
    onOpenModal: (modalName, context) => {
      // For panel, we close and navigate instead of opening modals
      onClose?.();
      // The CTA handler will have already navigated
    },
  });

  // ============================================================================
  // FETCH THREADS WHEN PANEL OPENS
  // ============================================================================
  useEffect(() => {
    // Only fetch if panel is open, we have a user ID, and haven't loaded yet
    if (isOpen && userBubbleId && !hasLoadedThreads.current) {
      fetchThreads();
    }
  }, [isOpen, userBubbleId]);

  // Reset when panel closes
  useEffect(() => {
    if (!isOpen) {
      // Keep threads cached but reset view
      setViewState('list');
      setSelectedThread(null);
      setMessages([]);
      setMessageInput('');
      setIsOtherUserTyping(false);
      setTypingUserName(null);
    }
  }, [isOpen]);

  // ============================================================================
  // REALTIME SUBSCRIPTION
  // ============================================================================
  useEffect(() => {
    if (!selectedThread || !userBubbleId || !isOpen) return;

    const channelName = `panel-messages-${selectedThread._id}`;
    console.log('[Panel Realtime] Subscribing to:', channelName);

    const channel = supabase.channel(channelName);

    // Listen for new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: '_message',
      },
      (payload) => {
        const newRow = payload.new;
        if (!newRow) return;

        // Client-side filter for this thread
        if (newRow['Associated Thread/Conversation'] !== selectedThread._id) {
          return;
        }

        const isOwnMessage = newRow['-Originator User'] === userBubbleId;

        // Add message to state (avoid duplicates)
        setMessages((prev) => {
          if (prev.some((m) => m._id === newRow._id)) return prev;

          const transformedMessage = {
            _id: newRow._id,
            message_body: newRow['Message Body'],
            sender_name: newRow['is Split Bot']
              ? 'Split Bot'
              : isOwnMessage
                ? 'You'
                : selectedThread.contact_name || 'User',
            sender_avatar: isOwnMessage ? userAvatar : undefined,
            sender_type: newRow['is Split Bot']
              ? 'splitbot'
              : newRow['-Originator User'] === newRow['-Host User']
                ? 'host'
                : 'guest',
            is_outgoing: isOwnMessage,
            timestamp: new Date(newRow['Created Date']).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }),
            call_to_action: newRow['Call to Action']
              ? { type: newRow['Call to Action'], message: 'View Details' }
              : undefined,
            split_bot_warning: newRow['Split Bot Warning'],
          };

          return [...prev, transformedMessage];
        });

        // Clear typing indicator when message received
        if (!isOwnMessage) {
          setIsOtherUserTyping(false);
          setTypingUserName(null);
        }
      }
    );

    // Listen for typing indicators via presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const typingUsers = Object.values(state)
        .flat()
        .filter((u) => u.typing && u.user_id !== userBubbleId);

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
        await channel.track({
          user_id: userBubbleId,
          user_name: userName || 'User',
          typing: false,
          online_at: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [selectedThread?._id, userBubbleId, isOpen]);

  // ============================================================================
  // TYPING INDICATOR
  // ============================================================================
  const trackTyping = useCallback(
    async (isTyping) => {
      if (!channelRef.current || !userBubbleId) return;

      try {
        await channelRef.current.track({
          user_id: userBubbleId,
          user_name: userName || 'User',
          typing: isTyping,
          typing_at: isTyping ? new Date().toISOString() : null,
          online_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[Panel Realtime] Failed to track typing:', err);
      }
    },
    [userBubbleId, userName]
  );

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

      const bubbleId = userBubbleId || getUserId();
      if (!bubbleId) {
        throw new Error('User ID not available');
      }

      // Query threads where user is host or guest
      // Uses RPC function because PostgREST .or() doesn't handle column names
      // with leading hyphens ("-Host User", "-Guest User") correctly
      const { data: threadsData, error: threadsError } = await supabase
        .rpc('get_user_threads', { user_id: bubbleId });

      if (threadsError) {
        throw new Error(`Failed to fetch threads: ${threadsError.message}`);
      }

      if (!threadsData || threadsData.length === 0) {
        setThreads([]);
        hasLoadedThreads.current = true;
        return;
      }

      // Collect contact IDs and listing IDs for batch lookup
      const contactIds = new Set();
      const listingIds = new Set();

      threadsData.forEach((thread) => {
        const hostId = thread['-Host User'];
        const guestId = thread['-Guest User'];
        const contactId = hostId === bubbleId ? guestId : hostId;
        if (contactId) contactIds.add(contactId);
        if (thread['Listing']) listingIds.add(thread['Listing']);
      });

      // Batch fetch contact user data
      let contactMap = {};
      if (contactIds.size > 0) {
        const { data: contacts } = await supabase
          .from('user')
          .select('_id, "Name - First", "Name - Last", "Profile Photo"')
          .in('_id', Array.from(contactIds));

        if (contacts) {
          contactMap = contacts.reduce((acc, contact) => {
            acc[contact._id] = {
              name:
                `${contact['Name - First'] || ''} ${contact['Name - Last'] || ''}`.trim() ||
                'Unknown User',
              avatar: contact['Profile Photo'],
            };
            return acc;
          }, {});
        }
      }

      // Batch fetch listing data
      let listingMap = {};
      if (listingIds.size > 0) {
        const { data: listings } = await supabase
          .from('listing')
          .select('_id, Name')
          .in('_id', Array.from(listingIds));

        if (listings) {
          listingMap = listings.reduce((acc, listing) => {
            acc[listing._id] = listing.Name || 'Unnamed Property';
            return acc;
          }, {});
        }
      }

      // Fetch unread message counts per thread for this user
      // Uses JSONB containment operator to check if user is in Unread Users array
      const threadIds = threadsData.map((t) => t._id);
      let unreadCountMap = {};
      if (threadIds.length > 0) {
        const { data: unreadData } = await supabase
          .from('_message')
          .select('"Associated Thread/Conversation"')
          .in('"Associated Thread/Conversation"', threadIds)
          .filter('"Unread Users"', 'cs', JSON.stringify([bubbleId]));

        if (unreadData) {
          // Count occurrences of each thread ID
          unreadCountMap = unreadData.reduce((acc, msg) => {
            const threadId = msg['Associated Thread/Conversation'];
            acc[threadId] = (acc[threadId] || 0) + 1;
            return acc;
          }, {});
        }
      }

      // Transform threads to UI format
      const transformedThreads = threadsData.map((thread) => {
        const hostId = thread['-Host User'];
        const guestId = thread['-Guest User'];
        const contactId = hostId === bubbleId ? guestId : hostId;
        const contact = contactId ? contactMap[contactId] : null;

        // Format the last modified time
        const modifiedDate = thread['Modified Date']
          ? new Date(thread['Modified Date'])
          : new Date();
        const now = new Date();
        const diffMs = now.getTime() - modifiedDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let lastMessageTime;
        if (diffDays === 0) {
          lastMessageTime = modifiedDate.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });
        } else if (diffDays === 1) {
          lastMessageTime = 'Yesterday';
        } else if (diffDays < 7) {
          lastMessageTime = modifiedDate.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
          lastMessageTime = modifiedDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        }

        return {
          _id: thread._id,
          '-Host User': hostId,
          '-Guest User': guestId,
          contact_name: contact?.name || 'Split Lease',
          contact_avatar: contact?.avatar,
          property_name: thread['Listing'] ? listingMap[thread['Listing']] : undefined,
          last_message_preview: thread['~Last Message'] || 'No messages yet',
          last_message_time: lastMessageTime,
          unread_count: unreadCountMap[thread._id] || 0,
          is_with_splitbot: false,
        };
      });

      setThreads(transformedThreads);
      hasLoadedThreads.current = true;
    } catch (err) {
      console.error('[Panel] Error fetching threads:', err);
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

      const { data, error } = await supabase.functions.invoke('messages', {
        body: {
          action: 'get_messages',
          payload: { thread_id: threadId },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch messages');
      }

      if (data?.success) {
        setMessages(data.data.messages || []);
        setThreadInfo(data.data.thread_info || null);
      } else {
        throw new Error(data?.error || 'Failed to fetch messages');
      }
    } catch (err) {
      console.error('[Panel] Error fetching messages:', err);
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

      // Clear typing indicator
      trackTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      const { data, error } = await supabase.functions.invoke('messages', {
        body: {
          action: 'send_message',
          payload: {
            thread_id: selectedThread._id,
            message_body: messageInput.trim(),
          },
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send message');
      }

      if (data?.success) {
        // Clear input immediately
        setMessageInput('');

        // Add optimistic message
        const optimisticMessage = {
          _id: data.data.message_id,
          message_body: messageInput.trim(),
          sender_name: 'You',
          sender_type: 'guest',
          is_outgoing: true,
          timestamp: new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }),
        };

        setMessages((prev) => {
          if (prev.some((m) => m._id === optimisticMessage._id)) return prev;
          return [...prev, optimisticMessage];
        });

        // Update thread's last message preview
        setThreads((prev) =>
          prev.map((t) =>
            t._id === selectedThread._id
              ? { ...t, last_message_preview: messageInput.trim(), last_message_time: 'Just now' }
              : t
          )
        );
      } else {
        throw new Error(data?.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('[Panel] Error sending message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Handle thread selection
   */
  const handleThreadSelect = useCallback((thread) => {
    console.log('[Panel] Thread selected:', thread._id, thread.contact_name);
    setSelectedThread(thread);
    setMessages([]);
    setThreadInfo(null);
    setViewState('thread');
    setIsOtherUserTyping(false);
    setTypingUserName(null);
    fetchMessages(thread._id);
  }, []);

  /**
   * Handle back to thread list
   */
  const handleBackToList = useCallback(() => {
    setViewState('list');
    setSelectedThread(null);
    setMessages([]);
    setMessageInput('');
    setIsOtherUserTyping(false);
    setTypingUserName(null);
  }, []);

  /**
   * Handle message input change with typing indicator
   */
  const handleMessageInputChange = useCallback(
    (value) => {
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
    },
    [trackTyping]
  );

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
    hasLoadedThreads.current = false;
    fetchThreads();
  }, []);

  /**
   * Refresh threads (can be called from parent when badge updates)
   */
  const refreshThreads = useCallback(() => {
    hasLoadedThreads.current = false;
    fetchThreads();
  }, []);

  // ============================================================================
  // RETURN HOOK API
  // ============================================================================
  return {
    // Thread data
    threads,
    selectedThread,
    messages,
    threadInfo,

    // UI state
    viewState,
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
    handleBackToList,
    handleMessageInputChange,
    handleSendMessage,
    handleRetry,
    refreshThreads,

    // CTA handlers
    handleCTAClick,
    getCTAButtonConfig,
  };
}
