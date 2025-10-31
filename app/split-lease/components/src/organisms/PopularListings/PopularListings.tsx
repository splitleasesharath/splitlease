/**
 * PopularListings Component
 *
 * Displays a grid of popular listing cards with a heading and CTA
 *
 * @example
 * ```tsx
 * <PopularListings
 *   listings={mockListings}
 *   onViewMore={() => navigate('/search')}
 * />
 * ```
 */

import React, { FC } from 'react';
import styled from 'styled-components';
import { ListingCard, type Listing } from '../../molecules/ListingCard';

export interface PopularListingsProps {
  /** Array of listings to display */
  listings: Listing[];
  /** Heading text */
  heading?: string;
  /** Show more button text */
  showMoreText?: string;
  /** Callback when show more is clicked */
  onViewMore?: () => void;
  /** Callback when a listing is clicked */
  onListingClick?: (listingId: string) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: string | null;
  /** Optional CSS class */
  className?: string;
}

const SectionContainer = styled.section`
  padding: 4rem 2rem;
  background: white;

  @media (max-width: 768px) {
    padding: 3rem 1.5rem;
  }
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 3rem;
`;

const Heading = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const ListingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ShowMoreButton = styled.button`
  display: block;
  margin: 0 auto;
  padding: 1rem 2.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  background: #667eea;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;

  &:hover {
    background: #5568d3;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.125rem;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #dc3545;
  font-size: 1.125rem;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
  font-size: 1.125rem;
`;

/**
 * PopularListings component displays featured listings
 *
 * Shows a grid of listing cards with loading and error states
 */
export const PopularListings: FC<PopularListingsProps> = ({
  listings,
  heading = 'Popular Split Leases',
  showMoreText = 'Show More Listings',
  onViewMore,
  onListingClick,
  isLoading = false,
  error = null,
  className,
}) => {
  if (isLoading) {
    return (
      <SectionContainer className={className}>
        <Container>
          <LoadingMessage>Loading listings...</LoadingMessage>
        </Container>
      </SectionContainer>
    );
  }

  if (error) {
    return (
      <SectionContainer className={className}>
        <Container>
          <ErrorMessage>{error}</ErrorMessage>
        </Container>
      </SectionContainer>
    );
  }

  if (listings.length === 0) {
    return (
      <SectionContainer className={className}>
        <Container>
          <EmptyMessage>No listings available at the moment.</EmptyMessage>
        </Container>
      </SectionContainer>
    );
  }

  return (
    <SectionContainer className={className}>
      <Container>
        <Header>
          <Heading>{heading}</Heading>
        </Header>

        <ListingsGrid>
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={onListingClick}
            />
          ))}
        </ListingsGrid>

        {onViewMore && (
          <ShowMoreButton onClick={onViewMore}>
            {showMoreText}
          </ShowMoreButton>
        )}
      </Container>
    </SectionContainer>
  );
};

export default PopularListings;
