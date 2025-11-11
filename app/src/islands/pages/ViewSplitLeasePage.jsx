import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { supabase } from '../../lib/supabase.js';
import { VIEW_LISTING_URL, DAY_ABBREVIATIONS } from '../../lib/constants.js';
import {
  initializeLookups,
  getAmenities,
  getSafetyFeatures,
  getHouseRules,
  getParkingOption
} from '../../lib/dataLookups.js';

// ============================================================================
// INTERNAL COMPONENT: Loading State
// ============================================================================

function LoadingState() {
  return (
    <div className="loading-container" style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
      padding: '2rem'
    }}>
      <div className="loading-spinner" style={{
        width: '60px',
        height: '60px',
        border: '4px solid #f3f4f6',
        borderTop: '4px solid #5B21B6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
    </div>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Error State
// ============================================================================

function ErrorState({ message }) {
  return (
    <div className="error-container" style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
      <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1rem', color: '#1a1a1a' }}>
        Property Not Found
      </h2>
      <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '2rem' }}>
        {message || 'The property you are looking for does not exist or has been removed.'}
      </p>
      <a
        href="/search.html"
        style={{
          display: 'inline-block',
          padding: '1rem 2rem',
          background: '#5B21B6',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.target.style.background = '#4c1d95'}
        onMouseLeave={(e) => e.target.style.background = '#5B21B6'}
      >
        Browse All Listings
      </a>
    </div>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Image Gallery
// ============================================================================

function ImageGallery({ photos, propertyName, onImageClick }) {
  if (!photos || photos.length === 0) {
    return (
      <section className="image-gallery" style={{ marginBottom: '2rem' }}>
        <div className="main-image" style={{
          width: '100%',
          height: '400px',
          background: '#f3f4f6',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ color: '#9ca3af' }}>No images available</span>
        </div>
      </section>
    );
  }

  const mainPhoto = photos[0];
  const thumbnails = photos.slice(1, 4);

  return (
    <section className="image-gallery" style={{ marginBottom: '2rem' }}>
      <div
        className="main-image"
        style={{
          marginBottom: '1rem',
          cursor: 'pointer',
          borderRadius: '12px',
          overflow: 'hidden'
        }}
        onClick={() => onImageClick(0)}
      >
        <img
          src={mainPhoto.Photo}
          alt={`${propertyName} - main image`}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
      </div>
      {thumbnails.length > 0 && (
        <div className="thumbnail-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.75rem'
        }}>
          {thumbnails.map((photo, index) => (
            <div
              key={photo._id}
              style={{
                cursor: 'pointer',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative'
              }}
              onClick={() => onImageClick(index + 1)}
            >
              <img
                src={photo['Photo (thumbnail)'] || photo.Photo}
                alt={`${propertyName} - thumbnail ${index + 2}`}
                style={{
                  width: '100%',
                  height: '120px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              {index === 2 && photos.length > 4 && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.25rem',
                  fontWeight: '700'
                }}>
                  +{photos.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Property Header
// ============================================================================

function PropertyHeader({ listing }) {
  const location = listing.resolvedNeighborhood && listing.resolvedBorough
    ? `${listing.resolvedNeighborhood}, ${listing.resolvedBorough}`
    : listing['Location - Address']?.address || 'Location not specified';

  const capacity = listing.resolvedTypeOfSpace && listing['Features - Qty Guests']
    ? `${listing.resolvedTypeOfSpace} - ${listing['Features - Qty Guests']} guests max`
    : '';

  return (
    <section className="property-header" style={{ marginBottom: '2rem' }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '700',
        marginBottom: '1rem',
        color: '#1a1a1a'
      }}>
        {listing.Name}
      </h1>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 1rem',
          background: '#f3f4f6',
          borderRadius: '9999px',
          fontSize: '0.875rem'
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>{location}</span>
        </div>
        {capacity && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: '#f3f4f6',
            borderRadius: '9999px',
            fontSize: '0.875rem'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>{capacity}</span>
          </div>
        )}
      </div>
      <FeatureIcons listing={listing} />
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Feature Icons
// ============================================================================

function FeatureIcons({ listing }) {
  const features = [];

  if (listing['Kitchen Type']) {
    features.push({ icon: 'chef-hat', text: listing['Kitchen Type'] });
  }

  if (listing['Features - Qty Bathrooms']) {
    const count = listing['Features - Qty Bathrooms'];
    const text = count === 1 ? 'Bathroom' : 'Bathrooms';
    features.push({ icon: 'bath', text: `${count} ${text}` });
  }

  if (listing.resolvedTypeOfSpace) {
    features.push({ icon: 'home', text: listing.resolvedTypeOfSpace });
  }

  if (listing['Features - Qty Beds']) {
    const count = listing['Features - Qty Beds'];
    const text = count === 1 ? 'Bed' : 'Beds';
    features.push({ icon: 'bed-double', text: `${count} ${text}` });
  }

  if (features.length === 0) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '1rem',
      marginTop: '1.5rem'
    }}>
      {features.map((feature, index) => (
        <div key={index} style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '1rem',
          background: '#f9fafb',
          borderRadius: '8px'
        }}>
          <FeatureIcon name={feature.icon} />
          <span style={{ fontSize: '0.875rem', textAlign: 'center' }}>{feature.text}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Feature Icon (SVG Icons)
// ============================================================================

function FeatureIcon({ name }) {
  const icons = {
    'chef-hat': (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"></path>
        <line x1="6" x2="18" y1="17" y2="17"></line>
      </svg>
    ),
    'bath': (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"></path>
        <line x1="10" x2="8" y1="5" y2="7"></line>
        <line x1="2" x2="22" y1="12" y2="12"></line>
        <line x1="7" x2="7" y1="19" y2="21"></line>
        <line x1="17" x2="17" y1="19" y2="21"></line>
      </svg>
    ),
    'home': (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
    'bed-double': (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 4v16"></path>
        <path d="M2 8h18a2 2 0 0 1 2 2v10"></path>
        <path d="M2 17h20"></path>
        <path d="M6 8v9"></path>
      </svg>
    )
  };

  return icons[name] || null;
}

// ============================================================================
// INTERNAL COMPONENT: Property Details
// ============================================================================

function PropertyDetails({ listing }) {
  const [expanded, setExpanded] = useState(false);
  const description = listing.Description || 'No description available';
  const shouldTruncate = description.length > 150;
  const displayText = expanded || !shouldTruncate
    ? description
    : description.substring(0, 150) + '...';

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
        Description of Lodging
      </h2>
      <p style={{ lineHeight: '1.6', color: '#4b5563', marginBottom: '0.5rem' }}>
        {displayText}
      </p>
      {shouldTruncate && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#5B21B6',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            padding: 0
          }}
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}

      {listing['Features - Parking type'] && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
            Commute
          </h2>
          <CommuteSection listing={listing} />
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <AmenitiesSection listing={listing} />
      </div>

      <div style={{ marginTop: '2rem' }}>
        <HouseRulesSection listing={listing} />
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Commute Section
// ============================================================================

function CommuteSection({ listing }) {
  const parking = getParkingOption(listing['Features - Parking type']);

  if (!parking) return null;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1rem'
    }}>
      <div style={{
        padding: '1.5rem',
        background: '#f9fafb',
        borderRadius: '8px'
      }}>
        <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{parking.label}</h3>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Convenient parking for your car.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Amenities Section
// ============================================================================

function AmenitiesSection({ listing }) {
  const amenitiesRaw = listing['Features - Amenities In-Unit'];
  const amenities = getAmenities(amenitiesRaw);

  const safetyRaw = listing['Features - Safety'];
  const safety = getSafetyFeatures(safetyRaw);

  if (amenities.length === 0 && safety.length === 0) return null;

  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
        Amenities
      </h2>

      {amenities.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            In-Unit Amenities
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            {amenities.map((amenity) => (
              <div key={amenity.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <AmenityIcon name={amenity.icon} />
                <span style={{ fontSize: '0.875rem' }}>{amenity.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {safety.length > 0 && (
        <>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            Safety Features
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {safety.map((feature) => (
              <div key={feature.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <AmenityIcon name={feature.icon} />
                <span style={{ fontSize: '0.875rem' }}>{feature.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Amenity Icon
// ============================================================================

function AmenityIcon({ name }) {
  const icons = {
    'wind': (
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"></path>
        <path d="M9.6 4.6A2 2 0 1 1 11 8H2"></path>
        <path d="M12.6 19.4A2 2 0 1 0 14 16H2"></path>
      </svg>
    ),
    'dumbbell': (
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6.5 6.5 11 11"></path>
        <path d="m21 21-1-1"></path>
        <path d="m3 3 1 1"></path>
        <path d="m18 22 4-4"></path>
        <path d="m2 6 4-4"></path>
        <path d="m3 10 7-7"></path>
        <path d="m14 21 7-7"></path>
      </svg>
    ),
    'tv': (
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect width="20" height="15" x="2" y="7" rx="2" ry="2"></rect>
        <polyline points="17 2 12 7 7 2"></polyline>
      </svg>
    ),
    'wifi': (
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 13a10 10 0 0 1 14 0"></path>
        <path d="M8.5 16.5a5 5 0 0 1 7 0"></path>
        <path d="M2 8.82a15 15 0 0 1 20 0"></path>
        <line x1="12" x2="12.01" y1="20" y2="20"></line>
      </svg>
    ),
    'shield-alert': (
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
        <path d="M12 8v4"></path>
        <path d="M12 16h.01"></path>
      </svg>
    ),
    'flame': (
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
      </svg>
    ),
    'shield-check': (
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
        <path d="m9 12 2 2 4-4"></path>
      </svg>
    )
  };

  return icons[name] || null;
}

// ============================================================================
// INTERNAL COMPONENT: House Rules Section
// ============================================================================

function HouseRulesSection({ listing }) {
  const rulesRaw = listing['Features - House Rules'];
  const rules = getHouseRules(rulesRaw);

  if (rules.length === 0) return null;

  return (
    <>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
        House Rules
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rules.map((rule) => (
          <div key={rule.name} style={{
            padding: '0.75rem 1rem',
            background: '#f9fafb',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}>
            {rule.name}
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Booking Widget
// ============================================================================

function BookingWidget({ listing, selectedDays, onDayToggle, onBook }) {
  const [moveInDate, setMoveInDate] = useState('');
  const [isStrict, setIsStrict] = useState(false);
  const [reservationSpan, setReservationSpan] = useState('13 weeks (3 months)');

  const price = listing['💰Nightly Host Rate for 4 nights'] || 0;
  const nightsSelected = selectedDays.length > 0 ? selectedDays.length - 1 : 0;
  const weeksInSpan = parseInt(reservationSpan) || 13;
  const fourWeekRent = price * 4 * 7;
  const estimatedTotal = fourWeekRent * (weeksInSpan / 4);

  return (
    <div style={{
      position: 'sticky',
      top: '1rem',
      padding: '1.5rem',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      background: 'white',
      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)'
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: '700', color: '#1a1a1a' }}>
          ${price.toFixed(2)}
        </span>
        <span style={{ fontSize: '1rem', color: '#6b7280' }}>/night</span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem'
        }}>
          Ideal Move-In <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>ⓘ</span>
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

      <div style={{ marginBottom: '1rem' }}>
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
          />
          <span style={{ fontSize: '0.875rem' }}>
            Strict (no negotiation on exact move in) <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>ⓘ</span>
          </span>
        </label>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem'
        }}>
          Weekly Schedule
        </label>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '0.75rem'
        }}>
          {DAY_ABBREVIATIONS.map((day, index) => (
            <button
              key={index}
              onClick={() => onDayToggle(index)}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: selectedDays.includes(index) ? '2px solid #5B21B6' : '2px solid #e5e7eb',
                background: selectedDays.includes(index) ? '#5B21B6' : 'white',
                color: selectedDays.includes(index) ? 'white' : '#1a1a1a',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.875rem',
                transition: 'all 0.2s'
              }}
            >
              {day}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
          {selectedDays.length} days, {nightsSelected} nights Selected
        </p>
        {selectedDays.length > 0 && (
          <>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Check-in day is {DAY_ABBREVIATIONS[selectedDays[0]]}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Check-out day is {DAY_ABBREVIATIONS[selectedDays[selectedDays.length - 1]]}
            </p>
          </>
        )}
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '0.5rem'
        }}>
          Reservation Span <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>ⓘ</span>
        </label>
        <select
          value={reservationSpan}
          onChange={(e) => setReservationSpan(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem'
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

      <div style={{
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          fontSize: '0.875rem'
        }}>
          <span>4-Week Rent</span>
          <span>${fourWeekRent.toFixed(2)}</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '1rem',
          fontWeight: '700',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <span>Reservation Estimated Total</span>
          <span>${estimatedTotal.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={onBook}
        style={{
          width: '100%',
          padding: '1rem',
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
        Create Proposal at ${price.toFixed(2)}/night
      </button>
    </div>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Host Card
// ============================================================================

function HostCard({ listing, onMessage, onCall }) {
  const hostName = listing['host name'] || 'Host';

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
        Meet Your Host
      </h2>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '1.5rem',
        background: '#f9fafb',
        borderRadius: '12px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="40" height="40" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="32" r="12" fill="#9CA3AF"/>
            <path d="M20 65C20 65 25 50 40 50C55 50 60 65 60 65" fill="#9CA3AF"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.75rem' }}>
            {hostName}
          </h3>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={onMessage}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #5B21B6',
                background: 'white',
                color: '#5B21B6',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
              title="Send message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
              Message
            </button>
            <button
              onClick={onCall}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #5B21B6',
                background: 'white',
                color: '#5B21B6',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
              title="Call host"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Call
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Reviews Section
// ============================================================================

function ReviewsSection() {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
        Reviews
      </h2>
      <div style={{
        padding: '2rem',
        background: '#f9fafb',
        borderRadius: '12px',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <p>No reviews yet. Be the first to book!</p>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Map Section
// ============================================================================

function MapSection({ listing }) {
  const location = listing['Location - Address'];

  if (!location || !location.lat || !location.lng) {
    return (
      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
          Location
        </h2>
        <div style={{
          width: '100%',
          height: '400px',
          background: '#f3f4f6',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af'
        }}>
          Location map not available
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>
        Location
      </h2>
      <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <iframe
          src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.3936737736824!2d${location.lng}!3d${location.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM40zMCcwMC4wIk4gNzTCsDAwJzAwLjAiVw!5e0!3m2!1sen!2sus!4v1621234567890!5m2!1sen!2sus`}
          width="100%"
          height="400"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </section>
  );
}

// ============================================================================
// INTERNAL COMPONENT: Share Button
// ============================================================================

function ShareButton({ listing }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.Name,
          text: `Check out this property: ${listing.Name}`,
          url: url
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          copyToClipboard(url);
        }
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleShare}
      style={{
        padding: '0.75rem 1.5rem',
        border: '1px solid #d1d5db',
        background: 'white',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        transition: 'all 0.2s'
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3"></circle>
        <circle cx="6" cy="12" r="3"></circle>
        <circle cx="18" cy="19" r="3"></circle>
        <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"></line>
        <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"></line>
      </svg>
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT: ViewSplitLeasePage
// ============================================================================

export default function ViewSplitLeasePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listing, setListing] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Monday-Friday by default
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    // Initialize lookups from database
    initializeLookups();
    // Load listing data
    loadListing();
  }, []);

  const getListingIdFromUrl = () => {
    // 1. Check query string: ?id=listingId
    const urlParams = new URLSearchParams(window.location.search);
    const idFromQuery = urlParams.get('id');
    if (idFromQuery) return idFromQuery;

    // 2. Parse pathname for segment after 'view-split-lease'
    // Supports both clean URLs (/view-split-lease/[id]) and legacy URLs (/view-split-lease.html/[id])
    const pathSegments = window.location.pathname.split('/').filter(segment => segment);
    const viewSegmentIndex = pathSegments.findIndex(segment =>
      segment === 'view-split-lease' ||
      segment === 'view-split-lease.html' ||
      segment === 'view-split-lease-1'
    );

    if (viewSegmentIndex !== -1 && pathSegments[viewSegmentIndex + 1]) {
      const nextSegment = pathSegments[viewSegmentIndex + 1];
      // Return the next segment if it doesn't look like a file extension
      if (!nextSegment.includes('.')) {
        return nextSegment;
      }
    }

    // 3. Fallback: Check if first segment matches listing ID pattern (digits and 'x')
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0];
      if (/^\d+x\d+$/.test(firstSegment)) {
        return firstSegment;
      }
    }

    return null;
  };

  const loadListing = async () => {
    try {
      setLoading(true);
      setError(null);

      const listingId = getListingIdFromUrl();

      if (!listingId) {
        throw new Error('No listing ID found in URL. Please provide a valid listing URL.');
      }

      const { data: listingData, error: listingError } = await supabase
        .from('listing')
        .select(`
          _id,
          "Name",
          "Description",
          "Features - Qty Bedrooms",
          "Features - Qty Bathrooms",
          "Features - Qty Beds",
          "Features - Qty Guests",
          "Kitchen Type",
          "Location - Address",
          "Location - Hood",
          "Location - Borough",
          "host name",
          "💰Nightly Host Rate for 4 nights",
          "💰Nightly Host Rate for 3 nights",
          "💰Nightly Host Rate for 5 nights",
          "Days Available (List of Days)",
          " First Available",
          "Features - Amenities In-Unit",
          "Features - Safety",
          "Features - House Rules",
          "Features - Type of Space",
          "Features - Parking type",
          "Cancellation Policy"
        `)
        .eq('_id', listingId)
        .single();

      if (listingError) throw listingError;
      if (!listingData) throw new Error('Property not found');

      let neighborhood = null;
      if (listingData['Location - Hood']) {
        const { data: hoodData } = await supabase
          .from('zat_geo_hood_mediumlevel')
          .select('Display')
          .eq('_id', listingData['Location - Hood'])
          .single();

        if (hoodData) neighborhood = hoodData.Display;
      }

      let borough = null;
      if (listingData['Location - Borough']) {
        const { data: boroughData } = await supabase
          .from('zat_geo_borough_toplevel')
          .select('"Display Borough"')
          .eq('_id', listingData['Location - Borough'])
          .single();

        if (boroughData) borough = boroughData['Display Borough'];
      }

      let typeOfSpace = null;
      if (listingData['Features - Type of Space']) {
        const { data: typeData } = await supabase
          .from('zat_features_listingtype')
          .select('"Label "')
          .eq('_id', listingData['Features - Type of Space'])
          .single();

        if (typeData) typeOfSpace = typeData['Label '];
      }

      const enrichedListing = {
        ...listingData,
        resolvedNeighborhood: neighborhood,
        resolvedBorough: borough,
        resolvedTypeOfSpace: typeOfSpace
      };

      const { data: photosData } = await supabase
        .from('listing_photo')
        .select('*')
        .eq('Listing', listingId)
        .eq('Active', true)
        .order('SortOrder', { ascending: true, nullsLast: true });

      const sortedPhotos = (photosData || []).sort((a, b) => {
        if (a.toggleMainPhoto) return -1;
        if (b.toggleMainPhoto) return 1;
        if (a.SortOrder !== null && b.SortOrder === null) return -1;
        if (a.SortOrder === null && b.SortOrder !== null) return 1;
        if (a.SortOrder !== null && b.SortOrder !== null) {
          return a.SortOrder - b.SortOrder;
        }
        return a._id.localeCompare(b._id);
      });

      setListing(enrichedListing);
      setPhotos(sortedPhotos);
      document.title = `${enrichedListing.Name} | Split Lease`;

      const urlParams = new URLSearchParams(window.location.search);
      const daysParam = urlParams.get('days');
      if (daysParam) {
        const days = daysParam.split(',').map(d => parseInt(d)).filter(d => !isNaN(d) && d >= 0 && d <= 6);
        if (days.length > 0) {
          setSelectedDays(days);
        }
      }

    } catch (err) {
      console.error('Error loading listing:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (dayIndex) => {
    setSelectedDays(prev => {
      if (prev.includes(dayIndex)) {
        return prev.filter(d => d !== dayIndex);
      } else {
        return [...prev, dayIndex].sort((a, b) => a - b);
      }
    });
  };

  const handleBook = () => {
    console.log('Create proposal clicked');
    alert('Booking functionality will be implemented soon!');
  };

  const handleMessage = () => {
    console.log('Message host clicked');
    alert('Messaging functionality will be implemented soon!');
  };

  const handleCall = () => {
    console.log('Call host clicked');
    alert('Call functionality will be implemented soon!');
  };

  const handleImageClick = (index) => {
    console.log('Image clicked:', index);
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  if (loading) {
    return (
      <>
        <Header />
        <LoadingState />
        <Footer />
      </>
    );
  }

  if (error || !listing) {
    return (
      <>
        <Header />
        <ErrorState message={error} />
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem 1rem',
        minHeight: '60vh'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <a
            href="/search.html"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#5B21B6',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6"></path>
            </svg>
            Back to Search
          </a>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <ShareButton listing={listing} />
            <button
              onClick={handleFavorite}
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                background: 'white',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s'
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill={isFavorited ? '#EF4444' : 'none'}
                stroke={isFavorited ? '#EF4444' : 'currentColor'}
                strokeWidth="2"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
              </svg>
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: '2rem',
          '@media (max-width: 1024px)': {
            gridTemplateColumns: '1fr'
          }
        }}>
          <div>
            <ImageGallery
              photos={photos}
              propertyName={listing.Name}
              onImageClick={handleImageClick}
            />
            <PropertyHeader listing={listing} />
            <PropertyDetails listing={listing} />
            <HostCard
              listing={listing}
              onMessage={handleMessage}
              onCall={handleCall}
            />
            <ReviewsSection />
            <MapSection listing={listing} />

            <div style={{
              marginTop: '2rem',
              padding: '1rem',
              background: '#f9fafb',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}>
              <span>Cancellation Policy: </span>
              <strong>{listing['Cancellation Policy'] || 'Standard'}</strong>
              {' '}
              <a
                href="/policies.html"
                style={{ color: '#5B21B6', textDecoration: 'none' }}
              >
                Read our Standard Policy
              </a>
            </div>
          </div>

          <div>
            <BookingWidget
              listing={listing}
              selectedDays={selectedDays}
              onDayToggle={handleDayToggle}
              onBook={handleBook}
            />
          </div>
        </div>
      </main>
      <Footer />
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
