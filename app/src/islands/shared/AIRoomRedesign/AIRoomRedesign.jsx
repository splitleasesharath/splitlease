/**
 * AIRoomRedesign Component
 *
 * Main popup/modal component for AI-powered room redesign.
 * Orchestrates the entire workflow: upload → style selection → generate → display result.
 *
 * Uses Split Lease's existing Toast system instead of react-hot-toast.
 * API calls go through the ai-room-redesign Edge Function for security.
 */

import { useEffect, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useToast, ToastProvider } from '../Toast';
import { useFileUpload } from './useFileUpload';
import { useRoomRedesign } from './useRoomRedesign';
import { defaultRoomStyles, photoTypeOptions } from './roomStyles';
import { FileUploader } from './FileUploader';
import { RoomStyleSelector } from './RoomStyleSelector';
import { PhotoTypeDropdown } from './PhotoTypeDropdown';
import { LoadingOverlay } from './LoadingOverlay';
import { ResultImageOverlay } from './ResultImageOverlay';
import './ai-room-redesign.css';

/**
 * @typedef {Object} RoomStyle
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} imageUrl
 * @property {string} prompt
 */

/**
 * @typedef {Object} AIRoomRedesignProps
 * @property {boolean} isOpen - Controls popup visibility
 * @property {() => void} onClose - Callback when popup closes
 * @property {(imageUrl: string) => void} [onRedesignComplete] - Success callback with result URL
 * @property {RoomStyle[]} [customStyles] - Override default room styles
 * @property {string} [defaultPhotoType] - Pre-selected room type
 * @property {number} [maxFileSizeMB=10] - Max upload size in MB
 * @property {string[]} [acceptedFileTypes] - Accepted MIME types
 * @property {string} [className] - Additional CSS classes
 */

/**
 * Inner component that uses the Toast hook
 * @param {AIRoomRedesignProps} props
 */
const AIRoomRedesignInner = (props) => {
  const {
    isOpen,
    onClose,
    onRedesignComplete,
    customStyles,
    defaultPhotoType,
    maxFileSizeMB = 10,
    acceptedFileTypes = ['image/jpeg', 'image/png', 'image/webp'],
    className,
  } = props;

  const { showToast } = useToast();
  const [shakeUpload, setShakeUpload] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const styles = customStyles || defaultRoomStyles;
  const fileSizeLimit = maxFileSizeMB;
  const fileTypes = acceptedFileTypes;

  // File upload hook
  const {
    file,
    preview,
    base64,
    error: fileError,
    isValidating,
    handleFileSelect,
    clearFile,
  } = useFileUpload({
    maxSizeMB: fileSizeLimit,
    acceptedTypes: fileTypes,
    onError: (error) => showToast({ title: 'Upload Error', content: error, type: 'error' }),
  });

  // Room redesign hook
  const {
    isLoading,
    resultImage,
    selectedRoomStyle,
    selectedPhotoType,
    error: redesignError,
    setSelectedStyle,
    setSelectedPhotoType,
    setBase64Image,
    setUploadedFile,
    generateRedesign,
    reset,
    canGenerate,
  } = useRoomRedesign({
    onSuccess: (imageUrl) => {
      showToast({ title: 'Success!', content: 'Your room has been redesigned.', type: 'success' });
      setShowResult(true);
      onRedesignComplete?.(imageUrl);
    },
    onError: (error) => showToast({ title: 'Generation Failed', content: error, type: 'error' }),
  });

  // Sync file upload state with redesign state
  useEffect(() => {
    setBase64Image(base64);
    setUploadedFile(file);
  }, [base64, file, setBase64Image, setUploadedFile]);

  // Set default photo type on mount
  useEffect(() => {
    if (defaultPhotoType) {
      setSelectedPhotoType(defaultPhotoType);
    }
  }, [defaultPhotoType, setSelectedPhotoType]);

  // Handle upload button click
  const handleUploadClick = useCallback(() => {
    if (!file) {
      showToast({ title: 'No Image Selected', content: 'Please upload a room image first.', type: 'error' });
      setShakeUpload(true);
      setTimeout(() => setShakeUpload(false), 500);
      return;
    }

    if (!selectedRoomStyle) {
      showToast({ title: 'No Style Selected', content: 'Please select a design style.', type: 'error' });
      return;
    }

    generateRedesign();
  }, [file, selectedRoomStyle, generateRedesign, showToast]);

  // Handle close
  const handleClose = useCallback(() => {
    reset();
    clearFile();
    setShowResult(false);
    onClose();
  }, [reset, clearFile, onClose]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setShowResult(false);
    generateRedesign();
  }, [generateRedesign]);

  // Handle result close
  const handleResultClose = useCallback(() => {
    setShowResult(false);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm ai-room-redesign-fade-in"
        onClick={handleClose}
      />

      {/* Popup Container */}
      <div
        className={clsx(
          'fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2',
          'z-50 bg-gray-50 rounded-2xl shadow-2xl overflow-hidden',
          'md:w-full md:max-w-2xl md:max-h-[90vh]',
          'flex flex-col ai-room-redesign-slide-up',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              AI Room Redesign
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload your room picture to be redesigned
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* File Uploader */}
          <FileUploader
            onFileSelect={handleFileSelect}
            preview={preview}
            file={file}
            error={fileError}
            isValidating={isValidating}
            onClear={clearFile}
            maxSizeMB={fileSizeLimit}
            shake={shakeUpload}
          />

          {/* Photo Type Dropdown */}
          <PhotoTypeDropdown
            options={photoTypeOptions}
            selectedType={selectedPhotoType}
            onSelectType={setSelectedPhotoType}
            disabled={isLoading}
          />

          {/* Room Style Selector */}
          <RoomStyleSelector
            styles={styles}
            selectedStyle={selectedRoomStyle}
            onSelectStyle={setSelectedStyle}
            disabled={isLoading}
          />

          {/* Error Display */}
          {redesignError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-500">{redesignError}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-4 md:p-6 border-t border-gray-200 bg-gray-100">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleUploadClick}
            disabled={!canGenerate || isLoading}
            className={clsx(
              'px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2',
              canGenerate && !isLoading
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Redesign Room
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      <LoadingOverlay isVisible={isLoading} />

      {/* Result Image Overlay */}
      <ResultImageOverlay
        imageUrl={resultImage}
        isVisible={showResult && !!resultImage}
        onClose={handleResultClose}
        onRetry={handleRetry}
        originalImageUrl={preview}
      />
    </>
  );
};

/**
 * AI Room Redesign main component
 * Wraps inner component with ToastProvider to ensure Toast context is available
 * @param {AIRoomRedesignProps} props
 */
export const AIRoomRedesign = (props) => {
  return (
    <ToastProvider>
      <AIRoomRedesignInner {...props} />
    </ToastProvider>
  );
};
