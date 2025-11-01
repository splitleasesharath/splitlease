/**
 * SignupLogin Component Tests
 *
 * Comprehensive test suite following TDD principles:
 * - Rendering tests (signup/login modes)
 * - User interaction tests
 * - Validation tests
 * - State management tests
 * - Edge case tests
 *
 * Target: >90% code coverage
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupLogin from './SignupLogin';

describe('SignupLogin Component - Rendering Tests', () => {
  it('renders in signup mode by default', () => {
    render(<SignupLogin />);

    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/terms/i)).toBeInTheDocument();
  });

  it('renders in login mode when mode prop is login', () => {
    render(<SignupLogin mode="login" />);

    expect(screen.getByRole('form')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password\s*\*$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = render(<SignupLogin className="custom-class" />);
    const formContainer = container.firstChild;
    expect(formContainer).toHaveClass('custom-class');
  });

  it('displays signup form fields', () => {
    render(<SignupLogin mode="signup" />);

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/terms/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('displays login form fields', () => {
    render(<SignupLogin mode="login" />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password\s*\*$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remember me/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('shows mode toggle link in signup mode', () => {
    render(<SignupLogin mode="signup" />);

    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows mode toggle link in login mode', () => {
    render(<SignupLogin mode="login" />);

    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('displays password strength indicator in signup mode', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="signup" />);

    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(passwordInput, 'WeakPass1!');

    await waitFor(() => {
      expect(screen.getByText(/password strength/i)).toBeInTheDocument();
    });
  });
});

describe('SignupLogin Component - Interaction Tests', () => {
  it('toggles to login mode when sign in link clicked', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="signup" />);

    const signInLink = screen.getByRole('button', { name: /sign in/i });
    await user.click(signInLink);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
    });
  });

  it('toggles to signup mode when sign up link clicked', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const signUpLink = screen.getByRole('button', { name: /sign up/i });
    await user.click(signUpLink);

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });
  });

  it('updates email field on input', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    await user.type(emailInput, 'test@example.com');

    expect(emailInput.value).toBe('test@example.com');
  });

  it('updates password field on input', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const passwordInput = screen.getByLabelText(/^password\s*\*$/i) as HTMLInputElement;
    await user.type(passwordInput, 'Password123!');

    expect(passwordInput.value).toBe('Password123!');
  });

  it('updates all signup fields on input', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="signup" />);

    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

    expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe('John');
    expect((screen.getByLabelText(/last name/i) as HTMLInputElement).value).toBe('Doe');
  });

  it('shows validation error on invalid email', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows password strength as user types in signup mode', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="signup" />);

    const passwordInput = screen.getByLabelText(/^password/i);
    await user.type(passwordInput, 'MyV3ryStr0ng!P@ssw0rd');

    await waitFor(() => {
      const strengthText = screen.getByText(/password strength/i).textContent;
      expect(strengthText).toContain('strong');
    });
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="signup" />);

    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPass123!');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows error when terms not accepted', async () => {
    const user = userEvent.setup();
    const onSignupSuccess = vi.fn();
    render(<SignupLogin mode="signup" onSignupSuccess={onSignupSuccess} />);

    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/accept the terms/i)).toBeInTheDocument();
      expect(onSignupSuccess).not.toHaveBeenCalled();
    });
  });

  it('disables submit button during submission', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<SignupLogin mode="login" onLoginSuccess={onLoginSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password\s*\*$/i), 'password123');

    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  it('calls onSignupSuccess on successful signup', async () => {
    const user = userEvent.setup();
    const onSignupSuccess = vi.fn();
    render(<SignupLogin mode="signup" onSignupSuccess={onSignupSuccess} />);

    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(screen.getByLabelText(/terms/i));

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSignupSuccess).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }));
    });
  });

  it('calls onLoginSuccess on successful login', async () => {
    const user = userEvent.setup();
    const onLoginSuccess = vi.fn();
    render(<SignupLogin mode="login" onLoginSuccess={onLoginSuccess} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password\s*\*$/i), 'password123');

    const submitButton = screen.getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalledWith(expect.objectContaining({
        email: 'test@example.com',
        password: 'password123',
      }));
    });
  });

  it('clears errors on field change', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });

    await user.type(emailInput, '@example.com');

    await waitFor(() => {
      expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
    });
  });
});

describe('SignupLogin Component - Edge Cases', () => {
  it('handles null onSignupSuccess gracefully', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="signup" />);

    await user.type(screen.getByLabelText(/first name/i), 'John');
    await user.type(screen.getByLabelText(/last name/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!');
    await user.click(screen.getByLabelText(/terms/i));

    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await expect(user.click(submitButton)).resolves.not.toThrow();
  });

  it('handles rapid mode switching', async () => {
    const { rerender } = render(<SignupLogin mode="signup" />);

    rerender(<SignupLogin mode="login" />);
    rerender(<SignupLogin mode="signup" />);
    rerender(<SignupLogin mode="login" />);

    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('handles extremely long email', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const longEmail = 'a'.repeat(300) + '@example.com';
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, longEmail);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/must be less than 255 characters/i)).toBeInTheDocument();
    });
  });

  it('handles special characters in inputs', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="signup" />);

    await user.type(screen.getByLabelText(/first name/i), 'O\'Brien');
    await user.type(screen.getByLabelText(/last name/i), 'Smith-Jones');

    expect((screen.getByLabelText(/first name/i) as HTMLInputElement).value).toBe('O\'Brien');
    expect((screen.getByLabelText(/last name/i) as HTMLInputElement).value).toBe('Smith-Jones');
  });

  it('handles copy-paste of whitespace', async () => {
    const user = userEvent.setup();
    render(<SignupLogin mode="login" />);

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    await user.click(emailInput);
    await user.paste('  test@example.com  ');

    await waitFor(() => {
      expect(emailInput.value).toBe('test@example.com');
    });
  });
});
