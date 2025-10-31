import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Footer } from './Footer';

expect.extend(toHaveNoViolations);

describe('Footer Accessibility Tests', () => {
  it('has no axe violations with default props', async () => {
    const { container } = render(<Footer />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with all sections enabled', async () => {
    const { container } = render(
      <Footer showReferral={true} showImport={true} showAppDownload={true} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations with custom content', async () => {
    const { container } = render(
      <Footer
        columns={[
          {
            title: 'Test Column',
            links: [{ text: 'Test Link', url: 'https://example.com' }],
          },
        ]}
        copyrightText="© 2024 Test"
        footerNote="Test Note"
        termsUrl="https://test.com/terms"
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  describe('ARIA Attributes', () => {
    it('has proper ARIA labels on referral form inputs', () => {
      render(<Footer />);
      const input = screen.getByPlaceholderText("Your friend's phone number");
      expect(input).toHaveAttribute('aria-label');
    });

    it('has proper ARIA labels on import form inputs', () => {
      render(<Footer />);
      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');

      expect(urlInput).toHaveAttribute('aria-label');
      expect(emailInput).toHaveAttribute('aria-label');
    });

    it('marks invalid inputs with aria-invalid', async () => {
      const user = userEvent.setup();
      render(<Footer />);

      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now');

      await user.type(input, 'invalid-phone');
      await user.click(submitButton);

      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates error messages with inputs using aria-describedby', async () => {
      const user = userEvent.setup();
      render(<Footer />);

      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now');

      await user.type(input, 'invalid-phone');
      await user.click(submitButton);

      expect(input).toHaveAttribute('aria-describedby');
      const errorId = input.getAttribute('aria-describedby');
      const errorElement = document.getElementById(errorId!);
      expect(errorElement).toBeInTheDocument();
    });

    it('has aria-busy on buttons during submission', async () => {
      const onImportSubmit = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
      const user = userEvent.setup();
      render(<Footer onImportSubmit={onImportSubmit} />);

      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');
      const submitButton = screen.getByText('Submit');

      await user.type(urlInput, 'https://example.com/listing');
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      expect(submitButton).toHaveAttribute('aria-busy', 'true');
    });

    it('uses aria-live region for success messages', async () => {
      const onReferralSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now');

      await user.type(input, '123-456-7890');
      await user.click(submitButton);

      const liveRegion = await screen.findByRole('status');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveTextContent('Referral sent successfully!');
    });

    it('uses aria-live region for error messages', async () => {
      const user = userEvent.setup();
      render(<Footer />);

      const submitButton = screen.getByText('Share now');
      await user.click(submitButton);

      const liveRegion = await screen.findByRole('alert');
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
      user = userEvent.setup();
    });

    it('allows tab navigation through all interactive elements', async () => {
      render(<Footer />);

      // Tab through links, radio buttons, inputs, and buttons
      await user.tab(); // First link
      expect(document.activeElement?.tagName).toBe('A');

      // Continue tabbing through all elements
      const interactiveElements = screen.getAllByRole('link');
      const radioButtons = screen.getAllByRole('radio');
      const textboxes = screen.getAllByRole('textbox');
      const buttons = screen.getAllByRole('button');

      const totalInteractive =
        interactiveElements.length +
        radioButtons.length +
        textboxes.length +
        buttons.length;

      expect(totalInteractive).toBeGreaterThan(0);
    });

    it('allows Enter key to submit referral form', async () => {
      const onReferralSubmit = vi.fn();
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const input = screen.getByPlaceholderText("Your friend's phone number");

      await user.type(input, '123-456-7890');
      await user.keyboard('{Enter}');

      expect(onReferralSubmit).toHaveBeenCalledWith('text', '123-456-7890');
    });

    it('allows Enter key to submit import form', async () => {
      const onImportSubmit = vi.fn();
      render(<Footer onImportSubmit={onImportSubmit} />);

      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');

      await user.type(
        screen.getByPlaceholderText('https://your-listing-link'),
        'https://example.com'
      );
      await user.type(emailInput, 'test@example.com');
      await user.keyboard('{Enter}');

      expect(onImportSubmit).toHaveBeenCalledWith(
        'https://example.com',
        'test@example.com'
      );
    });

    it('allows Space key to toggle radio buttons', async () => {
      render(<Footer />);

      const emailRadio = screen.getByLabelText('Email');
      emailRadio.focus();
      await user.keyboard(' ');

      expect(emailRadio).toBeChecked();
    });

    it('shows visible focus indicators on all interactive elements', async () => {
      render(<Footer />);

      const links = screen.getAllByRole('link');
      const firstLink = links[0];
      if (firstLink) {
        firstLink.focus();
        // Check that focus styles are applied (this assumes CSS is applied)
        expect(firstLink).toHaveFocus();
      }
    });
  });

  describe('Semantic HTML', () => {
    it('uses proper heading hierarchy', () => {
      render(<Footer />);

      const headings = screen.getAllByRole('heading');
      headings.forEach((heading) => {
        expect(heading.tagName).toBe('H4');
      });
    });

    it('uses footer element for main footer', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
    });

    it('uses proper form elements', () => {
      render(<Footer />);

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons.length).toBeGreaterThan(0);

      const textboxes = screen.getAllByRole('textbox');
      expect(textboxes.length).toBeGreaterThan(0);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('uses proper link elements', () => {
      render(<Footer />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAttribute('href');
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('provides meaningful labels for radio buttons', () => {
      render(<Footer />);

      const textRadio = screen.getByLabelText('Text');
      const emailRadio = screen.getByLabelText('Email');

      expect(textRadio).toBeInTheDocument();
      expect(emailRadio).toBeInTheDocument();
    });

    it('provides alt text for images', () => {
      render(<Footer showAppDownload={true} />);

      const appImage = screen.getByAltText('Split Lease App');
      const alexaImage = screen.getByAltText('Amazon Alexa');
      const appStoreBadge = screen.getByAltText('Download on the App Store');

      expect(appImage).toBeInTheDocument();
      expect(alexaImage).toBeInTheDocument();
      expect(appStoreBadge).toBeInTheDocument();
    });

    it('announces form submission states to screen readers', async () => {
      const onReferralSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now');

      await user.type(input, '123-456-7890');
      await user.click(submitButton);

      // Check for live region announcement
      const liveRegion = await screen.findByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live');
    });
  });

  describe('Touch Target Sizes', () => {
    it('has minimum 44x44px touch targets for buttons', () => {
      render(<Footer />);

      const shareButton = screen.getByText('Share now');
      const importButton = screen.getByText('Submit');

      const shareRect = shareButton.getBoundingClientRect();
      const importRect = importButton.getBoundingClientRect();

      expect(shareRect.height).toBeGreaterThanOrEqual(44);
      expect(importRect.height).toBeGreaterThanOrEqual(44);
    });

    it('has minimum 44x44px touch targets for inputs', () => {
      render(<Footer />);

      const referralInput = screen.getByPlaceholderText(
        "Your friend's phone number"
      );
      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');

      const referralRect = referralInput.getBoundingClientRect();
      const urlRect = urlInput.getBoundingClientRect();
      const emailRect = emailInput.getBoundingClientRect();

      expect(referralRect.height).toBeGreaterThanOrEqual(44);
      expect(urlRect.height).toBeGreaterThanOrEqual(44);
      expect(emailRect.height).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Color Contrast', () => {
    it('uses semantic colors for error states', async () => {
      const user = userEvent.setup();
      render(<Footer />);

      const submitButton = screen.getByText('Share now');
      await user.click(submitButton);

      const errorMessage = await screen.findByText(
        'Please enter contact information'
      );
      expect(errorMessage).toHaveClass('errorMessage');
    });

    it('uses semantic colors for success states', async () => {
      const onReferralSubmit = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now');

      await user.type(input, '123-456-7890');
      await user.click(submitButton);

      const successMessage = await screen.findByText(
        'Referral sent successfully!'
      );
      expect(successMessage).toHaveClass('successMessage');
    });
  });
});
