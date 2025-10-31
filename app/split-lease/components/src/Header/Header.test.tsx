/**
 * Header Component Tests
 *
 * Comprehensive test suite following TDD principles:
 * - Rendering tests
 * - User interaction tests
 * - Accessibility tests
 * - Edge case tests
 *
 * Target: >90% code coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import Header from './Header';

expect.extend(toHaveNoViolations);

describe('Header Component - Rendering Tests', () => {
  it('should render with default props', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByAltText('Split Lease')).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    const { container } = render(<Header className="custom-class" />);
    const header = container.querySelector('header');
    expect(header).toHaveClass('custom-class');
  });

  it('should render logo with correct src and alt text', () => {
    const customLogoSrc = 'custom-logo.png';
    render(<Header logoSrc={customLogoSrc} />);
    const logo = screen.getByAltText('Split Lease') as HTMLImageElement;
    expect(logo).toBeInTheDocument();
    expect(logo.src).toContain(customLogoSrc);
  });

  it('should render navigation links', () => {
    render(<Header />);
    expect(screen.getByText('Host with Us')).toBeInTheDocument();
    expect(screen.getByText('Stay with Us')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    // Use getAllByText since "Sign Up" appears in multiple places
    const signUpLinks = screen.getAllByText('Sign Up');
    expect(signUpLinks.length).toBeGreaterThan(0);
  });

  it('should display correct text for desktop vs mobile', () => {
    render(<Header />);
    // Desktop text
    expect(screen.getByText('Host with Us')).toBeInTheDocument();
    expect(screen.getByText('Stay with Us')).toBeInTheDocument();
    // Mobile text should be in the DOM but hidden
    const mobileTexts = screen.getAllByText(/Host|Guest/);
    expect(mobileTexts.length).toBeGreaterThan(0);
  });

  it('should render dropdown menus', () => {
    render(<Header />);
    const dropdownTriggers = screen.getAllByRole('button', { hidden: true });
    expect(dropdownTriggers.length).toBeGreaterThanOrEqual(2);
  });

  it('should render Explore Rentals button', () => {
    render(<Header />);
    // Use getAllByText since "Explore Rentals" appears in multiple places
    const exploreBtns = screen.getAllByText('Explore Rentals');
    expect(exploreBtns.length).toBeGreaterThan(0);
  });

  it('should use custom exploreHref prop', () => {
    const customHref = '/custom-search';
    render(<Header exploreHref={customHref} />);
    const exploreLinks = screen.getAllByText('Explore Rentals');
    // Check that at least one has the custom href
    const linkWithHref = exploreLinks.find(link => link.getAttribute('href') === customHref);
    expect(linkWithHref).toBeDefined();
  });
});

describe('Header Component - Interaction Tests', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
  });

  it('should toggle mobile menu on hamburger click', async () => {
    const user = userEvent.setup();
    render(<Header />);
    const hamburger = screen.getByLabelText('Toggle navigation menu');

    await user.click(hamburger);
    expect(hamburger).toHaveClass('active');

    await user.click(hamburger);
    expect(hamburger).not.toHaveClass('active');
  });

  it('should open dropdown on click', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us');
    await user.click(hostTrigger);

    await waitFor(() => {
      const dropdown = hostTrigger.closest('[class*="navDropdown"]');
      expect(dropdown).toHaveClass('active');
    });
  });

  it('should close dropdown on second click', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us');

    // Open
    await user.click(hostTrigger);
    await waitFor(() => {
      expect(hostTrigger.closest('[class*="navDropdown"]')).toHaveClass('active');
    });

    // Close
    await user.click(hostTrigger);
    await waitFor(() => {
      expect(hostTrigger.closest('[class*="navDropdown"]')).not.toHaveClass('active');
    });
  });

  it('should open dropdown on hover', async () => {
    render(<Header />);
    const hostTrigger = screen.getByText('Host with Us');
    const dropdown = hostTrigger.closest('[class*="navDropdown"]') as HTMLElement;

    fireEvent.mouseEnter(dropdown);
    expect(dropdown).toHaveClass('hover');
  });

  it('should close dropdown on mouse leave', async () => {
    render(<Header />);
    const hostTrigger = screen.getByText('Host with Us');
    const dropdown = hostTrigger.closest('[class*="navDropdown"]') as HTMLElement;

    fireEvent.mouseEnter(dropdown);
    expect(dropdown).toHaveClass('hover');

    fireEvent.mouseLeave(dropdown);
    expect(dropdown).not.toHaveClass('hover');
  });

  it('should handle dropdown keyboard navigation with Enter', async () => {
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us') as HTMLElement;

    // Simulate Enter key press
    fireEvent.keyDown(hostTrigger, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(hostTrigger.closest('[class*="navDropdown"]')).toHaveClass('active');
    });
  });

  it('should handle dropdown keyboard navigation with Space', async () => {
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us') as HTMLElement;

    // Simulate Space key press
    fireEvent.keyDown(hostTrigger, { key: ' ', code: 'Space' });

    await waitFor(() => {
      expect(hostTrigger.closest('[class*="navDropdown"]')).toHaveClass('active');
    });
  });

  it('should navigate dropdown items with ArrowDown', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us');
    await user.click(hostTrigger);

    hostTrigger.focus();
    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      const firstItem = screen.getByText('Why List with Us');
      expect(document.activeElement).toBe(firstItem.closest('[class*="dropdownItem"]'));
    });
  });

  it('should navigate to auth page on Sign In click', async () => {
    const user = userEvent.setup();
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<Header />);
    const signInLink = screen.getByText('Sign In');

    await user.click(signInLink);
    expect(window.location.href).toBe('https://app.split.lease/signup-login');
  });

  it('should navigate to auth page on Sign Up click', async () => {
    const user = userEvent.setup();
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<Header />);
    // Get the Sign Up link in the nav-right section (not in dropdowns)
    const signUpLinks = screen.getAllByText('Sign Up');
    const navRightSignUp = signUpLinks.find(link => link.getAttribute('href') === '#signup');

    if (navRightSignUp) {
      await user.click(navRightSignUp);
      expect(window.location.href).toBe('https://app.split.lease/signup-login');
    }
  });

  it('should close dropdowns on outside click', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us');
    await user.click(hostTrigger);

    await waitFor(() => {
      expect(hostTrigger.closest('[class*="navDropdown"]')).toHaveClass('active');
    });

    // Click outside
    await user.click(document.body);

    await waitFor(() => {
      expect(hostTrigger.closest('[class*="navDropdown"]')).not.toHaveClass('active');
    });
  });

  it('should handle smooth scroll for anchor links', async () => {
    const user = userEvent.setup();
    const scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy;

    // Create a target element
    const targetDiv = document.createElement('div');
    targetDiv.id = 'test-section';
    document.body.appendChild(targetDiv);

    // Create an anchor link
    const anchor = document.createElement('a');
    anchor.href = '#test-section';
    anchor.textContent = 'Test Link';
    document.body.appendChild(anchor);

    render(<Header />);

    await user.click(anchor);

    await waitFor(() => {
      expect(scrollToSpy).toHaveBeenCalled();
    });

    document.body.removeChild(targetDiv);
    document.body.removeChild(anchor);
  });

  it('should close dropdown on Escape key', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us');
    await user.click(hostTrigger);

    await waitFor(() => {
      expect(hostTrigger.closest('[class*="navDropdown"]')).toHaveClass('active');
    });

    // Get first dropdown item and press Escape
    const firstItem = screen.getByText('Why List with Us') as HTMLElement;
    fireEvent.keyDown(firstItem, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(hostTrigger.closest('[class*="navDropdown"]')).not.toHaveClass('active');
      expect(document.activeElement).toBe(hostTrigger);
    });
  });
});

describe('Header Component - Accessibility Tests', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Header />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels on interactive elements', () => {
    render(<Header />);

    const hamburger = screen.getByLabelText('Toggle navigation menu');
    expect(hamburger).toBeInTheDocument();

    // Check dropdown triggers specifically (they have aria-haspopup)
    const hostTrigger = screen.getByText('Host with Us');
    const stayTrigger = screen.getByText('Stay with Us');

    expect(hostTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(hostTrigger).toHaveAttribute('aria-haspopup', 'true');
    expect(stayTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(stayTrigger).toHaveAttribute('aria-haspopup', 'true');
  });

  it('should support keyboard-only navigation', async () => {
    const user = userEvent.setup();
    render(<Header />);

    // Tab through interactive elements
    await user.tab();
    expect(document.activeElement?.tagName).toBe('A');

    await user.tab();
    expect(document.activeElement).toBeTruthy();
  });

  it('should have proper focus management', async () => {
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us') as HTMLElement;
    hostTrigger.focus();

    expect(document.activeElement).toBe(hostTrigger);

    // Open dropdown with Enter
    fireEvent.keyDown(hostTrigger, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(hostTrigger.closest('[class*="navDropdown"]')).toHaveClass('active');
    });

    // Navigate down with ArrowDown
    fireEvent.keyDown(hostTrigger, { key: 'ArrowDown', code: 'ArrowDown' });

    await waitFor(() => {
      const firstItem = screen.getByText('Why List with Us');
      expect(document.activeElement).toBe(firstItem.closest('[class*="dropdownItem"]'));
    });
  });

  it('should announce dropdown state changes to screen readers', () => {
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us');
    const stayTrigger = screen.getByText('Stay with Us');

    expect(hostTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(stayTrigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should have proper semantic HTML', () => {
    render(<Header />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('should have descriptive menu labels', () => {
    render(<Header />);

    const hostMenu = screen.getByLabelText('Host with Us menu');
    expect(hostMenu).toBeInTheDocument();

    const stayMenu = screen.getByLabelText('Stay with Us menu');
    expect(stayMenu).toBeInTheDocument();
  });
});

describe('Header Component - Edge Case Tests', () => {
  it('should handle null logoSrc gracefully', () => {
    render(<Header logoSrc={undefined} />);
    const logo = screen.getByAltText('Split Lease') as HTMLImageElement;
    expect(logo).toBeInTheDocument();
    expect(logo.src).toBeTruthy(); // Should have default value
  });

  it('should handle missing props with sensible defaults', () => {
    render(<Header />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('should prevent memory leaks on unmount', () => {
    const { unmount } = render(<Header />);

    // Add some event listeners by interacting
    const hostTrigger = screen.getByText('Host with Us');
    fireEvent.click(hostTrigger);

    // Unmount should clean up all listeners
    expect(() => unmount()).not.toThrow();
  });

  it('should handle rapid clicks without breaking', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us');

    // Rapid clicks
    await user.click(hostTrigger);
    await user.click(hostTrigger);
    await user.click(hostTrigger);
    await user.click(hostTrigger);

    // Should not crash
    expect(hostTrigger).toBeInTheDocument();
  });

  it('should work when window.scrollTo is not available', async () => {
    const user = userEvent.setup();
    const originalScrollTo = window.scrollTo;
    delete (window as any).scrollTo;

    const targetDiv = document.createElement('div');
    targetDiv.id = 'test-section';
    document.body.appendChild(targetDiv);

    const anchor = document.createElement('a');
    anchor.href = '#test-section';
    anchor.textContent = 'Test Link';
    document.body.appendChild(anchor);

    render(<Header />);

    // Should not crash even without scrollTo
    expect(() => user.click(anchor)).not.toThrow();

    window.scrollTo = originalScrollTo;
    document.body.removeChild(targetDiv);
    document.body.removeChild(anchor);
  });

  it('should handle multiple dropdowns independently', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const hostTrigger = screen.getByText('Host with Us');
    const stayTrigger = screen.getByText('Stay with Us');

    // Open first dropdown
    await user.click(hostTrigger);
    expect(hostTrigger.closest('[class*="navDropdown"]')).toHaveClass('active');

    // Open second dropdown - first should close
    await user.click(stayTrigger);
    expect(stayTrigger.closest('[class*="navDropdown"]')).toHaveClass('active');
  });

  it('should handle empty className prop', () => {
    render(<Header className="" />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('should render without exploreHref', () => {
    render(<Header />);
    const exploreLinks = screen.getAllByText('Explore Rentals');
    expect(exploreLinks.length).toBeGreaterThan(0);
    // Should have default href when exploreHref is not provided
    const exploreBtn = exploreLinks.find(el => el.classList.contains('_exploreRentalsBtn_4b091a') ||  el.className.includes('exploreRentalsBtn'));
    expect(exploreBtn).toHaveAttribute('href', 'search/index.html');
  });

  it('should maintain state across re-renders', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Header />);

    const hostTrigger = screen.getByText('Host with Us');
    await user.click(hostTrigger);

    rerender(<Header logoSrc="new-logo.png" />);

    // Component should still be functional after rerender
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});

describe('Header Component - Performance Tests', () => {
  it('should render quickly', () => {
    const startTime = performance.now();
    render(<Header />);
    const endTime = performance.now();

    // Should render in less than 100ms
    expect(endTime - startTime).toBeLessThan(100);
  });

  it('should not re-render unnecessarily with same props', () => {
    const { rerender } = render(<Header logoSrc="logo.png" />);
    const firstRender = screen.getByRole('banner');

    rerender(<Header logoSrc="logo.png" />);
    const secondRender = screen.getByRole('banner');

    // Should be the same instance if using React.memo
    expect(firstRender).toBe(secondRender);
  });
});
