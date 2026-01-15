/**
 * WifiPhotoExtractor Component
 *
 * Extracts WiFi credentials from photos of router labels, WiFi cards, etc.
 * Uses GPT-4 Vision API for OCR.
 *
 * Features:
 * - Drag and drop file upload
 * - Click to select file
 * - Image preview
 * - Confidence indicator for extraction
 *
 * @module AITools/WifiPhotoExtractor
 */

import React, { useState, useCallback, useRef } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

// Icons
const CameraIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const WifiIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
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

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 10;

/**
 * Convert file to base64
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Remove data URL prefix to get pure base64
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * WifiPhotoExtractor - Extract WiFi credentials from photos
 */
export default function WifiPhotoExtractor({ onDataExtracted }) {
  const {
    setProcessingState,
    setError,
    updateExtractedData,
    processingStates,
    errors,
    successStates,
    INPUT_METHODS,
  } = useAITools();

  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedCredentials, setExtractedCredentials] = useState(null);

  const isProcessing = processingStates[INPUT_METHODS.WIFI_PHOTO];
  const error = errors[INPUT_METHODS.WIFI_PHOTO];
  const isSuccess = successStates[INPUT_METHODS.WIFI_PHOTO];

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(async (file) => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(INPUT_METHODS.WIFI_PHOTO, 'Please upload a JPG, PNG, GIF, or WebP image');
      return;
    }

    // Validate file size
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(INPUT_METHODS.WIFI_PHOTO, `Image must be smaller than ${MAX_SIZE_MB}MB`);
      return;
    }

    // Set file and generate preview
    setSelectedFile(file);
    setExtractedCredentials(null);

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
  }, [setError, INPUT_METHODS]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  /**
   * Clear selected file
   */
  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setExtractedCredentials(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Extract WiFi from image
   */
  const handleExtract = useCallback(async () => {
    if (!selectedFile) return;

    setProcessingState(INPUT_METHODS.WIFI_PHOTO, true);

    try {
      const base64 = await fileToBase64(selectedFile);

      const { data, error: apiError } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'extract_wifi',
          payload: {
            image: base64,
            mimeType: selectedFile.type,
          },
        },
      });

      if (apiError) {
        throw new Error(apiError.message || 'Failed to process image');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to extract WiFi credentials');
      }

      const extracted = data.data;
      setExtractedCredentials(extracted);

      // Only update if we found something
      if (extracted.wifi_name || extracted.wifi_password) {
        updateExtractedData(INPUT_METHODS.WIFI_PHOTO, {
          wifi_name: extracted.wifi_name || '',
          wifi_password: extracted.wifi_password || '',
        });

        onDataExtracted?.({
          wifi_name: extracted.wifi_name || '',
          wifi_password: extracted.wifi_password || '',
        });

        if (window.showToast) {
          window.showToast('WiFi credentials extracted!', 'success');
        }
      } else {
        if (window.showToast) {
          window.showToast('No WiFi credentials found in image', 'warning');
        }
      }
    } catch (err) {
      console.error('[WifiPhotoExtractor] Error:', err);
      setError(INPUT_METHODS.WIFI_PHOTO, err.message);

      if (window.showToast) {
        window.showToast(err.message, 'error');
      }
    } finally {
      setProcessingState(INPUT_METHODS.WIFI_PHOTO, false);
    }
  }, [selectedFile, setProcessingState, setError, updateExtractedData, onDataExtracted, INPUT_METHODS]);

  /**
   * Get confidence badge color
   */
  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return '#22c55e';
      case 'medium': return '#eab308';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className="ai-tools-wifi">
      <div className="ai-tools-wifi__header">
        <h3 className="ai-tools-wifi__title">
          <WifiIcon />
          WiFi Photo Extractor
        </h3>
        <p className="ai-tools-wifi__description">
          Upload a photo of your router label, WiFi card, or any image showing your network credentials.
        </p>
      </div>

      {/* File input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        className="ai-tools-wifi__input"
        style={{ display: 'none' }}
      />

      {/* Dropzone or Preview */}
      {!preview ? (
        <div
          className={`ai-tools-wifi__dropzone ${isDragging ? 'ai-tools-wifi__dropzone--dragging' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CameraIcon />
          <p className="ai-tools-wifi__dropzone-text">
            <strong>Click to upload</strong> or drag and drop
          </p>
          <p className="ai-tools-wifi__dropzone-hint">
            JPG, PNG, GIF, or WebP up to {MAX_SIZE_MB}MB
          </p>
        </div>
      ) : (
        <div className="ai-tools-wifi__preview-container">
          <div className="ai-tools-wifi__preview">
            <img src={preview} alt="WiFi credential preview" />
            <button
              type="button"
              className="ai-tools-wifi__clear-btn"
              onClick={handleClear}
              aria-label="Clear image"
            >
              <XIcon />
            </button>
          </div>

          {/* Extracted credentials */}
          {extractedCredentials && (
            <div className="ai-tools-wifi__results">
              <div className="ai-tools-wifi__results-header">
                <h4>Extracted Credentials</h4>
                <span
                  className="ai-tools-wifi__confidence-badge"
                  style={{ backgroundColor: getConfidenceColor(extractedCredentials.confidence) }}
                >
                  {extractedCredentials.confidence} confidence
                </span>
              </div>

              <div className="ai-tools-wifi__credential">
                <span className="ai-tools-wifi__credential-label">Network:</span>
                <span className="ai-tools-wifi__credential-value">
                  {extractedCredentials.wifi_name || 'Not found'}
                </span>
              </div>

              <div className="ai-tools-wifi__credential">
                <span className="ai-tools-wifi__credential-label">Password:</span>
                <span className="ai-tools-wifi__credential-value">
                  {extractedCredentials.wifi_password || 'Not found'}
                </span>
              </div>

              {extractedCredentials.notes && (
                <p className="ai-tools-wifi__notes">{extractedCredentials.notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="ai-tools-wifi__error">
          {error}
        </div>
      )}

      {/* Extract button */}
      {preview && !extractedCredentials && (
        <button
          type="button"
          className="ai-tools-wifi__submit"
          onClick={handleExtract}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <SpinnerIcon />
              Extracting...
            </>
          ) : (
            <>
              <WifiIcon />
              Extract WiFi Credentials
            </>
          )}
        </button>
      )}

      {/* Success actions */}
      {extractedCredentials && (extractedCredentials.wifi_name || extractedCredentials.wifi_password) && (
        <div className="ai-tools-wifi__success-actions">
          <CheckIcon />
          <span>Credentials added to your house manual</span>
        </div>
      )}

      <p className="ai-tools-wifi__hint">
        Tip: Make sure the WiFi name and password are clearly visible in the photo for best results.
      </p>
    </div>
  );
}
