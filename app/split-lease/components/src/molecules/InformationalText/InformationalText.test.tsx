import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InformationalText } from './InformationalText';
import type { InformationalTextProps } from './InformationalText.types';

describe('InformationalText', () => {
  describe('Rendering Tests', () => {
    it('renders with default props', () => {
      render(<InformationalText>Test message</InformationalText>);
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(
        <InformationalText className="custom-class" data-testid="custom-test">
          Test message
        </InformationalText>
      );
      const container = screen.getByTestId('custom-test');
      expect(container.className).toContain('custom-class');
    });

    it('renders title when provided', () => {
      render(
        <InformationalText title="Important">Test message</InformationalText>
      );
      expect(screen.getByText('Important')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('renders children content', () => {
      render(
        <InformationalText>
          <span>Complex content</span>
        </InformationalText>
      );
      expect(screen.getByText('Complex content')).toBeInTheDocument();
    });

    it('renders custom icon when provided', () => {
      const CustomIcon = () => <span data-testid="custom-icon">🎉</span>;
      render(
        <InformationalText icon={<CustomIcon />}>
          Test message
        </InformationalText>
      );
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('renders default icon for info variant', () => {
      render(
        <InformationalText variant="info">Test message</InformationalText>
      );
      const icon = screen.getByTestId('info-icon');
      expect(icon).toBeInTheDocument();
    });

    it('renders default icon for warning variant', () => {
      render(
        <InformationalText variant="warning">Test message</InformationalText>
      );
      const icon = screen.getByTestId('warning-icon');
      expect(icon).toBeInTheDocument();
    });

    it('renders default icon for success variant', () => {
      render(
        <InformationalText variant="success">Test message</InformationalText>
      );
      const icon = screen.getByTestId('success-icon');
      expect(icon).toBeInTheDocument();
    });

    it('renders default icon for error variant', () => {
      render(
        <InformationalText variant="error">Test message</InformationalText>
      );
      const icon = screen.getByTestId('error-icon');
      expect(icon).toBeInTheDocument();
    });

    it('renders action buttons when provided', () => {
      const handleAction = vi.fn();
      render(
        <InformationalText
          actions={[{ label: 'Take Action', onClick: handleAction }]}
        >
          Test message
        </InformationalText>
      );
      expect(screen.getByText('Take Action')).toBeInTheDocument();
    });

    it('renders dismiss button when onDismiss provided', () => {
      const handleDismiss = vi.fn();
      render(
        <InformationalText onDismiss={handleDismiss}>
          Test message
        </InformationalText>
      );
      expect(screen.getByLabelText('Dismiss notification')).toBeInTheDocument();
    });

    it('does not render dismiss button when onDismiss not provided', () => {
      render(<InformationalText>Test message</InformationalText>);
      expect(
        screen.queryByLabelText('Dismiss notification')
      ).not.toBeInTheDocument();
    });

    it('renders multiple action buttons', () => {
      render(
        <InformationalText
          actions={[
            { label: 'Action 1', onClick: vi.fn() },
            { label: 'Action 2', onClick: vi.fn() },
            { label: 'Action 3', onClick: vi.fn() },
          ]}
        >
          Test message
        </InformationalText>
      );
      expect(screen.getByText('Action 1')).toBeInTheDocument();
      expect(screen.getByText('Action 2')).toBeInTheDocument();
      expect(screen.getByText('Action 3')).toBeInTheDocument();
    });

    it('renders complex nested children', () => {
      render(
        <InformationalText>
          <div>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
          </div>
        </InformationalText>
      );
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
    });
  });

  describe('Variant Tests', () => {
    it('renders info variant with correct styles', () => {
      render(
        <InformationalText variant="info" data-testid="info-component">
          Test message
        </InformationalText>
      );
      const component = screen.getByTestId('info-component');
      expect(component.className).toMatch(/info/);
    });

    it('renders warning variant with correct styles', () => {
      render(
        <InformationalText variant="warning" data-testid="warning-component">
          Test message
        </InformationalText>
      );
      const component = screen.getByTestId('warning-component');
      expect(component.className).toMatch(/warning/);
    });

    it('renders success variant with correct styles', () => {
      render(
        <InformationalText variant="success" data-testid="success-component">
          Test message
        </InformationalText>
      );
      const component = screen.getByTestId('success-component');
      expect(component.className).toMatch(/success/);
    });

    it('renders error variant with correct styles', () => {
      render(
        <InformationalText variant="error" data-testid="error-component">
          Test message
        </InformationalText>
      );
      const component = screen.getByTestId('error-component');
      expect(component.className).toMatch(/error/);
    });
  });

  describe('Size Tests', () => {
    it('renders small size correctly', () => {
      render(
        <InformationalText size="small" data-testid="small-component">
          Test message
        </InformationalText>
      );
      const component = screen.getByTestId('small-component');
      expect(component.className).toMatch(/small/);
    });

    it('renders medium size correctly', () => {
      render(
        <InformationalText size="medium" data-testid="medium-component">
          Test message
        </InformationalText>
      );
      const component = screen.getByTestId('medium-component');
      expect(component.className).toMatch(/medium/);
    });

    it('renders large size correctly', () => {
      render(
        <InformationalText size="large" data-testid="large-component">
          Test message
        </InformationalText>
      );
      const component = screen.getByTestId('large-component');
      expect(component.className).toMatch(/large/);
    });
  });

  describe('Interaction Tests', () => {
    it('calls onDismiss when dismiss button clicked', async () => {
      const handleDismiss = vi.fn();
      const user = userEvent.setup();

      render(
        <InformationalText onDismiss={handleDismiss}>
          Test message
        </InformationalText>
      );

      const dismissButton = screen.getByLabelText('Dismiss notification');
      await user.click(dismissButton);

      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls action callback when action button clicked', async () => {
      const handleAction = vi.fn();
      const user = userEvent.setup();

      render(
        <InformationalText
          actions={[{ label: 'Take Action', onClick: handleAction }]}
        >
          Test message
        </InformationalText>
      );

      const actionButton = screen.getByText('Take Action');
      await user.click(actionButton);

      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('calls correct callback for multiple action buttons', async () => {
      const handleAction1 = vi.fn();
      const handleAction2 = vi.fn();
      const user = userEvent.setup();

      render(
        <InformationalText
          actions={[
            { label: 'Action 1', onClick: handleAction1 },
            { label: 'Action 2', onClick: handleAction2 },
          ]}
        >
          Test message
        </InformationalText>
      );

      await user.click(screen.getByText('Action 1'));
      expect(handleAction1).toHaveBeenCalledTimes(1);
      expect(handleAction2).not.toHaveBeenCalled();

      await user.click(screen.getByText('Action 2'));
      expect(handleAction2).toHaveBeenCalledTimes(1);
      expect(handleAction1).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation with Tab', async () => {
      const handleAction = vi.fn();
      const handleDismiss = vi.fn();
      const user = userEvent.setup();

      render(
        <InformationalText
          actions={[{ label: 'Action', onClick: handleAction }]}
          onDismiss={handleDismiss}
        >
          Test message
        </InformationalText>
      );

      // Tab should move through interactive elements
      await user.tab();
      expect(screen.getByText('Action')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Dismiss notification')).toHaveFocus();
    });

    it('supports keyboard Enter to activate action button', async () => {
      const handleAction = vi.fn();
      const user = userEvent.setup();

      render(
        <InformationalText
          actions={[{ label: 'Action', onClick: handleAction }]}
        >
          Test message
        </InformationalText>
      );

      const actionButton = screen.getByText('Action');
      actionButton.focus();
      await user.keyboard('{Enter}');

      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard Space to activate action button', async () => {
      const handleAction = vi.fn();
      const user = userEvent.setup();

      render(
        <InformationalText
          actions={[{ label: 'Action', onClick: handleAction }]}
        >
          Test message
        </InformationalText>
      );

      const actionButton = screen.getByText('Action');
      actionButton.focus();
      await user.keyboard(' ');

      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('handles rapid dismiss clicks without breaking', async () => {
      const handleDismiss = vi.fn();
      const user = userEvent.setup();

      render(
        <InformationalText onDismiss={handleDismiss}>
          Test message
        </InformationalText>
      );

      const dismissButton = screen.getByLabelText('Dismiss notification');

      // Rapid clicks
      await user.click(dismissButton);
      await user.click(dismissButton);
      await user.click(dismissButton);

      expect(handleDismiss).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('handles null children gracefully', () => {
      render(<InformationalText>{null}</InformationalText>);
      // Should not crash
    });

    it('handles undefined children gracefully', () => {
      render(<InformationalText>{undefined}</InformationalText>);
      // Should not crash
    });

    it('handles empty string children', () => {
      render(<InformationalText>{''}</InformationalText>);
      // Should not crash
    });

    it('handles missing title gracefully', () => {
      render(<InformationalText>Test message</InformationalText>);
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('handles very long content without breaking layout', () => {
      const longContent = 'A'.repeat(1000);
      render(<InformationalText>{longContent}</InformationalText>);
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('handles special characters in content', () => {
      const specialContent = '<script>alert("xss")</script> & "quotes" \'single\'';
      render(<InformationalText>{specialContent}</InformationalText>);
      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    it('does not render action buttons when actions array is empty', () => {
      render(<InformationalText actions={[]}>Test message</InformationalText>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('handles disabled action buttons', () => {
      const handleAction = vi.fn();
      render(
        <InformationalText
          actions={[{ label: 'Action', onClick: handleAction, disabled: true }]}
        >
          Test message
        </InformationalText>
      );

      const actionButton = screen.getByText('Action');
      expect(actionButton).toBeDisabled();
    });

    it('uses custom aria-label for action buttons when provided', () => {
      render(
        <InformationalText
          actions={[
            {
              label: 'Action',
              onClick: vi.fn(),
              ariaLabel: 'Custom label for action',
            },
          ]}
        >
          Test message
        </InformationalText>
      );

      expect(
        screen.getByLabelText('Custom label for action')
      ).toBeInTheDocument();
    });
  });
});
