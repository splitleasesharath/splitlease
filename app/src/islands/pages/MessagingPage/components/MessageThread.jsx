/**
 * MessageThread Component
 *
 * Message display area with thread header and messages list.
 * Auto-scrolls to bottom when new messages arrive.
 * On mobile, shows a back button to return to thread list.
 * Shows typing indicator when another user is composing.
 */

import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';
import ThreadHeader from './ThreadHeader.jsx';
import TypingIndicator from './TypingIndicator.jsx';

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
  getCTAButtonConfig
}) {
  const messagesEndRef = useRef(null);

  // Build message context from thread info
  const messageContext = {
    proposalId: threadInfo?.proposal_id,
    listingId: threadInfo?.listing_id,
    leaseId: threadInfo?.lease_id,
  };

  // Auto-scroll to bottom when messages change or typing indicator appears
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOtherUserTyping]);

  return (
    <div className="message-thread">
      {/* Thread Header */}
      {threadInfo && <ThreadHeader info={threadInfo} onBack={onBack} isMobile={isMobile} />}

      {/* Messages Container */}
      <div className="message-thread__messages">
        {isLoading ? (
          <div className="message-thread__loading">
            <div className="message-thread__loading-spinner"></div>
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="message-thread__empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>No messages yet</p>
            <span>Start the conversation by sending a message below</span>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <MessageBubble
                key={message._id || index}
                message={message}
                onCTAClick={onCTAClick}
                getCTAButtonConfig={getCTAButtonConfig}
                messageContext={messageContext}
              />
            ))}
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
