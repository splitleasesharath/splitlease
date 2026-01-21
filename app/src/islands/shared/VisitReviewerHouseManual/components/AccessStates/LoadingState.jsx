/**
 * LoadingState Component
 *
 * Displays a loading spinner while house manual data is being fetched.
 */
const LoadingState = () => {
  return (
    <div className="vrhm-loading">
      <div className="vrhm-loading__spinner" aria-hidden="true" />
      <p className="vrhm-loading__text">Loading house manual...</p>
    </div>
  );
};

export default LoadingState;
