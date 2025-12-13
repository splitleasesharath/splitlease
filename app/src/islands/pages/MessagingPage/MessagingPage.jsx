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
 * - Two-column layout (30% sidebar, 70% content)
 *
 * Authentication:
 * - Page requires authenticated user (Host or Guest)
 * - User ID comes from session, NOT URL
 * - Redirects to home if not authenticated
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useMessagingPageLogic } from './useMessagingPageLogic.js';
import ThreadSidebar from './components/ThreadSidebar.jsx';
import MessageThread from './components/MessageThread.jsx';
import MessageInput from './components/MessageInput.jsx';

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
    <div className="messaging-no-thread-state">
      <div className="messaging-no-thread-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <p>Select a conversation to view messages</p>
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

    // Handlers
    handleThreadSelect,
    handleMessageInputChange,
    handleSendMessage,
    handleRetry,
  } = useMessagingPageLogic();

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
        <Footer />
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

          {/* Main Content - Two Column Layout */}
          {!isLoading && !error && threads.length > 0 && (
            <div className="messaging-layout">
              {/* Left Column - Thread Sidebar (30%) */}
              <ThreadSidebar
                threads={threads}
                selectedThreadId={selectedThread?._id}
                onThreadSelect={handleThreadSelect}
              />

              {/* Right Column - Message Content (70%) */}
              <div className="message-content">
                {selectedThread ? (
                  <>
                    <MessageThread
                      messages={messages}
                      threadInfo={threadInfo}
                      isLoading={isLoadingMessages}
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

      <Footer />
    </>
  );
}
