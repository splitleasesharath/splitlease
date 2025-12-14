/**
 * MessageThread Component
 *
 * Message display area with thread header and messages list.
 * Auto-scrolls to bottom when new messages arrive.
 * On mobile, shows a back button to return to thread list.
 */

import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble.jsx';
import ThreadHeader from './ThreadHeader.jsx';

export default function MessageThread({ messages, threadInfo, isLoading, onBack, isMobile }) {
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
              />
            ))}
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
