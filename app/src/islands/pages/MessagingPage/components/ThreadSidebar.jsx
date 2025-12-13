/**
 * ThreadSidebar Component
 *
 * Left sidebar containing the list of message threads.
 * Shows 30% width on desktop, full width on mobile.
 */

import ThreadCard from './ThreadCard.jsx';

export default function ThreadSidebar({ threads, selectedThreadId, onThreadSelect }) {
  return (
    <aside className="thread-sidebar">
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
