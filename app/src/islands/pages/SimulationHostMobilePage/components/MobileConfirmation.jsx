/**
 * Mobile Confirmation Component
 * Checkbox to confirm testing on mobile + Start button
 */

export default function MobileConfirmation({
  confirmed,
  onChange,
  onStart,
  isLoading,
  disabled
}) {
  return (
    <div className="simulation-host-mobile-confirm">
      <h3 className="simulation-host-mobile-confirm__title">Ready to Start?</h3>

      <label className="simulation-host-mobile-confirm__checkbox">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onChange(e.target.checked)}
          disabled={isLoading}
        />
        <span>I confirm I am testing on a mobile device</span>
      </label>

      <button
        className="simulation-host-start-button"
        onClick={onStart}
        disabled={!confirmed || isLoading || disabled}
      >
        {isLoading ? (
          <>
            <span className="simulation-host-spinner"></span>
            Starting...
          </>
        ) : (
          '🚀 Start Simulation'
        )}
      </button>

      {disabled && !isLoading && (
        <p className="simulation-host-mobile-confirm__hint">
          Please select a listing above first
        </p>
      )}
    </div>
  );
}
