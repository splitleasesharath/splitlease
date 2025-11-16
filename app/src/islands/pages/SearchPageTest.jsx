/**
 * SearchPageTest - Implementing cascading filter architecture
 * Based on the 4-layer filtering system described in the markdown
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function SearchPageTest() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Filter states
  const [boroughs, setBoroughs] = useState([]);
  const [selectedBorough, setSelectedBorough] = useState('manhattan');
  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState([]);
  const [weekPattern, setWeekPattern] = useState('every-week');
  const [priceTier, setPriceTier] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');

  // Data layers (following the cascading architecture)
  const [primaryFilteredListings, setPrimaryFilteredListings] = useState([]);
  const [secondaryFilteredListings, setSecondaryFilteredListings] = useState([]);
  const [tertiaryFilteredListings, setTertiaryFilteredListings] = useState([]);
  const [displayListings, setDisplayListings] = useState([]);

  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    primary: 0,
    secondary: 0,
    tertiary: 0,
    display: 0
  });

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const WEEK_PATTERNS = {
    'every-week': 'Every week',
    'one-on-off': 'One week on, one week off',
    'two-on-off': 'Two weeks on, two weeks off',
    'one-three-off': 'One week on, three weeks off'
  };

  const PRICE_TIERS = {
    'under-200': { min: 0, max: 200 },
    '200-350': { min: 200, max: 350 },
    '350-500': { min: 350, max: 500 },
    '500-plus': { min: 500, max: 999999 },
    'all': { min: 0, max: 999999 }
  };

  const SORT_OPTIONS = {
    'recommended': { field: '"Created Date"', ascending: false },
    'price-low': { field: '"Standarized Minimum Nightly Price (Filter)"', ascending: true },
    'most-viewed': { field: '"Metrics - Click Counter"', ascending: false },
    'recent': { field: '"Created Date"', ascending: false }
  };

  // ============================================================================
  // LAYER 1: PRIMARY FILTER
  // Borough, Week Pattern, and Sorting
  // ============================================================================

  useEffect(() => {
    async function fetchPrimaryFilter() {
      if (!selectedBorough || boroughs.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log('🔵 LAYER 1: PRIMARY FILTER - Applying borough, week pattern, and sorting');

        // Find borough ID
        const borough = boroughs.find(b => b.value === selectedBorough);
        if (!borough) {
          throw new Error('Borough not found');
        }

        // Build base query
        let query = supabase
          .from('listing')
          .select('_id, Name, "Location - Borough", "Location - Hood", Active, Complete, isForUsability, "Standarized Minimum Nightly Price (Filter)", "Weeks offered", "Metrics - Click Counter", "Created Date"')
          .eq('Active', true)
          .eq('"Location - Borough"', borough.id);

        // Apply week pattern filter
        if (weekPattern !== 'every-week') {
          const weekPatternText = WEEK_PATTERNS[weekPattern];
          if (weekPatternText) {
            query = query.eq('"Weeks offered"', weekPatternText);
          }
        }

        // Apply sorting
        const sortConfig = SORT_OPTIONS[sortBy] || SORT_OPTIONS.recommended;
        query = query.order(sortConfig.field, { ascending: sortConfig.ascending });

        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        console.log(`✅ PRIMARY FILTER: ${data.length} listings (Borough: ${borough.name}, Week: ${weekPattern}, Sort: ${sortBy})`);
        setPrimaryFilteredListings(data);
        setStats(prev => ({ ...prev, primary: data.length }));

      } catch (err) {
        console.error('❌ PRIMARY FILTER ERROR:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrimaryFilter();
  }, [selectedBorough, boroughs, weekPattern, sortBy]);

  // ============================================================================
  // LAYER 2: SECONDARY FILTER
  // Neighborhood filtering
  // ============================================================================

  useEffect(() => {
    console.log('🟢 LAYER 2: SECONDARY FILTER - Applying neighborhood filter');

    if (primaryFilteredListings.length === 0) {
      setSecondaryFilteredListings([]);
      setStats(prev => ({ ...prev, secondary: 0 }));
      return;
    }

    // If no neighborhoods selected, pass through all primary listings
    if (selectedNeighborhoods.length === 0) {
      console.log('   → No neighborhoods selected, passing through all listings');
      setSecondaryFilteredListings(primaryFilteredListings);
      setStats(prev => ({ ...prev, secondary: primaryFilteredListings.length }));
      return;
    }

    // Filter by selected neighborhoods
    const filtered = primaryFilteredListings.filter(listing =>
      selectedNeighborhoods.includes(listing['Location - Hood'])
    );

    console.log(`✅ SECONDARY FILTER: ${filtered.length}/${primaryFilteredListings.length} listings (Neighborhoods: ${selectedNeighborhoods.length} selected)`);
    setSecondaryFilteredListings(filtered);
    setStats(prev => ({ ...prev, secondary: filtered.length }));

  }, [primaryFilteredListings, selectedNeighborhoods]);

  // ============================================================================
  // LAYER 3: TERTIARY FILTER
  // Price filtering
  // ============================================================================

  useEffect(() => {
    console.log('🟡 LAYER 3: TERTIARY FILTER - Applying price filter');

    if (secondaryFilteredListings.length === 0) {
      setTertiaryFilteredListings([]);
      setStats(prev => ({ ...prev, tertiary: 0 }));
      return;
    }

    // If no price filter, pass through all secondary listings
    if (priceTier === 'all') {
      console.log('   → No price filter, passing through all listings');
      setTertiaryFilteredListings(secondaryFilteredListings);
      setStats(prev => ({ ...prev, tertiary: secondaryFilteredListings.length }));
      return;
    }

    // Apply price filter
    const priceRange = PRICE_TIERS[priceTier];
    if (!priceRange) {
      console.log('   → Invalid price tier, passing through all listings');
      setTertiaryFilteredListings(secondaryFilteredListings);
      setStats(prev => ({ ...prev, tertiary: secondaryFilteredListings.length }));
      return;
    }

    const filtered = secondaryFilteredListings.filter(listing => {
      const price = listing['Standarized Minimum Nightly Price (Filter)'] || 0;
      return price >= priceRange.min && price <= priceRange.max;
    });

    console.log(`✅ TERTIARY FILTER: ${filtered.length}/${secondaryFilteredListings.length} listings (Price: ${priceTier})`);
    setTertiaryFilteredListings(filtered);
    setStats(prev => ({ ...prev, tertiary: filtered.length }));

  }, [secondaryFilteredListings, priceTier]);

  // ============================================================================
  // LAYER 4: DISPLAY LAYER with CONDITIONAL ROUTING
  // Decides which data source to display based on active filters
  // ============================================================================

  useEffect(() => {
    console.log('🔴 LAYER 4: DISPLAY LAYER - Routing to correct data source');

    // CONDITIONAL LOGIC (matches the markdown's decision tree)

    // CONDITIONAL 4: Full filtering (Neighborhood + Price)
    if (selectedNeighborhoods.length >= 1 && priceTier !== 'all') {
      console.log('   → CONDITIONAL 4: Neighborhood + Price active → Using TERTIARY filter');
      setDisplayListings(tertiaryFilteredListings);
      setStats(prev => ({ ...prev, display: tertiaryFilteredListings.length }));
      return;
    }

    // CONDITIONAL 3: Price only (no neighborhoods)
    if (priceTier !== 'all' && selectedNeighborhoods.length === 0) {
      console.log('   → CONDITIONAL 3: Price only → Using TERTIARY filter');
      setDisplayListings(tertiaryFilteredListings);
      setStats(prev => ({ ...prev, display: tertiaryFilteredListings.length }));
      return;
    }

    // CONDITIONAL 1/2: Neighborhood only (no price)
    if (selectedNeighborhoods.length >= 1 && priceTier === 'all') {
      console.log('   → CONDITIONAL 1/2: Neighborhood only → Using SECONDARY filter');
      setDisplayListings(secondaryFilteredListings);
      setStats(prev => ({ ...prev, display: secondaryFilteredListings.length }));
      return;
    }

    // DEFAULT: No filters active
    console.log('   → DEFAULT: No filters → Using PRIMARY filter');
    setDisplayListings(primaryFilteredListings);
    setStats(prev => ({ ...prev, display: primaryFilteredListings.length }));

  }, [primaryFilteredListings, secondaryFilteredListings, tertiaryFilteredListings, selectedNeighborhoods, priceTier]);

  // ============================================================================
  // INITIAL SETUP
  // ============================================================================

  // Load boroughs on mount
  useEffect(() => {
    async function loadBoroughs() {
      try {
        const { data, error } = await supabase
          .from('zat_geo_borough_toplevel')
          .select('_id, "Display Borough"')
          .order('"Display Borough"', { ascending: true });

        if (error) throw error;

        const boroughList = data
          .filter(b => b['Display Borough'] && b['Display Borough'].trim())
          .map(b => ({
            id: b._id,
            name: b['Display Borough'].trim(),
            value: b['Display Borough'].trim().toLowerCase()
              .replace(/\s+county\s+nj/i, '')
              .replace(/\s+/g, '-')
          }));

        setBoroughs(boroughList);

        // Set default to Manhattan
        const manhattan = boroughList.find(b => b.value === 'manhattan');
        if (manhattan) {
          setSelectedBorough(manhattan.value);
        }
      } catch (err) {
        console.error('Failed to load boroughs:', err);
      }
    }

    loadBoroughs();
  }, []);

  // Load neighborhoods when borough changes
  useEffect(() => {
    async function loadNeighborhoods() {
      if (!selectedBorough || boroughs.length === 0) return;

      const borough = boroughs.find(b => b.value === selectedBorough);
      if (!borough) return;

      try {
        const { data, error } = await supabase
          .from('zat_geo_hood_mediumlevel')
          .select('_id, Display, "Geo-Borough"')
          .eq('"Geo-Borough"', borough.id)
          .order('Display', { ascending: true });

        if (error) throw error;

        const neighborhoodList = data
          .filter(n => n.Display && n.Display.trim())
          .map(n => ({
            id: n._id,
            name: n.Display.trim(),
            boroughId: n['Geo-Borough']
          }));

        setNeighborhoods(neighborhoodList);
        setSelectedNeighborhoods([]); // Clear selections when borough changes
      } catch (err) {
        console.error('Failed to load neighborhoods:', err);
      }
    }

    loadNeighborhoods();
  }, [selectedBorough, boroughs]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleNeighborhoodToggle = (neighborhoodId) => {
    const isSelected = selectedNeighborhoods.includes(neighborhoodId);
    if (isSelected) {
      setSelectedNeighborhoods(prev => prev.filter(id => id !== neighborhoodId));
    } else {
      setSelectedNeighborhoods(prev => [...prev, neighborhoodId]);
    }
  };

  const handleResetFilters = () => {
    setSelectedNeighborhoods([]);
    setPriceTier('all');
    setSortBy('recommended');
    setWeekPattern('every-week');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{
          color: '#5B21B6',
          fontSize: '32px',
          marginBottom: '10px'
        }}>
          🧪 Cascading Filter Architecture Test
        </h1>
        <p style={{ color: '#666', fontSize: '16px' }}>
          Testing the 4-layer filtering system: Primary → Secondary → Tertiary → Display
        </p>
      </header>

      {/* FILTER CONTROLS */}
      <div style={{
        background: '#f9fafb',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {/* Borough Select */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#374151'
            }}>
              🏙️ Borough
            </label>
            <select
              value={selectedBorough}
              onChange={(e) => setSelectedBorough(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                background: 'white'
              }}
            >
              {boroughs.map(borough => (
                <option key={borough.id} value={borough.value}>
                  {borough.name}
                </option>
              ))}
            </select>
          </div>

          {/* Week Pattern */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#374151'
            }}>
              📅 Week Pattern
            </label>
            <select
              value={weekPattern}
              onChange={(e) => setWeekPattern(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="every-week">Every week</option>
              <option value="one-on-off">One on, one off</option>
              <option value="two-on-off">Two on, two off</option>
              <option value="one-three-off">One on, three off</option>
            </select>
          </div>

          {/* Price Tier */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#374151'
            }}>
              💰 Price Tier
            </label>
            <select
              value={priceTier}
              onChange={(e) => setPriceTier(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="all">All Prices</option>
              <option value="under-200">&lt; $200/night</option>
              <option value="200-350">$200-$350/night</option>
              <option value="350-500">$350-$500/night</option>
              <option value="500-plus">$500+/night</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label style={{
              display: 'block',
              fontWeight: '600',
              marginBottom: '8px',
              fontSize: '14px',
              color: '#374151'
            }}>
              🔢 Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                background: 'white'
              }}
            >
              <option value="recommended">Recommended</option>
              <option value="price-low">Price: Low to High</option>
              <option value="most-viewed">Most Viewed</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>
        </div>

        {/* Neighborhood Multi-Select */}
        <div style={{ marginTop: '16px' }}>
          <label style={{
            display: 'block',
            fontWeight: '600',
            marginBottom: '8px',
            fontSize: '14px',
            color: '#374151'
          }}>
            🏘️ Neighborhoods ({selectedNeighborhoods.length} selected)
          </label>
          <div style={{
            maxHeight: '150px',
            overflowY: 'auto',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            padding: '12px',
            background: 'white'
          }}>
            {neighborhoods.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '14px' }}>
                Loading neighborhoods...
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '8px'
              }}>
                {neighborhoods.map(neighborhood => (
                  <label
                    key={neighborhood.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNeighborhoods.includes(neighborhood.id)}
                      onChange={() => handleNeighborhoodToggle(neighborhood.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{neighborhood.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleResetFilters}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🔄 Reset All Filters
        </button>
      </div>

      {/* FILTER FLOW VISUALIZATION */}
      <div style={{
        background: '#ffffff',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        border: '2px solid #5B21B6'
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          marginBottom: '20px',
          color: '#5B21B6'
        }}>
          📊 Filter Flow Visualization
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px'
        }}>
          {/* Layer 1: Primary */}
          <div style={{
            background: '#dbeafe',
            padding: '16px',
            borderRadius: '8px',
            border: '2px solid #3b82f6'
          }}>
            <div style={{ fontWeight: '700', marginBottom: '8px', color: '#1e40af' }}>
              🔵 Layer 1: Primary
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>
              {stats.primary}
            </div>
            <div style={{ fontSize: '12px', color: '#1e40af', marginTop: '4px' }}>
              Borough + Week + Sort
            </div>
          </div>

          {/* Layer 2: Secondary */}
          <div style={{
            background: '#d1fae5',
            padding: '16px',
            borderRadius: '8px',
            border: '2px solid #10b981'
          }}>
            <div style={{ fontWeight: '700', marginBottom: '8px', color: '#065f46' }}>
              🟢 Layer 2: Secondary
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#065f46' }}>
              {stats.secondary}
            </div>
            <div style={{ fontSize: '12px', color: '#065f46', marginTop: '4px' }}>
              + Neighborhoods
            </div>
          </div>

          {/* Layer 3: Tertiary */}
          <div style={{
            background: '#fef3c7',
            padding: '16px',
            borderRadius: '8px',
            border: '2px solid #f59e0b'
          }}>
            <div style={{ fontWeight: '700', marginBottom: '8px', color: '#92400e' }}>
              🟡 Layer 3: Tertiary
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#92400e' }}>
              {stats.tertiary}
            </div>
            <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
              + Price
            </div>
          </div>

          {/* Layer 4: Display */}
          <div style={{
            background: '#fee2e2',
            padding: '16px',
            borderRadius: '8px',
            border: '2px solid #ef4444'
          }}>
            <div style={{ fontWeight: '700', marginBottom: '8px', color: '#991b1b' }}>
              🔴 Layer 4: Display
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#991b1b' }}>
              {stats.display}
            </div>
            <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>
              Final Output
            </div>
          </div>
        </div>

        {/* Active Conditional Indicator */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: '#f3f4f6',
          borderRadius: '8px',
          border: '1px solid #d1d5db'
        }}>
          <div style={{ fontWeight: '700', marginBottom: '8px', fontSize: '14px' }}>
            🎯 Active Conditional:
          </div>
          <div style={{ fontSize: '16px', color: '#374151' }}>
            {selectedNeighborhoods.length >= 1 && priceTier !== 'all' && (
              <span>✅ CONDITIONAL 4: Neighborhood + Price → Using TERTIARY filter</span>
            )}
            {priceTier !== 'all' && selectedNeighborhoods.length === 0 && (
              <span>✅ CONDITIONAL 3: Price only → Using TERTIARY filter</span>
            )}
            {selectedNeighborhoods.length >= 1 && priceTier === 'all' && (
              <span>✅ CONDITIONAL 1/2: Neighborhood only → Using SECONDARY filter</span>
            )}
            {selectedNeighborhoods.length === 0 && priceTier === 'all' && (
              <span>✅ DEFAULT: No filters → Using PRIMARY filter</span>
            )}
          </div>
        </div>
      </div>

      {/* LISTINGS TABLE */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          Loading...
        </div>
      )}

      {error && (
        <div style={{
          background: '#fee2e2',
          padding: '20px',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '24px'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!isLoading && !error && displayListings.length === 0 && (
        <div style={{
          background: '#f3f4f6',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>No Listings Found</h3>
          <p>Try adjusting your filters</p>
          <button
            onClick={handleResetFilters}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              background: '#5B21B6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {!isLoading && !error && displayListings.length > 0 && (
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '16px',
            color: '#111827'
          }}>
            📋 Listings (showing {displayListings.length})
          </h2>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid #e5e7eb'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>#</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Price</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Week Pattern</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Active</th>
                </tr>
              </thead>
              <tbody>
                {displayListings.slice(0, 50).map((listing, i) => (
                  <tr
                    key={listing._id}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      transition: 'background 0.2s'
                    }}
                  >
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{i + 1}</td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>
                      {listing.Name}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#059669', fontWeight: '600' }}>
                      ${listing['Standarized Minimum Nightly Price (Filter)'] || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                      {listing['Weeks offered'] || 'Every week'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px' }}>
                      {listing.Active ? (
                        <span style={{ color: '#059669', fontWeight: '600' }}>✅ Yes</span>
                      ) : (
                        <span style={{ color: '#dc2626', fontWeight: '600' }}>❌ No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {displayListings.length > 50 && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#f9fafb',
              borderRadius: '8px',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              Showing first 50 of {displayListings.length} total listings
            </div>
          )}
        </div>
      )}

      {/* CONSOLE INSTRUCTIONS */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: '#eff6ff',
        borderRadius: '8px',
        border: '1px solid #bfdbfe'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#1e40af' }}>
          ℹ️ How to Test the Cascading Filters
        </h3>
        <ol style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', lineHeight: '1.8' }}>
          <li>Open browser DevTools (F12) and check the Console tab</li>
          <li>Change filters and watch the cascading flow in console logs</li>
          <li>Observe how each layer builds on the previous layer</li>
          <li>See which conditional is active in the "Active Conditional" box</li>
          <li>Notice how the filter counts change through each layer</li>
        </ol>
      </div>
    </div>
  );
}
