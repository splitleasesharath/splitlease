import { useState, useEffect } from 'react';
import Header from '../shared/Header.jsx';
import Footer from '../shared/Footer.jsx';
import { supabase } from '../../lib/supabase.js';

/**
 * GuestProposalsPage - Dashboard for guests to view and manage their rental proposals
 *
 * Features:
 * - View all proposals with dropdown selector
 * - Display current proposal details (property info, dates, schedule, pricing)
 * - Show proposal progress tracker (6 steps)
 * - Manage virtual meetings
 * - Action buttons that adapt based on proposal status (state machine pattern)
 * - Empty state when no proposals exist
 *
 * Architecture:
 * - Follows React Islands pattern with client-side hydration
 * - Uses Supabase for data fetching
 * - Implements state machine for proposal actions based on status
 */
export default function GuestProposalsPage() {
  // State management
  const [proposals, setProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Load user and proposals on mount
  useEffect(() => {
    initializePage();
  }, []);

  // Handle URL parameter-based scrolling after data loads
  useEffect(() => {
    if (!loading && selectedProposal) {
      handleURLParameters();
    }
  }, [loading, selectedProposal]);

  /**
   * Handle URL parameters for scrolling and deep linking
   */
  function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for virtual-meeting parameter to scroll to VM section
    if (urlParams.get('virtual-meeting') === 'true') {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const vmSection = document.getElementById('virtual-meetings-section');
        if (vmSection) {
          vmSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    // Check for section parameter for generic scrolling
    const section = urlParams.get('section');
    if (section) {
      setTimeout(() => {
        const element = document.getElementById(section);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  /**
   * Initialize page by loading user and their proposals
   */
  async function initializePage() {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (!user) {
        setError('Please log in to view your proposals');
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      // Load proposals for this user
      await loadProposals(user.id);

    } catch (err) {
      console.error('Error initializing page:', err);
      setError('Unable to load proposals. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Load all proposals for the current user
   * Note: Supabase query uses foreign key field names from schema
   */
  async function loadProposals(userId) {
    try {
      // First get user's user._id from auth user id
      const { data: userData, error: userDataError } = await supabase
        .from('user')
        .select('_id')
        .eq('id', userId)
        .single();

      if (userDataError) throw userDataError;

      const userTableId = userData._id;

      // Now fetch proposals with all related data
      const { data, error: fetchError } = await supabase
        .from('proposal')
        .select('*')
        .eq('Guest', userTableId)
        .or('Deleted.is.null,Deleted.eq.false')
        .order('Created Date', { ascending: false });

      if (fetchError) throw fetchError;

      // For each proposal, fetch related listing, host, and virtual meeting data
      const proposalsWithDetails = await Promise.all(
        (data || []).map(async (proposal) => {
          let listing = null;
          let hostUser = null;
          let houseRules = [];
          let virtualMeeting = null;

          // Fetch listing
          if (proposal.Listing) {
            const { data: listingData } = await supabase
              .from('listing')
              .select('*')
              .eq('_id', proposal.Listing)
              .single();
            listing = listingData;

            // Fetch host user info from listing
            if (listing && listing['Created By']) {
              const { data: hostData } = await supabase
                .from('user')
                .select('_id, "Name - First", "Name - Full", "Profile Photo"')
                .eq('_id', listing['Created By'])
                .single();
              hostUser = hostData;
            }

            // Fetch house rules if available
            const houseRuleIds = listing?.['Features - House Rules'];
            if (houseRuleIds && Array.isArray(houseRuleIds) && houseRuleIds.length > 0) {
              const { data: rulesData } = await supabase
                .from('zat_features_houserule')
                .select('_id, Name, Icon')
                .in('_id', houseRuleIds);
              houseRules = rulesData || [];
            }
          }

          // Fetch virtual meeting if exists
          if (proposal['virtual meeting']) {
            const { data: vmData } = await supabase
              .from('virtualmeetingschedulesandlinks')
              .select('*')
              .eq('_id', proposal['virtual meeting'])
              .single();
            virtualMeeting = vmData;
          }

          return {
            ...proposal,
            listing,
            hostUser,
            houseRules,
            virtualMeeting
          };
        })
      );

      setProposals(proposalsWithDetails);

      // Auto-select first proposal or one from URL
      if (proposalsWithDetails.length > 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const proposalIdFromUrl = urlParams.get('proposal');

        if (proposalIdFromUrl) {
          const proposalFromUrl = proposalsWithDetails.find(p => p._id === proposalIdFromUrl);
          setSelectedProposal(proposalFromUrl || proposalsWithDetails[0]);
        } else {
          setSelectedProposal(proposalsWithDetails[0]);
        }
      }

    } catch (err) {
      console.error('Error loading proposals:', err);
      throw err;
    }
  }

  // Loading state
  if (loading) {
    return (
      <>
        <Header />
        <main className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <div className="loading-spinner">Loading your proposals...</div>
        </main>
        <Footer />
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Header />
        <main className="container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <div className="error-message" style={{ color: '#d32f2f' }}>
            <h2>Unable to Load Proposals</h2>
            <p>{error}</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="guest-proposals-container" style={{
        maxWidth: '1024px',
        margin: '0 auto',
        padding: '2rem 1rem'
      }}>
        {/* PASS 2: Proposal Selector and Empty State */}
        {proposals.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ProposalSelector
              proposals={proposals}
              selectedProposal={selectedProposal}
              onSelectProposal={setSelectedProposal}
            />

            {selectedProposal && (
              <ProposalRejectionMessage proposal={selectedProposal} />
            )}

            {/* PASS 3-5: Current Proposal Display */}
            {selectedProposal && (
              <>
                <CurrentProposalSection proposal={selectedProposal} />

                {/* PASS 6: Virtual Meetings Section */}
                <VirtualMeetingsSection proposal={selectedProposal} />
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}

/**
 * EmptyState - Displayed when user has no proposals
 */
function EmptyState() {
  return (
    <div style={{
      textAlign: 'center',
      padding: '4rem 2rem',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{
        fontSize: '3rem',
        marginBottom: '1.5rem',
        opacity: 0.3
      }}>
        📋
      </div>

      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 400,
        color: '#424242',
        lineHeight: 1.6,
        marginBottom: '2rem'
      }}>
        You don't have any proposals submitted yet. We invite you to submit proposals with the weekly schedule you have in mind
      </h2>

      <a
        href="/search"
        style={{
          display: 'inline-block',
          padding: '0.875rem 2rem',
          background: '#4B47CE',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          fontWeight: 500,
          transition: 'background 0.2s'
        }}
        onMouseOver={(e) => e.target.style.background = '#3d39b3'}
        onMouseOut={(e) => e.target.style.background = '#4B47CE'}
      >
        Explore Rentals
      </a>
    </div>
  );
}

/**
 * ProposalSelector - Dropdown to select from multiple proposals
 */
function ProposalSelector({ proposals, selectedProposal, onSelectProposal }) {
  return (
    <div style={{
      marginTop: '70px',
      marginBottom: '2rem'
    }}>
      <label style={{
        display: 'block',
        marginBottom: '0.5rem',
        fontSize: '1.125rem',
        fontWeight: 500,
        color: '#424242'
      }}>
        My Proposals
      </label>

      <select
        value={selectedProposal?._id || ''}
        onChange={(e) => {
          const proposal = proposals.find(p => p._id === e.target.value);
          onSelectProposal(proposal);
        }}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          fontSize: '1rem',
          border: '1px solid #ddd',
          borderRadius: '4px',
          background: 'white',
          cursor: 'pointer'
        }}
      >
        <option value="">Select Proposal</option>
        {proposals.map((proposal) => {
          const listingName = proposal.listing?.Name || 'Unknown Listing';
          const createdDate = proposal['Created Date']
            ? new Date(proposal['Created Date']).toLocaleDateString()
            : '';

          return (
            <option key={proposal._id} value={proposal._id}>
              {listingName} - {createdDate} ({proposal.Status})
            </option>
          );
        })}
      </select>
    </div>
  );
}

/**
 * ProposalRejectionMessage - Shows rejection reason if proposal is rejected
 */
function ProposalRejectionMessage({ proposal }) {
  const isRejected = proposal.Status === 'Proposal Rejected by Host';
  const rejectionReason = proposal['reason for cancellation'];

  if (!isRejected || !rejectionReason) {
    return null;
  }

  return (
    <div style={{
      padding: '1rem',
      background: '#ffebee',
      border: '1px solid #ef5350',
      borderRadius: '4px',
      marginBottom: '1.5rem',
      color: '#c62828'
    }}>
      <strong>Proposal Rejected.</strong> Reason: {rejectionReason}
    </div>
  );
}

/**
 * CurrentProposalSection - Main display for selected proposal
 * Includes property info, dates, schedule, and other proposal details
 */
function CurrentProposalSection({ proposal }) {
  return (
    <div style={{
      marginTop: '2rem',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <PropertyInfoSection proposal={proposal} />
      <DatesAndScheduleSection proposal={proposal} />
      <HostInfoSection proposal={proposal} />
      <HouseRulesSection proposal={proposal} />
      <PricingSection proposal={proposal} />
      <ProposalActionsSection proposal={proposal} />
      <ProgressTrackerSection proposal={proposal} />
      <ProposalMetadataSection proposal={proposal} />
    </div>
  );
}

/**
 * VirtualMeetingsSection - Separate section below proposal card for virtual meetings
 * Only shown if virtual meeting exists
 */
function VirtualMeetingsSection({ proposal }) {
  const virtualMeeting = proposal.virtualMeeting;
  const hostName = proposal.hostUser?.['Name - First'] || 'Host';
  const guestPhoto = proposal.guest?.['Profile Photo'];

  if (!virtualMeeting) {
    return null;
  }

  const bookedDate = virtualMeeting['booked date'];
  const confirmedBySplitLease = virtualMeeting.confirmedBySplitLease;
  const meetingId = virtualMeeting._id;

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  };

  return (
    <div
      id="virtual-meetings-section"
      style={{
        marginTop: '2rem',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'white'
      }}
    >
      <div style={{
        padding: '1.5rem',
        background: '#fafafa',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: 500,
          color: '#212121'
        }}>
          Virtual Meetings
        </h3>
      </div>

      {bookedDate ? (
        <div style={{
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {guestPhoto && (
              <img
                src={guestPhoto}
                alt="Guest"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            )}

            <div style={{ flex: 1 }}>
              <p style={{
                color: '#424242',
                fontSize: '1rem',
                marginBottom: '0.5rem'
              }}>
                You have a virtual meeting coming up with <strong>{hostName}</strong> on
              </p>
              <p style={{
                color: '#4B47CE',
                fontSize: '1.125rem',
                fontWeight: 600
              }}>
                {formatDateTime(bookedDate)}
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            marginTop: '1.5rem'
          }}>
            <button
              onClick={() => {
                // TODO: Show respond to VM modal in PASS 7
                console.log('Respond to Virtual Meeting clicked');
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#4B47CE',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Respond to Virtual Meeting
            </button>

            <button
              onClick={() => {
                // TODO: Show calendar in PASS 7
                console.log('Show Calendar clicked');
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: '#4B47CE',
                border: '1px solid #4B47CE',
                borderRadius: '4px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Show Calendar
            </button>
          </div>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '0.85rem',
            color: '#666'
          }}>
            <p>
              <strong>Unique ID of the VM:</strong> {meetingId}
            </p>
            {!confirmedBySplitLease && (
              <p style={{ marginTop: '0.5rem', color: '#f57c00' }}>
                ⏳ Awaiting Split Lease Confirmation
              </p>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          color: '#666'
        }}>
          <p>No virtual meeting scheduled yet.</p>
        </div>
      )}
    </div>
  );
}

/**
 * PropertyInfoSection - Display listing name, location, and action buttons
 */
function PropertyInfoSection({ proposal }) {
  const listing = proposal.listing;
  const listingName = listing?.Name || 'Unknown Listing';
  const borough = listing?.['Location - Borough'] || '';
  const address = listing?.['Location - Address'];

  // Parse location display
  let locationDisplay = borough;
  if (address && typeof address === 'object') {
    const neighborhood = address.neighborhood || address.address || '';
    if (neighborhood) {
      locationDisplay = `${neighborhood}, ${borough}`;
    }
  }

  return (
    <div style={{
      padding: '1.5rem',
      background: 'white'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 500,
        color: '#212121',
        marginBottom: '0.5rem'
      }}>
        {listingName}
      </h2>

      <p style={{
        color: '#666',
        marginBottom: '1rem'
      }}>
        {locationDisplay}
      </p>

      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <a
          href={`/view-split-lease/${listing?._id || ''}`}
          style={{
            padding: '0.625rem 1.25rem',
            background: '#4B47CE',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem',
            fontWeight: 500,
            display: 'inline-block'
          }}
        >
          View Listing
        </a>

        <button
          onClick={() => {
            // TODO: Show map popup in PASS 7
            console.log('View Map clicked');
          }}
          style={{
            padding: '0.625rem 1.25rem',
            background: 'white',
            color: '#4B47CE',
            border: '1px solid #4B47CE',
            borderRadius: '4px',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          View Map
        </button>
      </div>
    </div>
  );
}

/**
 * DatesAndScheduleSection - Display check-in/out dates, duration, weekly schedule
 */
function DatesAndScheduleSection({ proposal }) {
  const moveInStart = proposal['Move in range start'];
  const moveInEnd = proposal['Move in range end'];
  const durationWeeks = proposal['Reservation Span (Weeks)'] || 0;
  const daysSelected = proposal['Days Selected'] || [];
  const nightsPerWeek = proposal['nights per week (num)'] || 0;

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const checkInDisplay = formatDate(moveInStart);
  const checkOutDisplay = formatDate(moveInEnd);

  // Days of week for schedule display
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbreviations = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{
      padding: '1.5rem',
      background: '#fafafa',
      borderTop: '1px solid #e0e0e0'
    }}>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 500,
        color: '#212121',
        marginBottom: '1rem'
      }}>
        Dates & Schedule
      </h3>

      {/* Check-in to Check-out */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{
          color: '#666',
          fontSize: '0.95rem',
          marginBottom: '0.25rem'
        }}>
          <strong>Stay Period:</strong>
        </p>
        <p style={{ color: '#424242', fontSize: '1rem' }}>
          {checkInDisplay} to {checkOutDisplay}
        </p>
      </div>

      {/* Duration */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: '#424242', fontSize: '1rem' }}>
          <strong>Duration:</strong> {durationWeeks} Week{durationWeeks !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Weekly Schedule */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{
          color: '#666',
          fontSize: '0.95rem',
          marginBottom: '0.5rem'
        }}>
          <strong>Weekly Schedule:</strong> {nightsPerWeek} night{nightsPerWeek !== 1 ? 's' : ''} per week
        </p>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '0.5rem'
        }}>
          {daysOfWeek.map((day, index) => {
            const isSelected = daysSelected.includes(day);
            return (
              <div
                key={day}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  background: isSelected ? '#4B47CE' : '#e0e0e0',
                  color: isSelected ? 'white' : '#666',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? 600 : 400
                }}
                title={day}
              >
                {dayAbbreviations[index]}
              </div>
            );
          })}
        </div>
      </div>

      {/* Anticipated Move-in */}
      {moveInStart && (
        <div>
          <p style={{ color: '#666', fontSize: '0.95rem' }}>
            <strong>Anticipated Move-in:</strong> {formatDate(moveInStart)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * HostInfoSection - Display host information with action buttons
 */
function HostInfoSection({ proposal }) {
  const [showHostProfile, setShowHostProfile] = useState(false);

  const hostUser = proposal.hostUser;
  const hostName = hostUser?.['Name - First'] || 'Host';
  const hostPhoto = hostUser?.['Profile Photo'];
  const isSuggested = proposal.Status?.includes('Split Lease');

  return (
    <div style={{
      padding: '1.5rem',
      background: 'white',
      borderTop: '1px solid #e0e0e0'
    }}>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 500,
        color: '#212121',
        marginBottom: '1rem'
      }}>
        Host Information
      </h3>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        {isSuggested && (
          <span style={{
            padding: '0.25rem 0.75rem',
            background: '#4B47CE',
            color: 'white',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            Suggested
          </span>
        )}

        {hostPhoto && (
          <img
            src={hostPhoto}
            alt={hostName}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
        )}

        <span style={{
          fontSize: '1rem',
          fontWeight: 500,
          color: '#212121'
        }}>
          {hostName}
        </span>
      </div>

      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => {
            // TODO: Show host profile popup in PASS 7
            console.log('View Host Profile clicked');
            setShowHostProfile(true);
          }}
          style={{
            padding: '0.625rem 1.25rem',
            background: 'white',
            color: '#4B47CE',
            border: '1px solid #4B47CE',
            borderRadius: '4px',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Host Profile
        </button>

        <button
          onClick={() => {
            // TODO: Open messaging in PASS 7
            console.log('Send Message clicked');
          }}
          style={{
            padding: '0.625rem 1.25rem',
            background: '#4B47CE',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Send a Message
        </button>
      </div>
    </div>
  );
}

/**
 * HouseRulesSection - Display expandable house rules list
 */
function HouseRulesSection({ proposal }) {
  const [expanded, setExpanded] = useState(false);
  const houseRules = proposal.houseRules || [];

  if (houseRules.length === 0) {
    return null;
  }

  const visibleRules = expanded ? houseRules : houseRules.slice(0, 5);

  return (
    <div style={{
      padding: '1.5rem',
      background: '#fafafa',
      borderTop: '1px solid #e0e0e0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: 500,
          color: '#212121'
        }}>
          House Rules
        </h3>

        {houseRules.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4B47CE',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {expanded ? 'Show Less' : 'See All House Rules'}
          </button>
        )}
      </div>

      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0
      }}>
        {visibleRules.map((rule) => (
          <li
            key={rule._id}
            style={{
              padding: '0.5rem 0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}
          >
            {rule.Icon && (
              <img
                src={rule.Icon}
                alt=""
                style={{
                  width: '20px',
                  height: '20px'
                }}
              />
            )}
            <span style={{ color: '#424242' }}>{rule.Name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * PricingSection - Display pricing breakdown for proposal
 */
function PricingSection({ proposal }) {
  const totalPrice = proposal['Total Price for Reservation (guest)'];
  const damageDeposit = proposal['damage deposit'];
  const nightlyPrice = proposal['proposal nightly price'];
  const cleaningFee = proposal['cleaning fee'];

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div style={{
      padding: '1.5rem',
      background: 'white',
      borderTop: '1px solid #e0e0e0'
    }}>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 500,
        color: '#212121',
        marginBottom: '1rem'
      }}>
        Pricing
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {/* Total Price */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0.75rem',
          background: '#f5f5f5',
          borderRadius: '4px'
        }}>
          <span style={{
            fontWeight: 600,
            fontSize: '1rem',
            color: '#212121'
          }}>
            Total
          </span>
          <span style={{
            fontWeight: 600,
            fontSize: '1rem',
            color: '#212121'
          }}>
            {formatCurrency(totalPrice)}
          </span>
        </div>

        {/* Nightly Price */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span style={{ color: '#666' }}>Nightly Rate</span>
          <span style={{ color: '#424242' }}>{formatCurrency(nightlyPrice)} / night</span>
        </div>

        {/* Damage Deposit */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span style={{ color: '#666' }}>Damage Deposit</span>
          <span style={{ color: '#424242' }}>{formatCurrency(damageDeposit)}</span>
        </div>

        {/* Cleaning Fee (conditional) */}
        {cleaningFee && cleaningFee > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: '#666' }}>Cleaning Fee</span>
            <span style={{ color: '#424242' }}>{formatCurrency(cleaningFee)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ProposalActionsSection - Action buttons that adapt based on proposal status (State Machine)
 * Implements Guest Action 1 and Guest Action 2 button logic
 */
function ProposalActionsSection({ proposal }) {
  const status = proposal.Status;

  // Determine action buttons based on status (State Machine Logic from workflows)
  const getActionButtons = () => {
    const buttons = [];

    // Guest Action 1 - Primary action based on status
    switch (status) {
      case 'Host Review':
        buttons.push({
          key: 'action1',
          label: 'Edit Proposal',
          primary: true,
          onClick: () => console.log('Edit Proposal')
        });
        break;

      case 'Host Counteroffer Submitted / Awaiting Guest Review':
        buttons.push({
          key: 'action1',
          label: 'Review Counteroffer',
          primary: true,
          onClick: () => console.log('Review Counteroffer')
        });
        break;

      case 'Proposal Submitted by guest - Awaiting Rental Application':
      case 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application':
        buttons.push({
          key: 'action1',
          label: 'Submit Rental Application',
          primary: true,
          onClick: () => console.log('Submit Rental Application')
        });
        break;

      case 'Lease Documents Sent for Review':
        buttons.push({
          key: 'action1',
          label: 'Review Documents',
          primary: true,
          onClick: () => console.log('Review Documents')
        });
        break;

      case 'Lease Documents Sent for Signatures':
        buttons.push({
          key: 'action1',
          label: 'Resend Lease Documents',
          primary: true,
          onClick: () => console.log('Resend Lease Documents')
        });
        break;

      case 'Proposal or Counteroffer Accepted / Drafting Lease Documents':
        buttons.push({
          key: 'action1',
          label: 'Remind Split Lease',
          primary: true,
          onClick: () => console.log('Remind Split Lease')
        });
        break;

      case 'Initial Payment Submitted / Lease activated':
      case 'Initial Payment Submitted / Lease activated ':
        buttons.push({
          key: 'action1',
          label: 'Go to Leases',
          primary: true,
          onClick: () => window.location.href = '/leases'
        });
        break;

      case 'Proposal Rejected by Host':
        buttons.push({
          key: 'action1',
          label: 'Delete Proposal',
          primary: false,
          onClick: () => console.log('Delete Proposal'),
          danger: true
        });
        break;
    }

    // Guest Action 2 - Secondary action based on status
    if (status === 'Host Counteroffer Submitted / Awaiting Guest Review') {
      buttons.push({
        key: 'action2',
        label: 'Verify Identity',
        primary: false,
        onClick: () => console.log('Verify Identity')
      });
    } else if (status === 'Lease Documents Sent for Review') {
      buttons.push({
        key: 'action2',
        label: 'Verify Identity',
        primary: false,
        onClick: () => console.log('Verify Identity')
      });
    } else if (status === 'Proposal or Counteroffer Accepted / Drafting Lease Documents') {
      buttons.push({
        key: 'action2',
        label: 'See Details',
        primary: false,
        onClick: () => console.log('See Details')
      });
    } else if (status === 'Proposal Submitted for guest by Split Lease - Awaiting Rental Application' ||
               status === 'Proposal Submitted for guest by Split Lease - Pending Confirmation') {
      buttons.push({
        key: 'action2',
        label: 'Edit Proposal',
        primary: false,
        onClick: () => console.log('Edit Proposal (Guest Action 2)')
      });
    }

    // Virtual Meeting button (available in multiple states)
    if (!status.includes('Rejected') && !status.includes('Cancelled') && !status.includes('Lease activated')) {
      buttons.push({
        key: 'vm',
        label: 'Request Virtual Meeting',
        primary: false,
        onClick: () => console.log('Request Virtual Meeting')
      });
    }

    // Cancel Proposal button (available in most states)
    if (!status.includes('Rejected') && !status.includes('Cancelled') && !status.includes('Lease activated')) {
      buttons.push({
        key: 'cancel',
        label: 'Cancel Proposal',
        primary: false,
        danger: true,
        onClick: () => console.log('Cancel Proposal')
      });
    }

    return buttons;
  };

  const actionButtons = getActionButtons();

  if (actionButtons.length === 0) {
    return null;
  }

  return (
    <div style={{
      padding: '1.5rem',
      background: '#fafafa',
      borderTop: '1px solid #e0e0e0'
    }}>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 500,
        color: '#212121',
        marginBottom: '1rem'
      }}>
        Actions
      </h3>

      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {actionButtons.map((button) => (
          <button
            key={button.key}
            onClick={button.onClick}
            style={{
              padding: '0.75rem 1.5rem',
              background: button.primary ? '#4B47CE' : (button.danger ? '#d32f2f' : 'white'),
              color: button.primary || button.danger ? 'white' : '#4B47CE',
              border: button.primary || button.danger ? 'none' : '1px solid #4B47CE',
              borderRadius: '4px',
              fontSize: '0.95rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              if (button.primary) {
                e.target.style.background = '#3d39b3';
              } else if (button.danger) {
                e.target.style.background = '#b71c1c';
              }
            }}
            onMouseOut={(e) => {
              if (button.primary) {
                e.target.style.background = '#4B47CE';
              } else if (button.danger) {
                e.target.style.background = '#d32f2f';
              }
            }}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * ProgressTrackerSection - 6-step progress visualization
 */
function ProgressTrackerSection({ proposal }) {
  const status = proposal.Status;

  // Define progress steps
  const steps = [
    { id: 1, label: 'Proposal Submitted', key: 'submitted' },
    { id: 2, label: 'Rental App Submitted', key: 'rental_app' },
    { id: 3, label: 'Host Review', key: 'host_review' },
    { id: 4, label: 'Review Documents', key: 'review_docs' },
    { id: 5, label: 'Lease Documents', key: 'lease_docs' },
    { id: 6, label: 'Initial Payment', key: 'payment' }
  ];

  // Determine current step based on status
  const getCurrentStep = () => {
    if (status.includes('Rejected') || status.includes('Cancelled')) return 0;
    if (status.includes('Lease activated')) return 6;
    if (status.includes('Lease Documents Sent for Signatures')) return 5;
    if (status.includes('Lease Documents Sent for Review')) return 4;
    if (status.includes('Drafting Lease Documents')) return 4;
    if (status.includes('Counteroffer')) return 3;
    if (status.includes('Host Review')) return 3;
    if (status.includes('Awaiting Rental Application')) return 2;
    return 1;
  };

  const currentStep = getCurrentStep();

  return (
    <div style={{
      padding: '1.5rem',
      background: 'white',
      borderTop: '1px solid #e0e0e0'
    }}>
      <h3 style={{
        fontSize: '1.125rem',
        fontWeight: 500,
        color: '#212121',
        marginBottom: '1.5rem'
      }}>
        Progress
      </h3>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        position: 'relative',
        paddingBottom: '1rem'
      }}>
        {/* Progress line */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '0',
          right: '0',
          height: '2px',
          background: '#e0e0e0',
          zIndex: 0
        }}>
          <div style={{
            height: '100%',
            background: '#4B47CE',
            width: `${(currentStep / steps.length) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Steps */}
        {steps.map((step) => {
          const isCompleted = step.id <= currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                position: 'relative',
                zIndex: 1
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isCompleted ? '#4B47CE' : 'white',
                border: `2px solid ${isCompleted ? '#4B47CE' : '#e0e0e0'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.5rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                color: isCompleted ? 'white' : '#999',
                boxShadow: isCurrent ? '0 0 0 4px rgba(75, 71, 206, 0.1)' : 'none'
              }}>
                {isCompleted ? '✓' : step.id}
              </div>

              <span style={{
                fontSize: '0.75rem',
                color: isCompleted ? '#212121' : '#999',
                textAlign: 'center',
                maxWidth: '80px',
                lineHeight: 1.3,
                fontWeight: isCurrent ? 600 : 400
              }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * ProposalMetadataSection - Proposal ID and creation date
 */
function ProposalMetadataSection({ proposal }) {
  const proposalId = proposal._id;
  const createdDate = proposal['Created Date'];

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  };

  return (
    <div style={{
      padding: '1rem 1.5rem',
      background: '#fafafa',
      borderTop: '1px solid #e0e0e0',
      fontSize: '0.85rem',
      color: '#666'
    }}>
      <strong>Proposal unique id:</strong> {proposalId} — <strong>Created on:</strong> {formatDate(createdDate)}
    </div>
  );
}
