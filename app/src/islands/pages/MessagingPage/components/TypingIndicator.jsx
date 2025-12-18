/**
 * TypingIndicator
 * Shows when another user is typing in the thread
 *
 * Uses Supabase Realtime Presence to track typing state.
 * Displays animated dots and the typing user's name.
 */

import React from 'react';

export function TypingIndicator({ userName }) {
  if (!userName) return null;

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span className="typing-text">{userName} is typing...</span>
    </div>
  );
}

export default TypingIndicator;
