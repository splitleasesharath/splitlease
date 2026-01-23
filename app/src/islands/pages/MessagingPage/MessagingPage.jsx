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

import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../shared/Header.jsx';
import { useMessagingPageLogic } from './useMessagingPageLogic.js';
import ThreadSidebar from './components/ThreadSidebar.jsx';
import MessageThread from './components/MessageThread.jsx';
import MessageInput from './components/MessageInput.jsx';
import RightPanel from './components/RightPanel.jsx';

// Mobile breakpoint (matches CSS)
const MOBILE_BREAKPOINT = 900;
// Right panel breakpoint (matches CSS)
const RIGHT_PANEL_BREAKPOINT = 1200;

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
// WELCOME STATE COMPONENT - New User / No Conversations
// Dynamic content based on user type (Host vs Guest)
// ============================================================================

function WelcomeState({ userType }) {
  const isHost = userType === 'Host';

  // Dynamic content based on user type
  const welcomeContent = isHost
    ? {
        description: 'Connect with guests interested in your space. Review proposals, answer questions, and coordinate flexible rental arrangements.',
        primaryBtn: { href: '/host-overview', label: 'View Your Listings' },
        secondaryBtn: { href: '/list-with-us', label: 'List Another Space' },
        tips: [
          { href: '/host-overview', text: 'Manage your listings', icon: 'home' },
          { href: '/host-proposals', text: 'Review proposals', icon: 'document' },
          { href: '/faq', text: 'Hosting tips', icon: 'help' }
        ]
      }
    : {
        description: 'Connect with hosts to discuss proposals, schedule viewings, and coordinate your flexible rental experience.',
        primaryBtn: { href: '/search', label: 'Find a Listing' },
        secondaryBtn: { href: '/list-with-us', label: 'List Your Space' },
        tips: [
          { href: '/search', text: 'Browse available spaces', icon: 'search' },
          { href: '/faq', text: 'Submit a proposal', icon: 'document' },
          { href: '/faq', text: 'Learn how it works', icon: 'help' }
        ]
      };

  // Icon components
  const icons = {
    search: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    document: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    help: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    )
  };

  return (
    <div className="messaging-welcome-state">
      {/* Chat bubble illustration */}
      <div className="welcome-illustration">
        <div className="bubble-1">
          <div className="bubble-lines">
            <div className="bubble-line" style={{ width: '70px' }}></div>
            <div className="bubble-line" style={{ width: '50px' }}></div>
          </div>
        </div>
        <div className="bubble-2">
          <div className="bubble-lines">
            <div className="bubble-line" style={{ width: '60px' }}></div>
            <div className="bubble-line" style={{ width: '80px' }}></div>
          </div>
        </div>
      </div>

      <h2 className="welcome-title">Welcome to Messages</h2>
      <p className="welcome-desc">{welcomeContent.description}</p>

      {/* Action buttons */}
      <div className="welcome-actions">
        <a href={welcomeContent.primaryBtn.href} className="welcome-btn welcome-btn-primary">
          {isHost ? icons.home : icons.search}
          {welcomeContent.primaryBtn.label}
        </a>
        <a href={welcomeContent.secondaryBtn.href} className="welcome-btn welcome-btn-secondary">
          {icons.home}
          {welcomeContent.secondaryBtn.label}
        </a>
      </div>

      {/* Getting Started Tips */}
      <div className="welcome-tips">
        <div className="welcome-tips-title">Getting Started</div>
        <div className="welcome-tip-cards">
          {welcomeContent.tips.map((tip, index) => (
            <a key={index} href={tip.href} className="welcome-tip-card">
              <div className="welcome-tip-icon">{icons[tip.icon]}</div>
              <span className="welcome-tip-text">{tip.text}</span>
            </a>
          ))}
        </div>
      </div>
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
  } = useMessagingPageLogic();

  // Mobile view state: 'list' or 'conversation'
  const [mobileView, setMobileView] = useState('list');
  const [isMobile, setIsMobile] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  // User-controlled collapse state (separate from responsive hiding)
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  // Ref for MessageInput to enable focus from empty state
  const messageInputRef = useRef(null);

  // Handler to focus the message input (used by conversation empty state)
  const handleFocusInput = useCallback(() => {
    messageInputRef.current?.focus();
  }, []);

  // Track window size for mobile detection and right panel visibility
  useEffect(() => {
    const checkBreakpoints = () => {
      const width = window.innerWidth;
      setIsMobile(width <= MOBILE_BREAKPOINT);
      setShowRightPanel(width > RIGHT_PANEL_BREAKPOINT);
    };

    checkBreakpoints();
    window.addEventListener('resize', checkBreakpoints);
    return () => window.removeEventListener('resize', checkBreakpoints);
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

  // Toggle right panel collapse/expand
  const handleToggleRightPanel = useCallback(() => {
    setIsRightPanelCollapsed(prev => !prev);
  }, []);

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

          {/* Welcome State - No threads (new user) */}
          {!isLoading && !error && threads.length === 0 && (
            <WelcomeState userType={user?.userType} />
          )}

          {/* Main Content - Two Column Layout (Desktop) / Single View (Mobile) */}
          {!isLoading && !error && threads.length > 0 && (
            <div className={`messaging-layout ${isMobile ? 'messaging-layout--mobile' : ''}`}>
              {/* Thread Sidebar - Hidden on mobile when viewing conversation */}
              <ThreadSidebar
                threads={threads}
                selectedThreadId={selectedThread?._id}
                onThreadSelect={handleMobileThreadSelect}
                onAction={handlePanelAction}
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
                      onCTAClick={handleCTAClick}
                      getCTAButtonConfig={getCTAButtonConfig}
                      onSuggestionClick={insertSuggestion}
                      onFocusInput={handleFocusInput}
                      showRightPanel={showRightPanel}
                      isRightPanelCollapsed={isRightPanelCollapsed}
                      onToggleRightPanel={handleToggleRightPanel}
                      onHeaderAction={handlePanelAction}
                    />
                    <MessageInput
                      ref={messageInputRef}
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

              {/* Right Panel - Contact info, proposal progress, listing details, actions */}
              {/* Hidden on screens < 1200px via CSS, also conditionally rendered for performance */}
              {showRightPanel && selectedThread && !isRightPanelCollapsed && (
                <RightPanel
                  threadInfo={threadInfo}
                  proposalData={proposalData}
                  listingData={listingData}
                  userType={user?.userType}
                  onAction={handlePanelAction}
                  isLoading={isLoadingPanelData}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
