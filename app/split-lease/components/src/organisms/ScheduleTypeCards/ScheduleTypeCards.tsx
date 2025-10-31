/**
 * ScheduleTypeCards Component
 *
 * Displays schedule type options (Weekend, Weeknight, Monthly)
 *
 * @example
 * ```tsx
 * <ScheduleTypeCards
 *   onCardClick={(type) => navigateToSearch(type)}
 * />
 * ```
 */

import React, { FC } from 'react';
import styled from 'styled-components';

export interface ScheduleType {
  /** Schedule type identifier */
  type: 'weekend' | 'weeknight' | 'monthly';
  /** Display title */
  title: string;
  /** Description text */
  description: string;
  /** Days included in schedule */
  days?: string;
}

export interface ScheduleTypeCardsProps {
  /** Callback when a card is clicked */
  onCardClick?: (type: string) => void;
  /** Custom schedule types */
  scheduleTypes?: ScheduleType[];
  /** Optional CSS class */
  className?: string;
}

const SectionContainer = styled.section`
  padding: 4rem 2rem;
  background: #f8f9fa;

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

const Subtitle = styled.h3`
  font-size: 1.25rem;
  color: #667eea;
  margin-bottom: 0.5rem;
  font-weight: 600;
`;

const Title = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
`;

const CardTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.5rem;
`;

const CardDescription = styled.p`
  font-size: 1rem;
  color: #666;
  margin-bottom: 1rem;
  line-height: 1.6;
`;

const CardDays = styled.div`
  font-size: 0.875rem;
  color: #667eea;
  font-weight: 600;
`;

const DEFAULT_SCHEDULE_TYPES: ScheduleType[] = [
  {
    type: 'weekend',
    title: 'Weekend Listings',
    description: 'Perfect for professionals who work remotely during the week',
    days: 'Fri, Sat, Sun',
  },
  {
    type: 'weeknight',
    title: 'Weeknight Listings',
    description: 'Ideal for weekend getaways while staying in the city during work',
    days: 'Mon, Tue, Wed, Thu',
  },
  {
    type: 'monthly',
    title: 'Weeks of Month',
    description: 'Choose specific weeks each month for maximum flexibility',
    days: 'Custom schedule',
  },
];

/**
 * ScheduleTypeCards component displays schedule options
 *
 * Shows cards for different schedule patterns users can select
 */
export const ScheduleTypeCards: FC<ScheduleTypeCardsProps> = ({
  onCardClick,
  scheduleTypes = DEFAULT_SCHEDULE_TYPES,
  className,
}) => {
  return (
    <SectionContainer className={className}>
      <Container>
        <Header>
          <Subtitle>Stop playing room roulette!</Subtitle>
          <Title>Choose Your Split Schedule</Title>
        </Header>

        <CardsGrid>
          {scheduleTypes.map((schedule) => (
            <Card
              key={schedule.type}
              onClick={() => onCardClick?.(schedule.type)}
              role="button"
              tabIndex={0}
            >
              <CardTitle>{schedule.title}</CardTitle>
              <CardDescription>{schedule.description}</CardDescription>
              {schedule.days && <CardDays>{schedule.days}</CardDays>}
            </Card>
          ))}
        </CardsGrid>
      </Container>
    </SectionContainer>
  );
};

export default ScheduleTypeCards;
