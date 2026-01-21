/**
 * ResultImageOverlay Component
 *
 * Full-screen overlay to display the AI-generated room redesign.
 * Features comparison view (original vs redesigned) and download functionality.
 */

import { useState } from 'react';
import clsx from 'clsx';
import { downloadImage } from './fileUtils';

/**
 * @typedef {Object} ResultImageOverlayProps
 * @property {string|null} imageUrl - Generated image URL (data URL)
 * @property {boolean} isVisible - Whether overlay is visible
 * @property {() => void} onClose - Close callback
 * @property {() => void} [onRetry] - Retry callback
 * @property {string|null} [originalImageUrl] - Original image for comparison
 */

/**
 * Result display overlay with comparison and download
 * @param {ResultImageOverlayProps} props
 */
export const ResultImageOverlay = ({
  imageUrl,
  isVisible,
  onClose,
  onRetry,
  originalImageUrl,
}) => {
  const [showComparison, setShowComparison] = useState(false);

  if (!isVisible || !imageUrl) return null;

  const handleDownload = () => {
    if (imageUrl) {
      downloadImage(imageUrl, `redesigned-room-${Date.now()}.png`);
    }
  };

  return (
    <div
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4',
        'animate-fade-in'
      )}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">
            Redesign Result
          </h2>
          <button
            onClick={onClose}
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

        {/* Image Container */}
        <div className="relative overflow-auto max-h-[60vh]">
          {showComparison && originalImageUrl ? (
            <div className="grid grid-cols-2 gap-2 p-4">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2 text-center">
                  Original
                </p>
                <img
                  src={originalImageUrl}
                  alt="Original room"
                  className="w-full h-auto rounded-lg"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2 text-center">
                  Redesigned
                </p>
                <img
                  src={imageUrl}
                  alt="Redesigned room"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt="Redesigned room"
              className="w-full h-auto"
            />
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            {originalImageUrl && (
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={clsx(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  showComparison
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                )}
              >
                {showComparison ? 'Hide Comparison' : 'Compare'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Try Again
              </button>
            )}
            <button
              onClick={handleDownload}
              className="px-6 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-2"
            >
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
