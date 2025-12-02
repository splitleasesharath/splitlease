// Icon components (inline SVGs)
const LinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const SparklesIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

export default function SecondaryActions({ listingId, onCopyLink, onAIAssistant }) {
  const handleCopyLink = () => {
    const listingUrl = listingId
      ? `${window.location.origin}/view-split-lease?id=${listingId}`
      : window.location.href;

    navigator.clipboard.writeText(listingUrl).then(() => {
      alert('Listing link copied to clipboard!');
      onCopyLink?.();
    });
  };

  const handleAIAssistant = () => {
    onAIAssistant?.();
  };

  return (
    <div className="listing-dashboard-secondary">
      {/* Copy Listing Link */}
      <button
        onClick={handleCopyLink}
        className="listing-dashboard-secondary__link-btn"
      >
        <LinkIcon />
        <span>Copy Listing Link</span>
      </button>

      {/* Center Text */}
      <span className="listing-dashboard-secondary__divider">
        create chatgpt suggestions
      </span>

      {/* AI Import Assistant Button */}
      <button
        onClick={handleAIAssistant}
        className="listing-dashboard-secondary__ai-btn"
      >
        <SparklesIcon />
        <span>AI Import Assistant</span>
      </button>

      {/* Choose Section */}
      <span className="listing-dashboard-secondary__label">CHOOSE A SECTION</span>
    </div>
  );
}
