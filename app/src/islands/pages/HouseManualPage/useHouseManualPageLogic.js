/**
 * useHouseManualPageLogic Hook
 *
 * Business logic hook for the House Manual Page.
 * Follows the Hollow Component pattern - all logic lives here,
 * the page component only handles rendering.
 *
 * Responsibilities:
 * - Authentication state management
 * - Listing selection and fetching
 * - House manual data persistence
 * - Toast notifications
 *
 * @module HouseManualPage/useHouseManualPageLogic
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * Auth states enum
 */
const AUTH_STATES = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
};

/**
 * useHouseManualPageLogic - Main logic hook for House Manual page
 */
export function useHouseManualPageLogic() {
  // ============================================================================
  // STATE
  // ============================================================================

  // Authentication
  const [authState, setAuthState] = useState(AUTH_STATES.LOADING);
  const [user, setUser] = useState(null);

  // Listings for selection
  const [listings, setListings] = useState([]);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [isLoadingListings, setIsLoadingListings] = useState(false);

  // House manual data
  const [existingManual, setExistingManual] = useState(null);
  const [isLoadingManual, setIsLoadingManual] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Error state
  const [error, setError] = useState(null);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const selectedListing = useMemo(() => {
    return listings.find((l) => l.id === selectedListingId) || null;
  }, [listings, selectedListingId]);

  const isLoading = authState === AUTH_STATES.LOADING || isLoadingListings;

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setUser(session.user);
          setAuthState(AUTH_STATES.AUTHENTICATED);
        } else {
          setAuthState(AUTH_STATES.UNAUTHENTICATED);
        }
      } catch (err) {
        console.error('[useHouseManualPageLogic] Auth check failed:', err);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setAuthState(AUTH_STATES.AUTHENTICATED);
      } else {
        setUser(null);
        setAuthState(AUTH_STATES.UNAUTHENTICATED);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (authState === AUTH_STATES.UNAUTHENTICATED) {
      window.location.href = '/?login=true';
    }
  }, [authState]);

  // ============================================================================
  // FETCH USER'S LISTINGS
  // ============================================================================

  useEffect(() => {
    if (authState !== AUTH_STATES.AUTHENTICATED || !user) return;

    const fetchListings = async () => {
      setIsLoadingListings(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('listing')
          .select('id, title, main_photo_url, created_at')
          .eq('host_user_id', user.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        setListings(data || []);

        // Auto-select first listing if available
        if (data && data.length > 0 && !selectedListingId) {
          setSelectedListingId(data[0].id);
        }
      } catch (err) {
        console.error('[useHouseManualPageLogic] Failed to fetch listings:', err);
        setError('Failed to load your listings. Please try again.');
      } finally {
        setIsLoadingListings(false);
      }
    };

    fetchListings();
  }, [authState, user, selectedListingId]);

  // ============================================================================
  // FETCH EXISTING HOUSE MANUAL
  // ============================================================================

  useEffect(() => {
    if (!selectedListingId) return;

    const fetchManual = async () => {
      setIsLoadingManual(true);

      try {
        const { data, error: fetchError } = await supabase
          .from('house_manual')
          .select('*')
          .eq('listing_id', selectedListingId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = not found, which is ok
          throw fetchError;
        }

        setExistingManual(data || null);
      } catch (err) {
        console.error('[useHouseManualPageLogic] Failed to fetch house manual:', err);
        // Don't show error for missing manual - it just means they haven't created one yet
      } finally {
        setIsLoadingManual(false);
      }
    };

    fetchManual();
  }, [selectedListingId]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Handle listing selection change
   */
  const handleListingChange = useCallback((listingId) => {
    setSelectedListingId(listingId);
    setExistingManual(null); // Clear existing manual when switching
  }, []);

  /**
   * Save house manual data
   */
  const handleSave = useCallback(async (manualData) => {
    if (!selectedListingId || !user) {
      if (window.showToast) {
        window.showToast('Please select a listing first', 'error');
      }
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        listing_id: selectedListingId,
        user_id: user.id,
        wifi_name: manualData.wifi_name || null,
        wifi_password: manualData.wifi_password || null,
        check_in_instructions: manualData.check_in_instructions || null,
        check_out_instructions: manualData.check_out_instructions || null,
        parking_info: manualData.parking_info || null,
        emergency_contacts: manualData.emergency_contacts || null,
        house_rules: manualData.house_rules || null,
        appliance_instructions: manualData.appliance_instructions || null,
        local_recommendations: manualData.local_recommendations || null,
        additional_notes: manualData.additional_notes || null,
        updated_at: new Date().toISOString(),
      };

      // Upsert - create or update
      const { error: saveError } = await supabase
        .from('house_manual')
        .upsert(payload, {
          onConflict: 'listing_id',
        });

      if (saveError) {
        throw saveError;
      }

      setExistingManual(payload);

      if (window.showToast) {
        window.showToast('House manual saved successfully!', 'success');
      }
    } catch (err) {
      console.error('[useHouseManualPageLogic] Failed to save house manual:', err);
      setError('Failed to save house manual. Please try again.');

      if (window.showToast) {
        window.showToast('Failed to save house manual', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  }, [selectedListingId, user]);

  /**
   * Handle extracted data from AI tools
   */
  const handleDataExtracted = useCallback((data) => {
    console.log('[useHouseManualPageLogic] Data extracted:', data);
    // The data will be managed by AIToolsProvider
    // This handler can be used for additional processing if needed
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Auth state
    authState,
    user,
    isAuthenticated: authState === AUTH_STATES.AUTHENTICATED,

    // Listings
    listings,
    selectedListingId,
    selectedListing,
    handleListingChange,

    // House manual
    existingManual,
    isLoadingManual,
    isSaving,
    handleSave,
    handleDataExtracted,

    // Loading/Error states
    isLoading,
    error,
  };
}

export default useHouseManualPageLogic;
