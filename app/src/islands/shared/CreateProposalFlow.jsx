import { useState } from 'react';
import Modal from './Modal.jsx';
import Button from './Button.jsx';

/**
 * Create Proposal Flow Component
 * A 2-step modal wizard for guests to submit rental proposals to property hosts
 * Based on Bubble.io implementation from Split Lease platform
 *
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Control modal visibility
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Object} props.listing - The listing object
 * @param {Function} props.onSubmit - Callback when proposal is submitted
 */
export default function CreateProposalFlow({ isOpen, onClose, listing, onSubmit }) {
  // Step management (1 = Create Proposal, 2 = Confirm Proposal, 2.5 = Adjust Proposal)
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 fields
  const [whySpace, setWhySpace] = useState('');
  const [aboutYourself, setAboutYourself] = useState('');
  const [hasUniqueRequirements, setHasUniqueRequirements] = useState(false);
  const [uniqueRequirements, setUniqueRequirements] = useState('');

  // Step 2/2a fields (from booking widget)
  const [moveInDate, setMoveInDate] = useState('');
  const [isStrict, setIsStrict] = useState(false);
  const [reservationSpan, setReservationSpan] = useState('13 weeks (3 months)');
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri

  // Validation errors
  const [errors, setErrors] = useState({});

  // Helper: Count words in text
  const countWords = (text) => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  // Validate Step 1
  const validateStep1 = () => {
    const newErrors = {};

    const whySpaceWords = countWords(whySpace);
    if (whySpaceWords < 10) {
      newErrors.whySpace = `Please write at least 10 words (current: ${whySpaceWords})`;
    }

    const aboutYourselfWords = countWords(aboutYourself);
    if (aboutYourselfWords < 10) {
      newErrors.aboutYourself = `Please write at least 10 words (current: ${aboutYourselfWords})`;
    }

    if (hasUniqueRequirements) {
      const uniqueReqWords = countWords(uniqueRequirements);
      if (uniqueReqWords < 10) {
        newErrors.uniqueRequirements = `Please write at least 10 words (current: ${uniqueReqWords})`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Next button (Step 1 -> Step 2)
  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  // Handle Back button (Step 2 -> Step 1)
  const handleBack = () => {
    setCurrentStep(1);
  };

  // Handle Edit button (Step 2 -> Step 2a)
  const handleEdit = () => {
    setCurrentStep(2.5);
  };

  // Handle Save Edits (Step 2a -> Step 2)
  const handleSaveEdits = () => {
    setCurrentStep(2);
  };

  // Handle Submit
  const handleSubmit = () => {
    const proposal = {
      whySpace,
      aboutYourself,
      hasUniqueRequirements,
      uniqueRequirements: hasUniqueRequirements ? uniqueRequirements : '',
      moveInDate,
      isStrict,
      reservationSpan,
      selectedDays,
      listingId: listing._id,
      timestamp: new Date().toISOString()
    };

    if (onSubmit) {
      onSubmit(proposal);
    }

    // Reset form
    setCurrentStep(1);
    setWhySpace('');
    setAboutYourself('');
    setHasUniqueRequirements(false);
    setUniqueRequirements('');
    setErrors({});

    if (onClose) {
      onClose();
    }
  };

  // Calculate pricing
  const price = listing?.['💰Nightly Host Rate for 4 nights'] || 0;
  const nightsSelected = selectedDays.length > 0 ? selectedDays.length - 1 : 0;
  const weeksInSpan = parseInt(reservationSpan) || 13;
  const pricePerNight = price;
  const totalNights = nightsSelected * (weeksInSpan / 1); // Approximate
  const totalReservation = pricePerNight * totalNights;
  const fourWeekRent = price * 4 * 7;
  const damageDeposit = 900; // This should come from listing
  const maintenanceFee = 200; // This should come from listing
  const firstFourWeeksTotal = fourWeekRent + damageDeposit + maintenanceFee;

  const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Render Step 1: Create Proposal (Information Gathering)
  const renderStep1 = () => (
    <div style={{ padding: '1rem 0' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1a1a1a' }}>
        Create Proposal
      </h2>

      {/* Why do you want this space? */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          Why do you want this space? *
        </label>
        <textarea
          value={whySpace}
          onChange={(e) => setWhySpace(e.target.value)}
          placeholder="How will you use the space? (minimum of 10 words)"
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: errors.whySpace ? '1px solid #EF4444' : '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
        {errors.whySpace && (
          <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {errors.whySpace}
          </p>
        )}
      </div>

      {/* Tell us about yourself */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          Tell us about yourself *
        </label>
        <textarea
          value={aboutYourself}
          onChange={(e) => setAboutYourself(e.target.value)}
          placeholder="Please take a moment to share some details about yourself... (minimum of 10 words)"
          rows={4}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: errors.aboutYourself ? '1px solid #EF4444' : '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
        {errors.aboutYourself && (
          <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            {errors.aboutYourself}
          </p>
        )}
      </div>

      {/* Unique requirements checkbox */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={hasUniqueRequirements}
            onChange={(e) => setHasUniqueRequirements(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            Do you have any unique requirements?
          </span>
        </label>
      </div>

      {/* Conditional unique requirements textarea */}
      {hasUniqueRequirements && (
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#374151'
          }}>
            Write your unique requirements *
          </label>
          <textarea
            value={uniqueRequirements}
            onChange={(e) => setUniqueRequirements(e.target.value)}
            placeholder="Any special needs, personal preference or specific requirements... (minimum of 10 words)"
            rows={4}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: errors.uniqueRequirements ? '1px solid #EF4444' : '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          {errors.uniqueRequirements && (
            <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              {errors.uniqueRequirements}
            </p>
          )}
        </div>
      )}

      {/* Next button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
        <button
          onClick={handleNext}
          style={{
            padding: '0.75rem 2rem',
            background: '#5B21B6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#4c1d95'}
          onMouseLeave={(e) => e.target.style.background = '#5B21B6'}
        >
          Next
        </button>
      </div>
    </div>
  );

  // Render Step 2: Confirm Proposal (Review & Submit)
  const renderStep2 = () => (
    <div style={{ padding: '1rem 0' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1a1a1a' }}>
        Confirm Proposal
      </h2>

      {/* Booking Summary */}
      <div style={{
        padding: '1.5rem',
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
          Booking Summary
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Approx Move-in:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {moveInDate || 'Not set'}
              </span>
              <button
                onClick={handleEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5B21B6',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                edit
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Check-in:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {selectedDays.length > 0 ? DAY_ABBREVIATIONS[selectedDays[0]] : 'Not set'}
              </span>
              <button
                onClick={handleEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5B21B6',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                edit
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Check-out:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {selectedDays.length > 0 ? DAY_ABBREVIATIONS[selectedDays[selectedDays.length - 1]] : 'Not set'}
              </span>
              <button
                onClick={handleEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5B21B6',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                edit
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Reservation span:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                {reservationSpan}
              </span>
              <button
                onClick={handleEdit}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5B21B6',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div style={{
        padding: '1.5rem',
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
          Pricing Breakdown
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span>Price per night:</span>
            <span>${pricePerNight.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span>Number of reserved nights:</span>
            <span>x {nightsSelected}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
            <span>Total price for reservation:</span>
            <span>${totalReservation.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginTop: '0.75rem' }}>
            <span>Price per 4 weeks:</span>
            <span>${fourWeekRent.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#16a34a' }}>
            <span>Refundable Damage Deposit:</span>
            <span>+ ${damageDeposit.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span>Maintenance Fee / 4 wks:</span>
            <span>+ ${maintenanceFee.toFixed(2)}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '1rem',
            fontWeight: '700',
            paddingTop: '0.75rem',
            borderTop: '1px solid #e5e7eb',
            marginTop: '0.5rem'
          }}>
            <span>Price for 1st 4 weeks:</span>
            <span>${firstFourWeeksTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <button
          onClick={handleBack}
          style={{
            padding: '0.75rem 2rem',
            background: 'white',
            color: '#5B21B6',
            border: '1px solid #5B21B6',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white';
          }}
        >
          Go back
        </button>
        <button
          onClick={handleSubmit}
          style={{
            padding: '0.75rem 2rem',
            background: '#5B21B6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#4c1d95'}
          onMouseLeave={(e) => e.target.style.background = '#5B21B6'}
        >
          Submit Proposal
        </button>
      </div>
    </div>
  );

  // Render Step 2a: Adjust Proposal (Edit Mode)
  const renderStep2a = () => (
    <div style={{ padding: '1rem 0' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#1a1a1a' }}>
        Adjust Proposal
      </h2>

      {/* Move-in date */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          Approx Move-in Date
        </label>
        <input
          type="date"
          value={moveInDate}
          onChange={(e) => setMoveInDate(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}
        />
      </div>

      {/* Strict checkbox */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={isStrict}
            onChange={(e) => setIsStrict(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.875rem', color: '#374151' }}>
            Strict (no negotiation on exact move in)
          </span>
        </label>
      </div>

      {/* Reservation span */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          Reservation Length
        </label>
        <select
          value={reservationSpan}
          onChange={(e) => setReservationSpan(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          <option>6 weeks</option>
          <option>7 weeks</option>
          <option>8 weeks</option>
          <option>9 weeks</option>
          <option>10 weeks</option>
          <option>12 weeks</option>
          <option>13 weeks (3 months)</option>
          <option>16 weeks</option>
          <option>17 weeks</option>
          <option>20 weeks</option>
          <option>22 weeks</option>
          <option>26 weeks</option>
          <option>Other</option>
        </select>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '2rem' }}>
        <button
          onClick={() => setCurrentStep(2)}
          style={{
            padding: '0.75rem 2rem',
            background: 'white',
            color: '#5B21B6',
            border: '1px solid #5B21B6',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'white';
          }}
        >
          Go back
        </button>
        <button
          onClick={handleSaveEdits}
          style={{
            padding: '0.75rem 2rem',
            background: '#5B21B6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#4c1d95'}
          onMouseLeave={(e) => e.target.style.background = '#5B21B6'}
        >
          Yes, Continue
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnOverlayClick={false}
      className="create-proposal-modal"
    >
      <div style={{ minWidth: '500px', maxWidth: '600px' }}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 2.5 && renderStep2a()}
      </div>
    </Modal>
  );
}
