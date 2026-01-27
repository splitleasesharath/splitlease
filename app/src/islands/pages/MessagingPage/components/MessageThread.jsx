/**
 * MessageThread Component
 *
 * Message display area with thread header and messages list.
 * - Auto-scrolls to bottom when new messages arrive
 * - On mobile, shows a back button to return to thread list
 * - Shows typing indicator when another user is composing
 * - Upwork-style design with gray background and date separators
 */

import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';
import ThreadHeader from './ThreadHeader.jsx';
import TypingIndicator from './TypingIndicator.jsx';

/**
 * Format date for separator display
 */
function formatDateSeparator(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Get date key for grouping messages
 */
function getDateKey(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toDateString();
  } catch {
    return '';
  }
}

/**
 * @param {object} props
 * @param {object[]} props.messages - Array of message objects
 * @param {object} props.threadInfo - Thread info (contact_name, property_name, proposal_id, etc.)
 * @param {boolean} props.isLoading - Whether messages are loading
 * @param {function} props.onBack - Handler for mobile back button
 * @param {boolean} props.isMobile - Whether in mobile view
 * @param {boolean} props.isOtherUserTyping - Whether other user is typing
 * @param {string} props.typingUserName - Name of user who is typing
 * @param {function} props.onCTAClick - Handler for CTA button clicks
 * @param {function} props.getCTAButtonConfig - Get CTA button config
 * @param {function} props.onSuggestionClick - Handler for suggestion chip clicks
 * @param {function} props.onFocusInput - Handler to focus the message input
 * @param {boolean} props.showRightPanel - Whether right panel is available (screen width > 1200px)
 * @param {boolean} props.isRightPanelCollapsed - Whether right panel is collapsed
 * @param {function} props.onToggleRightPanel - Handler to toggle right panel
 * @param {function} props.onHeaderAction - Handler for header action buttons (video, phone, menu)
 */
export default function MessageThread({
  messages,
  threadInfo,
  isLoading,
  onBack,
  isMobile,
  isOtherUserTyping,
  typingUserName,
  onCTAClick,
  getCTAButtonConfig,
  onSuggestionClick,
  onFocusInput,
  showRightPanel,
  isRightPanelCollapsed,
  onToggleRightPanel,
  onHeaderAction
}) {
  const messagesEndRef = useRef(null);

  // Build message context from thread info
  const messageContext = {
    proposalId: threadInfo?.proposal_id,
    listingId: threadInfo?.listing_id,
    leaseId: threadInfo?.lease_id,
  };


  // Group messages by date for date separators
  let lastDateKey = '';

  return (
    <div className="message-thread">
      {/* Thread Header */}
      {threadInfo && (
        <ThreadHeader
          info={threadInfo}
          onBack={onBack}
          isMobile={isMobile}
          showRightPanel={showRightPanel}
          isRightPanelCollapsed={isRightPanelCollapsed}
          onToggleRightPanel={onToggleRightPanel}
          onAction={onHeaderAction}
        />
      )}

      {/* Messages Container - Upwork style with gray background */}
      <div className="messages-scroll">
        {isLoading ? (
          <div className="message-thread__loading">
            <div className="message-thread__loading-spinner"></div>
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="conversation-empty-state">
            <div className="conversation-empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="conversation-empty-title">Start the conversation</h3>
            <p className="conversation-empty-desc">
              Send a message to begin chatting with {threadInfo?.contact_name || 'your contact'}.
            </p>
            <button
              className="conversation-empty-btn"
              type="button"
              onClick={() => onFocusInput?.()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Write a message
            </button>
            <div className="suggestion-chips">
              <button
                className="suggestion-chip"
                type="button"
                onClick={() => onSuggestionClick?.('Hi! I wanted to reach out about the listing.')}
              >
                Say hello
              </button>
              <button
                className="suggestion-chip"
                type="button"
                onClick={() => onSuggestionClick?.('Hi! I wanted to check on availability for the dates I\'m interested in.')}
              >
                Ask about availability
              </button>
              <button
                className="suggestion-chip"
                type="button"
                onClick={() => onSuggestionClick?.('Hi! I have a quick question about the listing.')}
              >
                Ask a question
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const dateKey = getDateKey(message.created_at || message.timestamp);
              const showDateSeparator = dateKey && dateKey !== lastDateKey;
              if (showDateSeparator) {
                lastDateKey = dateKey;
              }

              return (
                <div key={message._id || index}>
                  {/* Date Separator */}
                  {showDateSeparator && (
                    <div className="date-separator">
                      {formatDateSeparator(message.created_at || message.timestamp)}
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    onCTAClick={onCTAClick}
                    getCTAButtonConfig={getCTAButtonConfig}
                    messageContext={messageContext}
                  />
                </div>
              );
            })}
            {/* Typing Indicator */}
            {isOtherUserTyping && <TypingIndicator userName={typingUserName} />}
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
