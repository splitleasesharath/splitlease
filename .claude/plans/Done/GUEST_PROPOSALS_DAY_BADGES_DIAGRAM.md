# Guest Proposals - Day Badges Visual Diagram

## Component Hierarchy

```
GuestProposalsPage.jsx
│
├─ Header
│
├─ Main (className="main-content")
│  │
│  ├─ LoadingState
│  ├─ ErrorState
│  ├─ EmptyState
│  │
│  └─ Content (if proposals exist)
│     │
│     ├─ ProposalSelector
│     │  └─ <select> with dropdown of proposals
│     │
│     └─ ProposalCard
│        │
│        ├─ <div className="proposal-card-v2">
│        │  │
│        │  ├─ <div className="proposal-content-row">
│        │  │  │
│        │  │  ├─ LEFT COLUMN
│        │  │  │  ├─ Title
│        │  │  │  ├─ Location
│        │  │  │  ├─ Action Buttons (View Listing, Map)
│        │  │  │  ├─ Schedule Info (Check-in/out range, duration)
│        │  │  │  │
│        │  │  │  ├─ *** DAY BADGES ROW ***
│        │  │  │  │  │
│        │  │  │  │  └─ <div className="day-badges-row">
│        │  │  │  │     ├─ <div className="day-badge-v2">S</div>
│        │  │  │  │     ├─ <div className="day-badge-v2 selected">M</div>
│        │  │  │  │     ├─ <div className="day-badge-v2 selected">T</div>
│        │  │  │  │     ├─ <div className="day-badge-v2 selected">W</div>
│        │  │  │  │     ├─ <div className="day-badge-v2 selected">T</div>
│        │  │  │  │     ├─ <div className="day-badge-v2 selected">F</div>
│        │  │  │  │     └─ <div className="day-badge-v2">S</div>
│        │  │  │  │
│        │  │  │  ├─ Check-in/out times
│        │  │  │  ├─ Move-in date
│        │  │  │  └─ House rules link
│        │  │  │
│        │  │  └─ RIGHT COLUMN
│        │  │     ├─ Listing photo (with background image)
│        │  │     └─ Host overlay
│        │  │        ├─ Avatar (or placeholder)
│        │  │        ├─ Host name badge
│        │  │        ├─ Host Profile button
│        │  │        └─ Message button
│        │  │
│        │  ├─ <div className="pricing-bar">
│        │  │  ├─ Total price
│        │  │  ├─ Cleaning fee
│        │  │  ├─ Damage deposit
│        │  │  ├─ Nightly price
│        │  │  └─ Delete button
│        │  │
│        │  └─ <InlineProgressTracker>
│        │     ├─ Progress nodes (circles)
│        │     ├─ Progress connectors (lines)
│        │     └─ Progress labels
│        │
│        └─ </div> (proposal-card-v2)
│
└─ Footer
```

## Data Transformation: Bubble to Display

```
┌──────────────────────────────────────────┐
│  Bubble Database (PostgreSQL)            │
│  proposal table                          │
│  "Days Selected": [2, 3, 4, 5, 6]       │  ← Bubble 1-indexed
│  (Mon, Tue, Wed, Thu, Fri)              │
└──────────────────────────────────────────┘
                 ↓
         fetchProposalsByIds()
         (userProposalQueries.js)
                 ↓
┌──────────────────────────────────────────┐
│  Raw Proposal Object                     │
│  {                                       │
│    _id: 'prop_123',                      │
│    'Days Selected': [2,3,4,5,6],        │
│    Status: 'PROPOSAL_SUBMITTED...',      │
│    listing: { ... },                     │
│    ...                                   │
│  }                                       │
└──────────────────────────────────────────┘
                 ↓
         transformProposalData()
         (dataTransformers.js)
                 ↓
┌──────────────────────────────────────────┐
│  Normalized Proposal Object              │
│  {                                       │
│    id: 'prop_123',                       │
│    status: 'PROPOSAL_SUBMITTED...',      │
│    daysSelected: [2,3,4,5,6],           │
│    listing: { ... },                     │
│    ...                                   │
│  }                                       │
└──────────────────────────────────────────┘
                 ↓
         ProposalCard.jsx
         (renders with raw proposal data)
                 ↓
    proposal['Days Selected'] = [2,3,4,5,6]
                 ↓
       getAllDaysWithSelection()
       (ProposalCard.jsx:37-44)
                 ↓
┌──────────────────────────────────────────┐
│  allDays Array (JS 0-indexed display)    │
│  [                                       │
│    {index:0, letter:'S', selected:false},│
│    {index:1, letter:'M', selected:true}, │  ← has(2) ✓
│    {index:2, letter:'T', selected:true}, │  ← has(3) ✓
│    {index:3, letter:'W', selected:true}, │  ← has(4) ✓
│    {index:4, letter:'T', selected:true}, │  ← has(5) ✓
│    {index:5, letter:'F', selected:true}, │  ← has(6) ✓
│    {index:6, letter:'S', selected:false}│
│  ]                                       │
└──────────────────────────────────────────┘
                 ↓
      Render day badge DOM
                 ↓
    ┌─ ┬─ ┬─ ┬─ ┬─ ┬─ ┬─┐
    │S │M │T │W │T │F │S│
    └─ ┴─ ┴─ ┴─ ┴─ ┴─ ┴─┘
     ○ ● ● ● ● ● ○

    Gray (unselected)  = #B2B2B2
    Blue (selected)    = #4B47CE
```

## Day Indexing Conversion

### Visual Mapping

```
┌─────────────────────────────────────────────────────┐
│           Day Indexing Systems                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Bubble (1-indexed):   1    2    3    4    5   6  7
│  JS Display (0):       0    1    2    3    4   5  6
│                                                     │
│  Day Names:        Sun  Mon  Tue  Wed  Thu Fri Sat
│  Letters:           S    M    T    W    T   F   S
│                                                     │
├─────────────────────────────────────────────────────┤
│ Example: Weekday proposal                          │
│                                                     │
│ proposal['Days Selected'] = [2, 3, 4, 5, 6]       │
│ (Mon, Tue, Wed, Thu, Fri)                          │
│                                                     │
│ getAllDaysWithSelection() logic:                   │
│   selectedSet = new Set([2, 3, 4, 5, 6])          │
│                                                     │
│   Loop through DAY_LETTERS (0-indexed):            │
│   - index 0 (S): selectedSet.has(0+1=1)? NO       │
│   - index 1 (M): selectedSet.has(1+1=2)? YES ✓   │
│   - index 2 (T): selectedSet.has(2+1=3)? YES ✓   │
│   - index 3 (W): selectedSet.has(3+1=4)? YES ✓   │
│   - index 4 (T): selectedSet.has(4+1=5)? YES ✓   │
│   - index 5 (F): selectedSet.has(5+1=6)? YES ✓   │
│   - index 6 (S): selectedSet.has(6+1=7)? NO       │
│                                                     │
│ Result:                                            │
│   ┌─ ┬─ ┬─ ┬─ ┬─ ┬─ ┬─┐                          │
│   │S │M │T │W │T │F │S│                          │
│   └─ ┴─ ┴─ ┴─ ┴─ ┴─ ┴─┘                          │
│    ○ ● ● ● ● ● ○                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Day Badge CSS Styling

```
┌──────────────────────────────────┐
│  .day-badges-row                 │
│  ├─ display: flex               │
│  ├─ gap: 4px                    │
│  └─ margin-bottom: 15px         │
│                                  │
│  ┌────────────────────────────┐  │
│  │ .day-badge-v2              │  │
│  ├─ width: 32px               │  │
│  ├─ height: 32px              │  │
│  ├─ border-radius: 8px         │  │
│  ├─ font-size: 14px            │  │
│  ├─ font-weight: 500           │  │
│  ├─ background: #B2B2B2 (gray) │  │
│  ├─ color: #424242             │  │
│  └─ transition: all 0.2s       │  │
│                                  │
│  ┌────────────────────────────┐  │
│  │ .day-badge-v2.selected     │  │
│  ├─ background: #4B47CE       │  │
│  │ (deep blue/purple)         │  │
│  └─ color: white              │  │
│                                  │
│  @media (max-width: 480px)      │
│  ├─ width: 36px                │
│  ├─ height: 36px               │
│  ├─ font-size: 12px            │  │
│  └─ border-radius: 10px        │
│                                  │
└──────────────────────────────────┘
```

## Code Flow: From Hook to Render

```
useGuestProposalsPageLogic()
│
├─ useState: [proposals, setProposals]
├─ useState: [selectedProposal, setSelectedProposal]
│
├─ useEffect(() => loadProposals(), [])
│  │
│  └─ loadProposals()
│     │
│     └─ fetchUserProposalsFromUrl()
│        └─ Returns: {user, proposals, selectedProposal}
│
└─ Derived state:
   └─ transformedProposal = transformProposalData(selectedProposal)
   └─ statusConfig = getStatusConfig(selectedProposal.Status)
   └─ ...

   Return: {
     proposals,
     selectedProposal,
     transformedProposal,
     statusConfig,
     handleProposalSelect(),
     ...
   }
        │
        └─→ GuestProposalsPage() component
            │
            └─→ ProposalCard(proposal={selectedProposal})
                │
                ├─ daysSelected = proposal['Days Selected']
                │
                ├─ allDays = getAllDaysWithSelection(daysSelected)
                │  │
                │  └─ [
                │      {index:0, letter:'S', selected:false},
                │      {index:1, letter:'M', selected:true},
                │      ...
                │     ]
                │
                └─ render:
                   └─ <div className="day-badges-row">
                      {allDays.map(day => (
                        <div className={`day-badge-v2 ${day.selected ? 'selected' : ''}`}>
                          {day.letter}
                        </div>
                      ))}
                   </div>
```

## File Dependencies (Import Graph)

```
GuestProposalsPage.jsx
│
└─ useGuestProposalsPageLogic.js
   │
   ├─ ../lib/proposals/userProposalQueries.js
   │  ├─ ../supabase.js
   │  ├─ ./urlParser.js
   │  └─ [Supabase queries to: user, proposal, listing, etc.]
   │
   ├─ ../lib/proposals/dataTransformers.js
   │  └─ [Pure transformation functions]
   │
   ├─ ../../logic/constants/proposalStatuses.js
   │  └─ [Status config, stage definitions]
   │
   └─ ../../logic/constants/proposalStages.js
      └─ [Stage formatting]

ProposalCard.jsx
│
├─ ../../../lib/proposals/dataTransformers.js
│  └─ formatPrice(), formatDate()
│
└─ [Inline helper functions]
   ├─ getCheckInOutRange()
   └─ getAllDaysWithSelection()  ← KEY LOGIC

guest-proposals.css
├─ .day-badges-row (lines 308-312)
└─ .day-badge-v2 (lines 314-332)
```

## State Management Flow

```
User navigates to: /guest-proposals/{userId}
        │
        ↓
useGuestProposalsPageLogic() initializes
        │
        ├─ [proposals, setProposals] = useState([])
        ├─ [selectedProposal, setSelectedProposal] = useState(null)
        ├─ [isLoading, setIsLoading] = useState(true)
        └─ [error, setError] = useState(null)
        │
        ↓
useEffect runs on mount
        │
        └─ loadProposals()
           │
           ├─ setIsLoading(true)
           │
           ├─ fetchUserProposalsFromUrl()
           │  │
           │  ├─ GET user from URL path
           │  ├─ Fetch user['Proposals List']
           │  ├─ Extract proposal IDs
           │  ├─ Fetch all proposals
           │  ├─ Fetch all listings, hosts, guests
           │  └─ Return enriched data
           │
           ├─ setUser(data.user)
           ├─ setProposals(data.proposals)
           ├─ setSelectedProposal(data.selectedProposal)
           │
           └─ setIsLoading(false)
        │
        ↓
Component renders (once data loaded)
        │
        ├─ ProposalSelector
        │  └─ onSelect(proposalId)
        │     └─ handleProposalSelect(proposalId)
        │        └─ setSelectedProposal(newProposal)
        │           └─ updateUrlWithProposal()
        │
        └─ ProposalCard
           │
           ├─ proposal['Days Selected'] = [2,3,4,5,6]
           │
           ├─ getAllDaysWithSelection()
           │  └─ allDays = [
           │      {index:0, letter:'S', selected:false},
           │      {index:1, letter:'M', selected:true},
           │      ...
           │     ]
           │
           └─ Render day badges with CSS styling
              ├─ Unselected: gray background
              └─ Selected: purple background
```

## Error States

```
┌─────────────────────────────────────┐
│  Possible Error States              │
├─────────────────────────────────────┤
│                                     │
│  1. No user ID in URL               │
│     └─ Error: "No user ID found..." │
│                                     │
│  2. User not found in database      │
│     └─ Error: "User not found..."   │
│                                     │
│  3. User has no proposals           │
│     └─ Empty state (no error)       │
│                                     │
│  4. Proposals exist but no valid    │
│     └─ Empty state (all orphaned)   │
│                                     │
│  5. Failed to fetch listings        │
│     └─ Proposal shows, but listing  │
│        data is null                 │
│                                     │
│  6. Days Selected field missing     │
│     └─ All badges appear unselected │
│        (daysSelected defaults to []) │
│                                     │
└─────────────────────────────────────┘
```

## Responsive Behavior

```
┌──────────────────────────────────────────────┐
│  Desktop (> 900px)                          │
│  ┌─────────────────────────────────────────┐│
│  │ Two-column layout                       ││
│  │ ┌──────────────────┐ ┌────────────────┐││
│  │ │ Left Column      │ │  Right Column  │││
│  │ │ ┌──────────────┐ │ │                │││
│  │ │ │ Day badges:  │ │ │   [Photo with] │││
│  │ │ │ S M T W T F S│ │ │   [host info]  │││
│  │ │ │   ● ● ● ● ●  │ │ │                │││
│  │ │ │ (32x32 each) │ │ │                │││
│  │ │ └──────────────┘ │ │                │││
│  │ └──────────────────┘ └────────────────┘││
│  └─────────────────────────────────────────┘│
│                                              │
│  Tablet (768px - 900px)                    │
│  │ Stacked: left then right                │
│  │ (flex-direction: column)                │
│  │ Day badges still 32x32                  │
│                                              │
│  Mobile (< 768px)                          │
│  │ Stacked layout                          │
│  │ Day badges: 36x36 (slightly larger)     │
│  │ Wider gap for touch targets             │
│  │                                          │
│  Mobile Small (< 480px)                    │
│  │ Stacked layout                          │
│  │ Day badges: 36x36                       │
│  │ justify-content: space-between          │
│  │ (spread across full width)              │
│                                              │
└──────────────────────────────────────────────┘
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-30
**Purpose**: Visual understanding of Guest Proposals page day badges implementation
