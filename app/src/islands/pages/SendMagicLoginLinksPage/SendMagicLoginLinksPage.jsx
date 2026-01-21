/**
 * SendMagicLoginLinksPage - Admin tool for generating and sending magic login links
 *
 * Hollow component - all logic delegated to useSendMagicLoginLinksPageLogic hook
 */

import React from 'react';
import { useSendMagicLoginLinksPageLogic } from './useSendMagicLoginLinksPageLogic.js';
import './SendMagicLoginLinksPage.css';

export default function SendMagicLoginLinksPage() {
  const logic = useSendMagicLoginLinksPageLogic();

  if (logic.isLoading) {
    return (
      <div className="send-magic-login-links-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!logic.isAdmin) {
    return null;
  }

  return (
    <div className="send-magic-login-links-page">
      <header className="page-header">
        <h1>Send Magic Login Links</h1>
        <p className="subtitle">Admin Tool - Generate and send magic login links to users</p>
      </header>

      {/* Step Indicator */}
      <div className="step-indicator">
        {[1, 2, 3, 4, 5].map(step => (
          <div
            key={step}
            className={`step ${logic.currentStep === step ? 'active' : ''} ${logic.currentStep > step ? 'completed' : ''}`}
          >
            <div className="step-number">{step}</div>
            <div className="step-label">
              {step === 1 && 'Select User'}
              {step === 2 && 'Phone Override'}
              {step === 3 && 'Choose Page'}
              {step === 4 && 'Attach Data'}
              {step === 5 && 'Send'}
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: User Search */}
      {logic.currentStep === 1 && (
        <div className="step-content">
          <h2>Step 1: Select User</h2>
          <input
            type="text"
            className="search-input"
            placeholder="Search users by email, name, or phone..."
            value={logic.searchText}
            onChange={(e) => logic.setSearchText(e.target.value)}
          />

          {logic.loadingUsers ? (
            <div className="loading-users">Loading users...</div>
          ) : (
            <div className="user-list">
              {logic.users.length === 0 ? (
                <div className="no-results">No users found. Try searching.</div>
              ) : (
                logic.users.map(user => (
                  <div
                    key={user.id}
                    className="user-item"
                    onClick={() => logic.handleSelectUser(user)}
                  >
                    {user.profilePhoto && (
                      <img src={user.profilePhoto} alt="" className="user-avatar" />
                    )}
                    <div className="user-info">
                      <div className="user-name">{user.firstName} {user.lastName}</div>
                      <div className="user-email">{user.email}</div>
                      {user.phone && <div className="user-phone">{user.phone}</div>}
                    </div>
                    <div className="user-type-badge">{user.userType}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Phone Override */}
      {logic.currentStep === 2 && (
        <div className="step-content">
          <h2>Step 2: Phone Override (Optional)</h2>
          <p className="step-description">
            Selected user: <strong>{logic.selectedUser.firstName} {logic.selectedUser.lastName}</strong>
            {logic.selectedUser.phone && <span> (Default: {logic.selectedUser.phone})</span>}
          </p>
          <input
            type="tel"
            className="phone-input"
            placeholder="+15551234567 (E.164 format)"
            value={logic.phoneOverride}
            onChange={(e) => logic.setPhoneOverride(e.target.value)}
          />
          <p className="help-text">Leave empty to use user's phone number, or enter an override in E.164 format</p>
          <div className="step-actions">
            <button onClick={() => logic.setCurrentStep(1)} className="btn-secondary">Back</button>
            <button onClick={logic.handleContinueToPageSelection} className="btn-primary">Continue</button>
          </div>
        </div>
      )}

      {/* Step 3: Page Selection */}
      {logic.currentStep === 3 && (
        <div className="step-content">
          <h2>Step 3: Choose Destination Page</h2>
          <div className="page-list">
            {logic.destinationPages.map(page => (
              <div
                key={page.id}
                className="page-item"
                onClick={() => logic.handleSelectPage(page)}
              >
                <div className="page-label">{page.label}</div>
                <div className="page-path">{page.path}</div>
                <div className="page-description">{page.description}</div>
                {page.requiresData && <span className="requires-data-badge">Requires data</span>}
              </div>
            ))}
          </div>
          <div className="step-actions">
            <button onClick={() => logic.setCurrentStep(2)} className="btn-secondary">Back</button>
          </div>
        </div>
      )}

      {/* Step 4: Data Attachment */}
      {logic.currentStep === 4 && (
        <div className="step-content">
          <h2>Step 4: Attach Data (Optional)</h2>
          <p className="step-description">
            Destination: <strong>{logic.selectedPage.label}</strong>
          </p>

          {logic.loadingUserData ? (
            <div className="loading-user-data">Loading user data...</div>
          ) : logic.userData ? (
            <div className="user-data-sections">
              {/* Listings */}
              {logic.userData.listings && logic.userData.listings.length > 0 && (
                <div className="data-section">
                  <h3>Listings</h3>
                  {logic.userData.listings.map(listing => (
                    <label key={listing.id} className="data-checkbox">
                      <input
                        type="checkbox"
                        checked={logic.attachedData.listingId === listing.id}
                        onChange={(e) => {
                          if (e.target.checked) {
                            logic.setAttachedData({ ...logic.attachedData, listingId: listing.id, id: listing.id });
                          } else {
                            const { listingId, id, ...rest } = logic.attachedData;
                            logic.setAttachedData(rest);
                          }
                        }}
                      />
                      <span>{listing.title} - {listing.address}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Proposals */}
              {logic.userData.proposals && logic.userData.proposals.length > 0 && (
                <div className="data-section">
                  <h3>Proposals</h3>
                  {logic.userData.proposals.map(proposal => (
                    <label key={proposal.id} className="data-checkbox">
                      <input
                        type="checkbox"
                        checked={logic.attachedData.proposalId === proposal.id}
                        onChange={(e) => {
                          if (e.target.checked) {
                            logic.setAttachedData({ ...logic.attachedData, proposalId: proposal.id });
                          } else {
                            const { proposalId, ...rest } = logic.attachedData;
                            logic.setAttachedData(rest);
                          }
                        }}
                      />
                      <span>{proposal.listingTitle} ({proposal.status})</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Threads */}
              {logic.userData.threads && logic.userData.threads.length > 0 && (
                <div className="data-section">
                  <h3>Message Threads</h3>
                  {logic.userData.threads.map(thread => (
                    <label key={thread.id} className="data-checkbox">
                      <input
                        type="checkbox"
                        checked={logic.attachedData.threadId === thread.id}
                        onChange={(e) => {
                          if (e.target.checked) {
                            logic.setAttachedData({ ...logic.attachedData, threadId: thread.id });
                          } else {
                            const { threadId, ...rest } = logic.attachedData;
                            logic.setAttachedData(rest);
                          }
                        }}
                      />
                      <span>{thread.subject}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="no-data">No data available to attach for this user.</div>
          )}

          <div className="step-actions">
            <button onClick={() => logic.setCurrentStep(3)} className="btn-secondary">Back</button>
            <button
              onClick={logic.handleContinueToSend}
              className="btn-primary"
              disabled={logic.sending}
            >
              {logic.sending ? 'Generating...' : 'Generate & Send Link'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Success */}
      {logic.currentStep === 5 && (
        <div className="step-content">
          <h2>✓ Magic Link Generated!</h2>
          <div className="success-message">
            <p>Magic login link has been generated{logic.phoneOverride || logic.selectedUser.phone ? ' and sent via SMS' : ''}.</p>
          </div>

          <div className="generated-link-container">
            <input
              type="text"
              className="generated-link-input"
              value={logic.generatedLink}
              readOnly
            />
            <button onClick={logic.handleCopyLink} className="btn-copy">Copy Link</button>
          </div>

          <div className="step-actions">
            <button onClick={logic.handleReset} className="btn-primary">Send Another Link</button>
          </div>
        </div>
      )}
    </div>
  );
}
