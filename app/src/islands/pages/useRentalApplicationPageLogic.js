/**
 * useRentalApplicationPageLogic - Business logic hook for RentalApplicationPage
 *
 * This hook contains ALL business logic for the rental application form:
 * - Form state management (via localStorage-backed store)
 * - Validation logic
 * - Progress tracking
 * - File upload handling
 * - Verification status tracking
 * - Auto-save functionality (delegated to store)
 * - Form submission (via Edge Function)
 *
 * Architecture (per Four-Layer Logic Architecture):
 * - State management and orchestration
 * - Delegates validation to rules
 * - Handles data transformation
 *
 * UPDATED: Now uses localStorage-backed store for persistence
 * and submits via bubble-proxy Edge Function (submit_rental_application action)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import { checkAuthStatus, getSessionId, getAuthToken } from '../../lib/auth.js';
import { useRentalApplicationStore } from './RentalApplicationPage/store/index.ts';
import { mapDatabaseToFormData } from './RentalApplicationPage/utils/rentalApplicationFieldMapper.ts';

// Extend window interface for Google Maps
// @ts-ignore
window.google = window.google || {};

// Required fields for base progress calculation
const REQUIRED_FIELDS = [
  'fullName',
  'dob',
  'email',
  'phone',
  'currentAddress',
  'lengthResided',
  'employmentStatus',
  'signature',
  'renting'
];

// Conditional required fields based on employment status (matching Bubble application)
// Full-time, Part-time, Intern: show employer fields
// Business Owner: show business fields
// Student, Unemployed, Other: show alternate guarantee upload
const CONDITIONAL_REQUIRED_FIELDS = {
  'full-time': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'part-time': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'intern': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'business-owner': ['businessName', 'businessYear', 'businessState']
  // student, unemployed, other: no required fields, just optional alternate guarantee
};

// Relationship options for occupants
const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Select relationship' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'partner', label: 'Partner' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'roommate', label: 'Roommate' },
  { value: 'other', label: 'Other' }
];

// Employment status options (matching Bubble application)
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: 'Select employment status' },
  { value: 'full-time', label: 'Full-time Employee' },
  { value: 'part-time', label: 'Part-time Employee' },
  { value: 'business-owner', label: 'Business Owner' },
  { value: 'intern', label: 'Intern' },
  { value: 'student', label: 'Student' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'other', label: 'Other' }
];

const MAX_OCCUPANTS = 6;

export function useRentalApplicationPageLogic() {
  // ============================================================================
  // STORE INTEGRATION
  // ============================================================================

  // Use the localStorage-backed store for form data, occupants, and verification status
  const store = useRentalApplicationStore();

  // Destructure store state for convenience
  const {
    formData,
    occupants,
    verificationStatus,
    isDirty,
    lastSaved,
    updateFormData,
    updateField,
    setOccupants,
    addOccupant: storeAddOccupant,
    removeOccupant: storeRemoveOccupant,
    updateOccupant: storeUpdateOccupant,
    updateVerificationStatus,
    reset: resetStore,
    loadFromDatabase,
  } = store;

  // ============================================================================
  // LOCAL STATE (non-persistent)
  // ============================================================================

  // Verification loading states (transient, not persisted)
  const [verificationLoading, setVerificationLoading] = useState({
    linkedin: false,
    facebook: false,
    id: false,
    income: false
  });

  // File uploads (cannot be serialized to localStorage)
  const [uploadedFiles, setUploadedFiles] = useState({
    employmentProof: null,
    alternateGuarantee: null,
    altGuarantee: null,
    creditScore: null,
    references: []
  });

  // Field validation states
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldValid, setFieldValid] = useState({});

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Track if user data has been pre-populated
  const hasPrePopulated = useRef(false);

  // Track if application data has been loaded from database
  const hasLoadedFromDatabase = useRef(false);

  // Loading state for database fetch
  const [isLoadingFromDatabase, setIsLoadingFromDatabase] = useState(true);

  // Track if this is a previously submitted application
  const [isSubmittedApplication, setIsSubmittedApplication] = useState(false);

  // Address autocomplete refs
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  // Calculate progress percentage
  const calculateProgress = useCallback(() => {
    const employmentStatus = formData.employmentStatus;
    let totalFields = [...REQUIRED_FIELDS];

    // Add conditional fields based on employment status
    if (employmentStatus && CONDITIONAL_REQUIRED_FIELDS[employmentStatus]) {
      totalFields = [...totalFields, ...CONDITIONAL_REQUIRED_FIELDS[employmentStatus]];
    }

    let completedFields = 0;

    totalFields.forEach(fieldId => {
      const value = formData[fieldId];
      if (value !== undefined && value !== null && value !== '') {
        completedFields++;
      }
    });

    return Math.round((completedFields / totalFields.length) * 100);
  }, [formData]);

  const progress = calculateProgress();
  const canSubmit = progress >= 80;

  // Document status for sidebar
  const documentStatus = {
    employment: uploadedFiles.employmentProof !== null || uploadedFiles.alternateGuarantee !== null,
    creditScore: uploadedFiles.creditScore !== null,
    signature: formData.signature.trim() !== ''
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateField = useCallback((fieldName, value) => {
    let isValid = false;
    const trimmedValue = typeof value === 'string' ? value.trim() : value;

    // If empty and not required, skip validation
    const isRequired = REQUIRED_FIELDS.includes(fieldName) ||
      (CONDITIONAL_REQUIRED_FIELDS[formData.employmentStatus] || []).includes(fieldName);

    if (!trimmedValue && !isRequired) {
      return { isValid: true, error: null };
    }

    switch (fieldName) {
      case 'email':
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue);
        break;
      case 'phone':
      case 'employerPhone':
        isValid = trimmedValue.length >= 10;
        break;
      case 'dob':
        isValid = trimmedValue !== '' && !isNaN(Date.parse(trimmedValue));
        break;
      case 'monthlyIncome':
      case 'monthlyIncomeSelf':
      case 'businessYear':
        isValid = trimmedValue !== '' && !isNaN(parseFloat(trimmedValue));
        break;
      default:
        isValid = trimmedValue.length > 0;
    }

    return {
      isValid,
      error: isValid ? null : `Invalid ${fieldName}`
    };
  }, [formData.employmentStatus]);

  const validateAllFields = useCallback(() => {
    const employmentStatus = formData.employmentStatus;
    let allFields = [...REQUIRED_FIELDS];

    if (employmentStatus && CONDITIONAL_REQUIRED_FIELDS[employmentStatus]) {
      allFields = [...allFields, ...CONDITIONAL_REQUIRED_FIELDS[employmentStatus]];
    }

    let isValid = true;
    const errors = {};

    allFields.forEach(fieldName => {
      const value = formData[fieldName];
      const result = validateField(fieldName, value);
      if (!result.isValid) {
        isValid = false;
        errors[fieldName] = result.error;
      }
    });

    setFieldErrors(errors);
    return isValid;
  }, [formData, validateField]);

  // ============================================================================
  // HANDLERS - Form Input
  // ============================================================================

  const handleInputChange = useCallback((fieldName, value) => {
    updateField(fieldName, value);

    // Clear error for this field
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, [updateField]);

  const handleInputBlur = useCallback((fieldName) => {
    const value = formData[fieldName];
    const result = validateField(fieldName, value);

    if (result.isValid) {
      setFieldValid(prev => ({ ...prev, [fieldName]: true }));
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    } else if (value) {
      setFieldValid(prev => ({ ...prev, [fieldName]: false }));
      setFieldErrors(prev => ({ ...prev, [fieldName]: result.error }));
    }
  }, [formData, validateField]);

  const handleToggleChange = useCallback((fieldName) => {
    const currentValue = formData[fieldName];
    updateField(fieldName, !currentValue);
  }, [formData, updateField]);

  const handleRadioChange = useCallback((fieldName, value) => {
    updateField(fieldName, value);
  }, [updateField]);

  // ============================================================================
  // HANDLERS - Occupants (delegated to store)
  // ============================================================================

  const addOccupant = useCallback(() => {
    if (occupants.length >= MAX_OCCUPANTS) {
      console.warn(`Maximum ${MAX_OCCUPANTS} occupants allowed`);
      return;
    }

    const newOccupant = {
      id: `occupant-${Date.now()}`,
      name: '',
      relationship: ''
    };

    storeAddOccupant(newOccupant);
  }, [occupants.length, storeAddOccupant]);

  const removeOccupant = useCallback((occupantId) => {
    storeRemoveOccupant(occupantId);
  }, [storeRemoveOccupant]);

  const updateOccupant = useCallback((occupantId, field, value) => {
    storeUpdateOccupant(occupantId, field, value);
  }, [storeUpdateOccupant]);

  // ============================================================================
  // HANDLERS - File Uploads (local state, not persisted)
  // ============================================================================

  const handleFileUpload = useCallback((uploadKey, files, multiple = false) => {
    if (!files || files.length === 0) return;

    if (multiple) {
      setUploadedFiles(prev => ({
        ...prev,
        [uploadKey]: [...(prev[uploadKey] || []), ...Array.from(files)]
      }));
    } else {
      setUploadedFiles(prev => ({
        ...prev,
        [uploadKey]: files[0]
      }));
    }
  }, []);

  const handleFileRemove = useCallback((uploadKey, fileIndex = null) => {
    if (fileIndex !== null) {
      // Remove specific file from array
      setUploadedFiles(prev => ({
        ...prev,
        [uploadKey]: prev[uploadKey].filter((_, idx) => idx !== fileIndex)
      }));
    } else {
      // Remove single file
      setUploadedFiles(prev => ({
        ...prev,
        [uploadKey]: null
      }));
    }
  }, []);

  // ============================================================================
  // HANDLERS - Verification
  // ============================================================================

  const handleVerification = useCallback(async (service) => {
    setVerificationLoading(prev => ({ ...prev, [service]: true }));

    // Simulate verification API call
    // In production, this would be real OAuth flows or verification services
    await new Promise(resolve => setTimeout(resolve, 1500));

    updateVerificationStatus(service, true);
    setVerificationLoading(prev => ({ ...prev, [service]: false }));
  }, [updateVerificationStatus]);

  // ============================================================================
  // PRE-POPULATION (User Data)
  // ============================================================================

  // Pre-populate form with user data when logged in
  useEffect(() => {
    async function fetchAndPopulateUserData() {
      // Only run once
      if (hasPrePopulated.current) return;

      try {
        // Check if user is authenticated
        const isAuthenticated = await checkAuthStatus();
        if (!isAuthenticated) {
          console.log('[RentalApplication] User not authenticated, skipping pre-population');
          return;
        }

        // Get user ID from session
        const userId = getSessionId();
        if (!userId) {
          console.log('[RentalApplication] No user ID found, skipping pre-population');
          return;
        }

        console.log('[RentalApplication] Fetching user data for pre-population...');

        // Fetch user data from Supabase
        const { data: userData, error } = await supabase
          .from('user')
          .select('*')
          .eq('_id', userId)
          .single();

        if (error) {
          console.error('[RentalApplication] Error fetching user data:', error);
          return;
        }

        if (!userData) {
          console.log('[RentalApplication] No user data found');
          return;
        }

        console.log('[RentalApplication] User data fetched:', userData);

        // Check both email columns - some users have email in 'email', others in 'email as text'
        const userEmail = userData['email'] || userData['email as text'] || '';

        // Build full name from first + last if full name not available
        let fullName = userData['Name - Full'] || '';
        if (!fullName && (userData['Name - First'] || userData['Name - Last'])) {
          fullName = [userData['Name - First'], userData['Name - Last']]
            .filter(Boolean)
            .join(' ');
        }

        // Format date of birth for date input (YYYY-MM-DD)
        let dob = '';
        if (userData['Date of Birth']) {
          try {
            const dobDate = new Date(userData['Date of Birth']);
            if (!isNaN(dobDate.getTime())) {
              dob = dobDate.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('[RentalApplication] Could not parse date of birth:', e);
          }
        }

        // Pre-populate form fields (only if not already filled in store)
        const updates = {};
        if (!formData.fullName && fullName) updates.fullName = fullName;
        if (!formData.email && userEmail) updates.email = userEmail;
        if (!formData.phone && userData['Phone Number (as text)']) updates.phone = userData['Phone Number (as text)'];
        if (!formData.dob && dob) updates.dob = dob;

        if (Object.keys(updates).length > 0) {
          updateFormData(updates);
          console.log('[RentalApplication] Pre-populated with user data:', updates);
        }

        hasPrePopulated.current = true;
      } catch (error) {
        console.error('[RentalApplication] Error in fetchAndPopulateUserData:', error);
      }
    }

    fetchAndPopulateUserData();
  }, [formData, updateFormData]);

  // ============================================================================
  // FETCH SAVED RENTAL APPLICATION FROM DATABASE
  // ============================================================================

  // Fetch saved rental application if user has one
  useEffect(() => {
    async function fetchSavedRentalApplication() {
      // Only run once
      if (hasLoadedFromDatabase.current) {
        setIsLoadingFromDatabase(false);
        return;
      }

      try {
        // Check if user is authenticated
        const isAuthenticated = await checkAuthStatus();
        if (!isAuthenticated) {
          console.log('[RentalApplication] User not authenticated, skipping database fetch');
          setIsLoadingFromDatabase(false);
          return;
        }

        // Get user ID from session
        const userId = getSessionId();
        if (!userId) {
          console.log('[RentalApplication] No user ID found, skipping database fetch');
          setIsLoadingFromDatabase(false);
          return;
        }

        // Check if localStorage already has substantial data (draft in progress)
        // If user has been filling out form, don't overwrite with database
        const hasLocalDraft = formData.fullName && formData.signature && isDirty;
        if (hasLocalDraft) {
          console.log('[RentalApplication] Local draft in progress, skipping database fetch');
          setIsLoadingFromDatabase(false);
          hasLoadedFromDatabase.current = true;
          return;
        }

        console.log('[RentalApplication] Checking for saved rental application...');

        // Fetch user record to check for existing rental application
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('_id, "Rental Application"')
          .eq('_id', userId)
          .single();

        if (userError || !userData) {
          console.log('[RentalApplication] User not found or error:', userError);
          setIsLoadingFromDatabase(false);
          hasLoadedFromDatabase.current = true;
          return;
        }

        if (!userData['Rental Application']) {
          console.log('[RentalApplication] User has no saved rental application');
          setIsLoadingFromDatabase(false);
          hasLoadedFromDatabase.current = true;
          return;
        }

        console.log('[RentalApplication] Found saved rental application:', userData['Rental Application']);

        // Fetch full rental application via Edge Function
        const token = getAuthToken();
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rental-application`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            action: 'get',
            payload: { user_id: userId },
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success || !result.data) {
          console.error('[RentalApplication] Failed to fetch application:', result.error);
          setIsLoadingFromDatabase(false);
          hasLoadedFromDatabase.current = true;
          return;
        }

        console.log('[RentalApplication] Loaded rental application data from database');

        // Transform database fields to form fields
        const { formData: mappedFormData, occupants: mappedOccupants } = mapDatabaseToFormData(result.data);

        // Load into store (this will NOT save to localStorage)
        loadFromDatabase(mappedFormData, mappedOccupants);

        // Track if this was a submitted application
        if (result.data.submitted) {
          setIsSubmittedApplication(true);
        }

        hasLoadedFromDatabase.current = true;
        setIsLoadingFromDatabase(false);

      } catch (error) {
        console.error('[RentalApplication] Error fetching saved application:', error);
        setIsLoadingFromDatabase(false);
        hasLoadedFromDatabase.current = true;
      }
    }

    fetchSavedRentalApplication();
  }, [formData.fullName, formData.signature, isDirty, loadFromDatabase]);

  // ============================================================================
  // GOOGLE PLACES AUTOCOMPLETE (for Current Address)
  // ============================================================================

  // Initialize Google Maps Autocomplete for address field
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 50; // Try for 5 seconds

    const initAutocomplete = () => {
      // Check for Google Maps AND the Places library
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        } else {
          console.error('[RentalApplication] Google Maps API failed to load');
        }
        return;
      }

      if (!addressInputRef.current) {
        setTimeout(initAutocomplete, 100);
        return;
      }

      try {
        console.log('[RentalApplication] Initializing Google Maps Autocomplete...');

        // Create autocomplete restricted to US addresses only
        const autocomplete = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ['address'], // Restrict to addresses only
            componentRestrictions: { country: 'us' }, // US addresses only
            fields: ['address_components', 'formatted_address', 'geometry', 'place_id']
          }
        );

        console.log('[RentalApplication] Google Maps Autocomplete initialized (US addresses)');

        // Prevent autocomplete from selecting on Enter key
        window.google.maps.event.addDomListener(addressInputRef.current, 'keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        });

        autocompleteRef.current = autocomplete;

        // Listen for place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          console.log('[RentalApplication] Place selected:', place);

          // If user just pressed Enter without selecting, don't do anything
          if (!place.place_id) {
            console.log('[RentalApplication] No place_id - user did not select from dropdown');
            return;
          }

          if (!place.formatted_address) {
            console.error('[RentalApplication] Invalid place selected');
            return;
          }

          // Update the currentAddress field with the formatted address
          updateField('currentAddress', place.formatted_address);

          // Clear any validation errors
          setFieldErrors(prev => {
            const next = { ...prev };
            delete next['currentAddress'];
            return next;
          });
          setFieldValid(prev => ({ ...prev, currentAddress: true }));

          console.log('[RentalApplication] Address updated:', place.formatted_address);
        });
      } catch (error) {
        console.error('[RentalApplication] Error initializing Google Maps Autocomplete:', error);
      }
    };

    initAutocomplete();

    return () => {
      // Cleanup autocomplete listeners
      if (autocompleteRef.current && window.google && window.google.maps) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [updateField]);

  // ============================================================================
  // NAVIGATION WARNING
  // ============================================================================

  // Warn on navigation when dirty
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // ============================================================================
  // FORM SUBMISSION (via Edge Function)
  // ============================================================================

  const handleSubmit = useCallback(async (event) => {
    if (event) {
      event.preventDefault();
    }

    // Validate all fields
    const isValid = validateAllFields();
    if (!isValid) {
      setSubmitError('Please fill in all required fields correctly.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get auth token and user ID for Edge Function call
      const token = getAuthToken();
      const userId = getSessionId();

      if (!userId) {
        throw new Error('You must be logged in to submit a rental application.');
      }

      // Prepare submission payload with user_id for legacy auth support
      const submissionPayload = {
        ...formData,
        occupants,
        verificationStatus,
        user_id: userId, // Include user_id in payload for legacy Bubble token users
      };

      console.log('[RentalApplication] Submitting via Edge Function:', submissionPayload);
      console.log('[RentalApplication] User ID:', userId);

      // Build headers - include auth token if available
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Call the rental-application Edge Function (Supabase only, no Bubble sync)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rental-application`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'submit',
          payload: submissionPayload,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      console.log('[RentalApplication] Submission successful:', result);

      // Clear localStorage on successful submission
      resetStore();

      setSubmitSuccess(true);
    } catch (error) {
      console.error('[RentalApplication] Submission failed:', error);
      setSubmitError(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, occupants, verificationStatus, validateAllFields, resetStore]);

  // ============================================================================
  // MODAL HANDLERS
  // ============================================================================

  const closeSuccessModal = useCallback(() => {
    setSubmitSuccess(false);
    // Navigate to proposals page
    window.location.href = '/guest-proposals';
  }, []);

  // ============================================================================
  // RETURN PUBLIC API
  // ============================================================================

  return {
    // Form data (from store)
    formData,
    occupants,
    verificationStatus,
    verificationLoading,
    uploadedFiles,

    // Validation
    fieldErrors,
    fieldValid,

    // Computed
    progress,
    canSubmit,
    documentStatus,

    // State
    isDirty,
    isSubmitting,
    submitSuccess,
    submitError,
    lastSaved,
    isLoadingFromDatabase,
    isSubmittedApplication,

    // Constants
    maxOccupants: MAX_OCCUPANTS,
    relationshipOptions: RELATIONSHIP_OPTIONS,
    employmentStatusOptions: EMPLOYMENT_STATUS_OPTIONS,

    // Input handlers
    handleInputChange,
    handleInputBlur,
    handleToggleChange,
    handleRadioChange,

    // Occupant handlers
    addOccupant,
    removeOccupant,
    updateOccupant,

    // File handlers
    handleFileUpload,
    handleFileRemove,

    // Verification handlers
    handleVerification,

    // Form handlers
    handleSubmit,
    closeSuccessModal,

    // Refs (for address autocomplete)
    addressInputRef
  };
}
