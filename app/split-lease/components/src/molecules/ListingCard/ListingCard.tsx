/**
 * ListingCard Component
 *
 * Displays a single listing with image, location, bedroom count, and price
 *
 * @example
 * ```tsx
 * <ListingCard
 *   listing={{
 *     id: '123',
 *     title: 'Cozy Apartment',
 *     location: 'Brooklyn, NY',
 *     bedrooms: 2,
 *     pricePerNight: 150,
 *     imageUrl: '/image.jpg'
 *   }}
 * />
 * ```
 */

import React, { FC } from 'react';
import styled from 'styled-components';

export interface Listing {
  id: string;
  title: string;
  location: string;
  bedrooms: number;
  bathrooms?: number;
  pricePerNight: number;
  imageUrl: string;
  rating?: number;
  reviewCount?: number;
}

export interface ListingCardProps {
  /** Listing data to display */
  listing: Listing;
  /** Click handler for navigation */
  onClick?: (listingId: string) => void;
  /** Optional CSS class */
  className?: string;
}

const Card = styled.div`
  border-radius: 12px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
`;

const ImageContainer = styled.div`
  position: relative;
  padding-top: 66.67%; /* 3:2 aspect ratio */
  overflow: hidden;
  background: #f0f0f0;
`;

const Image = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Content = styled.div`
  padding: 1rem;
`;

const Location = styled.div`
  font-size: 0.875rem;
  color: #666;
  margin-bottom: 0.25rem;
`;

const Title = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
`;

const Details = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.75rem;
`;

const Bedrooms = styled.span`
  font-size: 0.875rem;
  color: #666;
`;

const Price = styled.span`
  font-size: 1.125rem;
  font-weight: 700;
  color: #667eea;

  span {
    font-size: 0.875rem;
    font-weight: 400;
    color: #666;
  }
`;

/**
 * Formats bedroom count display
 * Shows "Studio" for 0 bedrooms, "[X] bed" otherwise
 */
function formatBedrooms(count: number): string {
  if (count === 0) return 'Studio';
  return `${count} bed${count > 1 ? 's' : ''}`;
}

/**
 * ListingCard component displays property information
 *
 * Shows image, location, bedroom count, and nightly price
 */
export const ListingCard: FC<ListingCardProps> = ({
  listing,
  onClick,
  className,
}) => {
  const handleClick = () => {
    onClick?.(listing.id);
  };

  return (
    <Card className={className} onClick={handleClick} role="button" tabIndex={0}>
      <ImageContainer>
        <Image
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
        />
      </ImageContainer>
      <Content>
        <Location>{listing.location}</Location>
        <Title>{listing.title}</Title>
        <Details>
          <Bedrooms>{formatBedrooms(listing.bedrooms)}</Bedrooms>
          <Price>
            ${listing.pricePerNight}<span>/night</span>
          </Price>
        </Details>
      </Content>
    </Card>
  );
};

export default ListingCard;
