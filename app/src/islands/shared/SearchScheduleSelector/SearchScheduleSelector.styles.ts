import styled from 'styled-components';
import { motion } from 'framer-motion';

export const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  user-select: none;

  @media (max-width: 768px) {
    padding: 0;
  }
`;

export const SelectorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 0 12px 0;
`;

export const CalendarIcon = styled.div`
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 35px;
  margin-right: 8px;
  flex-shrink: 0;
`;

export const DaysGrid = styled.div`
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;

  @media (max-width: 768px) {
    gap: 6px;
  }
`;

export const DayCell = styled(motion.button)<{
  $isSelected: boolean;
  $isDragging: boolean;
  $hasError?: boolean;
  $errorStyle?: 1 | 2 | 3;
}>`
  width: 35px;
  height: 35px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Inter", Helvetica, Arial, sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 16px;
  border: none;
  border-radius: 8px;
  cursor: ${props => props.$isDragging ? 'grabbing' : 'pointer'};
  transition: transform 0.2s ease-in-out, background 0.2s ease-in-out;
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.1);

  /* Error state styling */
  ${props => props.$hasError && props.$isSelected && `
    background-color: #d32f2f !important;
    color: #ffffff !important;
    animation: pulse-error 1.5s ease-in-out infinite;

    @keyframes pulse-error {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `}

  /* Normal selected/unselected state (no error) */
  ${props => !props.$hasError && `
    background-color: ${props.$isSelected ? '#4B47CE' : '#b2b2b2'};
    color: #ffffff;
  `}

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid #4B47CE;
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    width: 35px;
    height: 35px;
    font-size: 14px;
  }

  @media (max-width: 480px) {
    width: 32px;
    height: 32px;
    font-size: 13px;
  }
`;

export const InfoContainer = styled.div`
  min-height: 24px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin: 8px 0 16px 0;
`;

export const InfoText = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 400;
  color: #000000;
  text-align: center;

  strong {
    font-weight: 600;
  }

  .day-name {
    color: #31135D;
    font-weight: 600;
  }

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

export const ResetButton = styled.button`
  background: none;
  border: none;
  color: #666666;
  font-size: 13px;
  font-weight: 500;
  text-decoration: underline;
  cursor: pointer;
  padding: 4px 8px;
  transition: all 0.2s ease;

  &:hover {
    color: #4B47CE;
    text-decoration: none;
  }

  &:active {
    transform: scale(0.98);
  }
`;

export const ErrorPopup = styled(motion.div)`
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 280px;

  @media (max-width: 768px) {
    min-width: 240px;
    padding: 12px 20px;
  }
`;

export const ErrorIcon = styled.span`
  font-size: 24px;
  flex-shrink: 0;
`;

export const ErrorMessage = styled.p`
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #d32f2f;
  line-height: 1.4;
`;
