/**
 * EditProposalModal Component - POPUP REPLICATION PROTOCOL Compliant
 *
 * Allows guests to modify proposal terms before host review
 * Based on: Bubble edit proposal workflow
 *
 * Features:
 * - Date range picker
 * - Day selector with visual circles (S M T W T F S)
 * - Real-time price calculation
 * - Form validation with zod
 * - Optimistic UI updates
 * - Only editable in early proposal statuses
 * - Mobile bottom-sheet behavior
 */

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { differenceInWeeks } from 'date-fns';
import { supabase } from '../../lib/supabase.js';
import 'react-datepicker/dist/react-datepicker.css';

// Protocol Color Constants
const COLORS = {
  primaryPurple: '#31135D',
  secondaryPurple: '#6D31C2',
  positivePurple: '#5B5FCF',
  lightPurpleBg: '#F7F2FA',
  emergencyRed: '#DC3545',
  border: '#E7E0EC',
  textPrimary: '#1a202c',
  textSecondary: '#49454F',
  textMuted: '#6b7280',
  white: '#ffffff'
};

// Protocol: Close icon - 32x32, strokeWidth 2.5
const CloseIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function EditProposalModal({ proposal, listing, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [calculatedPrice, setCalculatedPrice] = useState(null);

  // Inject protocol CSS for mobile bottom-sheet
  useEffect(() => {
    const styleId = 'edit-proposal-modal-protocol-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes editProposalSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        @media (max-width: 480px) {
          .edit-proposal-overlay {
            align-items: flex-end !important;
            padding: 0 !important;
          }

          .edit-proposal-container {
            border-radius: 24px 24px 0 0 !important;
            max-width: 100% !important;
            animation: editProposalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }

          .edit-proposal-grab-handle {
            display: block !important;
          }

          .edit-proposal-title {
            font-weight: 400 !important;
          }
        }

        .edit-proposal-btn-primary:hover:not(:disabled) {
          background: ${COLORS.secondaryPurple} !important;
        }

        .edit-proposal-btn-ghost:hover:not(:disabled) {
          background: ${COLORS.lightPurpleBg} !important;
          border-color: ${COLORS.primaryPurple} !important;
          color: ${COLORS.primaryPurple} !important;
        }

        .edit-proposal-close-btn:hover {
          background: ${COLORS.lightPurpleBg} !important;
        }

        .edit-proposal-day-btn:hover:not(.selected) {
          background: ${COLORS.border} !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Parse Days Selected from JSON string
  let parsedDaysSelected = proposal?.['Days Selected'] || [];
  if (typeof parsedDaysSelected === 'string') {
    try {
      parsedDaysSelected = JSON.parse(parsedDaysSelected);
    } catch (e) {
      console.error('Error parsing Days Selected:', e);
      parsedDaysSelected = [];
    }
  }
  if (!Array.isArray(parsedDaysSelected)) {
    parsedDaysSelected = [];
  }

  const [formData, setFormData] = useState({
    moveInStart: proposal?.['Move in range start'] ? new Date(proposal['Move in range start']) : new Date(),
    moveInEnd: proposal?.['Move in range end'] ? new Date(proposal['Move in range end']) : new Date(),
    reservationWeeks: proposal?.['Reservation Span (Weeks)'] || 4,
    daysSelected: parsedDaysSelected,
    nightsPerWeek: proposal?.['nights per week (num)'] || 1,
    checkInDay: proposal?.['check in day'] || 'Sunday',
    checkOutDay: proposal?.['check out day'] || 'Sunday',
  });
  const [errors, setErrors] = useState({});

  // Check if editing is allowed
  const isEditable = ['Awaiting Host Review', 'Under Review', 'Proposal Submitted'].includes(proposal?.Status);

  // Calculate reservation weeks from date range
  useEffect(() => {
    if (formData.moveInStart && formData.moveInEnd) {
      const weeks = differenceInWeeks(formData.moveInEnd, formData.moveInStart);
      if (weeks > 0) {
        setFormData(prev => ({ ...prev, reservationWeeks: weeks }));
      }
    }
  }, [formData.moveInStart, formData.moveInEnd]);

  // Calculate nights per week from selected days
  useEffect(() => {
    if (formData.daysSelected) {
      setFormData(prev => ({ ...prev, nightsPerWeek: formData.daysSelected.length }));
    }
  }, [formData.daysSelected]);

  // Calculate pricing in real-time
  useEffect(() => {
    if (formData.reservationWeeks && formData.nightsPerWeek && listing) {
      const totalNights = formData.reservationWeeks * formData.nightsPerWeek;
      const nightlyRate = listing?.['Nightly Price'] || listing?.['nightly price'] || 0;
      const cleaningFee = listing?.['Cleaning Fee'] || listing?.['cleaning fee'] || 0;
      const damageDeposit = listing?.['Damage Deposit'] || listing?.['damage deposit'] || 0;

      const subtotal = totalNights * nightlyRate;
      const total = subtotal + cleaningFee + damageDeposit;

      setCalculatedPrice({
        totalNights,
        nightlyRate,
        subtotal,
        cleaningFee,
        damageDeposit,
        total,
      });
    }
  }, [formData.reservationWeeks, formData.nightsPerWeek, listing]);

  // Validate form
  function validateForm() {
    const newErrors = {};

    if (!formData.moveInStart) {
      newErrors.moveInStart = 'Move-in start date is required';
    }

    if (!formData.moveInEnd) {
      newErrors.moveInEnd = 'Move-in end date is required';
    }

    if (formData.moveInEnd && formData.moveInStart && formData.moveInEnd <= formData.moveInStart) {
      newErrors.moveInEnd = 'End date must be after start date';
    }

    if (formData.reservationWeeks < 4) {
      newErrors.reservationWeeks = 'Minimum 4 weeks required';
    }

    if (formData.daysSelected.length === 0) {
      newErrors.daysSelected = 'Select at least one day';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Form submission handler
  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Update proposal in database
      const { error } = await supabase
        .from('proposal')
        .update({
          'Move in range start': formData.moveInStart.toISOString(),
          'Move in range end': formData.moveInEnd.toISOString(),
          'Reservation Span (Weeks)': formData.reservationWeeks,
          'Days Selected': formData.daysSelected,
          'nights per week (num)': formData.nightsPerWeek,
          'check in day': formData.checkInDay,
          'check out day': formData.checkOutDay,
          'Total Price for Reservation (guest)': calculatedPrice?.total || 0,
          'proposal nightly price': calculatedPrice?.nightlyRate || 0,
          'cleaning fee': calculatedPrice?.cleaningFee || 0,
          'damage deposit': calculatedPrice?.damageDeposit || 0,
          'Modified Date': new Date().toISOString(),
        })
        .eq('_id', proposal._id);

      if (error) throw error;

      alert('Proposal updated successfully!');
      if (onSuccess) onSuccess();
      onClose();

    } catch (error) {
      console.error('Error updating proposal:', error);
      alert('Failed to update proposal. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Day selection UI
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  function toggleDay(day) {
    const current = formData.daysSelected || [];
    if (current.includes(day)) {
      setFormData(prev => ({
        ...prev,
        daysSelected: current.filter(d => d !== day)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        daysSelected: [...current, day]
      }));
    }
  }

  // Format currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Styles
  const styles = {
    overlay: {
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.white,
      borderRadius: '16px',
      width: '100%',
      maxWidth: '640px',
      maxHeight: '92vh',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      overflow: 'hidden',
    },
    grabHandle: {
      display: 'none',
      width: '36px',
      height: '4px',
      background: COLORS.border,
      borderRadius: '2px',
      margin: '8px auto 0',
      flexShrink: 0,
    },
    header: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      background: COLORS.lightPurpleBg,
      borderBottom: `1px solid ${COLORS.border}`,
    },
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: '18px',
      fontWeight: 600,
      color: COLORS.textPrimary,
      margin: 0,
    },
    subtitle: {
      fontSize: '14px',
      color: COLORS.textSecondary,
      margin: '4px 0 0',
    },
    closeBtn: {
      flexShrink: 0,
      width: '32px',
      height: '32px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      color: COLORS.primaryPurple,
      transition: 'background 0.2s',
    },
    content: {
      flex: 1,
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      padding: '16px',
    },
    formGroup: {
      marginBottom: '16px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 600,
      color: COLORS.primaryPurple,
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      background: COLORS.lightPurpleBg,
      boxSizing: 'border-box',
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      background: COLORS.lightPurpleBg,
      cursor: 'pointer',
    },
    readOnlyField: {
      padding: '10px 12px',
      background: COLORS.lightPurpleBg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      fontSize: '14px',
      color: COLORS.textSecondary,
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '16px',
    },
    daysContainer: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    dayBtn: {
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      fontWeight: 500,
      fontSize: '14px',
      transition: 'all 0.2s',
      cursor: 'pointer',
      border: 'none',
    },
    dayBtnUnselected: {
      background: COLORS.lightPurpleBg,
      color: COLORS.textSecondary,
      border: `1px solid ${COLORS.border}`,
    },
    dayBtnSelected: {
      background: COLORS.primaryPurple,
      color: COLORS.white,
      border: 'none',
    },
    pricingSummary: {
      background: COLORS.lightPurpleBg,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '8px',
      padding: '16px',
      marginTop: '16px',
    },
    pricingTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: COLORS.primaryPurple,
      marginBottom: '12px',
    },
    pricingRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '14px',
      marginBottom: '8px',
    },
    pricingLabel: {
      color: COLORS.textSecondary,
    },
    pricingValue: {
      fontWeight: 500,
      color: COLORS.textPrimary,
    },
    pricingTotal: {
      display: 'flex',
      justifyContent: 'space-between',
      paddingTop: '12px',
      borderTop: `1px solid ${COLORS.border}`,
      marginTop: '8px',
    },
    pricingTotalLabel: {
      fontWeight: 600,
      color: COLORS.textPrimary,
    },
    pricingTotalValue: {
      fontWeight: 700,
      fontSize: '18px',
      color: COLORS.primaryPurple,
    },
    errorBox: {
      background: COLORS.white,
      border: `1px solid ${COLORS.emergencyRed}`,
      borderRadius: '8px',
      padding: '12px 16px',
      marginTop: '16px',
    },
    errorTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: COLORS.emergencyRed,
      marginBottom: '8px',
    },
    errorList: {
      margin: 0,
      padding: '0 0 0 16px',
      fontSize: '13px',
      color: COLORS.emergencyRed,
    },
    inlineError: {
      fontSize: '12px',
      color: COLORS.emergencyRed,
      marginTop: '4px',
    },
    footer: {
      flexShrink: 0,
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      padding: '16px',
      background: COLORS.lightPurpleBg,
      borderTop: `1px solid ${COLORS.border}`,
    },
    btnPrimary: {
      padding: '12px 24px',
      background: COLORS.primaryPurple,
      color: COLORS.white,
      border: 'none',
      borderRadius: '100px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'background 0.2s',
    },
    btnGhost: {
      padding: '12px 24px',
      background: 'transparent',
      color: COLORS.textSecondary,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '100px',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    btnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
  };

  // Not editable state
  if (!isEditable) {
    return (
      <div
        className="edit-proposal-overlay"
        style={styles.overlay}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="edit-proposal-container"
          style={{ ...styles.container, maxWidth: '400px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="edit-proposal-grab-handle" style={styles.grabHandle} aria-hidden="true" />
          <div style={styles.header}>
            <div style={styles.headerContent}>
              <h3 className="edit-proposal-title" style={styles.title}>Cannot Edit Proposal</h3>
            </div>
            <button
              className="edit-proposal-close-btn"
              style={styles.closeBtn}
              onClick={onClose}
              aria-label="Close modal"
            >
              <CloseIcon />
            </button>
          </div>
          <div style={styles.content}>
            <p style={{ color: COLORS.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Proposals can only be edited while awaiting host review.
              Your proposal has progressed past this stage.
            </p>
          </div>
          <div style={styles.footer}>
            <button
              className="edit-proposal-btn-primary"
              style={styles.btnPrimary}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="edit-proposal-overlay"
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-proposal-title"
    >
      <div
        className="edit-proposal-container"
        style={styles.container}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="edit-proposal-grab-handle" style={styles.grabHandle} aria-hidden="true" />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <h3 id="edit-proposal-title" className="edit-proposal-title" style={styles.title}>
              Edit Proposal
            </h3>
            <p style={styles.subtitle}>{listing?.Name}</p>
          </div>
          <button
            className="edit-proposal-close-btn"
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={styles.content}>
            {/* Date Range */}
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Move-in Start Date</label>
                <DatePicker
                  selected={formData.moveInStart}
                  onChange={(date) => setFormData(prev => ({ ...prev, moveInStart: date }))}
                  minDate={new Date()}
                  className="edit-proposal-datepicker"
                  dateFormat="MMM dd, yyyy"
                  wrapperClassName="edit-proposal-datepicker-wrapper"
                  customInput={<input style={styles.input} />}
                />
                {errors.moveInStart && <p style={styles.inlineError}>{errors.moveInStart}</p>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Move-in End Date</label>
                <DatePicker
                  selected={formData.moveInEnd}
                  onChange={(date) => setFormData(prev => ({ ...prev, moveInEnd: date }))}
                  minDate={formData.moveInStart}
                  dateFormat="MMM dd, yyyy"
                  customInput={<input style={styles.input} />}
                />
                {errors.moveInEnd && <p style={styles.inlineError}>{errors.moveInEnd}</p>}
              </div>
            </div>

            {/* Reservation Span */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Reservation Span</label>
              <div style={styles.readOnlyField}>{formData.reservationWeeks} weeks</div>
            </div>

            {/* Days Selected */}
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Days Selected ({formData.daysSelected?.length || 0} nights/week)
              </label>
              <div style={styles.daysContainer}>
                {days.map((day, idx) => {
                  const isSelected = formData.daysSelected?.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`edit-proposal-day-btn ${isSelected ? 'selected' : ''}`}
                      style={{
                        ...styles.dayBtn,
                        ...(isSelected ? styles.dayBtnSelected : styles.dayBtnUnselected),
                      }}
                      title={day}
                    >
                      {dayLetters[idx]}
                    </button>
                  );
                })}
              </div>
              {errors.daysSelected && <p style={{ ...styles.inlineError, textAlign: 'center' }}>{errors.daysSelected}</p>}
            </div>

            {/* Check-in/Check-out Days */}
            <div style={styles.grid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Check-in Day</label>
                <select
                  value={formData.checkInDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkInDay: e.target.value }))}
                  style={styles.select}
                >
                  {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Check-out Day</label>
                <select
                  value={formData.checkOutDay}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkOutDay: e.target.value }))}
                  style={styles.select}
                >
                  {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing Summary */}
            {calculatedPrice && (
              <div style={styles.pricingSummary}>
                <h4 style={styles.pricingTitle}>Updated Pricing</h4>
                <div style={styles.pricingRow}>
                  <span style={styles.pricingLabel}>
                    {formatCurrency(calculatedPrice.nightlyRate)} × {calculatedPrice.totalNights} nights
                  </span>
                  <span style={styles.pricingValue}>{formatCurrency(calculatedPrice.subtotal)}</span>
                </div>
                <div style={styles.pricingRow}>
                  <span style={styles.pricingLabel}>Cleaning Fee</span>
                  <span style={styles.pricingValue}>{formatCurrency(calculatedPrice.cleaningFee)}</span>
                </div>
                <div style={styles.pricingRow}>
                  <span style={styles.pricingLabel}>Damage Deposit</span>
                  <span style={styles.pricingValue}>{formatCurrency(calculatedPrice.damageDeposit)}</span>
                </div>
                <div style={styles.pricingTotal}>
                  <span style={styles.pricingTotalLabel}>Total</span>
                  <span style={styles.pricingTotalValue}>{formatCurrency(calculatedPrice.total)}</span>
                </div>
              </div>
            )}

            {/* Error Summary */}
            {Object.keys(errors).length > 0 && (
              <div style={styles.errorBox}>
                <h4 style={styles.errorTitle}>Please fix the following errors:</h4>
                <ul style={styles.errorList}>
                  {Object.entries(errors).map(([key, error]) => (
                    <li key={key}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <button
              type="button"
              className="edit-proposal-btn-ghost"
              style={{
                ...styles.btnGhost,
                ...(loading ? styles.btnDisabled : {}),
              }}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-proposal-btn-primary"
              style={{
                ...styles.btnPrimary,
                ...(loading || Object.keys(errors).length > 0 ? styles.btnDisabled : {}),
              }}
              disabled={loading || Object.keys(errors).length > 0}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
