/**
 * Emergency Service
 * Split Lease - Frontend Library
 *
 * Client for emergency Edge Function operations
 */

import { supabase } from './supabase';

/**
 * Call the emergency Edge Function with an action and payload
 */
async function callEmergencyFunction(action, payload = {}) {
  console.log(`[emergencyService] Calling action: ${action}`);

  const { data, error } = await supabase.functions.invoke('emergency', {
    body: { action, payload },
  });

  if (error) {
    console.error(`[emergencyService] Error in ${action}:`, error);
    throw new Error(error.message || `Failed to execute ${action}`);
  }

  if (!data.success) {
    throw new Error(data.error || `Failed to execute ${action}`);
  }

  return data.data;
}

// ============================================================================
// Emergency CRUD Operations
// ============================================================================

/**
 * Fetch all emergencies with optional filters
 */
export async function fetchEmergencies({ status, assignedTo, includeHidden, limit, offset } = {}) {
  return callEmergencyFunction('getAll', { status, assignedTo, includeHidden, limit, offset });
}

/**
 * Fetch single emergency with full details
 */
export async function fetchEmergencyById(id) {
  return callEmergencyFunction('getById', { id });
}

/**
 * Create a new emergency report
 */
export async function createEmergency(data) {
  return callEmergencyFunction('create', data);
}

/**
 * Update emergency fields
 */
export async function updateEmergency(id, data) {
  return callEmergencyFunction('update', { id, ...data });
}

// ============================================================================
// Emergency Actions
// ============================================================================

/**
 * Assign emergency to a team member
 */
export async function assignEmergency(emergencyId, assignedToUserId, guidanceInstructions) {
  return callEmergencyFunction('assignEmergency', {
    emergencyId,
    assignedToUserId,
    guidanceInstructions,
  });
}

/**
 * Update emergency status
 */
export async function updateEmergencyStatus(emergencyId, status) {
  return callEmergencyFunction('updateStatus', { emergencyId, status });
}

/**
 * Update emergency visibility (hide/show)
 */
export async function updateEmergencyVisibility(emergencyId, isHidden) {
  return callEmergencyFunction('updateVisibility', { emergencyId, isHidden });
}

// ============================================================================
// Communication Operations
// ============================================================================

/**
 * Send SMS to recipient
 */
export async function sendSMS(emergencyId, recipientPhone, messageBody) {
  return callEmergencyFunction('sendSMS', { emergencyId, recipientPhone, messageBody });
}

/**
 * Send email to recipient
 */
export async function sendEmail(emergencyId, emailData) {
  return callEmergencyFunction('sendEmail', { emergencyId, ...emailData });
}

/**
 * Fetch SMS message history for an emergency
 */
export async function fetchMessages(emergencyId) {
  return callEmergencyFunction('getMessages', { emergencyId });
}

/**
 * Fetch email history for an emergency
 */
export async function fetchEmails(emergencyId) {
  return callEmergencyFunction('getEmails', { emergencyId });
}

// ============================================================================
// Preset Templates
// ============================================================================

/**
 * Fetch preset SMS message templates
 */
export async function fetchPresetMessages(category) {
  return callEmergencyFunction('getPresetMessages', { category, activeOnly: true });
}

/**
 * Fetch preset email templates
 */
export async function fetchPresetEmails(category) {
  return callEmergencyFunction('getPresetEmails', { category, activeOnly: true });
}

// ============================================================================
// Team Management
// ============================================================================

/**
 * Fetch team members (admin users) for assignment
 */
export async function fetchTeamMembers() {
  return callEmergencyFunction('getTeamMembers', {});
}

// ============================================================================
// Photo Upload (Supabase Storage)
// ============================================================================

/**
 * Upload emergency photo to Supabase Storage
 */
export async function uploadEmergencyPhoto(file, emergencyId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${emergencyId}/${Date.now()}.${fileExt}`;
  const filePath = `emergency-photos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('emergency-photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[emergencyService] Photo upload error:', error);
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('emergency-photos')
    .getPublicUrl(filePath);

  return publicUrl;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check emergency function health
 */
export async function checkHealth() {
  return callEmergencyFunction('health', {});
}
