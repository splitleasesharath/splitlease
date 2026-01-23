/**
 * ThreadSidebar Component
 *
 * Left sidebar containing the list of message threads (Upwork style).
 * - Fixed 340px width on desktop
 * - Full-screen list view on mobile (hidden when conversation is open)
 *
 * Features:
 * - Header with title and action buttons (new message, more options)
 * - Rounded search box with filter icon
 * - Thread list with avatars, badges, and purple pill selection
 */

import { useState } from 'react';
import ThreadCard from './ThreadCard.jsx';

export default function ThreadSidebar({
  threads,
  selectedThreadId,
  onThreadSelect,
  onAction,
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
      {/* Header with Title and Action Buttons */}
      <div className="sidebar-header">
        <h1 className="sidebar-title">Messages</h1>
        <div className="sidebar-header__actions">
          {/* New Message Button */}
          <button
            className="sidebar-header__btn"
            onClick={() => onAction?.('new')}
            aria-label="New message"
            title="New message"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {/* More Options Button */}
          <button
            className="sidebar-header__btn"
            onClick={() => onAction?.('more')}
            aria-label="More options"
            title="More options"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search Bar - Upwork style with rounded input */}
      <div className="sidebar-search">
        <div className="sidebar-search__input-wrapper">
          <svg className="sidebar-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="sidebar-search__input"
            placeholder="Search messages..."
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
          <div className="sidebar-empty-state">
            {searchQuery ? (
              <>
                <div className="sidebar-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <h3 className="sidebar-empty-title">No results</h3>
                <p className="sidebar-empty-desc">No conversations match "{searchQuery}"</p>
                <button
                  className="sidebar-empty-btn"
                  onClick={() => setSearchQuery('')}
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <div className="sidebar-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="sidebar-empty-title">No messages yet</h3>
                <p className="sidebar-empty-desc">Start a conversation by browsing listings</p>
                <a href="/search" className="sidebar-empty-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  Browse listings
                </a>
              </>
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
