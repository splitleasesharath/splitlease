/**
 * SignupTrialHost Component Tests
 *
 * Comprehensive test suite following TDD principles:
 * - Rendering tests
 * - User interaction tests
 * - Validation tests
 * - Multi-step navigation tests
 * - Form submission tests
 * - Edge case tests
 *
 * Target: >90% code coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupTrialHost from './SignupTrialHost';
import type { SignupTrialHostProps } from './SignupTrialHost.types';

describe('SignupTrialHost Component - Rendering Tests', () => {
  it('should render step 1 (personal info) by default', () => {
    render(<SignupTrialHost />);

    expect(screen.getByText(/personal information/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
  });

  it('should render all form fields for step 1', () => {
    render(<SignupTrialHost />);

    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email address/i);
    const phoneInput = screen.getByLabelText(/phone number/i);

    expect(nameInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();
    expect(phoneInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute('type', 'text');
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(phoneInput).toHaveAttribute('type', 'tel');
  });

  it('should render progress indicator with current step', () => {
    render(<SignupTrialHost />);

    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  it('should display custom className if provided', () => {
    const { container } = render(<SignupTrialHost className="custom-signup-form" />);

    const form = container.querySelector('form');
    expect(form).toHaveClass('custom-signup-form');
  });

  it('should render Next button on step 1', () => {
    render(<SignupTrialHost />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeInTheDocument();
  });

  it('should not render Back button on step 1', () => {
    render(<SignupTrialHost />);

    const backButton = screen.queryByRole('button', { name: /back/i });
    expect(backButton).not.toBeInTheDocument();
  });

  it('should not render Submit button on step 1', () => {
    render(<SignupTrialHost />);

    const submitButton = screen.queryByRole('button', { name: /submit/i });
    expect(submitButton).not.toBeInTheDocument();
  });

  it('should hide progress indicator if showProgress is false', () => {
    render(<SignupTrialHost showProgress={false} />);

    expect(screen.queryByText(/step 1 of 3/i)).not.toBeInTheDocument();
  });

  it('should apply data-testid if provided', () => {
    render(<SignupTrialHost data-testid="signup-form" />);

    expect(screen.getByTestId('signup-form')).toBeInTheDocument();
  });
});

describe('SignupTrialHost Component - Step 2 Rendering', () => {
  it('should render step 2 fields', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    // Fill step 1
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    // Navigate to step 2
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/property information/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/property address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/property type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bedrooms/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bathrooms/i)).toBeInTheDocument();
  });

  it('should render Back button on step 2', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
    });
  });

  it('should show step 2 of 3 in progress indicator', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    });
  });
});

describe('SignupTrialHost Component - Step 3 Rendering', () => {
  it('should render step 3 fields', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    // Fill step 1
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Fill step 2
    await waitFor(() => {
      expect(screen.getByLabelText(/property address/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/property address/i), '123 Main Street, City, State');
    await user.selectOptions(screen.getByLabelText(/property type/i), 'single-family');
    await user.type(screen.getByLabelText(/bedrooms/i), '3');
    await user.type(screen.getByLabelText(/bathrooms/i), '2');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Check step 3
    await waitFor(() => {
      expect(screen.getByText(/trial preferences/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trial duration/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/how did you hear/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/terms and conditions/i)).toBeInTheDocument();
  });

  it('should render Submit button on step 3', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

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

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });
  });

  it('should show step 3 of 3 in progress indicator', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

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

    await waitFor(() => {
      expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
    });
  });
});

describe('SignupTrialHost Component - User Interactions', () => {
  it('should update input value on change', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;

    await user.type(nameInput, 'John Doe');

    expect(nameInput.value).toBe('John Doe');
  });

  it('should format phone number on change', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;

    await user.type(phoneInput, '1234567890');

    await waitFor(() => {
      expect(phoneInput.value).toMatch(/\(123\) 456-7890/);
    });
  });

  it('should show validation error on blur if invalid', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    const emailInput = screen.getByLabelText(/email address/i);

    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should navigate to next step on Next button click with valid data', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/property information/i)).toBeInTheDocument();
    });
  });

  it('should navigate to previous step on Back button click', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    // Go to step 2
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => screen.getByLabelText(/property address/i));

    // Go back to step 1
    await user.click(screen.getByRole('button', { name: /back/i }));

    await waitFor(() => {
      expect(screen.getByText(/personal information/i)).toBeInTheDocument();
    });
  });

  it('should preserve data when navigating back and forth', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    // Fill step 1
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => screen.getByLabelText(/property address/i));

    // Go back
    await user.click(screen.getByRole('button', { name: /back/i }));

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('John Doe');
    });
  });

  it('should call onSubmit with form data on submit', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SignupTrialHost onSubmit={mockOnSubmit} />);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];

    // Fill step 1
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Fill step 2
    await waitFor(() => screen.getByLabelText(/property address/i));
    await user.type(screen.getByLabelText(/property address/i), '123 Main Street, City, State');
    await user.selectOptions(screen.getByLabelText(/property type/i), 'single-family');
    await user.type(screen.getByLabelText(/bedrooms/i), '3');
    await user.type(screen.getByLabelText(/bathrooms/i), '2');
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Fill step 3
    await waitFor(() => screen.getByLabelText(/start date/i));
    await user.type(screen.getByLabelText(/start date/i), dateStr);
    await user.selectOptions(screen.getByLabelText(/trial duration/i), '14');
    await user.click(screen.getByLabelText(/terms and conditions/i));

    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          personalInfo: expect.objectContaining({
            fullName: 'John Doe',
            email: 'john@example.com',
          }),
          propertyInfo: expect.objectContaining({
            address: '123 Main Street, City, State',
            propertyType: 'single-family',
          }),
          trialPreferences: expect.objectContaining({
            duration: 14,
            termsAccepted: true,
          }),
        })
      );
    });
  });

  it('should show loading state during submission', async () => {
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });

    const mockOnSubmit = vi.fn().mockReturnValue(submitPromise);
    const user = userEvent.setup();

    render(<SignupTrialHost onSubmit={mockOnSubmit} />);

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
      expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    });

    resolveSubmit!();
  });

  it('should show success message on successful submission', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SignupTrialHost onSubmit={mockOnSubmit} />);

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
      expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    });
  });

  it('should show error message on failed submission', async () => {
    const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
    const user = userEvent.setup();

    render(<SignupTrialHost onSubmit={mockOnSubmit} />);

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
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('should disable form during submission', async () => {
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });

    const mockOnSubmit = vi.fn().mockReturnValue(submitPromise);
    const user = userEvent.setup();

    render(<SignupTrialHost onSubmit={mockOnSubmit} />);

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

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    resolveSubmit!();
  });
});

describe('SignupTrialHost Component - Validation Tests', () => {
  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    // Try to navigate without filling fields
    await user.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(screen.getByText(/required/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('should validate phone format', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.type(phoneInput, '12345');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/10 digits/i)).toBeInTheDocument();
    });
  });

  it('should clear errors when field becomes valid', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    const emailInput = screen.getByLabelText(/email address/i);

    // Enter invalid email
    await user.type(emailInput, 'invalid');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });

    // Fix the email
    await user.clear(emailInput);
    await user.type(emailInput, 'john@example.com');
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
    });
  });

  it('should prevent navigation with invalid data', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    // Fill only one field
    await user.type(screen.getByLabelText(/full name/i), 'John Doe');

    // Try to navigate
    await user.click(screen.getByRole('button', { name: /next/i }));

    // Should still be on step 1
    expect(screen.getByText(/personal information/i)).toBeInTheDocument();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });

  it('should not submit if validation fails', async () => {
    const mockOnSubmit = vi.fn();
    const user = userEvent.setup();

    render(<SignupTrialHost onSubmit={mockOnSubmit} />);

    // Navigate to step 3 by filling valid data
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

    // On step 3, don't fill required fields
    await waitFor(() => screen.getByLabelText(/start date/i));

    // Try to submit
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Should not call onSubmit
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});

describe('SignupTrialHost Component - Edge Cases', () => {
  it('should handle missing onSubmit callback', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split('T')[0];

    // Fill entire form
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

    // Should not throw error
    await expect(
      user.click(screen.getByRole('button', { name: /submit/i }))
    ).resolves.not.toThrow();
  });

  it('should handle rapid clicking without breaking', async () => {
    const user = userEvent.setup();
    render(<SignupTrialHost />);

    await user.type(screen.getByLabelText(/full name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email address/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone number/i), '1234567890');

    const nextButton = screen.getByRole('button', { name: /next/i });

    // Click multiple times rapidly
    await user.click(nextButton);
    await user.click(nextButton);
    await user.click(nextButton);

    // Should navigate only once
    await waitFor(() => {
      expect(screen.getByText(/property information/i)).toBeInTheDocument();
    });
  });

  it('should auto-focus first input if autoFocus is true', () => {
    render(<SignupTrialHost autoFocus={true} />);

    const nameInput = screen.getByLabelText(/full name/i);
    expect(document.activeElement).toBe(nameInput);
  });

  it('should not auto-focus if autoFocus is false', () => {
    render(<SignupTrialHost autoFocus={false} />);

    const nameInput = screen.getByLabelText(/full name/i);
    expect(document.activeElement).not.toBe(nameInput);
  });
});
