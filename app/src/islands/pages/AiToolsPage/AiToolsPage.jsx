/**
 * AI Tools Page - HOLLOW COMPONENT PATTERN
 *
 * Admin-only dashboard for AI content generation:
 * - HeyGen deepfake video generation
 * - ElevenLabs voice-over narration
 * - Jingle creation with custom melodies
 *
 * Architecture:
 * - NO business logic in this file
 * - ALL state and handlers come from useAiToolsPageLogic hook
 * - ONLY renders UI based on pre-calculated state
 */

import Header from '../../shared/Header.jsx';
import Footer from '../../shared/Footer.jsx';

// Section components
import HeyGenSection from './components/HeyGenSection.jsx';
import ElevenLabsSection from './components/ElevenLabsSection.jsx';
import JingleSection from './components/JingleSection.jsx';

// Logic Hook
import { useAiToolsPageLogic } from './useAiToolsPageLogic.js';

// Styles
import '../../../styles/ai-tools.css';

export default function AiToolsPage() {
  // ============================================================================
  // LOGIC HOOK - Provides all state and handlers
  // ============================================================================

  const {
    // Auth & Loading
    user,
    loading,
    error,
    isAdmin,

    // Data
    houseManuals,
    visits,
    selectedHouseManual,
    selectedVisit,

    // HeyGen state
    deepfakes,
    deepfakeForm,
    deepfakeStatus,

    // ElevenLabs state
    narrations,
    narrators,
    selectedNarrator,
    narrationScript,
    narrationStatus,

    // Jingle state
    jingles,
    melodyPreference,
    contentPreferences,
    jingleLyrics,
    jingleStatus,

    // Data selection handlers
    handleHouseManualSelect,
    handleVisitSelect,

    // HeyGen handlers
    handleDeepfakeFormChange,
    handleGenerateDeepfakeScript,
    handleGenerateDeepfakeVideo,
    handleCheckDeepfakeStatus,
    handleAttachDeepfake,

    // ElevenLabs handlers
    handleNarratorSelect,
    handleNarrationScriptChange,
    handleGenerateNarrationScript,
    handleGenerateNarration,
    handleAttachNarration,

    // Jingle handlers
    handleMelodyPreferenceChange,
    handleContentPreferenceToggle,
    handleJingleLyricsChange,
    handleGenerateJingleLyrics,
    handleCreateJingle,
    handleAttachJingle,

    // Refresh handler
    handleRefreshData,
  } = useAiToolsPageLogic();

  // ============================================================================
  // RENDER - Loading State
  // ============================================================================

  if (loading) {
    return (
      <div className="ai-tools-page-wrapper">
        <Header />
        <main className="ai-tools-main">
          <div className="ai-tools-container">
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading AI Tools...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Error State
  // ============================================================================

  if (error) {
    return (
      <div className="ai-tools-page-wrapper">
        <Header />
        <main className="ai-tools-main">
          <div className="ai-tools-container">
            <div className="error-state">
              <div className="error-icon">&#9888;</div>
              <h2>Unable to Load AI Tools</h2>
              <p className="error-message">{error}</p>
              <button onClick={() => window.location.reload()} className="btn btn--primary">
                Reload Page
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Unauthorized State
  // ============================================================================

  if (!isAdmin) {
    return (
      <div className="ai-tools-page-wrapper">
        <Header />
        <main className="ai-tools-main">
          <div className="ai-tools-container">
            <div className="unauthorized-state">
              <div className="unauthorized-icon">&#128274;</div>
              <h2>Access Denied</h2>
              <p>This page is restricted to administrators only.</p>
              <button onClick={() => window.location.href = '/'} className="btn btn--primary">
                Go to Homepage
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ============================================================================
  // RENDER - Main Page
  // ============================================================================

  return (
    <div className="ai-tools-page-wrapper">
      <Header />

      <main className="ai-tools-main">
        <div className="ai-tools-container">
          {/* Page Header */}
          <section className="page-header">
            <div className="page-header__content">
              <h1 className="page-title">AI Tools Dashboard</h1>
              <p className="page-subtitle">
                Generate deepfake videos, narrations, and jingles for house manuals
              </p>
            </div>
            <button
              className="btn btn--secondary refresh-btn"
              onClick={handleRefreshData}
              title="Refresh data"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Refresh
            </button>
          </section>

          {/* House Manual Selection */}
          <section className="selection-section">
            <div className="selection-grid">
              <div className="selection-field">
                <label htmlFor="house-manual-select">House Manual</label>
                <select
                  id="house-manual-select"
                  value={selectedHouseManual}
                  onChange={(e) => handleHouseManualSelect(e.target.value)}
                  className="select-input"
                >
                  <option value="">Select a house manual...</option>
                  {houseManuals.map((manual) => (
                    <option key={manual._id} value={manual._id}>
                      {manual.Display || manual._id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="selection-field">
                <label htmlFor="visit-select">Visit (Optional)</label>
                <select
                  id="visit-select"
                  value={selectedVisit}
                  onChange={(e) => handleVisitSelect(e.target.value)}
                  className="select-input"
                  disabled={!selectedHouseManual}
                >
                  <option value="">Select a visit...</option>
                  {visits.map((visit) => (
                    <option key={visit._id} value={visit._id}>
                      {visit.Display || `Visit ${visit._id.slice(-6)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* HeyGen Section */}
          <HeyGenSection
            selectedHouseManual={selectedHouseManual}
            deepfakes={deepfakes}
            deepfakeForm={deepfakeForm}
            deepfakeStatus={deepfakeStatus}
            onFormChange={handleDeepfakeFormChange}
            onGenerateScript={handleGenerateDeepfakeScript}
            onGenerateVideo={handleGenerateDeepfakeVideo}
            onCheckStatus={handleCheckDeepfakeStatus}
            onAttach={handleAttachDeepfake}
          />

          {/* ElevenLabs Section */}
          <ElevenLabsSection
            selectedHouseManual={selectedHouseManual}
            selectedVisit={selectedVisit}
            narrations={narrations}
            narrators={narrators}
            selectedNarrator={selectedNarrator}
            narrationScript={narrationScript}
            narrationStatus={narrationStatus}
            onNarratorSelect={handleNarratorSelect}
            onScriptChange={handleNarrationScriptChange}
            onGenerateScript={handleGenerateNarrationScript}
            onGenerateNarration={handleGenerateNarration}
            onAttach={handleAttachNarration}
          />

          {/* Jingle Section */}
          <JingleSection
            selectedHouseManual={selectedHouseManual}
            selectedVisit={selectedVisit}
            jingles={jingles}
            melodyPreference={melodyPreference}
            contentPreferences={contentPreferences}
            jingleLyrics={jingleLyrics}
            jingleStatus={jingleStatus}
            onMelodyPreferenceChange={handleMelodyPreferenceChange}
            onContentPreferenceToggle={handleContentPreferenceToggle}
            onLyricsChange={handleJingleLyricsChange}
            onGenerateLyrics={handleGenerateJingleLyrics}
            onCreateJingle={handleCreateJingle}
            onAttach={handleAttachJingle}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
