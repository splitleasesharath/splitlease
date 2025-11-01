import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { InformationalText } from './InformationalText';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

describe('InformationalText Accessibility', () => {
  describe('Automated Accessibility Tests (jest-axe)', () => {
    it('has no axe violations for info variant', async () => {
      const { container } = render(
        <InformationalText variant="info">
          This is an informational message
        </InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for warning variant', async () => {
      const { container } = render(
        <InformationalText variant="warning">
          This is a warning message
        </InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for success variant', async () => {
      const { container } = render(
        <InformationalText variant="success">
          This is a success message
        </InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for error variant', async () => {
      const { container } = render(
        <InformationalText variant="error">
          This is an error message
        </InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for small size', async () => {
      const { container } = render(
        <InformationalText size="small">Small message</InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for medium size', async () => {
      const { container } = render(
        <InformationalText size="medium">Medium message</InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations for large size', async () => {
      const { container } = render(
        <InformationalText size="large">Large message</InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with action buttons', async () => {
      const { container } = render(
        <InformationalText
          actions={[
            { label: 'Action 1', onClick: vi.fn() },
            { label: 'Action 2', onClick: vi.fn() },
          ]}
        >
          Message with actions
        </InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with dismiss button', async () => {
      const { container } = render(
        <InformationalText onDismiss={vi.fn()}>
          Dismissible message
        </InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with title', async () => {
      const { container } = render(
        <InformationalText title="Important Notice">
          Message with title
        </InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with custom icon', async () => {
      const CustomIcon = () => <span aria-hidden="true">🎉</span>;
      const { container } = render(
        <InformationalText icon={<CustomIcon />}>
          Message with custom icon
        </InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with all features combined', async () => {
      const { container } = render(
        <InformationalText
          variant="warning"
          size="large"
          title="Complete Example"
          actions={[{ label: 'Take Action', onClick: vi.fn() }]}
          onDismiss={vi.fn()}
        >
          This is a comprehensive accessibility test
        </InformationalText>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA Attributes and Roles', () => {
    it('has role="alert" for error variant', () => {
      const { container } = render(
        <InformationalText variant="error">Error message</InformationalText>
      );
      const element = container.querySelector('[role="alert"]');
      expect(element).toBeInTheDocument();
    });

    it('has role="alert" for warning variant', () => {
      const { container } = render(
        <InformationalText variant="warning">Warning message</InformationalText>
      );
      const element = container.querySelector('[role="alert"]');
      expect(element).toBeInTheDocument();
    });

    it('has role="status" for info variant', () => {
      const { container } = render(
        <InformationalText variant="info">Info message</InformationalText>
      );
      const element = container.querySelector('[role="status"]');
      expect(element).toBeInTheDocument();
    });

    it('has role="status" for success variant', () => {
      const { container } = render(
        <InformationalText variant="success">Success message</InformationalText>
      );
      const element = container.querySelector('[role="status"]');
      expect(element).toBeInTheDocument();
    });

    it('has aria-live="assertive" for error variant', () => {
      const { container } = render(
        <InformationalText variant="error">Error message</InformationalText>
      );
      const element = container.querySelector('[aria-live="assertive"]');
      expect(element).toBeInTheDocument();
    });

    it('has aria-live="assertive" for warning variant', () => {
      const { container } = render(
        <InformationalText variant="warning">Warning message</InformationalText>
      );
      const element = container.querySelector('[aria-live="assertive"]');
      expect(element).toBeInTheDocument();
    });

    it('has aria-live="polite" for info variant', () => {
      const { container } = render(
        <InformationalText variant="info">Info message</InformationalText>
      );
      const element = container.querySelector('[aria-live="polite"]');
      expect(element).toBeInTheDocument();
    });

    it('has aria-live="polite" for success variant', () => {
      const { container } = render(
        <InformationalText variant="success">Success message</InformationalText>
      );
      const element = container.querySelector('[aria-live="polite"]');
      expect(element).toBeInTheDocument();
    });

    it('dismiss button has proper aria-label', () => {
      const { getByLabelText } = render(
        <InformationalText onDismiss={vi.fn()}>
          Dismissible message
        </InformationalText>
      );
      expect(getByLabelText('Dismiss notification')).toBeInTheDocument();
    });

    it('action buttons use custom aria-label when provided', () => {
      const { getByLabelText } = render(
        <InformationalText
          actions={[
            {
              label: 'Action',
              onClick: vi.fn(),
              ariaLabel: 'Custom action label',
            },
          ]}
        >
          Message with action
        </InformationalText>
      );
      expect(getByLabelText('Custom action label')).toBeInTheDocument();
    });

    it('icon has aria-hidden="true"', () => {
      const { container } = render(
        <InformationalText variant="info">Message with icon</InformationalText>
      );
      const icon = container.querySelector('[data-testid="info-icon"]');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Keyboard Navigation', () => {
    it('action buttons are keyboard focusable', () => {
      const { getByText } = render(
        <InformationalText actions={[{ label: 'Action', onClick: vi.fn() }]}>
          Message
        </InformationalText>
      );
      const button = getByText('Action');
      expect(button).toHaveAttribute('type', 'button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('dismiss button is keyboard focusable', () => {
      const { getByLabelText } = render(
        <InformationalText onDismiss={vi.fn()}>Message</InformationalText>
      );
      const button = getByLabelText('Dismiss notification');
      expect(button).toHaveAttribute('type', 'button');
      expect(button.tagName).toBe('BUTTON');
    });

    it('disabled action buttons are not focusable', () => {
      const { getByText } = render(
        <InformationalText
          actions={[{ label: 'Action', onClick: vi.fn(), disabled: true }]}
        >
          Message
        </InformationalText>
      );
      const button = getByText('Action');
      expect(button).toBeDisabled();
    });
  });

  describe('Semantic HTML', () => {
    it('uses button element for action buttons', () => {
      const { getByText } = render(
        <InformationalText actions={[{ label: 'Action', onClick: vi.fn() }]}>
          Message
        </InformationalText>
      );
      const button = getByText('Action');
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('uses button element for dismiss button', () => {
      const { getByLabelText } = render(
        <InformationalText onDismiss={vi.fn()}>Message</InformationalText>
      );
      const button = getByLabelText('Dismiss notification');
      expect(button.tagName).toBe('BUTTON');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('uses heading element for title when provided', () => {
      const { getByText } = render(
        <InformationalText title="Title">Message</InformationalText>
      );
      const title = getByText('Title');
      expect(title.tagName).toBe('H3');
    });
  });
});
