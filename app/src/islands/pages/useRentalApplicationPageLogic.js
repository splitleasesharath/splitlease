/**
 * useRentalApplicationPageLogic - Business logic hook for RentalApplicationPage
 *
 * This hook contains ALL business logic for the rental application form:
 * - Form state management
 * - Validation logic
 * - Progress tracking
 * - File upload handling
 * - Verification status tracking
 * - Auto-save functionality
 * - Form submission
 *
 * Architecture (per Four-Layer Logic Architecture):
 * - State management and orchestration
 * - Delegates validation to rules
 * - Handles data transformation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase.js';
import { checkAuthStatus, getSessionId } from '../../lib/auth.js';

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
const AUTO_SAVE_DELAY = 500;
const STORAGE_KEY = 'rentalApplicationData';
const STORAGE_TIMESTAMP_KEY = 'rentalApplicationTimestamp';

export function useRentalApplicationPageLogic() {
  // ============================================================================
  // STATE
  // ============================================================================

  // Form data state
  const [formData, setFormData] = useState({
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
    // Special requirements (dropdowns: yes/no/empty)
    hasPets: '',
    isSmoker: '',
    needsParking: '',
    // References
    references: '',
    showVisualReferences: false,  // Toggle for visual references upload
    showCreditScore: false,       // Toggle for credit score upload
    // Signature
    signature: ''
  });

  // Occupants state
  const [occupants, setOccupants] = useState([]);

  // Verification status
  const [verificationStatus, setVerificationStatus] = useState({
    linkedin: false,
    facebook: false,
    id: false,
    income: false
  });

  // Verification loading states
  const [verificationLoading, setVerificationLoading] = useState({
    linkedin: false,
    facebook: false,
    id: false,
    income: false
  });

  // File uploads
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

  // Form state
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Auto-save timeout ref
  const autoSaveTimeoutRef = useRef(null);

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
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setIsDirty(true);

    // Clear error for this field
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

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
    setFormData(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
    setIsDirty(true);
  }, []);

  const handleRadioChange = useCallback((fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    setIsDirty(true);
  }, []);

  // ============================================================================
  // HANDLERS - Occupants
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

    setOccupants(prev => [...prev, newOccupant]);
    setIsDirty(true);
  }, [occupants.length]);

  const removeOccupant = useCallback((occupantId) => {
    setOccupants(prev => prev.filter(occ => occ.id !== occupantId));
    setIsDirty(true);
  }, []);

  const updateOccupant = useCallback((occupantId, field, value) => {
    setOccupants(prev => prev.map(occ =>
      occ.id === occupantId ? { ...occ, [field]: value } : occ
    ));
    setIsDirty(true);
  }, []);

  // ============================================================================
  // HANDLERS - File Uploads
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
    setIsDirty(true);
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
    setIsDirty(true);
  }, []);

  // ============================================================================
  // HANDLERS - Verification
  // ============================================================================

  const handleVerification = useCallback(async (service) => {
    setVerificationLoading(prev => ({ ...prev, [service]: true }));

    // Simulate verification API call
    // In production, this would be real OAuth flows or verification services
    await new Promise(resolve => setTimeout(resolve, 1500));

    setVerificationStatus(prev => ({ ...prev, [service]: true }));
    setVerificationLoading(prev => ({ ...prev, [service]: false }));
    setIsDirty(true);
  }, []);

  // ============================================================================
  // AUTO-SAVE
  // ============================================================================

  const autoSave = useCallback(() => {
    if (!isDirty) return;

    const dataToSave = {
      formData,
      occupants,
      verificationStatus,
      // Note: Files cannot be serialized to localStorage
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, new Date().toISOString());
      console.log('Auto-saved at', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }

    setIsDirty(false);
  }, [isDirty, formData, occupants, verificationStatus]);

  // Debounced auto-save on changes
  useEffect(() => {
    if (isDirty) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(autoSave, AUTO_SAVE_DELAY);
    }

    return () => clearTimeout(autoSaveTimeoutRef.current);
  }, [isDirty, autoSave]);

  // Load saved data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return;

    try {
      const parsed = JSON.parse(savedData);

      if (parsed.formData) {
        setFormData(prev => ({ ...prev, ...parsed.formData }));
      }
      if (parsed.occupants) {
        setOccupants(parsed.occupants);
      }
      if (parsed.verificationStatus) {
        setVerificationStatus(parsed.verificationStatus);
      }

      console.log('✅ Loaded saved rental application data');
    } catch (error) {
      console.error('❌ Error loading saved data:', error);
    }
  }, []);

  // Pre-populate form with user data when logged in
  useEffect(() => {
    async function fetchAndPopulateUserData() {
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
        // Using select('*') to ensure we get all available email fields
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

        const userEmail = userData['email'] || '';

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

        // Pre-populate form fields (only if not already filled)
        setFormData(prev => ({
          ...prev,
          // Only populate if field is empty (preserve any manually entered data)
          fullName: prev.fullName || fullName || '',
          email: prev.email || userEmail || '',
          phone: prev.phone || userData['Phone Number (as text)'] || '',
          dob: prev.dob || dob || ''
        }));

        console.log('✅ Pre-populated rental application with user data');
      } catch (error) {
        console.error('[RentalApplication] Error in fetchAndPopulateUserData:', error);
      }
    }

    fetchAndPopulateUserData();
  }, []);

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
  // FORM SUBMISSION
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
      // Collect all form data for submission
      const submissionData = {
        ...formData,
        occupants,
        verificationStatus,
        // File uploads would be handled separately via multipart form
        hasEmploymentProof: uploadedFiles.employmentProof !== null,
        hasAlternateGuarantee: uploadedFiles.alternateGuarantee !== null,
        hasCreditScore: uploadedFiles.creditScore !== null,
        referenceDocumentCount: uploadedFiles.references.length
      };

      // TODO: Submit to API via Edge Function
      // In production, this would call the bubble-proxy edge function
      console.log('📝 Submitting rental application:', submissionData);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear saved data on successful submission
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);

      setSubmitSuccess(true);
      setIsDirty(false);
    } catch (error) {
      console.error('❌ Submission failed:', error);
      setSubmitError('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, occupants, verificationStatus, uploadedFiles, validateAllFields]);

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
    // Form data
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
    closeSuccessModal
  };
}
