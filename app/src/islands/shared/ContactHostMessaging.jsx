/**
 * ContactHostMessaging Component - Modal for contacting listing hosts
 *
 * Allows users to send messages to property hosts via email or Supabase.
 * Follows NO FALLBACK principle - real data or nothing.
 *
 * @module ContactHostMessaging
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { BUBBLE_MESSAGING_ENDPOINT } from '../../lib/constants.js';

// Access Bubble API key from environment variables
const BUBBLE_API_KEY = import.meta.env.VITE_BUBBLE_API_KEY;

export default function ContactHostMessaging({ isOpen, onClose, listing, userEmail }) {
  const [formData, setFormData] = useState({
    userName: '',
    email: userEmail || '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        userName: '',
        email: userEmail || '',
        message: ''
      });
      setErrors({});
      setMessageSent(false);
    }
  }, [isOpen, userEmail]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Validation
  const validate = () => {
    const newErrors = {};

    if (!formData.userName.trim()) {
      newErrors.userName = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit message
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      // Send message via Bubble API
      const response = await fetch(BUBBLE_MESSAGING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BUBBLE_API_KEY}`
        },
        body: JSON.stringify({
          listing_id: listing.id,
          host_id: listing.host?._id || null,
          sender_name: formData.userName,
          sender_email: formData.email,
          message: formData.message,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        setMessageSent(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrors({
          submit: errorData.message || 'Failed to send message. Please try again.'
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setErrors({
        submit: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ userName: '', email: userEmail || '', message: '' });
    setErrors({});
    setMessageSent(false);
    onClose();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>💬</span>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1a202c',
              margin: 0
            }}>
              Message {listing.host?.name || 'Host'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.5rem',
              color: '#6b7280',
              padding: '0.25rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Success View */}
        {messageSent ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#10b981',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              margin: '0 auto 1rem'
            }}>
              ✓
            </div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1a202c',
              marginBottom: '0.5rem'
            }}>
              Message Sent!
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '1rem'
            }}>
              Your message has been sent to the host.
            </p>
          </div>
        ) : (
          /* Contact Form */
          <div style={{ padding: '1.5rem' }}>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1.5rem',
              marginTop: 0
            }}>
              Regarding: <strong>{listing.title}</strong>
            </p>

            {/* Name Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Your Name
              </label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => handleInputChange('userName', e.target.value)}
                placeholder="Enter your name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.userName ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!errors.userName) {
                    e.target.style.borderColor = '#5B21B6';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.userName) {
                    e.target.style.borderColor = '#d1d5db';
                  }
                }}
              />
              {errors.userName && (
                <span style={{
                  display: 'block',
                  marginTop: '0.25rem',
                  fontSize: '0.813rem',
                  color: '#ef4444'
                }}>
                  {errors.userName}
                </span>
              )}
            </div>

            {/* Email Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.email ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!errors.email) {
                    e.target.style.borderColor = '#5B21B6';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.email) {
                    e.target.style.borderColor = '#d1d5db';
                  }
                }}
              />
              {errors.email && (
                <span style={{
                  display: 'block',
                  marginTop: '0.25rem',
                  fontSize: '0.813rem',
                  color: '#ef4444'
                }}>
                  {errors.email}
                </span>
              )}
            </div>

            {/* Message Field */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Your message to the host..."
                rows={5}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.message ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!errors.message) {
                    e.target.style.borderColor = '#5B21B6';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.message) {
                    e.target.style.borderColor = '#d1d5db';
                  }
                }}
              />
              {errors.message && (
                <span style={{
                  display: 'block',
                  marginTop: '0.25rem',
                  fontSize: '0.813rem',
                  color: '#ef4444'
                }}>
                  {errors.message}
                </span>
              )}
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#9ca3af',
                textAlign: 'right'
              }}>
                {formData.message.length} characters
              </div>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div style={{
                padding: '0.75rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                {errors.submit}
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.875rem',
                background: isSubmitting ? '#9ca3af' : '#5B21B6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.target.style.background = '#4c1d95';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.target.style.background = '#5B21B6';
                }
              }}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
