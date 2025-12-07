import { useState, useRef, useEffect } from 'react';

// Icon components (inline SVGs)
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

const ChevronDownIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const SECTIONS = [
  { id: 'property-info', label: 'Property Info' },
  { id: 'description', label: 'Description' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'details', label: 'Details' },
  { id: 'pricing', label: 'Pricing & Lease Style' },
  { id: 'rules', label: 'Rules' },
  { id: 'availability', label: 'Availability' },
  { id: 'photos', label: 'Photos' },
  { id: 'cancellation-policy', label: 'Cancellation Policy' },
];

export default function SecondaryActions({ onAIAssistant }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleAIAssistant = () => {
    onAIAssistant?.();
  };

  const handleSectionSelect = (sectionId) => {
    setIsDropdownOpen(false);
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {
      sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="listing-dashboard-secondary">
      {/* AI Import Assistant Button */}
      <button
        onClick={handleAIAssistant}
        className="listing-dashboard-secondary__ai-btn"
      >
        <SparklesIcon />
        <span>AI Import Assistant</span>
      </button>

      {/* Choose Section Dropdown */}
      <div className="listing-dashboard-secondary__dropdown" ref={dropdownRef}>
        <button
          className="listing-dashboard-secondary__dropdown-btn"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span>Choose a Section</span>
          <ChevronDownIcon />
        </button>
        {isDropdownOpen && (
          <div className="listing-dashboard-secondary__dropdown-menu">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                className="listing-dashboard-secondary__dropdown-item"
                onClick={() => handleSectionSelect(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
