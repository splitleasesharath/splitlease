/**
 * React hook for using the listing local store
 *
 * Provides reactive access to the store with automatic re-renders on state changes.
 */

import { useState, useEffect, useCallback } from 'react';
import { listingLocalStore, type StoreState } from './listingLocalStore';
import type { ListingFormData } from '../types/listing.types';

interface UseListingStoreReturn {
  // State
  formData: ListingFormData;
  lastSaved: Date | null;
  isDirty: boolean;
  stagingStatus: StoreState['stagingStatus'];
  errors: string[];

  // Update functions
  updateFormData: (data: Partial<ListingFormData>) => void;
  updateSpaceSnapshot: (data: ListingFormData['spaceSnapshot']) => void;
  updateFeatures: (data: ListingFormData['features']) => void;
  updateLeaseStyles: (data: ListingFormData['leaseStyles']) => void;
  updatePricing: (data: ListingFormData['pricing']) => void;
  updateRules: (data: ListingFormData['rules']) => void;
  updatePhotos: (data: ListingFormData['photos']) => void;
  updateReview: (data: ListingFormData['review']) => void;

  // Navigation
  setCurrentSection: (section: number) => void;
  markSectionComplete: (section: number) => void;

  // Persistence
  saveDraft: () => boolean;
  stageForSubmission: () => { success: boolean; errors: string[] };
  getStagedData: () => ListingFormData | null;

  // Submission status
  markSubmitting: () => void;
  markSubmitted: () => void;
  markSubmissionFailed: (error: string) => void;
  clearStagingError: () => void;

  // Utilities
  reset: () => void;
  validate: () => string[];
  getDebugSummary: () => object;
}

/**
 * Hook for accessing and updating the listing local store
 */
export function useListingStore(): UseListingStoreReturn {
  const [state, setState] = useState<StoreState>(() => listingLocalStore.getState());

  // Subscribe to store updates
  useEffect(() => {
    // Initialize the store (loads from localStorage)
    const initialState = listingLocalStore.initialize();
    setState(initialState);

    // Subscribe to future updates
    const unsubscribe = listingLocalStore.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  // Memoized update functions
  const updateFormData = useCallback((data: Partial<ListingFormData>) => {
    listingLocalStore.updateData(data);
  }, []);

  const updateSpaceSnapshot = useCallback((data: ListingFormData['spaceSnapshot']) => {
    listingLocalStore.updateSpaceSnapshot(data);
  }, []);

  const updateFeatures = useCallback((data: ListingFormData['features']) => {
    listingLocalStore.updateFeatures(data);
  }, []);

  const updateLeaseStyles = useCallback((data: ListingFormData['leaseStyles']) => {
    listingLocalStore.updateLeaseStyles(data);
  }, []);

  const updatePricing = useCallback((data: ListingFormData['pricing']) => {
    listingLocalStore.updatePricing(data);
  }, []);

  const updateRules = useCallback((data: ListingFormData['rules']) => {
    listingLocalStore.updateRules(data);
  }, []);

  const updatePhotos = useCallback((data: ListingFormData['photos']) => {
    listingLocalStore.updatePhotos(data);
  }, []);

  const updateReview = useCallback((data: ListingFormData['review']) => {
    listingLocalStore.updateReview(data);
  }, []);

  const setCurrentSection = useCallback((section: number) => {
    listingLocalStore.setCurrentSection(section);
  }, []);

  const markSectionComplete = useCallback((section: number) => {
    listingLocalStore.markSectionComplete(section);
  }, []);

  const saveDraft = useCallback(() => {
    return listingLocalStore.saveDraft();
  }, []);

  const stageForSubmission = useCallback(() => {
    return listingLocalStore.stageForSubmission();
  }, []);

  const getStagedData = useCallback(() => {
    return listingLocalStore.getStagedData();
  }, []);

  const markSubmitting = useCallback(() => {
    listingLocalStore.markSubmitting();
  }, []);

  const markSubmitted = useCallback(() => {
    listingLocalStore.markSubmitted();
  }, []);

  const markSubmissionFailed = useCallback((error: string) => {
    listingLocalStore.markSubmissionFailed(error);
  }, []);

  const clearStagingError = useCallback(() => {
    listingLocalStore.clearStagingError();
  }, []);

  const reset = useCallback(() => {
    listingLocalStore.reset();
  }, []);

  const validate = useCallback(() => {
    return listingLocalStore.validateForSubmission();
  }, []);

  const getDebugSummary = useCallback(() => {
    return listingLocalStore.getDebugSummary();
  }, []);

  return {
    // State
    formData: state.data,
    lastSaved: state.lastSaved,
    isDirty: state.isDirty,
    stagingStatus: state.stagingStatus,
    errors: state.errors,

    // Update functions
    updateFormData,
    updateSpaceSnapshot,
    updateFeatures,
    updateLeaseStyles,
    updatePricing,
    updateRules,
    updatePhotos,
    updateReview,

    // Navigation
    setCurrentSection,
    markSectionComplete,

    // Persistence
    saveDraft,
    stageForSubmission,
    getStagedData,

    // Submission status
    markSubmitting,
    markSubmitted,
    markSubmissionFailed,
    clearStagingError,

    // Utilities
    reset,
    validate,
    getDebugSummary,
  };
}
