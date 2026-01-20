/**
 * FixedSaveBar.jsx
 *
 * Fixed bottom bar with "Preview Public Profile" and "Save Changes" buttons.
 * Only shown in editor view or preview mode for own profile.
 */

import React from 'react';
import { ExternalLink, ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useToast } from '../../../../shared/Toast.jsx';

export default function FixedSaveBar({
  onPreview,
  onSave,
  saving = false,
  disabled = false,
  previewMode = false
}) {
  const { showToast } = useToast();

  const handleSave = async () => {
    if (saving || disabled) return;
    const result = await onSave();

    if (result?.success) {
      showToast({
        title: 'Profile saved',
        content: 'Your changes have been saved successfully.',
        type: 'success'
      });
    } else {
      showToast({
        title: 'Save failed',
        content: result?.error || 'Unable to save changes. Please try again.',
        type: 'error'
      });
    }
  };

  // Preview mode: Show exit preview button only
  if (previewMode) {
    return (
      <div className="fixed-save-bar fixed-save-bar--preview-mode">
        <div className="preview-mode-indicator">
          <span>👁️ Viewing as public</span>
        </div>
        <button
          type="button"
          className="save-bar-btn save-bar-btn--preview"
          onClick={onPreview}
        >
          <ArrowLeft size={16} style={{ marginRight: 8 }} />
          Exit Preview
        </button>
      </div>
    );
  }

  return (
    <div className="fixed-save-bar">
      <button
        type="button"
        className="save-bar-btn save-bar-btn--preview"
        onClick={onPreview}
      >
        <ExternalLink size={16} style={{ marginRight: 8 }} />
        Preview Public Profile
      </button>

      <button
        type="button"
        className="save-bar-btn save-bar-btn--save"
        onClick={handleSave}
        disabled={saving || disabled}
      >
        {saving ? (
          <>
            <Loader2 size={16} style={{ marginRight: 8 }} className="animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save size={16} style={{ marginRight: 8 }} />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}
