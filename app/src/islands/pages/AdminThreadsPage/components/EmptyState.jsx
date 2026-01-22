/**
 * EmptyState - Display when no threads match filters
 */

import { MessageSquare } from 'lucide-react';

export default function EmptyState({ title, message, onClearFilters }) {
  return (
    <div className="admin-threads__empty">
      <MessageSquare size={48} className="admin-threads__empty-icon" />
      <h3 className="admin-threads__empty-title">{title}</h3>
      <p className="admin-threads__empty-message">{message}</p>
      {onClearFilters && (
        <button
          className="admin-threads__empty-btn"
          onClick={onClearFilters}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
