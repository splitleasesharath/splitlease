/**
 * useRentalApplicationWizardLogic.js
 *
 * Business logic hook for the Rental Application Wizard Modal.
 * Reuses the existing rental application localStorage store and
 * adds wizard-specific navigation and step management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { getSessionId } from '../../../lib/auth.js';
import { PROPOSAL_STATUSES } from '../../../logic/constants/proposalStatuses.js';
import { useRentalApplicationStore } from '../../pages/RentalApplicationPage/store/index.ts';
import { mapDatabaseToFormData } from '../../pages/RentalApplicationPage/utils/rentalApplicationFieldMapper.ts';

// Required fields (same as RentalApplicationPage)
// Note: 'renting' removed - low-value information that adds friction
const REQUIRED_FIELDS = [
  'fullName',
  'dob',
  'email',
  'phone',
  'currentAddress',
  'lengthResided',
  'employmentStatus',
  'signature'
];

// Conditional required fields based on employment status
// Note: employerPhone, businessYear, businessState are optional to reduce form friction
const CONDITIONAL_REQUIRED_FIELDS = {
  'full-time': ['employerName', 'jobTitle', 'monthlyIncome'],
  'part-time': ['employerName', 'jobTitle', 'monthlyIncome'],
  'intern': ['employerName', 'jobTitle', 'monthlyIncome'],
  'business-owner': ['businessName']
};

// Fields required by each step
const STEP_FIELDS = {
  1: ['fullName', 'dob', 'email', 'phone'],           // Personal Info
  2: ['currentAddress', 'lengthResided'],              // Address (renting now optional)
  3: [],                                                // Occupants (optional)
  4: ['employmentStatus'],                              // Employment (conditional fields added dynamically)
  5: [],                                                // Requirements (all optional)
  6: [],                                                // Documents (optional)
  7: ['signature'],                                     // Review & Sign
};

// Relationship options for occupants
const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Select relationship' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'partner', label: 'Partner' },
  { value: 'child', label: 'Child' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'brother-sister', label: 'Brother/Sister' },
  { value: 'family-member', label: 'Family Member' },
  { value: 'roommate', label: 'Roommate' },
  { value: 'other', label: 'Other' }
];

// Employment status options
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
const TOTAL_STEPS = 7;

// Stable reference for all steps complete (avoids infinite loops in useEffect)
const ALL_STEPS_COMPLETE = Object.freeze([1, 2, 3, 4, 5, 6, 7]);

// File upload config
const FILE_TYPE_MAP = {
  employmentProof: { urlField: 'proofOfEmploymentUrl', backendType: 'employmentProof' },
  alternateGuarantee: { urlField: 'alternateGuaranteeUrl', backendType: 'alternateGuarantee' },
  creditScore: { urlField: 'creditScoreUrl', backendType: 'creditScore' },
  stateIdFront: { urlField: 'stateIdFrontUrl', backendType: 'stateIdFront' },
  stateIdBack: { urlField: 'stateIdBackUrl', backendType: 'stateIdBack' },
  governmentId: { urlField: 'governmentIdUrl', backendType: 'governmentId' },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Transition SL-suggested proposals from "Awaiting Rental App" to "Host Review"
 * when rental application is submitted.
 *
 * This function finds all proposals for the user that are in the
 * "Awaiting Rental Application" status and transitions them to "Host Review".
 *
 * @param {string} userId - The user's ID
 */
async function transitionSLProposalsOnRentalAppSubmit(userId) {
  if (!userId) return;

  try {
    // Find proposals in "Awaiting Rental Application" status
    const { data: proposals, error: fetchError } = await supabase
      .from('proposal')
      .select('_id, Status')
      .eq('Guest', userId)
      .eq('Status', PROPOSAL_STATUSES.SUGGESTED_PROPOSAL_AWAITING_RENTAL_APP.key);

    if (fetchError) {
      console.error('[RentalAppWizard] Error fetching proposals for transition:', fetchError);
      return;
    }

    if (!proposals || proposals.length === 0) {
      console.log('[RentalAppWizard] No SL proposals to transition');
      return;
    }

    // Transition each proposal to "Host Review"
    const proposalIds = proposals.map(p => p._id);
    console.log(`[RentalAppWizard] Transitioning ${proposalIds.length} SL proposal(s) to Host Review`);

    const { error: updateError } = await supabase
      .from('proposal')
      .update({
        Status: PROPOSAL_STATUSES.HOST_REVIEW.key,
        'Modified Date': new Date().toISOString()
      })
      .in('_id', proposalIds);

    if (updateError) {
      console.error('[RentalAppWizard] Error transitioning proposals:', updateError);
    } else {
      console.log('[RentalAppWizard] Successfully transitioned proposals to Host Review');
    }
  } catch (error) {
    // Non-critical: log but don't block rental app submission
    console.error('[RentalAppWizard] Error in proposal transition:', error);
  }
}

export function useRentalApplicationWizardLogic({ onClose, onSuccess, applicationStatus = 'not_started', userProfileData = null }) {
  // ============================================================================
  // STORE INTEGRATION (reuse existing localStorage store)
  // ============================================================================
  const store = useRentalApplicationStore();
  const {
    formData,
    occupants,
    verificationStatus,
    isDirty,
    updateFormData,
    updateField,
    addOccupant: storeAddOccupant,
    removeOccupant: storeRemoveOccupant,
    updateOccupant: storeUpdateOccupant,
    updateVerificationStatus,
    reset: resetStore,
    loadFromDatabase,
  } = store;

  // ============================================================================
  // WIZARD-SPECIFIC STATE
  // ============================================================================
  const [currentStep, setCurrentStep] = useState(1);
  // For submitted applications, initialize with all steps complete to avoid infinite loops
  const [completedSteps, setCompletedSteps] = useState(() =>
    applicationStatus === 'submitted' ? ALL_STEPS_COMPLETE : []
  );
  // Track which steps the user has actually visited (for optional steps)
  // Step 1 is always visited on initial load
  const [visitedSteps, setVisitedSteps] = useState(() =>
    applicationStatus === 'submitted' ? ALL_STEPS_COMPLETE : [1]
  );
  // Ref to track if we've already initialized for submitted app (prevents re-running effects)
  const hasInitializedSubmittedSteps = useRef(applicationStatus === 'submitted');

  // ============================================================================
  // LOCAL STATE (non-persistent)
  // ============================================================================
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldValid, setFieldValid] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const hasLoadedFromDb = useRef(false);

  // Address autocomplete ref
  const addressInputRef = useRef(null);

  // Track which user profile fields were originally empty (for sync-back feature)
  // This captures the state once when userProfileData arrives
  const emptyUserProfileFields = useRef(null);

  // Track if we've already set the initial step from localStorage data
  const hasSetInitialStep = useRef(false);

  // ============================================================================
  // CALCULATE INITIAL STEP FROM LOADED DATA (for resuming drafts)
  // ============================================================================
  // When form data loads from localStorage, calculate which step user should resume at
  useEffect(() => {
    // Skip if already set initial step or if this is a submitted application
    // (submitted apps will set their own step from database loading)
    if (hasSetInitialStep.current || applicationStatus === 'submitted') {
      return;
    }

    // Check if we have any data loaded (indicating localStorage had a draft)
    const hasLoadedData = formData.fullName || formData.email || formData.phone || formData.dob;
    if (!hasLoadedData) {
      return;
    }

    // Calculate which step to resume at based on completed fields
    // Find the first incomplete step, or go to the step after the last complete one
    const isStep1Complete = formData.fullName && formData.dob && formData.email && formData.phone;
    const isStep2Complete = formData.currentAddress && formData.lengthResided && formData.renting;
    const isStep4Complete = formData.employmentStatus && (
      // Check conditional fields based on employment status
      formData.employmentStatus === 'student' ||
      formData.employmentStatus === 'unemployed' ||
      formData.employmentStatus === 'other' ||
      ((['full-time', 'part-time', 'intern'].includes(formData.employmentStatus)) &&
        formData.employerName && formData.employerPhone && formData.jobTitle && formData.monthlyIncome) ||
      (formData.employmentStatus === 'business-owner' &&
        formData.businessName && formData.businessYear && formData.businessState)
    );

    // Determine starting step
    let startStep = 1;
    if (isStep1Complete) {
      startStep = 2; // Go to Address
      if (isStep2Complete) {
        startStep = 3; // Go to Occupants
        // Steps 3, 5, 6 are optional - check step 4
        if (isStep4Complete) {
          startStep = 5; // Skip to Details (step 4 is done)
        } else {
          startStep = 4; // Go to Work/Employment
        }
      }
    }

    // Mark previous steps as visited (confirmed) - but NOT the current step
    // The current step will be marked visited when user navigates away from it
    const stepsToVisit = [];
    for (let i = 1; i < startStep; i++) {
      stepsToVisit.push(i);
    }

    if (startStep > 1) {
      setCurrentStep(startStep);
      if (stepsToVisit.length > 0) {
        setVisitedSteps(stepsToVisit);
      }
    }

    hasSetInitialStep.current = true;
  }, [applicationStatus, formData.fullName, formData.dob, formData.email, formData.phone,
      formData.currentAddress, formData.lengthResided, formData.renting,
      formData.employmentStatus, formData.employerName, formData.employerPhone,
      formData.jobTitle, formData.monthlyIncome, formData.businessName,
      formData.businessYear, formData.businessState]);

  // ============================================================================
  // DATABASE LOADING (for submitted applications)
  // ============================================================================
  useEffect(() => {
    // Only fetch from database if:
    // 1. Application is submitted (reviewing existing application)
    // 2. Haven't already loaded from database
    if (applicationStatus !== 'submitted' || hasLoadedFromDb.current) {
      return;
    }

    const fetchFromDatabase = async () => {
      setIsLoadingFromDb(true);
      setLoadError(null);

      try {
        const userId = getSessionId();

        if (!userId) {
          throw new Error('User not logged in');
        }

        // Get Supabase session for proper JWT token
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rental-application`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
            },
            body: JSON.stringify({
              action: 'get',
              payload: { user_id: userId },
            }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to load application');
        }

        if (result.data) {
          // Transform database fields to form fields (pass userEmail as fallback)
          // Also returns completedSteps and lastStep calculated from the data
          const {
            formData: mappedFormData,
            occupants: mappedOccupants,
            completedSteps: dbCompletedSteps,
            lastStep: dbLastStep
          } = mapDatabaseToFormData(result.data, userProfileData?.email || '');

          // Load into store (this will update the reactive state)
          loadFromDatabase(mappedFormData, mappedOccupants);

          // For submitted/existing applications being reviewed, mark ALL steps as visited
          // This ensures optional steps show as completed when editing a submitted application
          // Use the stable ALL_STEPS_COMPLETE reference to avoid infinite loops
          setVisitedSteps(ALL_STEPS_COMPLETE);

          // For submitted apps, all steps are complete - use stable reference
          // (dbCompletedSteps is likely undefined now since it was removed from fieldMapper)
          setCompletedSteps(ALL_STEPS_COMPLETE);

          // Navigate to the review step (7) for submitted applications
          // This shows the user their complete application
          if (dbLastStep) {
            setCurrentStep(dbLastStep);
          }

          hasLoadedFromDb.current = true;
        }
      } catch (error) {
        console.error('Error loading rental application from database:', error);
        setLoadError(error.message || 'Failed to load your application');
      } finally {
        setIsLoadingFromDb(false);
      }
    };

    fetchFromDatabase();
  }, [applicationStatus, loadFromDatabase]);

  // ============================================================================
  // PRE-FILL FROM USER PROFILE (for new applications)
  // ============================================================================
  const hasPrefilledFromProfile = useRef(false);

  useEffect(() => {
    // Only pre-fill for new applications that haven't been pre-filled yet
    // Skip if application is submitted (will load from database instead)
    // Skip if form already has data (user typed or localStorage draft exists)
    if (
      applicationStatus === 'submitted' ||
      hasPrefilledFromProfile.current ||
      !userProfileData
    ) {
      return;
    }

    // Build full name from first + last name
    const fullName = [userProfileData.firstName, userProfileData.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Only pre-fill fields that are currently empty
    const fieldsToUpdate = {};

    if (fullName && !formData.fullName) {
      fieldsToUpdate.fullName = fullName;
    }
    if (userProfileData.email && !formData.email) {
      fieldsToUpdate.email = userProfileData.email;
    }
    if (userProfileData.phone && !formData.phone) {
      fieldsToUpdate.phone = userProfileData.phone;
    }
    if (userProfileData.dob && !formData.dob) {
      // DOB from database may be in various formats:
      // - ISO: "1992-08-16T00:00:00.000Z"
      // - Postgres timestamp: "1992-08-16 00:00:00+00"
      // Normalize to YYYY-MM-DD for HTML date input
      const dobValue = String(userProfileData.dob);
      fieldsToUpdate.dob = dobValue.split(/[T\s]/)[0]; // Split on 'T' or space
    }

    // Apply pre-fill if we have any fields to update
    if (Object.keys(fieldsToUpdate).length > 0) {
      updateFormData(fieldsToUpdate);
    }

    hasPrefilledFromProfile.current = true;
  }, [applicationStatus, userProfileData, formData.fullName, formData.email, formData.phone, formData.dob, updateFormData]);

  // ============================================================================
  // SYNC-BACK TO USER TABLE - Track empty fields and sync when filled
  // ============================================================================
  // Capture which user profile fields were originally empty (one-time)
  useEffect(() => {
    if (emptyUserProfileFields.current !== null || !userProfileData) {
      return;
    }

    // Track which fields are empty in the user profile
    // These are candidates for sync-back when the user fills them in the rental app
    emptyUserProfileFields.current = {
      phone: !userProfileData.phone,
      dob: !userProfileData.dob,
    };

    console.log('[RentalAppWizard] Empty user profile fields tracked:', emptyUserProfileFields.current);
  }, [userProfileData]);

  /**
   * Sync filled rental application fields back to user table (if they were originally empty)
   * Mapping:
   *   - phone → 'Phone Number (as text)' in user table
   *   - dob → 'Date of Birth' in user table
   */
  const syncFieldToUserTable = useCallback(async (fieldName, value) => {
    // Skip if no empty fields tracked or field wasn't originally empty
    if (!emptyUserProfileFields.current || !emptyUserProfileFields.current[fieldName]) {
      return;
    }

    // Skip if value is empty
    if (!value || (typeof value === 'string' && !value.trim())) {
      return;
    }

    const userId = getSessionId();
    if (!userId) {
      console.warn('[RentalAppWizard] Cannot sync to user table: no user ID');
      return;
    }

    // Map rental app field names to user table column names
    const fieldMapping = {
      phone: 'Phone Number (as text)',
      dob: 'Date of Birth',
    };

    const dbColumnName = fieldMapping[fieldName];
    if (!dbColumnName) {
      return;
    }

    try {
      const updateData = {
        [dbColumnName]: value,
        'Modified Date': new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user')
        .update(updateData)
        .eq('_id', userId);

      if (error) {
        console.error('[RentalAppWizard] Failed to sync field to user table:', error);
      } else {
        console.log(`[RentalAppWizard] Synced ${fieldName} to user table`);
        // Mark as synced so we don't sync again
        emptyUserProfileFields.current[fieldName] = false;
      }
    } catch (err) {
      console.error('[RentalAppWizard] Error syncing to user table:', err);
    }
  }, []);

  // ============================================================================
  // PROGRESS CALCULATION
  // ============================================================================
  const calculateProgress = useCallback(() => {
    const employmentStatus = formData.employmentStatus;
    let totalFields = [...REQUIRED_FIELDS];

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
  const canSubmit = progress >= 80 && formData.signature?.trim();

  // ============================================================================
  // TRACK STEP VISITS - Mark step as "confirmed" when user LEAVES it
  // For optional steps, checkmark appears only after user moves away (Continue/Skip/Back)
  // ============================================================================
  const previousStepRef = useRef(currentStep);

  useEffect(() => {
    // Skip for submitted apps - all steps already visited
    if (applicationStatus === 'submitted' || hasInitializedSubmittedSteps.current) {
      return;
    }

    const previousStep = previousStepRef.current;

    // When step changes, mark the PREVIOUS step as visited (confirmed)
    if (previousStep !== currentStep && !visitedSteps.includes(previousStep)) {
      setVisitedSteps(prev => [...prev, previousStep]);
    }

    // Update ref for next change
    previousStepRef.current = currentStep;
  }, [currentStep, visitedSteps, applicationStatus]);

  // ============================================================================
  // STEP COMPLETION TRACKING
  // ============================================================================
  // Pure function to check step completion - considers visited state for optional steps
  const checkStepComplete = useCallback((stepNumber, visitedStepsArray) => {
    let stepFields = [...STEP_FIELDS[stepNumber]];

    // Add conditional employment fields for step 4
    if (stepNumber === 4 && formData.employmentStatus) {
      const conditionalFields = CONDITIONAL_REQUIRED_FIELDS[formData.employmentStatus] || [];
      stepFields = [...stepFields, ...conditionalFields];
    }

    // For optional steps (3=Occupants, 5=Details, 6=Documents): only show as complete
    // if user has actually visited them. This prevents showing checkmarks for steps
    // the user hasn't navigated to yet on a new application.
    if (stepFields.length === 0) {
      return visitedStepsArray.includes(stepNumber);
    }

    // Check all required fields have values
    return stepFields.every(field => {
      const value = formData[field];
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData]);

  // Update completed steps when form data or visited steps change
  useEffect(() => {
    // For submitted applications, ALL steps are complete by definition.
    // Skip this effect entirely - state was already initialized with ALL_STEPS_COMPLETE.
    // This prevents infinite loops caused by formData reference changes from the store.
    if (applicationStatus === 'submitted' || hasInitializedSubmittedSteps.current) {
      return;
    }

    const newCompleted = [];
    for (let step = 1; step <= TOTAL_STEPS; step++) {
      if (checkStepComplete(step, visitedSteps)) {
        newCompleted.push(step);
      }
    }
    // Only update if the array actually changed to prevent unnecessary re-renders
    setCompletedSteps(prev => {
      const isSame = prev.length === newCompleted.length &&
        prev.every((v, i) => v === newCompleted[i]);
      return isSame ? prev : newCompleted;
    });
  }, [formData, visitedSteps, checkStepComplete, applicationStatus]);

  // Public API for checking step completion (can use completedSteps cache)
  const isStepComplete = useCallback((stepNumber) => {
    return completedSteps.includes(stepNumber);
  }, [completedSteps]);

  // Check if current step has all required fields filled (for enabling Continue button)
  // This is different from isStepComplete - it only checks required fields, not visited state
  const canProceedFromCurrentStep = useCallback(() => {
    let stepFields = [...STEP_FIELDS[currentStep]];

    // Add conditional employment fields for step 4
    if (currentStep === 4 && formData.employmentStatus) {
      const conditionalFields = CONDITIONAL_REQUIRED_FIELDS[formData.employmentStatus] || [];
      stepFields = [...stepFields, ...conditionalFields];
    }

    // If no required fields, can always proceed (optional steps)
    if (stepFields.length === 0) {
      return true;
    }

    // Check all required fields have values
    return stepFields.every(field => {
      const value = formData[field];
      return value !== undefined && value !== null && value !== '';
    });
  }, [currentStep, formData]);

  // Check if current step is optional (no required fields) - used to show/hide Skip button
  const isCurrentStepOptional = useCallback(() => {
    // Steps 3 (Occupants), 5 (Details), 6 (Documents) are optional
    return STEP_FIELDS[currentStep].length === 0;
  }, [currentStep]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================
  const goToStep = useCallback((stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= TOTAL_STEPS) {
      setCurrentStep(stepNumber);
    }
  }, []);

  const goToNextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  // ============================================================================
  // VALIDATION
  // ============================================================================
  const validateField = useCallback((fieldName, value) => {
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    const isRequired = REQUIRED_FIELDS.includes(fieldName) ||
      (CONDITIONAL_REQUIRED_FIELDS[formData.employmentStatus] || []).includes(fieldName);

    if (!trimmedValue && !isRequired) {
      return { isValid: true, error: null };
    }

    let isValid = false;
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

    return { isValid, error: isValid ? null : `Invalid ${fieldName}` };
  }, [formData.employmentStatus]);

  // ============================================================================
  // HANDLERS - Form Input
  // ============================================================================
  const handleInputChange = useCallback((fieldName, value) => {
    updateField(fieldName, value);
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

      // Sync phone and dob back to user table if they were originally empty
      // Only sync when the field is valid and has a value
      if ((fieldName === 'phone' || fieldName === 'dob') && value) {
        syncFieldToUserTable(fieldName, value);
      }
    } else if (result.error) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: result.error }));
    }
  }, [formData, validateField, syncFieldToUserTable]);

  // ============================================================================
  // HANDLERS - Occupants
  // ============================================================================
  const addOccupant = useCallback(() => {
    if (occupants.length >= MAX_OCCUPANTS) return;
    storeAddOccupant({
      id: `occupant-${Date.now()}`,
      name: '',
      relationship: ''
    });
  }, [occupants.length, storeAddOccupant]);

  const removeOccupant = useCallback((occupantId) => {
    storeRemoveOccupant(occupantId);
  }, [storeRemoveOccupant]);

  const updateOccupant = useCallback((occupantId, field, value) => {
    storeUpdateOccupant(occupantId, field, value);
  }, [storeUpdateOccupant]);

  // ============================================================================
  // HANDLERS - File Upload
  // ============================================================================
  const handleFileUpload = useCallback(async (uploadKey, files) => {
    const file = files[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setUploadErrors(prev => ({
        ...prev,
        [uploadKey]: 'File too large. Maximum size is 10MB.'
      }));
      return;
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setUploadErrors(prev => ({
        ...prev,
        [uploadKey]: 'Invalid file type. Please upload JPEG, PNG, WebP, or PDF.'
      }));
      return;
    }

    // Clear errors
    setUploadErrors(prev => {
      const next = { ...prev };
      delete next[uploadKey];
      return next;
    });

    // Set uploading state
    setUploadProgress(prev => ({ ...prev, [uploadKey]: 'uploading' }));

    try {
      // Convert to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload via Edge Function
      const userId = getSessionId();
      const mapping = FILE_TYPE_MAP[uploadKey];

      // Get Supabase session for proper JWT token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rental-application`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            action: 'upload',
            payload: {
              user_id: userId,
              fileType: mapping.backendType,
              fileName: file.name,
              fileData: base64Data,
              mimeType: file.type,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Store file for preview and URL in formData
      setUploadedFiles(prev => ({ ...prev, [uploadKey]: file }));
      updateFormData({ [mapping.urlField]: result.data.url });
      setUploadProgress(prev => ({ ...prev, [uploadKey]: 'complete' }));

      // Clear progress indicator after delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[uploadKey];
          return next;
        });
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadErrors(prev => ({
        ...prev,
        [uploadKey]: error.message || 'Upload failed. Please try again.'
      }));
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[uploadKey];
        return next;
      });
    }
  }, [updateFormData]);

  const handleFileRemove = useCallback((uploadKey) => {
    const mapping = FILE_TYPE_MAP[uploadKey];
    if (mapping) {
      updateFormData({ [mapping.urlField]: '' });
    }
    setUploadedFiles(prev => {
      const next = { ...prev };
      delete next[uploadKey];
      return next;
    });
  }, [updateFormData]);

  // ============================================================================
  // HANDLERS - Submission
  // ============================================================================
  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      setSubmitError('Please complete at least 80% of the application and sign.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const userId = getSessionId();

      if (!userId) {
        throw new Error('You must be logged in to submit.');
      }

      // Get Supabase session for proper JWT token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rental-application`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            action: 'submit',
            payload: {
              ...formData,
              occupants,
              verificationStatus,
              user_id: userId,
            },
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      // Auto-transition SL-suggested proposals from "Awaiting Rental App" to "Host Review"
      await transitionSLProposalsOnRentalAppSubmit(userId);

      // Clear localStorage on success
      resetStore();

      // Notify parent
      onSuccess?.();
      onClose?.();

    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, formData, occupants, verificationStatus, resetStore, onSuccess, onClose]);

  // ============================================================================
  // RETURN PUBLIC API
  // ============================================================================
  return {
    // Store data
    formData,
    occupants,
    verificationStatus,

    // Wizard state
    currentStep,
    completedSteps,
    totalSteps: TOTAL_STEPS,
    progress,
    canSubmit,

    // Navigation
    goToStep,
    goToNextStep,
    goToPreviousStep,
    isStepComplete,
    canProceedFromCurrentStep,
    isCurrentStepOptional,

    // Form handlers
    handleInputChange,
    handleInputBlur,
    fieldErrors,
    fieldValid,

    // Occupant handlers
    addOccupant,
    removeOccupant,
    updateOccupant,
    maxOccupants: MAX_OCCUPANTS,

    // File upload
    handleFileUpload,
    handleFileRemove,
    uploadedFiles,
    uploadProgress,
    uploadErrors,

    // Submission
    handleSubmit,
    isSubmitting,
    submitError,

    // Database loading (for review mode)
    isLoadingFromDb,
    loadError,

    // Options (for dropdowns)
    relationshipOptions: RELATIONSHIP_OPTIONS,
    employmentStatusOptions: EMPLOYMENT_STATUS_OPTIONS,

    // Refs
    addressInputRef,
  };
}
