  [AST Cache] HIT - Using cached analysis (65 files)
### Symbol Table (Exports by File)

| File | Exports |
|------|---------|
| `calculators\pricing\calculateFourWeekRent.js` | `calculateFourWeekRent` |
| `calculators\pricing\calculateGuestFacingPrice.js` | `calculateGuestFacingPrice` |
| `calculators\pricing\calculatePricingBreakdown.js` | `calculatePricingBreakdown` |
| `calculators\pricing\calculateReservationTotal.js` | `calculateReservationTotal` |
| `calculators\pricing\getNightlyRateByFrequency.js` | `getNightlyRateByFrequency` |
| `calculators\reminders\calculateNextSendTime.js` | `calculateNextSendTime`, `calculateTimeUntilSend` |
| `calculators\reviews\calculateFormCompletion.js` | `calculateFormCompletion` |
| `calculators\reviews\calculateReviewScore.js` | `calculateReviewScore` |
| `calculators\scheduling\calculateCheckInOutDays.js` | `calculateCheckInOutDays` |
| `calculators\scheduling\calculateCheckInOutFromDays.js` | `calculateCheckInOutFromDays` |
| `calculators\scheduling\calculateNextAvailableCheckIn.js` | `calculateNextAvailableCheckIn` |
| `calculators\scheduling\calculateNightsFromDays.js` | `calculateNightsFromDays` |
| `calculators\scheduling\getNextOccurrenceOfDay.js` | `getNextOccurrenceOfDay` |
| `calculators\scheduling\isContiguousSelection.js` | `isContiguousSelection` |
| `calculators\scheduling\shiftMoveInDateIfPast.js` | `shiftMoveInDateIfPast` |
| `constants\proposalStages.js` | `PROPOSAL_STAGES`, `getStageById`, `getStageByName`, `getStageProgress`, `getCompletedStages`, `getRemainingStages`, `isStageCompleted`, `isCurrentStage`, `isStagePending`, `getPreviousStage`, ... (+3 more) |
| `constants\proposalStatuses.js` | `PROPOSAL_STATUSES`, `getStatusConfig`, `getStageFromStatus`, `getUsualOrder`, `shouldShowStatusBanner`, `getActionsForStatus`, `isActiveStatus`, `isTerminalStatus`, `isCompletedStatus`, `isSuggestedProposal`, ... (+3 more) |
| `constants\reviewCategories.js` | `REVIEW_CATEGORY_COUNT`, `REVIEW_CATEGORIES`, `RATING_SCALE_LABELS` |
| `processors\display\formatHostName.js` | `formatHostName` |
| `processors\listing\extractListingCoordinates.js` | `extractListingCoordinates` |
| `processors\listing\parseJsonArrayField.js` | `parseJsonArrayField`, `parseJsonArrayFieldOptional` |
| `processors\proposal\processProposalTerms.js` | `processProposalTerms` |
| `processors\proposals\processProposalData.js` | `processUserData`, `processListingData`, `processHostData`, `processVirtualMeetingData`, `processProposalData`, `getProposalDisplayText`, `formatPrice`, `formatDate`, `formatDateTime`, `getEffectiveTerms` |
| `processors\reminders\reminderAdapter.js` | `adaptReminderForSubmission`, `adaptReminderFromDatabase`, `adaptRemindersFromDatabase`, `adaptReminderUpdateForSubmission` |
| `processors\reminders\reminderFormatter.js` | `formatScheduledTime`, `formatRelativeTime`, `formatReminderType`, `getReminderTypeOptions`, `formatReminderStatus`, `formatDeliveryStatus`, `formatNotificationChannels`, `truncateMessage` |
| `processors\reviews\reviewAdapter.js` | `createEmptyRatings`, `adaptReviewForSubmission`, `adaptReviewFromApi` |
| `processors\user\processProfilePhotoUrl.js` | `processProfilePhotoUrl` |
| `processors\user\processUserData.js` | `processUserData` |
| `processors\user\processUserDisplayName.js` | `processUserDisplayName` |
| `processors\user\processUserInitials.js` | `processUserInitials` |
| `rules\auth\isProtectedPage.js` | `isProtectedPage` |
| `rules\auth\isSessionValid.js` | `isSessionValid` |
| `rules\pricing\isValidDayCountForPricing.js` | `isValidDayCountForPricing` |
| `rules\proposals\canAcceptProposal.js` | `canAcceptProposal` |
| `rules\proposals\canCancelProposal.js` | `canCancelProposal` |
| `rules\proposals\canEditProposal.js` | `canEditProposal` |
| `rules\proposals\determineProposalStage.js` | `determineProposalStage` |
| `rules\proposals\proposalRules.js` | `canCancelProposal`, `canModifyProposal`, `hasReviewableCounteroffer`, `canAcceptCounteroffer`, `canDeclineCounteroffer`, `canSubmitRentalApplication`, `canReviewDocuments`, `canRequestVirtualMeeting`, `canSendMessage`, `isProposalActive`, ... (+10 more) |
| `rules\proposals\useProposalButtonStates.js` | `useProposalButtonStates` |
| `rules\proposals\virtualMeetingRules.js` | `VM_STATES`, `areAllDatesExpired`, `getVirtualMeetingState`, `canRequestNewMeeting`, `canRespondToMeeting`, `isVMButtonDisabled`, `canJoinMeeting`, `canViewMeetingDetails`, `canCancelVMRequest`, `getVMButtonText`, ... (+2 more) |
| `rules\reminders\reminderScheduling.js` | `isValidScheduleTime`, `canScheduleReminder`, `requiresFallbackContact`, `isReminderDue`, `isDelivered`, `hasDeliveryFailed` |
| `rules\reminders\reminderValidation.js` | `canCreateReminder`, `canUpdateReminder`, `canDeleteReminder`, `canSubmitReminder`, `isValidReminderMessage`, `canEditReminder` |
| `rules\reviews\reviewValidation.js` | `isReviewComplete`, `isValidRating`, `canSubmitReview`, `hasExistingReview` |
| `rules\scheduling\isDateBlocked.js` | `isDateBlocked` |
| `rules\scheduling\isDateInRange.js` | `isDateInRange` |
| `rules\scheduling\isScheduleContiguous.js` | `isScheduleContiguous` |
| `rules\search\hasListingPhotos.js` | `hasListingPhotos` |
| `rules\search\isValidPriceTier.js` | `isValidPriceTier` |
| `rules\search\isValidSortOption.js` | `isValidSortOption` |
| `rules\search\isValidWeekPattern.js` | `isValidWeekPattern` |
| `rules\users\hasProfilePhoto.js` | `hasProfilePhoto` |
| `rules\users\isGuest.js` | `isGuest` |
| `rules\users\isHost.js` | `isHost` |
| `rules\users\shouldShowFullName.js` | `shouldShowFullName` |
| `workflows\auth\checkAuthStatusWorkflow.js` | `checkAuthStatusWorkflow` |
| `workflows\auth\validateTokenWorkflow.js` | `validateTokenWorkflow` |
| `workflows\booking\acceptProposalWorkflow.js` | `acceptProposalWorkflow` |
| `workflows\booking\loadProposalDetailsWorkflow.js` | `loadProposalDetailsWorkflow` |
| `workflows\proposals\cancelProposalWorkflow.js` | `determineCancellationCondition`, `executeCancelProposal`, `cancelProposalFromCompareTerms`, `cancelProposalWorkflow`, `executeDeleteProposal` |
| `workflows\proposals\counterofferWorkflow.js` | `acceptCounteroffer`, `declineCounteroffer`, `getTermsComparison` |
| `workflows\proposals\navigationWorkflow.js` | `navigateToListing`, `navigateToMessaging`, `navigateToRentalApplication`, `navigateToDocumentReview`, `navigateToLeaseDocuments`, `navigateToHouseManual`, `navigateToSearch`, `openExternalLink`, `updateUrlWithProposal`, `getProposalIdFromUrl` |
| `workflows\proposals\virtualMeetingWorkflow.js` | `requestVirtualMeeting`, `requestAlternativeMeeting`, `respondToVirtualMeeting`, `declineVirtualMeeting`, `cancelVirtualMeetingRequest`, `fetchVirtualMeetingByProposalId` |
| `workflows\reminders\reminderWorkflow.js` | `createReminderWorkflow`, `updateReminderWorkflow`, `deleteReminderWorkflow` |
| `workflows\scheduling\validateMoveInDateWorkflow.js` | `validateMoveInDateWorkflow` |
| `workflows\scheduling\validateScheduleWorkflow.js` | `validateScheduleWorkflow` |

### Dependency Graph (Imports by File)

| File | Imports From |
|------|--------------|
| `calculators\pricing\calculatePricingBreakdown.js` | `calculators\pricing\getNightlyRateByFrequency.js` (getNightlyRateByFrequency); `calculators\pricing\calculateFourWeekRent.js` (calculateFourWeekRent); `calculators\pricing\calculateReservationTotal.js` (calculateReservationTotal) |
| `calculators\scheduling\calculateCheckInOutDays.js` | `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\constants.js` (DAY_NAMES) |
| `processors\proposal\processProposalTerms.js` | `constants\proposalStatuses.js` (PROPOSAL_STATUSES, getUsualOrder) |
| `processors\reviews\reviewAdapter.js` | `constants\reviewCategories.js` (REVIEW_CATEGORIES) |
| `rules\proposals\canAcceptProposal.js` | `constants\proposalStatuses.js` (PROPOSAL_STATUSES) |
| `rules\proposals\canCancelProposal.js` | `constants\proposalStatuses.js` (isTerminalStatus, isCompletedStatus) |
| `rules\proposals\canEditProposal.js` | `constants\proposalStatuses.js` (getActionsForStatus) |
| `rules\proposals\determineProposalStage.js` | `constants\proposalStatuses.js` (getStageFromStatus, isTerminalStatus) |
| `rules\proposals\proposalRules.js` | `constants\proposalStatuses.js` (PROPOSAL_STATUSES, isTerminalStatus, isCompletedStatus); `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\dataLookups.js` (getGuestCancellationReasons) |
| `rules\proposals\useProposalButtonStates.js` | `react` (useMemo); `C:\Users\Split Lease\Documents\Split Lease\app\src\config\proposalStatusConfig.js` (getStatusConfig, PROPOSAL_STATUS) |
| `rules\reviews\reviewValidation.js` | `constants\reviewCategories.js` (REVIEW_CATEGORY_COUNT) |
| `workflows\booking\acceptProposalWorkflow.js` | `constants\proposalStatuses.js` (PROPOSAL_STATUSES) |
| `workflows\proposals\cancelProposalWorkflow.js` | `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabase.js` (supabase); `rules\proposals\proposalRules.js` (canCancelProposal, requiresSpecialCancellationConfirmation); `constants\proposalStatuses.js` (PROPOSAL_STATUSES) |
| `workflows\proposals\counterofferWorkflow.js` | `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabase.js` (supabase); `rules\proposals\proposalRules.js` (hasReviewableCounteroffer); `constants\proposalStatuses.js` (PROPOSAL_STATUSES) |
| `workflows\proposals\virtualMeetingWorkflow.js` | `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabase.js` (supabase) |
| `workflows\reminders\reminderWorkflow.js` | `rules\reminders\reminderValidation.js` (canCreateReminder, canUpdateReminder, canDeleteReminder); `rules\reminders\reminderScheduling.js` (canScheduleReminder); `processors\reminders\reminderAdapter.js` (adaptReminderForSubmission, adaptReminderUpdateForSubmission) |
| `workflows\scheduling\validateMoveInDateWorkflow.js` | `rules\scheduling\isDateInRange.js` (isDateInRange); `rules\scheduling\isDateBlocked.js` (isDateBlocked); `calculators\scheduling\calculateCheckInOutDays.js` (calculateCheckInOutDays); `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\dayUtils.js` (DAY_NAMES) |
| `workflows\scheduling\validateScheduleWorkflow.js` | `rules\scheduling\isScheduleContiguous.js` (isScheduleContiguous); `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\dayUtils.js` (DAY_NAMES) |

### Reverse Dependencies (Who Depends on Each File)

| File | Depended On By |
|------|----------------|
| `constants\proposalStatuses.js` | `processors\proposal\processProposalTerms.js`, `processors\proposal\processProposalTerms.js`, `rules\proposals\canAcceptProposal.js`, `rules\proposals\canCancelProposal.js`, `rules\proposals\canCancelProposal.js`, ... (+10 more) |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabase.js` | `workflows\proposals\cancelProposalWorkflow.js`, `workflows\proposals\counterofferWorkflow.js`, `workflows\proposals\virtualMeetingWorkflow.js` |
| `rules\proposals\proposalRules.js` | `workflows\proposals\cancelProposalWorkflow.js`, `workflows\proposals\cancelProposalWorkflow.js`, `workflows\proposals\counterofferWorkflow.js` |
| `rules\reminders\reminderValidation.js` | `workflows\reminders\reminderWorkflow.js`, `workflows\reminders\reminderWorkflow.js`, `workflows\reminders\reminderWorkflow.js` |
| `constants\reviewCategories.js` | `processors\reviews\reviewAdapter.js`, `rules\reviews\reviewValidation.js` |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\config\proposalStatusConfig.js` | `rules\proposals\useProposalButtonStates.js`, `rules\proposals\useProposalButtonStates.js` |
| `processors\reminders\reminderAdapter.js` | `workflows\reminders\reminderWorkflow.js`, `workflows\reminders\reminderWorkflow.js` |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\dayUtils.js` | `workflows\scheduling\validateMoveInDateWorkflow.js`, `workflows\scheduling\validateScheduleWorkflow.js` |
| `calculators\pricing\getNightlyRateByFrequency.js` | `calculators\pricing\calculatePricingBreakdown.js` |
| `calculators\pricing\calculateFourWeekRent.js` | `calculators\pricing\calculatePricingBreakdown.js` |
| `calculators\pricing\calculateReservationTotal.js` | `calculators\pricing\calculatePricingBreakdown.js` |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\constants.js` | `calculators\scheduling\calculateCheckInOutDays.js` |
| `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\dataLookups.js` | `rules\proposals\proposalRules.js` |
| `rules\reminders\reminderScheduling.js` | `workflows\reminders\reminderWorkflow.js` |
| `rules\scheduling\isDateInRange.js` | `workflows\scheduling\validateMoveInDateWorkflow.js` |
| `rules\scheduling\isDateBlocked.js` | `workflows\scheduling\validateMoveInDateWorkflow.js` |
| `calculators\scheduling\calculateCheckInOutDays.js` | `workflows\scheduling\validateMoveInDateWorkflow.js` |
| `rules\scheduling\isScheduleContiguous.js` | `workflows\scheduling\validateScheduleWorkflow.js` |

### Summary

- **Total files analyzed**: 65
- **Total exports**: 179
- **Total import relationships**: 43
- **Files with most dependents**: `constants\proposalStatuses.js` (15), `C:\Users\Split Lease\Documents\Split Lease\app\src\lib\supabase.js` (3), `rules\proposals\proposalRules.js` (3), `rules\reminders\reminderValidation.js` (3), `constants\reviewCategories.js` (2)
