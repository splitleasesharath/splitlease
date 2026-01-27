/**
 * ContactHostMessaging Component - Modal for contacting listing hosts
 *
 * Design: Option C (Minimal Warmth) with Popup Redesign Protocol + Accessibility Guidelines
 *
 * Supports both authenticated and guest users:
 * - Authenticated users: Uses native messaging (thread + _message tables)
 * - Guest users: Uses guest_inquiry table (collects name/email)
 *
 * NO FALLBACK PRINCIPLE: Real data or nothing.
 *
 * @module ContactHostMessaging
 */

import { useState, useEffect, useRef } from 'react';
import { Send, Zap, Calendar, Coffee, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { formatHostName } from '../../logic/processors/display/formatHostName.js';

// CSS Module styles following Popup Redesign Protocol + Accessibility Guidelines
const styles = {
  // Modal Overlay
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px'
  },

  // Modal Container - Flexbox structure per protocol
  modal: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
    width: '100%',
    maxWidth: '420px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '92vh',
    position: 'relative',
    animation: 'slideUp 0.3s ease'
  },

  // Modal Header
  header: {
    padding: '18px 56px 12px 24px',
    borderBottom: '1px solid #E7E0EC',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexShrink: 0
  },

  // Host Avatar Container
  avatarContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden'
  },

  // Host Avatar with image
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%'
  },

  // Host Avatar fallback (initials)
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6D31C2 0%, #31135D 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    flexShrink: 0
  },

  headerText: {
    flex: 1
  },

  headerTitle: {
    fontSize: '18px',
    fontWeight: '400',
    color: '#1C1B1F',
    margin: 0
  },

  responseHint: {
    fontSize: '13px',
    color: '#5B5FCF',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    marginTop: '2px'
  },

  // Close Button - 48px touch target per accessibility
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s',
    zIndex: 10
  },

  // Listing Bar
  listingBar: {
    padding: '12px 24px',
    background: '#F7F2FA',
    fontSize: '13px',
    color: '#49454F',
    borderBottom: '1px solid #E7E0EC',
    flexShrink: 0
  },

  // Modal Body - scrollable per protocol
  body: {
    padding: '24px',
    overflowY: 'auto',
    flexGrow: 1,
    WebkitOverflowScrolling: 'touch'
  },

  // Form Label
  formLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1C1B1F',
    marginBottom: '8px'
  },

  // Input Field
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #CAC4D0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  },

  inputError: {
    borderColor: '#DC3545'
  },

  inputFocus: {
    borderColor: '#31135D',
    background: '#F7F2FA',
    outline: 'none',
    boxShadow: '0 0 0 4px rgba(109, 49, 194, 0.2)'
  },

  // Textarea
  textarea: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #CAC4D0',
    borderRadius: '8px',
    fontSize: '14px',
    lineHeight: '1.5',
    minHeight: '120px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
  },

  // Character Count
  charCount: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#79747E',
    textAlign: 'right'
  },

  // Quick Questions
  quickQuestions: {
    marginTop: '16px'
  },

  quickLabel: {
    fontSize: '12px',
    color: '#49454F',
    marginBottom: '8px',
    fontWeight: '500'
  },

  quickChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  },

  // Quick Chip - pill-shaped per protocol, 48px touch target
  quickChip: {
    minHeight: '40px',
    padding: '8px 16px',
    background: 'white',
    border: '1px solid #E7E0EC',
    borderRadius: '100px',
    fontSize: '13px',
    color: '#49454F',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s'
  },

  quickChipHover: {
    borderColor: '#31135D',
    color: '#31135D',
    background: '#F7F2FA'
  },

  // Modal Footer - per protocol
  footer: {
    padding: '16px 24px',
    background: '#F7F2FA',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flexShrink: 0
  },

  // Primary Button - per protocol
  btnPrimary: {
    width: '100%',
    padding: '14px 28px',
    background: '#31135D',
    border: 'none',
    borderRadius: '100px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  },

  btnPrimaryHover: {
    background: '#4A2F7C',
    boxShadow: '0 2px 8px rgba(49, 19, 93, 0.3)'
  },

  btnPrimaryDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed'
  },

  footerNote: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#49454F'
  },

  footerLink: {
    color: '#6D31C2',
    textDecoration: 'none',
    fontWeight: '500',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontSize: 'inherit',
    padding: 0
  },

  // Error message
  errorMessage: {
    display: 'block',
    marginTop: '4px',
    fontSize: '13px',
    color: '#DC3545'
  },

  errorBanner: {
    padding: '12px',
    background: '#F7F2FA',
    border: '1px solid #E7E0EC',
    borderRadius: '12px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },

  errorBannerIcon: {
    width: '24px',
    height: '24px',
    background: '#31135D',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },

  errorBannerText: {
    fontSize: '13px',
    color: '#1C1B1F',
    lineHeight: '1.4'
  },

  // Loading spinner
  spinner: {
    width: '48px',
    height: '48px',
    border: '3px solid #E7E0EC',
    borderTopColor: '#31135D',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1rem'
  },

  // Success state
  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: '#5B5FCF',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    margin: '0 auto 1rem'
  },

  // Form group
  formGroup: {
    marginBottom: '16px'
  }
};

// Quick question templates
const QUICK_QUESTIONS = [
  { id: 'availability', icon: Calendar, label: 'Availability', text: 'Is the space available for my dates?' },
  { id: 'amenities', icon: Coffee, label: 'Amenities', text: 'What amenities are included?' },
  { id: 'flexibility', icon: Clock, label: 'Flexibility', text: 'Is there flexibility with the schedule?' }
];

export default function ContactHostMessaging({ isOpen, onClose, listing, onLoginRequired }) {
  const [formData, setFormData] = useState({
    userName: '',
    email: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hoveredChip, setHoveredChip] = useState(null);
  const [btnHovered, setBtnHovered] = useState(false);

  const textareaRef = useRef(null);
  const modalRef = useRef(null);

  // Get host initials for avatar
  const getHostInitials = () => {
    const name = listing?.host?.name || 'Host';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Check authentication on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      checkAuthentication();
      setFormData({ userName: '', email: '', message: '' });
      setErrors({});
      setMessageSent(false);
    }
  }, [isOpen]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && !isCheckingAuth && !messageSent && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen, isCheckingAuth, messageSent]);

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

  // Handle escape key and focus trap for accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }

      // Focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, textarea, input, a[href], [tabindex]:not([tabindex="-1"])'
        );
        const firstFocusable = focusableElements[0];
        const lastFocusable = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Validation - guest users need name/email, all users need message
  const validate = () => {
    const newErrors = {};

    // Guest users need name and email
    if (!isAuthenticated) {
      if (!formData.userName.trim()) {
        newErrors.userName = 'Name is required';
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email';
      }
    }

    // All users need a message
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit message via messages Edge Function (authenticated or guest)
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    // Validate we have the host user ID
    if (!listing.host?.userId) {
      setErrors({
        submit: 'Host information unavailable. Please try again later.'
      });
      setIsSubmitting(false);
      return;
    }

    try {
      // Check current auth state
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Authenticated user: send via native messaging
        console.log('[ContactHostMessaging] Sending authenticated message', {
          recipient_user_id: listing.host?.userId,
          listing_id: listing.id,
          message_body_length: formData.message.length
        });

        const { data, error } = await supabase.functions.invoke('messages', {
          body: {
            action: 'send_message',
            payload: {
              recipient_user_id: listing.host.userId,
              listing_id: listing.id,
              message_body: formData.message.trim(),
              send_welcome_messages: true
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
          is_new_thread: data.data?.is_new_thread,
          welcome_messages_sent: data.data?.welcome_messages_sent
        });
      } else {
        // Guest user: send via guest inquiry
        console.log('[ContactHostMessaging] Sending guest inquiry', {
          sender_name: formData.userName,
          sender_email: formData.email,
          recipient_user_id: listing.host?.userId,
          listing_id: listing.id,
          message_body_length: formData.message.length
        });

        const { data, error } = await supabase.functions.invoke('messages', {
          body: {
            action: 'send_guest_inquiry',
            payload: {
              sender_name: formData.userName.trim(),
              sender_email: formData.email.trim(),
              recipient_user_id: listing.host.userId,
              listing_id: listing.id,
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
          console.error('[ContactHostMessaging] Guest inquiry failed:', data.error);
          setErrors({
            submit: data.error || 'Failed to send message. Please try again.'
          });
          return;
        }

        console.log('[ContactHostMessaging] Guest inquiry sent successfully', {
          inquiry_id: data.data?.inquiry_id
        });
      }

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
    setFormData({ userName: '', email: '', message: '' });
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

  const handleQuickQuestion = (question) => {
    const currentMessage = formData.message.trim();
    const newMessage = currentMessage
      ? `${currentMessage}\n${question.text}`
      : question.text;
    setFormData(prev => ({ ...prev, message: newMessage }));
    if (errors.message) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.message;
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

  const hostName = formatHostName({ fullName: listing?.host?.name || 'Host' });

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          .contact-modal-overlay { align-items: flex-end !important; padding: 0 !important; }
          .contact-modal {
            max-width: 100% !important;
            border-radius: 24px 24px 0 0 !important;
            animation: slideFromBottom 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }
          .contact-modal::before {
            content: '';
            width: 36px;
            height: 4px;
            background: #E7E0EC;
            border-radius: 2px;
            position: absolute;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 30;
          }
          .contact-modal-footer {
            background: white !important;
            border-top: 1px solid #E7E0EC;
            padding: 16px 24px 24px 24px !important;
          }
        }
        @keyframes slideFromBottom {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div
        className="contact-modal-overlay"
        style={styles.overlay}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        onClick={handleClose}
      >
        <div
          ref={modalRef}
          className="contact-modal"
          style={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={styles.header}>
            {listing?.host?.image ? (
              <div style={styles.avatarContainer} aria-hidden="true">
                <img
                  src={listing.host.image}
                  alt=""
                  style={styles.avatarImage}
                  onError={(e) => {
                    // Hide broken image and show fallback
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{ ...styles.avatar, display: 'none', position: 'absolute', top: 0, left: 0 }}>
                  {getHostInitials()}
                </div>
              </div>
            ) : (
              <div style={styles.avatar} aria-hidden="true">
                {getHostInitials()}
              </div>
            )}
            <div style={styles.headerText}>
              <h2 id="contact-modal-title" style={styles.headerTitle}>
                Message {hostName}
              </h2>
              <div style={styles.responseHint}>
                <Zap size={14} aria-hidden="true" />
                <span>Responds within hours</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={styles.closeBtn}
              aria-label="Close modal"
              onMouseEnter={(e) => e.target.style.background = '#F7F2FA'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              {/* Close icon with full defensive sizing per POPUP_REPLICATION_PROTOCOL */}
              <svg
                className="close-icon"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                fill="none"
                stroke="#49454F"
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  minHeight: 32,
                  flexShrink: 0
                }}
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Listing Bar */}
          <div style={styles.listingBar}>
            <span className="sr-only">Regarding listing: </span>
            About: <strong style={{ color: '#1C1B1F' }}>{listing?.title || 'Listing'}</strong>
          </div>

          {/* Loading Auth Check */}
          {isCheckingAuth ? (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={styles.spinner} />
              <p style={{ color: '#49454F', margin: 0 }}>Loading...</p>
            </div>
          ) : messageSent ? (
            /* Success View */
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={styles.successIcon}>✓</div>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1C1B1F',
                marginBottom: '0.5rem'
              }}>
                Message Sent!
              </h3>
              <p style={{ color: '#49454F', fontSize: '1rem' }}>
                {isAuthenticated
                  ? 'Your message has been sent. Check your inbox for the conversation.'
                  : 'Your message has been sent. The host will respond to your email.'}
              </p>
            </div>
          ) : (
            /* Contact Form */
            <>
              <div style={styles.body}>
                {/* Guest user fields */}
                {!isAuthenticated && (
                  <>
                    {/* Name Field */}
                    <div style={styles.formGroup}>
                      <label htmlFor="contact-name" style={styles.formLabel}>
                        Your Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={formData.userName}
                        onChange={(e) => handleInputChange('userName', e.target.value)}
                        placeholder="John Smith"
                        style={{
                          ...styles.input,
                          ...(errors.userName ? styles.inputError : {})
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#31135D';
                          e.target.style.background = '#F7F2FA';
                          e.target.style.boxShadow = '0 0 0 4px rgba(109, 49, 194, 0.2)';
                        }}
                        onBlur={(e) => {
                          if (!errors.userName) {
                            e.target.style.borderColor = '#CAC4D0';
                            e.target.style.background = 'white';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                        aria-invalid={errors.userName ? 'true' : 'false'}
                        aria-describedby={errors.userName ? 'name-error' : undefined}
                      />
                      {errors.userName && (
                        <span id="name-error" style={styles.errorMessage} role="alert">
                          {errors.userName}
                        </span>
                      )}
                    </div>

                    {/* Email Field */}
                    <div style={styles.formGroup}>
                      <label htmlFor="contact-email" style={styles.formLabel}>
                        Your Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="john@example.com"
                        style={{
                          ...styles.input,
                          ...(errors.email ? styles.inputError : {})
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#31135D';
                          e.target.style.background = '#F7F2FA';
                          e.target.style.boxShadow = '0 0 0 4px rgba(109, 49, 194, 0.2)';
                        }}
                        onBlur={(e) => {
                          if (!errors.email) {
                            e.target.style.borderColor = '#CAC4D0';
                            e.target.style.background = 'white';
                            e.target.style.boxShadow = 'none';
                          }
                        }}
                        aria-invalid={errors.email ? 'true' : 'false'}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                      />
                      {errors.email && (
                        <span id="email-error" style={styles.errorMessage} role="alert">
                          {errors.email}
                        </span>
                      )}
                    </div>
                  </>
                )}

                {/* Message Field */}
                <div>
                  <label htmlFor="contact-message" style={styles.formLabel}>
                    {isAuthenticated ? 'Your Message' : 'Message'}
                  </label>
                  <textarea
                    ref={textareaRef}
                    id="contact-message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    placeholder={`Hi ${hostName}! I saw your listing and...`}
                    maxLength={500}
                    style={{
                      ...styles.textarea,
                      ...(errors.message ? styles.inputError : {})
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#31135D';
                      e.target.style.background = '#F7F2FA';
                      e.target.style.boxShadow = '0 0 0 4px rgba(109, 49, 194, 0.2)';
                    }}
                    onBlur={(e) => {
                      if (!errors.message) {
                        e.target.style.borderColor = '#CAC4D0';
                        e.target.style.background = 'white';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                    aria-invalid={errors.message ? 'true' : 'false'}
                    aria-describedby="message-help message-error"
                  />
                  {errors.message && (
                    <span id="message-error" style={styles.errorMessage} role="alert">
                      {errors.message}
                    </span>
                  )}
                  <div id="message-help" style={styles.charCount} aria-live="polite">
                    {formData.message.length} / 500
                  </div>
                </div>

                {/* Quick Questions */}
                <fieldset style={{ ...styles.quickQuestions, border: 'none', padding: 0, margin: 0 }}>
                  <legend style={styles.quickLabel}>Quick questions:</legend>
                  <div style={styles.quickChips} role="group" aria-label="Quick question options">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => handleQuickQuestion(q)}
                        onMouseEnter={() => setHoveredChip(q.id)}
                        onMouseLeave={() => setHoveredChip(null)}
                        style={{
                          ...styles.quickChip,
                          ...(hoveredChip === q.id ? styles.quickChipHover : {})
                        }}
                        aria-label={`Add question: ${q.text}`}
                      >
                        <q.icon size={14} aria-hidden="true" />
                        {q.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* Footer */}
              <div className="contact-modal-footer" style={styles.footer}>
                {/* Submit Error */}
                {errors.submit && (
                  <div style={styles.errorBanner} role="alert">
                    <div style={styles.errorBannerIcon}>
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>!</span>
                    </div>
                    <span style={styles.errorBannerText}>{errors.submit}</span>
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  onMouseEnter={() => !isSubmitting && setBtnHovered(true)}
                  onMouseLeave={() => setBtnHovered(false)}
                  style={{
                    ...styles.btnPrimary,
                    ...(isSubmitting ? styles.btnPrimaryDisabled : {}),
                    ...(btnHovered && !isSubmitting ? styles.btnPrimaryHover : {})
                  }}
                >
                  <Send size={18} aria-hidden="true" />
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>

                {/* Footer Note */}
                <div style={styles.footerNote}>
                  {isAuthenticated ? (
                    <>Signed in · Messages go to your inbox</>
                  ) : (
                    <>
                      Have an account?{' '}
                      <button
                        onClick={handleLoginClick}
                        style={styles.footerLink}
                      >
                        Log in
                      </button>
                      {' '}to track messages
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
