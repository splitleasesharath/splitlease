/**
 * FixedSaveBar.jsx
 *
 * Fixed bottom bar with "Preview Public Profile" and "Save Changes" buttons.
 * Only shown in editor view or preview mode for own profile.
 */

import React from 'react';
import { ExternalLink, ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function FixedSaveBar({
  onPreview,
  onSave,
  saving = false,
  disabled = false,
  previewMode = false
}) {
  const handleSave = async () => {
    if (saving || disabled) return;
    const result = await onSave();
    // Toast notification handled by parent
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
