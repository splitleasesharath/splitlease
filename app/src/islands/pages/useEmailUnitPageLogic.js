import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';

/**
 * useEmailUnitPageLogic - Logic hook for Email Unit Preview Page
 *
 * Handles:
 * - Fetching email templates from Supabase reference_table
 * - Managing template selection and placeholder values
 * - Generating live HTML preview with placeholder substitution
 */
export default function useEmailUnitPageLogic() {
  // State
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get the selected template object
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find(t => t._id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Extract placeholders from the selected template
  const placeholders = useMemo(() => {
    return extractPlaceholders(selectedTemplate?.Placeholder);
  }, [selectedTemplate]);

  // Generate preview HTML with placeholder substitution
  const previewHtml = useMemo(() => {
    if (!selectedTemplate) return '';
    return generatePreviewHtml(
      selectedTemplate['Email Template JSON'],
      placeholderValues
    );
  }, [selectedTemplate, placeholderValues]);

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
        .select('_id, Name, Description, Placeholder, "Email Template JSON", Logo')
        .order('Name', { ascending: true });

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
      newPlaceholders.forEach(p => {
        initialValues[p.key] = '';
      });
      setPlaceholderValues(initialValues);
    } else {
      setPlaceholderValues({});
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

  return {
    // State
    templates,
    selectedTemplateId,
    selectedTemplate,
    placeholders,
    placeholderValues,
    previewHtml,
    loading,
    error,

    // Handlers
    handleTemplateChange,
    handlePlaceholderChange,
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
 * Generate preview HTML with placeholder substitution
 *
 * Parses the Email Template JSON, extracts HTML content,
 * and replaces placeholders with user-entered values.
 *
 * @param {string} templateJson - SendGrid format JSON string
 * @param {Object} placeholderValues - Map of placeholder keys to values
 * @returns {string} HTML string with placeholders replaced
 */
function generatePreviewHtml(templateJson, placeholderValues) {
  if (!templateJson) {
    return '';
  }

  try {
    // Parse the Email Template JSON
    const parsed = JSON.parse(templateJson);

    // Find the HTML content in the content array
    // SendGrid format has content array with type: "text/html" entries
    let htmlContent = '';

    if (parsed.content && Array.isArray(parsed.content)) {
      const htmlEntry = parsed.content.find(c => c.type === 'text/html');
      if (htmlEntry) {
        htmlContent = htmlEntry.value || '';
      } else {
        // Fall back to text/plain if no HTML
        const plainEntry = parsed.content.find(c => c.type === 'text/plain');
        if (plainEntry) {
          htmlContent = `<pre>${plainEntry.value || ''}</pre>`;
          console.warn('[useEmailUnitPageLogic] No text/html content found, using text/plain');
        }
      }
    }

    if (!htmlContent) {
      return '<p style="color: #dc2626; padding: 20px;">No HTML content found in template</p>';
    }

    // Replace all placeholders with user values
    let preview = htmlContent;
    Object.entries(placeholderValues).forEach(([key, value]) => {
      // key is like "$$header$$", value is user input
      // Escape special regex characters in the key (especially $)
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedKey, 'g');
      // If no value provided, show the placeholder itself
      preview = preview.replace(regex, value || key);
    });

    return preview;
  } catch (e) {
    console.error('[useEmailUnitPageLogic] Failed to parse template JSON:', e);
    return `<p style="color: #dc2626; padding: 20px;">Error parsing template: ${e.message}</p>`;
  }
}
