/**
 * Edit Listing Details - Business Logic Hook
 * Following the Hollow Component Pattern - all business logic is in this hook
 */

import { useState, useEffect, useCallback } from 'react';
import { COMMON_RULES, COMMON_SAFETY_FEATURES, NEIGHBORHOOD_TEMPLATE } from './constants';

/**
 * Custom hook containing all business logic for EditListingDetails component
 * @param {Object} params
 * @param {Object} params.listing - The listing data to edit
 * @param {string} params.editSection - The section being edited
 * @param {Function} params.onClose - Close handler
 * @param {Function} params.onSave - Save handler (receives updated listing)
 * @param {Function} params.updateListing - Function to persist changes to database
 */
export function useEditListingDetailsLogic({ listing, editSection, onClose, onSave, updateListing }) {
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    name: true,
    description: true,
    neighborhood: true,
    location: true,
    details: true,
    rules: true,
    availability: true,
    photos: true,
    amenities: true,
    storage: true,
    safety: true,
    space: true,
    building: true
  });

  // Initialize form data from listing
  useEffect(() => {
    if (!listing) return;

    setFormData({
      Name: listing.Name,
      Description: listing.Description,
      'Description Neighborhood': listing['Description Neighborhood'],
      'Location - City': listing['Location - City'],
      'Location - State': listing['Location - State'],
      'Location - Zip Code': listing['Location - Zip Code'],
      'Location - Borough': listing['Location - Borough'],
      'Location - Hood': listing['Location - Hood'],
      'Features - Type of Space': listing['Features - Type of Space'],
      'Features - Qty Bedrooms': listing['Features - Qty Bedrooms'],
      'Features - Qty Bathrooms': listing['Features - Qty Bathrooms'],
      'Features - Qty Beds': listing['Features - Qty Beds'],
      'Features - Qty Guests': listing['Features - Qty Guests'],
      'Features - SQFT Area': listing['Features - SQFT Area'],
      'Kitchen Type': listing['Kitchen Type'],
      'Features - House Rules': listing['Features - House Rules'],
      'Features - Photos': listing['Features - Photos'],
      'Features - Amenities In-Unit': listing['Features - Amenities In-Unit'],
      'Features - Amenities In-Building': listing['Features - Amenities In-Building'],
      'Features - Safety': listing['Features - Safety'],
      'First Available': listing['First Available'],
      'Minimum Nights': listing['Minimum Nights'],
      'Maximum Nights': listing['Maximum Nights'],
      'Cancellation Policy': listing['Cancellation Policy']
    });
  }, [listing]);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = useCallback((message, subMessage, type = 'success') => {
    setToast({ type, message, subMessage });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Autosave function for checkboxes (amenities, rules, safety features)
  const handleCheckboxAutosave = useCallback(async (field, item, isChecked, itemType) => {
    const currentArray = (formData[field]) || [];
    let newArray;

    if (isChecked) {
      newArray = [...currentArray, item];
    } else {
      newArray = currentArray.filter(i => i !== item);
    }

    // Update local state
    setFormData(prev => ({ ...prev, [field]: newArray }));

    // Autosave to database
    try {
      const updatedListing = await updateListing(listing._id, { [field]: newArray });
      onSave(updatedListing);
      showToast(item, `${itemType} ${isChecked ? 'added' : 'removed'}!`);
    } catch (error) {
      console.error('Autosave error:', error);
      showToast('Error saving', 'Please try again', 'error');
      // Revert on error
      setFormData(prev => ({ ...prev, [field]: currentArray }));
    }
  }, [formData, listing, updateListing, onSave, showToast]);

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      const updatedListing = await updateListing(listing._id, formData);
      showToast('Your changes have been saved');
      onSave(updatedListing);
      setTimeout(onClose, 1000);
    } catch (error) {
      console.error('Error saving:', error);
      showToast('Failed to save changes', 'Please try again', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [listing, formData, updateListing, onSave, onClose, showToast]);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const loadCommonRules = useCallback(async () => {
    const selectedRules = Array.isArray(formData['Features - House Rules'])
      ? formData['Features - House Rules']
      : [];
    const newRules = [...new Set([...selectedRules, ...COMMON_RULES])];
    setFormData(prev => ({ ...prev, 'Features - House Rules': newRules }));

    try {
      const updated = await updateListing(listing._id, { 'Features - House Rules': newRules });
      onSave(updated);
      showToast('Common rules loaded!');
    } catch (e) {
      console.error(e);
      showToast('Error loading rules', 'Please try again', 'error');
    }
  }, [formData, listing, updateListing, onSave, showToast]);

  const loadCommonSafetyFeatures = useCallback(async () => {
    const safetyFeatures = Array.isArray(formData['Features - Safety'])
      ? formData['Features - Safety']
      : [];
    const newFeatures = [...new Set([...safetyFeatures, ...COMMON_SAFETY_FEATURES])];
    setFormData(prev => ({ ...prev, 'Features - Safety': newFeatures }));

    try {
      const updated = await updateListing(listing._id, { 'Features - Safety': newFeatures });
      onSave(updated);
      showToast('Common safety features loaded!');
    } catch (e) {
      console.error(e);
      showToast('Error loading safety features', 'Please try again', 'error');
    }
  }, [formData, listing, updateListing, onSave, showToast]);

  const loadNeighborhoodTemplate = useCallback(() => {
    handleInputChange('Description Neighborhood', NEIGHBORHOOD_TEMPLATE);
  }, [handleInputChange]);

  const addPhotoUrl = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (url) {
      const photos = Array.isArray(formData['Features - Photos'])
        ? formData['Features - Photos']
        : [];
      handleInputChange('Features - Photos', [...photos, url]);
    }
  }, [formData, handleInputChange]);

  const getSectionTitle = useCallback(() => {
    switch (editSection) {
      case 'name': return 'Property Info';
      case 'description': return 'Description of Lodging';
      case 'neighborhood': return 'Neighborhood Description';
      case 'location': return 'Property Info';
      case 'details': return 'Details';
      case 'rules': return 'Rules';
      case 'availability': return 'Availability';
      case 'photos': return 'Photos';
      case 'amenities': return 'Amenities';
      default: return 'Edit Listing';
    }
  }, [editSection]);

  const getSectionSubtitle = useCallback(() => {
    switch (editSection) {
      case 'name': return 'Update listing name and the full property address';
      case 'description': return 'Please type in a new description';
      case 'neighborhood': return 'Please type in a new neighborhood description';
      case 'amenities': return 'Select amenities available in your listing';
      case 'rules': return 'Set house rules and guest policies';
      case 'details': return 'Update space specifications and safety features';
      default: return '';
    }
  }, [editSection]);

  // Derived state for form arrays
  const inUnitAmenities = Array.isArray(formData['Features - Amenities In-Unit'])
    ? formData['Features - Amenities In-Unit']
    : [];

  const buildingAmenities = Array.isArray(formData['Features - Amenities In-Building'])
    ? formData['Features - Amenities In-Building']
    : [];

  const selectedRules = Array.isArray(formData['Features - House Rules'])
    ? formData['Features - House Rules']
    : [];

  const safetyFeatures = Array.isArray(formData['Features - Safety'])
    ? formData['Features - Safety']
    : [];

  const photos = Array.isArray(formData['Features - Photos'])
    ? formData['Features - Photos']
    : [];

  return {
    // State
    formData,
    isLoading,
    toast,
    expandedSections,

    // Derived state
    inUnitAmenities,
    buildingAmenities,
    selectedRules,
    safetyFeatures,
    photos,

    // Section info
    sectionTitle: getSectionTitle(),
    sectionSubtitle: getSectionSubtitle(),

    // Actions
    handleInputChange,
    handleCheckboxAutosave,
    handleSave,
    toggleSection,
    loadCommonRules,
    loadCommonSafetyFeatures,
    loadNeighborhoodTemplate,
    addPhotoUrl,
    dismissToast,
    onClose
  };
}
