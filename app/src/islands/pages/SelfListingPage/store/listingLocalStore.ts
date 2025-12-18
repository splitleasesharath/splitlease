/**
 * Self-Listing Local Memory Store
 *
 * Stores all user selections locally before submitting to Bubble via Edge Functions.
 * This provides:
 * - Persistent draft storage across sessions
 * - Optimistic UI updates
 * - Data validation before submission
 * - Clear staging mechanism for final submission
 */

import type { ListingFormData, PhotoData } from '../types/listing.types';
import { DEFAULT_LISTING_DATA } from '../types/listing.types';

// Storage keys
const STORAGE_KEYS = {
  DRAFT: 'selfListingDraft',
  STAGED: 'selfListingStagedForSubmission',
  LAST_SAVED: 'selfListingLastSaved',
  USER_ID: 'selfListingUserId',
} as const;

// Store state type
interface StoreState {
  data: ListingFormData;
  lastSaved: Date | null;
  isDirty: boolean;
  stagingStatus: 'not_staged' | 'staged' | 'submitting' | 'submitted' | 'failed';
  errors: string[];
}

/**
 * Local memory store for self-listing form data
 */
class ListingLocalStore {
  private state: StoreState;
  private listeners: Set<(state: StoreState) => void>;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null;
  private readonly AUTO_SAVE_DELAY = 1000; // 1 second debounce

  constructor() {
    this.state = {
      data: DEFAULT_LISTING_DATA,
      lastSaved: null,
      isDirty: false,
      stagingStatus: 'not_staged',
      errors: [],
    };
    this.listeners = new Set();
    this.autoSaveTimer = null;
  }

  /**
   * Initialize the store - load from localStorage if available
   */
  initialize(): StoreState {
    try {
      const savedDraft = localStorage.getItem(STORAGE_KEYS.DRAFT);
      const lastSaved = localStorage.getItem(STORAGE_KEYS.LAST_SAVED);

      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        // Restore Date objects for blockedDates
        if (parsed.rules?.blockedDates) {
          parsed.rules.blockedDates = parsed.rules.blockedDates.map(
            (d: string) => new Date(d)
          );
        }
        this.state.data = { ...DEFAULT_LISTING_DATA, ...parsed };
        this.state.lastSaved = lastSaved ? new Date(lastSaved) : null;
        console.log('📂 ListingLocalStore: Loaded draft from localStorage');
      }

      // Check if there's staged data awaiting submission
      const stagedData = localStorage.getItem(STORAGE_KEYS.STAGED);
      if (stagedData) {
        this.state.stagingStatus = 'staged';
        console.log('📦 ListingLocalStore: Found staged data awaiting submission');
      }

      this.notifyListeners();
      return this.state;
    } catch (error) {
      console.error('❌ ListingLocalStore: Error initializing store:', error);
      return this.state;
    }
  }

  /**
   * Get current state
   */
  getState(): StoreState {
    return { ...this.state };
  }

  /**
   * Get form data
   */
  getData(): ListingFormData {
    return { ...this.state.data };
  }

  /**
   * Update form data with partial data
   */
  updateData(partialData: Partial<ListingFormData>): void {
    this.state.data = {
      ...this.state.data,
      ...partialData,
      updatedAt: new Date(),
    };
    this.state.isDirty = true;
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Update a specific section
   */
  updateSection<K extends keyof ListingFormData>(
    section: K,
    data: ListingFormData[K]
  ): void {
    this.state.data = {
      ...this.state.data,
      [section]: data,
      updatedAt: new Date(),
    };
    this.state.isDirty = true;
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Update space snapshot
   */
  updateSpaceSnapshot(data: ListingFormData['spaceSnapshot']): void {
    this.updateSection('spaceSnapshot', data);
  }

  /**
   * Update features
   */
  updateFeatures(data: ListingFormData['features']): void {
    this.updateSection('features', data);
  }

  /**
   * Update lease styles
   */
  updateLeaseStyles(data: ListingFormData['leaseStyles']): void {
    this.updateSection('leaseStyles', data);
  }

  /**
   * Update pricing
   */
  updatePricing(data: ListingFormData['pricing']): void {
    this.updateSection('pricing', data);
  }

  /**
   * Update rules
   */
  updateRules(data: ListingFormData['rules']): void {
    this.updateSection('rules', data);
  }

  /**
   * Update photos
   */
  updatePhotos(data: ListingFormData['photos']): void {
    this.updateSection('photos', data);
  }

  /**
   * Update review data
   */
  updateReview(data: ListingFormData['review']): void {
    this.updateSection('review', data);
  }

  /**
   * Update current section
   */
  setCurrentSection(section: number): void {
    this.state.data.currentSection = section;
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Mark section as completed
   */
  markSectionComplete(section: number): void {
    const completedSections = new Set(this.state.data.completedSections);
    completedSections.add(section);
    this.state.data.completedSections = Array.from(completedSections).sort();
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Schedule auto-save with debounce
   */
  private scheduleAutoSave(): void {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      this.saveDraft();
    }, this.AUTO_SAVE_DELAY);
  }

  /**
   * Manually save draft to localStorage
   * Photos are stored as Supabase URLs (not data URLs), so we only save metadata
   */
  saveDraft(): boolean {
    try {
      const dataToSave = {
        ...this.state.data,
        // Convert Date objects to strings for storage
        rules: {
          ...this.state.data.rules,
          blockedDates: this.state.data.rules.blockedDates.map((d) =>
            d instanceof Date ? d.toISOString() : d
          ),
        },
        // Clean up photos - remove File objects (not serializable) and only keep URL/metadata
        photos: {
          ...this.state.data.photos,
          photos: this.state.data.photos.photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            caption: photo.caption,
            displayOrder: photo.displayOrder,
            storagePath: photo.storagePath,
            // Exclude: file, isUploading, uploadError (transient state)
          })),
        },
      };

      localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(dataToSave));
      localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString());

      this.state.lastSaved = new Date();
      this.state.isDirty = false;
      console.log('💾 ListingLocalStore: Draft saved to localStorage');
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('❌ ListingLocalStore: Error saving draft:', error);
      this.state.errors.push('Failed to save draft');
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Stage data for submission - validates and prepares for API call
   */
  stageForSubmission(): { success: boolean; errors: string[] } {
    const validationErrors = this.validateForSubmission();

    if (validationErrors.length > 0) {
      this.state.errors = validationErrors;
      this.notifyListeners();
      return { success: false, errors: validationErrors };
    }

    // Try to save staged data to localStorage for recovery purposes
    // But don't fail submission if localStorage is full
    try {
      const stagedData = {
        ...this.state.data,
        stagedAt: new Date().toISOString(),
        rules: {
          ...this.state.data.rules,
          blockedDates: this.state.data.rules.blockedDates.map((d) =>
            d instanceof Date ? d.toISOString() : d
          ),
        },
        // Clean up photos - only save URL/metadata, not transient state
        photos: {
          ...this.state.data.photos,
          photos: this.state.data.photos.photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            caption: photo.caption,
            displayOrder: photo.displayOrder,
            storagePath: photo.storagePath,
          })),
        },
      };

      localStorage.setItem(STORAGE_KEYS.STAGED, JSON.stringify(stagedData));
      console.log('📦 ListingLocalStore: Data staged for submission');
    } catch (error) {
      // localStorage quota exceeded - log but continue with submission
      // The data is already in memory and can be submitted
      console.warn('⚠️ ListingLocalStore: Could not stage to localStorage (quota exceeded), continuing with submission');
    }

    this.state.stagingStatus = 'staged';
    this.state.errors = [];
    this.notifyListeners();
    return { success: true, errors: [] };
  }

  /**
   * Get staged data for submission
   */
  getStagedData(): ListingFormData | null {
    try {
      const stagedData = localStorage.getItem(STORAGE_KEYS.STAGED);
      if (stagedData) {
        const parsed = JSON.parse(stagedData);
        // Restore Date objects
        if (parsed.rules?.blockedDates) {
          parsed.rules.blockedDates = parsed.rules.blockedDates.map(
            (d: string) => new Date(d)
          );
        }
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('❌ ListingLocalStore: Error getting staged data:', error);
      return null;
    }
  }

  /**
   * Mark submission as in progress
   */
  markSubmitting(): void {
    this.state.stagingStatus = 'submitting';
    this.notifyListeners();
  }

  /**
   * Mark submission as successful
   */
  markSubmitted(): void {
    this.state.stagingStatus = 'submitted';
    this.state.data.isSubmitted = true;
    this.state.data.isDraft = false;

    // Clear draft and staged data on successful submission
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
    localStorage.removeItem(STORAGE_KEYS.STAGED);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);

    console.log('✅ ListingLocalStore: Submission successful, local data cleared');
    this.notifyListeners();
  }

  /**
   * Mark submission as failed
   */
  markSubmissionFailed(error: string): void {
    this.state.stagingStatus = 'failed';
    this.state.errors.push(error);
    console.error('❌ ListingLocalStore: Submission failed:', error);
    this.notifyListeners();
  }

  /**
   * Clear staging status to allow retry
   */
  clearStagingError(): void {
    this.state.stagingStatus = 'staged';
    this.state.errors = [];
    this.notifyListeners();
  }

  /**
   * Validate form data for submission
   */
  validateForSubmission(): string[] {
    const errors: string[] = [];
    const data = this.state.data;

    // Section 1: Space Snapshot
    if (!data.spaceSnapshot.listingName) {
      errors.push('Listing name is required');
    }
    if (!data.spaceSnapshot.typeOfSpace) {
      errors.push('Type of space is required');
    }
    if (!data.spaceSnapshot.typeOfKitchen) {
      errors.push('Type of kitchen is required');
    }
    if (!data.spaceSnapshot.typeOfParking) {
      errors.push('Type of parking is required');
    }
    if (!data.spaceSnapshot.address.fullAddress || !data.spaceSnapshot.address.validated) {
      errors.push('Valid NYC address is required');
    }

    // Section 2: Features
    if (data.features.amenitiesInsideUnit.length === 0) {
      errors.push('At least one amenity inside unit is required');
    }
    if (!data.features.descriptionOfLodging) {
      errors.push('Description of lodging is required');
    }

    // Section 3: Lease Styles
    if (!data.leaseStyles.rentalType) {
      errors.push('Rental type is required');
    }
    if (data.leaseStyles.rentalType === 'Nightly') {
      const nights = data.leaseStyles.availableNights;
      if (!nights || !Object.values(nights).some((v) => v)) {
        errors.push('At least one available night must be selected');
      }
    }
    if (data.leaseStyles.rentalType === 'Weekly' && !data.leaseStyles.weeklyPattern) {
      errors.push('Weekly pattern is required');
    }

    // Section 4: Pricing
    if (data.pricing.damageDeposit < 500) {
      errors.push('Damage deposit must be at least $500');
    }
    if (data.leaseStyles.rentalType === 'Monthly' && !data.pricing.monthlyCompensation) {
      errors.push('Monthly compensation is required');
    }
    if (data.leaseStyles.rentalType === 'Weekly' && !data.pricing.weeklyCompensation) {
      errors.push('Weekly compensation is required');
    }
    if (
      data.leaseStyles.rentalType === 'Nightly' &&
      !data.pricing.nightlyPricing?.oneNightPrice
    ) {
      errors.push('Nightly pricing is required');
    }

    // Section 5: Rules
    if (!data.rules.cancellationPolicy) {
      errors.push('Cancellation policy is required');
    }
    if (!data.rules.checkInTime) {
      errors.push('Check-in time is required');
    }
    if (!data.rules.checkOutTime) {
      errors.push('Check-out time is required');
    }

    // Section 6: Photos
    if (data.photos.photos.length < data.photos.minRequired) {
      errors.push(`At least ${data.photos.minRequired} photos are required`);
    }

    // Note: agreedToTerms validation removed - terms acceptance is handled
    // during signup/login flow in the SignUpLoginSharedIsland component

    return errors;
  }

  /**
   * Reset store to default state
   */
  reset(): void {
    this.state = {
      data: DEFAULT_LISTING_DATA,
      lastSaved: null,
      isDirty: false,
      stagingStatus: 'not_staged',
      errors: [],
    };

    localStorage.removeItem(STORAGE_KEYS.DRAFT);
    localStorage.removeItem(STORAGE_KEYS.STAGED);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);

    console.log('🔄 ListingLocalStore: Store reset to default state');
    this.notifyListeners();
  }

  /**
   * Subscribe to store updates
   */
  subscribe(listener: (state: StoreState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      listener(this.getState());
    });
  }

  /**
   * Get summary of stored data for debugging
   */
  getDebugSummary(): object {
    return {
      hasData: !!this.state.data,
      listingName: this.state.data.spaceSnapshot.listingName || '(empty)',
      completedSections: this.state.data.completedSections,
      currentSection: this.state.data.currentSection,
      photosCount: this.state.data.photos.photos.length,
      stagingStatus: this.state.stagingStatus,
      lastSaved: this.state.lastSaved?.toISOString() || 'never',
      isDirty: this.state.isDirty,
      errorsCount: this.state.errors.length,
    };
  }
}

// Create singleton instance
export const listingLocalStore = new ListingLocalStore();

// Export types for use in components
export type { StoreState };
