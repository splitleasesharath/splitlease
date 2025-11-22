import { useState, useRef, useEffect } from 'react';

/**
 * useHeaderDropdownLogic - Orchestration hook for header dropdown interactions
 *
 * Manages dropdown state, keyboard navigation, click-outside detection,
 * and logout handling following the Logic Core orchestration pattern.
 *
 * @intent Centralize all dropdown interaction logic outside the presentation layer
 * @rule Dropdown closes on click-outside, Escape key, or menu item selection
 * @rule Keyboard accessible (Enter/Space to toggle, Escape to close)
 * @rule NO FALLBACK: onLogout callback must be provided
 *
 * @param {object} params - Named parameters
 * @param {Function} params.onLogout - Async callback function for logout
 * @returns {object} State and handlers for dropdown component
 * @returns {boolean} returns.isOpen - Whether dropdown is currently open
 * @returns {object} returns.dropdownRef - Ref for click-outside detection
 * @returns {Function} returns.toggleDropdown - Toggle dropdown open/close
 * @returns {Function} returns.closeDropdown - Close dropdown explicitly
 * @returns {Function} returns.handleKeyDown - Keyboard event handler
 * @returns {Function} returns.handleLogoutClick - Logout click handler
 *
 * @example
 * const {
 *   isOpen,
 *   dropdownRef,
 *   toggleDropdown,
 *   handleKeyDown,
 *   handleLogoutClick
 * } = useHeaderDropdownLogic({ onLogout: async () => { ... } });
 */
export function useHeaderDropdownLogic({ onLogout }) {
  // NO FALLBACK: onLogout is required
  if (typeof onLogout !== 'function') {
    throw new Error('useHeaderDropdownLogic requires onLogout to be a function');
  }

  // State for controlling dropdown visibility
  const [isOpen, setIsOpen] = useState(false);

  // Ref for click-outside detection
  const dropdownRef = useRef(null);

  /**
   * Toggle dropdown open/close state
   */
  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  /**
   * Close dropdown explicitly
   */
  const closeDropdown = () => {
    setIsOpen(false);
  };

  /**
   * Handle keyboard navigation
   * @intent Provide keyboard accessibility for dropdown
   * @rule Enter/Space: Toggle dropdown
   * @rule Escape: Close dropdown
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  };

  /**
   * Handle logout click
   * @intent Prevent default link behavior and execute logout callback
   * @rule Closes dropdown after logout is initiated
   */
  const handleLogoutClick = async (e) => {
    e.preventDefault();
    closeDropdown(); // Close dropdown immediately
    await onLogout(); // Execute logout callback
  };

  /**
   * Close dropdown when clicking outside the component
   * @intent Improve UX by closing dropdown on outside clicks
   * @rule Uses .closest() to check if click is inside component
   * @rule Only active when dropdown is open (performance optimization)
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Use closest() to check if click is inside this component
      // Note: Component must have 'logged-in-header-avatar-2' class
      if (!e.target.closest('.logged-in-header-avatar-2')) {
        closeDropdown();
      }
    };

    // Attach listener when dropdown is open
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    // Cleanup listener on unmount or when dropdown closes
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  // Return state and handlers for component
  return {
    isOpen,
    dropdownRef,
    toggleDropdown,
    closeDropdown,
    handleKeyDown,
    handleLogoutClick,
  };
}
