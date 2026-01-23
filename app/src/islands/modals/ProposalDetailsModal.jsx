/**
 * ProposalDetailsModal Component
 *
 * Shows comprehensive proposal details including:
 * - Move-in date, check-in/out days
 * - Reservation length
 * - House rules with count
 * - Complete pricing breakdown
 *
 * V5 Balanced Design - Uses CSS classes from guest-proposals.css
 * Based on: Bubble guest-proposals "See Details" modal
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function ProposalDetailsModal({ proposal, listing, onClose }) {
  const [houseRules, setHouseRules] = useState([]);
  const [showHouseRules, setShowHouseRules] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);

  // Load house rules when modal opens
  useEffect(() => {
    if (proposal?.['House Rules'] && Array.isArray(proposal['House Rules']) && proposal['House Rules'].length > 0) {
      loadHouseRules();
    }
  }, [proposal]);

  async function loadHouseRules() {
    if (!proposal?.['House Rules']) return;

    setLoadingRules(true);
    try {
      const { data, error } = await supabase
        .schema('reference_table')
        .from('zat_features_houserule')
        .select('_id, Name, Icon')
        .in('_id', proposal['House Rules']);

      if (error) throw error;
      setHouseRules(data || []);
    } catch (err) {
      console.error('Error loading house rules:', err);
    } finally {
      setLoadingRules(false);
    }
  }

  if (!proposal || !listing) return null;

  // Determine if counteroffer happened
  const counterOfferHappened = proposal['counter offer happened'];

  // Get display values (use hc fields if counteroffer, otherwise original)
  const moveInDate = counterOfferHappened && proposal['hc move in date']
    ? new Date(proposal['hc move in date'])
    : new Date(proposal['Move in range start']);

  const checkInDay = counterOfferHappened && proposal['hc check in day']
    ? proposal['hc check in day']
    : proposal['check in day'];

  const checkOutDay = counterOfferHappened && proposal['hc check out day']
    ? proposal['hc check out day']
    : proposal['check out day'];

  const reservationWeeks = counterOfferHappened && proposal['hc reservation span (weeks)']
    ? proposal['hc reservation span (weeks)']
    : proposal['Reservation Span (Weeks)'];

  const nightlyPrice = counterOfferHappened && proposal['hc nightly price']
    ? proposal['hc nightly price']
    : proposal['proposal nightly price'];

  const nightsPerWeek = counterOfferHappened && proposal['hc nights per week']
    ? proposal['hc nights per week']
    : proposal['nights per week (num)'];

  const totalNights = reservationWeeks * nightsPerWeek;
  const subtotal = totalNights * nightlyPrice;

  const damageDeposit = counterOfferHappened && proposal['hc damage deposit']
    ? proposal['hc damage deposit']
    : (proposal['damage deposit'] || 0);

  const maintenanceFee = 0; // Appears to be 0 in most cases

  const pricePerFourWeeks = nightlyPrice * nightsPerWeek * 4;

  // Format currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  }

  // Format date
  function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  const houseRulesCount = proposal['House Rules']?.length || 0;

  return (
    <div className="proposal-details-overlay" onClick={onClose}>
      <div className="proposal-details-container">
        <div
          className="proposal-details-modal"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="proposal-details-header">
            <h3 className="proposal-details-title">Proposal Details</h3>
            <button onClick={onClose} className="proposal-details-close">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="proposal-details-content">
            {/* Move-in Date */}
            <div className="proposal-details-row">
              <p className="proposal-details-label">Move-in</p>
              <p className="proposal-details-value">{formatDate(moveInDate)}</p>
            </div>

            {/* Check-in Day */}
            <div className="proposal-details-row">
              <p className="proposal-details-label">Check-in</p>
              <p className="proposal-details-value">{checkInDay}</p>
            </div>

            {/* Check-out Day */}
            <div className="proposal-details-row">
              <p className="proposal-details-label">Check-out</p>
              <p className="proposal-details-value">{checkOutDay}</p>
            </div>

            {/* Reservation Length */}
            <div className="proposal-details-row">
              <p className="proposal-details-label">Reservation Length</p>
              <p className="proposal-details-value">{reservationWeeks} weeks</p>
            </div>

            {/* House Rules */}
            {houseRulesCount > 0 && (
              <div className="proposal-details-row">
                <button
                  onClick={() => setShowHouseRules(!showHouseRules)}
                  className="proposal-details-rules-toggle"
                >
                  <span>House Rules (click to see)</span>
                  <span className="proposal-details-rules-count">
                    {houseRulesCount}
                  </span>
                </button>

                {showHouseRules && (
                  <ul className="proposal-details-rules-list">
                    {loadingRules ? (
                      <li className="proposal-details-loading">Loading house rules...</li>
                    ) : houseRules.length > 0 ? (
                      houseRules.map((rule) => (
                        <li key={rule._id} className="proposal-details-rule-item">
                          {rule.Icon && <span className="proposal-details-rule-icon">{rule.Icon}</span>}
                          <span>{rule.Name}</span>
                        </li>
                      ))
                    ) : (
                      <li className="proposal-details-loading">No house rules available</li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {/* Pricing Breakdown */}
            <div className="proposal-details-pricing">
              <h4 className="proposal-details-pricing-title">Pricing Breakdown</h4>

              <div className="proposal-details-pricing-row">
                <span className="proposal-details-pricing-label">Price per night</span>
                <span className="proposal-details-pricing-value">{formatCurrency(nightlyPrice)}</span>
              </div>

              <div className="proposal-details-pricing-row">
                <span className="proposal-details-pricing-label">Nights reserved</span>
                <span className="proposal-details-pricing-value">× {totalNights}</span>
              </div>

              <div className="proposal-details-pricing-divider" />

              <div className="proposal-details-pricing-row proposal-details-pricing-total">
                <span className="proposal-details-pricing-label">Total Price</span>
                <span className="proposal-details-pricing-value">{formatCurrency(subtotal)}</span>
              </div>

              <p className="proposal-details-pricing-note">
                (excluding Damage Deposit & Maintenance Fee)
              </p>

              <div className="proposal-details-pricing-divider" />

              <div className="proposal-details-pricing-row">
                <span className="proposal-details-pricing-label">Price per 4 weeks</span>
                <span className="proposal-details-pricing-value">{formatCurrency(pricePerFourWeeks)}</span>
              </div>

              <div className="proposal-details-pricing-row">
                <span className="proposal-details-pricing-label">Refundable Damage Deposit</span>
                <span className="proposal-details-pricing-value">{formatCurrency(damageDeposit)}</span>
              </div>

              <div className="proposal-details-pricing-row">
                <span className="proposal-details-pricing-label">Maintenance Fee</span>
                <span className="proposal-details-pricing-value">{formatCurrency(maintenanceFee)}</span>
              </div>

              <p className="proposal-details-pricing-note">
                *Refundable Damage Deposit is held with Split Lease
              </p>
            </div>
          </div>

          {/* Footer - Side by side buttons */}
          <div className="proposal-details-footer">
            <button
              type="button"
              onClick={onClose}
              className="proposal-details-footer-btn proposal-details-footer-btn--secondary"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onClose}
              className="proposal-details-footer-btn proposal-details-footer-btn--primary"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
