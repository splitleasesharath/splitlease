/**
 * PhoneCallInterface Component
 *
 * AI-powered phone call interface for house manual data collection.
 * Note: Requires Twilio setup to be fully functional.
 *
 * Features:
 * - Call initiation
 * - Call status display
 * - Guided vs freeform call modes
 * - Transcription display
 *
 * @module AITools/PhoneCallInterface
 */

import React, { useState, useCallback } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

// Icons
const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const PhoneOutgoingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 7 23 1 17 1" />
    <line x1="16" y1="8" x2="23" y2="1" />
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="ai-tools-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

/**
 * PhoneCallInterface - AI phone call for house manual collection
 */
export default function PhoneCallInterface({ onDataExtracted }) {
  const {
    setProcessingState,
    setError,
    updateExtractedData,
    processingStates,
    errors,
    INPUT_METHODS,
  } = useAITools();

  const [callType, setCallType] = useState('guided'); // 'guided' or 'freeform'
  const [callStatus, setCallStatus] = useState(null); // null | 'initiated' | 'queued' | 'unavailable'
  const [callMessage, setCallMessage] = useState('');

  const isProcessing = processingStates[INPUT_METHODS.PHONE_CALL];
  const error = errors[INPUT_METHODS.PHONE_CALL];

  /**
   * Initiate phone call
   */
  const handleInitiateCall = useCallback(async () => {
    setProcessingState(INPUT_METHODS.PHONE_CALL, true);
    setCallStatus(null);
    setCallMessage('');

    try {
      const { data, error: apiError } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'initiate_call',
          payload: { callType },
        },
      });

      if (apiError) {
        throw new Error(apiError.message || 'Failed to initiate call');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to initiate call');
      }

      const result = data.data;
      setCallStatus(result.status);
      setCallMessage(result.message);

      if (result.status === 'queued') {
        if (window.showToast) {
          window.showToast('Call queued! You will receive a call shortly.', 'success');
        }
      } else if (result.status === 'unavailable') {
        if (window.showToast) {
          window.showToast('Phone call feature is not yet available.', 'info');
        }
      }
    } catch (err) {
      console.error('[PhoneCallInterface] Error:', err);
      setError(INPUT_METHODS.PHONE_CALL, err.message);

      if (window.showToast) {
        window.showToast(err.message, 'error');
      }
    } finally {
      setProcessingState(INPUT_METHODS.PHONE_CALL, false);
    }
  }, [callType, setProcessingState, setError, INPUT_METHODS]);

  return (
    <div className="ai-tools-phone">
      <div className="ai-tools-phone__header">
        <h3 className="ai-tools-phone__title">
          <PhoneIcon />
          AI Phone Call
        </h3>
        <p className="ai-tools-phone__description">
          Receive an AI-powered phone call that will guide you through providing your house manual information.
        </p>
      </div>

      {/* Feature notice */}
      <div className="ai-tools-phone__notice">
        <InfoIcon />
        <div>
          <strong>Coming Soon</strong>
          <p>
            The AI phone call feature is currently in development. In the meantime, try our voice recording
            feature to speak your house manual content.
          </p>
        </div>
      </div>

      {/* Call type selection */}
      <div className="ai-tools-phone__type-selection">
        <h4>Call Type:</h4>
        <div className="ai-tools-phone__type-options">
          <label className="ai-tools-phone__type-option">
            <input
              type="radio"
              name="callType"
              value="guided"
              checked={callType === 'guided'}
              onChange={() => setCallType('guided')}
              disabled={isProcessing}
            />
            <div className="ai-tools-phone__type-content">
              <strong>Guided Call</strong>
              <span>AI asks specific questions about your property</span>
            </div>
          </label>

          <label className="ai-tools-phone__type-option">
            <input
              type="radio"
              name="callType"
              value="freeform"
              checked={callType === 'freeform'}
              onChange={() => setCallType('freeform')}
              disabled={isProcessing}
            />
            <div className="ai-tools-phone__type-content">
              <strong>Speak Freely</strong>
              <span>Tell us about your property in your own way</span>
            </div>
          </label>
        </div>
      </div>

      {/* How it works */}
      <div className="ai-tools-phone__how-it-works">
        <h4>How it works:</h4>
        <ol>
          <li>Click "Start Call" and we'll call your registered phone number</li>
          <li>Our AI assistant will {callType === 'guided' ? 'ask you questions' : 'listen to your description'}</li>
          <li>Your answers are transcribed and extracted into your house manual</li>
          <li>The call typically takes 3-5 minutes</li>
        </ol>
      </div>

      {/* Call status */}
      {callStatus && (
        <div className={`ai-tools-phone__status ai-tools-phone__status--${callStatus}`}>
          {callStatus === 'queued' && <CheckCircleIcon />}
          {callStatus === 'unavailable' && <InfoIcon />}
          <span>{callMessage}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="ai-tools-phone__error">
          {error}
        </div>
      )}

      {/* Initiate call button */}
      <button
        type="button"
        className="ai-tools-phone__submit"
        onClick={handleInitiateCall}
        disabled={isProcessing || callStatus === 'queued'}
      >
        {isProcessing ? (
          <>
            <SpinnerIcon />
            Initiating...
          </>
        ) : callStatus === 'queued' ? (
          <>
            <PhoneOutgoingIcon />
            Call Queued
          </>
        ) : (
          <>
            <PhoneOutgoingIcon />
            Start Call
          </>
        )}
      </button>

      <p className="ai-tools-phone__hint">
        Tip: Make sure your phone number is up to date in your account settings before starting a call.
      </p>
    </div>
  );
}
