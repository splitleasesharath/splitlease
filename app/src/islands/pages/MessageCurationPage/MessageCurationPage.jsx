/**
 * MessageCurationPage - Admin tool for viewing and moderating message threads
 *
 * Hollow component pattern: All logic is in useMessageCurationPageLogic.js
 * This component only handles rendering.
 *
 * Features:
 * - Thread search and selection
 * - Conversation history view
 * - Message details display
 * - Moderation actions (delete, forward)
 * - Split Bot messaging
 * - URL parameter support (?thread=id&message=id)
 */

import useMessageCurationPageLogic from './useMessageCurationPageLogic.js';
import ThreadSelector from './components/ThreadSelector.jsx';
import ConversationHistory from './components/ConversationHistory.jsx';
import MessageDisplay from './components/MessageDisplay.jsx';
import ModerationActions from './components/ModerationActions.jsx';
import SplitBotMessaging from './components/SplitBotMessaging.jsx';
import ConfirmationModal from './components/ConfirmationModal.jsx';
import './MessageCurationPage.css';

export default function MessageCurationPage() {
  const {
    // Thread state
    threads,
    totalThreadCount,
    selectedThreadId,
    searchText,
    isLoadingThreads,
    currentPage,
    totalPages,

    // Message state
    messages,
    selectedMessage,
    isLoadingMessages,
    currentThread,

    // Modal state
    isDeleteMessageModalOpen,
    isDeleteThreadModalOpen,

    // Processing state
    isProcessing,
    error,

    // Split Bot state
    splitBotMessageText,
    splitBotRecipientType,
    setSplitBotMessageText,
    setSplitBotRecipientType,

    // Data fetching
    fetchThreads,

    // Action handlers
    handleThreadSelect,
    handleMessageClick,
    handleSearchChange,
    handlePageChange,
    clearSelection,
    handleDeleteMessage,
    handleDeleteThread,
    handleForwardMessage,
    handleSendSplitBotMessage,
    applySplitBotTemplate,

    // Modal handlers
    openDeleteMessageModal,
    closeDeleteMessageModal,
    openDeleteThreadModal,
    closeDeleteThreadModal,

    // Computed values
    getUserDisplayName,
    getThreadDisplayLabel,
    formatDate,
    getSenderColorClass,
    copyToClipboard,
  } = useMessageCurationPageLogic();

  return (
    <div className="message-curation-page">
      {/* Header */}
      <header className="message-curation-header">
        <div className="header-content">
          <h1 className="header-title">Message Curation</h1>
          <p className="header-subtitle">
            View and moderate message threads
          </p>
        </div>
        <button
          onClick={fetchThreads}
          className="refresh-button"
          disabled={isLoadingThreads}
        >
          {isLoadingThreads ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* Main Content - Three Column Layout */}
      <main className="message-curation-main">
        {/* Error State */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={fetchThreads} className="retry-button">
              Retry
            </button>
          </div>
        )}

        <div className="three-column-layout">
          {/* Column 1: Thread Selection */}
          <section className="column column-threads">
            <h2 className="section-title">Threads ({totalThreadCount})</h2>
            <ThreadSelector
              threads={threads}
              selectedThreadId={selectedThreadId}
              searchText={searchText}
              isLoading={isLoadingThreads}
              currentPage={currentPage}
              totalPages={totalPages}
              onSelect={handleThreadSelect}
              onSearchChange={handleSearchChange}
              onPageChange={handlePageChange}
              getThreadDisplayLabel={getThreadDisplayLabel}
              formatDate={formatDate}
            />
            {selectedThreadId && (
              <button
                onClick={clearSelection}
                className="clear-selection-button"
              >
                Clear Selection
              </button>
            )}
          </section>

          {/* Column 2: Conversation History */}
          <section className="column column-conversation">
            <h2 className="section-title">
              {currentThread ? 'Conversation' : 'Select a Thread'}
            </h2>
            {selectedThreadId ? (
              <ConversationHistory
                messages={messages}
                selectedMessageId={selectedMessage?.id}
                isLoading={isLoadingMessages}
                currentThread={currentThread}
                onMessageClick={handleMessageClick}
                getUserDisplayName={getUserDisplayName}
                formatDate={formatDate}
                getSenderColorClass={getSenderColorClass}
              />
            ) : (
              <div className="empty-state">
                <EmptyConversationIcon />
                <h3 className="empty-title">No Thread Selected</h3>
                <p className="empty-text">
                  Select a thread from the list to view the conversation.
                </p>
              </div>
            )}
          </section>

          {/* Column 3: Message Details & Actions */}
          <section className="column column-details">
            <h2 className="section-title">
              {selectedMessage ? 'Message Details' : 'Details'}
            </h2>

            {selectedMessage ? (
              <>
                <MessageDisplay
                  message={selectedMessage}
                  thread={currentThread}
                  getUserDisplayName={getUserDisplayName}
                  formatDate={formatDate}
                  copyToClipboard={copyToClipboard}
                />

                <ModerationActions
                  hasSelectedMessage={!!selectedMessage}
                  hasSelectedThread={!!selectedThreadId}
                  isMessageForwarded={selectedMessage?.isForwarded}
                  isProcessing={isProcessing}
                  onDeleteMessage={openDeleteMessageModal}
                  onDeleteThread={openDeleteThreadModal}
                  onForwardMessage={handleForwardMessage}
                />

                {selectedThreadId && (
                  <SplitBotMessaging
                    threadId={selectedThreadId}
                    messageText={splitBotMessageText}
                    recipientType={splitBotRecipientType}
                    isProcessing={isProcessing}
                    onMessageTextChange={setSplitBotMessageText}
                    onRecipientTypeChange={setSplitBotRecipientType}
                    onSendMessage={handleSendSplitBotMessage}
                    onApplyTemplate={applySplitBotTemplate}
                  />
                )}
              </>
            ) : selectedThreadId ? (
              <div className="empty-state empty-state--small">
                <EmptyMessageIcon />
                <h3 className="empty-title">No Message Selected</h3>
                <p className="empty-text">
                  Click on a message to view details and moderation options.
                </p>

                {/* Show Split Bot even without message selected */}
                <div className="split-bot-section">
                  <SplitBotMessaging
                    threadId={selectedThreadId}
                    messageText={splitBotMessageText}
                    recipientType={splitBotRecipientType}
                    isProcessing={isProcessing}
                    onMessageTextChange={setSplitBotMessageText}
                    onRecipientTypeChange={setSplitBotRecipientType}
                    onSendMessage={handleSendSplitBotMessage}
                    onApplyTemplate={applySplitBotTemplate}
                  />
                </div>
              </div>
            ) : (
              <div className="empty-state empty-state--small">
                <EmptyDetailsIcon />
                <h3 className="empty-title">No Selection</h3>
                <p className="empty-text">
                  Select a thread and message to see details and actions.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="message-curation-footer">
        <p className="footer-text">
          Split Lease Admin Dashboard - Internal Use Only
        </p>
      </footer>

      {/* Delete Message Confirmation Modal */}
      {isDeleteMessageModalOpen && selectedMessage && (
        <ConfirmationModal
          title="Delete Message"
          message={`Are you sure you want to delete this message? This action will soft-delete the message.`}
          confirmLabel="Delete Message"
          confirmVariant="danger"
          onConfirm={handleDeleteMessage}
          onCancel={closeDeleteMessageModal}
          isProcessing={isProcessing}
        />
      )}

      {/* Delete Thread Confirmation Modal */}
      {isDeleteThreadModalOpen && selectedThreadId && (
        <ConfirmationModal
          title="Delete All Messages in Thread"
          message={`Are you sure you want to delete ALL messages in this thread? This will soft-delete all ${messages.length} messages. This action cannot be easily undone.`}
          confirmLabel="Delete All Messages"
          confirmVariant="danger"
          onConfirm={handleDeleteThread}
          onCancel={closeDeleteThreadModal}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}

// ===== ICONS =====

function EmptyConversationIcon() {
  return (
    <svg
      className="empty-icon"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function EmptyMessageIcon() {
  return (
    <svg
      className="empty-icon empty-icon--small"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function EmptyDetailsIcon() {
  return (
    <svg
      className="empty-icon empty-icon--small"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
