# Modal Components

**GENERATED**: 2025-11-26
**ARCHITECTURE**: React Islands
**PARENT**: app/src/islands/

---

## ### DIRECTORY_INTENT ###

[PURPOSE]: Overlay dialog components for focused user interactions
[PATTERN]: Modal components receive data via props and emit results via callbacks
[STYLING]: CSS Modules with modal.css base styles

---

## ### FILE_INVENTORY ###

### CancelProposalModal.jsx
[INTENT]: Modal for confirming proposal cancellation with reason input and refund preview
[IMPORTS]: react, shared/Button
[PROPS]: proposal, onCancel, onClose

### CompareTermsModal.jsx
[INTENT]: Side-by-side comparison of original proposal vs counteroffer terms for guest decision
[IMPORTS]: react, shared/Button
[DEPENDENCIES]: logic/processors/proposal/processProposalData
[PROPS]: originalTerms, counterTerms, onAccept, onReject, onClose

### EditProposalModal.jsx
[INTENT]: Edit existing proposal details including dates, days, and special requests
[IMPORTS]: react, shared/ListingScheduleSelector
[DEPENDENCIES]: logic/rules/proposals/canEditProposal
[PROPS]: proposal, onSave, onClose

### HostProfileModal.jsx
[INTENT]: Display host profile with photo, bio, response rate, and reviews
[IMPORTS]: react
[DEPENDENCIES]: logic/processors/user/processUserDisplayName
[PROPS]: host, onClose

### MapModal.jsx
[INTENT]: Full-screen Google Maps view showing listing location with neighborhood context
[IMPORTS]: react, @react-google-maps/api, lib/mapUtils
[PROPS]: coordinates, address, onClose

### NotificationSettingsModal.jsx
[INTENT]: User notification preferences for email, SMS, and push notifications
[IMPORTS]: react, lib/supabase
[PROPS]: user, onSave, onClose

### ProposalDetailsModal.jsx
[INTENT]: Complete proposal information with pricing breakdown, dates, and status history
[IMPORTS]: react
[DEPENDENCIES]: logic/calculators/pricing/calculatePricingBreakdown, logic/rules/proposals/determineProposalStage
[PROPS]: proposalId, onClose

### VirtualMeetingModal.jsx
[INTENT]: Schedule virtual property tours with calendar and video call setup
[IMPORTS]: react
[DEPENDENCIES]: logic/rules/proposals/virtualMeetingRules, lib/supabase
[PROPS]: proposal, hostAvailability, onSchedule, onClose

---

## ### MODAL_PATTERN ###

```jsx
<Modal onClose={handleClose}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>{content}</Modal.Body>
  <Modal.Footer>
    <Button onClick={onClose}>Cancel</Button>
    <Button primary onClick={onConfirm}>Confirm</Button>
  </Modal.Footer>
</Modal>
```

---

## ### USAGE_PATTERN ###

[IMPORT_FROM]: import { ProposalDetailsModal } from 'islands/modals/ProposalDetailsModal'
[STATE_MANAGEMENT]: Parent component controls isOpen state
[CALLBACKS]: onClose, onConfirm, onCancel passed as props

---

**FILE_COUNT**: 8
**EXPORTS_COUNT**: 8
