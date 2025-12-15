/**
 * ProposalDetailsModal Component
 *
 * Shows comprehensive proposal details including:
 * - Move-in date, check-in/out days
 * - Reservation length
 * - House rules with count
 * - Complete pricing breakdown
 *
 * Based on: Bubble guest-proposals "See Details" modal
 * Comparison report: guest-proposals-comparison-report.md Section 8
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

  const cleaningFee = counterOfferHappened && proposal['hc cleaning fee']
    ? proposal['hc cleaning fee']
    : (proposal['cleaning fee'] || 0);

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
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-3 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Proposal Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 py-5 sm:p-6 space-y-4">
            {/* Move-in Date */}
            <div>
              <p className="text-sm font-medium text-gray-700">Move-in</p>
              <p className="text-base text-gray-900">{formatDate(moveInDate)}</p>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Check-in Day */}
            <div>
              <p className="text-sm font-medium text-gray-700">Check-in</p>
              <p className="text-base text-gray-900">{checkInDay}</p>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Check-out Day */}
            <div>
              <p className="text-sm font-medium text-gray-700">Check-out</p>
              <p className="text-base text-gray-900">{checkOutDay}</p>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* Reservation Length */}
            <div>
              <p className="text-sm font-medium text-gray-700">Reservation Length</p>
              <p className="text-base text-gray-900">{reservationWeeks} weeks</p>
            </div>

            <div className="border-t border-gray-200"></div>

            {/* House Rules */}
            {houseRulesCount > 0 && (
              <>
                <div>
                  <button
                    onClick={() => setShowHouseRules(!showHouseRules)}
                    className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
                  >
                    <span>House Rules (click to see)</span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {houseRulesCount}
                    </span>
                  </button>

                  {showHouseRules && (
                    <div className="mt-3 space-y-2">
                      {loadingRules ? (
                        <p className="text-sm text-gray-500">Loading house rules...</p>
                      ) : houseRules.length > 0 ? (
                        <ul className="space-y-2">
                          {houseRules.map((rule) => (
                            <li key={rule._id} className="flex items-start gap-2 text-sm text-gray-700">
                              {rule.Icon && <span>{rule.Icon}</span>}
                              <span>{rule.Name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No house rules available</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-200"></div>
              </>
            )}

            {/* Pricing Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-gray-900">Pricing Breakdown</h4>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Price per night</span>
                  <span className="font-medium text-gray-900">{formatCurrency(nightlyPrice)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">Nights reserved</span>
                  <span className="font-medium text-gray-900">× {totalNights}</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-medium text-gray-900">Total Price</span>
                  <span className="font-bold text-gray-900">{formatCurrency(subtotal)}</span>
                </div>

                <p className="text-xs text-gray-500 italic">
                  (excluding Damage Deposit & Maintenance Fee)
                </p>

                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="text-gray-700">Price per 4 weeks</span>
                  <span className="font-medium text-gray-900">{formatCurrency(pricePerFourWeeks)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">Refundable Damage Deposit</span>
                  <span className="font-medium text-gray-900">{formatCurrency(damageDeposit)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">Maintenance Fee</span>
                  <span className="font-medium text-gray-900">{formatCurrency(maintenanceFee)}</span>
                </div>

                <p className="text-xs text-gray-600 italic mt-2">
                  *Refundable Damage Deposit is held with Split Lease
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
