/**
 * ListingImageGrid island mount point
 * Mounts the ListingImageGrid component into the DOM at specified element
 */

import { createRoot } from 'react-dom/client';
import { ListingImageGrid } from '../components/src/ListingImageGrid';
import type { ListingImageGridProps } from '../types/components';

/**
 * Mount ListingImageGrid component into DOM element
 * @param elementId - ID of the element to mount into
 * @param props - ListingImageGrid component props
 */
export function mountListingImageGrid(
  elementId: string,
  props: ListingImageGridProps
): void {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with id "${elementId}" not found`);
    return;
  }

  const root = createRoot(element);
  root.render(<ListingImageGrid {...props} />);
}

/**
 * Auto-mount ListingImageGrid if element exists on page load
 */
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const imageGridElement = document.getElementById('listing-image-grid-island');
    if (imageGridElement) {
      // Extract props from data attributes
      const imagesData = imageGridElement.dataset.images;
      const maxImages = imageGridElement.dataset.maxImages;

      if (!imagesData) {
        console.error('Images data is required for ListingImageGrid');
        return;
      }

      try {
        const images = JSON.parse(imagesData);

        mountListingImageGrid('listing-image-grid-island', {
          images,
          maxImages: maxImages ? parseInt(maxImages, 10) : undefined,
          onImageClick: (index) => {
            // Dispatch custom event for listening in vanilla JS
            const event = new CustomEvent('imageClick', {
              detail: { index, image: images[index] },
              bubbles: true,
            });
            imageGridElement.dispatchEvent(event);
          },
        });
      } catch (error) {
        console.error('Failed to parse images data:', error);
      }
    }
  });
}
