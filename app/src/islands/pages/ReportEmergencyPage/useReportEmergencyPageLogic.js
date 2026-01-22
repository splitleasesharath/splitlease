/**
 * Report Emergency Page Logic Hook
 * Split Lease - Guest Emergency Submission Form
 *
 * Contains ALL business logic for the ReportEmergencyPage:
 * - Form state management
 * - Validation
 * - Photo upload handling
 * - Submission to Edge Function
 */

import { useState, useEffect, useCallback } from 'react';
import { checkAuthStatus } from '../../../lib/auth.js';
import { createEmergency, uploadEmergencyPhoto } from '../../../lib/emergencyService.js';

const INITIAL_FORM_DATA = {
  emergency_type: '',
  description: '',
  proposal_id: '',
  agreement_number: '',
  property_address: '',
  reporter_name: '',
  reporter_phone: '',
  reporter_email: '',
  photo1: null,
  photo2: null,
};

export function useReportEmergencyPageLogic() {
  // ============================================================================
  // State
  // ============================================================================

  // Form state
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  // User state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProposals, setUserProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  // ============================================================================
  // Initialize - Check Auth and Pre-fill User Data
  // ============================================================================

  useEffect(() => {
    async function initializeForm() {
      try {
        const authResult = await checkAuthStatus();

        if (authResult.authenticated && authResult.user) {
          setIsAuthenticated(true);
          setCurrentUser(authResult.user);

          // Pre-fill contact information from user profile
          setFormData((prev) => ({
            ...prev,
            reporter_name: `${authResult.user.firstName || ''} ${authResult.user.lastName || ''}`.trim(),
            reporter_phone: authResult.user.phone || '',
            reporter_email: authResult.user.email || '',
          }));

          // Load user's active proposals for booking selection
          await loadUserProposals(authResult.user._id);
        }
      } catch (authError) {
        console.error('[ReportEmergencyPage] Auth check failed:', authError);
        // Continue without auth - form is public
      }
    }

    initializeForm();
  }, []);

  // ============================================================================
  // Load User Proposals
  // ============================================================================

  const loadUserProposals = useCallback(async (userId) => {
    setLoadingProposals(true);
    try {
      // Fetch user's active proposals from Supabase
      const { supabase } = await import('../../../lib/supabase.js');

      const { data, error } = await supabase
        .from('proposal')
        .select(`
          _id,
          agreementNumber,
          status,
          moveIn,
          moveOut,
          listing:listing_id (
            _id,
            name,
            streetAddress,
            city
          )
        `)
        .eq('user', userId)
        .in('status', ['accepted', 'move_in', 'active'])
        .order('moveIn', { ascending: false });

      if (error) {
        console.error('[ReportEmergencyPage] Error loading proposals:', error);
        return;
      }

      setUserProposals(data || []);
    } catch (loadError) {
      console.error('[ReportEmergencyPage] Failed to load proposals:', loadError);
    } finally {
      setLoadingProposals(false);
    }
  }, []);

  // ============================================================================
  // Form Handlers
  // ============================================================================

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }

    // Clear submission error when form changes
    if (submissionError) {
      setSubmissionError(null);
    }
  }, [errors, submissionError]);

  const handlePhotoChange = useCallback((e) => {
    const { name, files } = e.target;

    if (files && files[0]) {
      const file = files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({
          ...prev,
          [name]: 'Please select an image file',
        }));
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          [name]: 'Image must be less than 10MB',
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [name]: file,
      }));

      // Clear error for this field
      if (errors[name]) {
        setErrors((prev) => ({
          ...prev,
          [name]: null,
        }));
      }
    }
  }, [errors]);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateForm = useCallback(() => {
    const newErrors = {};

    // Emergency type required
    if (!formData.emergency_type) {
      newErrors.emergency_type = 'Please select an emergency type';
    }

    // Description required and minimum length
    if (!formData.description) {
      newErrors.description = 'Please describe the emergency';
    } else if (formData.description.length < 20) {
      newErrors.description = 'Please provide more detail (minimum 20 characters)';
    }

    // Reporter name required
    if (!formData.reporter_name || formData.reporter_name.trim().length < 2) {
      newErrors.reporter_name = 'Please enter your name';
    }

    // Phone required and basic validation
    if (!formData.reporter_phone) {
      newErrors.reporter_phone = 'Please enter your phone number';
    } else {
      // Remove non-digits and check length
      const digitsOnly = formData.reporter_phone.replace(/\D/g, '');
      if (digitsOnly.length < 10) {
        newErrors.reporter_phone = 'Please enter a valid phone number';
      }
    }

    // Email required and validation
    if (!formData.reporter_email) {
      newErrors.reporter_email = 'Please enter your email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reporter_email)) {
      newErrors.reporter_email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ============================================================================
  // Submit Handler
  // ============================================================================

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      // Scroll to first error
      const firstError = document.querySelector('.form-input--error, .form-select--error, .form-textarea--error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // Upload photos first if provided
      let photo1Url = null;
      let photo2Url = null;

      if (formData.photo1) {
        photo1Url = await uploadEmergencyPhoto(formData.photo1);
      }

      if (formData.photo2) {
        photo2Url = await uploadEmergencyPhoto(formData.photo2);
      }

      // Prepare emergency data
      const emergencyData = {
        emergency_type: formData.emergency_type,
        description: formData.description,
        reporter_name: formData.reporter_name.trim(),
        reporter_phone: formData.reporter_phone,
        reporter_email: formData.reporter_email.trim().toLowerCase(),
        photo1_url: photo1Url,
        photo2_url: photo2Url,
      };

      // Add optional fields if provided
      if (formData.proposal_id) {
        emergencyData.proposal_id = formData.proposal_id;
      }

      if (formData.property_address) {
        emergencyData.property_address = formData.property_address;
      }

      // If authenticated, include user ID
      if (isAuthenticated && currentUser) {
        emergencyData.reported_by_user_id = currentUser._id;
      }

      // Submit to Edge Function
      await createEmergency(emergencyData);

      // Success
      setIsSubmitted(true);

      console.log('[ReportEmergencyPage] Emergency submitted successfully');
    } catch (submitError) {
      console.error('[ReportEmergencyPage] Submission error:', submitError);
      setSubmissionError(
        submitError.message || 'Failed to submit emergency report. Please try again or call us directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, isAuthenticated, currentUser]);

  // ============================================================================
  // Reset Handler
  // ============================================================================

  const handleReset = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setErrors({});
    setIsSubmitted(false);
    setSubmissionError(null);

    // Re-fill user data if authenticated
    if (isAuthenticated && currentUser) {
      setFormData((prev) => ({
        ...prev,
        reporter_name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        reporter_phone: currentUser.phone || '',
        reporter_email: currentUser.email || '',
      }));
    }
  }, [isAuthenticated, currentUser]);

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    // Form state
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    submissionError,

    // User/proposal state
    isAuthenticated,
    userProposals,
    loadingProposals,

    // Handlers
    handleInputChange,
    handlePhotoChange,
    handleSubmit,
    handleReset,
  };
}
