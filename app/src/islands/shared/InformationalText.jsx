/**
 * InformationalText Component - Simple Info Tooltip
 *
 * Shows a simple informational message in a tooltip that appears below the trigger element.
 * Based on SL16's informational-text-component design.
 *
 * @module InformationalText
 */

import { useState, useEffect, useRef } from 'react';

export default function InformationalText({
  isOpen,
  onClose,
  triggerRef,
  title = 'Information',
  content = '',
  expandedContent = null,
  showMoreAvailable = false,
  // Legacy props for backwards compatibility with pricing tooltip
  listing = null,
  selectedDaysCount = null
}) {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // Debug logging
  console.log('🎯 InformationalText rendered with props:', {
    isOpen,
    title,
    content,
    contentLength: content?.length,
    listing: listing?.id,
    selectedDaysCount
  });

  // Calculate position based on trigger element
  useEffect(() => {
    if (!isOpen || !triggerRef?.current || !tooltipRef.current) return;

    const updatePosition = () => {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      // Center the panel relative to the trigger
      let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

      // Adjust if tooltip goes off right edge
      if (left + tooltipRect.width > viewportWidth - 16) {
        left = viewportWidth - tooltipRect.width - 16;
      }

      // Adjust if tooltip goes off left edge
      if (left < 16) {
        left = 16;
      }

      // Place panel below the trigger
      const top = triggerRect.bottom + window.scrollY + 10;

      setPosition({ top, left: left + window.scrollX });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, triggerRef, isExpanded]);

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
      if (tooltipRef.current && !tooltipRef.current.contains(e.target) &&
          triggerRef?.current && !triggerRef.current.contains(e.target)) {
        onClose();
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  console.log('🎨 Rendering tooltip with state:', { isOpen, content, title });

  // Legacy pricing content logic (for backwards compatibility)
  let displayContent = content;
  let hasExpandedContent = showMoreAvailable;
  let tooltipTitle = title;

  if (listing && selectedDaysCount !== null) {
    // Legacy pricing tooltip mode
    console.log('💰 Pricing tooltip mode activated');
    const priceTiers = [
      { nights: 2, price: listing['Price 2 nights selected'] },
      { nights: 3, price: listing['Price 3 nights selected'] },
      { nights: 4, price: listing['Price 4 nights selected'] },
      { nights: 5, price: listing['Price 5 nights selected'] },
      { nights: 7, price: listing['Price 7 nights selected'] }
    ].filter(tier => tier.price !== null && tier.price !== undefined);

    const startingPrice = listing['Starting nightly price'] || listing.price?.starting || 0;

    // Use database content for the main message
    const mainContent = content || `Rates change with the number of nights booked. Generally, the nightly cost decreases with longer stays. For exact pricing details, check each listing.`;

    const expandedContentText = priceTiers.length > 0
      ? `Price breakdown:\n\n${priceTiers.map(tier => `${tier.nights} nights/week: $${tier.price.toFixed(2)}/night`).join('\n')}\n\nStarting price: $${startingPrice.toFixed(2)}/night`
      : `Starting price: $${startingPrice.toFixed(2)}/night\n\nNo additional pricing tiers available for this listing.`;

    displayContent = isExpanded ? expandedContentText : mainContent;
    hasExpandedContent = priceTiers.length > 0;
    tooltipTitle = title || 'Pricing Information';

    console.log('📋 Display content:', {
      mainContent,
      expandedContentText,
      displayContent,
      hasExpandedContent,
      isExpanded,
      priceTiersCount: priceTiers.length
    });
  } else {
    // New generic mode
    displayContent = isExpanded ? (expandedContent || content) : content;
    hasExpandedContent = showMoreAvailable && expandedContent;
  }

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e5e7eb',
        padding: '1rem',
        width: '100%',
        maxWidth: '28rem',
        zIndex: 10000,
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#3b82f6">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
            {tooltipTitle}
          </h3>
        </div>
        <button
          onClick={() => {
            onClose();
            setIsExpanded(false);
          }}
          style={{
            flexShrink: 0,
            padding: '0.25rem',
            borderRadius: '0.375rem',
            color: '#9ca3af',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#4b5563';
            e.currentTarget.style.background = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#9ca3af';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div style={{ color: '#374151', fontSize: '0.875rem', lineHeight: '1.5' }}>
        <p style={{ marginBottom: '0.5rem', whiteSpace: 'pre-line' }}>{displayContent}</p>
      </div>

      {/* Show More/Less Button */}
      {hasExpandedContent && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            marginTop: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#2563eb',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#2563eb';
          }}
        >
          <span>{isExpanded ? 'Show less' : 'Show more'}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
          </svg>
        </button>
      )}
    </div>
  );
}
