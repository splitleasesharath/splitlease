/**
 * SelfListingPageV2 - Simplified 8-step listing creation flow
 *
 * Steps:
 * 1. Host Type - resident, liveout, coliving, agent
 * 2. Market Strategy - private (concierge) or public (marketplace)
 * 3. Listing Strategy - nightly/weekly/monthly with conditional content
 * 4. Pricing Strategy - V5 Calculator (nightly only)
 * 5. Financials - rent, utilities, deposit, cleaning (weekly/monthly only)
 * 6. Space & Time - property type, location, bedrooms, bathrooms
 * 7. Photos - optional photo upload
 * 8. Review & Activate - preview and submit
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../../shared/Header.jsx';
import SignUpLoginModal from '../../shared/SignUpLoginModal.jsx';
import Toast, { useToast } from '../../shared/Toast.jsx';
import { HostScheduleSelector } from '../../shared/HostScheduleSelector/HostScheduleSelector.jsx';
import InformationalText from '../../shared/InformationalText.jsx';
import { checkAuthStatus, validateTokenAndFetchUser } from '../../../lib/auth.js';
import { createListing, saveDraft, getListingById } from '../../../lib/listingService.js';
import { isGuest } from '../../../logic/rules/users/isGuest.js';
import { supabase } from '../../../lib/supabase.js';
import { NYC_BOUNDS, isValidServiceArea, getBoroughForZipCode } from '../../../lib/nycZipCodes';
import './styles/SelfListingPageV2.css';
import '../../../styles/components/toast.css';

// Declare google as a global for TypeScript
declare global {
  interface Window {
    google: typeof google;
  }
}

// Space type options
type SpaceType = 'Private Room' | 'Entire Place' | 'Shared Room' | '';

// Address data structure
interface AddressData {
  fullAddress: string;
  number: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
  validated: boolean;
}

// Night ID type matching HostScheduleSelector
type NightId = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
const NIGHT_IDS: NightId[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Types
interface FormData {
  // Step 1: Host Type
  hostType: 'resident' | 'liveout' | 'coliving' | 'agent';

  // Step 2: Market Strategy
  marketStrategy: 'private' | 'public';

  // Step 3: Listing Strategy
  leaseStyle: 'nightly' | 'weekly' | 'monthly';
  selectedNights: NightId[]; // Array of night IDs like ['monday', 'tuesday', ...]
  weeklyPattern: string;
  monthlyAgreement: boolean;

  // Step 4: Nightly Pricing (only for nightly)
  nightlyBaseRate: number;
  nightlyDiscount: number;
  weeklyTotal: number;
  monthlyEstimate: number;

  // Step 5: Financials (for weekly/monthly)
  price: number;
  frequency: 'Month' | 'Week';
  utilitiesIncluded: boolean;
  utilityCost: number;
  securityDeposit: number;
  cleaningFee: number;

  // Step 6: Space & Time
  typeOfSpace: SpaceType;
  address: AddressData;
  bedrooms: string;
  bathrooms: string;

  // Step 7: Photos
  photos: Array<{ id: string; url: string; file?: File }>;
}

const DEFAULT_FORM_DATA: FormData = {
  hostType: 'resident',
  marketStrategy: 'private',
  leaseStyle: 'nightly',
  selectedNights: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], // Mon-Fri default
  weeklyPattern: '1on1off',
  monthlyAgreement: true,
  nightlyBaseRate: 100,
  nightlyDiscount: 20,
  weeklyTotal: 0,
  monthlyEstimate: 0,
  price: 2000,
  frequency: 'Month',
  utilitiesIncluded: true,
  utilityCost: 150,
  securityDeposit: 1000,
  cleaningFee: 150,
  typeOfSpace: '',
  address: {
    fullAddress: '',
    number: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    neighborhood: '',
    latitude: null,
    longitude: null,
    validated: false,
  },
  bedrooms: '1',
  bathrooms: '1',
  photos: [],
};

const STORAGE_KEY = 'selfListingV2Draft';

// Host Type Options
const HOST_TYPES = [
  { id: 'resident', description: 'I live in the property part-time and rent out the nights I\'m away.' },
  { id: 'liveout', description: 'I own or rent the property but do not live there.' },
  { id: 'coliving', description: 'I live in the property and rent out a private room in my space.' },
  { id: 'agent', description: 'I manage listings for landlords.' },
];

// Weekly Pattern Options
const WEEKLY_PATTERNS = [
  { value: '1on1off', label: 'One week on and one week off' },
  { value: '2on2off', label: 'Two weeks on and two weeks off' },
  { value: '1on3off', label: 'One week on and three weeks off' },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function SelfListingPageV2() {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM_DATA);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [headerKey, setHeaderKey] = useState(0);

  // Refs for nightly calculator
  const nightlyPricesRef = useRef<number[]>([100, 95, 90, 86, 82, 78, 74]);

  // Address autocomplete state and refs
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(false);

  // Photo drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Continue on Phone modal state
  const [showContinueOnPhoneModal, setShowContinueOnPhoneModal] = useState(false);
  const [continueOnPhoneLink, setContinueOnPhoneLink] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userPhoneNumber, setUserPhoneNumber] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftListingId, setDraftListingId] = useState<string | null>(null);

  // Edit mode state - for editing existing listings via ?id= parameter
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);

  // Toast notifications
  const { toasts, showToast, removeToast } = useToast();

  // Validation errors for highlighting fields
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Informational text tooltip state
  const [activeInfoTooltip, setActiveInfoTooltip] = useState<string | null>(null);

  // Refs for informational text tooltips
  const leaseStyleNightlyInfoRef = useRef<HTMLButtonElement>(null);
  const leaseStyleWeeklyInfoRef = useRef<HTMLButtonElement>(null);
  const leaseStyleMonthlyInfoRef = useRef<HTMLButtonElement>(null);
  const baseNightlyRateInfoRef = useRef<HTMLButtonElement>(null);
  const longStayDiscountInfoRef = useRef<HTMLButtonElement>(null);
  const damageDepositInfoRef = useRef<HTMLButtonElement>(null);
  const cleaningFeeInfoRef = useRef<HTMLButtonElement>(null);
  const desiredRentInfoRef = useRef<HTMLButtonElement>(null);
  const securityDepositInfoRef = useRef<HTMLButtonElement>(null);
  const utilitiesInfoRef = useRef<HTMLButtonElement>(null);

  // Informational text content
  const infoContent = {
    leaseStyleNightly: {
      title: 'Nightly Rental',
      content: 'Rent by the night with flexible availability. Perfect for hosts who want maximum control over their schedule.',
      expandedContent: 'With nightly rentals, you can select specific nights of the week to make available. Guests book individual nights, and you receive payment for each night booked. This model offers the highest flexibility but requires more active management.',
    },
    leaseStyleWeekly: {
      title: 'Weekly Rental',
      content: 'Rent in weekly patterns with consistent schedules. Ideal for hosts with predictable routines.',
      expandedContent: 'Weekly rentals allow you to set patterns like "one week on, one week off." This provides predictable income and less turnover than nightly rentals while maintaining some flexibility.',
    },
    leaseStyleMonthly: {
      title: 'Monthly Rental',
      content: 'Traditional month-to-month rental with stable, predictable income.',
      expandedContent: 'With monthly rentals, you receive a fixed monthly rate regardless of how many nights your guest uses. Split Lease may sublease unused nights to maximize occupancy. This model offers the most predictable income with minimal management.',
    },
    baseNightlyRate: {
      title: 'Base Nightly Rate',
      content: 'This is your starting price per night. Consecutive nights automatically get discounted based on your Long Stay Discount setting.',
      expandedContent: 'Set this to the rate you want for a single night stay. Multi-night bookings will be cheaper per night, encouraging longer stays and reducing your turnover effort.',
    },
    longStayDiscount: {
      title: 'Long Stay Discount',
      content: 'The percentage discount applied to consecutive nights. Higher discounts encourage longer bookings.',
      expandedContent: 'A 20% discount means each consecutive night gets progressively cheaper. For example, if your base rate is $100, night 2 might be $95, night 3 might be $90, and so on. This creates an incentive for guests to book longer stays.',
    },
    damageDeposit: {
      title: 'Damage Deposit',
      content: 'A refundable security deposit to protect your property against damages during the stay.',
      expandedContent: 'The damage deposit is held during the guest\'s stay and returned within 7 days after checkout, minus any deductions for damages. We recommend a minimum of $500 for adequate protection.',
    },
    cleaningFee: {
      title: 'Cleaning Fee',
      content: 'A one-time fee charged to guests to cover cleaning costs between stays.',
      expandedContent: 'This fee helps ensure your property stays in top condition for each guest. It covers professional cleaning, fresh linens, and general turnover preparation.',
    },
    desiredRent: {
      title: 'Desired Rent',
      content: 'The total amount you want to receive for each rental period (weekly or monthly).',
      expandedContent: 'This is your take-home amount before any Split Lease service fees. Set this based on your costs (mortgage, utilities, etc.) plus your desired profit margin.',
    },
    securityDeposit: {
      title: 'Security Deposit',
      content: 'A refundable deposit held for the duration of the lease to cover potential damages.',
      expandedContent: 'For weekly and monthly rentals, we recommend at least one week or month\'s rent as a security deposit. This is refunded at the end of the lease if no damages occur.',
    },
    utilities: {
      title: 'Utilities',
      content: 'Specify whether utilities are included in the rent or charged separately.',
      expandedContent: 'If utilities are not included, specify the estimated monthly cost so guests know what to expect. Common utilities include electricity, gas, water, internet, and trash removal.',
    },
  };

  // Handle info tooltip toggle
  const handleInfoClick = (tooltipId: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveInfoTooltip(activeInfoTooltip === tooltipId ? null : tooltipId);
  };

  // Access control state - guests should not access this page
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Access control: Redirect guest users to index page
  // This page is accessible to: logged-out users OR host users
  // Guest users should be redirected to the index page
  useEffect(() => {
    const checkAccess = async () => {
      console.log('🔐 SelfListingPageV2: Checking access control...');

      const loggedIn = await checkAuthStatus();

      if (!loggedIn) {
        // Logged out users can access - allow
        console.log('✅ SelfListingPageV2: User is logged out - access allowed');
        setIsCheckingAccess(false);
        return;
      }

      // User is logged in - check their type
      const userData = await validateTokenAndFetchUser();
      const userType = userData?.userType;

      console.log('🔐 SelfListingPageV2: User type:', userType);

      if (isGuest({ userType })) {
        // Guest users should not access this page - redirect to index
        console.log('❌ SelfListingPageV2: Guest user detected - redirecting to index');
        window.location.href = '/';
        return;
      }

      // Host users (or any other type) can access
      console.log('✅ SelfListingPageV2: Host user - access allowed');
      setIsCheckingAccess(false);
    };

    checkAccess();
  }, []);

  // Load draft and step from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Restore form data
        if (parsed.formData) {
          setFormData({ ...DEFAULT_FORM_DATA, ...parsed.formData });
        }
        // Restore current step
        if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 8) {
          setCurrentStep(parsed.currentStep);
        }
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, []);

  // Save draft and step to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      formData,
      currentStep,
    }));
  }, [formData, currentStep]);

  // Check auth status on mount and fetch user phone if logged in
  useEffect(() => {
    const initAuth = async () => {
      const loggedIn = await checkAuthStatus();
      setIsLoggedIn(loggedIn);

      if (loggedIn) {
        try {
          const userData = await validateTokenAndFetchUser();
          if (userData?.phoneNumber) {
            setUserPhoneNumber(userData.phoneNumber);
            setPhoneNumber(userData.phoneNumber);
          }
        } catch (err) {
          console.log('Could not fetch user data for phone number');
        }
      }
    };
    initAuth();
  }, []);

  // Handle URL parameters for continuing from another device or editing existing listing
  useEffect(() => {
    const loadDraftFromUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const listingId = urlParams.get('id');
      const draftId = urlParams.get('draft');
      const sessionId = urlParams.get('session');
      const step = urlParams.get('step');

      // Check for edit mode first (existing listing ID)
      if (listingId) {
        console.log('[SelfListingPageV2] Edit mode detected, loading listing:', listingId);
        setIsEditMode(true);
        setEditingListingId(listingId);

        try {
          const existingListing = await getListingById(listingId);

          if (existingListing) {
            // Clear localStorage draft to prevent conflicts
            localStorage.removeItem(STORAGE_KEY);

            // Pre-select the saved host type from the existing listing
            setFormData(prev => ({
              ...prev,
              hostType: existingListing.host_type || prev.hostType,
            }));

            console.log('[SelfListingPageV2] Listing loaded, hostType pre-set to:', existingListing.host_type);
          } else {
            console.warn('[SelfListingPageV2] Listing not found:', listingId);
          }
        } catch (error) {
          console.error('[SelfListingPageV2] Failed to load listing for editing:', error);
        }

        // Clear the URL parameters to avoid confusion on refresh
        window.history.replaceState({}, '', window.location.pathname);
        return; // Exit early, don't process draft/session params
      }

      if (draftId) {
        // Try to load from Supabase listing_drafts table
        try {
          const { data, error } = await supabase
            .from('listing_drafts')
            .select('form_data, current_step')
            .eq('id', draftId)
            .single();

          if (!error && data) {
            setFormData(data.form_data);
            if (data.form_data.nightlyPrices) {
              nightlyPricesRef.current = data.form_data.nightlyPrices;
            }
            setCurrentStep(data.current_step || 7);
            setDraftListingId(draftId);
          }
        } catch (err) {
          console.log('Could not load draft from database:', err);
        }
      } else if (sessionId) {
        // Try to load from localStorage (fallback)
        const storedData = localStorage.getItem(`${STORAGE_KEY}_session_${sessionId}`);
        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            if (parsed.formData) {
              setFormData(parsed.formData);
              if (parsed.formData.nightlyPrices) {
                nightlyPricesRef.current = parsed.formData.nightlyPrices;
              }
            }
            setCurrentStep(parsed.currentStep || 7);
            setDraftListingId(sessionId);
          } catch (err) {
            console.log('Could not parse localStorage draft:', err);
          }
        }
      }

      // If step parameter is provided, go to that step
      if (step) {
        const stepNum = parseInt(step, 10);
        if (stepNum >= 1 && stepNum <= 8) {
          setCurrentStep(stepNum);
        }
      }

      // Clear the URL parameters to avoid confusion on refresh
      if (draftId || sessionId) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    };

    loadDraftFromUrl();
  }, []);

  // Calculate nightly prices based on base rate and discount
  const calculateNightlyPrices = useCallback(() => {
    const { nightlyBaseRate, nightlyDiscount } = formData;
    const p5Target = nightlyBaseRate * (1 - nightlyDiscount / 100);
    const decay = nightlyBaseRate > 0 ? Math.pow(p5Target / nightlyBaseRate, 0.25) : 1;
    const clampedDecay = Math.max(0.7, Math.min(1, decay));

    const prices = [Math.ceil(nightlyBaseRate)];
    for (let i = 1; i < 7; i++) {
      prices.push(Math.ceil(prices[i - 1] * clampedDecay));
    }
    nightlyPricesRef.current = prices;

    // Calculate totals based on selected nights
    const numNights = formData.selectedNights.length;
    let weeklyTotal = 0;
    for (let i = 0; i < numNights && i < prices.length; i++) {
      weeklyTotal += prices[i];
    }

    setFormData(prev => ({
      ...prev,
      weeklyTotal,
      monthlyEstimate: weeklyTotal * 4.33,
    }));
  }, [formData.nightlyBaseRate, formData.nightlyDiscount, formData.selectedNights]);

  // Recalculate prices when relevant values change
  useEffect(() => {
    if (formData.leaseStyle === 'nightly') {
      calculateNightlyPrices();
    }
  }, [formData.nightlyBaseRate, formData.nightlyDiscount, formData.selectedNights, formData.leaseStyle]);

  // Initialize Google Places autocomplete when on step 6
  useEffect(() => {
    if (currentStep !== 6) return;

    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max

    const initAutocomplete = () => {
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initAutocomplete, 100);
        } else {
          setAddressError('Address autocomplete is unavailable. Please enter your address manually.');
        }
        return;
      }

      if (!addressInputRef.current) return;

      // Create NYC bounding box
      const nycBounds = new window.google.maps.LatLngBounds(
        new window.google.maps.LatLng(NYC_BOUNDS.south, NYC_BOUNDS.west),
        new window.google.maps.LatLng(NYC_BOUNDS.north, NYC_BOUNDS.east)
      );

      // Initialize autocomplete
      const autocomplete = new window.google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          bounds: nycBounds,
          strictBounds: true,
          fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id']
        }
      );

      autocompleteRef.current = autocomplete;

      // Prevent form submission on Enter
      window.google.maps.event.addDomListener(addressInputRef.current, 'keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
      });

      // Handle place selection
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();

        if (!place.place_id || !place.geometry || !place.address_components) {
          setAddressError('Please select a valid address from the dropdown');
          setIsAddressValid(false);
          return;
        }

        // Extract address components
        let streetNumber = '';
        let streetName = '';
        let city = '';
        let state = '';
        let zip = '';
        let neighborhood = '';
        let county = '';

        place.address_components.forEach((component) => {
          const types = component.types;
          if (types.includes('street_number')) streetNumber = component.long_name;
          if (types.includes('route')) streetName = component.long_name;
          if (types.includes('locality')) city = component.long_name;
          if (types.includes('administrative_area_level_1')) state = component.short_name;
          if (types.includes('administrative_area_level_2')) county = component.long_name;
          if (types.includes('postal_code')) zip = component.long_name;
          if (types.includes('neighborhood') || types.includes('sublocality')) neighborhood = component.long_name;
        });

        // Validate service area
        if (!isValidServiceArea(zip, state, county)) {
          const borough = zip ? getBoroughForZipCode(zip) : null;
          const errorMsg = borough
            ? `This address appears to be outside our service area.`
            : `This address is outside our NYC / Hudson County service area.`;
          setAddressError(errorMsg);
          setIsAddressValid(false);
          return;
        }

        // Update form data with validated address
        const parsedAddress: AddressData = {
          fullAddress: place.formatted_address || '',
          number: streetNumber,
          street: streetName,
          city: city,
          state: state,
          zip: zip,
          neighborhood: neighborhood,
          latitude: place.geometry.location?.lat() || null,
          longitude: place.geometry.location?.lng() || null,
          validated: true
        };

        updateFormData({ address: parsedAddress });
        setAddressError(null);
        setIsAddressValid(true);
        // Clear address validation error when valid address is selected
        setValidationErrors(prev => ({ ...prev, address: false }));
      });
    };

    initAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [currentStep]);

  // Handle manual address input change
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsAddressValid(false);
    setAddressError(null);
    // Clear address validation error when user starts typing
    if (validationErrors.address) {
      setValidationErrors(prev => ({ ...prev, address: false }));
    }
    updateFormData({
      address: {
        ...formData.address,
        fullAddress: value,
        validated: false
      }
    });
  };

  // Update form data
  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  // Handle night selection change from HostScheduleSelector
  const handleNightSelectionChange = (nights: NightId[]) => {
    updateFormData({ selectedNights: nights });
    // Clear night selector validation error when at least 2 nights are selected
    if (nights.length >= 2 && validationErrors.nightSelector) {
      setValidationErrors(prev => ({ ...prev, nightSelector: false }));
    }
  };

  // Get schedule text
  const getScheduleText = () => {
    const count = formData.selectedNights.length;
    const weekdayNights: NightId[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const isWeekdays = count === 5 && weekdayNights.every(n => formData.selectedNights.includes(n));

    if (count < 2) return { text: 'Select at least 2 nights', error: true };
    if (isWeekdays) return { text: 'Weekdays Only (You keep weekends!)', error: false };
    return { text: `${count} Nights / Week`, error: false };
  };

  // Determine next step based on lease style
  const getNextStep = (current: number): number => {
    if (current === 3) {
      return formData.leaseStyle === 'nightly' ? 4 : 5;
    }
    if (current === 4) {
      return 6; // Skip step 5 for nightly
    }
    return current + 1;
  };

  // Determine previous step based on lease style
  const getPrevStep = (current: number): number => {
    if (current === 6) {
      return formData.leaseStyle === 'nightly' ? 4 : 5;
    }
    if (current === 5) {
      return 3;
    }
    if (current === 4) {
      return 3;
    }
    return current - 1;
  };

  // Get display step number (for progress)
  const getDisplayStep = (actual: number): number => {
    if (formData.leaseStyle === 'nightly') {
      const map: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 6: 5, 7: 6, 8: 7 };
      return map[actual] || actual;
    } else {
      const map: Record<number, number> = { 1: 1, 2: 2, 3: 3, 5: 4, 6: 5, 7: 6, 8: 7 };
      return map[actual] || actual;
    }
  };

  // Scroll to first error field
  const scrollToFirstError = useCallback((errorFieldId: string) => {
    const element = document.getElementById(errorFieldId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  }, []);

  // Validation
  const validateStep = (step: number): boolean => {
    // Clear previous validation errors
    setValidationErrors({});

    switch (step) {
      case 3:
        if (formData.leaseStyle === 'nightly' && formData.selectedNights.length < 2) {
          showToast('Please select at least 2 nights', 'error', 4000);
          setValidationErrors({ nightSelector: true });
          scrollToFirstError('nightSelector');
          return false;
        }
        if (formData.leaseStyle === 'monthly' && !formData.monthlyAgreement) {
          showToast('You must agree to the terms or select a different rental style.', 'error', 4000);
          setValidationErrors({ monthlyAgreement: true });
          scrollToFirstError('monthlyAgreement');
          return false;
        }
        return true;
      case 5:
        if (!formData.price || formData.price <= 0) {
          showToast('Please enter a price', 'error', 4000);
          setValidationErrors({ price: true });
          scrollToFirstError('price');
          return false;
        }
        return true;
      case 6:
        if (!formData.typeOfSpace) {
          showToast('Please select a type of space', 'error', 4000);
          setValidationErrors({ typeOfSpace: true });
          scrollToFirstError('typeOfSpace');
          return false;
        }
        if (!formData.address.fullAddress.trim()) {
          showToast('Please enter your address', 'error', 4000);
          setValidationErrors({ address: true });
          scrollToFirstError('address');
          return false;
        }
        if (!formData.address.validated) {
          showToast('Please select a valid address from the dropdown suggestions', 'error', 4000);
          setValidationErrors({ address: true });
          scrollToFirstError('address');
          return false;
        }
        return true;
      case 7:
        // Photos are optional - validation passes even without photos
        return true;
      default:
        return true;
    }
  };

  // Navigation
  const nextStep = () => {
    if (!validateStep(currentStep)) return;

    const next = getNextStep(currentStep);
    if (next <= 8) {
      setCurrentStep(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    const prev = getPrevStep(currentStep);
    if (prev >= 1) {
      setCurrentStep(prev);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Skip current step (for optional steps like Photos)
  const skipStep = () => {
    const next = getNextStep(currentStep);
    if (next <= 8) {
      setCurrentStep(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Save draft to Supabase draft_listings table and generate continue link
  const saveDraftAndGenerateLink = async () => {
    setIsSavingDraft(true);
    try {
      // Get current Supabase Auth user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare draft data
      const draftData = {
        user_id: user.id,
        form_data: {
          ...formData,
          nightlyPrices: nightlyPricesRef.current,
        },
        current_step: 7, // Photos step
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let savedDraftId = draftListingId;

      if (draftListingId) {
        // Update existing draft
        const { error } = await supabase
          .from('listing_drafts')
          .update({
            form_data: draftData.form_data,
            current_step: draftData.current_step,
            updated_at: draftData.updated_at,
          })
          .eq('id', draftListingId);

        if (error) throw error;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('listing_drafts')
          .insert(draftData)
          .select('id')
          .single();

        if (error) throw error;
        savedDraftId = data.id;
        setDraftListingId(savedDraftId);
      }

      // Generate the continue link with draft ID and photos step
      const baseUrl = window.location.origin + window.location.pathname;
      const link = `${baseUrl}?draft=${savedDraftId}&step=7`;
      setContinueOnPhoneLink(link);

      return link;
    } catch (error: any) {
      console.error('Failed to save draft listing:', error);

      // If the listing_drafts table doesn't exist, fall back to localStorage-based approach
      if (error?.message?.includes('listing_drafts') || error?.code === '42P01') {
        console.log('Falling back to localStorage-based draft saving');
        // Generate a unique session ID
        const sessionId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Save to localStorage
        const draftData = {
          formData: {
            ...formData,
            nightlyPrices: nightlyPricesRef.current,
          },
          currentStep: 7,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(`${STORAGE_KEY}_session_${sessionId}`, JSON.stringify(draftData));

        // Generate link with session ID
        const baseUrl = window.location.origin + window.location.pathname;
        const link = `${baseUrl}?session=${sessionId}`;
        setContinueOnPhoneLink(link);
        setDraftListingId(sessionId);

        return link;
      }

      showToast('Failed to save progress. Please try again.', 'error', 4000);
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Handle Continue on Phone button click
  const handleContinueOnPhone = async () => {
    // Check if user is logged in - need to be logged in to save draft
    if (!isLoggedIn) {
      showToast('Please log in to save your progress and continue on phone', 'info', 4000);
      setShowAuthModal(true);
      return;
    }
    setShowContinueOnPhoneModal(true);
    // Start saving draft immediately when modal opens
    await saveDraftAndGenerateLink();
  };

  // Auth success handler
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setIsLoggedIn(true);
    setHeaderKey(prev => prev + 1);

    if (pendingSubmit) {
      setPendingSubmit(false);
      handleSubmit();
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    // Use validateTokenAndFetchUser to match Header's auth check behavior
    // This ensures consistency - if Header shows logged out, we show the modal
    const userData = await validateTokenAndFetchUser();
    const loggedIn = !!userData;
    setIsLoggedIn(loggedIn);

    if (!loggedIn) {
      console.log('[SelfListingPageV2] User not logged in, showing auth modal');
      setShowAuthModal(true);
      setPendingSubmit(true);
      return;
    }

    console.log('[SelfListingPageV2] User is logged in, proceeding with submission');
    setIsSubmitting(true);

    try {
      // Map form data to listingService format
      const listingData = mapFormDataToListingService(formData);
      const result = await createListing(listingData);

      console.log('[SelfListingPageV2] Listing created:', result);
      setCreatedListingId(result._id);
      setSubmitSuccess(true);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[SelfListingPageV2] Submit error:', error);
      alert('Failed to create listing. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Map form data to listingService format
  const mapFormDataToListingService = (data: FormData) => {
    // All days/nights available - used for weekly/monthly rentals
    const allDaysAvailable = {
      sunday: true,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
    };

    // For nightly: use user's selected nights
    // For weekly/monthly: all days should be available (full week/month rental)
    const availableNights = data.leaseStyle === 'nightly'
      ? {
          sunday: data.selectedNights.includes('sunday'),
          monday: data.selectedNights.includes('monday'),
          tuesday: data.selectedNights.includes('tuesday'),
          wednesday: data.selectedNights.includes('wednesday'),
          thursday: data.selectedNights.includes('thursday'),
          friday: data.selectedNights.includes('friday'),
          saturday: data.selectedNights.includes('saturday'),
        }
      : allDaysAvailable;

    // Build nightly pricing object if applicable
    const nightlyPricing = data.leaseStyle === 'nightly' ? {
      oneNightPrice: data.nightlyBaseRate,
      discountPercentage: data.nightlyDiscount,
      decayRate: Math.pow(1 - data.nightlyDiscount / 100, 0.25),
      calculatedRates: {
        night1: nightlyPricesRef.current[0],
        night2: nightlyPricesRef.current[1],
        night3: nightlyPricesRef.current[2],
        night4: nightlyPricesRef.current[3],
        night5: nightlyPricesRef.current[4],
        night6: nightlyPricesRef.current[5],
        night7: nightlyPricesRef.current[6],
      },
    } : null;

    return {
      // V2 specific fields
      hostType: data.hostType,
      marketStrategy: data.marketStrategy,
      source_type: 'self-listing-v2',

      // Space snapshot
      spaceSnapshot: {
        listingName: `${data.bedrooms} Bedroom ${data.typeOfSpace || 'Space'} in ${data.address.neighborhood || data.address.city || 'NYC'}`,
        typeOfSpace: data.typeOfSpace || 'Entire Place',
        bedrooms: parseInt(data.bedrooms) || 1,
        beds: parseInt(data.bedrooms) || 1,
        bathrooms: data.bathrooms === 'Shared' ? 1 : parseFloat(data.bathrooms) || 1,
        typeOfKitchen: 'Full Kitchen',
        typeOfParking: 'No Parking',
        address: {
          fullAddress: data.address.fullAddress,
          number: data.address.number,
          street: data.address.street,
          city: data.address.city,
          state: data.address.state,
          zip: data.address.zip,
          neighborhood: data.address.neighborhood,
          latitude: data.address.latitude,
          longitude: data.address.longitude,
          validated: data.address.validated,
        },
      },

      // Features (minimal for V2)
      features: {
        amenitiesInsideUnit: [],
        amenitiesOutsideUnit: [],
        descriptionOfLodging: `${data.bedrooms} bedroom ${(data.typeOfSpace || 'space').toLowerCase()} available for ${data.leaseStyle} rental.`,
        neighborhoodDescription: '',
      },

      // Lease styles
      // For weekly/monthly rentals, all days/nights should be available
      leaseStyles: {
        rentalType: data.leaseStyle.charAt(0).toUpperCase() + data.leaseStyle.slice(1),
        availableNights: availableNights, // Always pass availableNights (all days for weekly/monthly)
        weeklyPattern: data.leaseStyle === 'weekly' ? data.weeklyPattern : '',
        subsidyAgreement: data.leaseStyle === 'monthly' ? data.monthlyAgreement : false,
      },

      // Pricing
      pricing: {
        damageDeposit: data.leaseStyle === 'nightly' ? 500 : data.securityDeposit,
        maintenanceFee: data.leaseStyle === 'nightly' ? 0 : data.cleaningFee,
        extraCharges: data.leaseStyle !== 'nightly' && !data.utilitiesIncluded ? data.utilityCost : null,
        weeklyCompensation: data.leaseStyle === 'weekly' ? data.price : null,
        monthlyCompensation: data.leaseStyle === 'monthly' ? data.price : null,
        nightlyPricing: nightlyPricing,
      },

      // Rules (defaults)
      rules: {
        cancellationPolicy: 'Standard',
        preferredGender: 'No Preference',
        numberOfGuests: 2,
        checkInTime: '2:00 PM',
        checkOutTime: '11:00 AM',
        idealMinDuration: 2,
        idealMaxDuration: 52,
        houseRules: [],
        blockedDates: [],
      },

      // Photos
      photos: {
        photos: data.photos.map((p, i) => ({
          id: p.id,
          url: p.url,
          caption: '',
          displayOrder: i,
        })),
        minRequired: 0, // Photos are optional in V2
      },

      // Review
      review: {
        safetyFeatures: [],
        squareFootage: null,
        firstDayAvailable: new Date().toISOString().split('T')[0],
        agreedToTerms: true,
        optionalNotes: '',
        previousReviewsLink: '',
      },

      // Meta
      isSubmitted: true,
      isDraft: false,
    };
  };

  // Progress percentage
  const progressPercentage = (getDisplayStep(currentStep) / 7) * 100;

  // Render Step 1: Host Type
  const renderStep1 = () => (
    <div className="section-card">
      <h2>Who are you?</h2>
      <div className="form-group">
        <label>Select your host type</label>
        <div className="privacy-options">
          {HOST_TYPES.map(type => (
            <div
              key={type.id}
              className={`privacy-card ${formData.hostType === type.id ? 'selected' : ''}`}
              onClick={() => updateFormData({ hostType: type.id as FormData['hostType'] })}
            >
              <div className="privacy-radio"></div>
              <div className="privacy-content">
                <p>{type.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="btn-group">
        <button className="btn-next" onClick={nextStep}>Continue</button>
      </div>
    </div>
  );

  // Render Step 2: Market Strategy
  const renderStep2 = () => (
    <div className="section-card">
      <h2>Market Strategy</h2>
      <div className="form-group">
        <label>How should we market it?</label>
        <div className="privacy-options">
          <div
            className={`privacy-card ${formData.marketStrategy === 'private' ? 'selected' : ''}`}
            onClick={() => updateFormData({ marketStrategy: 'private' })}
          >
            <div className="privacy-radio"></div>
            <div className="privacy-content">
              <h3>Private Network (Concierge)</h3>
              <p>We search for a guest for you. Address remains hidden until vetting is complete. <strong>Recommended.</strong></p>
            </div>
          </div>
          <div
            className={`privacy-card ${formData.marketStrategy === 'public' ? 'selected' : ''}`}
            onClick={() => updateFormData({ marketStrategy: 'public' })}
          >
            <div className="privacy-radio"></div>
            <div className="privacy-content">
              <h3>Public Marketplace</h3>
              <p>Standard listing. Visible to all users immediately.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="btn-group">
        <button className="btn-next" onClick={nextStep}>Continue</button>
        <button className="btn-back" onClick={prevStep}>Back</button>
      </div>
    </div>
  );

  // Render Step 3: Listing Strategy
  const renderStep3 = () => {
    const scheduleInfo = getScheduleText();

    return (
      <div className="section-card">
        <h2>Listing Strategy</h2>

        <div className="form-group">
          <label>Lease Style</label>
          <div className="lease-options-columns">
            {(['nightly', 'weekly', 'monthly'] as const).map(style => {
              const infoRef = style === 'nightly' ? leaseStyleNightlyInfoRef
                : style === 'weekly' ? leaseStyleWeeklyInfoRef
                : leaseStyleMonthlyInfoRef;
              const tooltipId = `leaseStyle${style.charAt(0).toUpperCase() + style.slice(1)}` as keyof typeof infoContent;

              return (
                <div
                  key={style}
                  className={`privacy-card ${formData.leaseStyle === style ? 'selected' : ''}`}
                  onClick={() => updateFormData({ leaseStyle: style })}
                >
                  <div className="privacy-radio"></div>
                  <div className="privacy-content">
                    <h3 className="lease-style-header">
                      {style.charAt(0).toUpperCase() + style.slice(1)}
                      <button
                        ref={infoRef}
                        type="button"
                        className="info-help-btn"
                        onClick={handleInfoClick(tooltipId)}
                        aria-label={`Learn more about ${style} rental`}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </button>
                    </h3>
                    <p>
                      {style === 'nightly' && 'Rent by the night with flexible availability'}
                      {style === 'weekly' && 'Rent in weekly patterns'}
                      {style === 'monthly' && 'Traditional month-to-month rental'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nightly - Night Selector */}
        {formData.leaseStyle === 'nightly' && (
          <div
            id="nightSelector"
            className={`conditional-section visible ${validationErrors.nightSelector ? 'validation-error' : ''}`}
          >
            <label>Available Nights (Tap to select)</label>
            <div className="host-schedule-selector-wrapper">
              <HostScheduleSelector
                selectedNights={formData.selectedNights}
                onSelectionChange={handleNightSelectionChange}
                isClickable={true}
                className="v2-schedule-selector"
              />
            </div>
            <div
              className="schedule-text"
              style={{ color: scheduleInfo.error ? 'red' : 'var(--v2-primary)' }}
            >
              {scheduleInfo.text}
            </div>
          </div>
        )}

        {/* Weekly - Pattern Selector */}
        {formData.leaseStyle === 'weekly' && (
          <div className="conditional-section visible">
            <label>Select Weekly Pattern</label>
            <select
              value={formData.weeklyPattern}
              onChange={e => updateFormData({ weeklyPattern: e.target.value })}
            >
              {WEEKLY_PATTERNS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Monthly - Agreement */}
        {formData.leaseStyle === 'monthly' && (
          <div
            id="monthlyAgreement"
            className={`conditional-section visible ${validationErrors.monthlyAgreement ? 'validation-error' : ''}`}
          >
            <label>Monthly Lease Agreement</label>
            <p className="agreement-desc">
              With the 'Monthly' model, you receive a fixed monthly rate regardless of how many
              nights your guest uses. Split Lease may sublease unused nights to short-term guests,
              maximizing occupancy. If you'd rather not have additional guests in your space,
              our other models may suit you better.
            </p>
            <div className="agreement-option">
              <label className="agreement-label">
                <input
                  type="radio"
                  name="monthlyAgreement"
                  checked={formData.monthlyAgreement}
                  onChange={() => {
                    updateFormData({ monthlyAgreement: true });
                    // Clear validation error when user agrees
                    if (validationErrors.monthlyAgreement) {
                      setValidationErrors(prev => ({ ...prev, monthlyAgreement: false }));
                    }
                  }}
                />
                <span className="agreement-text">I agree to the monthly sublease terms</span>
              </label>
            </div>
            <div className="agreement-option">
              <label className="agreement-label">
                <input
                  type="radio"
                  name="monthlyAgreement"
                  checked={!formData.monthlyAgreement}
                  onChange={() => updateFormData({ monthlyAgreement: false })}
                />
                <span className="agreement-text">No, I will select a different rental style</span>
              </label>
            </div>
          </div>
        )}

        <div className="btn-group">
          <button className="btn-next" onClick={nextStep}>Continue</button>
          <button className="btn-back" onClick={prevStep}>Back</button>
        </div>
      </div>
    );
  };

  // Render Step 4: Nightly Pricing Calculator (Vertical Layout - matches HTML reference)
  const renderStep4 = () => {
    const sum5 = nightlyPricesRef.current.slice(0, 5).reduce((a, b) => a + b, 0);
    const avgPrice = Math.round(sum5 / 5);

    return (
      <div className="section-card">
        <h2>Pricing Strategy</h2>
        <p className="subtitle">Set your base rate. Longer stays get automatic discounts to encourage bookings.</p>

        <div className="nightly-calculator-vertical">
          {/* Base Nightly Rate Input */}
          <div className="control-group" style={{ textAlign: 'center' }}>
            <label className="calc-label label-with-info">
              Base Nightly Rate
              <button
                ref={baseNightlyRateInfoRef}
                type="button"
                className="info-help-btn"
                onClick={handleInfoClick('baseNightlyRate')}
                aria-label="Learn more about base nightly rate"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </label>
            <div className="base-input-wrapper">
              <span className="currency-symbol">$</span>
              <input
                type="number"
                className="base-input"
                value={formData.nightlyBaseRate}
                onChange={e => updateFormData({ nightlyBaseRate: Math.max(0, parseInt(e.target.value) || 0) })}
                min="0"
              />
            </div>
          </div>

          {/* Long Stay Discount Slider */}
          <div className="control-group">
            <div className="label-row">
              <span className="calc-label label-with-info">
                Long Stay Discount
                <button
                  ref={longStayDiscountInfoRef}
                  type="button"
                  className="info-help-btn"
                  onClick={handleInfoClick('longStayDiscount')}
                  aria-label="Learn more about long stay discount"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </button>
              </span>
              <span className="value-display">{formData.nightlyDiscount}%</span>
            </div>
            <div className="range-wrapper">
              <input
                type="range"
                min="0"
                max="50"
                value={formData.nightlyDiscount}
                onChange={e => updateFormData({ nightlyDiscount: parseInt(e.target.value) })}
              />
            </div>
            <div className="marks">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
            <p className="calc-hint">
              Consecutive nights get progressively cheaper. A 5-night stay averages <strong>${avgPrice}</strong>/night.
            </p>
          </div>

          {/* Color Palette Display - BELOW the slider */}
          <div className="nights-display-wrapper">
            <div className="nights-display-header">Price per consecutive night</div>
            <div className="palette-container">
              <div className="palette-row">
                {[1, 2, 3, 4, 5, 6, 7].map(night => (
                  <div key={night} className={`palette-swatch n${night}`}>
                    <span className="swatch-number">Night {night}</span>
                    <span className="swatch-price">${nightlyPricesRef.current[night - 1] || 0}</span>
                    <span className="swatch-label">per night</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="formula-row">
              {[1, 2, 3, 4, 5, 6, 7].map(night => {
                // Total for N nights = N * (price per night for that stay length)
                const pricePerNight = nightlyPricesRef.current[night - 1] || 0;
                const total = night * pricePerNight;
                return <div key={night} className="formula-item">${total}</div>;
              })}
            </div>
            <div className="formula-total-row">
              <div className="formula-total-label">7-Night Total</div>
              <div className="formula-total">
                ${7 * (nightlyPricesRef.current[6] || 0)}
              </div>
            </div>
          </div>

          {/* Summary Row */}
          <div className="summary-row">
            <div className="summary-item">
              <div className="summary-label">Your Weekly Total</div>
              <div className="summary-value">${Math.round(formData.weeklyTotal)}</div>
              <div className="summary-sub">{formData.selectedNights.length} nights</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Est. Monthly</div>
              <div className="summary-value">${Math.round(formData.monthlyEstimate)}</div>
              <div className="summary-sub">x 4.33 weeks</div>
            </div>
          </div>

          {/* Smart Pricing explanation */}
          <details className="pricing-details">
            <summary>How does Smart Pricing work?</summary>
            <div className="details-content">
              We calculate a "decay curve" for your pricing. The first night is your full Base Rate.
              Each consecutive night gets slightly cheaper based on your Discount setting.
              This encourages guests to book longer blocks (like Mon-Fri) instead of just two nights,
              maximizing your occupancy and reducing turnover effort.
            </div>
          </details>

          {/* Damage Deposit and Cleaning Fee */}
          <div className="nightly-fees-row">
            <div className="fee-input-group">
              <label className="calc-label label-with-info">
                Damage Deposit
                <button
                  ref={damageDepositInfoRef}
                  type="button"
                  className="info-help-btn"
                  onClick={handleInfoClick('damageDeposit')}
                  aria-label="Learn more about damage deposit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </button>
              </label>
              <div className="input-with-prefix">
                <span className="prefix">$</span>
                <input
                  type="number"
                  value={formData.securityDeposit || ''}
                  onChange={e => updateFormData({ securityDeposit: parseInt(e.target.value) || 0 })}
                  placeholder="500"
                />
              </div>
            </div>
            <div className="fee-input-group">
              <label className="calc-label label-with-info">
                Cleaning Fee
                <button
                  ref={cleaningFeeInfoRef}
                  type="button"
                  className="info-help-btn"
                  onClick={handleInfoClick('cleaningFee')}
                  aria-label="Learn more about cleaning fee"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </button>
              </label>
              <div className="input-with-prefix">
                <span className="prefix">$</span>
                <input
                  type="number"
                  value={formData.cleaningFee || ''}
                  onChange={e => updateFormData({ cleaningFee: parseInt(e.target.value) || 0 })}
                  placeholder="150"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="btn-group">
          <button className="btn-next" onClick={nextStep}>Continue</button>
          <button className="btn-back" onClick={prevStep}>Back</button>
        </div>
      </div>
    );
  };

  // Render Step 5: Financials (Weekly/Monthly)
  const renderStep5 = () => {
    const frequencyLabel = formData.leaseStyle === 'weekly' ? 'Week' : 'Month';

    return (
    <div className="section-card">
      <h2>Financials</h2>

      <div className="form-group">
        <label className="label-with-info">
          Desired Rent (Per {frequencyLabel})
          <button
            ref={desiredRentInfoRef}
            type="button"
            className="info-help-btn"
            onClick={handleInfoClick('desiredRent')}
            aria-label="Learn more about desired rent"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </label>
        <div className="input-with-prefix">
          <span className="prefix">$</span>
          <input
            id="price"
            type="number"
            value={formData.price || ''}
            onChange={e => {
              const value = parseInt(e.target.value) || 0;
              updateFormData({ price: value });
              if (value > 0 && validationErrors.price) {
                setValidationErrors(prev => ({ ...prev, price: false }));
              }
            }}
            placeholder={formData.leaseStyle === 'weekly' ? '500' : '2000'}
            className={validationErrors.price ? 'input-error' : ''}
          />
        </div>
      </div>

      <div className="row">
        <div className="col">
          <div className="form-group">
            <label className="label-with-info">
              Security Deposit
              <button
                ref={securityDepositInfoRef}
                type="button"
                className="info-help-btn"
                onClick={handleInfoClick('securityDeposit')}
                aria-label="Learn more about security deposit"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </label>
            <div className="input-with-prefix">
              <span className="prefix">$</span>
              <input
                type="number"
                value={formData.securityDeposit || ''}
                onChange={e => updateFormData({ securityDeposit: parseInt(e.target.value) || 0 })}
                placeholder="1000"
              />
            </div>
          </div>
        </div>
        <div className="col">
          <div className="form-group">
            <label className="label-with-info">
              Cleaning Fee
              <button
                ref={cleaningFeeInfoRef}
                type="button"
                className="info-help-btn"
                onClick={handleInfoClick('cleaningFee')}
                aria-label="Learn more about cleaning fee"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </label>
            <div className="input-with-prefix">
              <span className="prefix">$</span>
              <input
                type="number"
                value={formData.cleaningFee || ''}
                onChange={e => updateFormData({ cleaningFee: parseInt(e.target.value) || 0 })}
                placeholder="150"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="btn-group">
        <button className="btn-next" onClick={nextStep}>Continue</button>
        <button className="btn-back" onClick={prevStep}>Back</button>
      </div>
    </div>
    );
  };

  // Render Step 6: Space & Time
  const renderStep6 = () => (
    <div className="section-card">
      <h2>The Space & Time</h2>

      <div className="form-group">
        <label>Type of Space<span className="required">*</span></label>
        <select
          id="typeOfSpace"
          value={formData.typeOfSpace}
          onChange={e => {
            updateFormData({ typeOfSpace: e.target.value as SpaceType });
            if (e.target.value && validationErrors.typeOfSpace) {
              setValidationErrors(prev => ({ ...prev, typeOfSpace: false }));
            }
          }}
          className={`${!formData.typeOfSpace ? 'input-placeholder' : ''} ${validationErrors.typeOfSpace ? 'input-error' : ''}`}
        >
          <option value="">Choose an option…</option>
          <option value="Private Room">Private Room</option>
          <option value="Entire Place">Entire Place</option>
          <option value="Shared Room">Shared Room</option>
        </select>
      </div>

      <div className="form-group">
        <label>Address<span className="required">*</span></label>
        <input
          id="address"
          ref={addressInputRef}
          type="text"
          value={formData.address.fullAddress}
          onChange={handleAddressInputChange}
          placeholder="Start typing your address..."
          className={addressError || validationErrors.address ? 'input-error' : isAddressValid ? 'input-valid' : ''}
        />
        {addressError && (
          <span className="error-message">{addressError}</span>
        )}
        {isAddressValid && formData.address.neighborhood && (
          <span className="address-info">
            {formData.address.neighborhood}, {formData.address.city}
          </span>
        )}
      </div>

      <div className="row">
        <div className="col">
          <div className="form-group">
            <label>Bedrooms</label>
            <select
              value={formData.bedrooms}
              onChange={e => updateFormData({ bedrooms: e.target.value })}
            >
              <option value="Studio">Studio</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4+</option>
            </select>
          </div>
        </div>
        <div className="col">
          <div className="form-group">
            <label>Bathrooms</label>
            <select
              value={formData.bathrooms}
              onChange={e => updateFormData({ bathrooms: e.target.value })}
            >
              <option value="1">1</option>
              <option value="1.5">1.5</option>
              <option value="2">2</option>
              <option value="Shared">Shared</option>
            </select>
          </div>
        </div>
      </div>

      <div className="btn-group">
        <button className="btn-next" onClick={nextStep}>Continue</button>
        <button className="btn-back" onClick={prevStep}>Back</button>
      </div>
    </div>
  );

  // Render Step 7: Photos
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).map((file, index) => ({
      id: `photo_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      url: URL.createObjectURL(file),
      file,
    }));

    updateFormData({ photos: [...formData.photos, ...newPhotos] });
  };

  const removePhoto = (id: string) => {
    updateFormData({ photos: formData.photos.filter(p => p.id !== id) });
  };

  // Drag and drop handlers for photo reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...formData.photos];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    updateFormData({ photos: updated });
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const renderStep7 = () => (
    <div className="section-card">
      <h2>Photos</h2>
      <p className="subtitle">Add photos of your property (minimum 3 required)</p>

      {/* Photo Gallery with Drag and Drop */}
      {formData.photos.length > 0 && (
        <div className="photo-gallery">
          <p className="drag-drop-hint">Drag and drop photos to reorder. First photo is the cover photo.</p>
          <div className="photo-grid">
            {formData.photos.map((photo, index) => (
              <div
                key={photo.id}
                className={`photo-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                <img src={photo.url} alt={`Property photo ${index + 1}`} />
                <div className="photo-controls">
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="btn-delete"
                    title="Remove photo"
                  >
                    🗑️
                  </button>
                </div>
                {index === 0 && <div className="photo-badge">Cover Photo</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Zone */}
      <label className="photo-zone">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
          style={{ display: 'none' }}
        />
        <div className="photo-zone-content">
          <p className="photo-zone-title">Click to upload photos</p>
          <p className="photo-zone-subtitle">
            {formData.photos.length < 3
              ? `${3 - formData.photos.length} more photo${3 - formData.photos.length === 1 ? '' : 's'} required`
              : 'Add more photos (optional)'}
          </p>
        </div>
      </label>

      {/* Progress Indicator */}
      <div className="photo-progress">
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.min(100, (formData.photos.length / 3) * 100)}%` }}
          />
        </div>
        <p className="progress-text">
          {formData.photos.length} of 3 minimum photos uploaded
          {formData.photos.length >= 3 && ' ✓'}
        </p>
      </div>

      <div className="btn-group">
        <button className="btn-next" onClick={nextStep}>Continue</button>
        <button className="btn-skip" onClick={skipStep}>Skip for Now</button>
        <div className="btn-row-secondary">
          <button className="btn-back" onClick={prevStep}>Back</button>
          <button className="btn-continue-phone" onClick={handleContinueOnPhone}>
            <span className="btn-icon-phone">📱</span> Continue on Phone
          </button>
        </div>
      </div>
    </div>
  );

  // Render Step 8: Review
  const renderStep8 = () => {
    let priceDisplay: string;
    let freq: string;
    let schedule: string;

    if (formData.leaseStyle === 'nightly') {
      // Show price range: max (night 1) to min (night 7)
      const maxPrice = nightlyPricesRef.current[0] || formData.nightlyBaseRate;
      const minPrice = nightlyPricesRef.current[6] || maxPrice;
      priceDisplay = `$${minPrice} - $${maxPrice}`;
      freq = 'Night';
      schedule = getScheduleText().text;
    } else if (formData.leaseStyle === 'weekly') {
      priceDisplay = `$${formData.price}`;
      freq = 'Week';
      const pattern = WEEKLY_PATTERNS.find(p => p.value === formData.weeklyPattern);
      schedule = `Weekly: ${pattern?.label || formData.weeklyPattern}`;
    } else {
      priceDisplay = `$${formData.price}`;
      freq = 'Month';
      schedule = 'Monthly Agreement';
    }

    // Get host type label
    const hostTypeLabel = HOST_TYPES.find(h => h.id === formData.hostType)?.id || formData.hostType;
    const hostTypeDisplay = hostTypeLabel.charAt(0).toUpperCase() + hostTypeLabel.slice(1);

    return (
      <div className="section-card section-card-review">
        <h2>Review & Activate</h2>
        <p className="subtitle">Your listing is ready to go live on our network.</p>

        {/* Market Strategy Badge */}
        <div className="review-badge-row">
          <span
            className="review-market-badge"
            style={{ background: formData.marketStrategy === 'private' ? '#5b21b6' : '#10b981' }}
          >
            {formData.marketStrategy === 'private' ? 'Private (Concierge)' : 'Public Listing'}
          </span>
        </div>

        {/* Main Preview Card */}
        <div className="review-preview-card">
          {/* Photo Section */}
          <div className="review-photo-section">
            {formData.photos.length > 0 ? (
              <div className="review-photos-grid">
                {formData.photos.slice(0, 3).map((photo, idx) => (
                  <div
                    key={photo.id}
                    className={`review-photo ${idx === 0 ? 'review-photo-main' : 'review-photo-small'}`}
                    style={{ backgroundImage: `url(${photo.url})` }}
                  />
                ))}
              </div>
            ) : (
              <div className="review-photo-placeholder">
                <span>No photos uploaded</span>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="review-details-section">
            <h3 className="review-listing-title">
              {formData.bedrooms} Bedroom {formData.typeOfSpace || 'Space'}
            </h3>
            <p className="review-listing-location">
              {formData.address.neighborhood || formData.address.city || 'Your Location'}
            </p>

            <div className="review-details-grid">
              <div className="review-detail-item">
                <span className="review-detail-label">Address</span>
                <span className="review-detail-value">{formData.address.fullAddress || '—'}</span>
              </div>
              <div className="review-detail-item">
                <span className="review-detail-label">Bedrooms</span>
                <span className="review-detail-value">{formData.bedrooms}</span>
              </div>
              <div className="review-detail-item">
                <span className="review-detail-label">Bathrooms</span>
                <span className="review-detail-value">{formData.bathrooms}</span>
              </div>
              <div className="review-detail-item">
                <span className="review-detail-label">Host Type</span>
                <span className="review-detail-value">{hostTypeDisplay}</span>
              </div>
            </div>

            {/* Pricing Highlight */}
            <div className="review-pricing-box">
              <div className="review-price-main">
                <span className="review-price-amount">{priceDisplay}</span>
                <span className="review-price-period">/ {freq}</span>
              </div>
              <div className="review-schedule-badge">{schedule}</div>
            </div>
          </div>
        </div>

        <div className="btn-group">
          <button
            className="btn-next btn-success"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Activate Listing'}
          </button>
          <button className="btn-back" onClick={prevStep} disabled={isSubmitting}>Back</button>
        </div>
      </div>
    );
  };

  // Success Modal
  const renderSuccessModal = () => (
    <div className="success-modal-overlay">
      <div className="success-modal">
        <div className="success-icon">✓</div>
        <h2>Success!</h2>
        <p>Your request has been sent to our concierge team.</p>
        <div className="success-actions">
          <a href={createdListingId ? `/listing-dashboard?id=${createdListingId}` : '/listing-dashboard'} className="btn-next">Go to My Dashboard</a>
          {createdListingId && (
            <a
              href={`/preview-split-lease?id=${createdListingId}`}
              className="btn-next btn-secondary"
            >
              Preview Listing
            </a>
          )}
          <a
            href="/host-proposals"
            className="btn-next btn-secondary"
          >
            View Your Proposals
          </a>
        </div>
      </div>
    </div>
  );

  // Continue on Phone Modal
  const renderContinueOnPhoneModal = () => {
    const copyToClipboard = () => {
      if (!continueOnPhoneLink) return;
      navigator.clipboard.writeText(continueOnPhoneLink).then(() => {
        showToast('Link copied to clipboard!', 'success', 3000);
      }).catch(() => {
        showToast('Failed to copy link', 'error', 3000);
      });
    };

    const handleCloseModal = () => {
      setShowContinueOnPhoneModal(false);
      setContinueOnPhoneLink(null);
    };

    const formatPhoneNumber = (value: string) => {
      // Remove all non-digits
      const digits = value.replace(/\D/g, '');
      // Format as (XXX) XXX-XXXX
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhoneNumber(e.target.value);
      setPhoneNumber(formatted);
    };

    const handleSendLink = () => {
      // For now, just show a toast - SMS sending would require backend integration
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        showToast('Please enter a valid 10-digit phone number', 'error', 4000);
        return;
      }
      showToast('Magic link will be sent to your phone shortly!', 'success', 4000);
      // TODO: Call edge function to send SMS with continueOnPhoneLink
    };

    return (
      <div className="success-modal-overlay" onClick={handleCloseModal}>
        <div className="continue-phone-modal" onClick={(e) => e.stopPropagation()}>
          <button
            className="modal-close-btn"
            onClick={handleCloseModal}
            aria-label="Close modal"
          >
            ×
          </button>
          <div className="continue-phone-icon">📱</div>
          <h2>Continue on Your Phone</h2>
          <p>
            {isSavingDraft
              ? 'Saving your progress...'
              : 'Your progress has been saved! Scan the QR code or enter your phone number to receive a magic link.'}
          </p>

          {/* QR Code Section */}
          <div className="qr-placeholder">
            <div className="qr-code-box">
              {isSavingDraft ? (
                <div className="qr-loading">
                  <div className="spinner"></div>
                  <p>Saving your progress...</p>
                </div>
              ) : continueOnPhoneLink ? (
                <>
                  <QRCodeSVG
                    value={continueOnPhoneLink}
                    size={160}
                    level="M"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#1f2937"
                  />
                  <p className="qr-hint">Scan to upload photos from your phone</p>
                </>
              ) : (
                <div className="qr-error">
                  <p>Failed to generate QR code</p>
                  <button onClick={saveDraftAndGenerateLink} className="btn-retry">
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Phone Number Input Section */}
          <div className="phone-input-section">
            <label>Or send link to your phone:</label>
            <div className="phone-input-row">
              <input
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 555-5555"
                className="phone-input"
                maxLength={14}
              />
              <button
                type="button"
                className="btn-send-link"
                onClick={handleSendLink}
                disabled={isSavingDraft || !continueOnPhoneLink}
              >
                Send Link
              </button>
            </div>
            {userPhoneNumber && phoneNumber === userPhoneNumber && (
              <p className="phone-hint">Using your account phone number</p>
            )}
          </div>

          {/* Copy Link Section */}
          <div className="continue-link-section">
            <label>Or copy this link:</label>
            <div className="link-copy-row">
              <input
                type="text"
                value={continueOnPhoneLink || 'Generating link...'}
                readOnly
                className="continue-link-input"
              />
              <button
                type="button"
                className="btn-copy"
                onClick={copyToClipboard}
                disabled={!continueOnPhoneLink}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="btn-next btn-secondary"
              onClick={handleCloseModal}
            >
              Continue Here Instead
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Main render
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      default: return renderStep1();
    }
  };

  // Show loading state while checking access
  if (isCheckingAccess) {
    return (
      <div className="self-listing-v2-page">
        <Header />
        <main className="self-listing-v2-main">
          <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="self-listing-v2-page">
      <Header key={headerKey} />

      <main className="self-listing-v2-main">
        <div className="container">
          <div className="header-section">
            <h1>Listing Setup</h1>
            <p>Let's find your perfect match.</p>
          </div>

          <div className="progress-container">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPercentage}%` }} />
            </div>
            <div className="step-indicator">
              Step {getDisplayStep(currentStep)} of 7
            </div>
          </div>

          {renderCurrentStep()}
        </div>
      </main>

      {showAuthModal && (
        <SignUpLoginModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setPendingSubmit(false);
          }}
          initialView="signup"
          defaultUserType="host"
          skipReload={true}
          onAuthSuccess={handleAuthSuccess}
        />
      )}

      {submitSuccess && renderSuccessModal()}

      {showContinueOnPhoneModal && renderContinueOnPhoneModal()}

      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Informational Text Tooltips */}
      <InformationalText
        isOpen={activeInfoTooltip === 'leaseStyleNightly'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={leaseStyleNightlyInfoRef}
        title={infoContent.leaseStyleNightly.title}
        content={infoContent.leaseStyleNightly.content}
        expandedContent={infoContent.leaseStyleNightly.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'leaseStyleWeekly'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={leaseStyleWeeklyInfoRef}
        title={infoContent.leaseStyleWeekly.title}
        content={infoContent.leaseStyleWeekly.content}
        expandedContent={infoContent.leaseStyleWeekly.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'leaseStyleMonthly'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={leaseStyleMonthlyInfoRef}
        title={infoContent.leaseStyleMonthly.title}
        content={infoContent.leaseStyleMonthly.content}
        expandedContent={infoContent.leaseStyleMonthly.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'baseNightlyRate'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={baseNightlyRateInfoRef}
        title={infoContent.baseNightlyRate.title}
        content={infoContent.baseNightlyRate.content}
        expandedContent={infoContent.baseNightlyRate.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'longStayDiscount'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={longStayDiscountInfoRef}
        title={infoContent.longStayDiscount.title}
        content={infoContent.longStayDiscount.content}
        expandedContent={infoContent.longStayDiscount.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'damageDeposit'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={damageDepositInfoRef}
        title={infoContent.damageDeposit.title}
        content={infoContent.damageDeposit.content}
        expandedContent={infoContent.damageDeposit.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'cleaningFee'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={cleaningFeeInfoRef}
        title={infoContent.cleaningFee.title}
        content={infoContent.cleaningFee.content}
        expandedContent={infoContent.cleaningFee.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'desiredRent'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={desiredRentInfoRef}
        title={infoContent.desiredRent.title}
        content={infoContent.desiredRent.content}
        expandedContent={infoContent.desiredRent.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'securityDeposit'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={securityDepositInfoRef}
        title={infoContent.securityDeposit.title}
        content={infoContent.securityDeposit.content}
        expandedContent={infoContent.securityDeposit.expandedContent}
        showMoreAvailable={true}
      />

      <InformationalText
        isOpen={activeInfoTooltip === 'utilities'}
        onClose={() => setActiveInfoTooltip(null)}
        triggerRef={utilitiesInfoRef}
        title={infoContent.utilities.title}
        content={infoContent.utilities.content}
        expandedContent={infoContent.utilities.expandedContent}
        showMoreAvailable={true}
      />
    </div>
  );
}

export default SelfListingPageV2;
