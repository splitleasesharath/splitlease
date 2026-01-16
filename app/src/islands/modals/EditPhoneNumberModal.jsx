/**
 * Edit Phone Number Modal
 * Allows users to update their phone number from the account profile page
 * Design matches Bubble.io popup styling
 */

import { useState, useEffect } from 'react';
import { toast } from '../../lib/toastService.js';

export default function EditPhoneNumberModal({ isOpen, currentPhoneNumber, onSave, onClose }) {
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setNewPhoneNumber('');
    } else {
      setSaving(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!newPhoneNumber.trim()) {
      toast.warning('Please enter a new phone number');
      return;
    }

    setSaving(true);
    try {
      await onSave(newPhoneNumber.trim());
      onClose();
    } catch (error) {
      toast.error(`Error saving phone number: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2002,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '100px',
        paddingBottom: '50px',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={onClose}
    >
      {/* Modal Container - matches Bubble design */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#ffffff',
          borderRadius: '5px',
          boxShadow: 'rgba(0, 0, 0, 0.38) 0px 50px 80px 0px',
          width: 'calc(100% - 20px)',
          minWidth: '409px',
          maxWidth: '409px',
          minHeight: '360px',
          maxHeight: '360px',
          overflow: 'auto',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Inner Content Group */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#ffffff',
            borderRadius: '5px',
            padding: '16px',
            width: '377px',
            height: '328px',
            margin: '16px',
          }}
        >
          {/* Title */}
          <div
            style={{
              fontFamily: 'Lato, sans-serif',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#424242',
              textAlign: 'center',
              lineHeight: 1.25,
              marginTop: '10px',
              marginBottom: '20px',
            }}
          >
            Edit your Phone Number
          </div>

          {/* Old Phone Number Label */}
          <div
            style={{
              fontFamily: 'Lato, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              color: '#424242',
              lineHeight: 1.25,
              marginBottom: '10px',
            }}
          >
            Old Phone Number
          </div>

          {/* Old Phone Number Input (disabled) */}
          <input
            type="tel"
            value={currentPhoneNumber || ''}
            disabled
            style={{
              width: '100%',
              height: '60px',
              backgroundColor: '#ffffff',
              borderStyle: 'solid',
              borderWidth: '2px',
              borderColor: '#424242',
              borderRadius: '5px',
              fontFamily: 'inherit',
              fontSize: '20px',
              fontWeight: 400,
              color: '#3d3d3d',
              padding: '0 12px',
              boxSizing: 'border-box',
              marginBottom: '20px',
              opacity: 0.7,
              cursor: 'not-allowed',
            }}
            inputMode="tel"
          />

          {/* New Phone Number Label */}
          <div
            style={{
              fontFamily: 'Lato, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              color: '#424242',
              lineHeight: 1.25,
              marginBottom: '10px',
            }}
          >
            New Phone Number
          </div>

          {/* New Phone Number Input */}
          <input
            type="tel"
            value={newPhoneNumber}
            onChange={(e) => setNewPhoneNumber(e.target.value)}
            placeholder="  Type your new number here"
            style={{
              width: '100%',
              height: '60px',
              backgroundColor: '#ffffff',
              borderStyle: 'solid',
              borderWidth: '2px',
              borderColor: '#424242',
              borderRadius: '5px',
              fontFamily: 'inherit',
              fontSize: '20px',
              fontWeight: 400,
              color: '#3d3d3d',
              padding: '0 12px',
              boxSizing: 'border-box',
              marginBottom: '20px',
            }}
            inputMode="tel"
            autoFocus
          />

          {/* Save Button */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: '#00C851',
                fontFamily: 'inherit',
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#ffffff',
                textAlign: 'center',
                lineHeight: 1,
                borderRadius: '3px',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                width: '156px',
                height: '49px',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Close Button (X icon) */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            width: '20px',
            height: '20px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#31135d',
            fontSize: '18px',
            fontWeight: 'bold',
            padding: 0,
          }}
          aria-label="Close"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
