/**
 * Rental Application Local Memory Store
 *
 * Stores all user form data locally before submitting via Edge Functions.
 * Follows the SelfListingPage store pattern with:
 * - Persistent draft storage across sessions via localStorage
 * - Debounced auto-save (1 second delay)
 * - Pub/Sub pattern for React integration
 * - Data validation before submission
 */

// Storage keys
const STORAGE_KEYS = {
  DRAFT: 'rentalApplicationDraft',
  LAST_SAVED: 'rentalApplicationLastSaved',
} as const;

// Occupant type
export interface Occupant {
  id: string;
  name: string;
  relationship: string;
}

// Verification status type
export interface VerificationStatus {
  linkedin: boolean;
  facebook: boolean;
  id: boolean;
  income: boolean;
}

// Form data interface matching existing useRentalApplicationPageLogic structure
export interface RentalApplicationFormData {
  // Personal Information
  fullName: string;
  dob: string;
  email: string;
  phone: string;
  // Current Address
  currentAddress: string;
  apartmentUnit: string;
  lengthResided: string;
  renting: string;
  // Employment Information
  employmentStatus: string;
  // Employed fields
  employerName: string;
  employerPhone: string;
  jobTitle: string;
  monthlyIncome: string;
  // Self-employed fields
  businessName: string;
  businessYear: string;
  businessState: string;
  monthlyIncomeSelf: string;
  companyStake: string;
  slForBusiness: string;
  taxForms: string;
  // Unemployed/Student fields
  alternateIncome: string;
  // Special requirements (dropdowns: yes/no/empty)
  hasPets: string;
  isSmoker: string;
  needsParking: string;
  // References
  references: string;
  showVisualReferences: boolean;
  showCreditScore: boolean;
  // Signature
  signature: string;
  // File URLs (uploaded to Supabase Storage)
  proofOfEmploymentUrl: string;
  alternateGuaranteeUrl: string;
  creditScoreUrl: string;
  stateIdFrontUrl: string;
  stateIdBackUrl: string;
  governmentIdUrl: string;
}

// Store state type
export interface StoreState {
  formData: RentalApplicationFormData;
  occupants: Occupant[];
  verificationStatus: VerificationStatus;
  lastSaved: Date | null;
  isDirty: boolean;
}

// Default form data
const DEFAULT_FORM_DATA: RentalApplicationFormData = {
  // Personal Information
  fullName: '',
  dob: '',
  email: '',
  phone: '',
  // Current Address
  currentAddress: '',
  apartmentUnit: '',
  lengthResided: '',
  renting: '',
  // Employment Information
  employmentStatus: '',
  // Employed fields
  employerName: '',
  employerPhone: '',
  jobTitle: '',
  monthlyIncome: '',
  // Self-employed fields
  businessName: '',
  businessYear: '',
  businessState: '',
  monthlyIncomeSelf: '',
  companyStake: '',
  slForBusiness: '',
  taxForms: '',
  // Unemployed/Student fields
  alternateIncome: '',
  // Special requirements
  hasPets: '',
  isSmoker: '',
  needsParking: '',
  // References
  references: '',
  showVisualReferences: false,
  showCreditScore: false,
  // Signature
  signature: '',
  // File URLs
  proofOfEmploymentUrl: '',
  alternateGuaranteeUrl: '',
  creditScoreUrl: '',
  stateIdFrontUrl: '',
  stateIdBackUrl: '',
  governmentIdUrl: '',
};

const DEFAULT_VERIFICATION_STATUS: VerificationStatus = {
  linkedin: false,
  facebook: false,
  id: false,
  income: false,
};

/**
 * Local memory store for rental application form data
 */
class RentalApplicationLocalStore {
  private state: StoreState;
  private listeners: Set<(state: StoreState) => void>;
  private autoSaveTimer: ReturnType<typeof setTimeout> | null;
  private readonly AUTO_SAVE_DELAY = 1000; // 1 second debounce

  constructor() {
    this.state = {
      formData: { ...DEFAULT_FORM_DATA },
      occupants: [],
      verificationStatus: { ...DEFAULT_VERIFICATION_STATUS },
      lastSaved: null,
      isDirty: false,
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

        // Restore form data
        if (parsed.formData) {
          this.state.formData = { ...DEFAULT_FORM_DATA, ...parsed.formData };
        }

        // Restore occupants
        if (parsed.occupants) {
          this.state.occupants = parsed.occupants;
        }

        // Restore verification status
        if (parsed.verificationStatus) {
          this.state.verificationStatus = { ...DEFAULT_VERIFICATION_STATUS, ...parsed.verificationStatus };
        }

        this.state.lastSaved = lastSaved ? new Date(lastSaved) : null;
        console.log('[RentalAppStore] Loaded draft from localStorage');
      }

      this.notifyListeners();
      return this.state;
    } catch (error) {
      console.error('[RentalAppStore] Error initializing store:', error);
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
  getFormData(): RentalApplicationFormData {
    return { ...this.state.formData };
  }

  /**
   * Get occupants
   */
  getOccupants(): Occupant[] {
    return [...this.state.occupants];
  }

  /**
   * Get verification status
   */
  getVerificationStatus(): VerificationStatus {
    return { ...this.state.verificationStatus };
  }

  /**
   * Update form data with partial data
   */
  updateFormData(partialData: Partial<RentalApplicationFormData>): void {
    this.state.formData = {
      ...this.state.formData,
      ...partialData,
    };
    this.state.isDirty = true;
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Update a single form field
   */
  updateField(fieldName: keyof RentalApplicationFormData, value: string | boolean): void {
    (this.state.formData as unknown as Record<string, string | boolean>)[fieldName] = value;
    this.state.isDirty = true;
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Set occupants list
   */
  setOccupants(occupants: Occupant[]): void {
    this.state.occupants = [...occupants];
    this.state.isDirty = true;
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Add an occupant
   */
  addOccupant(occupant: Occupant): void {
    this.state.occupants = [...this.state.occupants, occupant];
    this.state.isDirty = true;
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Remove an occupant by ID
   */
  removeOccupant(occupantId: string): void {
    this.state.occupants = this.state.occupants.filter(occ => occ.id !== occupantId);
    this.state.isDirty = true;
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Update an occupant
   */
  updateOccupant(occupantId: string, field: keyof Occupant, value: string): void {
    this.state.occupants = this.state.occupants.map(occ =>
      occ.id === occupantId ? { ...occ, [field]: value } : occ
    );
    this.state.isDirty = true;
    this.scheduleAutoSave();
    this.notifyListeners();
  }

  /**
   * Update verification status
   */
  updateVerificationStatus(service: keyof VerificationStatus, status: boolean): void {
    this.state.verificationStatus = {
      ...this.state.verificationStatus,
      [service]: status,
    };
    this.state.isDirty = true;
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
   */
  saveDraft(): boolean {
    try {
      const dataToSave = {
        formData: this.state.formData,
        occupants: this.state.occupants,
        verificationStatus: this.state.verificationStatus,
      };

      localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(dataToSave));
      localStorage.setItem(STORAGE_KEYS.LAST_SAVED, new Date().toISOString());

      this.state.lastSaved = new Date();
      this.state.isDirty = false;
      console.log('[RentalAppStore] Draft saved to localStorage');
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('[RentalAppStore] Error saving draft:', error);
      // Log but don't fail - localStorage quota exceeded is non-fatal
      return false;
    }
  }

  /**
   * Reset store to default state and clear localStorage
   */
  reset(): void {
    this.state = {
      formData: { ...DEFAULT_FORM_DATA },
      occupants: [],
      verificationStatus: { ...DEFAULT_VERIFICATION_STATUS },
      lastSaved: null,
      isDirty: false,
    };

    localStorage.removeItem(STORAGE_KEYS.DRAFT);
    localStorage.removeItem(STORAGE_KEYS.LAST_SAVED);

    console.log('[RentalAppStore] Store reset to default state');
    this.notifyListeners();
  }

  /**
   * Load data from database (for returning users with submitted applications)
   * This overwrites current store state and marks as not dirty.
   * Does NOT save to localStorage - database is the source of truth for submitted apps.
   */
  loadFromDatabase(
    formData: Partial<RentalApplicationFormData>,
    occupants?: Occupant[],
    verificationStatus?: Partial<VerificationStatus>
  ): void {
    this.state.formData = { ...DEFAULT_FORM_DATA, ...formData };

    if (occupants) {
      this.state.occupants = occupants;
    }

    if (verificationStatus) {
      this.state.verificationStatus = { ...DEFAULT_VERIFICATION_STATUS, ...verificationStatus };
    }

    // Mark as not dirty - data came from database, not user input
    this.state.isDirty = false;
    this.state.lastSaved = null; // No local save - data from DB

    console.log('[RentalAppStore] Loaded data from database');
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
      hasData: !!this.state.formData.fullName,
      fullName: this.state.formData.fullName || '(empty)',
      email: this.state.formData.email || '(empty)',
      employmentStatus: this.state.formData.employmentStatus || '(empty)',
      occupantsCount: this.state.occupants.length,
      hasSignature: !!this.state.formData.signature,
      verificationStatus: this.state.verificationStatus,
      lastSaved: this.state.lastSaved?.toISOString() || 'never',
      isDirty: this.state.isDirty,
    };
  }
}

// Create singleton instance
export const rentalApplicationLocalStore = new RentalApplicationLocalStore();
