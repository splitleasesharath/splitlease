# Modal Components Context

**TYPE**: BRANCH NODE
**PARENT**: app/src/islands/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Overlay dialog components for focused user interactions
[PATTERN]: Modal receives data via props, emits results via callbacks
[STYLING]: CSS Modules with modal.css base styles

---

## ### COMPONENT_CONTRACTS ###

### CancelProposalModal
[PATH]: ./CancelProposalModal.jsx
[INTENT]: Confirm proposal cancellation with reason input
[PROPS]:
  - proposal: ProcessedProposal (req) - Proposal to cancel
  - onCancel: (reason: string) => Promise<void> (req) - Cancel handler
  - onClose: () => void (req) - Close modal handler
[BEHAVIOR]: Shows refund preview if applicable

---

### CompareTermsModal
[PATH]: ./CompareTermsModal.jsx
[INTENT]: Side-by-side comparison of original vs counteroffer terms
[PROPS]:
  - originalTerms: object (req) - Original proposal terms
  - counterTerms: object (req) - Host's counteroffer terms
  - onAccept: () => Promise<void> (req) - Accept counteroffer
  - onReject: () => Promise<void> (req) - Reject counteroffer
  - onClose: () => void (req) - Close modal
[DEPENDS_ON]: logic/processors/proposal/processProposalData

---

### EditProposalModal
[PATH]: ./EditProposalModal.jsx
[INTENT]: Edit existing proposal (dates, days, special requests)
[PROPS]:
  - proposal: ProcessedProposal (req) - Proposal to edit
  - onSave: (updated: object) => Promise<void> (req) - Save handler
  - onClose: () => void (req) - Close modal
[DEPENDS_ON]: logic/rules/proposals/canEditProposal

---

### HostProfileModal
[PATH]: ./HostProfileModal.jsx
[INTENT]: Display host profile (photo, bio, response rate, reviews)
[PROPS]:
  - host: ProcessedHost (req) - Host data
  - onClose: () => void (req) - Close modal
[DEPENDS_ON]: logic/processors/user/processUserDisplayName

---

### MapModal
[PATH]: ./MapModal.jsx
[INTENT]: Full-screen Google Maps with listing location
[PROPS]:
  - coordinates: { lat: number, lng: number } (req) - Map center
  - address: string (opt) - Display address
  - onClose: () => void (req) - Close modal
[REQUIRES]: VITE_GOOGLE_MAPS_API_KEY

---

### ProposalDetailsModal
[PATH]: ./ProposalDetailsModal.jsx
[INTENT]: Complete proposal info with pricing breakdown
[PROPS]:
  - proposalId: string (req) - Proposal to load
  - onClose: () => void (req) - Close modal
[DEPENDS_ON]:
  - logic/calculators/pricing/calculatePricingBreakdown
  - logic/rules/proposals/determineProposalStage

---

### VirtualMeetingModal
[PATH]: ./VirtualMeetingModal.jsx
[INTENT]: Schedule virtual property tours
[PROPS]:
  - proposal: ProcessedProposal (req) - Related proposal
  - hostAvailability: TimeSlot[] (req) - Available time slots
  - onSchedule: (meeting: MeetingDetails) => Promise<void> (req) - Schedule handler
  - onClose: () => void (req) - Close modal
[TABLE]: virtualmeetingschedulesandlinks

---

## ### MODAL_PATTERN ###

```jsx
function ExampleModal({ data, onConfirm, onClose }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm(data)
      onClose()
    } catch (err) {
      showError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <Modal.Header>Title</Modal.Header>
        <Modal.Body>{content}</Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button primary onClick={handleConfirm} loading={isLoading}>Confirm</Button>
        </Modal.Footer>
      </div>
    </div>
  )
}
```

---

## ### CRITICAL_USAGE_RULES ###

[RULE_1]: Parent component controls isOpen state
[RULE_2]: Modal must call onClose after successful action
[RULE_3]: Escape key and backdrop click should call onClose
[RULE_4]: Use stopPropagation on content to prevent backdrop close

---

## ### DEPENDENCIES ###

[LOCAL]: shared/Button
[LOGIC]: logic/calculators/pricing/, logic/rules/proposals/, logic/processors/
[EXTERNAL]: @react-google-maps/api (MapModal only)

---

**FILE_COUNT**: 8
**EXPORTS_COUNT**: 8
