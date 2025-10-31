/**
 * Represents an image in the listing gallery
 */
export interface ListingImage {
  url: string;
  alt: string;
  thumbnail?: string;
}

/**
 * Props for the ListingImageGrid component
 */
export interface ListingImageGridProps {
  images: ListingImage[];
  onImageClick?: (image: ListingImage, index: number) => void;
  className?: string;
}
