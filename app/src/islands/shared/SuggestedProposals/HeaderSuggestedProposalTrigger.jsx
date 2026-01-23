/**
 * HeaderSuggestedProposalTrigger
 *
 * Inline trigger for the header navigation bar.
 * Displays a compact animated Lottie button with count badge.
 * Designed to fit seamlessly in the header's nav-right section.
 */

import { useEffect, useRef } from 'react';
import './HeaderSuggestedProposalTrigger.css';

/**
 * @param {Object} props
 * @param {function} props.onClick - Handler when trigger is clicked
 * @param {boolean} props.isActive - Whether popup is currently open
 * @param {number} props.proposalCount - Number of available suggestions
 * @param {string} [props.className] - Additional CSS classes
 */
export default function HeaderSuggestedProposalTrigger({
  onClick,
  isActive = false,
  proposalCount = 0,
  className = ''
}) {
  const lottieRef = useRef(null);

  // Load Lottie player script
  useEffect(() => {
    if (document.querySelector('script[src*="lottie-player"]')) return;

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Play animation once when component mounts (shows up)
  useEffect(() => {
    if (proposalCount === 0) return;

    // Wait for lottie-player to be ready
    const checkAndPlay = () => {
      const player = lottieRef.current;
      if (player && player.play) {
        player.seek(0);
        player.play();
      }
    };

    // Small delay to ensure lottie-player is initialized
    const timer = setTimeout(checkAndPlay, 100);
    return () => clearTimeout(timer);
  }, [proposalCount]);

  const handleMouseEnter = () => {
    const player = lottieRef.current;
    if (player && player.play) {
      player.seek(0);
      player.play();
    }
  };

  // Don't render if no proposals
  if (proposalCount === 0) return null;

  return (
    <button
      className={`header-sp-trigger ${isActive ? 'header-sp-trigger--active' : ''} ${className}`.trim()}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      aria-label={`View ${proposalCount} suggested proposal${proposalCount !== 1 ? 's' : ''}`}
      type="button"
      title="You have suggested listings waiting for your review"
    >
      {/* Animated Lottie icon */}
      <span className="header-sp-trigger__icon" aria-hidden="true">
        <lottie-player
          ref={lottieRef}
          src="/assets/lotties/proposals-suggested.json"
          background="transparent"
          speed="0.4"
          style={{ width: '88px', height: '88px' }}
        ></lottie-player>
      </span>

      {/* Count badge */}
      <span className="header-sp-trigger__badge" aria-hidden="true">
        {proposalCount > 9 ? '9+' : proposalCount}
      </span>
    </button>
  );
}
