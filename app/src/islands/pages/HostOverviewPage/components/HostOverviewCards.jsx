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
export function ListingCard({ listing, onEdit, onPreview, onDelete, isMobile = false }) {
  const listingName = listing.name || listing.Name || 'Unnamed Listing';
  const borough = listing.location?.borough || listing['Location - Borough']?.Display || 'Location not specified';
  const isComplete = listing.complete || listing.Complete;
  const leasesCount = listing.leasesCount || listing['Leases Count'] || 0;
  const proposalsCount = listing.proposalsCount || listing['Proposals Count'] || 0;

  // Pricing data
  const rentalType = listing.rental_type || listing['rental type'] || 'Nightly';
  const monthlyRate = listing.monthly_rate || listing['💰Monthly Host Rate'];
  const weeklyRate = listing.weekly_rate || listing['💰Weekly Host Rate'];
  const cleaningFee = listing.cleaning_fee || listing['💰Cleaning Cost / Maintenance Fee'];
  const damageDeposit = listing.damage_deposit || listing['💰Damage Deposit'];
  const nightlyPricing = listing.nightly_pricing;

  // Collect all nightly rates (from both Bubble and listing_trial sources)
  const nightlyRates = [
    listing.nightly_rate_2 || listing['💰Nightly Host Rate for 2 nights'],
    listing.nightly_rate_3 || listing['💰Nightly Host Rate for 3 nights'],
    listing.nightly_rate_4 || listing['💰Nightly Host Rate for 4 nights'],
    listing.nightly_rate_5 || listing.rate_5_nights || listing['💰Nightly Host Rate for 5 nights'],
    listing.nightly_rate_7 || listing['💰Nightly Host Rate for 7 nights']
  ].filter(rate => rate != null && !isNaN(parseFloat(rate)));

  // Calculate min and max nightly rates
  const getMinMaxNightlyRates = () => {
    if (nightlyRates.length === 0) return null;
    const numericRates = nightlyRates.map(r => parseFloat(r));
    return {
      min: Math.min(...numericRates),
      max: Math.max(...numericRates)
    };
  };

  // Get the primary rate based on rental type
  const getPrimaryRate = () => {
    if (rentalType === 'Monthly' && monthlyRate) {
      return { amount: formatCurrency(monthlyRate), period: '/month', label: 'Monthly Rate', isRange: false };
    }
    if (rentalType === 'Weekly' && weeklyRate) {
      return { amount: formatCurrency(weeklyRate), period: '/week', label: 'Weekly Rate', isRange: false };
    }
    // For nightly listings, show min-max range
    const minMax = getMinMaxNightlyRates();
    if (minMax) {
      if (minMax.min === minMax.max) {
        return { amount: formatCurrency(minMax.min), period: '/night', label: 'Nightly Rate', isRange: false };
      }
      return {
        amount: `${formatCurrency(minMax.min)} - ${formatCurrency(minMax.max)}`,
        period: '/night',
        label: 'Nightly Rate Range',
        isRange: true
      };
    }
    // Fallback to nightly_pricing if available
    if (nightlyPricing?.oneNightPrice) {
      return { amount: formatCurrency(nightlyPricing.oneNightPrice), period: '/night', label: 'Nightly Rate', isRange: false };
    }
    return null;
  };

  const primaryRate = getPrimaryRate();

  return (
    <Card className="listing-card" hover>
      <div className="listing-card__content">
        {/* Left side - Info and actions */}
        <div className="listing-card__left">
          <div className="listing-card__header">
            <div className="listing-card__info">
              <h3 className="listing-card__name">{listingName}</h3>
              <p className="listing-card__location">{borough}</p>
              <p className="listing-card__status">
                {isComplete ? 'Complete' : 'Draft'}
              </p>
            </div>
            <button
              className="listing-card__delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(listing);
              }}
              aria-label="Delete listing"
            >
              &#128465;
            </button>
          </div>

          <div className="listing-card__badges">
            {leasesCount > 0 && (
              <div className="badge badge--leases">
                Leases: {leasesCount}
              </div>
            )}
            {proposalsCount > 0 && (
              <div className="badge badge--proposals">
                Proposals: {proposalsCount}
              </div>
            )}
          </div>

          <div className="listing-card__actions">
            <button
              className="btn btn--primary"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(listing);
              }}
            >
              Manage Listing
            </button>
            <button
              className="btn btn--secondary"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(listing);
              }}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Right side - Pricing */}
        <div className="listing-card__right">
          {primaryRate ? (
            <div className="listing-card__pricing">
              <div className="listing-card__pricing-main">
                <span className="listing-card__price">{primaryRate.amount}</span>
                <span className="listing-card__period">{primaryRate.period}</span>
              </div>
              <div className="listing-card__pricing-label">{rentalType} Lease</div>
              <div className="listing-card__pricing-details">
                {cleaningFee > 0 && (
                  <div className="listing-card__pricing-item">
                    <span className="label">Cleaning:</span>
                    <span className="value">{formatCurrency(cleaningFee)}</span>
                  </div>
                )}
                {damageDeposit > 0 && (
                  <div className="listing-card__pricing-item">
                    <span className="label">Deposit:</span>
                    <span className="value">{formatCurrency(damageDeposit)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="listing-card__pricing listing-card__pricing--empty">
              <span className="listing-card__pricing-empty">No pricing set</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Claim Listing Card - For unclaimed listings
export function ClaimListingCard({ listing, onSeeDetails, onDelete }) {
  const listingName = listing.name || listing.Name || 'Unnamed Listing';
  const borough = listing.location?.borough || listing['Location - Borough']?.Display || 'Location not specified';
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
            &#128465;
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
            &#128465;
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
