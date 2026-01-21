/**
 * LoadingState - Full page loading indicator
 */

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="manage-vm__loading-state">
      <div className="manage-vm__loading-spinner" />
      <p className="manage-vm__loading-message">{message}</p>
    </div>
  );
}
