import { useState } from 'react';

// Icon components (inline SVGs to avoid external dependency)
const ArrowLeftIcon = () => (
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
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
);

const EyeIcon = () => (
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
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
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
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" x2="8" y1="13" y2="13" />
    <line x1="16" x2="8" y1="17" y2="17" />
    <line x1="10" x2="8" y1="9" y2="9" />
  </svg>
);

const CalendarIcon = () => (
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
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const FileCheckIcon = () => (
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
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);

export default function NavigationHeader({ activeTab, onTabChange, counts, onBackClick }) {
  const tabs = [
    {
      id: 'preview',
      label: 'Preview Listing',
      icon: <EyeIcon />,
    },
    {
      id: 'manage',
      label: 'Manage Listing',
      icon: <FileTextIcon />,
    },
    {
      id: 'proposals',
      label: 'Proposals',
      icon: <FileTextIcon />,
      badge: counts.proposals,
    },
    {
      id: 'virtual-meetings',
      label: 'Virtual Meetings',
      icon: <CalendarIcon />,
      badge: counts.virtualMeetings,
    },
    {
      id: 'leases',
      label: 'Leases',
      icon: <FileCheckIcon />,
      badge: counts.leases,
    },
  ];

  return (
    <div className="listing-dashboard-nav">
      {/* Back Button */}
      <div className="listing-dashboard-nav__back">
        <button
          className="listing-dashboard-nav__back-btn"
          onClick={onBackClick}
        >
          <ArrowLeftIcon />
          <span>All Listings</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="listing-dashboard-nav__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`listing-dashboard-nav__tab ${
              activeTab === tab.id ? 'listing-dashboard-nav__tab--active' : ''
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>

            {/* Notification Badge */}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="listing-dashboard-nav__badge">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
