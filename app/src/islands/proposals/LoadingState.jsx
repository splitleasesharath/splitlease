/**
 * LoadingState Component
 * Displays a loading indicator while data is being fetched
 */

export default function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>Loading your proposals...</p>
    </div>
  );
}
