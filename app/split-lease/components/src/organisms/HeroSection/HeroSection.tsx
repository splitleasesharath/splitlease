/**
 * HeroSection Component
 *
 * Main hero section for the homepage featuring heading, subtext,
 * schedule selector integration, and CTA button.
 *
 * @example
 * ```tsx
 * <HeroSection
 *   title="Ongoing Rentals for Repeat Stays"
 *   subtitle="Select which days you'd like to stay in NYC..."
 *   ctaText="Explore Rentals"
 *   ctaHref="/search"
 * />
 * ```
 */

import React, { FC } from 'react';
import styled from 'styled-components';

export interface HeroSectionProps {
  /** Main heading text */
  title: string;
  /** Subtitle/description text */
  subtitle: string;
  /** CTA button text */
  ctaText: string;
  /** CTA button href */
  ctaHref: string;
  /** Optional CSS class for styling */
  className?: string;
  /** Slot for schedule selector component */
  scheduleSelector?: React.ReactNode;
  /** Left background image URL */
  leftImageUrl?: string;
  /** Right background image URL */
  rightImageUrl?: string;
}

const HeroContainer = styled.section`
  position: relative;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  @media (max-width: 768px) {
    min-height: 500px;
    padding: 3rem 1.5rem;
  }
`;

const HeroContentWrapper = styled.div`
  position: relative;
  max-width: 1200px;
  width: 100%;
  z-index: 10;
`;

const HeroIllustration = styled.img`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  max-width: 300px;
  opacity: 0.3;
  pointer-events: none;

  @media (max-width: 768px) {
    display: none;
  }
`;

const HeroIllustrationLeft = styled(HeroIllustration)`
  left: 0;
`;

const HeroIllustrationRight = styled(HeroIllustration)`
  right: 0;
`;

const HeroContent = styled.div`
  text-align: center;
  color: white;
`;

const HeroTitle = styled.h1`
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 1.25rem;
  margin-bottom: 2rem;
  line-height: 1.6;
  opacity: 0.95;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ScheduleSelectorContainer = styled.div`
  margin: 2rem auto;
  max-width: 600px;
`;

const HeroCTA = styled.a`
  display: inline-block;
  padding: 1rem 2.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #667eea;
  background: white;
  border: none;
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 768px) {
    padding: 0.875rem 2rem;
    font-size: 1rem;
  }
`;

/**
 * HeroSection component for homepage
 *
 * Displays the main value proposition, schedule selector, and CTA.
 * Includes background illustrations for visual appeal.
 */
export const HeroSection: FC<HeroSectionProps> = ({
  title,
  subtitle,
  ctaText,
  ctaHref,
  className,
  scheduleSelector,
  leftImageUrl = 'home/images/hero-left.png',
  rightImageUrl = 'home/images/hero-right.png',
}) => {
  return (
    <HeroContainer className={className}>
      <HeroContentWrapper>
        {leftImageUrl && (
          <HeroIllustrationLeft
            src={leftImageUrl}
            alt="Brooklyn Bridge illustration"
            aria-hidden="true"
          />
        )}
        {rightImageUrl && (
          <HeroIllustrationRight
            src={rightImageUrl}
            alt="Empire State Building illustration"
            aria-hidden="true"
          />
        )}
        <HeroContent>
          <HeroTitle>{title}</HeroTitle>
          <HeroSubtitle dangerouslySetInnerHTML={{ __html: subtitle }} />

          {scheduleSelector && (
            <ScheduleSelectorContainer>
              {scheduleSelector}
            </ScheduleSelectorContainer>
          )}

          <HeroCTA href={ctaHref}>
            {ctaText}
          </HeroCTA>
        </HeroContent>
      </HeroContentWrapper>
    </HeroContainer>
  );
};

export default HeroSection;
