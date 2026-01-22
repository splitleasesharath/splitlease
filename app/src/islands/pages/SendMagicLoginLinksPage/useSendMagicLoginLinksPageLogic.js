/**
 * useSendMagicLoginLinksPageLogic - Business logic for Send Magic Login Links admin tool
 *
 * Pure business logic layer following Split Lease's hollow component pattern.
 * All state, side effects, and API calls contained here.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { getUserId, getUserType } from '../../../lib/auth.js';
import { useToast } from '../../shared/Toast';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useSendMagicLoginLinksPageLogic() {
  const { showToast } = useToast();

  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Step state
  const [currentStep, setCurrentStep] = useState(1); // 1-5

  // Step 1: User selection
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Step 2: Phone override
  const [phoneOverride, setPhoneOverride] = useState('');

  // Step 3: Page selection
  const [destinationPages, setDestinationPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);

  // Step 4: Data attachment
  const [userData, setUserData] = useState(null);
  const [attachedData, setAttachedData] = useState({});
  const [loadingUserData, setLoadingUserData] = useState(false);

  // Step 5: Send
  const [generatedLink, setGeneratedLink] = useState('');
  const [sending, setSending] = useState(false);

  // Check admin access on mount
  useEffect(() => {
    const checkAdminAccess = async () => {
      const userType = getUserType();
      if (userType !== 'admin') {
        showToast('Admin access required', 'error');
        window.location.href = '/';
        return;
      }

      setIsAdmin(true);
      setIsLoading(false);

      // Load destination pages immediately
      await loadDestinationPages();
    };

    checkAdminAccess();
  }, []);

  // Load users when search text changes (debounced)
  useEffect(() => {
    if (!isAdmin) return;

    const timeoutId = setTimeout(() => {
      loadUsers();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchText, isAdmin]);

  /**
   * Call Edge Function action
   */
  const callEdgeFunction = async (action, payload) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/magic-login-links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    const result = await response.json();
    return result.data;
  };

  /**
   * Step 1: Load users
   */
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await callEdgeFunction('list_users', {
        searchText,
        limit: 50
      });
      setUsers(data.users || []);
    } catch (error) {
      showToast(`Failed to load users: ${error.message}`, 'error');
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  /**
   * Step 3: Load destination pages
   */
  const loadDestinationPages = async () => {
    try {
      const data = await callEdgeFunction('get_destination_pages', {});
      setDestinationPages(data.pages || []);
    } catch (error) {
      showToast(`Failed to load destination pages: ${error.message}`, 'error');
    }
  };

  /**
   * Step 4: Load user data for selected user
   */
  const loadUserData = async (userId) => {
    setLoadingUserData(true);
    try {
      const data = await callEdgeFunction('get_user_data', { userId });
      setUserData(data);
    } catch (error) {
      showToast(`Failed to load user data: ${error.message}`, 'error');
      setUserData(null);
    } finally {
      setLoadingUserData(false);
    }
  };

  /**
   * Step 5: Send magic link
   */
  const sendMagicLink = async () => {
    if (!selectedUser || !selectedPage) {
      showToast('Please select a user and destination page', 'error');
      return;
    }

    setSending(true);
    try {
      // Build destination path with userId if needed
      let destinationPath = selectedPage.path;
      if (selectedPage.path.includes(':userId')) {
        destinationPath = selectedPage.path.replace(':userId', selectedUser.id);
      }
      if (selectedPage.path.includes(':id') && attachedData.id) {
        destinationPath = selectedPage.path.replace(':id', attachedData.id);
      }

      const data = await callEdgeFunction('send_magic_link', {
        userId: selectedUser.id,
        destinationPage: destinationPath,
        phoneOverride: phoneOverride || undefined,
        attachedData: Object.keys(attachedData).length > 0 ? attachedData : undefined,
      });

      setGeneratedLink(data.link);
      showToast(
        data.sentViaSms
          ? 'Magic link generated and sent via SMS!'
          : 'Magic link generated successfully!',
        'success'
      );
      setCurrentStep(5);
    } catch (error) {
      showToast(`Failed to send magic link: ${error.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  /**
   * Navigation handlers
   */
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setCurrentStep(2);
  };

  const handleContinueToPageSelection = () => {
    setCurrentStep(3);
  };

  const handleSelectPage = (page) => {
    setSelectedPage(page);
    if (page.requiresData && selectedUser) {
      loadUserData(selectedUser.id);
    }
    setCurrentStep(4);
  };

  const handleContinueToSend = () => {
    sendMagicLink();
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedUser(null);
    setPhoneOverride('');
    setSelectedPage(null);
    setAttachedData({});
    setGeneratedLink('');
    setUserData(null);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    showToast('Link copied to clipboard!', 'success');
  };

  return {
    // Auth
    isAdmin,
    isLoading,

    // Step navigation
    currentStep,
    setCurrentStep,

    // Step 1: User Search
    searchText,
    setSearchText,
    users,
    selectedUser,
    loadingUsers,
    handleSelectUser,

    // Step 2: Phone Override
    phoneOverride,
    setPhoneOverride,
    handleContinueToPageSelection,

    // Step 3: Page Selection
    destinationPages,
    selectedPage,
    handleSelectPage,

    // Step 4: Data Attachment
    userData,
    attachedData,
    setAttachedData,
    loadingUserData,
    handleContinueToSend,

    // Step 5: Send
    generatedLink,
    sending,
    handleCopyLink,
    handleReset,
  };
}
