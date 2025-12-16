/**
 * ContactHostMessaging Component - Modal for contacting listing hosts
 *
 * MIGRATED: Now uses native Supabase messages Edge Function instead of bubble-proxy
 * Requires authentication - user must be logged in to contact host
 * Messages are stored directly in Supabase (thread + _message tables)
 *
 * NO FALLBACK PRINCIPLE: Real data or nothing.
 *
 * @module ContactHostMessaging
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';

// Format host name: "John Smith" -> "John S."
function formatHostName(fullName) {
  if (!fullName) return 'Host';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstName} ${lastInitial}.`;
}

export default function ContactHostMessaging({ isOpen, onClose, listing, onLoginRequired }) {
  const [formData, setFormData] = useState({
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      checkAuthentication();
      setFormData({ message: '' });
      setErrors({});
      setMessageSent(false);
    }
  }, [isOpen]);

  const checkAuthentication = async () => {
    setIsCheckingAuth(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    } catch (error) {
      console.error('[ContactHostMessaging] Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setIsCheckingAuth(false);
    }
  };

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

  // Validation - only message field needed (user is authenticated)
  const validate = () => {
    const newErrors = {};

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit message via native messages Edge Function
  const handleSubmit = async () => {
    if (!validate()) return;

    // Check authentication before submitting
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setErrors({
        submit: 'Please log in to contact the host.'
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    console.log('[ContactHostMessaging] Sending message via messages Edge Function', {
      recipient_user_id: listing.host?.userId,
      listing_id: listing.id,
      message_body_length: formData.message.length
    });

    try {
      // Validate we have the host user ID
      if (!listing.host?.userId) {
        throw new Error('Host information unavailable. Please try again later.');
      }

      // Send message via native messages Edge Function
      const { data, error } = await supabase.functions.invoke('messages', {
        body: {
          action: 'send_message',
          payload: {
            recipient_user_id: listing.host.userId,  // Host's user._id
            listing_id: listing.id,                   // Listing association
            message_body: formData.message.trim()
          }
        }
      });

      if (error) {
        console.error('[ContactHostMessaging] Edge Function error:', error);
        setErrors({
          submit: error.message || 'Failed to send message. Please try again.'
        });
        return;
      }

      if (!data.success) {
        console.error('[ContactHostMessaging] Message send failed:', data.error);
        setErrors({
          submit: data.error || 'Failed to send message. Please try again.'
        });
        return;
      }

      console.log('[ContactHostMessaging] Message sent successfully', {
        thread_id: data.data?.thread_id,
        message_id: data.data?.message_id,
        is_new_thread: data.data?.is_new_thread
      });
      setMessageSent(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('[ContactHostMessaging] Exception sending message:', error);
      setErrors({
        submit: error.message || 'Network error. Please check your connection and try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({ message: '' });
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

  const handleLoginClick = () => {
    handleClose();
    if (onLoginRequired) {
      onLoginRequired();
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
              Message {formatHostName(listing.host?.name)}
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

        {/* Loading Auth Check */}
        {isCheckingAuth ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#5B21B6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <p style={{ color: '#6b7280', margin: 0 }}>Checking authentication...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : !isAuthenticated ? (
          /* Login Required View */
          <div style={{
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#f3f4f6',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              margin: '0 auto 1rem'
            }}>
              🔒
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1a202c',
              marginBottom: '0.5rem'
            }}>
              Login Required
            </h3>
            <p style={{
              color: '#6b7280',
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
              lineHeight: 1.5
            }}>
              Please log in to send a message to {formatHostName(listing.host?.name)}.
              Your message will appear in your inbox once sent.
            </p>
            <button
              onClick={handleLoginClick}
              style={{
                padding: '0.75rem 2rem',
                background: '#5B21B6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#4c1d95';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#5B21B6';
              }}
            >
              Log In to Continue
            </button>
          </div>
        ) : messageSent ? (
          /* Success View */
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
              Your message has been sent to the host. You can view the conversation in your inbox.
            </p>
          </div>
        ) : (
          /* Contact Form - Simplified (only message field needed) */
          <div style={{ padding: '1.5rem' }}>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1.5rem',
              marginTop: 0
            }}>
              Regarding: <strong>{listing.title}</strong>
            </p>

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
