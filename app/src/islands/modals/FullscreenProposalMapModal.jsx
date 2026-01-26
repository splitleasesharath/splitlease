/**
 * FullscreenProposalMapModal Component - v2.0 PROTOCOL REDESIGN
 *
 * A fullscreen map modal that displays all user proposals with price pin markers.
 * The currently selected proposal is highlighted with a distinct purple pin and pulse animation.
 * Other proposals are shown with smaller, lighter purple pins.
 *
 * Design: POPUP_REPLICATION_PROTOCOL - Monochromatic purple color scheme
 * Note: Intentionally remains fullscreen (not bottom sheet) as maps need maximum viewing area.
 *
 * Features:
 * - Google Maps integration with custom price pin overlays
 * - Highlighted pin (purple, larger, pulsing) for current proposal
 * - Normal pins (white, smaller, slightly faded) for other proposals
 * - Proposal selector dropdown in header to switch highlighted proposal
 * - Pin click navigates to that proposal and closes modal
 * - Auto-fit bounds to show all proposal pins
 * - Only shows ACTIVE proposals (filters out cancelled/rejected)
 *
 * Props:
 * - isOpen: boolean - Controls modal visibility
 * - onClose: () => void - Close handler
 * - proposals: Proposal[] - All user proposals for map display
 * - currentProposalId: string - ID of currently highlighted proposal
 * - onProposalSelect: (proposalId: string) => void - Handler when a proposal is selected
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, MapPin } from 'lucide-react';
import { COLORS, getBoroughMapConfig } from '../../lib/constants.js';
import { formatPrice } from '../../lib/proposals/dataTransformers.js';
import { isTerminalStatus } from '../../logic/constants/proposalStatuses.js';
import { isValidCoordinates } from '../../lib/mapUtils.js';
import './FullscreenProposalMapModal.css';

/**
 * Extract coordinates from a proposal's listing
 * Priority: 'Location - slightly different address' (privacy) -> 'Location - Address'
 */
function getProposalCoordinates(proposal) {
  const listing = proposal?.listing;
  if (!listing) return null;

  // Try 'Location - slightly different address' first (privacy-adjusted)
  let locationData = listing['Location - slightly different address'];
  if (!locationData) {
    // Fallback to main address
    locationData = listing['Location - Address'];
  }

  if (!locationData) return null;

  // Parse if it's a JSON string
  if (typeof locationData === 'string') {
    try {
      locationData = JSON.parse(locationData);
    } catch (e) {
      console.warn('FullscreenProposalMapModal: Failed to parse location data:', e);
      return null;
    }
  }

  // Validate coordinates
  if (!locationData?.lat || !locationData?.lng) return null;

  return {
    lat: locationData.lat,
    lng: locationData.lng
  };
}

/**
 * Get proposal price for display
 * Uses counteroffer price if applicable, otherwise original proposal price
 */
function getProposalPrice(proposal) {
  const isCounteroffer = proposal['counter offer happened'];
  return isCounteroffer
    ? proposal['hc nightly price']
    : proposal['proposal nightly price'] || 0;
}

/**
 * Filter proposals to only active ones (not cancelled/rejected/expired)
 */
function filterActiveProposals(proposals) {
  return proposals.filter(proposal => {
    const status = proposal.Status;
    // Filter out terminal statuses (cancelled, rejected, expired)
    return !isTerminalStatus(status);
  });
}

/**
 * Transform proposals into map-friendly format
 */
function transformProposalsForMap(proposals, currentProposalId) {
  return proposals
    .map(proposal => {
      const coordinates = getProposalCoordinates(proposal);
      if (!coordinates || !isValidCoordinates(coordinates)) {
        return null;
      }

      return {
        id: proposal._id,
        coordinates,
        price: getProposalPrice(proposal),
        listingName: proposal.listing?.Name || 'Listing',
        isHighlighted: proposal._id === currentProposalId
      };
    })
    .filter(Boolean);
}

export default function FullscreenProposalMapModal({
  isOpen,
  onClose,
  proposals = [],
  currentProposalId,
  onProposalSelect
}) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProposalId, setSelectedProposalId] = useState(currentProposalId);

  // Filter to only active proposals
  const activeProposals = filterActiveProposals(proposals);

  // Transform proposals for map display
  const mapProposals = transformProposalsForMap(activeProposals, selectedProposalId);

  // Update selected when currentProposalId changes
  useEffect(() => {
    setSelectedProposalId(currentProposalId);
  }, [currentProposalId]);

  /**
   * Handle proposal selection from dropdown
   */
  const handleProposalDropdownChange = useCallback((e) => {
    const newProposalId = e.target.value;
    setSelectedProposalId(newProposalId);
    // Update markers to reflect new highlight
    if (googleMapRef.current && markersRef.current.length > 0) {
      updateMarkerHighlights(newProposalId);
    }
  }, []);

  /**
   * Handle pin click - close modal and navigate to that proposal
   * Shows feedback to user about the selection
   */
  const handlePinClick = useCallback((proposalId) => {
    // Find the proposal name for feedback
    const proposal = activeProposals.find(p => p._id === proposalId);
    const listingName = proposal?.listing?.Name || 'Proposal';

    if (onProposalSelect) {
      onProposalSelect(proposalId);
    }
    onClose();

    // Show brief toast notification using protocol colors
    const toast = document.createElement('div');
    toast.className = 'proposal-selected-toast';
    toast.innerHTML = `<span>✓</span> Viewing: ${listingName}`;
    toast.style.cssText = `
      position: fixed;
      bottom: var(--protocol-space-lg, 24px);
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--protocol-primary, #31135D);
      color: var(--protocol-white, #FFFFFF);
      padding: 12px 20px;
      border-radius: var(--protocol-radius-card, 8px);
      font-family: 'Lato', 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      animation: slideUp 0.3s ease-out;
    `;
    document.body.appendChild(toast);

    // Remove toast after 2 seconds
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }, [onProposalSelect, onClose, activeProposals]);

  /**
   * Update marker highlights when selected proposal changes
   */
  const updateMarkerHighlights = useCallback((highlightedId) => {
    markersRef.current.forEach(marker => {
      if (marker.div) {
        const isHighlighted = marker.proposalId === highlightedId;
        marker.div.className = `proposal-price-marker ${isHighlighted ? 'highlighted' : 'normal'}`;
        marker.div.style.zIndex = isHighlighted ? '1002' : '1001';
      }
    });
  }, []);

  /**
   * Create a custom price marker using OverlayView
   */
  const createProposalPriceMarker = useCallback((map, proposal, onPinClick) => {
    const markerOverlay = new window.google.maps.OverlayView();

    markerOverlay.onAdd = function() {
      const priceTag = document.createElement('div');
      priceTag.innerHTML = `$${Math.round(proposal.price)}`;
      priceTag.className = `proposal-price-marker ${proposal.isHighlighted ? 'highlighted' : 'normal'}`;
      priceTag.dataset.proposalId = proposal.id;

      // Click handler - navigate to proposal
      priceTag.addEventListener('click', (e) => {
        e.stopPropagation();
        onPinClick(proposal.id);
      });

      this.div = priceTag;
      const panes = this.getPanes();
      panes.overlayMouseTarget.appendChild(priceTag);
    };

    markerOverlay.draw = function() {
      if (!this.div) return;

      const projection = this.getProjection();
      if (!projection) return;

      const position = projection.fromLatLngToDivPixel(
        new window.google.maps.LatLng(proposal.coordinates.lat, proposal.coordinates.lng)
      );

      if (this.div && position) {
        this.div.style.transform = `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`;
        this.div.style.left = '0px';
        this.div.style.top = '0px';
      }
    };

    markerOverlay.onRemove = function() {
      if (this.div) {
        this.div.parentNode.removeChild(this.div);
        this.div = null;
      }
    };

    markerOverlay.setMap(map);
    markerOverlay.proposalId = proposal.id;

    return markerOverlay;
  }, []);

  /**
   * Initialize Google Map
   * Uses the same loading pattern as GoogleMap.jsx for consistency
   */
  useEffect(() => {
    if (!isOpen) return;

    const initMap = () => {
      console.log('🗺️ FullscreenProposalMapModal: Initializing map...');

      if (!mapRef.current) {
        console.warn('⚠️ FullscreenProposalMapModal: mapRef not available');
        setIsLoading(false);
        return;
      }

      // Don't recreate map if it already exists
      if (googleMapRef.current) {
        console.log('✅ FullscreenProposalMapModal: Map already exists, skipping init');
        setIsLoading(false);
        return;
      }

      // Get default center
      const defaultMapConfig = getBoroughMapConfig('default');

      // Create map instance
      const map = new window.google.maps.Map(mapRef.current, {
        center: defaultMapConfig.center,
        zoom: defaultMapConfig.zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER
        },
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      googleMapRef.current = map;
      setMapLoaded(true);
      setIsLoading(false);
      console.log('✅ FullscreenProposalMapModal: Map initialized successfully');
    };

    // Check that both google.maps exists AND ControlPosition is available (indicates full load)
    // This is the same pattern used in GoogleMap.jsx
    if (window.google && window.google.maps && window.google.maps.ControlPosition) {
      console.log('✅ FullscreenProposalMapModal: Google Maps API already loaded');
      initMap();
    } else {
      console.log('⏳ FullscreenProposalMapModal: Waiting for Google Maps API to load...');
      setIsLoading(true);
      window.addEventListener('google-maps-loaded', initMap);
      return () => window.removeEventListener('google-maps-loaded', initMap);
    }
  }, [isOpen]);

  /**
   * Reset map state when modal closes
   * This ensures a fresh map is created when modal reopens
   */
  useEffect(() => {
    if (!isOpen) {
      // Clear markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Reset map reference so it gets recreated on next open
      googleMapRef.current = null;
      setMapLoaded(false);
      setIsLoading(true);
    }
  }, [isOpen]);

  /**
   * Create markers when map is loaded and proposals change
   */
  useEffect(() => {
    if (!mapLoaded || !googleMapRef.current || mapProposals.length === 0) return;

    const map = googleMapRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();

    // Create markers for each proposal
    mapProposals.forEach(proposal => {
      const marker = createProposalPriceMarker(map, proposal, handlePinClick);
      markersRef.current.push(marker);
      bounds.extend({ lat: proposal.coordinates.lat, lng: proposal.coordinates.lng });
    });

    // Fit bounds to show all markers
    if (mapProposals.length > 0) {
      map.fitBounds(bounds, { top: 80, bottom: 40, left: 40, right: 40 });

      // Prevent over-zooming on single marker
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 16) map.setZoom(16);
        window.google.maps.event.removeListener(listener);
      });
    }
  }, [mapLoaded, mapProposals, createProposalPriceMarker, handlePinClick]);

  /**
   * Update marker highlights when selectedProposalId changes
   */
  useEffect(() => {
    if (markersRef.current.length > 0) {
      updateMarkerHighlights(selectedProposalId);
    }
  }, [selectedProposalId, updateMarkerHighlights]);

  /**
   * Handle ESC key to close modal
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Get dropdown options for proposal selector
  const proposalOptions = activeProposals.map(p => ({
    id: p._id,
    label: p.listing?.Name || 'Listing'
  }));

  const hasValidProposals = mapProposals.length > 0;

  return (
    <div className="fullscreen-proposal-map-modal-backdrop" onClick={onClose}>
      <div
        className="fullscreen-proposal-map-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="fullscreen-proposal-map-header">
          <div className="fullscreen-proposal-map-header-left">
            <h2 className="fullscreen-proposal-map-title">Your Proposals</h2>
            <span className="fullscreen-proposal-map-subtitle">
              {activeProposals.length} {activeProposals.length === 1 ? 'proposal' : 'proposals'}
            </span>
          </div>

          {/* Proposal Selector Dropdown */}
          {proposalOptions.length > 1 && (
            <div className="fullscreen-proposal-map-selector">
              <label htmlFor="proposal-selector" className="sr-only">Select Proposal</label>
              <select
                id="proposal-selector"
                value={selectedProposalId || ''}
                onChange={handleProposalDropdownChange}
                className="fullscreen-proposal-map-dropdown"
              >
                {proposalOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Close Button */}
          <button
            className="fullscreen-proposal-map-close-btn"
            onClick={onClose}
            aria-label="Close map"
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        {/* Map Container */}
        <div className="fullscreen-proposal-map-container">
          {/* Loading State */}
          {isLoading && (
            <div className="fullscreen-proposal-map-loading">
              <div className="spinner"></div>
              <p>Loading map...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !hasValidProposals && (
            <div className="fullscreen-proposal-map-empty">
              <div className="fullscreen-proposal-map-empty-icon">
                <MapPin size={48} strokeWidth={1.5} />
              </div>
              <p>No proposal locations available</p>
            </div>
          )}

          {/* Google Map */}
          <div
            ref={mapRef}
            className="fullscreen-proposal-map"
            style={{
              display: isLoading || !hasValidProposals ? 'none' : 'block'
            }}
          />
        </div>
      </div>
    </div>
  );
}
