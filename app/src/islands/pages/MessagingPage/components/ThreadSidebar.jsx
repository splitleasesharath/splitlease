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

import ThreadCard from './ThreadCard.jsx';

export default function ThreadSidebar({
  threads,
  selectedThreadId,
  onThreadSelect,
  onAction,
  className = ''
}) {
  return (
    <aside className={`thread-sidebar ${className}`.trim()} aria-label="Message threads">
      {/* Header with Title */}
      <div className="sidebar-header">
        <h1 className="sidebar-title">Messages</h1>
      </div>

      {/* Thread List */}
      <div className="thread-list" role="list" aria-label={`${threads.length} conversations`}>
        {threads.length === 0 ? (
          <div className="sidebar-empty-state">
            <div className="sidebar-empty-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="sidebar-empty-title">No messages yet</h3>
            <p className="sidebar-empty-desc">Start a conversation by browsing listings</p>
            <a href="/search" className="sidebar-empty-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              Browse listings
            </a>
          </div>
        ) : (
          threads.map(thread => (
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
