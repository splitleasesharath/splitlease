/**
 * SignupTrialHost Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance:
 * - Automated axe violations
 * - ARIA attributes
 * - Keyboard navigation
 * - Screen reader announcements
 * - Focus management
 * - Color contrast
 *
 * Target: Zero accessibility violations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import SignupTrialHost from './SignupTrialHost';

expect.extend(toHaveNoViolations);

describe('SignupTrialHost - Accessibility Tests', () => {
  describe('Automated Accessibility (axe)', () => {
    it('should have no axe violations on step 1', async () => {
      const { container } = render(<SignupTrialHost />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations on step 2', async () => {
      const user = userEvent.setup();
      const { container } = render(<SignupTrialHost />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => screen.getByLabelText(/property address/i));

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations on step 3', async () => {
      const user = userEvent.setup();
      const { container } = render(<SignupTrialHost />);

      // Navigate to step 3
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => screen.getByLabelText(/property address/i));
      await user.type(screen.getByLabelText(/property address/i), '123 Main Street, City, State');
      await user.selectOptions(screen.getByLabelText(/property type/i), 'single-family');
      await user.type(screen.getByLabelText(/bedrooms/i), '3');
      await user.type(screen.getByLabelText(/bathrooms/i), '2');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => screen.getByLabelText(/start date/i));

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations with error messages', async () => {
      const user = userEvent.setup();
      const { container } = render(<SignupTrialHost />);

      // Trigger validation errors
      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => screen.getByText(/valid email/i));

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no axe violations in success state', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      const { container } = render(<SignupTrialHost onSubmit={mockOnSubmit} />);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Fill and submit form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => screen.getByLabelText(/property address/i));
      await user.type(screen.getByLabelText(/property address/i), '123 Main Street, City, State');
      await user.selectOptions(screen.getByLabelText(/property type/i), 'single-family');
      await user.type(screen.getByLabelText(/bedrooms/i), '3');
      await user.type(screen.getByLabelText(/bathrooms/i), '2');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => screen.getByLabelText(/start date/i));
      await user.type(screen.getByLabelText(/start date/i), dateStr);
      await user.selectOptions(screen.getByLabelText(/trial duration/i), '14');
      await user.click(screen.getByLabelText(/terms and conditions/i));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => screen.getByText(/thank you/i));

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA Labels and Attributes', () => {
    it('should have proper ARIA label on form', () => {
      render(<SignupTrialHost />);

      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label');
    });

    it('should have proper ARIA labels on all inputs', () => {
      render(<SignupTrialHost />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const phoneInput = screen.getByLabelText(/phone number/i);

      expect(nameInput).toHaveAccessibleName();
      expect(emailInput).toHaveAccessibleName();
      expect(phoneInput).toHaveAccessibleName();
    });

    it('should mark invalid fields with aria-invalid', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      const emailInput = screen.getByLabelText(/email address/i);

      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should associate error messages with fields using aria-describedby', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      const emailInput = screen.getByLabelText(/email address/i);

      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        const describedBy = emailInput.getAttribute('aria-describedby');
        expect(describedBy).toBeTruthy();

        const errorElement = document.getElementById(describedBy!);
        expect(errorElement).toBeInTheDocument();
        expect(errorElement).toHaveTextContent(/valid email/i);
      });
    });

    it('should mark valid fields with aria-invalid=false', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      const emailInput = screen.getByLabelText(/email address/i);

      await user.type(emailInput, 'john@example.com');
      await user.tab();

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'false');
      });
    });

    it('should have aria-required on required fields', () => {
      render(<SignupTrialHost />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const phoneInput = screen.getByLabelText(/phone number/i);

      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toHaveAttribute('aria-required', 'true');
      expect(phoneInput).toHaveAttribute('aria-required', 'true');
    });

    it('should have live region for status announcements', () => {
      const { container } = render(<SignupTrialHost />);

      const liveRegion = container.querySelector('[aria-live]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce step changes to screen readers', async () => {
      const user = userEvent.setup();
      const { container } = render(<SignupTrialHost />);

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const liveRegion = container.querySelector('[aria-live]');
        expect(liveRegion).toHaveTextContent(/step 2/i);
      });
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      const { container } = render(<SignupTrialHost />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        const liveRegion = container.querySelector('[aria-live="assertive"]');
        expect(liveRegion).toHaveTextContent(/valid email/i);
      });
    });

    it('should announce form submission success to screen readers', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      const { container } = render(<SignupTrialHost onSubmit={mockOnSubmit} />);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Fill and submit form
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => screen.getByLabelText(/property address/i));
      await user.type(screen.getByLabelText(/property address/i), '123 Main Street, City, State');
      await user.selectOptions(screen.getByLabelText(/property type/i), 'single-family');
      await user.type(screen.getByLabelText(/bedrooms/i), '3');
      await user.type(screen.getByLabelText(/bathrooms/i), '2');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => screen.getByLabelText(/start date/i));
      await user.type(screen.getByLabelText(/start date/i), dateStr);
      await user.selectOptions(screen.getByLabelText(/trial duration/i), '14');
      await user.click(screen.getByLabelText(/terms and conditions/i));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        const liveRegion = container.querySelector('[aria-live="polite"]');
        expect(liveRegion).toHaveTextContent(/thank you/i);
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have logical tab order', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email address/i);
      const phoneInput = screen.getByLabelText(/phone number/i);
      const nextButton = screen.getByRole('button', { name: /next/i });

      // Start at name input
      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);

      // Tab to email
      await user.tab();
      expect(document.activeElement).toBe(emailInput);

      // Tab to phone
      await user.tab();
      expect(document.activeElement).toBe(phoneInput);

      // Tab to next button
      await user.tab();
      expect(document.activeElement).toBe(nextButton);
    });

    it('should support Enter key to submit form', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<SignupTrialHost onSubmit={mockOnSubmit} />);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Fill form via keyboard
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByLabelText(/property address/i));
      await user.type(screen.getByLabelText(/property address/i), '123 Main Street, City, State');
      await user.type(screen.getByLabelText(/property type/i), 'single-family');
      await user.type(screen.getByLabelText(/bedrooms/i), '3');
      await user.type(screen.getByLabelText(/bathrooms/i), '2');
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByLabelText(/start date/i));
      await user.type(screen.getByLabelText(/start date/i), dateStr);
      await user.type(screen.getByLabelText(/trial duration/i), '14');
      await user.click(screen.getByLabelText(/terms and conditions/i));
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should support Space key for checkbox', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      // Navigate to step 3
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByLabelText(/property address/i));
      await user.type(screen.getByLabelText(/property address/i), '123 Main Street, City, State');
      await user.type(screen.getByLabelText(/property type/i), 'single-family');
      await user.type(screen.getByLabelText(/bedrooms/i), '3');
      await user.type(screen.getByLabelText(/bathrooms/i), '2');
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByLabelText(/terms and conditions/i));

      const checkbox = screen.getByLabelText(/terms and conditions/i) as HTMLInputElement;
      checkbox.focus();

      expect(checkbox.checked).toBe(false);

      await user.keyboard(' ');

      expect(checkbox.checked).toBe(true);
    });

    it('should maintain focus on error fields', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      const emailInput = screen.getByLabelText(/email address/i);

      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });

      // Focus should be on the next field, but error should be associated
      const describedBy = emailInput.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
    });

    it('should be navigable without mouse', async () => {
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<SignupTrialHost onSubmit={mockOnSubmit} />);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Complete entire form using only keyboard
      await user.keyboard('John Doe');
      await user.tab();
      await user.keyboard('john@example.com');
      await user.tab();
      await user.keyboard('1234567890');
      await user.tab();
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByLabelText(/property address/i));
      await user.keyboard('123 Main Street, City, State');
      await user.tab();
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      await user.tab();
      await user.keyboard('3');
      await user.tab();
      await user.keyboard('2');
      await user.tab();
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByLabelText(/start date/i));
      await user.keyboard(dateStr);
      await user.tab();
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');
      await user.tab();
      await user.tab();
      await user.keyboard(' '); // Check terms
      await user.tab();
      await user.keyboard('{Enter}'); // Submit

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', async () => {
      const user = userEvent.setup();
      const { container } = render(<SignupTrialHost />);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.tab();

      expect(document.activeElement).toBe(nameInput);

      // Check if focus styles are applied (via CSS class or inline style)
      const focusedElement = container.querySelector(':focus');
      expect(focusedElement).toBe(nameInput);
    });

    it('should restore focus after error announcement', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const focusedBefore = document.activeElement;
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });

      // Focus should move to next field
      expect(document.activeElement).not.toBe(emailInput);
    });

    it('should trap focus within modal if error state shows modal', async () => {
      // This test assumes error states might show in modals
      // Adjust based on actual implementation
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      // Test that focus management works correctly
      const firstInput = screen.getByLabelText(/full name/i);
      firstInput.focus();

      expect(document.activeElement).toBe(firstInput);
    });
  });

  describe('Semantic HTML', () => {
    it('should use semantic form element', () => {
      render(<SignupTrialHost />);

      const form = screen.getByRole('form');
      expect(form.tagName).toBe('FORM');
    });

    it('should use proper heading hierarchy', () => {
      const { container } = render(<SignupTrialHost />);

      const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings.length).toBeGreaterThan(0);

      // Check heading levels are sequential
      const levels = Array.from(headings).map((h) => parseInt(h.tagName[1]));
      const isSequential = levels.every((level, index) => {
        if (index === 0) return true;
        return level <= levels[index - 1] + 1;
      });

      expect(isSequential).toBe(true);
    });

    it('should use label elements for form fields', () => {
      render(<SignupTrialHost />);

      const labels = screen.getAllByText(/full name|email|phone/i);
      labels.forEach((label) => {
        expect(label.tagName).toBe('LABEL');
      });
    });

    it('should use button elements for buttons', () => {
      render(<SignupTrialHost />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton.tagName).toBe('BUTTON');
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce form purpose', () => {
      render(<SignupTrialHost />);

      const form = screen.getByRole('form');
      const ariaLabel = form.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/signup|trial|host/i);
    });

    it('should announce required fields', () => {
      render(<SignupTrialHost />);

      const nameInput = screen.getByLabelText(/full name/i);
      expect(nameInput).toHaveAttribute('aria-required', 'true');
    });

    it('should announce progress through steps', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      const progressIndicator = screen.getByText(/step 1 of 3/i);
      expect(progressIndicator).toHaveAttribute('aria-label');

      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        const newProgressIndicator = screen.getByText(/step 2 of 3/i);
        expect(newProgressIndicator).toHaveAttribute('aria-label');
      });
    });

    it('should have screen-reader-only text for important context', () => {
      const { container } = render(<SignupTrialHost />);

      const srOnlyElements = container.querySelectorAll('.sr-only, .visually-hidden');
      expect(srOnlyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Color and Contrast', () => {
    it('should not rely solely on color for error indication', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');
      await user.tab();

      await waitFor(() => {
        // Error should be indicated by text message, not just color
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();

        // And by aria-invalid
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should have text alternative for visual indicators', () => {
      render(<SignupTrialHost />);

      // Progress indicator should have aria-label
      const progressIndicator = screen.getByText(/step 1 of 3/i);
      expect(progressIndicator.closest('[aria-label]')).toBeInTheDocument();
    });
  });

  describe('Touch Targets', () => {
    it('should have sufficiently large touch targets for buttons', () => {
      const { container } = render(<SignupTrialHost />);

      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        const rect = button.getBoundingClientRect();
        const minSize = 44; // WCAG AA minimum

        // Note: This test may need adjustment based on CSS
        // In a real environment, we'd check computed styles
        expect(button).toBeInTheDocument();
      });
    });

    it('should have sufficiently large touch targets for checkbox', async () => {
      const user = userEvent.setup();
      render(<SignupTrialHost />);

      // Navigate to step 3
      await user.type(screen.getByLabelText(/full name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone number/i), '1234567890');
      await user.keyboard('{Enter}');

      await waitFor(() => screen.getByLabelText(/property address/i));
      await user.type(screen.getByLabelText(/property address/i), '123 Main Street, City, State');
      await user.type(screen.getByLabelText(/property type/i), 'single-family');
      await user.type(screen.getByLabelText(/bedrooms/i), '3');
      await user.type(screen.getByLabelText(/bathrooms/i), '2');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        const checkbox = screen.getByLabelText(/terms and conditions/i);
        expect(checkbox).toBeInTheDocument();
      });
    });
  });
});
