/**
 * LoadingState - Loading spinner with message
 */

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="admin-threads__loading">
      <div className="admin-threads__loading-spinner" />
      <p className="admin-threads__loading-message">{message}</p>
    </div>
  );
}
