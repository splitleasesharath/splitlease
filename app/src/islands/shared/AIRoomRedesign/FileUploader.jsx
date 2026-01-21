/**
 * FileUploader Component
 *
 * Drag-and-drop file upload with preview for room images.
 * Uses react-dropzone for drag-and-drop functionality.
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import { formatFileSize } from './fileUtils';

/**
 * @typedef {Object} FileUploaderProps
 * @property {(file: File) => void} onFileSelect - Callback when file is selected
 * @property {string|null} preview - Data URL for image preview
 * @property {File|null} file - Currently uploaded file
 * @property {string|null} error - Error message
 * @property {boolean} isValidating - Whether file is being processed
 * @property {() => void} onClear - Callback to clear the file
 * @property {number} [maxSizeMB=10] - Maximum file size in MB
 * @property {string[]} [acceptedTypes] - Accepted MIME types
 * @property {boolean} [shake=false] - Whether to apply shake animation
 */

/**
 * Drag-and-drop file uploader with image preview
 * @param {FileUploaderProps} props
 */
export const FileUploader = ({
  onFileSelect,
  preview,
  file,
  error,
  isValidating,
  onClear,
  maxSizeMB = 10,
  shake = false,
}) => {
  const onDrop = useCallback(
    (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    maxSize: maxSizeMB * 1024 * 1024,
    disabled: isValidating,
  });

  return (
    <div className={clsx('w-full', shake && 'animate-shake')}>
      {!preview ? (
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200',
            isDragActive
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-600 hover:bg-gray-50',
            error && 'border-red-500 bg-red-50',
            isValidating && 'opacity-50 cursor-wait'
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            {isDragActive ? (
              <p className="text-indigo-600 font-medium">Drop your image here...</p>
            ) : (
              <>
                <p className="text-gray-600">
                  <span className="text-indigo-600 font-medium">Click to upload</span> or
                  drag and drop
                </p>
                <p className="text-sm text-gray-400">
                  PNG, JPG, or WEBP (max {maxSizeMB}MB)
                </p>
              </>
            )}
            {isValidating && (
              <div className="flex items-center gap-2 text-gray-500">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                <span className="text-sm">Processing...</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <img
            src={preview}
            alt="Uploaded room"
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="px-4 py-2 bg-white text-gray-800 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Remove Image
            </button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
            <p className="text-white text-sm font-medium truncate">
              {file?.name}
            </p>
            <p className="text-white/70 text-xs">
              {file && formatFileSize(file.size)}
            </p>
          </div>
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
