/**
 * Create Proposal Flow Component
 * Page-scoped component for ViewSplitLeasePage
 * Ported from TypeScript create-proposal-popup to JSX
 *
 * Multi-step proposal creation flow:
 * - Step 1: Move-in Date Selection
 * - Step 2: Personal Information
 * - Step 3: Reservation Span
 * - Step 4: Schedule Selection
 * - Step 5: Review & Submit
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { COLORS } from '../../../lib/constants.js';

export default function CreateProposalFlow({
  listing,
  moveInDate: initialMoveInDate,
  selectedDays: initialSelectedDays,
  reservationSpan: initialReservationSpan,
  strictMode: initialStrictMode,
  pricingBreakdown,
  onClose
}) {
  // Step management (1-5)
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Move-in Date
  const [moveInDate, setMoveInDate] = useState(initialMoveInDate || '');

  // Step 2: Personal Information
  const [aboutYourself, setAboutYourself] = useState('');
  const [needForSpace, setNeedForSpace] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');

  // Step 3: Reservation Span
  const [reservationSpan, setReservationSpan] = useState(initialReservationSpan || 13);

  // Step 4: Schedule Selection
  const [selectedDays, setSelectedDays] = useState(initialSelectedDays || [1, 2, 3, 4, 5]);
  const [strictMode, setStrictMode] = useState(initialStrictMode || false);

  // Validation errors
  const [errors, setErrors] = useState({});

  const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Helper: Check if text is not empty
  const isNotEmpty = (text) => {
    return text && text.trim().length > 0;
  };

  // Helper: Format price
  const formatPrice = (price) => {
    if (price === null || price === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Validation functions
  const validateStep1 = () => {
    const newErrors = {};
    if (!moveInDate) {
      newErrors.moveInDate = 'Please select a move-in date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!isNotEmpty(aboutYourself)) {
      newErrors.aboutYourself = 'Please tell us about yourself';
    }

    if (!isNotEmpty(needForSpace)) {
      newErrors.needForSpace = 'Please explain your need for this space';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};
    if (!reservationSpan || reservationSpan <= 0) {
      newErrors.reservationSpan = 'Please select a valid reservation span';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors = {};
    if (selectedDays.length === 0) {
      newErrors.selectedDays = 'Please select at least one day';
    }
    // Check contiguous selection
    if (selectedDays.length > 1) {
      const sortedDays = [...selectedDays].sort((a, b) => a - b);
      for (let i = 1; i < sortedDays.length; i++) {
        if (sortedDays[i] - sortedDays[i - 1] !== 1) {
          newErrors.selectedDays = 'Please select consecutive days only';
          break;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        break;
      case 4:
        isValid = validateStep4();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setCurrentStep(prev => prev + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
    setErrors({});
  };

  const handleEdit = (step) => {
    setCurrentStep(step);
  };

  // Submit handler
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Get current user session (optional for testing)
      const { data: { user } } = await supabase.auth.getUser();

      // For testing: create a mock user if not authenticated
      const effectiveUser = user || {
        id: 'test-user-' + Date.now(),
        email: 'test@example.com'
      };

      // Calculate nights and days
      const nightsPerWeek = selectedDays.length > 0 ? selectedDays.length - 1 : 0;
      const daysSelected = selectedDays.length;

      // Generate unique ID for the proposal
      const proposalId = `${Date.now()}x${Math.floor(Math.random() * 1000000000000000000)}`;

      // Prepare the proposal data matching the database schema
      const proposalData = {
        // Primary key
        _id: proposalId,

        // References
        Listing: listing._id,
        Guest: effectiveUser.id,
        'Guest email': effectiveUser.email,
        'Created By': effectiveUser.id,

        // Dates
        'Created Date': new Date().toISOString(),
        'Modified Date': new Date().toISOString(),
        'Move in range start': moveInDate,
        'Move in range end': moveInDate,

        // Reservation details
        'Reservation Span': `${reservationSpan} weeks`,
        'Reservation Span (Weeks)': reservationSpan,
        'nights per week (num)': nightsPerWeek,
        'actual weeks during reservation span': reservationSpan,

        // Schedule information
        'Days Selected': selectedDays,
        'Nights Selected (Nights list)': selectedDays.slice(0, -1), // All days except last (check-out day)
        'check in day': checkInDay,
        'check out day': checkOutDay,
        'flexible move in?': !strictMode,

        // Pricing information
        '4 week rent': pricingBreakdown?.fourWeekRent || 0,
        'Total Price for Reservation (guest)': pricingBreakdown?.reservationTotal || 0,
        'proposal nightly price': pricingBreakdown?.nightlyPrice || 0,

        // Guest information (new fields)
        'about_yourself': aboutYourself,
        'need for space': needForSpace,
        'special_needs': specialNeeds || null,

        // Status and flags
        Status: 'Pending',
        'Is Finalized': false,
        'rental app requested': false,
        Deleted: false,
        'Order Ranking': 0,

        // History tracking
        History: [{
          timestamp: new Date().toISOString(),
          action: 'Proposal Created',
          by: effectiveUser.email
        }],

        // Required fields with empty defaults
        'Complementary Nights': [],
        'Guest flexibility': strictMode ? 'Not flexible' : 'Flexible'
      };

      console.log('Submitting proposal to Supabase:', proposalData);

      // Insert the proposal into Supabase
      const { data, error } = await supabase
        .from('proposal')
        .insert([proposalData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }

      console.log('Proposal created successfully:', data);

      alert('Proposal submitted successfully! The host will review your proposal and get back to you.');
      onClose();
    } catch (error) {
      console.error('Error submitting proposal:', error);
      alert(`Failed to submit proposal: ${error.message}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate nights and days
  const nightsSelected = selectedDays.length > 0 ? selectedDays.length - 1 : 0;
  const checkInDay = selectedDays.length > 0 ? DAY_NAMES[selectedDays[0]] : '';
  const checkOutDay = selectedDays.length > 0 ? DAY_NAMES[selectedDays[selectedDays.length - 1]] : '';

  // Render Step 1: Move-in Date
  const renderStep1 = () => (
    <div style={{ padding: '1rem 0' }}>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '0.5rem',
        color: COLORS.TEXT_DARK
      }}>
        When would you like to move in?
      </h3>
      <p style={{
        fontSize: '0.875rem',
        color: COLORS.TEXT_LIGHT,
        marginBottom: '1.5rem'
      }}>
        Select your preferred move-in date. This helps us coordinate with the property owner.
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: COLORS.TEXT_DARK
        }}>
          Preferred Move-In Date *
        </label>
        <input
          type="date"
          value={moveInDate}
          onChange={(e) => setMoveInDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: errors.moveInDate ? `2px solid ${COLORS.ERROR}` : `1px solid ${COLORS.BG_LIGHT}`,
            borderRadius: '8px',
            fontSize: '1rem'
          }}
        />
        {errors.moveInDate && (
          <p style={{ color: COLORS.ERROR, fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {errors.moveInDate}
          </p>
        )}
      </div>

      <div style={{
        padding: '1rem',
        background: COLORS.BG_LIGHT,
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: COLORS.TEXT_LIGHT
      }}>
        <strong>Note:</strong> Your move-in date can be adjusted after proposal submission during negotiations with the host.
      </div>
    </div>
  );

  // Render Step 2: Personal Information
  const renderStep2 = () => (
    <div style={{ padding: '1rem 0' }}>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '0.5rem',
        color: COLORS.TEXT_DARK
      }}>
        Tell us about yourself
      </h3>
      <p style={{
        fontSize: '0.875rem',
        color: COLORS.TEXT_LIGHT,
        marginBottom: '1.5rem'
      }}>
        Help the host understand who you are and why you're interested in this space.
      </p>

      {/* About Yourself */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: COLORS.TEXT_DARK
        }}>
          About Yourself *
        </label>
        <textarea
          value={aboutYourself}
          onChange={(e) => setAboutYourself(e.target.value)}
          placeholder="Share some details about yourself, your background, occupation, etc."
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: errors.aboutYourself ? `2px solid ${COLORS.ERROR}` : `1px solid ${COLORS.BG_LIGHT}`,
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
        {errors.aboutYourself && (
          <p style={{ color: COLORS.ERROR, fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {errors.aboutYourself}
          </p>
        )}
      </div>

      {/* Need for Space */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: COLORS.TEXT_DARK
        }}>
          Why do you need this space? *
        </label>
        <textarea
          value={needForSpace}
          onChange={(e) => setNeedForSpace(e.target.value)}
          placeholder="Explain your housing needs and how you'll use the space"
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: errors.needForSpace ? `2px solid ${COLORS.ERROR}` : `1px solid ${COLORS.BG_LIGHT}`,
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
        {errors.needForSpace && (
          <p style={{ color: COLORS.ERROR, fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {errors.needForSpace}
          </p>
        )}
      </div>

      {/* Special Needs (Optional) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: COLORS.TEXT_DARK
        }}>
          Any special needs or requirements? (optional)
        </label>
        <textarea
          value={specialNeeds}
          onChange={(e) => setSpecialNeeds(e.target.value)}
          placeholder="Any accessibility needs, pets, or special circumstances the host should know about"
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: `1px solid ${COLORS.BG_LIGHT}`,
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>
    </div>
  );

  // Render Step 3: Reservation Span
  const renderStep3 = () => (
    <div style={{ padding: '1rem 0' }}>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '0.5rem',
        color: COLORS.TEXT_DARK
      }}>
        How long do you need the space?
      </h3>
      <p style={{
        fontSize: '0.875rem',
        color: COLORS.TEXT_LIGHT,
        marginBottom: '1.5rem'
      }}>
        Choose the total length of your reservation.
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: COLORS.TEXT_DARK
        }}>
          Reservation Span *
        </label>
        <select
          value={reservationSpan}
          onChange={(e) => setReservationSpan(Number(e.target.value))}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: errors.reservationSpan ? `2px solid ${COLORS.ERROR}` : `1px solid ${COLORS.BG_LIGHT}`,
            borderRadius: '8px',
            fontSize: '1rem',
            background: 'white'
          }}
        >
          {[6, 7, 8, 9, 10, 12, 13, 16, 17, 20, 22, 26].map(weeks => (
            <option key={weeks} value={weeks}>
              {weeks} weeks {weeks >= 12 ? `(${Math.floor(weeks / 4)} months)` : ''}
            </option>
          ))}
        </select>
        {errors.reservationSpan && (
          <p style={{ color: COLORS.ERROR, fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {errors.reservationSpan}
          </p>
        )}
      </div>

      <div style={{
        padding: '1rem',
        background: COLORS.BG_LIGHT,
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '0.875rem', color: COLORS.TEXT_DARK, marginBottom: '0.5rem' }}>
          <strong>Estimated total nights:</strong> {nightsSelected * reservationSpan}
        </div>
        <div style={{ fontSize: '0.875rem', color: COLORS.TEXT_DARK }}>
          <strong>Estimated total cost:</strong> {pricingBreakdown?.valid
            ? formatPrice(pricingBreakdown.nightlyPrice * nightsSelected * reservationSpan)
            : 'Calculate in previous step'}
        </div>
      </div>
    </div>
  );

  // Render Step 4: Schedule Selection
  const renderStep4 = () => (
    <div style={{ padding: '1rem 0' }}>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '0.5rem',
        color: COLORS.TEXT_DARK
      }}>
        Select your weekly schedule
      </h3>
      <p style={{
        fontSize: '0.875rem',
        color: COLORS.TEXT_LIGHT,
        marginBottom: '1.5rem'
      }}>
        Choose which days of the week you need the space. Days must be consecutive.
      </p>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          {DAY_ABBREVIATIONS.map((day, index) => (
            <button
              key={index}
              onClick={() => {
                const newSelection = selectedDays.includes(index)
                  ? selectedDays.filter(d => d !== index)
                  : [...selectedDays, index].sort((a, b) => a - b);
                setSelectedDays(newSelection);
              }}
              style={{
                padding: '0.75rem 0.5rem',
                border: `2px solid ${selectedDays.includes(index) ? COLORS.PRIMARY : COLORS.BG_LIGHT}`,
                borderRadius: '8px',
                background: selectedDays.includes(index) ? COLORS.PRIMARY : 'white',
                color: selectedDays.includes(index) ? 'white' : COLORS.TEXT_DARK,
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {day}
            </button>
          ))}
        </div>
        {errors.selectedDays && (
          <p style={{ color: COLORS.ERROR, fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {errors.selectedDays}
          </p>
        )}

        {selectedDays.length > 0 && (
          <div style={{ fontSize: '0.875rem', color: COLORS.TEXT_LIGHT, marginBottom: '1rem' }}>
            <div>{selectedDays.length} days, {nightsSelected} nights selected</div>
            {checkInDay && checkOutDay && (
              <div>Check-in: {checkInDay}, Check-out: {checkOutDay}</div>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.875rem'
        }}>
          <input
            type="checkbox"
            checked={strictMode}
            onChange={(e) => setStrictMode(e.target.checked)}
          />
          <span>Strict (no negotiation on exact move-in date)</span>
        </label>
      </div>
    </div>
  );

  // Render Step 5: Review & Submit
  const renderStep5 = () => (
    <div style={{ padding: '1rem 0' }}>
      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '0.5rem',
        color: COLORS.TEXT_DARK
      }}>
        Review your proposal
      </h3>
      <p style={{
        fontSize: '0.875rem',
        color: COLORS.TEXT_LIGHT,
        marginBottom: '1.5rem'
      }}>
        Please review all details before submitting.
      </p>

      {/* Summary Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>

        {/* Move-in Date */}
        <div style={{
          padding: '1rem',
          background: COLORS.BG_LIGHT,
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: COLORS.TEXT_LIGHT, marginBottom: '0.25rem' }}>
                Move-In Date
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: COLORS.TEXT_DARK }}>
                {moveInDate || 'Not set'}
              </div>
            </div>
            <button
              onClick={() => handleEdit(1)}
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.PRIMARY,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Edit
            </button>
          </div>
        </div>

        {/* Schedule */}
        <div style={{
          padding: '1rem',
          background: COLORS.BG_LIGHT,
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: COLORS.TEXT_LIGHT, marginBottom: '0.25rem' }}>
                Weekly Schedule
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: COLORS.TEXT_DARK }}>
                {selectedDays.map(i => DAY_ABBREVIATIONS[i]).join(', ')} ({nightsSelected} nights)
              </div>
            </div>
            <button
              onClick={() => handleEdit(4)}
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.PRIMARY,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Edit
            </button>
          </div>
        </div>

        {/* Reservation Span */}
        <div style={{
          padding: '1rem',
          background: COLORS.BG_LIGHT,
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: COLORS.TEXT_LIGHT, marginBottom: '0.25rem' }}>
                Reservation Length
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: COLORS.TEXT_DARK }}>
                {reservationSpan} weeks ({Math.floor(reservationSpan / 4)} months)
              </div>
            </div>
            <button
              onClick={() => handleEdit(3)}
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.PRIMARY,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Edit
            </button>
          </div>
        </div>

        {/* Pricing Summary */}
        {pricingBreakdown?.valid && (
          <div style={{
            padding: '1.5rem',
            background: COLORS.BG_LIGHT,
            borderRadius: '8px',
            border: `2px solid ${COLORS.PRIMARY}`
          }}>
            <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: COLORS.TEXT_DARK }}>
              Pricing Summary
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Nightly rate:</span>
                <span>{formatPrice(pricingBreakdown.nightlyPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Nights per week:</span>
                <span>{nightsSelected}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>Reservation span:</span>
                <span>{reservationSpan} weeks</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem',
                fontWeight: '700',
                paddingTop: '0.75rem',
                borderTop: `1px solid ${COLORS.TEXT_LIGHT}`,
                marginTop: '0.5rem',
                color: COLORS.PRIMARY
              }}>
                <span>Estimated Total:</span>
                <span>{formatPrice(pricingBreakdown.nightlyPrice * nightsSelected * reservationSpan)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{
        padding: '1rem',
        background: '#FEF3C7',
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#92400E'
      }}>
        <strong>Important:</strong> By submitting this proposal, you're expressing interest in this property. The host will review your information and may reach out to discuss terms.
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      paddingTop: '80px' // Account for header height
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: 'calc(100vh - 100px)', // Ensure it never exceeds viewport minus header
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: `1px solid ${COLORS.BG_LIGHT}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: COLORS.TEXT_DARK
          }}>
            Create Proposal
          </h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              color: COLORS.TEXT_LIGHT,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: '0',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>

        {/* Progress Indicator */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: `1px solid ${COLORS.BG_LIGHT}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flex: 1
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step <= currentStep ? COLORS.PRIMARY : COLORS.BG_LIGHT,
                  color: step <= currentStep ? 'white' : COLORS.TEXT_LIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  marginBottom: '0.25rem'
                }}>
                  {step}
                </div>
                <div style={{
                  fontSize: '0.625rem',
                  color: step <= currentStep ? COLORS.TEXT_DARK : COLORS.TEXT_LIGHT,
                  textAlign: 'center'
                }}>
                  Step {step}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: '1.5rem',
          overflowY: 'auto',
          flex: 1
        }}>
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && renderStep5()}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1.5rem',
          borderTop: `1px solid ${COLORS.BG_LIGHT}`,
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: COLORS.PRIMARY,
                border: `2px solid ${COLORS.PRIMARY}`,
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Back
            </button>
          )}

          <button
            onClick={currentStep < 5 ? handleNext : handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '0.75rem 1.5rem',
              background: isSubmitting ? COLORS.TEXT_LIGHT : COLORS.PRIMARY,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              marginLeft: currentStep === 1 ? 'auto' : '0'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.target.style.background = COLORS.PRIMARY_HOVER;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.target.style.background = COLORS.PRIMARY;
              }
            }}
          >
            {isSubmitting ? 'Submitting...' : currentStep < 5 ? 'Next' : 'Submit Proposal'}
          </button>
        </div>
      </div>
    </div>
  );
}
