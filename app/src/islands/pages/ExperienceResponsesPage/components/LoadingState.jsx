/**
 * LoadingState - Loading spinner component
 *
 * Props:
 * - message: Optional loading message to display
 */

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="er-loading-state">
      <div className="er-spinner" />
      <p className="er-loading-message">{message}</p>
    </div>
  );
}
