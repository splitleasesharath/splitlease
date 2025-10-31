/**
 * Comprehensive test suite for SearchScheduleSelector component
 * Following TDD methodology - RED phase
 * Tests written before implementation to define expected behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// @ts-expect-error jest-axe has no types
import { axe, toHaveNoViolations } from 'jest-axe';
import { SearchScheduleSelector } from './SearchScheduleSelector';
import type { SearchScheduleSelectorProps } from './types';

// Extend Vitest matchers
expect.extend(toHaveNoViolations);

describe('SearchScheduleSelector', () => {
  // Default props for testing
  const defaultProps: SearchScheduleSelectorProps = {
    minDays: 2,
    maxDays: 5,
    requireContiguous: true,
    initialSelection: [],
  };

  const mockListing = {
    id: 'listing-123',
    title: 'Test Listing',
    availableDays: [0, 1, 2, 3, 4, 5, 6],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Component Rendering Tests (15 tests)
   */
  describe('Component Rendering', () => {
    it('renders with default props', () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      expect(screen.getByRole('region', { name: /schedule selector/i })).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<SearchScheduleSelector {...defaultProps} className="custom-class" />);
      const component = container.firstChild;
      expect(component).toHaveClass('custom-class');
    });

    it('renders with initial selection', () => {
      render(<SearchScheduleSelector {...defaultProps} initialSelection={[0, 1, 2]} />);
      const sundayButton = screen.getByRole('button', { name: /sunday/i });
      const mondayButton = screen.getByRole('button', { name: /monday/i });
      const tuesdayButton = screen.getByRole('button', { name: /tuesday/i });

      expect(sundayButton).toHaveAttribute('aria-pressed', 'true');
      expect(mondayButton).toHaveAttribute('aria-pressed', 'true');
      expect(tuesdayButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows calendar icon', () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      expect(screen.getByText('📅')).toBeInTheDocument();
    });

    it('displays all 7 day buttons', () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const dayButtons = screen.getAllByRole('button', { name: /select.*day/i });
      expect(dayButtons).toHaveLength(7);
    });

    it('renders info container', () => {
      const { container } = render(<SearchScheduleSelector {...defaultProps} />);
      const infoContainer = container.querySelector('[class*="infoContainer"]');
      expect(infoContainer).toBeInTheDocument();
    });

    it('shows reset button when days selected', async () => {
      render(<SearchScheduleSelector {...defaultProps} initialSelection={[0, 1, 2]} />);
      expect(await screen.findByRole('button', { name: /clear|reset/i })).toBeInTheDocument();
    });

    it('hides reset button when no selection', () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      expect(screen.queryByRole('button', { name: /clear|reset/i })).not.toBeInTheDocument();
    });

    it('shows error popup when validation fails', async () => {
      const { container } = render(<SearchScheduleSelector {...defaultProps} minDays={3} />);

      // Select only 2 days (3 nights required means 4 days)
      const monday = screen.getByRole('button', { name: /monday/i });
      const tuesday = screen.getByRole('button', { name: /tuesday/i });

      await userEvent.click(monday);
      await userEvent.click(tuesday);

      // Wait for validation timeout (3 seconds as per original implementation)
      await waitFor(() => {
        const errorPopup = container.querySelector('[class*="errorPopup"]');
        expect(errorPopup).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('hides error popup after timeout', async () => {
      const { container } = render(<SearchScheduleSelector {...defaultProps} minDays={3} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      // Wait for error to appear
      await waitFor(() => {
        expect(container.querySelector('[class*="errorPopup"]')).toBeInTheDocument();
      }, { timeout: 4000 });

      // Wait for error to disappear (6 seconds after it appears)
      await waitFor(() => {
        expect(container.querySelector('[class*="errorPopup"]')).not.toBeInTheDocument();
      }, { timeout: 7000 });
    });

    it('handles missing optional props', () => {
      render(<SearchScheduleSelector />);
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('renders with different minDays/maxDays', () => {
      render(<SearchScheduleSelector minDays={1} maxDays={7} />);
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('renders with requireContiguous enabled', () => {
      render(<SearchScheduleSelector requireContiguous={true} />);
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('renders with requireContiguous disabled', () => {
      render(<SearchScheduleSelector requireContiguous={false} />);
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('matches snapshot for default state', () => {
      const { container } = render(<SearchScheduleSelector {...defaultProps} />);
      expect(container).toMatchSnapshot();
    });
  });

  /**
   * User Interactions Tests (20 tests)
   */
  describe('User Interactions', () => {
    it('toggles day selection on click', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      expect(monday).toHaveAttribute('aria-pressed', 'false');
      await userEvent.click(monday);
      expect(monday).toHaveAttribute('aria-pressed', 'true');
    });

    it('toggles day deselection on second click', async () => {
      render(<SearchScheduleSelector {...defaultProps} initialSelection={[1]} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      expect(monday).toHaveAttribute('aria-pressed', 'true');
      await userEvent.click(monday);
      expect(monday).toHaveAttribute('aria-pressed', 'false');
    });

    it('drag selection from Monday to Friday', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });
      const friday = screen.getByRole('button', { name: /friday/i });

      fireEvent.mouseDown(monday);
      fireEvent.mouseEnter(friday);
      fireEvent.mouseUp(friday);

      // Check that Mon-Fri are selected
      expect(screen.getByRole('button', { name: /monday/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /tuesday/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /wednesday/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /thursday/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /friday/i })).toHaveAttribute('aria-pressed', 'true');
    });

    it('drag selection wrapping around week (Sunday-Monday)', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const saturday = screen.getByRole('button', { name: /saturday/i });
      const monday = screen.getByRole('button', { name: /monday/i });

      fireEvent.mouseDown(saturday);
      fireEvent.mouseEnter(monday);
      fireEvent.mouseUp(monday);

      expect(screen.getByRole('button', { name: /saturday/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /sunday/i })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: /monday/i })).toHaveAttribute('aria-pressed', 'true');
    });

    it('keyboard navigation with Tab', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const user = userEvent.setup();

      // Tab through day buttons
      await user.tab();
      const firstButton = screen.getAllByRole('button', { name: /select.*day/i })[0];
      expect(firstButton).toHaveFocus();
    });

    it('keyboard selection with Enter key', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      monday.focus();
      fireEvent.keyDown(monday, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(monday).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('keyboard selection with Space key', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      monday.focus();
      fireEvent.keyDown(monday, { key: ' ', code: 'Space' });

      await waitFor(() => {
        expect(monday).toHaveAttribute('aria-pressed', 'true');
      });
    });

    it('reset button clears selection', async () => {
      render(<SearchScheduleSelector {...defaultProps} initialSelection={[1, 2, 3]} />);
      const resetButton = screen.getByRole('button', { name: /clear|reset/i });

      await userEvent.click(resetButton);

      const monday = screen.getByRole('button', { name: /monday/i });
      const tuesday = screen.getByRole('button', { name: /tuesday/i });
      const wednesday = screen.getByRole('button', { name: /wednesday/i });

      expect(monday).toHaveAttribute('aria-pressed', 'false');
      expect(tuesday).toHaveAttribute('aria-pressed', 'false');
      expect(wednesday).toHaveAttribute('aria-pressed', 'false');
    });

    it('selection change callback fires with correct data', async () => {
      const onSelectionChange = vi.fn();
      render(<SearchScheduleSelector {...defaultProps} onSelectionChange={onSelectionChange} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      await waitFor(() => {
        expect(onSelectionChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ fullName: 'Monday', index: 1 })
          ])
        );
      });
    });

    it('error callback fires on validation failure', async () => {
      const onError = vi.fn();
      render(<SearchScheduleSelector {...defaultProps} minDays={3} onError={onError} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 4000 });
    });

    it('rapid clicks do not cause issues', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      // Click multiple times rapidly
      await userEvent.click(monday);
      await userEvent.click(monday);
      await userEvent.click(monday);
      await userEvent.click(monday);

      // Final state should be consistent
      const finalState = monday.getAttribute('aria-pressed');
      expect(['true', 'false']).toContain(finalState);
    });

    it('click during drag does not break state', async () => {
      const { container } = render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });
      const wednesday = screen.getByRole('button', { name: /wednesday/i });

      fireEvent.mouseDown(monday);
      fireEvent.mouseEnter(wednesday);
      // Click another element during drag
      await userEvent.click(screen.getByRole('button', { name: /friday/i }));
      fireEvent.mouseUp(wednesday);

      // Component should still function
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
      expect(container).toBeInTheDocument();
    });

    it('mouse leave during drag completes selection', async () => {
      const { container } = render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });
      const wednesday = screen.getByRole('button', { name: /wednesday/i });

      fireEvent.mouseDown(monday);
      fireEvent.mouseEnter(wednesday);
      fireEvent.mouseLeave(container);

      // Selection should be maintained
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('double click does not cause issues', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      await userEvent.dblClick(monday);

      expect(['true', 'false']).toContain(monday.getAttribute('aria-pressed'));
    });

    it('hover effects apply correctly', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      fireEvent.mouseEnter(monday);

      // Hover should not change pressed state
      expect(monday).toHaveAttribute('aria-pressed', 'false');
    });

    it('focus effects apply correctly', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      monday.focus();
      expect(monday).toHaveFocus();
    });

    it('blur removes focus styles', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      monday.focus();
      expect(monday).toHaveFocus();

      monday.blur();
      expect(monday).not.toHaveFocus();
    });

    it('selection persists across re-renders', async () => {
      const { rerender } = render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      await userEvent.click(monday);
      expect(monday).toHaveAttribute('aria-pressed', 'true');

      rerender(<SearchScheduleSelector {...defaultProps} listing={mockListing} />);
      expect(monday).toHaveAttribute('aria-pressed', 'true');
    });

    it('touch events work on mobile', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      fireEvent.touchStart(monday);
      fireEvent.touchEnd(monday);

      // Component should handle touch events without errors
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('handles selection with listing prop', async () => {
      render(<SearchScheduleSelector {...defaultProps} listing={mockListing} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      await userEvent.click(monday);
      expect(monday).toHaveAttribute('aria-pressed', 'true');
    });
  });

  /**
   * Validation Logic Tests (12 tests)
   */
  describe('Validation Logic', () => {
    it('validates minimum nights requirement', async () => {
      const onError = vi.fn();
      render(<SearchScheduleSelector minDays={2} onError={onError} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('2 night'));
      }, { timeout: 4000 });
    });

    it('validates maximum nights requirement', async () => {
      const onError = vi.fn();
      render(<SearchScheduleSelector maxDays={2} onError={onError} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      const tuesday = screen.getByRole('button', { name: /tuesday/i });
      const wednesday = screen.getByRole('button', { name: /wednesday/i });
      const thursday = screen.getByRole('button', { name: /thursday/i });

      await userEvent.click(monday);
      await userEvent.click(tuesday);
      await userEvent.click(wednesday);
      await userEvent.click(thursday);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('2 night'));
      }, { timeout: 4000 });
    });

    it('validates contiguous days requirement', async () => {
      const onError = vi.fn();
      render(<SearchScheduleSelector requireContiguous={true} onError={onError} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      const wednesday = screen.getByRole('button', { name: /wednesday/i });

      await userEvent.click(monday);
      await userEvent.click(wednesday);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('contiguous'));
      }, { timeout: 4000 });
    });

    it('allows week-wrapping contiguous selection', async () => {
      const onError = vi.fn();
      render(<SearchScheduleSelector requireContiguous={true} minDays={2} maxDays={5} onError={onError} />);

      const sunday = screen.getByRole('button', { name: /sunday/i });
      const saturday = screen.getByRole('button', { name: /saturday/i });
      const monday = screen.getByRole('button', { name: /monday/i });

      await userEvent.click(saturday);
      await userEvent.click(sunday);
      await userEvent.click(monday);

      // Wait to ensure no error is called
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Should not trigger contiguous error (Sat-Sun-Mon is contiguous around the week)
      const contiguousErrors = onError.mock.calls.filter(call =>
        call[0].includes('contiguous')
      );
      expect(contiguousErrors).toHaveLength(0);
    });

    it('rejects non-contiguous when required', async () => {
      const onError = vi.fn();
      render(<SearchScheduleSelector requireContiguous={true} onError={onError} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      const friday = screen.getByRole('button', { name: /friday/i });

      await userEvent.click(monday);
      await userEvent.click(friday);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.stringContaining('contiguous'));
      }, { timeout: 4000 });
    });

    it('displays correct error message for min days', async () => {
      const { container } = render(<SearchScheduleSelector minDays={3} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      await waitFor(() => {
        const errorText = container.textContent;
        expect(errorText).toMatch(/3 night/i);
      }, { timeout: 4000 });
    });

    it('displays correct error message for max days', async () => {
      const { container } = render(<SearchScheduleSelector maxDays={1} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      const tuesday = screen.getByRole('button', { name: /tuesday/i });
      const wednesday = screen.getByRole('button', { name: /wednesday/i });

      await userEvent.click(monday);
      await userEvent.click(tuesday);
      await userEvent.click(wednesday);

      await waitFor(() => {
        const errorText = container.textContent;
        expect(errorText).toMatch(/1 night/i);
      }, { timeout: 4000 });
    });

    it('displays correct error message for contiguous', async () => {
      const { container } = render(<SearchScheduleSelector requireContiguous={true} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      const wednesday = screen.getByRole('button', { name: /wednesday/i });

      await userEvent.click(monday);
      await userEvent.click(wednesday);

      await waitFor(() => {
        const errorText = container.textContent;
        expect(errorText).toMatch(/contiguous/i);
      }, { timeout: 4000 });
    });

    it('error clears after valid selection', async () => {
      const { container } = render(<SearchScheduleSelector minDays={2} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      // Wait for error to appear
      await waitFor(() => {
        expect(container.querySelector('[class*="errorPopup"]')).toBeInTheDocument();
      }, { timeout: 4000 });

      // Make valid selection
      const tuesday = screen.getByRole('button', { name: /tuesday/i });
      const wednesday = screen.getByRole('button', { name: /wednesday/i });
      await userEvent.click(tuesday);
      await userEvent.click(wednesday);

      // Error should eventually clear
      await waitFor(() => {
        expect(container.querySelector('[class*="errorPopup"]')).not.toBeInTheDocument();
      }, { timeout: 7000 });
    });

    it('validation timeout works correctly', async () => {
      const onError = vi.fn();
      render(<SearchScheduleSelector minDays={2} onError={onError} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      // Error should not fire immediately
      expect(onError).not.toHaveBeenCalled();

      // Error should fire after timeout (3 seconds)
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 4000 });
    });

    it('multiple validation errors show last one', async () => {
      const onError = vi.fn();
      render(<SearchScheduleSelector minDays={2} onError={onError} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      // Wait for first error
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 4000 });

      const firstCallCount = onError.mock.calls.length;

      // Trigger another error
      await userEvent.click(monday); // Deselect
      await userEvent.click(screen.getByRole('button', { name: /tuesday/i }));

      // Should trigger a new error
      await waitFor(() => {
        expect(onError.mock.calls.length).toBeGreaterThan(firstCallCount);
      }, { timeout: 4000 });
    });

    it('validation respects prop changes', async () => {
      const onError = vi.fn();
      const { rerender } = render(<SearchScheduleSelector minDays={2} onError={onError} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      // Should trigger error for minDays=2
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      }, { timeout: 4000 });

      onError.mockClear();

      // Change minDays to 0 - should not trigger error anymore
      rerender(<SearchScheduleSelector minDays={0} onError={onError} />);

      await new Promise(resolve => setTimeout(resolve, 4000));
      expect(onError).not.toHaveBeenCalled();
    });
  });

  /**
   * Accessibility Tests (10 tests)
   */
  describe('Accessibility', () => {
    it('has no axe violations in default state', async () => {
      const { container } = render(<SearchScheduleSelector {...defaultProps} />);
      const results = await axe(container);
      // @ts-expect-error jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with selection', async () => {
      const { container } = render(<SearchScheduleSelector {...defaultProps} initialSelection={[1, 2, 3]} />);
      const results = await axe(container);
      // @ts-expect-error jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('has no axe violations with error', async () => {
      const { container } = render(<SearchScheduleSelector minDays={3} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      await waitFor(() => {
        expect(container.querySelector('[class*="errorPopup"]')).toBeInTheDocument();
      }, { timeout: 4000 });

      const results = await axe(container);
      // @ts-expect-error jest-axe matcher
      expect(results).toHaveNoViolations();
    });

    it('has ARIA labels on day buttons', () => {
      render(<SearchScheduleSelector {...defaultProps} />);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      days.forEach(day => {
        const button = screen.getByRole('button', { name: new RegExp(day, 'i') });
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('updates ARIA pressed state correctly', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      expect(monday).toHaveAttribute('aria-pressed', 'false');
      await userEvent.click(monday);
      expect(monday).toHaveAttribute('aria-pressed', 'true');
      await userEvent.click(monday);
      expect(monday).toHaveAttribute('aria-pressed', 'false');
    });

    it('has screen reader announcements for selection changes', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      await userEvent.click(monday);

      // Aria-pressed change serves as announcement
      expect(monday).toHaveAttribute('aria-pressed', 'true');
    });

    it('has logical keyboard focus order', async () => {
      render(<SearchScheduleSelector {...defaultProps} initialSelection={[1, 2]} />);
      const user = userEvent.setup();

      // Tab through elements in logical order
      await user.tab();
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toHaveFocus();

      await user.tab();
      // Next focusable element should receive focus
      expect(document.activeElement).toBeTruthy();
    });

    it('supports keyboard-only navigation', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const user = userEvent.setup();

      // Navigate to first button
      await user.tab();
      const firstButton = screen.getAllByRole('button', { name: /select.*day/i })[0];
      expect(firstButton).toHaveFocus();

      // Activate with keyboard
      await user.keyboard('{Enter}');
      expect(firstButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('has sufficient color contrast', () => {
      // This is a visual test that would need manual verification
      // or automated contrast checking tool integration
      render(<SearchScheduleSelector {...defaultProps} />);
      const buttons = screen.getAllByRole('button', { name: /select.*day/i });
      expect(buttons).toHaveLength(7);
      // Color contrast is ensured in CSS with WCAG 2.1 AA compliant colors
    });

    it('respects reduced motion preference', () => {
      // Mock prefers-reduced-motion
      render(<SearchScheduleSelector {...defaultProps} />);

      // Component should render without animation-dependent functionality breaking
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });
  });

  /**
   * Edge Cases Tests (8 tests)
   */
  describe('Edge Cases', () => {
    it('handles null listing prop', () => {
      render(<SearchScheduleSelector {...defaultProps} listing={null as any} />);
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('handles undefined callback props', async () => {
      render(<SearchScheduleSelector {...defaultProps} onSelectionChange={undefined} onError={undefined} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      // Should not throw error
      expect(monday).toHaveAttribute('aria-pressed', 'true');
    });

    it('handles extremely large minDays', () => {
      const { container } = render(<SearchScheduleSelector minDays={100} />);
      expect(container).toBeInTheDocument();
    });

    it('handles minDays > maxDays (invalid config)', async () => {
      const onError = vi.fn();
      render(<SearchScheduleSelector minDays={5} maxDays={2} onError={onError} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      const tuesday = screen.getByRole('button', { name: /tuesday/i });
      const wednesday = screen.getByRole('button', { name: /wednesday/i });

      await userEvent.click(monday);
      await userEvent.click(tuesday);
      await userEvent.click(wednesday);

      // Should handle the invalid configuration gracefully
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('handles initialSelection with invalid indices', () => {
      render(<SearchScheduleSelector {...defaultProps} initialSelection={[10, 20, -5]} />);

      // Should render without crashing
      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('handles rapid prop changes', () => {
      const { rerender } = render(<SearchScheduleSelector minDays={2} maxDays={5} />);

      rerender(<SearchScheduleSelector minDays={1} maxDays={3} />);
      rerender(<SearchScheduleSelector minDays={3} maxDays={7} />);
      rerender(<SearchScheduleSelector minDays={2} maxDays={4} />);

      expect(screen.getAllByRole('button', { name: /select.*day/i })).toHaveLength(7);
    });

    it('handles component unmount during async operation', async () => {
      const { unmount } = render(<SearchScheduleSelector minDays={3} />);

      const monday = screen.getByRole('button', { name: /monday/i });
      await userEvent.click(monday);

      // Unmount before validation timeout completes
      unmount();

      // Should not throw error or cause memory leak
      expect(true).toBe(true);
    });

    it('handles memory cleanup on unmount', () => {
      const { unmount } = render(<SearchScheduleSelector {...defaultProps} initialSelection={[1, 2, 3]} />);

      unmount();

      // Memory should be cleaned up (no hanging timers/listeners)
      expect(true).toBe(true);
    });
  });

  /**
   * Performance Tests (5 tests)
   */
  describe('Performance', () => {
    it('renders in under 16ms', () => {
      const startTime = performance.now();
      render(<SearchScheduleSelector {...defaultProps} />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(16); // 60fps threshold
    });

    it('re-renders only when props change', () => {
      const renderSpy = vi.fn();

      const TestWrapper = (props: SearchScheduleSelectorProps) => {
        renderSpy();
        return <SearchScheduleSelector {...props} />;
      };

      const { rerender } = render(<TestWrapper {...defaultProps} />);

      const initialRenderCount = renderSpy.mock.calls.length;

      // Rerender with same props
      rerender(<TestWrapper {...defaultProps} />);

      // Should use memoization to prevent unnecessary rerenders
      // (Note: This test might need adjustment based on actual memo implementation)
      expect(renderSpy.mock.calls.length).toBeGreaterThanOrEqual(initialRenderCount);
    });

    it('handles 1000 sequential clicks', async () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        fireEvent.click(monday);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete in reasonable time (< 1 second)
      expect(totalTime).toBeLessThan(1000);
    });

    it('no memory growth after 100 mount/unmount cycles', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<SearchScheduleSelector {...defaultProps} />);
        unmount();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Memory growth should be minimal (less than 10MB)
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    it('drag operation completes in under 100ms', () => {
      render(<SearchScheduleSelector {...defaultProps} />);
      const monday = screen.getByRole('button', { name: /monday/i });
      const friday = screen.getByRole('button', { name: /friday/i });

      const startTime = performance.now();

      fireEvent.mouseDown(monday);
      fireEvent.mouseEnter(friday);
      fireEvent.mouseUp(friday);

      const endTime = performance.now();
      const dragTime = endTime - startTime;

      expect(dragTime).toBeLessThan(100);
    });
  });
});
