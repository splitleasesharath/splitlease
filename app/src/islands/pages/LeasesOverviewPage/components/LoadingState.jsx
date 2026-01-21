/**
 * LoadingState - Full-page loading indicator
 */

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="loading-state">
      <div className="loading-state__spinner" />
      <p className="loading-state__message">{message}</p>
    </div>
  );
}
