import { useState, useEffect } from 'react';
import '../../../styles/components/ai-import-assistant-modal.css';

/**
 * AI Import Assistant Modal Component
 *
 * A modal that runs AI generation for multiple listing fields:
 * - Listing Name
 * - Description
 * - Neighborhood Description
 * - In-Unit Amenities
 * - Building Amenities
 * - House Rules
 * - Safety Features
 *
 * Shows progress with a loading wheel for each item being generated,
 * then displays a success state when complete.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls modal visibility
 * @param {Function} props.onClose - Close handler callback
 * @param {Function} props.onComplete - Called when all generation is complete with results
 * @param {Object} props.generationStatus - Current status of each generation task
 * @param {boolean} props.isGenerating - Whether generation is in progress
 * @param {boolean} props.isComplete - Whether all generation is complete
 * @param {Object} props.generatedData - The generated data to display on success
 * @param {Function} props.onStartGeneration - Called to start the AI generation process
 */

// Status icons
const SpinnerIcon = () => (
  <svg className="ai-import-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

// Protocol: NO GREEN - use Positive Purple (#5B5FCF)
const SuccessIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#5B5FCF" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

// Protocol: Close icon - 32x32, strokeWidth 2.5
const CloseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Confetti colors - Protocol: NO GREEN, use purple tones
const CONFETTI_COLORS = ['#31135D', '#6D31C2', '#5B5FCF', '#F7F2FA', '#f472b6', '#60a5fa', '#fbbf24'];
const CONFETTI_SHAPES = ['circle', 'square', 'ribbon'];

/**
 * Generates confetti pieces with randomized properties
 */
const generateConfettiPieces = (count = 50) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    shape: CONFETTI_SHAPES[i % CONFETTI_SHAPES.length],
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
  }));
};

/**
 * Confetti celebration component
 */
const ConfettiCelebration = () => {
  const pieces = generateConfettiPieces(50);

  return (
    <div className="ai-import-confetti-container">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className={`ai-import-confetti ai-import-confetti--${piece.shape}`}
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

// Generation task labels - ordered to show data loading first, then AI generation
// This matches the actual execution order in useListingDashboardPageLogic.js
const GENERATION_TASKS = [
  { key: 'inUnitAmenities', label: 'In-Unit Amenities' },
  { key: 'buildingAmenities', label: 'Building Amenities' },
  { key: 'neighborhood', label: 'Neighborhood Description' },
  { key: 'houseRules', label: 'House Rules' },
  { key: 'safetyFeatures', label: 'Safety Features' },
  { key: 'description', label: 'Property Description (AI)' },
  { key: 'name', label: 'Listing Name (AI)' },
];

const AIImportAssistantModal = ({
  isOpen = false,
  onClose = () => {},
  onComplete = () => {},
  generationStatus = {},
  isGenerating = false,
  isComplete = false,
  generatedData = {},
  onStartGeneration = () => {},
}) => {
  const [hasStarted, setHasStarted] = useState(false);

  // Auto-start generation when modal opens
  useEffect(() => {
    if (isOpen && !hasStarted && !isGenerating && !isComplete) {
      setHasStarted(true);
      onStartGeneration();
    }
  }, [isOpen, hasStarted, isGenerating, isComplete, onStartGeneration]);

  // Reset hasStarted when modal closes
  useEffect(() => {
    if (!isOpen) {
      setHasStarted(false);
    }
  }, [isOpen]);

  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isGenerating, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  /**
   * Handles backdrop click to close modal (only when not generating)
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isGenerating) {
      onClose();
    }
  };

  /**
   * Handle completion and close
   */
  const handleComplete = () => {
    onComplete(generatedData);
    onClose();
  };

  /**
   * Get the status icon for a task
   */
  const getStatusIcon = (taskKey) => {
    const status = generationStatus[taskKey];
    if (status === 'complete') {
      return <CheckIcon />;
    }
    if (status === 'loading') {
      return <SpinnerIcon />;
    }
    return null; // pending - no icon
  };

  /**
   * Get the status class for a task
   */
  const getStatusClass = (taskKey) => {
    const status = generationStatus[taskKey];
    if (status === 'complete') return 'ai-import-task--complete';
    if (status === 'loading') return 'ai-import-task--loading';
    return 'ai-import-task--pending';
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div
      className="ai-import-modal-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-import-title"
    >
      <div
        className="ai-import-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle - Protocol Section 1 */}
        <div className="ai-import-grab-handle" aria-hidden="true" />

        {/* Header */}
        <div className="ai-import-header">
          <div className="ai-import-header-content">
            <span className="ai-import-icon">
              <SparklesIcon />
            </span>
            <h2 id="ai-import-title" className="ai-import-title">
              <span className="ai-import-title-desktop">
                {isComplete ? 'AI Import Complete!' : 'AI Import Assistant'}
              </span>
              <span className="ai-import-title-mobile">
                {isComplete ? 'Complete!' : 'AI Import'}
              </span>
            </h2>
          </div>
          {!isGenerating && (
            <button
              onClick={onClose}
              className="ai-import-close-btn"
              aria-label="Close modal"
              type="button"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Confetti celebration on completion */}
        {isComplete && <ConfettiCelebration />}

        {/* Content */}
        <div className="ai-import-content">
          {isComplete ? (
            // Success State
            <div className="ai-import-success">
              <div className="ai-import-success-icon">
                <SuccessIcon />
              </div>
              <h3 className="ai-import-success-title">All fields generated successfully!</h3>
              <p className="ai-import-success-text">
                Your listing has been updated with AI-generated content. Review the changes below and make any adjustments as needed.
              </p>

              {/* Summary of what was generated */}
              <div className="ai-import-summary">
                <div className="ai-import-summary-item">
                  <span className="ai-import-summary-label">New Name:</span>
                  <span className="ai-import-summary-value">{generatedData.name || 'N/A'}</span>
                </div>
                <div className="ai-import-summary-item">
                  <span className="ai-import-summary-label">Amenities Added:</span>
                  <span className="ai-import-summary-value">
                    {(generatedData.inUnitAmenitiesCount || 0) + (generatedData.buildingAmenitiesCount || 0)} total
                  </span>
                </div>
                <div className="ai-import-summary-item">
                  <span className="ai-import-summary-label">Rules & Safety:</span>
                  <span className="ai-import-summary-value">
                    {(generatedData.houseRulesCount || 0) + (generatedData.safetyFeaturesCount || 0)} items
                  </span>
                </div>
              </div>
            </div>
          ) : (
            // Loading State
            <div className="ai-import-loading">
              <p className="ai-import-loading-text">
                Generating your listing content using AI...
              </p>

              {/* Task List */}
              <div className="ai-import-tasks">
                {GENERATION_TASKS.map((task) => (
                  <div
                    key={task.key}
                    className={`ai-import-task ${getStatusClass(task.key)}`}
                  >
                    <div className="ai-import-task-icon">
                      {getStatusIcon(task.key)}
                    </div>
                    <span className="ai-import-task-label">{task.label}</span>
                  </div>
                ))}
              </div>

              <p className="ai-import-loading-note">
                This may take a few moments. Please don't close this window.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ai-import-footer">
          {isComplete ? (
            <button
              type="button"
              onClick={handleComplete}
              className="ai-import-btn ai-import-btn-primary"
            >
              View Changes
            </button>
          ) : (
            <button
              type="button"
              disabled={true}
              className="ai-import-btn ai-import-btn-disabled"
            >
              Generating...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIImportAssistantModal;
