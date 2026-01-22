/**
 * useCreateDocumentPageLogic - Business logic for CreateDocumentPage
 *
 * Handles:
 * - Authentication and authorization checks
 * - Fetching policy documents from Bubble (via Edge Function)
 * - Fetching host users from Supabase (via Edge Function)
 * - Form state management
 * - Document creation submission
 *
 * All side effects are isolated here, keeping the page component pure.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { validateDocumentForm } from '../../../logic/rules/documents/validateDocumentForm.js';

// Edge Function URL for document operations
const DOCUMENT_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/document`;

/**
 * Call the document Edge Function with a specific action
 */
async function callDocumentApi(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(DOCUMENT_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`
    },
    body: JSON.stringify({ action, payload })
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Request failed');
  }

  return result.data;
}

/**
 * Initial form state
 */
const INITIAL_FORM_STATE = {
  selectedPolicyId: '',
  documentTitle: '',
  selectedHostId: ''
};

export function useCreateDocumentPageLogic({ showToast }) {
  // ─────────────────────────────────────────────────────────
  // Authentication State
  // ─────────────────────────────────────────────────────────
  const [isInitializing, setIsInitializing] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ─────────────────────────────────────────────────────────
  // Data State
  // ─────────────────────────────────────────────────────────
  const [policyDocuments, setPolicyDocuments] = useState([]);
  const [hostUsers, setHostUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────────────────
  // Form State
  // ─────────────────────────────────────────────────────────
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedDocument, setLastCreatedDocument] = useState(null);

  // ─────────────────────────────────────────────────────────
  // Authentication Check
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.log('[CreateDocumentPage] No session, unauthorized');
          setIsAuthorized(false);
          setIsInitializing(false);
          return;
        }

        // Check if user is admin by querying the user table
        const { data: userData, error: userError } = await supabase
          .from('user')
          .select('_id, email, Name, "Type - User Current"')
          .eq('email', session.user.email)
          .single();

        if (userError || !userData) {
          console.error('[CreateDocumentPage] Failed to fetch user data:', userError);
          setIsAuthorized(false);
          setIsInitializing(false);
          return;
        }

        // Check for admin/Split Lease user type
        const userType = userData['Type - User Current'];
        const isAdmin = userType === 'Split Lease' || userType === 'Admin';

        if (!isAdmin) {
          console.log('[CreateDocumentPage] User is not admin:', userType);
          setIsAuthorized(false);
          setIsInitializing(false);
          return;
        }

        setCurrentUser(userData);
        setIsAuthorized(true);
        setIsInitializing(false);

        // Load initial data after authorization
        loadInitialData();
      } catch (err) {
        console.error('[CreateDocumentPage] Auth check error:', err);
        setIsAuthorized(false);
        setIsInitializing(false);
      }
    }

    checkAuth();
  }, []);

  // ─────────────────────────────────────────────────────────
  // Data Loading
  // ─────────────────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch policy documents and host users in parallel
      const [policies, hosts] = await Promise.all([
        callDocumentApi('list_policies'),
        callDocumentApi('list_hosts')
      ]);

      setPolicyDocuments(policies || []);
      setHostUsers(hosts || []);
    } catch (err) {
      console.error('[CreateDocumentPage] Failed to load data:', err);
      setError(err.message || 'Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────
  // Auto-populate document title when policy is selected
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (formState.selectedPolicyId && !formState.documentTitle) {
      const selectedPolicy = policyDocuments.find(
        (policy) => policy.id === formState.selectedPolicyId
      );
      if (selectedPolicy) {
        setFormState((prev) => ({
          ...prev,
          documentTitle: selectedPolicy.Name || selectedPolicy.name || ''
        }));
      }
    }
  }, [formState.selectedPolicyId, policyDocuments]);

  // ─────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────

  const handleFieldChange = useCallback((field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));

    // Clear error for the field when it changes
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: null }));
    }

    // Clear last created document message when form changes
    if (lastCreatedDocument) {
      setLastCreatedDocument(null);
    }
  }, [formErrors, lastCreatedDocument]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    // Validate form
    const errors = validateDocumentForm(formState);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Find the selected host to get their details
      const selectedHost = hostUsers.find(
        (host) => host._id === formState.selectedHostId
      );

      if (!selectedHost) {
        throw new Error('Selected host not found');
      }

      // Create the document
      const result = await callDocumentApi('create', {
        document_on_policies: formState.selectedPolicyId,
        document_sent_title: formState.documentTitle.trim(),
        host_user: formState.selectedHostId,
        host_email: selectedHost.email || '',
        host_name: selectedHost.Name || ''
      });

      // Success!
      setLastCreatedDocument(result);
      showToast({
        title: 'Document Created',
        content: `Document "${formState.documentTitle}" has been assigned to ${selectedHost.Name || selectedHost.email}`,
        type: 'success'
      });

      // Reset form
      setFormState(INITIAL_FORM_STATE);
    } catch (err) {
      console.error('[CreateDocumentPage] Failed to create document:', err);
      showToast({
        title: 'Error',
        content: err.message || 'Failed to create document. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formState, hostUsers, showToast]);

  const handleRetry = useCallback(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ─────────────────────────────────────────────────────────
  // Return public API
  // ─────────────────────────────────────────────────────────
  return {
    // Auth state
    isInitializing,
    isAuthorized,
    currentUser,

    // Data
    policyDocuments,
    hostUsers,
    isLoading,
    error,

    // Form
    formState,
    formErrors,
    isSubmitting,
    lastCreatedDocument,

    // Handlers
    handleFieldChange,
    handleSubmit,
    handleRetry
  };
}
