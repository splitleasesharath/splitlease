/**
 * InputMethodSelector Component
 *
 * Tab-based selector for choosing between different AI input methods.
 * Displays icons and labels for each method with active state indication.
 *
 * @module AITools/InputMethodSelector
 */

import React from 'react';
import { useAITools, INPUT_METHODS } from './AIToolsProvider';

// Icons for each input method
const TextIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const WifiIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);

const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const FileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

/**
 * Configuration for each input method tab
 */
const METHOD_CONFIG = {
  [INPUT_METHODS.FREEFORM_TEXT]: {
    icon: TextIcon,
    label: 'Text Input',
    shortLabel: 'Text',
    description: 'Type or paste your house manual content',
  },
  [INPUT_METHODS.WIFI_PHOTO]: {
    icon: WifiIcon,
    label: 'WiFi Photo',
    shortLabel: 'WiFi',
    description: 'Extract WiFi credentials from a photo',
  },
  [INPUT_METHODS.AUDIO_RECORDING]: {
    icon: MicIcon,
    label: 'Voice Recording',
    shortLabel: 'Voice',
    description: 'Record or upload audio of your house manual',
  },
  [INPUT_METHODS.PDF_DOC]: {
    icon: FileIcon,
    label: 'Document Upload',
    shortLabel: 'Docs',
    description: 'Upload PDF or import from Google Docs',
  },
  [INPUT_METHODS.PHONE_CALL]: {
    icon: PhoneIcon,
    label: 'AI Phone Call',
    shortLabel: 'Call',
    description: 'Receive an AI-powered call to collect information',
  },
};

/**
 * InputMethodSelector - Tab selector for AI input methods
 */
export default function InputMethodSelector({ className = '' }) {
  const { activeMethod, setActiveMethod, isAnyProcessing } = useAITools();

  const methods = Object.values(INPUT_METHODS);

  return (
    <div className={`ai-tools-selector ${className}`}>
      <div className="ai-tools-selector__tabs" role="tablist">
        {methods.map((method) => {
          const config = METHOD_CONFIG[method];
          const Icon = config.icon;
          const isActive = activeMethod === method;

          return (
            <button
              key={method}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`ai-tools-selector__tab ${isActive ? 'ai-tools-selector__tab--active' : ''}`}
              onClick={() => setActiveMethod(method)}
              disabled={isAnyProcessing}
              title={config.description}
            >
              <span className="ai-tools-selector__tab-icon">
                <Icon />
              </span>
              <span className="ai-tools-selector__tab-label">{config.label}</span>
              <span className="ai-tools-selector__tab-short-label">{config.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Description for active method */}
      <p className="ai-tools-selector__description">
        {METHOD_CONFIG[activeMethod]?.description}
      </p>
    </div>
  );
}
