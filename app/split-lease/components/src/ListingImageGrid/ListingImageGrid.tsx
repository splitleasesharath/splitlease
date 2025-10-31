import React, { useState } from 'react';
import {
  Container,
  ImageGrid,
  ImageWrapper,
  Image,
  ImagePlaceholder,
  ErrorState,
} from './ListingImageGrid.styles';
import type { ListingImageGridProps } from './types';

export const ListingImageGrid: React.FC<ListingImageGridProps> = ({
  images,
  onImageClick,
  className,
}) => {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // Ensure we have exactly 4 slots
  const imageSlots = Array.from({ length: 4 }, (_, index) => images[index] || null);

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index));
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set(prev).add(index));
  };

  const handleImageClick = (image: typeof imageSlots[0], index: number) => {
    if (image && onImageClick) {
      onImageClick(image, index);
    }
  };

  return (
    <Container className={className}>
      <ImageGrid>
        {imageSlots.map((image, index) => (
          <ImageWrapper
            key={index}
            onClick={() => handleImageClick(image, index)}
            role="button"
            tabIndex={image ? 0 : -1}
            aria-label={image ? `View image ${index + 1}: ${image.alt}` : `Image slot ${index + 1} empty`}
          >
            {!image ? (
              <ImagePlaceholder>📷</ImagePlaceholder>
            ) : imageErrors.has(index) ? (
              <ErrorState>Image unavailable</ErrorState>
            ) : (
              <Image
                src={image.thumbnail || image.url}
                alt={image.alt}
                onError={() => handleImageError(index)}
                onLoad={() => handleImageLoad(index)}
                loading="lazy"
              />
            )}
          </ImageWrapper>
        ))}
      </ImageGrid>
    </Container>
  );
};

export default ListingImageGrid;
