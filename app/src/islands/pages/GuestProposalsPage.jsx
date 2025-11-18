/**
 * Guest Proposals Page - COMPLETE REBUILD
 *
 * Rebuilt from Bubble.io implementation based on:
 * - Live page screenshots (input/guest-proposals/.playwright-mcp/live)
 * - Comprehensive documentation (input/guest-proposals/*.md)
 * - Verified Supabase database schema
 *
 * Database Tables Used:
 * - proposal: Main proposal data with original + hc (host-changed/counteroffer) fields
 * - virtualmeetingschedulesandlinks: Virtual meeting data
 * - user: User profile and verification data
 * - listing: Property details, location, amenities
 * - zat_features_houserule: House rules
 *
 * Key Features:
 * - Proposal selector dropdown (My Proposals (count))
 * - Triple loading strategy: URL param → dropdown → first proposal
 * - Dual proposal system: original terms + host counteroffer terms
 * - Progress tracker: 6-stage proposal journey
 * - Dynamic action buttons based on proposal status
 * - Virtual meeting state machine (5 workflows)
 * - Modals: Host Profile, Map, VM Response, Compare Terms, Edit Proposal
 *
 * NO FALLBACK MECHANISMS - Direct database queries, authentic data only
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { getAuthToken } from '../../lib/auth.js';

// Shared components
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';

// Proposal components
import ProposalSelector from '../proposals/ProposalSelector.jsx';
import ProposalCard from '../proposals/ProposalCard.jsx';
import ProgressTracker from '../proposals/ProgressTracker.jsx';
import EmptyState from '../proposals/EmptyState.jsx';

// Modals
import HostProfileModal from '../modals/HostProfileModal.jsx';
import MapModal from '../modals/MapModal.jsx';
import VirtualMeetingModal from '../modals/VirtualMeetingModal.jsx';
import CompareTermsModal from '../modals/CompareTermsModal.jsx';
import EditProposalModal from '../modals/EditProposalModal.jsx';

export default function GuestProposalsPage() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Core data
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Modal visibility states
  const [showHostProfileModal, setShowHostProfileModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showVirtualMeetingModal, setShowVirtualMeetingModal] = useState(false);
  const [vmModalView, setVmModalView] = useState('request'); // VM 5-state workflow
  const [showCompareTermsModal, setShowCompareTermsModal] = useState(false);
  const [showEditProposalModal, setShowEditProposalModal] = useState(false);

  // ============================================================================
  // DATA LOADING FUNCTIONS
  // ============================================================================

  /**
   * Initialize page: Load user and all proposals
   * Implements triple loading strategy:
   * 1. Check URL parameter (?proposal=id)
   * 2. Use dropdown selection
   * 3. Default to first proposal
   */
  async function initializePage() {
    try {
      setLoading(true);
      setError(null);

      // Get authentication token
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get user email from localStorage
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('User email not found in storage');
      }

      console.log('📧 Loading proposals for user:', userEmail);

      // Query all proposals for this user (excluding deleted)
      const { data: proposalsData, error: proposalsError } = await supabase
        .from('proposal')
        .select('*')
        .eq('Guest email', userEmail)
        .or('Deleted.is.null,Deleted.eq.false')
        .order('Created Date', { ascending: false });

      if (proposalsError) throw proposalsError;

      console.log(`✅ Loaded ${proposalsData?.length || 0} proposals`);
      setProposals(proposalsData || []);

      // Implement loading strategy
      if (proposalsData && proposalsData.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const proposalIdFromURL = urlParams.get('proposal');

        let proposalToLoad;

        if (proposalIdFromURL) {
          // Strategy 1: URL parameter
          proposalToLoad = proposalsData.find(p => p._id === proposalIdFromURL);
          if (!proposalToLoad) {
            console.warn('⚠️ Proposal from URL not found, using first proposal');
            proposalToLoad = proposalsData[0];
          }
        } else {
          // Strategy 3: First proposal (strategy 2 dropdown handled by user interaction)
          proposalToLoad = proposalsData[0];
        }

        await loadProposalDetails(proposalToLoad);
      }

    } catch (err) {
      console.error('❌ Error initializing page:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Load complete details for a specific proposal
   * Enriches proposal with:
   * - Listing data
   * - Host user data
   * - House rules
   * - Virtual meeting data
   */
  async function loadProposalDetails(proposal) {
    try {
      console.log('🔍 Loading details for proposal:', proposal._id);

      const enrichedProposal = { ...proposal };

      // Load listing
      if (proposal.Listing) {
        const { data: listingData, error: listingError } = await supabase
          .from('listing')
          .select('*')
          .eq('_id', proposal.Listing)
          .single();

        if (!listingError && listingData) {
          enrichedProposal._listing = listingData;
        }
      }

      // Load host user (from listing creator)
      if (enrichedProposal._listing?.['Created By']) {
        const { data: hostData, error: hostError } = await supabase
          .from('user')
          .select(`
            _id,
            "Name - First",
            "Name - Full",
            "Profile Photo",
            "About Me / Bio",
            "Email - Address",
            "Phone Number",
            "linkedIn verification",
            "Phone Number Verified",
            "Email - Verified",
            "Identity Verified"
          `)
          .eq('_id', enrichedProposal._listing['Created By'])
          .single();

        if (!hostError && hostData) {
          enrichedProposal._host = hostData;
        }
      }

      // Load house rules
      if (proposal['House Rules'] && Array.isArray(proposal['House Rules']) && proposal['House Rules'].length > 0) {
        const { data: rulesData, error: rulesError } = await supabase
          .from('zat_features_houserule')
          .select('_id, Name, Icon')
          .in('_id', proposal['House Rules']);

        if (!rulesError && rulesData) {
          enrichedProposal._houseRules = rulesData;
        }
      }

      // Load virtual meeting
      if (proposal['virtual meeting']) {
        const { data: vmData, error: vmError } = await supabase
          .from('virtualmeetingschedulesandlinks')
          .select('*')
          .eq('_id', proposal['virtual meeting'])
          .single();

        if (!vmError && vmData) {
          enrichedProposal._virtualMeeting = vmData;
        }
      }

      setSelectedProposal(enrichedProposal);
      console.log('✅ Proposal details loaded successfully');

    } catch (err) {
      console.error('❌ Error loading proposal details:', err);
    }
  }

  /**
   * Handle proposal selection from dropdown
   * Updates URL and loads new proposal details
   */
  async function handleProposalChange(proposalId) {
    const proposal = proposals.find(p => p._id === proposalId);
    if (!proposal) return;

    // Update URL (Strategy 1: URL parameter)
    const url = new URL(window.location);
    url.searchParams.set('proposal', proposalId);
    window.history.pushState({}, '', url);

    // Load proposal details
    await loadProposalDetails(proposal);
  }

  // ============================================================================
  // ACTION HANDLERS - Proposal Management
  // ============================================================================

  /**
   * Delete Proposal (soft delete)
   * Sets Deleted = true instead of hard delete
   * Follows soft delete pattern for audit trail
   */
  async function handleDeleteProposal() {
    if (!selectedProposal) return;

    const confirmed = window.confirm(
      'Are you sure you want to delete this proposal? This action cannot be undone.'
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('proposal')
        .update({
          Deleted: true,
          'Modified Date': new Date().toISOString()
        })
        .eq('_id', selectedProposal._id);

      if (error) throw error;

      console.log('✅ Proposal deleted successfully');
      alert('Proposal deleted successfully');

      // Reload proposals list
      await initializePage();

    } catch (err) {
      console.error('❌ Error deleting proposal:', err);
      alert('Failed to delete proposal. Please try again.');
    }
  }

  /**
   * Cancel Proposal
   * Updates status to "Cancelled by Guest"
   * Captures cancellation reason
   */
  async function handleCancelProposal() {
    if (!selectedProposal) return;

    const reason = window.prompt('Please provide a reason for cancellation (optional):');
    if (reason === null) return; // User clicked cancel

    try {
      const { error } = await supabase
        .from('proposal')
        .update({
          Status: 'Cancelled by Guest',
          'reason for cancellation': reason || 'No reason provided',
          'Modified Date': new Date().toISOString()
        })
        .eq('_id', selectedProposal._id);

      if (error) throw error;

      console.log('✅ Proposal cancelled successfully');
      alert('Your proposal has been cancelled.');

      // Reload proposal to show updated status
      await loadProposalDetails(selectedProposal);

    } catch (err) {
      console.error('❌ Error cancelling proposal:', err);
      alert('Failed to cancel proposal. Please try again.');
    }
  }

  /**
   * Modify/Edit Proposal
   * Opens edit modal (only available in certain statuses)
   */
  function handleModifyProposal() {
    setShowEditProposalModal(true);
  }

  /**
   * Review Counteroffer
   * Opens compare terms modal to show original vs host-changed terms
   */
  function handleReviewCounteroffer() {
    setShowCompareTermsModal(true);
  }

  // ============================================================================
  // ACTION HANDLERS - Navigation
  // ============================================================================

  /**
   * View full listing details
   * Navigates to listing page
   */
  function handleViewListing() {
    if (!selectedProposal?._listing) return;

    const listingName = selectedProposal._listing.Name || 'listing';
    const listingSlug = listingName.toLowerCase().replace(/\s+/g, '-');
    window.location.href = `/listing/${listingSlug}?id=${selectedProposal._listing._id}`;
  }

  /**
   * View map
   * Opens map modal showing listing location
   */
  function handleViewMap() {
    setShowMapModal(true);
  }

  /**
   * View host profile
   * Opens host profile modal with verification status and listings
   */
  function handleViewHostProfile() {
    setShowHostProfileModal(true);
  }

  /**
   * Send message to host
   * Navigates to messaging page with host pre-selected
   */
  function handleSendMessage() {
    if (!selectedProposal?._host) return;

    window.location.href = `/messaging?user=${selectedProposal._host._id}`;
  }

  /**
   * Request Virtual Meeting
   * Opens virtual meeting modal with appropriate view based on VM state
   * 5-state workflow (per VM-IMPLEMENTATION-QUICKSTART.md):
   * 1. Empty VM → 'request' view (guest/host requests meeting)
   * 2. Pending request, requested by other party → 'respond' view
   * 3. Meeting booked & confirmed → 'details' view
   * 4. Meeting declined → 'alternative' view
   * 5. User wants to cancel → 'cancel' view
   */
  function handleRequestVirtualMeeting() {
    if (!selectedProposal) return;

    const vm = selectedProposal._virtualMeeting;
    const currentUserId = currentUser?._id;

    // Determine which view to show
    let view = 'request'; // Default

    if (!vm) {
      // No VM exists → Request view
      view = 'request';
    } else if (vm['meeting declined']) {
      // Meeting was declined → Alternative request view
      view = 'alternative';
    } else if (vm['confirmedBySplitLease']) {
      // Meeting confirmed → Details view
      view = 'details';
    } else if (vm['booked date'] && !vm['meeting declined']) {
      // Meeting booked but not confirmed yet
      if (vm['requested by'] === currentUserId) {
        // User requested it → Show details or cancel option
        view = 'details';
      } else {
        // Other party requested it → Respond view
        view = 'respond';
      }
    } else if (vm['requested by'] && vm['requested by'] !== currentUserId) {
      // Pending request from other party → Respond view
      view = 'respond';
    }

    setVmModalView(view);
    setShowVirtualMeetingModal(true);
  }

  /**
   * Submit Rental Application
   * Navigates to rental application form
   */
  function handleSubmitRentalApplication() {
    if (!selectedProposal) return;

    window.location.href = `/rental-app-new-design?proposal=${selectedProposal._id}`;
  }

  /**
   * Review Documents
   * Opens document review page
   */
  function handleReviewDocuments() {
    if (!selectedProposal) return;

    // Navigate to documents review (placeholder - actual URL may differ)
    window.location.href = `/documents?proposal=${selectedProposal._id}`;
  }

  /**
   * Go to Leases
   * Navigates to leases page (for completed proposals)
   */
  function handleGoToLeases() {
    window.location.href = '/leases';
  }

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  useEffect(() => {
    initializePage();
  }, []);

  // Handle browser back/forward with URL parameters
  useEffect(() => {
    function handlePopState() {
      const urlParams = new URLSearchParams(window.location.search);
      const proposalId = urlParams.get('proposal');

      if (proposalId && proposals.length > 0) {
        const proposal = proposals.find(p => p._id === proposalId);
        if (proposal && proposal._id !== selectedProposal?._id) {
          loadProposalDetails(proposal);
        }
      }
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [proposals, selectedProposal]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-lg text-gray-700 font-medium">Loading your proposals...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Unable to Load Proposals</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Empty State: No proposals */}
        {proposals.length === 0 && (
          <EmptyState />
        )}

        {/* Proposals exist */}
        {proposals.length > 0 && (
          <>
            {/* Proposal Selector */}
            <ProposalSelector
              proposals={proposals}
              selectedProposal={selectedProposal}
              onProposalChange={handleProposalChange}
            />

            {/* Selected Proposal Display */}
            {selectedProposal && (
              <div className="mt-6">
                <ProposalCard
                  proposal={selectedProposal}
                  onViewListing={handleViewListing}
                  onViewMap={handleViewMap}
                  onViewHostProfile={handleViewHostProfile}
                  onSendMessage={handleSendMessage}
                  onDeleteProposal={handleDeleteProposal}
                  onCancelProposal={handleCancelProposal}
                  onModifyProposal={handleModifyProposal}
                  onReviewCounteroffer={handleReviewCounteroffer}
                  onRequestVirtualMeeting={handleRequestVirtualMeeting}
                  onSubmitRentalApplication={handleSubmitRentalApplication}
                  onReviewDocuments={handleReviewDocuments}
                  onGoToLeases={handleGoToLeases}
                />

                {/* Progress Tracker */}
                <div className="mt-8">
                  <ProgressTracker
                    status={selectedProposal.Status}
                    proposalId={selectedProposal._id}
                    createdDate={selectedProposal['Created Date']}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      {/* MODALS */}

      {/* Host Profile Modal */}
      {showHostProfileModal && selectedProposal?._host && (
        <HostProfileModal
          host={selectedProposal._host}
          listing={selectedProposal._listing}
          onClose={() => setShowHostProfileModal(false)}
        />
      )}

      {/* Map Modal */}
      {showMapModal && selectedProposal?._listing && (
        <MapModal
          listing={selectedProposal._listing}
          address={selectedProposal._listing['Location - Address']}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* Virtual Meeting Modal - 5-state workflow */}
      {showVirtualMeetingModal && selectedProposal && (
        <VirtualMeetingModal
          proposal={selectedProposal}
          virtualMeeting={selectedProposal._virtualMeeting}
          currentUser={currentUser}
          view={vmModalView}
          onClose={() => setShowVirtualMeetingModal(false)}
          onSuccess={() => {
            setShowVirtualMeetingModal(false);
            // Reload proposal to get updated VM data
            loadProposalDetails(selectedProposal);
          }}
        />
      )}

      {/* Compare Terms Modal (Counteroffer) */}
      {showCompareTermsModal && selectedProposal && selectedProposal['counter offer happened'] && (
        <CompareTermsModal
          proposal={selectedProposal}
          onClose={() => setShowCompareTermsModal(false)}
          onAcceptCounteroffer={async () => {
            setShowCompareTermsModal(false);
            // Reload proposal after accepting counteroffer
            await loadProposalDetails(selectedProposal);
          }}
        />
      )}

      {/* Edit Proposal Modal */}
      {showEditProposalModal && selectedProposal && (
        <EditProposalModal
          proposal={selectedProposal}
          listing={selectedProposal._listing}
          onClose={() => setShowEditProposalModal(false)}
          onSuccess={() => {
            setShowEditProposalModal(false);
            // Reload proposal after editing
            loadProposalDetails(selectedProposal);
          }}
        />
      )}
    </div>
  );
}
