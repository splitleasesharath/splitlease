/**
 * Styles for SignupView component
 */

import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  position: relative;
`;

export const BackButton = styled.button`
  position: absolute;
  top: -8px;
  left: -8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #6B7280;
  cursor: pointer;
  font-size: 14px;
  padding: 8px;
  border-radius: 6px;
  transition: all 150ms ease;

  &:hover {
    color: #374151;
    background: #F3F4F6;
  }

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
  }
`;

export const BackIcon = styled.span`
  font-size: 18px;
  line-height: 1;
`;

export const Header = styled.div`
  text-align: center;
  margin-top: 24px;
`;

export const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 8px 0;
`;

export const Subtitle = styled.p`
  font-size: 14px;
  color: #6B7280;
  margin: 0;
`;

export const ReferralInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
  border: 1px solid #86EFAC;
  border-radius: 8px;
`;

export const ReferralIcon = styled.span`
  font-size: 20px;
`;

export const ReferralText = styled.span`
  font-size: 14px;
  color: #166534;

  strong {
    font-weight: 600;
    color: #15803D;
  }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const NameRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const CheckboxContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 0;
`;

export const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: #7C3AED;
  flex-shrink: 0;

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
  }
`;

export const CheckboxLabel = styled.label`
  font-size: 13px;
  color: #6B7280;
  line-height: 1.5;
  cursor: pointer;
`;

export const TermsLink = styled.a`
  color: #7C3AED;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

export const BottomSection = styled.div`
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 8px;
  border-top: 1px solid #E5E7EB;
`;

export const Text = styled.span`
  color: #6B7280;
  font-size: 14px;
`;

export const Link = styled.button`
  background: none;
  border: none;
  color: #7C3AED;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
  padding: 0;

  &:hover {
    color: #6D28D9;
  }

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
    border-radius: 4px;
    padding: 2px 4px;
  }
`;

// Step Indicator Styles
export const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
`;

export const Step = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 200ms ease;

  ${props => props.$completed ? `
    background: #7C3AED;
    color: white;
    border: 2px solid #7C3AED;
  ` : props.$active ? `
    background: #7C3AED;
    color: white;
    border: 2px solid #7C3AED;
  ` : `
    background: white;
    color: #9CA3AF;
    border: 2px solid #E5E7EB;
  `}
`;

export const StepLine = styled.div<{ $active: boolean }>`
  width: 60px;
  height: 2px;
  background: ${props => props.$active ? '#7C3AED' : '#E5E7EB'};
  transition: background 200ms ease;
`;

// Account Type Selection Styles
export const AccountTypeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 8px;
`;

export const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #374151;
`;

export const AccountTypeButtons = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

export const AccountTypeButton = styled.button<{ $selected: boolean }>`
  padding: 16px;
  border-radius: 12px;
  border: 2px solid ${props => props.$selected ? '#7C3AED' : '#E5E7EB'};
  background: ${props => props.$selected ? '#F5F3FF' : 'white'};
  cursor: pointer;
  transition: all 200ms ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;

  &:hover {
    border-color: #7C3AED;
    background: #F5F3FF;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid #7C3AED;
    outline-offset: 2px;
  }
`;

export const AccountTypeIcon = styled.div`
  font-size: 32px;
`;

export const AccountTypeLabel = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1F2937;
`;

export const AccountTypeDesc = styled.div`
  font-size: 12px;
  color: #6B7280;
`;

export const BackToStep1 = styled.div`
  text-align: center;
  margin-top: 8px;
`;
