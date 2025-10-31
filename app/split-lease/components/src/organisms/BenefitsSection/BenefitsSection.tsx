/**
 * BenefitsSection Component
 *
 * Displays value propositions in a grid of benefit cards
 *
 * @example
 * ```tsx
 * <BenefitsSection />
 * ```
 */

import React, { FC } from 'react';
import styled from 'styled-components';

export interface Benefit {
  /** Icon URL or emoji */
  icon: string;
  /** Benefit heading text */
  text: string;
  /** Icon alt text for accessibility */
  iconAlt: string;
}

export interface BenefitsSectionProps {
  /** Array of benefits to display */
  benefits?: Benefit[];
  /** Optional CSS class for styling */
  className?: string;
}

const SectionContainer = styled.section`
  padding: 4rem 2rem;
  background: #f8f9fa;

  @media (max-width: 768px) {
    padding: 3rem 1.5rem;
  }
`;

const BenefitsContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const BenefitCard = styled.div`
  text-align: center;
  padding: 2rem 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
`;

const IconContainer = styled.div`
  margin-bottom: 1rem;

  img {
    width: 80px;
    height: 80px;
    object-fit: contain;
  }
`;

const BenefitText = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #333;
  line-height: 1.5;
`;

const DEFAULT_BENEFITS: Benefit[] = [
  {
    icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245433645x903943195219269100/Icon-OnlineSelect%201%20%281%29.png',
    iconAlt: 'Computer with click icon',
    text: '100s of Split Leases, or source off market',
  },
  {
    icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245536528x133519290791932700/Icon-Skyline%20%281%29.png',
    iconAlt: 'City skyline icon',
    text: 'Financially optimal. 45% less than Airbnb',
  },
  {
    icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245565680x203884400943151520/Icon-Backpack%20Hero_1%201%20%281%29.png',
    iconAlt: 'Storage backpack icon',
    text: "Safely store items while you're away.",
  },
  {
    icon: 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/cdn-cgi/image/w=192,h=192,f=auto,dpr=1,fit=contain/f1621245591320x851695569344734000/Layer%209%20%281%29.png',
    iconAlt: 'Calendar return icon',
    text: 'Same room, same bed. Unlike a hotel.',
  },
];

/**
 * BenefitsSection component displays key value propositions
 *
 * Shows 4 benefit cards in a responsive grid layout
 */
export const BenefitsSection: FC<BenefitsSectionProps> = ({
  benefits = DEFAULT_BENEFITS,
  className,
}) => {
  return (
    <SectionContainer className={className}>
      <BenefitsContainer>
        {benefits.map((benefit, index) => (
          <BenefitCard key={index}>
            <IconContainer>
              <img src={benefit.icon} alt={benefit.iconAlt} loading="lazy" />
            </IconContainer>
            <BenefitText>{benefit.text}</BenefitText>
          </BenefitCard>
        ))}
      </BenefitsContainer>
    </SectionContainer>
  );
};

export default BenefitsSection;
