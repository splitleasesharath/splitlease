/**
 * ThreadSidebar Component
 *
 * Left sidebar containing the list of message threads.
 * Desktop: 30% width sidebar
 * Mobile: Full-screen list view (hidden when conversation is open)
 *
 * Features:
 * - Header with title, new conversation (+) and more options (...) buttons
 * - Search bar with filter icon
 * - Thread list with avatars, badges, and unread indicators
 */

import { useState } from 'react';
import ThreadCard from './ThreadCard.jsx';

export default function ThreadSidebar({
  threads,
  selectedThreadId,
  onThreadSelect,
  onNewConversation,
  className = ''
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter threads based on search query
  const filteredThreads = searchQuery.trim()
    ? threads.filter(thread => {
        const query = searchQuery.toLowerCase();
        return (
          thread.contact_name?.toLowerCase().includes(query) ||
          thread.property_name?.toLowerCase().includes(query) ||
          thread.last_message_preview?.toLowerCase().includes(query)
        );
      })
    : threads;

  return (
    <aside className={`thread-sidebar ${className}`.trim()}>
      {/* Header */}
      <div className="sidebar-header">
        <h2 className="sidebar-title">Messages</h2>
        <div className="sidebar-header__actions">
          {/* New Conversation Button */}
          <button
            className="sidebar-header__btn"
            onClick={onNewConversation}
            aria-label="New conversation"
            title="New conversation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {/* More Options Button */}
          <button
            className="sidebar-header__btn"
            aria-label="More options"
            title="More options"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="sidebar-search">
        <div className="sidebar-search__input-wrapper">
          <svg className="sidebar-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="sidebar-search__input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Filter Button */}
        <button
          className="sidebar-search__filter-btn"
          aria-label="Filter conversations"
          title="Filter"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
        </button>
      </div>

      {/* Thread List */}
      <div className="thread-list">
        {filteredThreads.length === 0 ? (
          <div className="thread-list__empty">
            {searchQuery ? (
              <>
                <p>No conversations match "{searchQuery}"</p>
                <button
                  className="thread-list__clear-search"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              </>
            ) : (
              <p>No conversations yet</p>
            )}
          </div>
        ) : (
          filteredThreads.map(thread => (
            <ThreadCard
              key={thread._id}
              thread={thread}
              isSelected={thread._id === selectedThreadId}
              onClick={() => onThreadSelect(thread)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
