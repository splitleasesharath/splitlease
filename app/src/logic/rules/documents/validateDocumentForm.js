/**
 * validateDocumentForm - Validates the create document form
 *
 * Pure function that returns validation errors for the document creation form.
 * Follows the four-layer logic architecture:
 * - Rules layer: Boolean predicates and validation logic
 *
 * @param {Object} formState - The form state to validate
 * @param {string} formState.selectedPolicyId - Selected policy document ID
 * @param {string} formState.documentTitle - Custom document title
 * @param {string} formState.selectedHostId - Selected host user ID
 * @returns {Object} Error messages keyed by field name (empty object if valid)
 */
export function validateDocumentForm(formState) {
  const errors = {};

  // Validate policy document selection
  if (!formState.selectedPolicyId) {
    errors.selectedPolicyId = 'Please select a policy document';
  }

  // Validate document title
  if (!formState.documentTitle?.trim()) {
    errors.documentTitle = 'Document title is required';
  } else if (formState.documentTitle.trim().length > 255) {
    errors.documentTitle = 'Document title must be 255 characters or less';
  } else if (formState.documentTitle.trim().length < 3) {
    errors.documentTitle = 'Document title must be at least 3 characters';
  }

  // Validate host selection
  if (!formState.selectedHostId) {
    errors.selectedHostId = 'Please select a host';
  }

  return errors;
}

/**
 * canCreateDocument - Checks if the form is valid and ready for submission
 *
 * Pure predicate function following the "can*" naming convention.
 *
 * @param {Object} formState - The form state to check
 * @returns {boolean} True if the form is valid
 */
export function canCreateDocument(formState) {
  return Object.keys(validateDocumentForm(formState)).length === 0;
}

/**
 * isDocumentTitleValid - Checks if document title meets requirements
 *
 * @param {string} title - The document title
 * @returns {boolean} True if title is valid
 */
export function isDocumentTitleValid(title) {
  if (!title || typeof title !== 'string') {
    return false;
  }
  const trimmed = title.trim();
  return trimmed.length >= 3 && trimmed.length <= 255;
}
