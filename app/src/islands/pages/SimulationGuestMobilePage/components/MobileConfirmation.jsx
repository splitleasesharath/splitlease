/**
 * MobileConfirmation - Pre-start checkbox
 *
 * Requires user to confirm they are testing on a mobile device
 * before the simulation can begin.
 */

export default function MobileConfirmation({
  checked,
  onChange,
  onStart,
  disabled
}) {
  return (
    <div className="mobile-confirmation">
      <h2 className="mobile-confirmation__title">Guest Simulation Test</h2>

      <p className="mobile-confirmation__description">
        This simulation will walk you through the complete guest experience
        on Split Lease. Please ensure you are using a mobile device for the
        best experience.
      </p>

      <div className="mobile-confirmation__checkbox">
        <input
          type="checkbox"
          id="mobile-confirm"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <label htmlFor="mobile-confirm">
          I confirm I am testing on a mobile device
        </label>
      </div>

      <button
        className="mobile-confirmation__button"
        onClick={onStart}
        disabled={disabled || !checked}
        type="button"
      >
        Start Simulation
      </button>
    </div>
  );
}
