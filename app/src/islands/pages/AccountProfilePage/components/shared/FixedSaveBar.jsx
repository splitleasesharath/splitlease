/**
 * FixedSaveBar.jsx
 *
 * Fixed bottom bar with "Preview Public Profile" and "Save Changes" buttons.
 * Only shown in editor view.
 */

import React from 'react';
import { ExternalLink, Save, Loader2 } from 'lucide-react';

export default function FixedSaveBar({
  onPreview,
  onSave,
  saving = false,
  disabled = false
}) {
  const handleSave = async () => {
    if (saving || disabled) return;
    const result = await onSave();
    // Toast notification handled by parent
  };

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
