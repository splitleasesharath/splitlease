/**
 * Section Header Component
 *
 * Renders a section header with icon and title for the Guest Proposals V7 layout.
 * Two variants:
 * - "suggested": Purple star icon, "Suggested for You" text
 * - "user": Gray file-text icon, "Your Proposals" text
 */

/**
 * Feather icon SVG components (inline to avoid dependency)
 */
const StarIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const FileTextIcon = () => (
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
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

/**
 * Section Header for proposal groupings
 * @param {Object} props
 * @param {'suggested' | 'user'} props.type - Section type
 * @param {number} [props.count] - Optional count badge
 */
export default function SectionHeader({ type, count }) {
  const isSuggested = type === 'suggested';

  return (
    <div className={`section-header ${isSuggested ? 'section-header--suggested' : 'section-header--user'}`}>
      <div className="section-header__icon">
        {isSuggested ? <StarIcon /> : <FileTextIcon />}
      </div>
      <h2 className="section-header__title">
        {isSuggested ? 'Suggested for You' : 'Your Proposals'}
        {typeof count === 'number' && (
          <span className="section-header__count">({count})</span>
        )}
      </h2>
    </div>
  );
}
