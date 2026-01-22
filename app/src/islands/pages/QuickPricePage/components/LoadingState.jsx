/**
 * LoadingState - Loading indicator for Quick Price page
 */

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="quick-price__state quick-price__state--loading">
      <div className="quick-price__spinner" />
      <p className="quick-price__state-message">{message}</p>
    </div>
  );
}
