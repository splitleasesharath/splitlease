/**
 * Input validation for reminder-scheduler Edge Function
 * Split Lease - Reminder House Manual Feature
 *
 * NO FALLBACK PRINCIPLE: Validation failures throw errors immediately
 */

import { ValidationError } from "../../_shared/errors.ts";
import type {
  CreateReminderPayload,
  UpdateReminderPayload,
  GetRemindersPayload,
  GetByVisitPayload,
  DeleteReminderPayload,
  ReminderType,
} from "./types.ts";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const VALID_REMINDER_TYPES: readonly ReminderType[] = [
  'check-in',
  'check-out',
  'maintenance',
  'payment',
  'emergency',
  'amenity',
  'local-tip',
  'custom',
];

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

// ─────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────

/**
 * Validate create reminder payload
 */
export const validateCreatePayload = (
  payload: Record<string, unknown>
): CreateReminderPayload => {
  // Required fields
  if (!payload.houseManualId || typeof payload.houseManualId !== 'string') {
    throw new ValidationError('houseManualId is required and must be a string');
  }

  if (!payload.creatorId || typeof payload.creatorId !== 'string') {
    throw new ValidationError('creatorId is required and must be a string');
  }

  if (!payload.message || typeof payload.message !== 'string') {
    throw new ValidationError('message is required and must be a string');
  }

  if (payload.message.trim().length === 0) {
    throw new ValidationError('message cannot be empty');
  }

  if (!payload.scheduledDateTime || typeof payload.scheduledDateTime !== 'string') {
    throw new ValidationError('scheduledDateTime is required and must be a string');
  }

  // Validate scheduled time is in the future
  const scheduledDate = new Date(payload.scheduledDateTime);
  if (isNaN(scheduledDate.getTime())) {
    throw new ValidationError('scheduledDateTime must be a valid ISO date string');
  }

  if (scheduledDate <= new Date()) {
    throw new ValidationError('scheduledDateTime must be in the future');
  }

  // At least one notification channel required
  const isEmailReminder = payload.isEmailReminder === true;
  const isSmsReminder = payload.isSmsReminder === true;

  if (!isEmailReminder && !isSmsReminder) {
    throw new ValidationError('At least one notification channel (email or SMS) must be enabled');
  }

  // Validate email if email reminder is enabled
  if (isEmailReminder && !payload.guestId && !payload.fallbackEmail) {
    throw new ValidationError('fallbackEmail is required when email reminder is enabled and no guest is attached');
  }

  if (payload.fallbackEmail && typeof payload.fallbackEmail === 'string') {
    if (!EMAIL_REGEX.test(payload.fallbackEmail)) {
      throw new ValidationError(`Invalid fallbackEmail format: ${payload.fallbackEmail}`);
    }
  }

  // Validate phone if SMS reminder is enabled
  if (isSmsReminder && !payload.guestId && !payload.fallbackPhone) {
    throw new ValidationError('fallbackPhone is required when SMS reminder is enabled and no guest is attached');
  }

  if (payload.fallbackPhone && typeof payload.fallbackPhone === 'string') {
    if (!E164_REGEX.test(payload.fallbackPhone)) {
      throw new ValidationError(`fallbackPhone must be in E.164 format (e.g., +15551234567). Got: ${payload.fallbackPhone}`);
    }
  }

  // Validate reminder type if provided
  if (payload.reminderType !== undefined) {
    if (!VALID_REMINDER_TYPES.includes(payload.reminderType as ReminderType)) {
      throw new ValidationError(`Invalid reminderType: ${payload.reminderType}. Valid types: ${VALID_REMINDER_TYPES.join(', ')}`);
    }
  }

  return {
    houseManualId: payload.houseManualId as string,
    creatorId: payload.creatorId as string,
    message: payload.message as string,
    scheduledDateTime: payload.scheduledDateTime as string,
    isEmailReminder,
    isSmsReminder,
    guestId: payload.guestId as string | undefined,
    visitId: payload.visitId as string | undefined,
    fallbackPhone: payload.fallbackPhone as string | undefined,
    fallbackEmail: payload.fallbackEmail as string | undefined,
    reminderType: payload.reminderType as ReminderType | undefined,
    templateId: payload.templateId as string | undefined,
  };
};

/**
 * Validate update reminder payload
 */
export const validateUpdatePayload = (
  payload: Record<string, unknown>
): UpdateReminderPayload => {
  if (!payload.reminderId || typeof payload.reminderId !== 'string') {
    throw new ValidationError('reminderId is required and must be a string');
  }

  // At least one field to update
  const hasUpdate = payload.message !== undefined ||
    payload.scheduledDateTime !== undefined ||
    payload.isEmailReminder !== undefined ||
    payload.isSmsReminder !== undefined ||
    payload.fallbackPhone !== undefined ||
    payload.fallbackEmail !== undefined ||
    payload.reminderType !== undefined ||
    payload.status !== undefined;

  if (!hasUpdate) {
    throw new ValidationError('At least one field must be provided for update');
  }

  // Validate scheduled time if provided
  if (payload.scheduledDateTime !== undefined) {
    if (typeof payload.scheduledDateTime !== 'string') {
      throw new ValidationError('scheduledDateTime must be a string');
    }
    const scheduledDate = new Date(payload.scheduledDateTime);
    if (isNaN(scheduledDate.getTime())) {
      throw new ValidationError('scheduledDateTime must be a valid ISO date string');
    }
    if (scheduledDate <= new Date()) {
      throw new ValidationError('scheduledDateTime must be in the future');
    }
  }

  // Validate email format if provided
  if (payload.fallbackEmail !== undefined && payload.fallbackEmail !== null) {
    if (typeof payload.fallbackEmail === 'string' && payload.fallbackEmail.length > 0) {
      if (!EMAIL_REGEX.test(payload.fallbackEmail)) {
        throw new ValidationError(`Invalid fallbackEmail format: ${payload.fallbackEmail}`);
      }
    }
  }

  // Validate phone format if provided
  if (payload.fallbackPhone !== undefined && payload.fallbackPhone !== null) {
    if (typeof payload.fallbackPhone === 'string' && payload.fallbackPhone.length > 0) {
      if (!E164_REGEX.test(payload.fallbackPhone)) {
        throw new ValidationError(`fallbackPhone must be in E.164 format. Got: ${payload.fallbackPhone}`);
      }
    }
  }

  // Validate reminder type if provided
  if (payload.reminderType !== undefined) {
    if (!VALID_REMINDER_TYPES.includes(payload.reminderType as ReminderType)) {
      throw new ValidationError(`Invalid reminderType: ${payload.reminderType}`);
    }
  }

  // Validate status if provided
  if (payload.status !== undefined) {
    const validStatuses = ['pending', 'sent', 'cancelled'];
    if (!validStatuses.includes(payload.status as string)) {
      throw new ValidationError(`Invalid status: ${payload.status}. Valid statuses: ${validStatuses.join(', ')}`);
    }
  }

  return {
    reminderId: payload.reminderId as string,
    message: payload.message as string | undefined,
    scheduledDateTime: payload.scheduledDateTime as string | undefined,
    isEmailReminder: payload.isEmailReminder as boolean | undefined,
    isSmsReminder: payload.isSmsReminder as boolean | undefined,
    fallbackPhone: payload.fallbackPhone as string | undefined,
    fallbackEmail: payload.fallbackEmail as string | undefined,
    reminderType: payload.reminderType as ReminderType | undefined,
    status: payload.status as 'pending' | 'sent' | 'cancelled' | undefined,
  };
};

/**
 * Validate get reminders payload
 */
export const validateGetPayload = (
  payload: Record<string, unknown>
): GetRemindersPayload => {
  // At least one filter required
  if (!payload.houseManualId && !payload.visitId) {
    throw new ValidationError('Either houseManualId or visitId is required');
  }

  return {
    houseManualId: payload.houseManualId as string | undefined,
    visitId: payload.visitId as string | undefined,
    status: payload.status as 'pending' | 'sent' | 'cancelled' | undefined,
  };
};

/**
 * Validate get-by-visit payload (for guest view)
 */
export const validateGetByVisitPayload = (
  payload: Record<string, unknown>
): GetByVisitPayload => {
  if (!payload.visitId || typeof payload.visitId !== 'string') {
    throw new ValidationError('visitId is required and must be a string');
  }

  return {
    visitId: payload.visitId as string,
  };
};

/**
 * Validate delete reminder payload
 */
export const validateDeletePayload = (
  payload: Record<string, unknown>
): DeleteReminderPayload => {
  if (!payload.reminderId || typeof payload.reminderId !== 'string') {
    throw new ValidationError('reminderId is required and must be a string');
  }

  return {
    reminderId: payload.reminderId as string,
  };
};

/**
 * Validate batch size for process-pending
 */
export const validateBatchSize = (batchSize: unknown): number => {
  const size = typeof batchSize === 'number' ? batchSize : 10;

  if (size < 1 || size > 100) {
    throw new ValidationError('batchSize must be between 1 and 100');
  }

  return size;
};
