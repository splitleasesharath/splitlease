import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Footer } from './Footer';
import type { FooterColumn } from './Footer.types';

describe('Footer Component', () => {
  describe('Rendering Tests', () => {
    it('renders with default props', () => {
      render(<Footer />);
      expect(screen.getByText('For Hosts')).toBeInTheDocument();
      expect(screen.getByText('For Guests')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
    });

    it('renders custom columns when provided', () => {
      const customColumns: FooterColumn[] = [
        {
          title: 'Custom Section',
          links: [{ text: 'Custom Link', url: 'https://example.com' }],
        },
      ];
      render(<Footer columns={customColumns} />);
      expect(screen.getByText('Custom Section')).toBeInTheDocument();
      expect(screen.getByText('Custom Link')).toBeInTheDocument();
    });

    it('renders referral section when showReferral is true', () => {
      render(<Footer showReferral={true} />);
      expect(screen.getByText('Refer a friend')).toBeInTheDocument();
      expect(
        screen.getByText(/You get \$50 and they get \$50/)
      ).toBeInTheDocument();
    });

    it('hides referral section when showReferral is false', () => {
      render(<Footer showReferral={false} />);
      expect(screen.queryByText('Refer a friend')).not.toBeInTheDocument();
    });

    it('renders import section when showImport is true', () => {
      render(<Footer showImport={true} />);
      expect(
        screen.getByText('Import your listing from another site')
      ).toBeInTheDocument();
    });

    it('hides import section when showImport is false', () => {
      render(<Footer showImport={false} />);
      expect(
        screen.queryByText('Import your listing from another site')
      ).not.toBeInTheDocument();
    });

    it('renders app download section when showAppDownload is true', () => {
      render(<Footer showAppDownload={true} />);
      expect(screen.getByAltText('Split Lease App')).toBeInTheDocument();
      expect(screen.getByAltText('Amazon Alexa')).toBeInTheDocument();
    });

    it('hides app download section when showAppDownload is false', () => {
      render(<Footer showAppDownload={false} />);
      expect(screen.queryByAltText('Split Lease App')).not.toBeInTheDocument();
    });

    it('renders custom copyright text', () => {
      render(<Footer copyrightText="© 2024 Custom Copyright" />);
      expect(screen.getByText('© 2024 Custom Copyright')).toBeInTheDocument();
    });

    it('renders custom footer note', () => {
      render(<Footer footerNote="Custom Footer Note" />);
      expect(screen.getByText('Custom Footer Note')).toBeInTheDocument();
    });

    it('renders custom terms URL', () => {
      render(<Footer termsUrl="https://custom-terms.com" />);
      const termsLink = screen.getByText('Terms of Use');
      expect(termsLink.closest('a')).toHaveAttribute(
        'href',
        'https://custom-terms.com'
      );
    });
  });

  describe('Referral Form Interaction Tests', () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
      user = userEvent.setup();
    });

    it('toggles between text and email methods', async () => {
      render(<Footer />);
      const textRadio = screen.getByLabelText('Text');
      const emailRadio = screen.getByLabelText('Email');

      expect(textRadio).toBeChecked();
      expect(emailRadio).not.toBeChecked();

      await user.click(emailRadio);

      expect(emailRadio).toBeChecked();
      expect(textRadio).not.toBeChecked();
    });

    it('updates placeholder when method changes', async () => {
      render(<Footer />);
      const input = screen.getByPlaceholderText("Your friend's phone number");
      const emailRadio = screen.getByLabelText('Email');

      await user.click(emailRadio);

      expect(
        screen.getByPlaceholderText("Your friend's email")
      ).toBeInTheDocument();
    });

    it('updates contact input value', async () => {
      render(<Footer />);
      const input = screen.getByPlaceholderText(
        "Your friend's phone number"
      ) as HTMLInputElement;

      await user.type(input, '1234567890');

      expect(input.value).toBe('1234567890');
    });

    it('calls onReferralSubmit with correct values for text method', async () => {
      const onReferralSubmit = vi.fn();
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now');

      await user.type(input, '123-456-7890');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onReferralSubmit).toHaveBeenCalledWith('text', '123-456-7890');
      });
    });

    it('calls onReferralSubmit with correct values for email method', async () => {
      const onReferralSubmit = vi.fn();
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const emailRadio = screen.getByLabelText('Email');
      await user.click(emailRadio);

      const input = screen.getByPlaceholderText("Your friend's email");
      const submitButton = screen.getByText('Share now');

      await user.type(input, 'friend@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onReferralSubmit).toHaveBeenCalledWith(
          'email',
          'friend@example.com'
        );
      });
    });

    it('shows error for empty contact input', async () => {
      render(<Footer />);
      const submitButton = screen.getByText('Share now');

      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Please enter contact information')
        ).toBeInTheDocument();
      });
    });

    it('shows error for invalid phone number', async () => {
      render(<Footer />);
      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now');

      await user.type(input, 'invalid-phone');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Invalid phone number format')
        ).toBeInTheDocument();
      });
    });

    it('shows error for invalid email', async () => {
      render(<Footer />);
      const emailRadio = screen.getByLabelText('Email');
      await user.click(emailRadio);

      const input = screen.getByPlaceholderText("Your friend's email");
      const submitButton = screen.getByText('Share now');

      await user.type(input, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('shows success message after successful submission', async () => {
      const onReferralSubmit = vi.fn().mockResolvedValue(undefined);
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now');

      await user.type(input, '123-456-7890');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Referral sent successfully!')
        ).toBeInTheDocument();
      });
    });

    it('clears input after successful submission', async () => {
      const onReferralSubmit = vi.fn().mockResolvedValue(undefined);
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const input = screen.getByPlaceholderText(
        "Your friend's phone number"
      ) as HTMLInputElement;
      const submitButton = screen.getByText('Share now');

      await user.type(input, '123-456-7890');
      await user.click(submitButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('disables button during submission', async () => {
      const onReferralSubmit = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now') as HTMLButtonElement;

      await user.type(input, '123-456-7890');
      await user.click(submitButton);

      expect(submitButton.disabled).toBe(true);

      await waitFor(() => {
        expect(submitButton.disabled).toBe(false);
      });
    });
  });

  describe('Import Form Interaction Tests', () => {
    let user: ReturnType<typeof userEvent.setup>;

    beforeEach(() => {
      user = userEvent.setup();
    });

    it('updates URL input value', async () => {
      render(<Footer />);
      const input = screen.getByPlaceholderText(
        'https://your-listing-link'
      ) as HTMLInputElement;

      await user.type(input, 'https://example.com/listing');

      expect(input.value).toBe('https://example.com/listing');
    });

    it('updates email input value', async () => {
      render(<Footer />);
      const input = screen.getByPlaceholderText(
        'janedoe@your_email.com'
      ) as HTMLInputElement;

      await user.type(input, 'test@example.com');

      expect(input.value).toBe('test@example.com');
    });

    it('calls onImportSubmit with correct values', async () => {
      const onImportSubmit = vi.fn();
      render(<Footer onImportSubmit={onImportSubmit} />);

      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');
      const submitButton = screen.getByText('Submit');

      await user.type(urlInput, 'https://example.com/listing');
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onImportSubmit).toHaveBeenCalledWith(
          'https://example.com/listing',
          'test@example.com'
        );
      });
    });

    it('shows error for empty URL', async () => {
      render(<Footer />);
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');
      const submitButton = screen.getByText('Submit');

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('URL is required')).toBeInTheDocument();
      });
    });

    it('shows error for empty email', async () => {
      render(<Footer />);
      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const submitButton = screen.getByText('Submit');

      await user.type(urlInput, 'https://example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('shows error for invalid URL', async () => {
      render(<Footer />);
      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');
      const submitButton = screen.getByText('Submit');

      await user.type(urlInput, 'not-a-url');
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            'Must be a valid URL starting with http:// or https://'
          )
        ).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      render(<Footer />);
      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');
      const submitButton = screen.getByText('Submit');

      await user.type(urlInput, 'https://example.com');
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('shows success message after successful submission', async () => {
      const onImportSubmit = vi.fn().mockResolvedValue(undefined);
      render(<Footer onImportSubmit={onImportSubmit} />);

      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');
      const submitButton = screen.getByText('Submit');

      await user.type(urlInput, 'https://example.com/listing');
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Import request submitted successfully!')
        ).toBeInTheDocument();
      });
    });

    it('clears inputs after successful submission', async () => {
      const onImportSubmit = vi.fn().mockResolvedValue(undefined);
      render(<Footer onImportSubmit={onImportSubmit} />);

      const urlInput = screen.getByPlaceholderText(
        'https://your-listing-link'
      ) as HTMLInputElement;
      const emailInput = screen.getByPlaceholderText(
        'janedoe@your_email.com'
      ) as HTMLInputElement;
      const submitButton = screen.getByText('Submit');

      await user.type(urlInput, 'https://example.com/listing');
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(urlInput.value).toBe('');
        expect(emailInput.value).toBe('');
      });
    });

    it('shows "Importing..." text during submission', async () => {
      const onImportSubmit = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
      render(<Footer onImportSubmit={onImportSubmit} />);

      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');
      const submitButton = screen.getByText('Submit');

      await user.type(urlInput, 'https://example.com/listing');
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Importing...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('Submit')).toBeInTheDocument();
      });
    });

    it('disables button during submission', async () => {
      const onImportSubmit = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
      render(<Footer onImportSubmit={onImportSubmit} />);

      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');
      const submitButton = screen.getByText('Submit') as HTMLButtonElement;

      await user.type(urlInput, 'https://example.com/listing');
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      expect(submitButton.disabled).toBe(true);

      await waitFor(() => {
        expect(submitButton.disabled).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles null columns gracefully', () => {
      render(<Footer columns={undefined} />);
      expect(screen.getByText('For Hosts')).toBeInTheDocument();
    });

    it('handles empty columns array', () => {
      render(<Footer columns={[]} />);
      // Footer still renders referral and import section headings
      expect(screen.getByText('Refer a friend')).toBeInTheDocument();
      expect(screen.getByText('Import your listing from another site')).toBeInTheDocument();
    });

    it('prevents multiple rapid submissions', async () => {
      const onReferralSubmit = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );
      const user = userEvent.setup();
      render(<Footer onReferralSubmit={onReferralSubmit} />);

      const input = screen.getByPlaceholderText("Your friend's phone number");
      const submitButton = screen.getByText('Share now');

      await user.type(input, '123-456-7890');
      await user.click(submitButton);
      await user.click(submitButton); // Second click

      await waitFor(() => {
        expect(onReferralSubmit).toHaveBeenCalledTimes(1);
      });
    });

    it('handles submission error gracefully', async () => {
      const onImportSubmit = vi
        .fn()
        .mockRejectedValue(new Error('Network error'));
      const user = userEvent.setup();
      render(<Footer onImportSubmit={onImportSubmit} />);

      const urlInput = screen.getByPlaceholderText('https://your-listing-link');
      const emailInput = screen.getByPlaceholderText('janedoe@your_email.com');
      const submitButton = screen.getByText('Submit');

      await user.type(urlInput, 'https://example.com/listing');
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Link Navigation Tests', () => {
    it('renders all default column links with correct hrefs', () => {
      render(<Footer />);
      const listPropertyLink = screen.getByText('List Property Now');
      expect(listPropertyLink.closest('a')).toHaveAttribute(
        'href',
        'https://app.split.lease/signup-login'
      );
    });

    it('renders app store links with correct hrefs', () => {
      render(<Footer />);
      const appStoreLink = screen
        .getByAltText('Download on the App Store')
        .closest('a');
      expect(appStoreLink).toHaveAttribute(
        'href',
        'https://apps.apple.com/app/split-lease'
      );
    });
  });
});
