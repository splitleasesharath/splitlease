/**
 * Edit Listing Details - Business Logic Hook
 * Following the Hollow Component Pattern - all business logic is in this hook
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { generateListingDescription, generateListingTitle } from '../../../lib/aiService';
import { getCommonHouseRules } from './services/houseRulesService';
import { getCommonSafetyFeatures } from './services/safetyFeaturesService';
import { getCommonInUnitAmenities, getCommonBuildingAmenities } from './services/amenitiesService';
import { getNeighborhoodByZipCode, getNeighborhoodDescriptionWithFallback } from './services/neighborhoodService';
import { uploadPhoto } from '../../../lib/photoUpload';

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
  const formDataInitializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isLoadingInUnitAmenities, setIsLoadingInUnitAmenities] = useState(false);
  const [isLoadingBuildingAmenities, setIsLoadingBuildingAmenities] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(false);
  const [isLoadingSafetyFeatures, setIsLoadingSafetyFeatures] = useState(false);
  const [isLoadingNeighborhood, setIsLoadingNeighborhood] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [toast, setToast] = useState(null);

  // Photo drag and drop state
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState(null);
  const [dragOverPhotoIndex, setDragOverPhotoIndex] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    name: true,
    title: true,
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

  // Lock body scroll when modal is open
  useEffect(() => {
    // Store original body styles
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const scrollY = window.scrollY;

    // Lock scroll by fixing the body position
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    // Cleanup: restore original styles and scroll position when component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      // Restore scroll position
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Initialize form data from listing (only once on initial mount)
  // This prevents formData from being reset when listing is refreshed after autosave
  useEffect(() => {
    if (!listing || formDataInitializedRef.current) return;

    setFormData({
      Name: listing.Name,
      Description: listing.Description,
      'Description - Neighborhood': listing['Description - Neighborhood'],
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
      'Features - SQFT of Room': listing['Features - SQFT of Room'],
      'Kitchen Type': listing['Kitchen Type'],
      'Features - Parking type': listing['Features - Parking type'],
      'Features - Secure Storage Option': listing['Features - Secure Storage Option'],
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
    formDataInitializedRef.current = true;
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

    // Autosave to database but don't trigger parent refresh (avoids scroll jump)
    // Parent will refresh listing when modal is closed
    try {
      await updateListing(listing._id, { [field]: newArray });
      showToast(item, `${itemType} ${isChecked ? 'added' : 'removed'}!`);
    } catch (error) {
      console.error('Autosave error:', error);
      showToast('Error saving', 'Please try again', 'error');
      // Revert on error
      setFormData(prev => ({ ...prev, [field]: currentArray }));
    }
  }, [formData, listing, updateListing, showToast]);

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
    setIsLoadingRules(true);
    try {
      const commonRules = await getCommonHouseRules();

      if (commonRules.length === 0) {
        showToast('No common rules found', 'Database returned no pre-set rules', 'error');
        return;
      }

      const selectedRules = Array.isArray(formData['Features - House Rules'])
        ? formData['Features - House Rules']
        : [];
      const newRules = [...new Set([...selectedRules, ...commonRules])];
      setFormData(prev => ({ ...prev, 'Features - House Rules': newRules }));

      // Save to database but don't trigger parent refresh (avoids scroll jump)
      // Parent will refresh listing when modal is closed
      await updateListing(listing._id, { 'Features - House Rules': newRules });
      showToast('Common rules loaded!', `${commonRules.length} rules added`);
    } catch (e) {
      console.error('[loadCommonRules] Error:', e);
      showToast('Error loading rules', 'Please try again', 'error');
    } finally {
      setIsLoadingRules(false);
    }
  }, [formData, listing, updateListing, showToast]);

  const loadCommonSafetyFeatures = useCallback(async () => {
    setIsLoadingSafetyFeatures(true);
    try {
      const commonFeatures = await getCommonSafetyFeatures();

      if (commonFeatures.length === 0) {
        showToast('No common safety features found', 'Database returned no pre-set features', 'error');
        return;
      }

      const currentFeatures = Array.isArray(formData['Features - Safety'])
        ? formData['Features - Safety']
        : [];
      const newFeatures = [...new Set([...currentFeatures, ...commonFeatures])];
      setFormData(prev => ({ ...prev, 'Features - Safety': newFeatures }));

      // Save to database but don't trigger parent refresh (avoids scroll jump)
      // Parent will refresh listing when modal is closed
      await updateListing(listing._id, { 'Features - Safety': newFeatures });
      showToast('Common safety features loaded!', `${commonFeatures.length} features added`);
    } catch (e) {
      console.error('[loadCommonSafetyFeatures] Error:', e);
      showToast('Error loading safety features', 'Please try again', 'error');
    } finally {
      setIsLoadingSafetyFeatures(false);
    }
  }, [formData, listing, updateListing, showToast]);

  const loadCommonInUnitAmenities = useCallback(async () => {
    setIsLoadingInUnitAmenities(true);
    try {
      const commonAmenities = await getCommonInUnitAmenities();

      if (commonAmenities.length === 0) {
        showToast('No common in-unit amenities found', 'Database returned no pre-set amenities', 'error');
        return;
      }

      const currentAmenities = Array.isArray(formData['Features - Amenities In-Unit'])
        ? formData['Features - Amenities In-Unit']
        : [];
      const newAmenities = [...new Set([...currentAmenities, ...commonAmenities])];
      setFormData(prev => ({ ...prev, 'Features - Amenities In-Unit': newAmenities }));

      // Save to database but don't trigger parent refresh (avoids scroll jump)
      // Parent will refresh listing when modal is closed
      await updateListing(listing._id, { 'Features - Amenities In-Unit': newAmenities });
      showToast('Common in-unit amenities loaded!', `${commonAmenities.length} amenities added`);
    } catch (e) {
      console.error('[loadCommonInUnitAmenities] Error:', e);
      showToast('Error loading amenities', 'Please try again', 'error');
    } finally {
      setIsLoadingInUnitAmenities(false);
    }
  }, [formData, listing, updateListing, showToast]);

  const loadCommonBuildingAmenities = useCallback(async () => {
    setIsLoadingBuildingAmenities(true);
    try {
      const commonAmenities = await getCommonBuildingAmenities();

      if (commonAmenities.length === 0) {
        showToast('No common building amenities found', 'Database returned no pre-set amenities', 'error');
        return;
      }

      const currentAmenities = Array.isArray(formData['Features - Amenities In-Building'])
        ? formData['Features - Amenities In-Building']
        : [];
      const newAmenities = [...new Set([...currentAmenities, ...commonAmenities])];
      setFormData(prev => ({ ...prev, 'Features - Amenities In-Building': newAmenities }));

      // Save to database but don't trigger parent refresh (avoids scroll jump)
      // Parent will refresh listing when modal is closed
      await updateListing(listing._id, { 'Features - Amenities In-Building': newAmenities });
      showToast('Common building amenities loaded!', `${commonAmenities.length} amenities added`);
    } catch (e) {
      console.error('[loadCommonBuildingAmenities] Error:', e);
      showToast('Error loading amenities', 'Please try again', 'error');
    } finally {
      setIsLoadingBuildingAmenities(false);
    }
  }, [formData, listing, updateListing, showToast]);

  const loadNeighborhoodTemplate = useCallback(async () => {
    // Get ZIP code from form data or listing
    const zipCode = formData['Location - Zip Code'] || listing?.['Location - Zip Code'];

    if (!zipCode) {
      showToast('Missing ZIP code', 'Please add a ZIP code first to load the neighborhood template', 'error');
      return;
    }

    setIsLoadingNeighborhood(true);
    try {
      // Build address data for AI fallback
      const addressData = {
        fullAddress: `${formData['Location - City'] || listing?.['Location - City'] || ''}, ${formData['Location - State'] || listing?.['Location - State'] || ''}`,
        city: formData['Location - City'] || listing?.['Location - City'] || '',
        state: formData['Location - State'] || listing?.['Location - State'] || '',
        zip: zipCode,
      };

      const result = await getNeighborhoodDescriptionWithFallback(zipCode, addressData);

      if (result && result.description) {
        handleInputChange('Description - Neighborhood', result.description);

        if (result.source === 'ai') {
          showToast('Description generated!', 'AI-generated neighborhood description based on address');
        } else {
          showToast('Template loaded!', `Loaded description for ${result.neighborhoodName || 'neighborhood'}`);
        }
      } else {
        showToast('Could not load template', `No description available for ZIP: ${zipCode}`, 'error');
      }
    } catch (error) {
      console.error('[loadNeighborhoodTemplate] Error:', error);
      showToast('Error loading template', 'Please try again', 'error');
    } finally {
      setIsLoadingNeighborhood(false);
    }
  }, [formData, listing, handleInputChange, showToast]);

  /**
   * Extract listing data from current form/listing for AI generation
   */
  const extractListingDataForAI = useCallback(() => {
    return {
      listingName: formData.Name || listing?.Name || '',
      address: `${formData['Location - City'] || listing?.['Location - City'] || ''}, ${formData['Location - State'] || listing?.['Location - State'] || ''}`,
      neighborhood: formData['Location - Hood'] || listing?.['Location - Hood'] || formData['Location - Borough'] || listing?.['Location - Borough'] || '',
      typeOfSpace: formData['Features - Type of Space'] || listing?.['Features - Type of Space'] || '',
      bedrooms: formData['Features - Qty Bedrooms'] ?? listing?.['Features - Qty Bedrooms'] ?? 0,
      beds: formData['Features - Qty Beds'] ?? listing?.['Features - Qty Beds'] ?? 0,
      bathrooms: formData['Features - Qty Bathrooms'] ?? listing?.['Features - Qty Bathrooms'] ?? 0,
      kitchenType: formData['Kitchen Type'] || listing?.['Kitchen Type'] || '',
      amenitiesInsideUnit: formData['Features - Amenities In-Unit'] || listing?.['Features - Amenities In-Unit'] || [],
      amenitiesOutsideUnit: formData['Features - Amenities In-Building'] || listing?.['Features - Amenities In-Building'] || [],
    };
  }, [formData, listing]);

  /**
   * Generate AI listing title
   */
  const generateAITitle = useCallback(async () => {
    setIsGeneratingTitle(true);
    try {
      const listingData = extractListingDataForAI();

      if (!listingData.neighborhood && !listingData.typeOfSpace) {
        showToast('Missing data', 'Please fill in neighborhood or space type first', 'error');
        return;
      }

      console.log('[EditListingDetails] Generating AI title with data:', listingData);
      const generatedTitle = await generateListingTitle(listingData);

      if (generatedTitle) {
        handleInputChange('Name', generatedTitle);
        showToast('Title generated!', 'AI title applied successfully');
      } else {
        showToast('Could not generate title', 'Please try again', 'error');
      }
    } catch (error) {
      console.error('[EditListingDetails] Error generating title:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast('Error generating title', errorMessage, 'error');
    } finally {
      setIsGeneratingTitle(false);
    }
  }, [extractListingDataForAI, handleInputChange, showToast]);

  /**
   * Generate AI listing description
   */
  const generateAIDescription = useCallback(async () => {
    setIsGeneratingDescription(true);
    try {
      const listingData = extractListingDataForAI();

      console.log('[EditListingDetails] Generating AI description with data:', listingData);
      const generatedDescription = await generateListingDescription(listingData);

      if (generatedDescription) {
        handleInputChange('Description', generatedDescription);
        showToast('Description generated!', 'AI description applied successfully');
      } else {
        showToast('Could not generate description', 'Please try again', 'error');
      }
    } catch (error) {
      console.error('[EditListingDetails] Error generating description:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast('Error generating description', errorMessage, 'error');
    } finally {
      setIsGeneratingDescription(false);
    }
  }, [extractListingDataForAI, handleInputChange, showToast]);

  const addPhotoUrl = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (url) {
      const photos = Array.isArray(formData['Features - Photos'])
        ? formData['Features - Photos']
        : [];
      handleInputChange('Features - Photos', [...photos, url]);
    }
  }, [formData, handleInputChange]);

  /**
   * Handle file upload for photos
   */
  const handlePhotoUpload = useCallback(async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhotos(true);
    const currentPhotos = Array.isArray(formData['Features - Photos'])
      ? formData['Features - Photos']
      : [];

    try {
      const uploadedUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const photoObj = { file, url: URL.createObjectURL(file) };
        const result = await uploadPhoto(photoObj, listing._id, currentPhotos.length + i);
        uploadedUrls.push(result.url);
      }

      const newPhotos = [...currentPhotos, ...uploadedUrls];
      handleInputChange('Features - Photos', newPhotos);

      // Autosave to database
      const updated = await updateListing(listing._id, { 'Features - Photos': newPhotos });
      onSave(updated);
      showToast(`${uploadedUrls.length} photo(s) uploaded!`, 'Photos saved successfully');
    } catch (error) {
      console.error('[handlePhotoUpload] Error:', error);
      showToast('Error uploading photos', error.message || 'Please try again', 'error');
    } finally {
      setIsUploadingPhotos(false);
      // Reset file input
      e.target.value = '';
    }
  }, [formData, listing, handleInputChange, updateListing, onSave, showToast]);

  /**
   * Remove a photo from the list
   */
  const removePhoto = useCallback(async (index) => {
    const currentPhotos = Array.isArray(formData['Features - Photos'])
      ? formData['Features - Photos']
      : [];
    const newPhotos = currentPhotos.filter((_, i) => i !== index);

    handleInputChange('Features - Photos', newPhotos);

    // Autosave to database
    try {
      const updated = await updateListing(listing._id, { 'Features - Photos': newPhotos });
      onSave(updated);
      showToast('Photo removed', 'Changes saved');
    } catch (error) {
      console.error('[removePhoto] Error:', error);
      showToast('Error removing photo', 'Please try again', 'error');
      // Revert on error
      handleInputChange('Features - Photos', currentPhotos);
    }
  }, [formData, listing, handleInputChange, updateListing, onSave, showToast]);

  /**
   * Drag and drop handlers for photo reordering
   */
  const handlePhotoDragStart = useCallback((index) => {
    setDraggedPhotoIndex(index);
  }, []);

  const handlePhotoDragOver = useCallback((e, index) => {
    e.preventDefault();
    setDragOverPhotoIndex(index);
  }, []);

  const handlePhotoDragLeave = useCallback(() => {
    setDragOverPhotoIndex(null);
  }, []);

  const handlePhotoDrop = useCallback(async (e, dropIndex) => {
    e.preventDefault();
    if (draggedPhotoIndex === null || draggedPhotoIndex === dropIndex) {
      setDraggedPhotoIndex(null);
      setDragOverPhotoIndex(null);
      return;
    }

    const currentPhotos = Array.isArray(formData['Features - Photos'])
      ? formData['Features - Photos']
      : [];
    const updated = [...currentPhotos];
    const [draggedItem] = updated.splice(draggedPhotoIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    handleInputChange('Features - Photos', updated);
    setDraggedPhotoIndex(null);
    setDragOverPhotoIndex(null);

    // Autosave to database
    try {
      const result = await updateListing(listing._id, { 'Features - Photos': updated });
      onSave(result);
      showToast('Photos reordered', 'Changes saved');
    } catch (error) {
      console.error('[handlePhotoDrop] Error:', error);
      showToast('Error reordering photos', 'Please try again', 'error');
      handleInputChange('Features - Photos', currentPhotos);
    }
  }, [formData, draggedPhotoIndex, listing, handleInputChange, updateListing, onSave, showToast]);

  const handlePhotoDragEnd = useCallback(() => {
    setDraggedPhotoIndex(null);
    setDragOverPhotoIndex(null);
  }, []);

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
    isGeneratingTitle,
    isGeneratingDescription,
    isLoadingInUnitAmenities,
    isLoadingBuildingAmenities,
    isLoadingRules,
    isLoadingSafetyFeatures,
    isLoadingNeighborhood,
    isUploadingPhotos,
    toast,
    expandedSections,

    // Photo drag and drop state
    draggedPhotoIndex,
    dragOverPhotoIndex,

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
    loadCommonInUnitAmenities,
    loadCommonBuildingAmenities,
    loadNeighborhoodTemplate,
    generateAITitle,
    generateAIDescription,
    addPhotoUrl,
    handlePhotoUpload,
    removePhoto,
    handlePhotoDragStart,
    handlePhotoDragOver,
    handlePhotoDragLeave,
    handlePhotoDrop,
    handlePhotoDragEnd,
    dismissToast,
    onClose
  };
}
