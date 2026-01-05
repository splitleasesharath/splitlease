import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * useEmailUnitPageLogic - Logic hook for Email Unit Preview Page
 *
 * Handles:
 * - Fetching email templates from Supabase reference_table
 * - Managing template selection and placeholder values
 * - Manual preview generation (not real-time)
 * - Sending test emails
 */

/**
 * Fixed from email address for all sent emails
 */
const FROM_EMAIL = 'tech@leasesplit.com';

/**
 * Multi-email placeholders that support multiple email addresses
 * These get converted to JSON arrays: [{"email": "e1"},{"email": "e2"}]
 *
 * Bubble conversion: comma separator → "},{"email":" to build array
 */
const MULTI_EMAIL_PLACEHOLDERS = ['$$to$$', '$$cc$$', '$$bcc$$'];

export default function useEmailUnitPageLogic() {
  // State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [multiEmailValues, setMultiEmailValues] = useState({}); // { '$$cc$$': ['', ''], '$$bcc$$': [''] }
  const [previewHtml, setPreviewHtml] = useState(''); // Manual preview (not real-time)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null); // { success: bool, message: string }

  // Get the selected template object
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find(t => t._id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Extract placeholders from the selected template
  const placeholders = useMemo(() => {
    return extractPlaceholders(selectedTemplate?.Placeholder);
  }, [selectedTemplate]);

  // Check if required fields are filled (at least one To email)
  const canSendEmail = useMemo(() => {
    if (!selectedTemplate) return false;
    const toEmails = multiEmailValues['$$to$$'] || [];
    // At least one valid To email required
    return toEmails.some(email => email && email.trim().length > 0);
  }, [selectedTemplate, multiEmailValues]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  /**
   * Fetch all email templates from Supabase
   */
  async function loadTemplates() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .schema('reference_table')
        .from('zat_email_html_template_eg_sendbasicemailwf_')
        .select('_id, Name, Description, Placeholder, "Email Template JSON", Logo, "Created Date"')
        .order('Created Date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setTemplates(data || []);
    } catch (err) {
      console.error('[useEmailUnitPageLogic] Error loading templates:', err);
      setError('Unable to load email templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle template selection change
   * Resets placeholder values when a new template is selected
   */
  function handleTemplateChange(templateId) {
    setSelectedTemplateId(templateId || null);

    // Reset placeholder values for the new template
    if (templateId) {
      const template = templates.find(t => t._id === templateId);
      const newPlaceholders = extractPlaceholders(template?.Placeholder);
      const initialValues = {};
      const initialMultiEmails = {};

      newPlaceholders.forEach(p => {
        if (MULTI_EMAIL_PLACEHOLDERS.includes(p.key)) {
          // Initialize multi-email fields with one empty entry
          initialMultiEmails[p.key] = [''];
        } else {
          initialValues[p.key] = '';
        }
      });

      setPlaceholderValues(initialValues);
      setMultiEmailValues(initialMultiEmails);
    } else {
      setPlaceholderValues({});
      setMultiEmailValues({});
    }
  }

  /**
   * Handle individual placeholder value change
   */
  function handlePlaceholderChange(key, value) {
    setPlaceholderValues(prev => ({
      ...prev,
      [key]: value
    }));
  }

  /**
   * Handle multi-email field value change
   * @param {string} key - Placeholder key (e.g., '$$cc$$')
   * @param {number} index - Index of the email in the array
   * @param {string} value - New email value
   */
  function handleMultiEmailChange(key, index, value) {
    setMultiEmailValues(prev => {
      const emails = [...(prev[key] || [''])];
      emails[index] = value;
      return { ...prev, [key]: emails };
    });
  }

  /**
   * Add a new email input for a multi-email field
   * @param {string} key - Placeholder key (e.g., '$$cc$$')
   */
  function addMultiEmail(key) {
    setMultiEmailValues(prev => {
      const emails = [...(prev[key] || [''])];
      emails.push('');
      return { ...prev, [key]: emails };
    });
  }

  /**
   * Remove an email input from a multi-email field
   * @param {string} key - Placeholder key (e.g., '$$cc$$')
   * @param {number} index - Index to remove
   */
  function removeMultiEmail(key, index) {
    setMultiEmailValues(prev => {
      const emails = [...(prev[key] || [''])];
      if (emails.length > 1) {
        emails.splice(index, 1);
      } else {
        // Keep at least one empty input
        emails[0] = '';
      }
      return { ...prev, [key]: emails };
    });
  }

  /**
   * Check if a placeholder is a multi-email field
   */
  function isMultiEmailPlaceholder(key) {
    return MULTI_EMAIL_PLACEHOLDERS.includes(key);
  }

  /**
   * Manually update the preview (not real-time)
   * Called when user clicks "Update Preview" button
   */
  function updatePreview() {
    if (!selectedTemplate) {
      setPreviewHtml('');
      return;
    }
    const html = generatePreviewHtml(
      selectedTemplate['Email Template JSON'],
      placeholderValues
    );
    setPreviewHtml(html);
  }

  /**
   * Send test email using the send-email Edge Function
   */
  async function sendEmail() {
    if (!canSendEmail || !selectedTemplate) {
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      // Get to emails (filter out empty)
      const toEmails = (multiEmailValues['$$to$$'] || []).filter(e => e && e.trim());
      const ccEmails = (multiEmailValues['$$cc$$'] || []).filter(e => e && e.trim());
      const bccEmails = (multiEmailValues['$$bcc$$'] || []).filter(e => e && e.trim());

      // Build variables object for the email
      const variables = { ...placeholderValues };

      // Call the send-email Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'send',
          payload: {
            template_id: selectedTemplate._id,
            to_email: toEmails[0], // Primary recipient
            from_email: FROM_EMAIL,
            from_name: 'Split Lease',
            subject: placeholderValues['$$subject$$'] || 'Test Email',
            variables,
            // Additional recipients if any
            ...(ccEmails.length > 0 && { cc_emails: ccEmails }),
            ...(bccEmails.length > 0 && { bcc_emails: bccEmails }),
            ...(toEmails.length > 1 && { additional_to: toEmails.slice(1) }),
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSendResult({ success: true, message: 'Email sent successfully!' });
      } else {
        setSendResult({ success: false, message: result.error || 'Failed to send email' });
      }
    } catch (err) {
      console.error('[useEmailUnitPageLogic] Error sending email:', err);
      setSendResult({ success: false, message: err.message || 'Failed to send email' });
    } finally {
      setSending(false);
    }
  }

  /**
   * Clear the send result message
   */
  function clearSendResult() {
    setSendResult(null);
  }

  return {
    // State
    templates,
    selectedTemplateId,
    selectedTemplate,
    placeholders,
    placeholderValues,
    multiEmailValues,
    previewHtml,
    loading,
    error,
    canSendEmail,
    sending,
    sendResult,
    fromEmail: FROM_EMAIL,

    // Handlers
    handleTemplateChange,
    handlePlaceholderChange,
    handleMultiEmailChange,
    addMultiEmail,
    removeMultiEmail,
    isMultiEmailPlaceholder,
    updatePreview,
    sendEmail,
    clearSendResult,
  };
}

/**
 * Extract placeholders from template's Placeholder array
 *
 * Template Placeholder array format: ["$$header$$", "$$to$$", "$$body text$$", ...]
 * Converts to form-friendly format with key and label
 *
 * @param {Array|null} placeholderArray - Array of placeholder strings
 * @returns {Array} Array of { key, label, defaultValue } objects
 */
function extractPlaceholders(placeholderArray) {
  if (!placeholderArray || !Array.isArray(placeholderArray)) {
    return [];
  }

  return placeholderArray.map(p => ({
    key: p,           // "$$header$$" - used as form field name
    label: p,         // "$$header$$" - displayed as-is per requirements
    defaultValue: ''  // Empty default
  }));
}

/**
 * JSON fragment placeholders - these are NOT inside strings in the template.
 * They get replaced with JSON structures or removed entirely if empty.
 *
 * Format examples:
 * - $$cc$$ → ,"cc": [{"email": "email1"},{"email": "email2"}]
 * - $$bcc$$ → ,"bcc": [{"email": "email1"},{"email": "email2"}]
 * - $$reply_to$$ → "reply_to": {"email": "email" $$reply_to name$$},
 */
const JSON_FRAGMENT_PLACEHOLDERS = ['$$cc$$', '$$bcc$$', '$$reply_to$$'];

/**
 * Generate preview HTML with placeholder substitution
 *
 * Uses regex to extract HTML content from the template string
 * (template is NOT valid JSON due to structural placeholders like $$cc$$).
 *
 * @param {string} templateJson - SendGrid format template string (not valid JSON)
 * @param {Object} placeholderValues - Map of placeholder keys to values
 * @returns {string} HTML string with placeholders replaced
 */
function generatePreviewHtml(templateJson, placeholderValues) {
  if (!templateJson) {
    return '';
  }

  try {
    // Extract HTML content using regex since template isn't valid JSON
    // Look for "type": "text/html" followed by "value": "..."
    const htmlMatch = templateJson.match(/"type"\s*:\s*"text\/html"\s*,\s*"value"\s*:\s*"((?:[^"\\]|\\.)*)"/);

    let htmlContent = '';

    if (htmlMatch && htmlMatch[1]) {
      // Unescape JSON string escapes
      htmlContent = htmlMatch[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    } else {
      // Try alternative pattern: "value" comes before "type"
      const altMatch = templateJson.match(/"value"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"type"\s*:\s*"text\/html"/);
      if (altMatch && altMatch[1]) {
        htmlContent = altMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    }

    if (!htmlContent) {
      // Fall back to text/plain
      const plainMatch = templateJson.match(/"type"\s*:\s*"text\/plain"\s*,\s*"value"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      if (plainMatch && plainMatch[1]) {
        const plainText = plainMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
        htmlContent = `<pre style="white-space: pre-wrap; font-family: inherit;">${plainText}</pre>`;
        console.warn('[useEmailUnitPageLogic] No text/html content found, using text/plain');
      }
    }

    if (!htmlContent) {
      return '<p style="color: #dc2626; padding: 20px;">No HTML content found in template. The template may use a different format.</p>';
    }

    // Replace all content placeholders with user values
    let preview = htmlContent;
    Object.entries(placeholderValues).forEach(([key, value]) => {
      // Skip JSON fragment placeholders - they're not in the HTML content
      if (JSON_FRAGMENT_PLACEHOLDERS.includes(key)) {
        return;
      }

      // key is like "$$header$$", value is user input
      // Escape special regex characters in the key (especially $)
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKey, 'g');
      // If no value provided, show the placeholder itself
      preview = preview.replace(regex, value || key);
    });

    return preview;
  } catch (e) {
    console.error('[useEmailUnitPageLogic] Failed to extract template HTML:', e);
    return `<p style="color: #dc2626; padding: 20px;">Error extracting template: ${e.message}</p>`;
  }
}

/**
 * Check if a placeholder is a JSON fragment (affects JSON structure, not content)
 * Only CC and BCC are JSON fragments.
 */
export function isJsonFragmentPlaceholder(key) {
  return JSON_FRAGMENT_PLACEHOLDERS.includes(key);
}
