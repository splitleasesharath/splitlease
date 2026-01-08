/**
 * useRentalApplicationWizardLogic.js
 *
 * Business logic hook for the Rental Application Wizard Modal.
 * Reuses the existing rental application localStorage store and
 * adds wizard-specific navigation and step management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { checkAuthStatus, getSessionId, getAuthToken } from '../../../lib/auth.js';
import { useRentalApplicationStore } from '../../pages/RentalApplicationPage/store/index.ts';
import { mapDatabaseToFormData } from '../../pages/RentalApplicationPage/utils/rentalApplicationFieldMapper.ts';

// Required fields (same as RentalApplicationPage)
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

// Conditional required fields based on employment status
const CONDITIONAL_REQUIRED_FIELDS = {
  'full-time': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'part-time': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'intern': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'business-owner': ['businessName', 'businessYear', 'businessState']
};

// Fields required by each step
const STEP_FIELDS = {
  1: ['fullName', 'dob', 'email', 'phone'],           // Personal Info
  2: ['currentAddress', 'lengthResided', 'renting'],   // Address
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

export function useRentalApplicationWizardLogic({ onClose, onSuccess, applicationStatus = 'not_started', userEmail = '' }) {
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
  const [completedSteps, setCompletedSteps] = useState([]);

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
        const token = getAuthToken();
        const userId = getSessionId();

        if (!userId) {
          throw new Error('User not logged in');
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rental-application`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
          } = mapDatabaseToFormData(result.data, userEmail);

          // Load into store (this will update the reactive state)
          loadFromDatabase(mappedFormData, mappedOccupants);

          // Initialize completed steps from database data
          if (dbCompletedSteps && dbCompletedSteps.length > 0) {
            setCompletedSteps(dbCompletedSteps);
          }

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
  // STEP COMPLETION TRACKING
  // ============================================================================
  const isStepComplete = useCallback((stepNumber) => {
    let stepFields = [...STEP_FIELDS[stepNumber]];

    // Add conditional employment fields for step 4
    if (stepNumber === 4 && formData.employmentStatus) {
      const conditionalFields = CONDITIONAL_REQUIRED_FIELDS[formData.employmentStatus] || [];
      stepFields = [...stepFields, ...conditionalFields];
    }

    // If no required fields, step is complete if visited
    if (stepFields.length === 0) {
      return completedSteps.includes(stepNumber);
    }

    // Check all required fields have values
    return stepFields.every(field => {
      const value = formData[field];
      return value !== undefined && value !== null && value !== '';
    });
  }, [formData, completedSteps]);

  // Update completed steps when form data changes
  useEffect(() => {
    const newCompleted = [];
    for (let step = 1; step <= TOTAL_STEPS; step++) {
      if (isStepComplete(step)) {
        newCompleted.push(step);
      }
    }
    setCompletedSteps(newCompleted);
  }, [formData, isStepComplete]);

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
    } else if (result.error) {
      setFieldErrors(prev => ({ ...prev, [fieldName]: result.error }));
    }
  }, [formData, validateField]);

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
      const token = getAuthToken();
      const userId = getSessionId();
      const mapping = FILE_TYPE_MAP[uploadKey];

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rental-application`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
      const token = getAuthToken();
      const userId = getSessionId();

      if (!userId) {
        throw new Error('You must be logged in to submit.');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rental-application`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
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
