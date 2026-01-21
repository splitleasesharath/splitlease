/**
 * WarningBanner - "Keep page open" warning message
 *
 * Reminds users not to navigate away during the simulation
 * as it may affect test data.
 */

export default function WarningBanner() {
  return (
    <div className="warning-banner">
      <p className="warning-banner__text">
        <span className="warning-banner__icon">⚠️</span>
        Please keep this page open during the entire test.
        Navigating away may affect your simulation data.
      </p>
    </div>
  );
}
