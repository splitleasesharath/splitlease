/**
 * File Utilities for AI Room Redesign
 *
 * Pure utility functions for file handling, conversion, and validation.
 * All functions are side-effect free except for downloadImage (DOM interaction).
 */

/**
 * Convert a File object to a base64 encoded string (without data URL prefix)
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 encoded string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Convert a File object to a data URL for preview display
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Data URL string
 */
export const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to data URL'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Validate file size against maximum allowed size
 * @param {File} file - The file to validate
 * @param {number} maxSizeMB - Maximum file size in megabytes
 * @returns {boolean} True if file is within size limit
 */
export const validateFileSize = (file, maxSizeMB) => {
  const fileSizeMB = file.size / (1024 * 1024);
  return fileSizeMB <= maxSizeMB;
};

/**
 * Validate file type against accepted types
 * @param {File} file - The file to validate
 * @param {string[]} acceptedTypes - Array of accepted MIME types or extensions
 * @returns {boolean} True if file type is accepted
 */
export const validateFileType = (file, acceptedTypes) => {
  return acceptedTypes.some((type) => {
    if (type.startsWith('.')) {
      return file.name.toLowerCase().endsWith(type.toLowerCase());
    }
    // Handle wildcards like 'image/*'
    return file.type.match(new RegExp(type.replace('*', '.*')));
  });
};

/**
 * Get file extension from filename
 * @param {string} filename - The filename to extract extension from
 * @returns {string} The file extension (without dot)
 */
export const getFileExtension = (filename) => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Download image from URL or base64 data URL
 * Note: This function has side effects (DOM manipulation)
 * @param {string} imageSource - Image URL or data URL
 * @param {string} filename - Download filename (default: 'redesigned-room.png')
 */
export const downloadImage = (imageSource, filename = 'redesigned-room.png') => {
  const link = document.createElement('a');
  link.href = imageSource;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Convert base64 string to Blob
 * @param {string} base64 - Base64 encoded string
 * @param {string} mimeType - MIME type (default: 'image/png')
 * @returns {Blob} Blob object
 */
export const base64ToBlob = (base64, mimeType = 'image/png') => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};
