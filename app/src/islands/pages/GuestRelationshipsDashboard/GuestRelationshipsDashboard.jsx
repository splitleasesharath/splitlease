/**
 * Guest Relationships Dashboard
 *
 * Internal corporate tool for managing guest relationships, communications,
 * proposals, and knowledge base assignments.
 *
 * Follows the Hollow Component Pattern:
 * - This component contains ONLY JSX rendering
 * - ALL business logic is in useGuestRelationshipsDashboardLogic hook
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Corporate internal tool (admin/corporate roles only)
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';
import { useGuestRelationshipsDashboardLogic } from './useGuestRelationshipsDashboardLogic.js';
import CreateCustomerForm from './components/CreateCustomerForm.jsx';
import GuestSearch from './components/GuestSearch.jsx';
import HistorySection from './components/HistorySection.jsx';
import MessagingSection from './components/MessagingSection.jsx';
import ProposalsSection from './components/ProposalsSection.jsx';
import ListingsSection from './components/ListingsSection.jsx';
import KnowledgeBaseSection from './components/KnowledgeBaseSection.jsx';
import Toast from './components/Toast.jsx';
import './GuestRelationshipsDashboard.css';

// ============================================================================
// LOADING STATE COMPONENT
// ============================================================================

function LoadingOverlay() {
  return (
    <div className="grd-loading-overlay">
      <div className="grd-spinner"></div>
      <p>Loading...</p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT (HOLLOW - NO LOGIC)
// ============================================================================

export default function GuestRelationshipsDashboard() {
  const {
    // Constants
    USER_TYPES,
    MESSAGE_TYPES,

    // Guest Selection
    selectedGuest,
    guestSearchResults,
    isSearchingGuests,
    nameSearch,
    phoneSearch,
    emailSearch,
    showNameDropdown,
    showPhoneDropdown,
    showEmailDropdown,

    // Guest Selection Handlers
    handleNameSearchChange,
    handlePhoneSearchChange,
    handleEmailSearchChange,
    handleGuestSelect,
    handleClearSelectedGuest,
    setShowNameDropdown,
    setShowPhoneDropdown,
    setShowEmailDropdown,

    // Create Customer
    createCustomerForm,
    createCustomerErrors,
    isCreatingCustomer,
    handleCreateCustomerFieldChange,
    handleCreateCustomer,

    // Messaging
    messageType,
    setMessageType,
    emailSubject,
    setEmailSubject,
    emailBody,
    setEmailBody,
    smsBody,
    setSmsBody,
    messageHistory,
    isSendingMessage,
    handleSendEmail,
    handleSendSMS,

    // Proposals
    currentProposals,
    suggestedProposals,
    isLoadingProposals,
    handleRemoveProposal,
    handleConfirmPricing,
    handleAddSuggestedProposal,

    // Listings
    suggestedListings,
    allListings,
    handleAddListing,
    handleRemoveListing,
    handleAddCuratedListing,

    // Multi-user Selection
    selectedUsers,
    allGuests,
    handleSelectAllGuests,
    handleDeselectAllGuests,
    handleToggleUserSelection,

    // Knowledge Base
    allArticles,
    assignedArticles,
    availableArticles,
    selectedArticleToAdd,
    setSelectedArticleToAdd,
    isLoadingArticles,
    handleAddArticle,
    handleRemoveArticle,

    // History
    guestHistory,

    // UI State
    isLoading,
    error,
    toast,

    // Helpers
    formatPhoneNumber
  } = useGuestRelationshipsDashboardLogic();

  return (
    <>
      <Header />

      <main className="grd-main">
        <div className="grd-container">
          {/* Page Header */}
          <header className="grd-header">
            <h1 className="grd-title">Relationships Dashboard</h1>
          </header>

          {/* Error State */}
          {error && (
            <div className="grd-error-banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          {/* Main Grid Layout */}
          <div className="grd-grid">
            {/* Left Column */}
            <div className="grd-column">
              <CreateCustomerForm
                formData={createCustomerForm}
                errors={createCustomerErrors}
                userTypes={USER_TYPES}
                isLoading={isCreatingCustomer}
                onFieldChange={handleCreateCustomerFieldChange}
                onSubmit={handleCreateCustomer}
              />

              <GuestSearch
                guests={guestSearchResults}
                selectedGuest={selectedGuest}
                nameSearch={nameSearch}
                phoneSearch={phoneSearch}
                emailSearch={emailSearch}
                showNameDropdown={showNameDropdown}
                showPhoneDropdown={showPhoneDropdown}
                showEmailDropdown={showEmailDropdown}
                isSearching={isSearchingGuests}
                onNameSearchChange={handleNameSearchChange}
                onPhoneSearchChange={handlePhoneSearchChange}
                onEmailSearchChange={handleEmailSearchChange}
                onGuestSelect={handleGuestSelect}
                onClearGuest={handleClearSelectedGuest}
                setShowNameDropdown={setShowNameDropdown}
                setShowPhoneDropdown={setShowPhoneDropdown}
                setShowEmailDropdown={setShowEmailDropdown}
                formatPhoneNumber={formatPhoneNumber}
              />

              {selectedGuest && (
                <HistorySection history={guestHistory} />
              )}

              <MessagingSection
                selectedGuest={selectedGuest}
                messageTypes={MESSAGE_TYPES}
                messageType={messageType}
                emailSubject={emailSubject}
                emailBody={emailBody}
                smsBody={smsBody}
                messageHistory={messageHistory}
                isLoading={isSendingMessage}
                onMessageTypeChange={setMessageType}
                onEmailSubjectChange={setEmailSubject}
                onEmailBodyChange={setEmailBody}
                onSmsBodyChange={setSmsBody}
                onSendEmail={handleSendEmail}
                onSendSMS={handleSendSMS}
                formatPhoneNumber={formatPhoneNumber}
              />

              <KnowledgeBaseSection
                articles={availableArticles}
                assignedArticles={assignedArticles}
                selectedArticle={selectedArticleToAdd}
                isLoading={isLoadingArticles}
                onArticleSelect={setSelectedArticleToAdd}
                onAddArticle={handleAddArticle}
                onRemoveArticle={handleRemoveArticle}
              />
            </div>

            {/* Right Column */}
            <div className="grd-column">
              <ProposalsSection
                currentProposals={currentProposals}
                suggestedProposals={suggestedProposals}
                availableListings={allListings}
                isLoading={isLoadingProposals}
                onRemoveProposal={handleRemoveProposal}
                onConfirmPricing={handleConfirmPricing}
                onAddSuggestedProposal={handleAddSuggestedProposal}
              />

              <ListingsSection
                suggestedListings={suggestedListings}
                allListings={allListings}
                allGuests={allGuests}
                selectedUsers={selectedUsers}
                onAddListing={handleAddListing}
                onRemoveListing={handleRemoveListing}
                onAddCuratedListing={handleAddCuratedListing}
                onSelectAllGuests={handleSelectAllGuests}
                onDeselectAllGuests={handleDeselectAllGuests}
                onToggleUserSelection={handleToggleUserSelection}
              />
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && <LoadingOverlay />}
      </main>

      <Footer />

      {/* Toast Notifications */}
      {toast && (
        <Toast message={toast.message} type={toast.type} />
      )}
    </>
  );
}
