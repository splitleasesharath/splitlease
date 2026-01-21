/**
 * LoadingOverlay - Loading state overlay
 *
 * Shows a full-screen overlay with spinner and message
 * while simulation steps are processing.
 */

export default function LoadingOverlay({ message }) {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay__spinner" />
      {message && (
        <p className="loading-overlay__message">{message}</p>
      )}
    </div>
  );
}
