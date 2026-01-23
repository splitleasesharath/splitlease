/**
 * ThreadCard - Individual thread display with expandable messages
 */

import { format } from 'date-fns';
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Bell,
  User,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  FileText,
} from 'lucide-react';
import MessageColumn from './MessageColumn';

export default function ThreadCard({
  thread,
  onDelete,
  onSendReminder,
  onViewMessages,
  expandedThreadId,
  onToggleExpand,
}) {
  const isExpanded = expandedThreadId === thread.id;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  // Group messages by sender type
  const messagesBySender = {
    host: thread.messages.filter(m => m.senderType === 'host'),
    guest: thread.messages.filter(m => m.senderType === 'guest'),
    botToHost: thread.messages.filter(m => m.senderType === 'bot-to-host'),
    botToGuest: thread.messages.filter(m => m.senderType === 'bot-to-guest'),
    botToBoth: thread.messages.filter(m => m.senderType === 'bot-to-both'),
  };

  return (
    <div className={`thread-card ${isExpanded ? 'thread-card--expanded' : ''}`}>
      {/* Header */}
      <div className="thread-card__header" onClick={() => onToggleExpand(thread.id)}>
        <div className="thread-card__header-left">
          <h3 className="thread-card__subject">{thread.subject}</h3>
          <div className="thread-card__meta">
            <span className="thread-card__meta-item">
              <MessageSquare size={14} />
              {thread.messageCount} messages
            </span>
            <span className="thread-card__meta-item">
              <Calendar size={14} />
              {formatDate(thread.lastMessageDate || thread.modifiedDate)}
            </span>
            {thread.proposalId && (
              <span className="thread-card__meta-item">
                <FileText size={14} />
                {thread.proposalId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
        <div className="thread-card__header-right">
          <button
            className="thread-card__expand-btn"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Participants Row */}
      <div className="thread-card__participants">
        {/* Host Info */}
        <div className="thread-card__participant">
          <div className="thread-card__participant-avatar">
            {thread.host?.photo ? (
              <img src={thread.host.photo} alt={thread.host.name} />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className="thread-card__participant-info">
            <span className="thread-card__participant-role">Host</span>
            <span className="thread-card__participant-name">{thread.host?.name || 'Unknown'}</span>
            {thread.host?.email && (
              <span className="thread-card__participant-email">
                <Mail size={12} />
                {thread.host.email}
              </span>
            )}
            {thread.host?.phone && (
              <span className="thread-card__participant-phone">
                <Phone size={12} />
                {thread.host.phone}
              </span>
            )}
          </div>
        </div>

        {/* Guest Info */}
        <div className="thread-card__participant">
          <div className="thread-card__participant-avatar">
            {thread.guest?.photo ? (
              <img src={thread.guest.photo} alt={thread.guest.name} />
            ) : (
              <User size={20} />
            )}
          </div>
          <div className="thread-card__participant-info">
            <span className="thread-card__participant-role">Guest</span>
            <span className="thread-card__participant-name">
              {thread.guest?.name || thread.maskedEmail || 'Unknown'}
            </span>
            {thread.guest?.email && (
              <span className="thread-card__participant-email">
                <Mail size={12} />
                {thread.guest.email}
              </span>
            )}
            {thread.guest?.phone && (
              <span className="thread-card__participant-phone">
                <Phone size={12} />
                {thread.guest.phone}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="thread-card__actions">
          <button
            className="thread-card__action-btn thread-card__action-btn--reminder"
            onClick={(e) => {
              e.stopPropagation();
              onSendReminder(thread);
            }}
            title="Send reminder"
          >
            <Bell size={16} />
            Remind
          </button>
          <button
            className="thread-card__action-btn thread-card__action-btn--delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(thread);
            }}
            title="Delete thread"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      {/* Expanded Content - Messages */}
      {isExpanded && (
        <div className="thread-card__messages">
          <div className="thread-card__messages-grid">
            <MessageColumn
              title="Host Messages"
              messages={messagesBySender.host}
              variant="host"
            />
            <MessageColumn
              title="Guest Messages"
              messages={messagesBySender.guest}
              variant="guest"
            />
            <MessageColumn
              title="Bot → Host"
              messages={messagesBySender.botToHost}
              variant="bot"
            />
            <MessageColumn
              title="Bot → Guest"
              messages={messagesBySender.botToGuest}
              variant="bot"
            />
            {messagesBySender.botToBoth.length > 0 && (
              <MessageColumn
                title="Bot → Both"
                messages={messagesBySender.botToBoth}
                variant="bot"
              />
            )}
          </div>

          {thread.messageCount === 0 && (
            <div className="thread-card__no-messages">
              <MessageSquare size={24} />
              <p>No messages in this thread</p>
            </div>
          )}

          {/* Thread Details */}
          <div className="thread-card__details">
            <div className="thread-card__detail">
              <span className="thread-card__detail-label">Thread ID:</span>
              <code className="thread-card__detail-value">{thread.id}</code>
            </div>
            {thread.proposalId && (
              <div className="thread-card__detail">
                <span className="thread-card__detail-label">Proposal ID:</span>
                <code className="thread-card__detail-value">{thread.proposalId}</code>
              </div>
            )}
            {thread.listingId && (
              <div className="thread-card__detail">
                <span className="thread-card__detail-label">Listing ID:</span>
                <code className="thread-card__detail-value">{thread.listingId}</code>
              </div>
            )}
            <div className="thread-card__detail">
              <span className="thread-card__detail-label">Created:</span>
              <span className="thread-card__detail-value">{formatDate(thread.createdDate)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
