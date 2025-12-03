/**
 * MapView Component
 * Interactive map displaying favorited listings with price pins
 * Uses Leaflet for map rendering
 */

import { useEffect, useRef, useState } from 'react';
import './MapView.css';

const MapView = ({
  listings,
  onListingClick,
  selectedListingId
}) => {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    // Load Leaflet CSS and JS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    if (!window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setIsMapLoaded(true);
      document.head.appendChild(script);
    } else {
      setIsMapLoaded(true);
    }
  }, []);

  // Create map instance
  useEffect(() => {
    if (!isMapLoaded || !mapContainerRef.current || mapRef.current) return;

    // Default center: New York City
    const defaultCenter = [40.7128, -74.0060];

    mapRef.current = window.L.map(mapContainerRef.current).setView(defaultCenter, 12);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isMapLoaded]);

  // Update markers when listings change
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    if (listings.length === 0) return;

    const bounds = [];

    // Create markers for each listing
    listings.forEach(listing => {
      const lat = listing.location?.address?.lat;
      const lng = listing.location?.address?.lng;

      if (!lat || !lng) return;

      const position = [lat, lng];
      bounds.push(position);

      // Create custom price pin HTML
      const priceHtml = `
        <div class="price-pin ${selectedListingId === listing.id ? 'selected' : ''}">
          <div class="price-pin-content">
            $${listing.pricingList?.startingNightlyPrice || listing.listerPriceDisplay || 0}
          </div>
          <div class="price-pin-arrow"></div>
        </div>
      `;

      const priceIcon = window.L.divIcon({
        html: priceHtml,
        className: 'price-marker',
        iconSize: [60, 40],
        iconAnchor: [30, 40],
      });

      const marker = window.L.marker(position, { icon: priceIcon })
        .addTo(mapRef.current);

      // Click handler
      marker.on('click', () => {
        onListingClick(listing.id);
      });

      // Popup with listing info
      const popupHtml = `
        <div class="map-popup">
          <h4>${listing.name}</h4>
          <p>${listing.location?.borough || ''}, ${listing.location?.hood || ''}</p>
          <p class="map-popup-price">$${listing.pricingList?.startingNightlyPrice || listing.listerPriceDisplay || 0}/night</p>
          <p class="map-popup-features">
            ${listing.features?.qtyBedrooms || 0} bed • ${listing.features?.qtyBathrooms || 0} bath
          </p>
        </div>
      `;

      marker.bindPopup(popupHtml);

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      const leafletBounds = window.L.latLngBounds(bounds);
      mapRef.current.fitBounds(leafletBounds, {
        padding: [50, 50],
        maxZoom: 14
      });
    }
  }, [listings, isMapLoaded, selectedListingId, onListingClick]);

  return (
    <div className="map-view-container">
      <div
        ref={mapContainerRef}
        className="map-view"
        style={{ height: '100%', width: '100%' }}
      />
      {!isMapLoaded && (
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Loading map...</p>
        </div>
      )}
    </div>
  );
};

export default MapView;
