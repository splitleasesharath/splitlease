import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    padding: 20px;
    gap: 20px;
  }
`;

export const PriceDisplay = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
`;

export const Price = styled.span`
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (max-width: 768px) {
    font-size: 28px;
  }
`;

export const PriceUnit = styled.span`
  font-size: 16px;
  font-weight: 500;
  color: #666;
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
`;

export const InfoIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: help;
`;

export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  &::placeholder {
    color: #999;
  }
`;

export const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #667eea;
`;

export const CheckboxLabel = styled.label`
  font-size: 13px;
  color: #666;
  cursor: pointer;
  user-select: none;
`;

export const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
`;

export const DayButton = styled.button<{ $isSelected: boolean; $isUnavailable?: boolean }>`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  border: none;
  border-radius: 8px;
  cursor: ${props => props.$isUnavailable ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;

  background: ${props => {
    if (props.$isUnavailable) return '#e0e0e0';
    if (props.$isSelected) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    return '#ffffff';
  }};

  color: ${props => {
    if (props.$isUnavailable) return '#999';
    if (props.$isSelected) return '#ffffff';
    return '#333';
  }};

  box-shadow: ${props => {
    if (props.$isUnavailable) return 'none';
    if (props.$isSelected) return '0 2px 8px rgba(102, 126, 234, 0.3)';
    return '0 1px 4px rgba(0, 0, 0, 0.1)';
  }};

  &:hover:not(:disabled) {
    transform: ${props => props.$isUnavailable ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.$isUnavailable ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'};
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid #667eea;
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    font-size: 12px;
  }
`;

export const StatusText = styled.p`
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.6;
`;

export const WarningNote = styled.div`
  padding: 12px;
  background: #fff3e0;
  border-left: 4px solid #ff9800;
  border-radius: 4px;
`;

export const NoteLabel = styled.span`
  font-weight: 600;
  color: #e65100;
  font-size: 13px;
`;

export const NoteText = styled.p`
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
`;

export const Select = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }
`;

export const HostNote = styled.p`
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #666;
  font-style: italic;
`;

export const PricingSummary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 8px;
`;

export const PricingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const PricingLabel = styled.span`
  font-size: 14px;
  color: #666;
`;

export const PricingValue = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

export const ActionButton = styled.button`
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 3px solid rgba(102, 126, 234, 0.5);
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    padding: 14px;
    font-size: 15px;
  }
`;
