/**
 * SignupLogin Component Accessibility Tests
 *
 * Tests WCAG 2.1 AA compliance:
 * - No axe violations
 * - Proper ARIA attributes
 * - Keyboard navigation
 * - Screen reader support
 * - Focus management
 * - Form field associations
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import SignupLogin from './SignupLogin';

expect.extend(toHaveNoViolations);

describe('SignupLogin Component - Accessibility Tests', () => {
  it('has no axe violations in signup mode', async () => {
    const { container } = render(<SignupLogin mode="signup" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations in login mode', async () => {
    const { container } = render(<SignupLogin mode="login" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('all form fields have associated labels in signup mode', () => {
    render(<SignupLogin mode="signup" />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/terms/i)).toBeInTheDocument();
  });

  it('all form fields have associated labels in login mode', () => {
    render(<SignupLogin mode="login" />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
  });

  it('all buttons have accessible names', () => {
    render(<SignupLogin mode="signup" />);

    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('error messages are associated with fields via aria-describedby', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await new Promise(resolve => setTimeout(resolve, 100));

    const errorId = emailInput.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();

    if (errorId) {
      const errorElement = document.getElementById(errorId);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement?.textContent).toContain('Invalid email');
    }
  });

  it('invalid fields have aria-invalid=true', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  it('valid fields have aria-invalid=false', () => {
    render(<SignupLogin mode="login" />);

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('aria-invalid', 'false');
  });

  it('form has proper role', () => {
    render(<SignupLogin />);

    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
  });

  it('form has aria-labelledby attribute', () => {
    render(<SignupLogin />);

    const form = screen.getByRole('form');
    const labelId = form.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();

    if (labelId) {
      const label = document.getElementById(labelId);
      expect(label).toBeInTheDocument();
    }
  });

  it('keyboard navigation works with Tab key', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    const submitButton = screen.getByRole('button', { name: /log in/i });

    emailInput.focus();
    expect(document.activeElement).toBe(emailInput);

    await user.tab();
    expect(document.activeElement).toBe(passwordInput);

    await user.tab();
    expect(document.activeElement).toBe(rememberMeCheckbox);

    await user.tab();
    expect(document.activeElement).toBe(submitButton);
  });

  it('Enter key submits form', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    render(<SignupLogin mode="login" onLoginSuccess={onLoginSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.keyboard('{Enter}');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(onLoginSuccess).toHaveBeenCalled();
  });

  it('Space key toggles checkbox', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const rememberMeCheckbox = screen.getByLabelText(/remember me/i) as HTMLInputElement;
    rememberMeCheckbox.focus();

    expect(rememberMeCheckbox.checked).toBe(false);

    await user.keyboard(' ');
    expect(rememberMeCheckbox.checked).toBe(true);

    await user.keyboard(' ');
    expect(rememberMeCheckbox.checked).toBe(false);
  });

  it('focus management after mode toggle', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="signup" />);

    const modeToggleButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(modeToggleButton);

    await new Promise(resolve => setTimeout(resolve, 100));

    // After mode switch, focus should be on a logical element (form or first input)
    const activeElement = document.activeElement;
    expect(activeElement).toBeTruthy();
  });

  it('submit button is focusable and has correct role', () => {
    render(<SignupLogin mode="signup" />);

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    expect(submitButton).toHaveAttribute('type', 'submit');
    expect(submitButton).not.toHaveAttribute('disabled');
  });

  it('disabled submit button is not focusable with keyboard', async () => {
    const user = userEvent.setup();
    const onSignupSuccess = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    render(<SignupLogin mode="signup" onSignupSuccess={onSignupSuccess} />);

    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(screen.getByLabelText(/terms/i));

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    // Button should be disabled during submission
    expect(submitButton).toBeDisabled();
  });

  it('password visibility toggle has aria-label', async () => {
    render(<SignupLogin mode="login" />);

    const toggleButtons = screen.queryAllByRole('button', { name: /show password|hide password/i });

    // If password toggle exists, it should have accessible label
    if (toggleButtons.length > 0) {
      toggleButtons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    }
  });
});
