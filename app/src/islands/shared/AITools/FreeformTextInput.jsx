/**
 * FreeformTextInput Component
 *
 * Allows users to input house manual content in natural language.
 * AI parses the text into structured fields.
 *
 * Features:
 * - Large textarea for pasting or typing content
 * - Character count
 * - Loading state with progress indicator
 * - Success state with extracted fields preview
 *
 * @module AITools/FreeformTextInput
 */

import React, { useState, useCallback } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

// Icons
const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="ai-tools-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

// Sample templates for user guidance
const SAMPLE_TEMPLATES = [
  {
    label: 'Basic Info',
    text: `WiFi Network: MyHomeNetwork
WiFi Password: SecurePass123

Check-in: Use the lockbox (code: 1234) at the front door. Keys are inside.
Check-out: Leave keys on the kitchen counter. No need to clean, just tidy up.`,
  },
  {
    label: 'Detailed Manual',
    text: `Welcome to our apartment!

WiFi Details:
- Network: ApartmentWiFi_5G
- Password: Welcome2024!

Check-in Instructions:
1. Find the lockbox on the left side of the main entrance
2. Code is 5678
3. Take the silver key for the apartment
4. Unit is #305 on the 3rd floor

Check-out:
- Please leave by 11 AM
- Strip the beds and leave linens in the hamper
- Take out any trash
- Lock all windows
- Return keys to the lockbox

House Rules:
- No smoking inside
- Quiet hours: 10 PM - 8 AM
- No parties or events
- Max 4 guests

Parking: One spot in the garage, space #15. Use the remote on the keychain.`,
  },
];

const MIN_LENGTH = 10;
const MAX_LENGTH = 50000;

/**
 * FreeformTextInput - Natural language input for house manual
 */
export default function FreeformTextInput({ onDataExtracted }) {
  const {
    setProcessingState,
    setError,
    updateExtractedData,
    processingStates,
    errors,
    successStates,
    INPUT_METHODS,
  } = useAITools();

  const [text, setText] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  const isProcessing = processingStates[INPUT_METHODS.FREEFORM_TEXT];
  const error = errors[INPUT_METHODS.FREEFORM_TEXT];
  const isSuccess = successStates[INPUT_METHODS.FREEFORM_TEXT];

  /**
   * Handle text submission
   */
  const handleSubmit = useCallback(async () => {
    if (text.trim().length < MIN_LENGTH) {
      setError(INPUT_METHODS.FREEFORM_TEXT, `Please enter at least ${MIN_LENGTH} characters`);
      return;
    }

    setProcessingState(INPUT_METHODS.FREEFORM_TEXT, true);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'parse_text',
          payload: { text: text.trim() },
        },
      });

      if (apiError) {
        throw new Error(apiError.message || 'Failed to process text');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to parse text');
      }

      // Update extracted data in context
      updateExtractedData(INPUT_METHODS.FREEFORM_TEXT, data.data);

      // Notify parent
      onDataExtracted?.(data.data);

      // Show toast
      if (window.showToast) {
        window.showToast('Text parsed successfully!', 'success');
      }
    } catch (err) {
      console.error('[FreeformTextInput] Error:', err);
      setError(INPUT_METHODS.FREEFORM_TEXT, err.message);

      if (window.showToast) {
        window.showToast(err.message, 'error');
      }
    } finally {
      setProcessingState(INPUT_METHODS.FREEFORM_TEXT, false);
    }
  }, [text, setProcessingState, setError, updateExtractedData, onDataExtracted, INPUT_METHODS]);

  /**
   * Insert template text
   */
  const handleUseTemplate = useCallback((template) => {
    setText(template.text);
    setShowTemplates(false);
  }, []);

  return (
    <div className="ai-tools-freeform">
      <div className="ai-tools-freeform__header">
        <h3 className="ai-tools-freeform__title">
          <SparklesIcon />
          Type or Paste Your House Manual
        </h3>
        <p className="ai-tools-freeform__description">
          Enter your house manual content in any format. Our AI will extract WiFi credentials,
          check-in instructions, house rules, and more.
        </p>
      </div>

      {/* Templates section */}
      <div className="ai-tools-freeform__templates">
        <button
          type="button"
          className="ai-tools-freeform__template-toggle"
          onClick={() => setShowTemplates(!showTemplates)}
        >
          {showTemplates ? 'Hide Examples' : 'Show Examples'}
        </button>

        {showTemplates && (
          <div className="ai-tools-freeform__template-list">
            {SAMPLE_TEMPLATES.map((template, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-tools-freeform__template-btn"
                onClick={() => handleUseTemplate(template)}
              >
                Use "{template.label}"
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Text input */}
      <div className="ai-tools-freeform__input-wrapper">
        <textarea
          className="ai-tools-freeform__textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your house manual content here...

Example:
WiFi: MyNetwork / Password123
Check-in: Use the lockbox (code 1234) by the front door...
House Rules: No smoking, quiet hours after 10pm..."
          disabled={isProcessing}
          maxLength={MAX_LENGTH}
          rows={12}
        />

        <div className="ai-tools-freeform__char-count">
          {text.length.toLocaleString()} / {MAX_LENGTH.toLocaleString()} characters
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="ai-tools-freeform__error">
          {error}
        </div>
      )}

      {/* Success message */}
      {isSuccess && !isProcessing && (
        <div className="ai-tools-freeform__success">
          <CheckIcon />
          Content parsed successfully! Review the extracted fields below.
        </div>
      )}

      {/* Submit button */}
      <button
        type="button"
        className="ai-tools-freeform__submit"
        onClick={handleSubmit}
        disabled={isProcessing || text.trim().length < MIN_LENGTH}
      >
        {isProcessing ? (
          <>
            <SpinnerIcon />
            Processing...
          </>
        ) : (
          <>
            <SparklesIcon />
            Extract Information
          </>
        )}
      </button>

      {/* Hint text */}
      <p className="ai-tools-freeform__hint">
        Tip: Include WiFi details, check-in/out instructions, parking info, and house rules for best results.
      </p>
    </div>
  );
}
