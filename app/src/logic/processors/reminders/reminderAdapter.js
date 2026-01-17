/**
 * Reminder data adapters.
 * Transform data between form, API, and database formats.
 */

/**
 * Adapt form data for API submission.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.formData - Form data from the UI.
 * @param {string} params.houseManualId - House manual ID.
 * @param {string} params.creatorId - Creator user ID.
 * @returns {object} Payload ready for API submission.
 *
 * @example
 * adaptReminderForSubmission({
 *   formData: { message: 'Check-in at 3pm', scheduledDate: new Date(), ... },
 *   houseManualId: 'abc123',
 *   creatorId: 'user456'
 * })
 */
export function adaptReminderForSubmission({ formData, houseManualId, creatorId }) {
  return {
    houseManualId,
    creatorId,
    message: formData.message?.trim() || '',
    scheduledDateTime: formData.scheduledDateTime instanceof Date
      ? formData.scheduledDateTime.toISOString()
      : formData.scheduledDateTime,
    isEmailReminder: Boolean(formData.isEmailReminder),
    isSmsReminder: Boolean(formData.isSmsReminder),
    guestId: formData.guestId || undefined,
    visitId: formData.visitId || undefined,
    fallbackPhone: formData.fallbackPhone?.trim() || undefined,
    fallbackEmail: formData.fallbackEmail?.trim() || undefined,
    reminderType: formData.reminderType || 'custom',
    templateId: formData.templateId || undefined,
  };
}

/**
 * Adapt database record to UI format.
 *
 * @param {object} params - Named parameters.
 * @param {object} params.dbRow - Database row with Bubble-style column names.
 * @returns {object} UI-friendly reminder object.
 */
export function adaptReminderFromDatabase({ dbRow }) {
  if (!dbRow) {
    return null;
  }

  return {
    id: dbRow._id,
    houseManualId: dbRow['house manual'],
    guestId: dbRow.guest,
    creatorId: dbRow['Created By'],
    message: dbRow['message to send'],
    scheduledDateTime: dbRow['scheduled date and time'],
    isEmailReminder: Boolean(dbRow['is an email reminder?']),
    isSmsReminder: Boolean(dbRow['is a phone reminder?']),
    fallbackPhone: dbRow['phone number (in case no guest attached)'],
    fallbackEmail: dbRow['fallback email'],
    reminderType: dbRow['type of reminders'] || 'custom',
    emailSchedulerCode: dbRow['API scheduled code for email'],
    smsSchedulerCode: dbRow['API scheduled code for sms'],
    status: dbRow.status || 'pending',
    visitId: dbRow.visit,
    deliveryStatus: dbRow.delivery_status || 'pending',
    deliveredAt: dbRow.delivered_at,
    openedAt: dbRow.opened_at,
    sendgridMessageId: dbRow.sendgrid_message_id,
    twilioMessageSid: dbRow.twilio_message_sid,
    createdAt: dbRow['Created Date'],
    modifiedAt: dbRow['Modified Date'],
  };
}

/**
 * Adapt multiple database records to UI format.
 *
 * @param {object} params - Named parameters.
 * @param {Array} params.dbRows - Array of database rows.
 * @returns {Array} Array of UI-friendly reminder objects.
 */
export function adaptRemindersFromDatabase({ dbRows }) {
  if (!Array.isArray(dbRows)) {
    return [];
  }

  return dbRows.map(row => adaptReminderFromDatabase({ dbRow: row }));
}

/**
 * Adapt update form data for API submission.
 *
 * @param {object} params - Named parameters.
 * @param {string} params.reminderId - Reminder ID to update.
 * @param {object} params.updates - Fields to update.
 * @returns {object} Payload ready for API submission.
 */
export function adaptReminderUpdateForSubmission({ reminderId, updates }) {
  const payload = { reminderId };

  if (updates.message !== undefined) {
    payload.message = updates.message?.trim() || '';
  }

  if (updates.scheduledDateTime !== undefined) {
    payload.scheduledDateTime = updates.scheduledDateTime instanceof Date
      ? updates.scheduledDateTime.toISOString()
      : updates.scheduledDateTime;
  }

  if (updates.isEmailReminder !== undefined) {
    payload.isEmailReminder = Boolean(updates.isEmailReminder);
  }

  if (updates.isSmsReminder !== undefined) {
    payload.isSmsReminder = Boolean(updates.isSmsReminder);
  }

  if (updates.fallbackPhone !== undefined) {
    payload.fallbackPhone = updates.fallbackPhone?.trim() || undefined;
  }

  if (updates.fallbackEmail !== undefined) {
    payload.fallbackEmail = updates.fallbackEmail?.trim() || undefined;
  }

  if (updates.reminderType !== undefined) {
    payload.reminderType = updates.reminderType;
  }

  if (updates.status !== undefined) {
    payload.status = updates.status;
  }

  return payload;
}
