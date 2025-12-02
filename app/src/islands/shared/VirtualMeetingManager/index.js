/**
 * Virtual Meeting Manager - Main Export File
 * Export all components, services, and utilities
 */

// Main Component
export { default as VirtualMeetingManager } from './VirtualMeetingManager.jsx';
export { default } from './VirtualMeetingManager.jsx';

// Subcomponents
export { default as RespondToVMRequest } from './RespondToVMRequest.jsx';
export { default as BookVirtualMeeting } from './BookVirtualMeeting.jsx';
export { default as CancelVirtualMeetings } from './CancelVirtualMeetings.jsx';
export { default as DetailsOfProposalAndVM } from './DetailsOfProposalAndVM.jsx';
export { default as BookTimeSlot } from './BookTimeSlot.jsx';

// Services
export { default as virtualMeetingService } from './virtualMeetingService.js';
export * from './virtualMeetingService.js';

// Utilities
export * from './dateUtils.js';
