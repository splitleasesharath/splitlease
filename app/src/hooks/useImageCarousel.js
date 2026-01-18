import { useState, useCallback } from 'react';

/**
 * Hook for managing image carousel navigation
 * @param {string[]} images - Array of image URLs
 * @returns {object} Carousel state and handlers
 */
export function useImageCarousel(images) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const hasImages = images && images.length > 0;
  const hasMultipleImages = images && images.length > 1;

  const handlePrevImage = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  }, [hasMultipleImages, images?.length]);

  const handleNextImage = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setCurrentImageIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    );
  }, [hasMultipleImages, images?.length]);

  return {
    currentImageIndex,
    hasImages,
    hasMultipleImages,
    handlePrevImage,
    handleNextImage,
    setCurrentImageIndex
  };
}
