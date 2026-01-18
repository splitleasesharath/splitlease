/**
 * PdfDocUploader Component
 *
 * Import house manual content from PDF files or Google Docs.
 *
 * Features:
 * - PDF file upload with drag & drop
 * - Google Docs URL input
 * - Document preview/status
 * - AI-powered content extraction
 *
 * @module AITools/PdfDocUploader
 */

import React, { useState, useCallback, useRef } from 'react';
import { useAITools } from './AIToolsProvider';
import { supabase } from '../../../lib/supabase';

// Icons
const FileIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const LinkIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const GoogleDocsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
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

// Allowed document types
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_DOC_SIZE_MB = 20;

/**
 * Convert file to base64
 */
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Validate Google Docs URL
 */
function isValidGoogleDocsUrl(url) {
  const patterns = [
    /docs\.google\.com\/document\/d\//,
    /drive\.google\.com\/file\/d\//,
    /drive\.google\.com\/open\?id=/,
  ];
  return patterns.some((pattern) => pattern.test(url));
}

/**
 * PdfDocUploader - Import house manual from PDF or Google Docs
 */
export default function PdfDocUploader({ onDataExtracted }) {
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
  const [inputMode, setInputMode] = useState('file'); // 'file' or 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState(null);

  const isProcessing = processingStates[INPUT_METHODS.PDF_DOC];
  const error = errors[INPUT_METHODS.PDF_DOC];
  const isSuccess = successStates[INPUT_METHODS.PDF_DOC];

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback((file) => {
    // Validate type
    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      setError(INPUT_METHODS.PDF_DOC, 'Please upload a PDF or image file');
      return;
    }

    // Validate size
    if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
      setError(INPUT_METHODS.PDF_DOC, `Document must be smaller than ${MAX_DOC_SIZE_MB}MB`);
      return;
    }

    setSelectedFile(file);
    setExtractedPreview(null);
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
  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setExtractedPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Process PDF file
   */
  const handleProcessFile = useCallback(async () => {
    if (!selectedFile) return;

    setProcessingState(INPUT_METHODS.PDF_DOC, true);

    try {
      const base64 = await fileToBase64(selectedFile);

      const { data, error: apiError } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'parse_document',
          payload: {
            document: base64,
            fileName: selectedFile.name,
            mimeType: selectedFile.type,
          },
        },
      });

      if (apiError) {
        throw new Error(apiError.message || 'Failed to process document');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to parse document');
      }

      const extracted = data.data;
      setExtractedPreview(extracted);

      updateExtractedData(INPUT_METHODS.PDF_DOC, extracted);
      onDataExtracted?.(extracted);

      if (window.showToast) {
        window.showToast('Document parsed successfully!', 'success');
      }
    } catch (err) {
      console.error('[PdfDocUploader] Error:', err);
      setError(INPUT_METHODS.PDF_DOC, err.message);

      if (window.showToast) {
        window.showToast(err.message, 'error');
      }
    } finally {
      setProcessingState(INPUT_METHODS.PDF_DOC, false);
    }
  }, [selectedFile, setProcessingState, setError, updateExtractedData, onDataExtracted, INPUT_METHODS]);

  /**
   * Process Google Doc URL
   */
  const handleProcessUrl = useCallback(async () => {
    if (!googleDocUrl.trim()) {
      setError(INPUT_METHODS.PDF_DOC, 'Please enter a Google Docs URL');
      return;
    }

    if (!isValidGoogleDocsUrl(googleDocUrl)) {
      setError(INPUT_METHODS.PDF_DOC, 'Please enter a valid Google Docs or Google Drive URL');
      return;
    }

    setProcessingState(INPUT_METHODS.PDF_DOC, true);

    try {
      const { data, error: apiError } = await supabase.functions.invoke('house-manual', {
        body: {
          action: 'parse_google_doc',
          payload: { url: googleDocUrl.trim() },
        },
      });

      if (apiError) {
        throw new Error(apiError.message || 'Failed to fetch Google Doc');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to parse Google Doc');
      }

      const extracted = data.data;
      setExtractedPreview(extracted);

      updateExtractedData(INPUT_METHODS.PDF_DOC, extracted);
      onDataExtracted?.(extracted);

      if (window.showToast) {
        window.showToast('Google Doc imported successfully!', 'success');
      }
    } catch (err) {
      console.error('[PdfDocUploader] Error:', err);
      setError(INPUT_METHODS.PDF_DOC, err.message);

      if (window.showToast) {
        window.showToast(err.message, 'error');
      }
    } finally {
      setProcessingState(INPUT_METHODS.PDF_DOC, false);
    }
  }, [googleDocUrl, setProcessingState, setError, updateExtractedData, onDataExtracted, INPUT_METHODS]);

  return (
    <div className="ai-tools-pdf">
      <div className="ai-tools-pdf__header">
        <h3 className="ai-tools-pdf__title">
          <FileIcon />
          Document Import
        </h3>
        <p className="ai-tools-pdf__description">
          Upload a PDF or import from Google Docs to extract house manual content.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="ai-tools-pdf__mode-toggle">
        <button
          type="button"
          className={`ai-tools-pdf__mode-btn ${inputMode === 'file' ? 'ai-tools-pdf__mode-btn--active' : ''}`}
          onClick={() => setInputMode('file')}
        >
          <FileIcon />
          Upload PDF
        </button>
        <button
          type="button"
          className={`ai-tools-pdf__mode-btn ${inputMode === 'url' ? 'ai-tools-pdf__mode-btn--active' : ''}`}
          onClick={() => setInputMode('url')}
        >
          <GoogleDocsIcon />
          Google Docs
        </button>
      </div>

      {/* File upload interface */}
      {inputMode === 'file' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_DOC_TYPES.join(',')}
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />

          {!selectedFile ? (
            <div
              className={`ai-tools-pdf__dropzone ${isDragging ? 'ai-tools-pdf__dropzone--dragging' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileIcon />
              <p className="ai-tools-pdf__dropzone-text">
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="ai-tools-pdf__dropzone-hint">
                PDF or image files up to {MAX_DOC_SIZE_MB}MB
              </p>
            </div>
          ) : (
            <div className="ai-tools-pdf__file-preview">
              <div className="ai-tools-pdf__file-info">
                <FileIcon />
                <span className="ai-tools-pdf__file-name">{selectedFile.name}</span>
                <span className="ai-tools-pdf__file-size">
                  ({Math.round(selectedFile.size / 1024)}KB)
                </span>
              </div>
              <button
                type="button"
                className="ai-tools-pdf__clear-btn"
                onClick={handleClearFile}
                aria-label="Clear file"
              >
                <XIcon />
              </button>
            </div>
          )}

          {selectedFile && !extractedPreview && (
            <button
              type="button"
              className="ai-tools-pdf__submit"
              onClick={handleProcessFile}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <SpinnerIcon />
                  Processing...
                </>
              ) : (
                <>
                  <FileIcon />
                  Extract Content
                </>
              )}
            </button>
          )}
        </>
      )}

      {/* Google Docs URL interface */}
      {inputMode === 'url' && (
        <div className="ai-tools-pdf__url-input">
          <div className="ai-tools-pdf__url-field">
            <LinkIcon />
            <input
              type="url"
              value={googleDocUrl}
              onChange={(e) => setGoogleDocUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              disabled={isProcessing}
            />
          </div>

          <p className="ai-tools-pdf__url-hint">
            Make sure the document is shared as "Anyone with the link can view"
          </p>

          <button
            type="button"
            className="ai-tools-pdf__submit"
            onClick={handleProcessUrl}
            disabled={isProcessing || !googleDocUrl.trim()}
          >
            {isProcessing ? (
              <>
                <SpinnerIcon />
                Importing...
              </>
            ) : (
              <>
                <GoogleDocsIcon />
                Import from Google Docs
              </>
            )}
          </button>
        </div>
      )}

      {/* Extracted preview */}
      {extractedPreview && (
        <div className="ai-tools-pdf__preview">
          <div className="ai-tools-pdf__preview-header">
            <CheckIcon />
            <span>Content extracted successfully</span>
          </div>

          <div className="ai-tools-pdf__preview-fields">
            {extractedPreview.wifi_name && (
              <div className="ai-tools-pdf__preview-field">
                <strong>WiFi:</strong> {extractedPreview.wifi_name}
              </div>
            )}
            {extractedPreview.check_in_instructions && (
              <div className="ai-tools-pdf__preview-field">
                <strong>Check-in:</strong> {extractedPreview.check_in_instructions.substring(0, 100)}...
              </div>
            )}
            {extractedPreview.house_rules?.length > 0 && (
              <div className="ai-tools-pdf__preview-field">
                <strong>House Rules:</strong> {extractedPreview.house_rules.length} rules found
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="ai-tools-pdf__error">
          {error}
        </div>
      )}

      <p className="ai-tools-pdf__hint">
        Tip: PDF documents work best when they have selectable text (not scanned images).
      </p>
    </div>
  );
}
