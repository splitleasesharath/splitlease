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
import { checkAuthStatus, validateTokenAndFetchUser, getFirstName, getAvatarUrl, getUserType } from '../../../lib/auth.js';
import { getUserId } from '../../../lib/secureStorage.js';
import { supabase } from '../../../lib/supabase.js';
import { useCTAHandler } from './useCTAHandler.js';

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
  // RIGHT PANEL DATA STATE
  // ============================================================================
  const [proposalData, setProposalData] = useState(null);
  const [listingData, setListingData] = useState(null);
  const [isLoadingPanelData, setIsLoadingPanelData] = useState(false);

  // ============================================================================
  // REALTIME STATE
  // ============================================================================
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState(null);
  const channelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ============================================================================
  // CTA MODAL STATE
  // ============================================================================
  const [activeModal, setActiveModal] = useState(null);
  const [modalContext, setModalContext] = useState(null);

  // Ref to track if initial load is complete
  const initialLoadDone = useRef(false);

  // ============================================================================
  // CTA HANDLER HOOKS
  // ============================================================================
  const handleOpenModal = useCallback((modalName, context) => {
    setActiveModal(modalName);
    setModalContext(context);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
    setModalContext(null);
  }, []);

  const { handleCTAClick, getCTAButtonConfig } = useCTAHandler({
    user,
    selectedThread,
    threadInfo,
    onOpenModal: handleOpenModal,
  });

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
            profilePhoto: userData.profilePhoto,
            userType: userData.userType || null  // 'Host' or 'Guest'
          });
          console.log('[Messaging] User data loaded:', userData.firstName, '- Type:', userData.userType);
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
              profilePhoto: getAvatarUrl() || null,
              userType: session.user.user_metadata?.user_type || getUserType() || null
            };
            setUser(fallbackUser);
            console.log('[Messaging] Using fallback user data from session:', fallbackUser.firstName, '- Type:', fallbackUser.userType);
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
  // FETCH PANEL DATA WHEN THREAD INFO CHANGES
  // ============================================================================
  useEffect(() => {
    if (threadInfo?.proposal_id || threadInfo?.listing_id) {
      fetchPanelData(threadInfo.proposal_id, threadInfo.listing_id);
    } else {
      setProposalData(null);
      setListingData(null);
    }
  }, [threadInfo?.proposal_id, threadInfo?.listing_id]);

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
  // REALTIME SUBSCRIPTION - Using Postgres Changes (more reliable than broadcast)
  // ============================================================================
  useEffect(() => {
    if (!selectedThread || authState.isChecking || !user?.bubbleId) return;

    const channelName = `messages-${selectedThread._id}`;
    console.log('[Realtime] Subscribing to postgres_changes for thread:', selectedThread._id);

    const channel = supabase.channel(channelName);

    // Listen for new messages via Postgres Changes (INSERT events on _message table)
    // NOTE: Filter removed due to column name with special characters not working with Realtime
    // Client-side filtering is done instead
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: '_message'
      },
      (payload) => {
        console.log('[Realtime] postgres_changes event received:', payload);

        const newRow = payload.new;
        if (!newRow) return;

        // Client-side filter: only process messages for this thread
        if (newRow['Associated Thread/Conversation'] !== selectedThread._id) {
          console.log('[Realtime] Message is for different thread, ignoring');
          return;
        }

        console.log('[Realtime] Message is for this thread, processing...');

        // Skip if this is our own message (already added optimistically)
        const isOwnMessage = newRow['-Originator User'] === user?.bubbleId;

        // Add message to state (avoid duplicates)
        setMessages(prev => {
          if (prev.some(m => m._id === newRow._id)) return prev;

          // Transform database row to UI format
          const transformedMessage = {
            _id: newRow._id,
            message_body: newRow['Message Body'],
            sender_name: newRow['is Split Bot'] ? 'Split Bot' : (isOwnMessage ? 'You' : selectedThread.contact_name || 'User'),
            sender_avatar: isOwnMessage ? user?.profilePhoto : undefined,
            sender_type: newRow['is Split Bot'] ? 'splitbot' :
              (newRow['-Originator User'] === newRow['-Host User'] ? 'host' : 'guest'),
            is_outgoing: isOwnMessage,
            timestamp: new Date(newRow['Created Date']).toLocaleString('en-US', {
              month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
            }),
            call_to_action: newRow['Call to Action'] ? {
              type: newRow['Call to Action'],
              message: 'View Details'
            } : undefined,
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
      console.log('[Realtime] Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Successfully subscribed to channel:', channelName);
        // Track presence for typing indicators
        await channel.track({
          user_id: user?.bubbleId,
          user_name: user?.firstName || 'User',
          typing: false,
          online_at: new Date().toISOString(),
        });
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Channel error - check RLS policies on _message table');
      } else if (status === 'TIMED_OUT') {
        console.error('[Realtime] Subscription timed out');
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
   * Direct Supabase query - no Edge Function needed for reads
   */
  async function fetchThreads() {
    try {
      setIsLoading(true);
      setError(null);

      // Get user's Bubble ID from multiple sources (state may not be set yet due to async setState)
      let bubbleId = user?.bubbleId;

      if (!bubbleId) {
        // Try secure storage first (works for legacy auth users)
        bubbleId = getUserId();
      }

      if (!bubbleId) {
        // Fallback to Supabase session metadata
        const { data: { session } } = await supabase.auth.getSession();
        bubbleId = session?.user?.user_metadata?.user_id;
      }

      if (!bubbleId) {
        throw new Error('User ID not available');
      }

      await fetchThreadsWithBubbleId(bubbleId);
    } catch (err) {
      console.error('Error fetching threads:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Fetch threads with a known Bubble ID
   */
  async function fetchThreadsWithBubbleId(bubbleId) {
    // Step 1: Query threads where user is host or guest
    const { data: threads, error: threadsError } = await supabase
      .from('thread')
      .select(`
        _id,
        "Modified Date",
        "-Host User",
        "-Guest User",
        "Listing",
        "~Last Message",
        "Thread Subject"
      `)
      .or(`"-Host User".eq.${bubbleId},"-Guest User".eq.${bubbleId}`)
      .order('"Modified Date"', { ascending: false });

    if (threadsError) {
      throw new Error(`Failed to fetch threads: ${threadsError.message}`);
    }

    if (!threads || threads.length === 0) {
      setThreads([]);
      return;
    }

    // Step 2: Collect contact IDs and listing IDs for batch lookup
    const contactIds = new Set();
    const listingIds = new Set();

    threads.forEach(thread => {
      const hostId = thread['-Host User'];
      const guestId = thread['-Guest User'];
      const contactId = hostId === bubbleId ? guestId : hostId;
      if (contactId) contactIds.add(contactId);
      if (thread['Listing']) listingIds.add(thread['Listing']);
    });

    // Step 3: Batch fetch contact user data
    let contactMap = {};
    if (contactIds.size > 0) {
      const { data: contacts } = await supabase
        .from('user')
        .select('_id, "Name - First", "Name - Last", "Profile Photo"')
        .in('_id', Array.from(contactIds));

      if (contacts) {
        contactMap = contacts.reduce((acc, contact) => {
          acc[contact._id] = {
            name: `${contact['Name - First'] || ''} ${contact['Name - Last'] || ''}`.trim() || 'Unknown User',
            avatar: contact['Profile Photo'],
          };
          return acc;
        }, {});
      }
    }

    // Step 4: Batch fetch listing data
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

    // Step 5: Fetch unread message counts per thread
    // The "Unread Users" column is a JSONB array of user IDs who haven't read the message
    const threadIds = threads.map(t => t._id);
    let unreadCountMap = {};
    if (threadIds.length > 0) {
      const { data: unreadData, error: unreadError } = await supabase
        .from('_message')
        .select('"Associated Thread/Conversation"')
        .in('"Associated Thread/Conversation"', threadIds)
        .contains('"Unread Users"', JSON.stringify([bubbleId]));

      if (!unreadError && unreadData) {
        // Count messages per thread
        unreadCountMap = unreadData.reduce((acc, msg) => {
          const threadId = msg['Associated Thread/Conversation'];
          acc[threadId] = (acc[threadId] || 0) + 1;
          return acc;
        }, {});
      }
    }

    // Step 6: Transform threads to UI format
    const transformedThreads = threads.map(thread => {
      const hostId = thread['-Host User'];
      const guestId = thread['-Guest User'];
      const contactId = hostId === bubbleId ? guestId : hostId;
      const contact = contactId ? contactMap[contactId] : null;

      // Format the last modified time
      const modifiedDate = thread['Modified Date'] ? new Date(thread['Modified Date']) : new Date();
      const now = new Date();
      const diffMs = now.getTime() - modifiedDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let lastMessageTime;
      if (diffDays === 0) {
        lastMessageTime = modifiedDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      } else if (diffDays === 1) {
        lastMessageTime = 'Yesterday';
      } else if (diffDays < 7) {
        lastMessageTime = modifiedDate.toLocaleDateString('en-US', { weekday: 'short' });
      } else {
        lastMessageTime = modifiedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      return {
        _id: thread._id,
        '-Host User': hostId,      // Preserve for CTA role detection
        '-Guest User': guestId,    // Preserve for CTA role detection
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
  }

  /**
   * Fetch messages for a specific thread
   * Uses supabase.functions.invoke() for automatic token refresh
   */
  async function fetchMessages(threadId) {
    try {
      setIsLoadingMessages(true);

      // Get fresh session and ensure token is valid
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('[fetchMessages] Session state:', {
        hasSession: !!sessionData?.session,
        hasAccessToken: !!sessionData?.session?.access_token,
        tokenLength: sessionData?.session?.access_token?.length,
        userId: sessionData?.session?.user?.id,
      });

      // If no session, try to refresh
      if (!sessionData?.session?.access_token) {
        console.log('[fetchMessages] No session, attempting refresh...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData?.session) {
          console.error('[fetchMessages] Session refresh failed:', refreshError);
          throw new Error('Not authenticated. Please log in again.');
        }
        console.log('[fetchMessages] Session refreshed successfully');
      }

      // Get the current access token for explicit header passing
      const { data: currentSession } = await supabase.auth.getSession();
      const accessToken = currentSession?.session?.access_token;
      console.log('[fetchMessages] Making function call with token:', !!accessToken);
      console.log('[fetchMessages] Token preview:', accessToken ? `${accessToken.substring(0, 20)}...` : 'none');

      if (!accessToken) {
        throw new Error('No access token available. Please log in again.');
      }

      // Use direct fetch to ensure headers are sent correctly
      // The SDK's functions.invoke() can sometimes have header merging issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'get_messages',
          payload: { thread_id: threadId }
        }),
      });

      console.log('[fetchMessages] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[fetchMessages] Error response:', errorText);
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

      const data = await response.json();

      if (data?.success) {
        setMessages(data.data.messages || []);
        setThreadInfo(data.data.thread_info || null);
      } else {
        throw new Error(data?.error || 'Failed to fetch messages');
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
   * Uses supabase.functions.invoke() for automatic token refresh
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

      // Get the current access token for explicit header passing
      const { data: currentSession } = await supabase.auth.getSession();
      const accessToken = currentSession?.session?.access_token;

      if (!accessToken) {
        throw new Error('No access token available. Please log in again.');
      }

      // Use direct fetch to ensure headers are sent correctly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'send_message',
          payload: {
            thread_id: selectedThread._id,
            message_body: messageInput.trim(),
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[sendMessage] Error response:', errorText);
        throw new Error(`Failed to send message: ${response.status}`);
      }

      const data = await response.json();

      if (data?.success) {
        // Clear input immediately
        setMessageInput('');

        // Note: We no longer need to fetch messages or threads here!
        // The Realtime subscription will automatically add the new message
        // when the database trigger broadcasts it.

        // However, for the sender's immediate feedback, add optimistically
        // (the Realtime broadcast might also arrive, but we'll dedupe)
        const optimisticMessage = {
          _id: data.data.message_id,
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
        throw new Error(data?.error || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }

  // ============================================================================
  // RIGHT PANEL DATA FETCHING
  // ============================================================================

  /**
   * Fetch extended proposal and listing data for the right panel
   * Called when a thread is selected
   */
  async function fetchPanelData(proposalId, listingId) {
    if (!proposalId && !listingId) {
      setProposalData(null);
      setListingData(null);
      return;
    }

    try {
      setIsLoadingPanelData(true);

      // Fetch proposal and listing data in parallel
      const [proposalResult, listingResult] = await Promise.all([
        proposalId ? fetchProposalDetails(proposalId) : Promise.resolve(null),
        listingId ? fetchListingDetails(listingId) : Promise.resolve(null),
      ]);

      setProposalData(proposalResult);
      setListingData(listingResult);
    } catch (err) {
      console.error('[RightPanel] Error fetching panel data:', err);
      // Don't set error state - panel will show empty/gracefully degrade
    } finally {
      setIsLoadingPanelData(false);
    }
  }

  /**
   * Fetch proposal details by ID
   */
  async function fetchProposalDetails(proposalId) {
    try {
      const { data, error } = await supabase
        .from('proposal')
        .select(`
          _id,
          "Status",
          "Created Date",
          "Start Date",
          "End Date",
          "Days per Week",
          "Total Monthly Price",
          "Modified Date"
        `)
        .eq('_id', proposalId)
        .single();

      if (error) {
        console.error('[RightPanel] Error fetching proposal:', error);
        return null;
      }

      // Transform to UI format
      return {
        id: data._id,
        status: data['Status'] || 'pending',
        createdAt: data['Created Date'],
        startDate: data['Start Date'],
        endDate: data['End Date'],
        daysPerWeek: data['Days per Week'],
        totalMonthlyPrice: data['Total Monthly Price'],
        modifiedDate: data['Modified Date'],
      };
    } catch (err) {
      console.error('[RightPanel] Error fetching proposal:', err);
      return null;
    }
  }

  /**
   * Fetch listing details by ID
   */
  async function fetchListingDetails(listingId) {
    try {
      const { data, error } = await supabase
        .from('listing')
        .select(`
          _id,
          "Name",
          "Primary Photo",
          "Neighborhood",
          "City",
          "Street Address",
          "State",
          "Monthly Rate",
          "Listing Type"
        `)
        .eq('_id', listingId)
        .single();

      if (error) {
        console.error('[RightPanel] Error fetching listing:', error);
        return null;
      }

      // Build address string
      const addressParts = [
        data['Neighborhood'],
        data['City'],
        data['State']
      ].filter(Boolean);

      // Transform to UI format
      return {
        id: data._id,
        name: data['Name'] || 'Unnamed Listing',
        primaryImage: data['Primary Photo'],
        address: addressParts.join(', ') || 'Location not specified',
        monthlyRate: data['Monthly Rate'],
        listingType: data['Listing Type'] || 'Flexible',
      };
    } catch (err) {
      console.error('[RightPanel] Error fetching listing:', err);
      return null;
    }
  }

  /**
   * Handle quick action button clicks from the right panel
   */
  const handlePanelAction = useCallback((actionType) => {
    console.log('[RightPanel] Action clicked:', actionType);

    switch (actionType) {
      case 'accept':
        // Open proposal acceptance modal/flow
        handleOpenModal('accept_proposal', {
          proposalId: threadInfo?.proposal_id,
          proposalData,
        });
        break;

      case 'counter':
        // Open counter proposal modal
        handleOpenModal('counter_proposal', {
          proposalId: threadInfo?.proposal_id,
          proposalData,
        });
        break;

      case 'video':
        // Open video call scheduling modal
        handleOpenModal('schedule_video', {
          threadId: selectedThread?._id,
          contactName: threadInfo?.contact_name,
        });
        break;

      case 'decline':
        // Open decline confirmation modal
        handleOpenModal('decline_proposal', {
          proposalId: threadInfo?.proposal_id,
          proposalData,
        });
        break;

      case 'view_profile':
        // Navigate to contact's profile (if we have the ID)
        // For now, log - implementation depends on routing
        console.log('[RightPanel] View profile clicked');
        break;

      case 'view_listing':
        // Navigate to listing page
        if (listingData?.id) {
          window.location.href = `/listing?id=${listingData.id}`;
        }
        break;

      default:
        console.warn('[RightPanel] Unknown action:', actionType);
    }
  }, [threadInfo, proposalData, listingData, selectedThread, handleOpenModal]);

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
    setProposalData(null);
    setListingData(null);
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
    setProposalData(null);
    setListingData(null);
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
   * Insert suggestion text into message input
   * Called when a user clicks a suggestion chip in the empty state
   */
  const insertSuggestion = useCallback((suggestionText) => {
    setMessageInput(suggestionText);
    // Trigger typing indicator so recipient sees activity
    trackTyping(true);
  }, [trackTyping]);

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

    // Right panel data
    proposalData,
    listingData,
    isLoadingPanelData,

    // UI state
    isLoading,
    isLoadingMessages,
    error,
    messageInput,
    isSending,

    // Realtime state
    isOtherUserTyping,
    typingUserName,

    // CTA state
    activeModal,
    modalContext,

    // Handlers
    handleThreadSelect,
    handleMessageInputChange,
    handleSendMessage,
    handleRetry,
    insertSuggestion,
    handlePanelAction,

    // CTA handlers
    handleCTAClick,
    getCTAButtonConfig,
    handleCloseModal,
  };
}
