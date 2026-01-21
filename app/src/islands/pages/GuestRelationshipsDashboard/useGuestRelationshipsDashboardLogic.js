/**
 * useGuestRelationshipsDashboardLogic
 *
 * All business logic for the Guest Relationships Dashboard page.
 * Follows the Hollow Component Pattern - page components contain ONLY JSX rendering.
 *
 * Architecture:
 * - Islands Architecture (independent React root)
 * - Corporate internal tool for managing guest relationships
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  searchGuests,
  getGuest,
  createGuest,
  listArticles,
  assignArticle,
  removeArticle,
  sendEmailToGuest,
  sendSMSToGuest,
  searchListings,
  getUserProposals
} from '../../../lib/guestRelationshipsApi.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const USER_TYPES = [
  { value: 'guest', label: 'Guest' },
  { value: 'host', label: 'Host' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'admin', label: 'Admin' }
];

const MESSAGE_TYPES = [
  { value: 'custom', label: 'Custom Email' },
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'reminder', label: 'Reminder Email' },
  { value: 'follow-up', label: 'Follow Up' }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Debounce function for search inputs
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format phone number for display
 */
function formatPhoneNumber(phone) {
  if (!phone) return '';
  // Strip non-digits
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useGuestRelationshipsDashboardLogic() {
  // -------------------------------------------------------------------------
  // STATE - Guest Selection
  // -------------------------------------------------------------------------
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestSearchResults, setGuestSearchResults] = useState([]);
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);

  // Search inputs
  const [nameSearch, setNameSearch] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');

  // Dropdown visibility
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);

  // -------------------------------------------------------------------------
  // STATE - Create Customer Form
  // -------------------------------------------------------------------------
  const [createCustomerForm, setCreateCustomerForm] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    email: '',
    phoneNumber: '',
    userType: 'guest'
  });
  const [createCustomerErrors, setCreateCustomerErrors] = useState({});
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);

  // -------------------------------------------------------------------------
  // STATE - Messaging
  // -------------------------------------------------------------------------
  const [messageType, setMessageType] = useState('custom');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [messageHistory, setMessageHistory] = useState([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // -------------------------------------------------------------------------
  // STATE - Proposals & Listings
  // -------------------------------------------------------------------------
  const [currentProposals, setCurrentProposals] = useState([]);
  const [suggestedProposals, setSuggestedProposals] = useState([]);
  const [suggestedListings, setSuggestedListings] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);

  // -------------------------------------------------------------------------
  // STATE - Multi-user Selection
  // -------------------------------------------------------------------------
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [allGuests, setAllGuests] = useState([]);

  // -------------------------------------------------------------------------
  // STATE - Knowledge Base
  // -------------------------------------------------------------------------
  const [allArticles, setAllArticles] = useState([]);
  const [assignedArticles, setAssignedArticles] = useState([]);
  const [selectedArticleToAdd, setSelectedArticleToAdd] = useState('');
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  // -------------------------------------------------------------------------
  // STATE - UI
  // -------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // -------------------------------------------------------------------------
  // EFFECTS - Initial Data Load
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Load initial data on mount
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setIsLoading(true);

      // Load articles and recent guests in parallel
      const [articlesResult, guestsResult, listingsResult] = await Promise.all([
        listArticles({ limit: 50 }).catch(() => ({ articles: [] })),
        searchGuests({ query: '', limit: 20 }).catch(() => []),
        searchListings({}, 20).catch(() => [])
      ]);

      setAllArticles(articlesResult.articles || []);
      setAllGuests(guestsResult || []);
      setAllListings(listingsResult || []);

    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // EFFECTS - Load Guest Details
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (selectedGuest?._id) {
      loadGuestDetails(selectedGuest._id);
    } else {
      // Clear guest-specific data
      setAssignedArticles([]);
      setCurrentProposals([]);
      setSuggestedProposals([]);
    }
  }, [selectedGuest?._id]);

  async function loadGuestDetails(guestId) {
    try {
      setIsLoadingProposals(true);

      const [guestData, proposalsData] = await Promise.all([
        getGuest(guestId, { includeHistory: true, includeArticles: true }),
        getUserProposals(guestId).catch(() => [])
      ]);

      // Update assigned articles from guest data
      if (guestData.assignedArticles) {
        setAssignedArticles(guestData.assignedArticles);
      }

      // Separate proposals by type
      const proposals = proposalsData || [];
      setCurrentProposals(proposals.filter(p => p.type === 'current' || !p.type));
      setSuggestedProposals(proposals.filter(p => p.type === 'suggested'));

    } catch (err) {
      console.error('Failed to load guest details:', err);
      showToast('Failed to load guest details', 'error');
    } finally {
      setIsLoadingProposals(false);
    }
  }

  // -------------------------------------------------------------------------
  // HANDLERS - Guest Search
  // -------------------------------------------------------------------------

  const handleSearchByName = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 2) {
        setGuestSearchResults([]);
        return;
      }

      try {
        setIsSearchingGuests(true);
        const results = await searchGuests({ query, searchType: 'name', limit: 10 });
        setGuestSearchResults(results || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearchingGuests(false);
      }
    }, 300),
    []
  );

  const handleSearchByPhone = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 3) {
        setGuestSearchResults([]);
        return;
      }

      try {
        setIsSearchingGuests(true);
        const results = await searchGuests({ query, searchType: 'phone', limit: 10 });
        setGuestSearchResults(results || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearchingGuests(false);
      }
    }, 300),
    []
  );

  const handleSearchByEmail = useCallback(
    debounce(async (query) => {
      if (!query || query.length < 3) {
        setGuestSearchResults([]);
        return;
      }

      try {
        setIsSearchingGuests(true);
        const results = await searchGuests({ query, searchType: 'email', limit: 10 });
        setGuestSearchResults(results || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearchingGuests(false);
      }
    }, 300),
    []
  );

  function handleNameSearchChange(value) {
    setNameSearch(value);
    handleSearchByName(value);
  }

  function handlePhoneSearchChange(value) {
    setPhoneSearch(value);
    handleSearchByPhone(value);
  }

  function handleEmailSearchChange(value) {
    setEmailSearch(value);
    handleSearchByEmail(value);
  }

  function handleGuestSelect(guest) {
    setSelectedGuest(guest);
    // Clear search inputs and close dropdowns
    setNameSearch('');
    setPhoneSearch('');
    setEmailSearch('');
    setShowNameDropdown(false);
    setShowPhoneDropdown(false);
    setShowEmailDropdown(false);
    setGuestSearchResults([]);
  }

  function handleClearSelectedGuest() {
    setSelectedGuest(null);
  }

  // -------------------------------------------------------------------------
  // HANDLERS - Create Customer Form
  // -------------------------------------------------------------------------

  function handleCreateCustomerFieldChange(field, value) {
    setCreateCustomerForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (createCustomerErrors[field]) {
      setCreateCustomerErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }

  function validateCreateCustomerForm() {
    const errors = {};

    if (!createCustomerForm.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!createCustomerForm.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!createCustomerForm.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createCustomerForm.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!createCustomerForm.phoneNumber?.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }

    setCreateCustomerErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleCreateCustomer() {
    if (!validateCreateCustomerForm()) return;

    try {
      setIsCreatingCustomer(true);
      const newGuest = await createGuest(createCustomerForm);

      // Select the newly created guest
      setSelectedGuest({
        _id: newGuest._id,
        firstName: newGuest.firstName,
        lastName: newGuest.lastName,
        email: newGuest.email,
        phoneNumber: newGuest.phoneNumber
      });

      // Clear form
      setCreateCustomerForm({
        firstName: '',
        lastName: '',
        birthDate: '',
        email: '',
        phoneNumber: '',
        userType: 'guest'
      });

      // Add to allGuests
      setAllGuests(prev => [newGuest, ...prev]);

      showToast('Customer created successfully', 'success');
    } catch (err) {
      console.error('Failed to create customer:', err);
      showToast(err.message || 'Failed to create customer', 'error');
    } finally {
      setIsCreatingCustomer(false);
    }
  }

  // -------------------------------------------------------------------------
  // HANDLERS - Messaging
  // -------------------------------------------------------------------------

  async function handleSendEmail() {
    if (!selectedGuest || !emailSubject || !emailBody) {
      showToast('Please fill in all email fields', 'error');
      return;
    }

    try {
      setIsSendingMessage(true);

      await sendEmailToGuest({
        to: selectedGuest.email,
        subject: emailSubject,
        body: emailBody
      });

      // Add to message history
      const newMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'staff',
        recipientId: selectedGuest._id,
        messageBody: `Subject: ${emailSubject}\n\n${emailBody}`,
        messageType: 'email',
        status: 'sent',
        timestamp: new Date().toISOString()
      };
      setMessageHistory(prev => [newMessage, ...prev]);

      // Clear form
      setEmailSubject('');
      setEmailBody('');

      showToast('Email sent successfully', 'success');
    } catch (err) {
      console.error('Failed to send email:', err);
      showToast(err.message || 'Failed to send email', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleSendSMS() {
    if (!selectedGuest || !smsBody) {
      showToast('Please enter a message', 'error');
      return;
    }

    // Format phone for E.164
    const phone = selectedGuest.phoneNumber?.replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      showToast('Invalid phone number', 'error');
      return;
    }

    const formattedPhone = phone.length === 10 ? `+1${phone}` : `+${phone}`;

    try {
      setIsSendingMessage(true);

      await sendSMSToGuest({
        to: formattedPhone,
        body: smsBody
      });

      // Add to message history
      const newMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'staff',
        recipientId: selectedGuest._id,
        messageBody: smsBody,
        messageType: 'sms',
        status: 'sent',
        timestamp: new Date().toISOString()
      };
      setMessageHistory(prev => [newMessage, ...prev]);

      // Clear form
      setSmsBody('');

      showToast('SMS sent successfully', 'success');
    } catch (err) {
      console.error('Failed to send SMS:', err);
      showToast(err.message || 'Failed to send SMS', 'error');
    } finally {
      setIsSendingMessage(false);
    }
  }

  // -------------------------------------------------------------------------
  // HANDLERS - Proposals
  // -------------------------------------------------------------------------

  function handleRemoveProposal(proposalId) {
    setCurrentProposals(prev => prev.filter(p => p.id !== proposalId));
    setSuggestedProposals(prev => prev.filter(p => p.id !== proposalId));
    showToast('Proposal removed', 'success');
  }

  function handleConfirmPricing(proposalId) {
    showToast('Pricing confirmation not yet implemented', 'info');
  }

  function handleAddSuggestedProposal(listingId) {
    const listing = allListings.find(l => l._id === listingId || l.id === listingId);
    if (!listing) return;

    const newProposal = {
      id: `prop-${Date.now()}`,
      listingId,
      listing,
      userId: selectedGuest?._id || '',
      moveInDate: new Date().toISOString().split('T')[0],
      daysSelected: 7,
      nights: 7,
      duration: '1 week',
      nightlyPrice: 100,
      status: 'pending',
      type: 'suggested',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setSuggestedProposals(prev => [...prev, newProposal]);
    showToast('Suggested proposal added', 'success');
  }

  // -------------------------------------------------------------------------
  // HANDLERS - Listings
  // -------------------------------------------------------------------------

  function handleAddListing(listingId, userIds) {
    const listing = allListings.find(l => l._id === listingId || l.id === listingId);
    if (listing && !suggestedListings.some(l => (l._id || l.id) === listingId)) {
      setSuggestedListings(prev => [...prev, listing]);
      showToast('Listing added', 'success');
    }
  }

  function handleRemoveListing(listingId) {
    setSuggestedListings(prev => prev.filter(l => (l._id || l.id) !== listingId));
    showToast('Listing removed', 'success');
  }

  function handleAddCuratedListing(listingId) {
    showToast('Curated listing feature not yet implemented', 'info');
  }

  // -------------------------------------------------------------------------
  // HANDLERS - Multi-user Selection
  // -------------------------------------------------------------------------

  function handleSelectAllGuests() {
    setSelectedUsers(allGuests.map(g => g._id));
  }

  function handleDeselectAllGuests() {
    setSelectedUsers([]);
  }

  function handleToggleUserSelection(userId) {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }

  // -------------------------------------------------------------------------
  // HANDLERS - Knowledge Base
  // -------------------------------------------------------------------------

  async function handleAddArticle(articleId) {
    if (!selectedGuest || !articleId) return;

    try {
      setIsLoadingArticles(true);
      await assignArticle(selectedGuest._id, articleId);

      // Find the article and add to assigned list
      const article = allArticles.find(a => a.id === articleId);
      if (article) {
        setAssignedArticles(prev => [...prev, {
          ...article,
          assignedAt: new Date().toISOString()
        }]);
      }

      setSelectedArticleToAdd('');
      showToast('Article assigned', 'success');
    } catch (err) {
      console.error('Failed to assign article:', err);
      showToast(err.message || 'Failed to assign article', 'error');
    } finally {
      setIsLoadingArticles(false);
    }
  }

  async function handleRemoveArticle(articleId) {
    if (!selectedGuest || !articleId) return;

    try {
      setIsLoadingArticles(true);
      await removeArticle(selectedGuest._id, articleId);

      setAssignedArticles(prev => prev.filter(a => a.id !== articleId));
      showToast('Article removed', 'success');
    } catch (err) {
      console.error('Failed to remove article:', err);
      showToast(err.message || 'Failed to remove article', 'error');
    } finally {
      setIsLoadingArticles(false);
    }
  }

  // -------------------------------------------------------------------------
  // HELPERS - Toast Notifications
  // -------------------------------------------------------------------------

  function showToast(message, type = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // -------------------------------------------------------------------------
  // COMPUTED VALUES
  // -------------------------------------------------------------------------

  const availableArticles = useMemo(() => {
    const assignedIds = new Set(assignedArticles.map(a => a.id));
    return allArticles.filter(a => !assignedIds.has(a.id));
  }, [allArticles, assignedArticles]);

  const guestHistory = selectedGuest?.history || [];

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------

  return {
    // Constants
    USER_TYPES,
    MESSAGE_TYPES,

    // Guest Selection
    selectedGuest,
    guestSearchResults,
    isSearchingGuests,
    nameSearch,
    phoneSearch,
    emailSearch,
    showNameDropdown,
    showPhoneDropdown,
    showEmailDropdown,

    // Guest Selection Handlers
    handleNameSearchChange,
    handlePhoneSearchChange,
    handleEmailSearchChange,
    handleGuestSelect,
    handleClearSelectedGuest,
    setShowNameDropdown,
    setShowPhoneDropdown,
    setShowEmailDropdown,

    // Create Customer
    createCustomerForm,
    createCustomerErrors,
    isCreatingCustomer,
    handleCreateCustomerFieldChange,
    handleCreateCustomer,

    // Messaging
    messageType,
    setMessageType,
    emailSubject,
    setEmailSubject,
    emailBody,
    setEmailBody,
    smsBody,
    setSmsBody,
    messageHistory,
    isSendingMessage,
    handleSendEmail,
    handleSendSMS,

    // Proposals
    currentProposals,
    suggestedProposals,
    isLoadingProposals,
    handleRemoveProposal,
    handleConfirmPricing,
    handleAddSuggestedProposal,

    // Listings
    suggestedListings,
    allListings,
    handleAddListing,
    handleRemoveListing,
    handleAddCuratedListing,

    // Multi-user Selection
    selectedUsers,
    allGuests,
    handleSelectAllGuests,
    handleDeselectAllGuests,
    handleToggleUserSelection,

    // Knowledge Base
    allArticles,
    assignedArticles,
    availableArticles,
    selectedArticleToAdd,
    setSelectedArticleToAdd,
    isLoadingArticles,
    handleAddArticle,
    handleRemoveArticle,

    // History
    guestHistory,

    // UI State
    isLoading,
    error,
    toast,

    // Helpers
    formatPhoneNumber
  };
}
