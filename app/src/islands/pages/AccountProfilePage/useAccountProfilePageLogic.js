/**
 * useAccountProfilePageLogic - Logic Hook for AccountProfilePage
 *
 * Orchestrates all business logic for the Account Profile page.
 * Supports two views:
 * - Editor View: User viewing/editing their own profile
 * - Public View: User viewing someone else's profile (read-only)
 *
 * ARCHITECTURE: Hollow Component Pattern
 * - Manages all React state (useState, useEffect, useCallback, useMemo)
 * - Component using this hook is "hollow" (presentation only)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { getSessionId, checkAuthStatus, validateTokenAndFetchUser, checkUrlForAuthError, clearAuthErrorFromUrl } from '../../../lib/auth.js';
import { isHost } from '../../../logic/rules/users/isHost.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Profile strength calculation weights
 * Total = 100%
 */
const PROFILE_STRENGTH_WEIGHTS = {
  profilePhoto: 20,
  bio: 15,
  firstName: 5,
  lastName: 5,
  jobTitle: 5,
  emailVerified: 10,
  phoneVerified: 10,
  govIdVerified: 15,
  linkedinVerified: 15
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract user ID from URL path
 * Expected format: /account-profile/:userId
 */
function getUserIdFromUrl() {
  const pathname = window.location.pathname;
  const match = pathname.match(/\/account-profile\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Calculate profile strength percentage
 */
function calculateProfileStrength(profileData, verifications) {
  let strength = 0;

  if (profileData?.profilePhoto) {
    strength += PROFILE_STRENGTH_WEIGHTS.profilePhoto;
  }
  if (profileData?.bio && profileData.bio.trim().length > 0) {
    strength += PROFILE_STRENGTH_WEIGHTS.bio;
  }
  if (profileData?.firstName && profileData.firstName.trim().length > 0) {
    strength += PROFILE_STRENGTH_WEIGHTS.firstName;
  }
  if (profileData?.lastName && profileData.lastName.trim().length > 0) {
    strength += PROFILE_STRENGTH_WEIGHTS.lastName;
  }
  if (profileData?.jobTitle && profileData.jobTitle.trim().length > 0) {
    strength += PROFILE_STRENGTH_WEIGHTS.jobTitle;
  }
  if (verifications?.email) {
    strength += PROFILE_STRENGTH_WEIGHTS.emailVerified;
  }
  if (verifications?.phone) {
    strength += PROFILE_STRENGTH_WEIGHTS.phoneVerified;
  }
  if (verifications?.govId) {
    strength += PROFILE_STRENGTH_WEIGHTS.govIdVerified;
  }
  if (verifications?.linkedin) {
    strength += PROFILE_STRENGTH_WEIGHTS.linkedinVerified;
  }

  return Math.min(100, Math.round(strength));
}

/**
 * Generate next action suggestions based on profile completeness
 */
function generateNextActions(profileData, verifications) {
  const actions = [];

  if (!profileData?.profilePhoto) {
    actions.push({
      id: 'photo',
      text: 'Add a profile photo',
      points: 20,
      icon: 'camera'
    });
  }
  if (!verifications?.govId) {
    actions.push({
      id: 'govId',
      text: 'Verify your identity',
      points: 15,
      icon: 'shield'
    });
  }
  if (!verifications?.linkedin) {
    actions.push({
      id: 'linkedin',
      text: 'Connect your LinkedIn',
      points: 15,
      icon: 'linkedin'
    });
  }
  if (!profileData?.bio || profileData.bio.trim().length === 0) {
    actions.push({
      id: 'bio',
      text: 'Write a short bio',
      points: 15,
      icon: 'edit'
    });
  }
  if (!verifications?.phone) {
    actions.push({
      id: 'phone',
      text: 'Verify your phone number',
      points: 10,
      icon: 'phone'
    });
  }

  // Return top 3 suggestions
  return actions.slice(0, 3);
}

/**
 * Convert day names array to day indices (0-6)
 * Handles both string day names ['Monday', 'Tuesday', ...] and numeric indices [0, 1, 2, ...]
 * @param {(string|number)[]} dayValues - Array of day names or indices
 * @returns {number[]} Array of day indices [0, 1, 2, ...]
 */
function dayNamesToIndices(dayValues) {
  if (!Array.isArray(dayValues)) return [];
  return dayValues
    .map(value => {
      // If it's already a valid numeric index (0-6), use it directly
      if (typeof value === 'number' && value >= 0 && value <= 6) {
        return value;
      }
      // Otherwise, treat as day name string and look up the index
      return DAY_NAMES.indexOf(value);
    })
    .filter(idx => idx !== -1);
}

/**
 * Convert day indices to day names
 * @param {number[]} indices - Array of day indices [1, 2, ...]
 * @returns {string[]} Array of day names ['Monday', 'Tuesday', ...]
 */
function indicesToDayNames(indices) {
  if (!Array.isArray(indices)) return [];
  return indices
    .filter(idx => idx >= 0 && idx <= 6)
    .map(idx => DAY_NAMES[idx]);
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useAccountProfilePageLogic() {
  // ============================================================================
  // STATE
  // ============================================================================

  // Core state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // User identity
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Profile data from database
  const [profileData, setProfileData] = useState(null);

  // Form state (for editor view)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    jobTitle: '',
    dateOfBirth: '', // ISO date string (YYYY-MM-DD)
    bio: '',
    needForSpace: '',
    specialNeeds: '',
    selectedDays: [], // 0-indexed day indices
    transportationType: '',
    goodGuestReasons: [], // Array of IDs
    storageItems: [] // Array of IDs
  });

  // Form validation
  const [formErrors, setFormErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  // Reference data
  const [goodGuestReasonsList, setGoodGuestReasonsList] = useState([]);
  const [storageItemsList, setStorageItemsList] = useState([]);
  const [transportationOptions] = useState([
    { value: '', label: 'Select transportation...' },
    { value: 'car', label: 'Car' },
    { value: 'public_transit', label: 'Public Transit' },
    { value: 'bicycle', label: 'Bicycle' },
    { value: 'walking', label: 'Walking' },
    { value: 'rideshare', label: 'Rideshare (Uber/Lyft)' },
    { value: 'other', label: 'Other' }
  ]);

  // UI state
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showPhoneEditModal, setShowPhoneEditModal] = useState(false);

  // Host listings state
  const [hostListings, setHostListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Rental application wizard state (guest-only)
  const [showRentalWizardModal, setShowRentalWizardModal] = useState(false);
  const [rentalApplicationStatus, setRentalApplicationStatus] = useState('not_started'); // 'not_started' | 'in_progress' | 'submitted'
  const [rentalApplicationProgress, setRentalApplicationProgress] = useState(0);

  // Preview mode state - when true, shows public view even for own profile
  const [previewMode, setPreviewMode] = useState(false);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Determine if user is the owner of this profile (even in preview mode)
   */
  const isOwnProfile = useMemo(() => {
    return isAuthenticated && loggedInUserId && profileUserId && loggedInUserId === profileUserId;
  }, [isAuthenticated, loggedInUserId, profileUserId]);

  /**
   * Determine if current user is viewing their own profile (editor view)
   * or someone else's profile (public view)
   * Note: Preview mode forces public view even for own profile
   */
  const isEditorView = useMemo(() => {
    // If preview mode is active, show public view even for own profile
    if (previewMode) return false;
    return isOwnProfile;
  }, [isOwnProfile, previewMode]);

  const isPublicView = useMemo(() => {
    return !isEditorView;
  }, [isEditorView]);

  /**
   * Determine if profile belongs to a host user
   */
  const isHostUser = useMemo(() => {
    const userType = profileData?.['Type - User Signup'];
    return isHost({ userType });
  }, [profileData]);

  /**
   * Extract verifications from profile data
   */
  const verifications = useMemo(() => {
    if (!profileData) return { email: false, phone: false, govId: false, linkedin: false };

    return {
      email: profileData['is email confirmed'] === true,
      phone: profileData['Verify - Phone'] === true,
      govId: profileData['user verified?'] === true,
      linkedin: !!profileData['Verify - Linked In ID']
    };
  }, [profileData]);

  /**
   * Calculate profile strength (0-100)
   */
  const profileStrength = useMemo(() => {
    const profileInfo = {
      profilePhoto: profileData?.['Profile Photo'],
      bio: formData.bio || profileData?.['About Me / Bio'],
      firstName: formData.firstName || profileData?.['Name - First'],
      lastName: formData.lastName || profileData?.['Name - Last'],
      jobTitle: formData.jobTitle || profileData?.['Job Title']
    };
    return calculateProfileStrength(profileInfo, verifications);
  }, [profileData, formData, verifications]);

  /**
   * Generate next action suggestions
   */
  const nextActions = useMemo(() => {
    const profileInfo = {
      profilePhoto: profileData?.['Profile Photo'],
      bio: formData.bio || profileData?.['About Me / Bio'],
      firstName: formData.firstName || profileData?.['Name - First'],
      lastName: formData.lastName || profileData?.['Name - Last'],
      jobTitle: formData.jobTitle || profileData?.['Job Title']
    };
    return generateNextActions(profileInfo, verifications);
  }, [profileData, formData, verifications]);

  /**
   * Display name for sidebar
   */
  const displayName = useMemo(() => {
    const first = formData.firstName || profileData?.['Name - First'] || '';
    const last = formData.lastName || profileData?.['Name - Last'] || '';
    return `${first} ${last}`.trim() || 'Your Name';
  }, [formData.firstName, formData.lastName, profileData]);

  /**
   * Display job title for sidebar
   */
  const displayJobTitle = useMemo(() => {
    return formData.jobTitle || profileData?.['Job Title'] || '';
  }, [formData.jobTitle, profileData]);

  /**
   * Determine if Date of Birth field should be shown.
   * Only show when the user has NO date of birth in the database
   * (typically OAuth signups via LinkedIn/Google where DOB isn't collected).
   * Once the user saves a DOB, this field will be hidden on subsequent visits.
   */
  const showDateOfBirthField = useMemo(() => {
    return !profileData?.['Date of Birth'];
  }, [profileData]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  /**
   * Fetch reference data (good guest reasons, storage items)
   */
  const fetchReferenceData = useCallback(async () => {
    try {
      // Fetch good guest reasons
      const { data: reasons, error: reasonsError } = await supabase
        .schema('reference_table')
        .from('zat_goodguestreasons')
        .select('_id, name')
        .order('name');

      if (reasonsError) {
        console.error('Error fetching good guest reasons:', reasonsError);
      } else {
        setGoodGuestReasonsList(reasons || []);
      }

      // Fetch storage items
      const { data: storage, error: storageError } = await supabase
        .schema('reference_table')
        .from('zat_storage')
        .select('_id, Name')
        .order('Name');

      if (storageError) {
        console.error('Error fetching storage items:', storageError);
      } else {
        // Filter out deprecated storage options
        const excludedItems = ['ID / Wallet / Money', 'Luggage', 'Portable Massager', 'Protein', 'Sound System', 'TV'];
        const filteredStorage = (storage || []).filter(item => !excludedItems.includes(item.Name));
        setStorageItemsList(filteredStorage);
      }
    } catch (err) {
      console.error('Error fetching reference data:', err);
    }
  }, []);

  /**
   * Fetch user profile data
   */
  const fetchProfileData = useCallback(async (userId) => {
    try {
      const { data: userData, error: userError } = await supabase
        .from('user')
        .select('*')
        .eq('_id', userId)
        .single();

      if (userError) {
        throw new Error('User not found');
      }

      setProfileData(userData);

      // Initialize form data from profile
      // Database columns use 'Name - First', 'Name - Last' naming convention
      // Date of Birth is stored as timestamp, convert to YYYY-MM-DD for date input
      const dobTimestamp = userData['Date of Birth'];
      const dateOfBirth = dobTimestamp ? dobTimestamp.split('T')[0] : '';

      setFormData({
        firstName: userData['Name - First'] || '',
        lastName: userData['Name - Last'] || '',
        jobTitle: userData['Job Title'] || '',
        dateOfBirth,
        bio: userData['About Me / Bio'] || '',
        needForSpace: userData['need for Space'] || '',
        specialNeeds: userData['special needs'] || '',
        selectedDays: dayNamesToIndices(userData['Recent Days Selected'] || []),
        transportationType: userData['Transportation'] || '',
        goodGuestReasons: userData['Good Guest Reasons'] || [],
        storageItems: userData['storage'] || []
      });

      return userData;
    } catch (err) {
      throw err;
    }
  }, []);

  /**
   * Fetch host's listings using RPC function
   * Uses get_host_listings RPC to handle column names with special characters
   * (same approach as HostOverviewPage)
   */
  const fetchHostListings = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingListings(true);
    try {
      console.log('[AccountProfile] Fetching listings for host:', userId);

      // Use RPC function to fetch listings (handles "Host User" column name)
      const { data, error } = await supabase
        .rpc('get_host_listings', { host_user_id: userId });

      if (error) throw error;

      console.log('[AccountProfile] Listings fetched:', data?.length || 0);

      // Map RPC results to the format expected by ListingsCard component
      // RPC returns: _id, Name, Complete, "Location - Borough", hood, bedrooms, bathrooms,
      //              "Features - Photos", min_nightly, rental_type, monthly_rate, etc.
      const mappedListings = (data || [])
        .filter(listing => listing.Complete === true) // Only show complete listings
        .map(listing => {
          // Convert Features - Photos (array of URLs) to listing_photo format (array of {url, Order})
          const photosArray = listing['Features - Photos'] || [];
          const listing_photo = photosArray.map((url, index) => ({
            url: url,
            Order: index + 1
          }));

          return {
            // Use 'id' (Bubble-style ID) for routing, not '_id' (internal Supabase ID)
            // id format: 1764973043780x52847445415716824 (for URLs)
            // _id format: self_1764973043425_nkzixvohd (internal, don't use for routing)
            _id: listing.id || listing._id, // Prefer Bubble-style 'id' for routing
            id: listing.id, // Keep original Bubble ID explicitly
            Name: listing.Name || 'Unnamed Listing',
            // Map location fields to match ListingsCard expectations
            'Borough/Region': listing['Location - Borough'] || '',
            hood: listing.hood || '',
            // Bedroom/bathroom counts (now returned by updated RPC)
            'Qty of Bedrooms': listing.bedrooms || 0,
            'Qty of Bathrooms': listing.bathrooms || 0,
            // Pricing - use min_nightly which is the "Start Nightly Price"
            'Start Nightly Price': listing.min_nightly || listing.rate_2_nights || listing.monthly_rate || 0,
            Complete: listing.Complete,
            // Photos converted to listing_photo format for ListingsCard
            listing_photo: listing_photo,
            // Additional fields for display
            rental_type: listing.rental_type,
            monthly_rate: listing.monthly_rate,
            source: listing.source || 'listing'
          };
        });

      setHostListings(mappedListings);
    } catch (err) {
      console.error('[AccountProfile] Error fetching host listings:', err);
      // Non-blocking - just log and continue with empty listings
      setHostListings([]);
    } finally {
      setLoadingListings(false);
    }
  }, []);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    async function initialize() {
      try {
        // FIRST: Check for auth errors in URL hash (e.g., expired magic link)
        // This must happen before any auth checks to prevent redirect loops
        const authError = checkUrlForAuthError();
        if (authError) {
          console.log('[AccountProfile] Auth error detected in URL:', authError);

          // Clear the error from URL to prevent re-processing on reload
          clearAuthErrorFromUrl();

          // Set user-friendly error message based on error type
          let errorMessage = 'Authentication failed. ';
          if (authError.errorCode === 'otp_expired') {
            errorMessage = 'This magic login link has expired or already been used. Please request a new login link.';
          } else if (authError.errorCode === 'access_denied') {
            errorMessage = 'Access denied. The login link may have expired or been used already. Please request a new login link.';
          } else if (authError.errorDescription) {
            errorMessage = authError.errorDescription;
          } else {
            errorMessage = 'The login link is invalid or has expired. Please request a new login link.';
          }

          // Throw error to be caught and displayed
          throw new Error(errorMessage);
        }

        // Check authentication status FIRST to potentially use as fallback
        // We need the validated user ID (Bubble _id) for accurate comparison
        // getSessionId() may return Supabase UUID instead of Bubble _id due to
        // timing issues with Supabase Auth session sync
        const isAuth = await checkAuthStatus();
        setIsAuthenticated(isAuth);

        // Get logged-in user ID from validated user data (Bubble _id)
        // This ensures we compare the correct ID format with the URL ID
        let validatedUserId = null;
        if (isAuth) {
          const validatedUser = await validateTokenAndFetchUser({ clearOnFailure: false });
          if (validatedUser?.userId) {
            validatedUserId = validatedUser.userId;
            console.log('[AccountProfile] Using validated userId (Bubble _id):', validatedUserId);
          } else {
            // Fallback to session ID if validation fails (shouldn't happen if isAuth is true)
            validatedUserId = getSessionId();
            console.log('[AccountProfile] Falling back to session ID:', validatedUserId);
          }
        }
        setLoggedInUserId(validatedUserId);

        // Extract profile user ID from URL, or fall back to logged-in user's ID
        // This allows users to view their own profile at /account-profile without a userId param
        const urlUserId = getUserIdFromUrl();
        const targetUserId = urlUserId || validatedUserId;

        if (!targetUserId) {
          // No URL param AND not logged in - redirect to login or show error
          throw new Error('Please log in to view your profile, or provide a user ID in the URL');
        }

        console.log('[AccountProfile] Target user ID:', targetUserId, urlUserId ? '(from URL)' : '(from session - viewing own profile)');
        setProfileUserId(targetUserId);

        // Fetch reference data
        await fetchReferenceData();

        // Fetch profile data
        const userData = await fetchProfileData(targetUserId);

        // If user is a host, fetch their listings
        if (userData) {
          const userType = userData['Type - User Signup'];
          if (isHost({ userType })) {
            await fetchHostListings(targetUserId);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('Error initializing profile page:', err);
        setError(err.message);
        setLoading(false);
      }
    }

    initialize();
  }, [fetchReferenceData, fetchProfileData, fetchHostListings]);

  // ============================================================================
  // RENTAL APPLICATION STATUS (Guest-only)
  // ============================================================================

  /**
   * Compute rental application status based on:
   * 1. Database field (already submitted)
   * 2. localStorage draft (in progress)
   * 3. Default (not started)
   */
  useEffect(() => {
    // Only compute for guest users viewing their own profile
    if (!isEditorView || isHostUser) return;

    // Check if already submitted in database
    if (profileData?.['Rental Application']) {
      setRentalApplicationStatus('submitted');
      setRentalApplicationProgress(100);
      return;
    }

    // Check localStorage for draft
    try {
      const draft = localStorage.getItem('rentalApplicationDraft');
      if (draft) {
        const draftData = JSON.parse(draft);
        // Calculate progress based on filled fields
        const fields = [
          'fullName', 'dob', 'email', 'phone',
          'currentAddress', 'lengthResided',
          'employmentStatus',
          'signature'
        ];
        const optionalFields = [
          'apartmentUnit', 'renting',
          'employerName', 'jobTitle', 'businessName',
          'hasPets', 'isSmoker', 'needsParking', 'references'
        ];

        let filled = 0;
        const total = fields.length;

        fields.forEach(field => {
          if (draftData[field] && String(draftData[field]).trim()) filled++;
        });

        // Add bonus for optional fields
        optionalFields.forEach(field => {
          if (draftData[field] && String(draftData[field]).trim()) filled += 0.5;
        });

        const progress = Math.min(100, Math.round((filled / total) * 100));

        if (progress > 0) {
          setRentalApplicationStatus('in_progress');
          setRentalApplicationProgress(progress);
          return;
        }
      }
    } catch (e) {
      console.error('Error reading rental application draft:', e);
    }

    // Default: not started
    setRentalApplicationStatus('not_started');
    setRentalApplicationProgress(0);
  }, [isEditorView, isHostUser, profileData]);

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  /**
   * Handle field change
   */
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);

    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [formErrors]);

  /**
   * Handle day selection toggle
   */
  const handleDayToggle = useCallback((dayIndex) => {
    setFormData(prev => {
      const currentDays = prev.selectedDays;
      const newDays = currentDays.includes(dayIndex)
        ? currentDays.filter(d => d !== dayIndex)
        : [...currentDays, dayIndex].sort((a, b) => a - b);

      return { ...prev, selectedDays: newDays };
    });
    setIsDirty(true);
  }, []);

  /**
   * Handle chip selection toggle (for reasons and storage items)
   */
  const handleChipToggle = useCallback((field, id) => {
    setFormData(prev => {
      const currentItems = prev[field];
      const newItems = currentItems.includes(id)
        ? currentItems.filter(i => i !== id)
        : [...currentItems, id];

      return { ...prev, [field]: newItems };
    });
    setIsDirty(true);
  }, []);

  /**
   * Validate form before save
   */
  const validateForm = useCallback(() => {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    // Add more validations as needed

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  /**
   * Save profile changes
   */
  const handleSave = useCallback(async () => {
    if (!isEditorView || !profileUserId) {
      console.error('Cannot save: not in editor view or no user ID');
      return { success: false, error: 'Cannot save changes' };
    }

    if (!validateForm()) {
      return { success: false, error: 'Please fix validation errors' };
    }

    setSaving(true);

    try {
      // Build the full name from first and last name
      const firstName = formData.firstName.trim();
      const lastName = formData.lastName.trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

      // Convert date of birth from YYYY-MM-DD to ISO timestamp for database
      // Only include if value exists to avoid overwriting with null
      const dateOfBirthISO = formData.dateOfBirth
        ? new Date(formData.dateOfBirth + 'T00:00:00Z').toISOString()
        : null;

      // Database columns use 'Name - First', 'Name - Last', 'Name - Full' naming convention
      const updateData = {
        'Name - First': firstName,
        'Name - Last': lastName,
        'Name - Full': fullName,
        'Job Title': formData.jobTitle.trim(),
        'Date of Birth': dateOfBirthISO,
        'About Me / Bio': formData.bio.trim(),
        'need for Space': formData.needForSpace.trim(),
        'special needs': formData.specialNeeds.trim(),
        'Recent Days Selected': indicesToDayNames(formData.selectedDays),
        'Transportation': formData.transportationType,
        'Good Guest Reasons': formData.goodGuestReasons,
        'storage': formData.storageItems,
        'Modified Date': new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('user')
        .update(updateData)
        .eq('_id', profileUserId);

      if (updateError) {
        throw updateError;
      }

      // Refresh profile data
      await fetchProfileData(profileUserId);
      setIsDirty(false);
      setSaving(false);

      return { success: true };
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaving(false);
      return { success: false, error: err.message };
    }
  }, [isEditorView, profileUserId, formData, validateForm, fetchProfileData]);

  /**
   * Cancel changes and reset form
   */
  const handleCancel = useCallback(() => {
    if (profileData) {
      // Database columns use 'Name - First', 'Name - Last' naming convention
      // Date of Birth stored as timestamp, convert to YYYY-MM-DD
      const dobTimestamp = profileData['Date of Birth'];
      const dateOfBirth = dobTimestamp ? dobTimestamp.split('T')[0] : '';

      setFormData({
        firstName: profileData['Name - First'] || '',
        lastName: profileData['Name - Last'] || '',
        jobTitle: profileData['Job Title'] || '',
        dateOfBirth,
        bio: profileData['About Me / Bio'] || '',
        needForSpace: profileData['need for Space'] || '',
        specialNeeds: profileData['special needs'] || '',
        selectedDays: dayNamesToIndices(profileData['Recent Days Selected'] || []),
        transportationType: profileData['Transportation'] || '',
        goodGuestReasons: profileData['Good Guest Reasons'] || [],
        storageItems: profileData['storage'] || []
      });
      setFormErrors({});
      setIsDirty(false);
    }
  }, [profileData]);

  /**
   * Toggle preview mode to show public view of own profile
   */
  const handlePreviewProfile = useCallback(() => {
    setPreviewMode(prev => !prev);
  }, []);

  /**
   * Exit preview mode and return to editor view
   */
  const handleExitPreview = useCallback(() => {
    setPreviewMode(false);
  }, []);

  // ============================================================================
  // VERIFICATION HANDLERS
  // ============================================================================

  const handleVerifyEmail = useCallback(() => {
    // Trigger email verification flow
    console.log('Verify email clicked');
  }, []);

  const handleVerifyPhone = useCallback(() => {
    setShowPhoneEditModal(true);
  }, []);

  const handleVerifyGovId = useCallback(() => {
    // Trigger government ID verification flow
    console.log('Verify government ID clicked');
  }, []);

  const handleConnectLinkedIn = useCallback(() => {
    // Trigger LinkedIn OAuth flow
    console.log('Connect LinkedIn clicked');
  }, []);

  const handleEditPhone = useCallback(() => {
    setShowPhoneEditModal(true);
  }, []);

  // ============================================================================
  // SETTINGS HANDLERS
  // ============================================================================

  const handleOpenNotificationSettings = useCallback(() => {
    setShowNotificationModal(true);
  }, []);

  const handleCloseNotificationModal = useCallback(() => {
    setShowNotificationModal(false);
  }, []);

  const handleClosePhoneEditModal = useCallback(() => {
    setShowPhoneEditModal(false);
  }, []);

  const handleChangePassword = useCallback(() => {
    // Navigate to password reset page
    window.location.href = '/reset-password';
  }, []);

  // ============================================================================
  // RENTAL APPLICATION WIZARD HANDLERS (Guest-only)
  // ============================================================================

  const handleOpenRentalWizard = useCallback(() => {
    setShowRentalWizardModal(true);
  }, []);

  const handleCloseRentalWizard = useCallback(() => {
    setShowRentalWizardModal(false);
  }, []);

  const handleRentalWizardSuccess = useCallback(() => {
    // On successful submission, update status and close modal
    setRentalApplicationStatus('submitted');
    setRentalApplicationProgress(100);
    setShowRentalWizardModal(false);
    // Refresh profile data to reflect the submitted application
    if (profileUserId) {
      fetchProfileData(profileUserId);
    }
  }, [profileUserId, fetchProfileData]);

  // ============================================================================
  // PHOTO HANDLERS
  // ============================================================================

  const handleCoverPhotoChange = useCallback(async (file) => {
    // TODO: Implement cover photo upload
    console.log('Cover photo change:', file);
  }, []);

  const handleAvatarChange = useCallback(async (file) => {
    if (!file || !profileUserId) {
      console.error('Cannot upload avatar: no file or user ID');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('File too large. Maximum size is 5MB.');
      return;
    }

    setSaving(true);

    try {
      // Get the Supabase Auth session to get the auth user ID for storage path
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const authUserId = session.user.id;

      // Generate unique filename with timestamp to avoid cache issues
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar_${Date.now()}.${fileExtension}`;
      const filePath = `${authUserId}/${fileName}`;

      // Upload the file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL for the uploaded image
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }

      const publicUrl = urlData.publicUrl;

      // Update the user's Profile Photo field in the database
      const { error: updateError } = await supabase
        .from('user')
        .update({
          'Profile Photo': publicUrl,
          'Modified Date': new Date().toISOString()
        })
        .eq('_id', profileUserId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setProfileData(prev => ({
        ...prev,
        'Profile Photo': publicUrl
      }));

      console.log('✅ Avatar uploaded successfully:', publicUrl);
    } catch (err) {
      console.error('❌ Error uploading avatar:', err);
      setError(err.message || 'Failed to upload profile photo');
    } finally {
      setSaving(false);
    }
  }, [profileUserId]);

  // ============================================================================
  // HOST LISTING HANDLERS
  // ============================================================================

  /**
   * Navigate to listing page based on view context:
   * - Editor View (own profile): Go to listing-dashboard to manage the listing
   * - Public View (visitor): Go to view-split-lease to see listing details with booking
   *
   * Note: listing-dashboard uses query params (?id=), view-split-lease uses path segments (/:id)
   */
  const handleListingClick = useCallback((listingId) => {
    if (listingId) {
      if (isEditorView) {
        // Owner viewing their own profile - go to listing management
        // listing-dashboard uses query params, NOT path segments
        window.location.href = `/listing-dashboard?id=${listingId}`;
      } else {
        // Visitor viewing someone else's profile - go to public listing view
        // view-split-lease uses path segments
        window.location.href = `/view-split-lease/${listingId}`;
      }
    }
  }, [isEditorView]);

  /**
   * Navigate to create listing page (Self Listing V2)
   */
  const handleCreateListing = useCallback(() => {
    window.location.href = '/self-listing-v2';
  }, []);

  // ============================================================================
  // RETURN API
  // ============================================================================

  return {
    // Core state
    loading,
    saving,
    error,

    // View mode
    isEditorView,
    isPublicView,
    isAuthenticated,
    isOwnProfile,
    previewMode,
    handleExitPreview,

    // Profile data
    profileData,
    profileUserId,
    loggedInUserId,

    // Computed display values
    displayName,
    displayJobTitle,
    verifications,
    profileStrength,
    nextActions,
    showDateOfBirthField,

    // Form state
    formData,
    formErrors,
    isDirty,

    // Reference data
    goodGuestReasonsList,
    storageItemsList,
    transportationOptions,

    // Form handlers
    handleFieldChange,
    handleDayToggle,
    handleChipToggle,

    // Save/Cancel
    handleSave,
    handleCancel,
    handlePreviewProfile,

    // Verification handlers
    handleVerifyEmail,
    handleVerifyPhone,
    handleVerifyGovId,
    handleConnectLinkedIn,
    handleEditPhone,

    // Settings handlers
    handleOpenNotificationSettings,
    handleChangePassword,

    // Photo handlers
    handleCoverPhotoChange,
    handleAvatarChange,

    // Modal state
    showNotificationModal,
    handleCloseNotificationModal,
    showPhoneEditModal,
    handleClosePhoneEditModal,

    // Host profile
    isHostUser,
    hostListings,
    loadingListings,
    handleListingClick,
    handleCreateListing,

    // Rental application (guest-only)
    rentalApplicationStatus,
    rentalApplicationProgress,
    showRentalWizardModal,
    handleOpenRentalWizard,
    handleCloseRentalWizard,
    handleRentalWizardSuccess
  };
}
