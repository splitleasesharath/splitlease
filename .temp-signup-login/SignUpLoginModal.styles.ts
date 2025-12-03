/**
 * Styles for the main SignUpLoginModal component
 * Matches the Bubble design: 407px width, rounded corners, shadow
 */

import styled from 'styled-components';

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  animation: fadeIn 200ms ease-out;
  z-index: 1000;
  cursor: pointer;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export const ModalContainer = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  max-width: 407px;
  max-height: 90vh;
  background: white;
  border-radius: 10px;
  box-shadow: 0 50px 100px rgba(0, 0, 0, 0.2);
  overflow-y: auto;
  z-index: 1001;
  animation: slideIn 200ms ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -48%) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  /* Modern scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Responsive design */
  @media (max-width: 480px) {
    max-width: 95%;
    max-height: 95vh;
    border-radius: 8px;
  }

  /* Prevent content from being hidden behind close button */
  padding-top: 16px;
`;

export const ContentWrapper = styled.div`
  padding: 32px;

  @media (max-width: 480px) {
    padding: 24px;
  }
`;

/* Additional utility styles */
export const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 10px;
`;

export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #E5E7EB;
  border-top-color: #7C3AED;
  border-radius: 50%;
  animation: spin 800ms linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
