/**
 * ThreadSidebar Component
 *
 * Left sidebar containing the list of message threads.
 * Desktop: 30% width sidebar
 * Mobile: Full-screen list view (hidden when conversation is open)
 */

import ThreadCard from './ThreadCard.jsx';

export default function ThreadSidebar({ threads, selectedThreadId, onThreadSelect, className = '' }) {
  return (
    <aside className={`thread-sidebar ${className}`.trim()}>
      <h2 className="sidebar-title">Messages</h2>
      <div className="thread-list">
        {threads.map(thread => (
          <ThreadCard
            key={thread._id}
            thread={thread}
            isSelected={thread._id === selectedThreadId}
            onClick={() => onThreadSelect(thread)}
          />
        ))}
      </div>
    </aside>
  );
}
