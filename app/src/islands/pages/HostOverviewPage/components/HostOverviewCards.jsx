/**
 * Host Overview Cards
 *
 * Card components for displaying:
 * - ListingCard: Host's owned/managed listings
 * - ClaimListingCard: Listings available to claim
 * - HouseManualCard: House manual documentation
 * - VirtualMeetingCard: Scheduled virtual meetings
 */

import React from 'react';
import { extractPhotos } from '../../../../lib/supabaseUtils.js';

// Base Card Component
export function Card({ children, className = '', onClick, hover = false }) {
  const classes = [
    'host-card',
    hover && 'host-card--hover',
    onClick && 'host-card--clickable',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}

// Helper function to format currency
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return null;
  const num = parseFloat(amount);
  if (isNaN(num)) return null;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Listing Card - For host's managed listings
// New horizontal design with thumbnail, title, actions, and proposals badge
export function ListingCard({ listing, onEdit, onPreview, onDelete, onProposals, onCardClick, onCreateHouseManual, isMobile = false }) {
  const listingName = listing.name || listing.Name || 'Unnamed Listing';
  const borough = listing.location?.borough || listing['Location - Borough'] || 'Location not specified';
  const proposalsCount = listing.proposalsCount || listing['Proposals Count'] || 0;

  // Extract photo URLs from the photos field - only need the cover photo (first image)
  const photosField = listing.photos || listing['Features - Photos'] || [];
  const photoUrls = extractPhotos(photosField, {}, listing.id || listing._id);
  const coverPhoto = photoUrls.length > 0 ? photoUrls[0] : null;

  // Handle card click (navigate to listing dashboard)
  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(listing);
    }
  };

  // Handle proposals button click
  const handleProposalsClick = (e) => {
    e.stopPropagation();
    if (onProposals) {
      onProposals(listing);
    }
  };

  // Handle create house manual click
  const handleCreateHouseManualClick = (e) => {
    e.stopPropagation();
    if (onCreateHouseManual) {
      onCreateHouseManual(listing);
    }
  };

  return (
    <Card className="listing-card listing-card--horizontal" hover onClick={handleCardClick}>
      {/* Row 1: Thumbnail + Title + Delete */}
      <div className="listing-card__header-row">
        {/* Thumbnail */}
        <div className="listing-card__thumbnail">
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt={listingName}
              className="listing-card__thumbnail-image"
            />
          ) : (
            <div className="listing-card__thumbnail-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Title and Location */}
        <div className="listing-card__title-section">
          <h3 className="listing-card__name">{listingName}</h3>
          <p className="listing-card__location">{borough}</p>
        </div>

        {/* Delete Button */}
        <button
          className="listing-card__delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(listing);
          }}
          aria-label="Delete listing"
        >
          {/* Feather trash-2 icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>

      {/* Row 2: Actions */}
      <div className="listing-card__actions-row">
        {/* Left side: Manage and Preview buttons */}
        <div className="listing-card__actions-left">
          <button
            className="btn btn--primary btn--small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(listing);
            }}
          >
            Manage Listing
          </button>
          <button
            className="btn btn--secondary btn--small"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(listing);
            }}
          >
            Preview
          </button>
        </div>

        {/* Right side: Proposals badge and Create House Manual */}
        <div className="listing-card__actions-right">
          <button
            className="listing-card__proposals-btn"
            onClick={handleProposalsClick}
          >
            Proposals
            {proposalsCount > 0 && (
              <span className="listing-card__proposals-count">{proposalsCount}</span>
            )}
          </button>
          {onCreateHouseManual && (
            <button
              className="listing-card__house-manual-link"
              onClick={handleCreateHouseManualClick}
            >
              Create House Manual
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Claim Listing Card - For unclaimed listings
export function ClaimListingCard({ listing, onSeeDetails, onDelete }) {
  const listingName = listing.name || listing.Name || 'Unnamed Listing';
  const borough = listing.location?.borough || listing['Location - Borough'] || 'Location not specified';
  const isComplete = listing.complete || listing.Complete;

  return (
    <Card className="claim-listing-card">
      <div className="claim-listing-card__content">
        <div className="claim-listing-card__info">
          <h3 className="claim-listing-card__name">{listingName}</h3>
          <p className="claim-listing-card__status">
            {isComplete ? 'Complete' : 'Incomplete'}
          </p>
          <p className="claim-listing-card__location">{borough}</p>
        </div>
        <div className="claim-listing-card__actions">
          <button
            className="btn btn--action"
            onClick={() => onSeeDetails(listing)}
          >
            See Details
          </button>
          <button
            className="claim-listing-card__delete"
            onClick={() => onDelete(listing)}
            aria-label="Remove from list"
          >
            {/* Feather trash-2 icon - monochromatic per popup redesign protocol */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
    </Card>
  );
}

// House Manual Card
export function HouseManualCard({ manual, onEdit, onDelete, onViewVisits, isMobile = false }) {
  const manualName = manual.display || manual.Display || 'House Manual';
  const audience = manual.audience || manual.Audience?.Display || 'Not specified';
  const createdDate = manual.createdOn || manual['Created Date'];

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <Card className="house-manual-card" hover>
      <div className="house-manual-card__content">
        <div className="house-manual-card__header">
          <div className="house-manual-card__info">
            <h3 className="house-manual-card__title">{manualName}</h3>
            <p className="house-manual-card__audience">Audience: {audience}</p>
            <p className="house-manual-card__date">Created: {formatDate(createdDate)}</p>
          </div>
          <button
            className="house-manual-card__delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(manual);
            }}
            aria-label="Delete house manual"
          >
            {/* Feather trash-2 icon - monochromatic per popup redesign protocol */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>

        <div className="house-manual-card__actions">
          <button
            className="btn btn--primary"
            onClick={() => onEdit(manual)}
          >
            View/Edit Manual
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => onViewVisits(manual)}
          >
            Visits
          </button>
        </div>
      </div>
    </Card>
  );
}

// Virtual Meeting Card
export function VirtualMeetingCard({ meeting, onRespond }) {
  const guestName = meeting.guest?.firstName || meeting.guestFirstName || 'Guest';
  const listingName = meeting.listing?.name || meeting.listingName || 'Listing';
  const bookedDate = meeting.bookedDate || meeting['booked_date'];
  const notifications = meeting.notifications || [];

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Date not set';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Date not set';
    }
  };

  return (
    <Card className="virtual-meeting-card">
      <div className="virtual-meeting-card__content">
        <div className="virtual-meeting-card__header">
          <h3 className="virtual-meeting-card__guest">{guestName}</h3>
          <p className="virtual-meeting-card__listing">{listingName}</p>
        </div>

        <div className="virtual-meeting-card__info">
          <div className="virtual-meeting-card__status">
            Virtual meeting booked
          </div>
          <div className="virtual-meeting-card__date">
            {formatDateTime(bookedDate)}
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="virtual-meeting-card__notifications">
            {notifications.map((notification, index) => (
              <div key={index} className="virtual-meeting-notification">
                {notification}
              </div>
            ))}
          </div>
        )}

        <button
          className="btn btn--primary"
          onClick={() => onRespond(meeting)}
        >
          Respond to Virtual Meeting
        </button>
      </div>
    </Card>
  );
}
