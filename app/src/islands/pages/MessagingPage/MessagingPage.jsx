/**
 * Messaging Page
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useMessagingPageLogic hook
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Uses shared Header/Footer components
 * - Desktop: Two-column layout (30% sidebar, 70% content)
 * - Mobile: Phone-style navigation (list → full-screen conversation)
 *
 * Authentication:
 * - Page requires authenticated user (Host or Guest)
 * - User ID comes from session, NOT URL
 * - Redirects to home if not authenticated
 */

import { useState, useEffect } from 'react';
import Header from '../../shared/Header.jsx';
import { useMessagingPageLogic } from './useMessagingPageLogic.js';
import ThreadSidebar from './components/ThreadSidebar.jsx';
import MessageThread from './components/MessageThread.jsx';
import MessageInput from './components/MessageInput.jsx';

// Mobile breakpoint (matches CSS)
const MOBILE_BREAKPOINT = 900;

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingState() {
  return (
    <div className="messaging-loading-state">
      <div className="messaging-spinner"></div>
      <p>Loading your conversations...</p>
    </div>
  );
}

// ============================================================================
// ERROR STATE COMPONENT
// ============================================================================

function ErrorState({ error, onRetry }) {
  return (
    <div className="messaging-error-state">
      <div className="messaging-error-icon">!</div>
      <h2>Something went wrong</h2>
      <p className="messaging-error-message">{error}</p>
      <button className="messaging-retry-button" onClick={onRetry}>
        Try Again
      </button>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

function EmptyState() {
  return (
    <div className="messaging-empty-state">
      <div className="messaging-empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <h2>No Conversations Yet</h2>
      <p>You don't have any messages yet.</p>
      <p className="messaging-empty-subtext">
        Start a conversation by submitting a proposal on a listing.
      </p>
      <a href="/search" className="messaging-browse-button">
        Browse Listings
      </a>
    </div>
  );
}

// ============================================================================
// NO THREAD SELECTED STATE COMPONENT
// ============================================================================

function NoThreadSelectedState() {
  return (
    <div className="no-thread-selected">
      <div className="no-thread-selected__emoji">💬</div>
      <h3 className="no-thread-selected__title">Select a Conversation</h3>
      <p className="no-thread-selected__subtitle">Send and receive messages.</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MessagingPage() {
  const {
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

    // CTA state
    activeModal,
    modalContext,

    // Handlers
    handleThreadSelect,
    handleMessageInputChange,
    handleSendMessage,
    handleRetry,

    // CTA handlers
    handleCTAClick,
    getCTAButtonConfig,
    handleCloseModal,
  } = useMessagingPageLogic();

  // Mobile view state: 'list' or 'conversation'
  const [mobileView, setMobileView] = useState('list');
  const [isMobile, setIsMobile] = useState(false);

  // Track window size for mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // When a thread is selected on mobile, switch to conversation view
  const handleMobileThreadSelect = (thread) => {
    handleThreadSelect(thread);
    if (isMobile) {
      setMobileView('conversation');
    }
  };

  // Back button handler for mobile
  const handleBackToList = () => {
    setMobileView('list');
  };

  // Don't render content if redirecting (auth failed)
  if (authState.shouldRedirect) {
    return (
      <>
        <Header />
        <main className="main-content">
          <div className="messaging-page">
            <LoadingState />
          </div>
        </main>
      </>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <Header />

      <main className="main-content">
        <div className="messaging-page">
          {/* Loading State */}
          {isLoading && <LoadingState />}

          {/* Error State */}
          {!isLoading && error && (
            <ErrorState error={error} onRetry={handleRetry} />
          )}

          {/* Empty State - No threads */}
          {!isLoading && !error && threads.length === 0 && (
            <EmptyState />
          )}

          {/* Main Content - Two Column Layout (Desktop) / Single View (Mobile) */}
          {!isLoading && !error && threads.length > 0 && (
            <div className={`messaging-layout ${isMobile ? 'messaging-layout--mobile' : ''}`}>
              {/* Thread Sidebar - Hidden on mobile when viewing conversation */}
              <ThreadSidebar
                threads={threads}
                selectedThreadId={selectedThread?._id}
                onThreadSelect={handleMobileThreadSelect}
                className={isMobile && mobileView === 'conversation' ? 'thread-sidebar--hidden' : ''}
              />

              {/* Message Content - Hidden on mobile when viewing list */}
              <div className={`message-content ${isMobile && mobileView === 'list' ? 'message-content--hidden' : ''}`}>
                {selectedThread ? (
                  <>
                    <MessageThread
                      messages={messages}
                      threadInfo={threadInfo}
                      isLoading={isLoadingMessages}
                      onBack={handleBackToList}
                      isMobile={isMobile}
                      isOtherUserTyping={isOtherUserTyping}
                      typingUserName={typingUserName}
                    />
                    <MessageInput
                      value={messageInput}
                      onChange={handleMessageInputChange}
                      onSend={handleSendMessage}
                      disabled={!selectedThread || isSending}
                      isSending={isSending}
                    />
                  </>
                ) : (
                  <NoThreadSelectedState />
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
