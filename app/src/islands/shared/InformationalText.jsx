/**
 * InformationalText Component - Price Information Modal
 *
 * Shows detailed pricing breakdown for a listing when user clicks the info icon.
 * Displays all available price tiers (2, 3, 4, 5, 7 nights) and highlights current selection.
 *
 * @module InformationalText
 */

import { useState, useEffect, useRef } from 'react';

export default function InformationalText({ isOpen, onClose, listing, selectedDaysCount }) {
  const modalRef = useRef(null);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Get all available price tiers
  const priceTiers = [
    { nights: 2, price: listing['Price 2 nights selected'] },
    { nights: 3, price: listing['Price 3 nights selected'] },
    { nights: 4, price: listing['Price 4 nights selected'] },
    { nights: 5, price: listing['Price 5 nights selected'] },
    { nights: 7, price: listing['Price 7 nights selected'] }
  ].filter(tier => tier.price !== null && tier.price !== undefined);

  const startingPrice = listing['Starting nightly price'] || listing.price?.starting || 0;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div
        ref={modalRef}
        className="info-modal"
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#3b82f6">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1a202c',
              margin: 0
            }}>
              Pricing Information
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              color: '#6b7280',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#f3f4f6';
              e.target.style.color = '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.color = '#6b7280';
            }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {/* Starting Price */}
          <div style={{
            background: '#f0f7ff',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '0.25rem'
            }}>
              Starting Price (Minimum)
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#5B21B6'
            }}>
              ${startingPrice.toFixed(2)}/night
            </div>
          </div>

          {/* Price Tiers Table */}
          <div>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1a202c',
              marginBottom: '0.75rem',
              marginTop: 0
            }}>
              Available Price Tiers
            </h4>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1rem',
              marginTop: 0,
              lineHeight: '1.5'
            }}>
              Pricing varies based on how many nights per week you select. The more nights you commit to, the better the nightly rate.
            </p>

            {priceTiers.length > 0 ? (
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {priceTiers.map((tier, index) => {
                  const isSelected = selectedDaysCount === tier.nights;
                  return (
                    <div
                      key={tier.nights}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.875rem 1rem',
                        background: isSelected ? '#f0f7ff' : 'white',
                        borderBottom: index < priceTiers.length - 1 ? '1px solid #e5e7eb' : 'none',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="#3b82f6">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                        <span style={{
                          fontSize: '0.938rem',
                          fontWeight: isSelected ? '600' : '400',
                          color: isSelected ? '#1e40af' : '#1a202c'
                        }}>
                          {tier.nights} nights/week
                        </span>
                      </div>
                      <div style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: isSelected ? '#5B21B6' : '#1a202c'
                      }}>
                        ${tier.price.toFixed(2)}/night
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: '1.5rem',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '0.875rem',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                No pricing tiers available for this listing
              </div>
            )}
          </div>

          {/* Explanation */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '8px',
            fontSize: '0.813rem',
            color: '#4b5563',
            lineHeight: '1.6'
          }}>
            <strong>How pricing works:</strong> Select the days you want to use the space using the schedule selector above. The price updates automatically based on how many nights per week you select. Longer commitments typically offer better nightly rates.
          </div>
        </div>
      </div>
    </div>
  );
}
