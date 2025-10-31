/**
 * SupportSection Component
 *
 * Displays support options for users
 *
 * @example
 * ```tsx
 * <SupportSection
 *   onScheduleCall={() => openCalendly()}
 *   onOpenChat={() => openIntercom()}
 * />
 * ```
 */

import React, { FC } from 'react';
import styled from 'styled-components';

export interface SupportOption {
  /** Option identifier */
  id: string;
  /** Icon (emoji or image URL) */
  icon: string;
  /** Option title */
  title: string;
  /** Description text */
  description: string;
}

export interface SupportSectionProps {
  /** Callback when schedule call is clicked */
  onScheduleCall?: () => void;
  /** Callback when FAQs is clicked */
  onViewFAQs?: () => void;
  /** Callback when chat is clicked */
  onOpenChat?: () => void;
  /** Callback when email is clicked */
  onSendEmail?: () => void;
  /** Custom support options */
  supportOptions?: SupportOption[];
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

const Title = styled.h2`
  font-size: 2.5rem;
  font-weight: 700;
  color: #333;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.125rem;
  color: #666;
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const OptionCard = styled.button`
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
    transform: translateY(-4px);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
  }
`;

const IconContainer = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const OptionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
`;

const OptionDescription = styled.p`
  font-size: 0.875rem;
  color: #666;
  line-height: 1.5;
`;

const DEFAULT_SUPPORT_OPTIONS: SupportOption[] = [
  {
    id: 'schedule-call',
    icon: '📞',
    title: 'Schedule a Call',
    description: 'Speak with one of our experts',
  },
  {
    id: 'faqs',
    icon: '❓',
    title: 'Browse FAQs',
    description: 'Find answers to common questions',
  },
  {
    id: 'live-chat',
    icon: '💬',
    title: 'Live Chat',
    description: 'Chat with us in real-time',
  },
  {
    id: 'email',
    icon: '📧',
    title: 'Send Email',
    description: 'Get help via email support',
  },
];

/**
 * SupportSection component displays support options
 *
 * Shows clickable cards for different support channels
 */
export const SupportSection: FC<SupportSectionProps> = ({
  onScheduleCall,
  onViewFAQs,
  onOpenChat,
  onSendEmail,
  supportOptions = DEFAULT_SUPPORT_OPTIONS,
  className,
}) => {
  const handleOptionClick = (id: string) => {
    switch (id) {
      case 'schedule-call':
        onScheduleCall?.();
        break;
      case 'faqs':
        onViewFAQs?.();
        break;
      case 'live-chat':
        onOpenChat?.();
        break;
      case 'email':
        onSendEmail?.();
        break;
      default:
        break;
    }
  };

  return (
    <SectionContainer className={className}>
      <Container>
        <Header>
          <Title>Need Help?</Title>
          <Subtitle>We're here to support you every step of the way</Subtitle>
        </Header>

        <OptionsGrid>
          {supportOptions.map((option) => (
            <OptionCard
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              type="button"
            >
              <IconContainer>{option.icon}</IconContainer>
              <OptionTitle>{option.title}</OptionTitle>
              <OptionDescription>{option.description}</OptionDescription>
            </OptionCard>
          ))}
        </OptionsGrid>
      </Container>
    </SectionContainer>
  );
};

export default SupportSection;
