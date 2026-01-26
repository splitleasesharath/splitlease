import { useState, useEffect, useCallback, useRef } from 'react';
import Lottie from 'lottie-react';
import { signupUser } from '../../../lib/auth.js';
import Toast, { useToast } from '../Toast.jsx';

/**
 * AiSignupMarketReport - Advanced AI-powered market research signup modal
 *
 * Features:
 * - Smart email/phone/name extraction from freeform text
 * - Auto-correction for common email typos
 * - Incomplete phone number handling
 * - Automatic user account creation with generated password (SL{name}77)
 * - Three Lottie animations (parsing, loading, success)
 * - Dynamic form flow based on data quality
 * - Integrated with Bubble.io workflow
 *
 * Props:
 * - isOpen: boolean - Whether the modal is open
 * - onClose: function - Callback when modal is closed
 * - onSubmit: function (optional) - Custom submit handler
 */

// ============ UTILITY FUNCTIONS ============

/**
 * Extract a name from freeform text
 * Looks for common patterns like "I'm [Name]", "My name is [Name]", "I am [Name]"
 * Also extracts from email local part (before @) as fallback
 *
 * @param {string} text - The freeform text to extract name from
 * @param {string} email - Optional email to use as fallback for name extraction
 * @returns {string|null} - Extracted name or null if not found
 */
function extractName(text, email = null) {
  if (!text) return null;

  // Patterns to look for name introduction
  const namePatterns = [
    /(?:I'm|I am|my name is|this is|hi,? i'm|hello,? i'm|hey,? i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:name:?\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:^|\s)([A-Z][a-z]+)\s+(?:here|speaking|writing)/i,
    /(?:send to|contact|reach)\s+(?:me at|at|:)?\s*([A-Z][a-z]+)/i,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Clean up and return the first name only
      const fullName = match[1].trim();
      const firstName = fullName.split(/\s+/)[0];
      return firstName;
    }
  }

  // Fallback: try to extract name from email local part
  if (email) {
    const localPart = email.split('@')[0];
    if (localPart) {
      // Remove common suffixes like numbers
      const nameFromEmail = localPart
        .replace(/[0-9]+$/, '')     // Remove trailing numbers
        .replace(/[._-]/g, ' ')      // Replace separators with spaces
        .split(/\s+/)[0];            // Take first part

      // Capitalize first letter
      if (nameFromEmail && nameFromEmail.length > 1) {
        return nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1).toLowerCase();
      }
    }
  }

  return null;
}

/**
 * Generate a password in the format SL{Name}77
 *
 * @param {string} name - The name to include in the password
 * @returns {string} - Generated password
 */
function generatePassword(name) {
  // Default to "User" if no name is provided
  const safeName = name ? name.trim() : 'User';
  // Capitalize first letter, lowercase rest for consistency
  const formattedName = safeName.charAt(0).toUpperCase() + safeName.slice(1).toLowerCase();
  return `SL${formattedName}77`;
}

function extractEmail(text) {
  if (!text) return null;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+[.,][a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}

function extractPhone(text) {
  if (!text) return null;

  // Only extract phone numbers that match standard US phone formats
  // or are explicitly mentioned as phone numbers
  // This avoids catching budget numbers like "$1500" or "1500"

  // Standard US phone formats (10 digits with various separators)
  const standardPhonePatterns = [
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,              // (123) 456-7890, 123-456-7890, 123.456.7890
    /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/, // +1 (123) 456-7890
  ];

  for (const pattern of standardPhonePatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }

  // Look for numbers explicitly mentioned as phone numbers
  // e.g., "my phone is 5551234567", "call me at 555-123-4567", "phone: 5551234567"
  const explicitPhonePatterns = [
    /(?:phone|call|text|reach|contact|cell|mobile)[:\s]+(?:me\s+)?(?:at\s+)?(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,11})/i,
    /(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\d{10,11})(?:\s+(?:is my|my)\s+(?:phone|cell|mobile|number))/i,
  ];

  for (const pattern of explicitPhonePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Match 10-11 digit sequences only (standard US phone number length)
  // This catches cases like "5551234567" but NOT "1500" (a budget)
  const tenDigitMatch = text.match(/\b(\d{10,11})\b/);
  if (tenDigitMatch) {
    return tenDigitMatch[1];
  }

  return null;
}

function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

function validatePhone(phone) {
  if (!phone) return true;
  const phoneRegex = /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/;
  return phoneRegex.test(phone);
}

function checkEmailCertainty(email) {
  if (!email) return 'uncertain';

  const commonDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
    'icloud.com', 'aol.com', 'mail.com', 'protonmail.com'
  ];

  const commonTypos = [
    'gmial.com', 'gmai.com', 'yahooo.com', 'yaho.com',
    'hotmial.com', 'outlok.com', 'icoud.com'
  ];

  const domain = email.split('@')[1]?.toLowerCase();

  if (commonTypos.includes(domain)) return 'uncertain';
  if (domain && domain.length < 5) return 'uncertain';
  if (!domain?.includes('.')) return 'uncertain';
  if (email.includes('..') || email.includes('@.')) return 'uncertain';
  if (commonDomains.includes(domain)) return 'certain';
  if (validateEmail(email)) return 'certain';

  return 'uncertain';
}

function autoCorrectEmail(email) {
  if (!email) return email;

  const typoMap = {
    'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com',
    'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com',
    'gmail,com': 'gmail.com', 'yahooo.com': 'yahoo.com',
    'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com',
    'yahoo,com': 'yahoo.com', 'hotmial.com': 'hotmail.com',
    'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
    'hotmail,com': 'hotmail.com', 'outlok.com': 'outlook.com',
    'outlook.co': 'outlook.com', 'outlook,com': 'outlook.com',
    'icoud.com': 'icloud.com', 'iclod.com': 'icloud.com',
    'icloud.co': 'icloud.com', 'icloud,com': 'icloud.com',
  };

  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  const domainLower = domain.toLowerCase();
  const fixedDomain = domainLower.replace(',', '.');
  const correctedDomain = typoMap[fixedDomain] || fixedDomain;

  return `${localPart}@${correctedDomain}`;
}

// ============ COMMUNICATION FUNCTIONS ============

/**
 * Send welcome email to new user (Step 7 from Bubble workflow)
 * Uses the send-email Edge Function with template placeholders
 *
 * Email contains:
 * - Welcome message
 * - Login credentials (email + temporary password)
 * - Magic link button for one-click login
 *
 * IMPORTANT: Uses fetch with keepalive:true to survive page reload/navigation
 * while still allowing Authorization headers (unlike sendBeacon)
 *
 * @param {Object} data - Email data
 * @param {string} data.email - User's email
 * @param {string} data.password - Generated password (SL{Name}77)
 * @param {string} data.magicLink - Magic login link URL
 * @returns {{success: boolean}}
 */
function sendWelcomeEmail(data) {
  console.log('[AiSignupMarketReport] Sending welcome email to:', data.email);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qcfifybkaddcoimjroca.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;

  // Build the email body HTML (matches Bubble's CORE-Send Basic Email format)
  // Uses <br> tags for line breaks as expected by the Basic template
  const emailBodyHtml = `Hey <br> <br> You have a new split lease account<br> <br> Sign in using your: <br> email: ${data.email}<br> temporary password: ${data.password} <br> <br> We recommend you change your password to something private. <br> <br> You can reach out to Robert if you have any questions at robert@leasesplit.com or via text at 9376737470.`;

  // Build button HTML for the template
  const buttonHtml = `<a href="${data.magicLink || 'https://splitlease.com/login'}" style="background-color: #291D54; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to your Account</a>`;

  // Use fetch with keepalive:true - survives page unload AND supports headers
  // Unlike sendBeacon, this allows us to include the Authorization header
  fetch(edgeFunctionUrl, {
    method: 'POST',
    keepalive: true, // Critical: keeps request alive during page navigation
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action: 'send',
      payload: {
        // Basic template - flexible for welcome emails
        // From: reference_table.zat_email_html_template_eg_sendbasicemailwf_
        template_id: '1560447575939x331870423481483500',
        to_email: data.email,
        from_email: 'tech@leasesplit.com',
        from_name: 'Split Lease Signup',
        subject: 'New Split Lease Account!',
        variables: {
          // All 13 placeholders expected by the Basic template ($$variable$$ format)
          'to': data.email,
          'from email': 'tech@leasesplit.com',
          'from name': ', "name": "Split Lease Signup"',
          'subject': 'New Split Lease Account!',
          'header': 'Welcome to Split Lease!',
          'body text': emailBodyHtml,
          'button': buttonHtml,
          'year': new Date().getFullYear().toString(),
          'logo url': 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1599068082301x985428647498498600/SL%20Logo.png',
          'cc': '',
          'bcc': '',
          'reply_to': '',
          'attachment': '',
        },
        bcc_emails: [
          'splitleaseteam@gmail.com',
          'acquisition-aaaachs52tzodgc5t3o2oeipli@splitlease.slack.com'
        ]
      }
    }),
  }).then(response => {
    if (response.ok) {
      console.log('[AiSignupMarketReport] ✅ Welcome email sent successfully');
    } else {
      console.error('[AiSignupMarketReport] ⚠️ Welcome email failed:', response.status);
    }
  }).catch(error => {
    console.error('[AiSignupMarketReport] ⚠️ Welcome email error:', error.message);
  });

  console.log('[AiSignupMarketReport] ✅ Welcome email request initiated (keepalive)');
  return { success: true };
}

/**
 * Send internal notification email to customer-acquisition team (Step 5 from Bubble)
 * Alerts the team about new AI signups with user details
 *
 * IMPORTANT: Uses fetch with keepalive:true to survive page reload/navigation
 * while still allowing Authorization headers (unlike sendBeacon)
 *
 * @param {Object} data - Notification data
 * @param {string} data.email - User's email
 * @param {string} data.phone - User's phone (if provided)
 * @param {string} data.name - Extracted name
 * @param {string} data.password - Generated password
 * @param {string} data.freeformText - Original freeform input
 * @returns {{success: boolean}}
 */
function sendInternalNotificationEmail(data) {
  console.log('[AiSignupMarketReport] Sending internal notification email');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qcfifybkaddcoimjroca.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;

  // Build plain text body for internal notification
  const emailBody = `Name: ${data.name || 'Not extracted'}
Email: ${data.email}
Phone number: ${data.phone || 'Not provided'}
Their temporary password is: ${data.password}

----
free form text inputted: ${data.freeformText}`;

  // Convert to HTML with line breaks preserved
  const emailBodyHtml = emailBody.replace(/\n/g, '<br>');

  // Use fetch with keepalive:true - survives page unload AND supports headers
  fetch(edgeFunctionUrl, {
    method: 'POST',
    keepalive: true, // Critical: keeps request alive during page navigation
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action: 'send',
      payload: {
        // Basic template - flexible for internal notifications
        // From: reference_table.zat_email_html_template_eg_sendbasicemailwf_
        template_id: '1560447575939x331870423481483500',
        // Slack channel email for #customer-acquisition
        to_email: 'acquisition-aaaachs52tzodgc5t3o2oeipli@splitlease.slack.com',
        from_email: 'noreply@splitlease.com',
        from_name: 'Guest AI Signup',
        subject: `${data.name || 'New User'}, ${data.email}, SIGNED UP thru AI signup feature`,
        variables: {
          // All 13 placeholders expected by the Basic template
          'to': 'acquisition-aaaachs52tzodgc5t3o2oeipli@splitlease.slack.com',
          'from email': 'noreply@splitlease.com',
          'from name': ', "name": "Guest AI Signup"',
          'subject': `${data.name || 'New User'}, ${data.email}, SIGNED UP thru AI signup feature`,
          'header': 'New AI Signup',
          'body text': emailBodyHtml,
          'button': '', // No button for internal notification
          'year': new Date().getFullYear().toString(),
          'logo url': 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1599068082301x985428647498498600/SL%20Logo.png',
          'cc': '',
          'bcc': '',
          'reply_to': '',
          'attachment': '',
        },
      }
    }),
  }).then(response => {
    if (response.ok) {
      console.log('[AiSignupMarketReport] ✅ Internal notification sent successfully');
    } else {
      console.error('[AiSignupMarketReport] ⚠️ Internal notification failed:', response.status);
    }
  }).catch(error => {
    console.error('[AiSignupMarketReport] ⚠️ Internal notification error:', error.message);
  });

  console.log('[AiSignupMarketReport] ✅ Internal notification request initiated (keepalive)');
  return { success: true };
}

/**
 * Send welcome SMS to new user (Steps 8/9 from Bubble workflow)
 * Contains login credentials and magic link
 *
 * Uses the public Split Lease SMS number which doesn't require auth
 * IMPORTANT: Uses fetch with keepalive:true to survive page reload/navigation
 * while still allowing Authorization headers (unlike sendBeacon)
 *
 * @param {Object} data - SMS data
 * @param {string} data.phone - User's phone number
 * @param {string} data.email - User's email
 * @param {string} data.password - Generated password
 * @param {string} data.magicLink - Magic login link URL
 * @returns {{success: boolean, skipped?: boolean}}
 */
function sendWelcomeSms(data) {
  if (!data.phone) {
    console.log('[AiSignupMarketReport] No phone number provided, skipping SMS');
    return { success: true, skipped: true };
  }

  console.log('[AiSignupMarketReport] Sending welcome SMS to:', data.phone);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qcfifybkaddcoimjroca.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-sms`;

  // Format phone to E.164 (add +1 if needed)
  let formattedPhone = data.phone.replace(/\D/g, ''); // Remove non-digits
  if (formattedPhone.length === 10) {
    formattedPhone = `+1${formattedPhone}`;
  } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
    formattedPhone = `+${formattedPhone}`;
  } else if (!formattedPhone.startsWith('+')) {
    formattedPhone = `+${formattedPhone}`;
  }

  const smsBody = `You have a new split lease account. Sign in with your email: ${data.email}. Your temporary password: ${data.password}. Click this link to proceed: ${data.magicLink || 'https://splitlease.com/login'}`;

  // Use fetch with keepalive:true - survives page unload AND supports headers
  fetch(edgeFunctionUrl, {
    method: 'POST',
    keepalive: true, // Critical: keeps request alive during page navigation
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      action: 'send',
      payload: {
        to: formattedPhone,
        from: '+14155692985', // Public Split Lease SMS number (no auth required)
        body: smsBody
      }
    }),
  }).then(response => {
    if (response.ok) {
      console.log('[AiSignupMarketReport] ✅ Welcome SMS sent successfully');
    } else {
      console.error('[AiSignupMarketReport] ⚠️ Welcome SMS failed:', response.status);
    }
  }).catch(error => {
    console.error('[AiSignupMarketReport] ⚠️ Welcome SMS error:', error.message);
  });

  console.log('[AiSignupMarketReport] ✅ Welcome SMS request initiated (keepalive)');
  return { success: true };
}

/**
 * Send all welcome communications after successful signup
 * This orchestrates: magic link generation → email → SMS → internal notification
 *
 * IMPORTANT: Uses fetch with keepalive:true for email/SMS to survive page reload
 * while still allowing Authorization headers (required by Edge Functions).
 * Magic link generation is attempted first, but communications are sent
 * regardless (with fallback login URL if magic link fails).
 *
 * @param {Object} data - Communication data
 * @param {string} data.email - User's email
 * @param {string} data.phone - User's phone (optional)
 * @param {string} data.name - Extracted name
 * @param {string} data.password - Generated password (SL{Name}77)
 * @param {string} data.freeformText - Original freeform text
 */
function sendWelcomeCommunications(data) {
  console.log('[AiSignupMarketReport] ========== SENDING WELCOME COMMUNICATIONS ==========');
  console.log('[AiSignupMarketReport] Email:', data.email);
  console.log('[AiSignupMarketReport] Phone:', data.phone || 'Not provided');
  console.log('[AiSignupMarketReport] Name:', data.name || 'Not extracted');

  // CRITICAL: Send communications IMMEDIATELY with fallback URL
  // DO NOT await magic link - page reloads at 4 seconds and async awaits won't complete
  // The fetch({ keepalive: true }) survives page reload, but only if initiated!
  const fallbackLoginUrl = 'https://splitlease.com/login';

  console.log('[AiSignupMarketReport] 🚀 Firing communications IMMEDIATELY (no await)');

  // Welcome email to user (Step 7) - FIRE IMMEDIATELY
  sendWelcomeEmail({
    email: data.email,
    password: data.password,
    magicLink: fallbackLoginUrl // Use login URL - user has password
  });

  // Welcome SMS to user (Steps 8/9) - only if phone provided - FIRE IMMEDIATELY
  if (data.phone) {
    sendWelcomeSms({
      phone: data.phone,
      email: data.email,
      password: data.password,
      magicLink: fallbackLoginUrl
    });
  }

  // Internal notification to team (Step 5) - FIRE IMMEDIATELY
  sendInternalNotificationEmail({
    email: data.email,
    phone: data.phone,
    name: data.name,
    password: data.password,
    freeformText: data.freeformText
  });

  console.log('[AiSignupMarketReport] ✅ All welcome communications initiated (keepalive fetch)');
}

// ============ PROFILE PARSING FUNCTIONS ============

/**
 * Queue AI profile parsing via Supabase Edge Function
 * This is non-blocking - user doesn't wait for GPT-4 to finish
 *
 * @param {Object} data - Data for queuing
 * @param {string} data.user_id - User ID to parse
 * @param {string} data.email - User email
 * @param {string} data.freeform_text - Freeform text to parse
 * @returns {Promise<Object>} - Queue result with job ID
 */
async function queueProfileParsing(data) {
  console.log('[AiSignupMarketReport] Queuing profile parsing (async)...');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qcfifybkaddcoimjroca.supabase.co';
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/ai-parse-profile`;

  try {
    // Use queue_and_process to both queue AND process in one call
    // This ensures GPT-4 parsing actually happens (not just queued forever)
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'queue_and_process',
        payload: {
          user_id: data.user_id,
          email: data.email,
          freeform_text: data.freeform_text,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AiSignupMarketReport] Queue error:', errorText);
      // Non-fatal - don't throw, just log
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log('[AiSignupMarketReport] ✅ Profile parsing queued successfully');
    console.log('[AiSignupMarketReport] Job ID:', result.data?.jobId);
    return result;
  } catch (error) {
    console.warn('[AiSignupMarketReport] ⚠️ Queue error (non-fatal):', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Submit AI signup via Supabase Edge Function (GUEST endpoint)
 * Also creates a user account with generated password
 *
 * ✅ MIGRATED: No more hardcoded API key!
 * ✅ UNAUTHENTICATED: Works for guest users without login
 * ✅ NEW: Creates user account with password format SL{Name}77
 * ✅ ASYNC QUEUE: Profile parsing happens in background (non-blocking)
 * API key is now stored server-side in Supabase Secrets
 *
 * @param {Object} data - Signup data
 * @param {string} data.email - User email
 * @param {string} data.phone - User phone (optional)
 * @param {string} data.marketResearchText - The market research description
 * @param {string} data.name - Extracted name for account creation
 * @returns {Promise<Object>} - Result with success status and data
 */
async function submitSignup(data) {
  // Validate required fields
  if (!data.email) {
    console.error('[AiSignupMarketReport] ❌ Error: Missing email');
    throw new Error('Email is required');
  }

  if (!data.marketResearchText) {
    console.error('[AiSignupMarketReport] ❌ Error: Missing market research text');
    throw new Error('Market research description is required');
  }

  // Extract name from text or email for password generation
  const extractedName = data.name || extractName(data.marketResearchText, data.email);
  const generatedPassword = generatePassword(extractedName);

  console.log('[AiSignupMarketReport] ========== SIGNUP REQUEST ==========');
  console.log('[AiSignupMarketReport] Email:', data.email);
  console.log('[AiSignupMarketReport] Phone:', data.phone || 'Not provided');
  console.log('[AiSignupMarketReport] Extracted Name:', extractedName || 'Not found (using default)');
  console.log('[AiSignupMarketReport] Generated Password:', generatedPassword);
  console.log('[AiSignupMarketReport] Text length:', data.marketResearchText.length);
  console.log('[AiSignupMarketReport] ================================================================');

  // ========== STEP 1: Create User Account ==========
  console.log('[AiSignupMarketReport] Step 1: Creating user account...');

  let signupResult = null;
  let emailAlreadyExists = false;

  try {
    signupResult = await signupUser(
      data.email,
      generatedPassword,
      generatedPassword, // retype (same as password)
      {
        firstName: extractedName || 'Guest',
        lastName: '', // Not available from freeform text
        userType: 'Guest',
        phoneNumber: data.phone || ''
      }
    );

    if (signupResult.success) {
      console.log('[AiSignupMarketReport] ✅ User account created successfully');
      console.log('[AiSignupMarketReport] User ID:', signupResult.user_id);
    } else {
      // Check if the error is because email already exists
      if (signupResult.error?.includes('already in use') ||
          signupResult.error?.includes('already registered') ||
          signupResult.error?.includes('USED_EMAIL')) {
        console.log('[AiSignupMarketReport] ℹ️ User already exists - need to login first');
        emailAlreadyExists = true;
        // Return special flag for email already exists
        return {
          success: false,
          emailAlreadyExists: true,
          email: data.email,
          marketResearchText: data.marketResearchText,
          error: 'An account with this email already exists. Please log in to continue.',
        };
      } else {
        console.warn('[AiSignupMarketReport] ⚠️ Account creation failed:', signupResult.error);
        throw new Error(signupResult.error || 'Account creation failed');
      }
    }
  } catch (signupError) {
    // Check for email exists error from exception
    if (signupError.message?.includes('already in use') ||
        signupError.message?.includes('already registered') ||
        signupError.message?.includes('USED_EMAIL')) {
      console.log('[AiSignupMarketReport] ℹ️ User already exists (from exception) - need to login first');
      return {
        success: false,
        emailAlreadyExists: true,
        email: data.email,
        marketResearchText: data.marketResearchText,
        error: 'An account with this email already exists. Please log in to continue.',
      };
    }
    console.error('[AiSignupMarketReport] ⚠️ Account creation error:', signupError.message);
    throw signupError;
  }

  // ========== STEP 2: Submit Market Research (save freeform text) ==========
  console.log('[AiSignupMarketReport] Step 2: Submitting market research...');

  // Get Supabase URL from environment
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qcfifybkaddcoimjroca.supabase.co';
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/ai-signup-guest`;

  console.log('[AiSignupMarketReport] Edge Function URL:', edgeFunctionUrl);

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: data.email,
        phone: data.phone || '',
        text_inputted: data.marketResearchText,
      }),
    });

    console.log('[AiSignupMarketReport] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AiSignupMarketReport] ========== ERROR RESPONSE ==========');
      console.error('[AiSignupMarketReport] Status:', response.status);
      console.error('[AiSignupMarketReport] Response Body:', errorText);
      console.error('[AiSignupMarketReport] ===========================================');

      let errorMessage = 'Failed to submit signup';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[AiSignupMarketReport] ========== SUCCESS ==========');
    console.log('[AiSignupMarketReport] Market research submitted successfully');
    console.log('[AiSignupMarketReport] Result:', JSON.stringify(result, null, 2));
    console.log('[AiSignupMarketReport] ================================');

    // ========== STEP 3: Queue Profile Parsing (ASYNC - Non-blocking) ==========
    // User doesn't wait for GPT-4 - it happens in background
    console.log('[AiSignupMarketReport] Step 3: Queuing profile parsing (async)...');

    const userId = signupResult?.user_id || result.data?._id;
    if (userId) {
      // Queue the parsing job - this returns immediately
      queueProfileParsing({
        user_id: userId,
        email: data.email,
        freeform_text: data.marketResearchText,
      }).then(queueResult => {
        if (queueResult?.success) {
          console.log('[AiSignupMarketReport] ✅ Parsing job queued:', queueResult.data?.jobId);
        } else {
          console.warn('[AiSignupMarketReport] ⚠️ Failed to queue parsing (non-fatal)');
        }
      }).catch(err => {
        console.warn('[AiSignupMarketReport] ⚠️ Queue error (non-fatal):', err.message);
      });
    } else {
      console.warn('[AiSignupMarketReport] ⚠️ No user ID for queuing profile parsing');
    }

    // ========== STEP 4: Send Welcome Communications (SYNCHRONOUS - Fire Immediately) ==========
    // CRITICAL: This MUST be synchronous - page reloads at 4 seconds
    // fetch({ keepalive: true }) only survives if the fetch is INITIATED before reload
    console.log('[AiSignupMarketReport] Step 4: Sending welcome communications (synchronous)...');

    // Fire immediately - all fetch calls use keepalive:true to survive page reload
    sendWelcomeCommunications({
      email: data.email,
      phone: data.phone,
      name: extractedName,
      password: generatedPassword,
      freeformText: data.marketResearchText,
    });
    console.log('[AiSignupMarketReport] ✅ Welcome communications fired (fetch requests initiated)');

    return {
      success: true,
      data: result.data,
      generatedPassword: generatedPassword, // Include for reference (will be sent via email)
      extractedName: extractedName,
      isAsync: true, // Flag indicating parsing is happening in background
    };
  } catch (error) {
    console.error('[AiSignupMarketReport] ========== EXCEPTION ==========');
    console.error('[AiSignupMarketReport] Error:', error);
    console.error('[AiSignupMarketReport] Error message:', error.message);
    console.error('[AiSignupMarketReport] ==================================');
    throw error;
  }
}

/**
 * Parse user profile using AI (GPT-4)
 * Calls the bubble-proxy edge function with parse_profile action
 *
 * This extracts structured data from freeform text:
 * - Biography, Special Needs, Need for Space, Reasons to Host
 * - Credit Score, Name, Transportation
 * - Preferred boroughs, neighborhoods, days, weekly schedule
 *
 * Also auto-favorites listings that match user preferences
 *
 * @param {Object} data - Data for parsing
 * @param {string} data.user_id - User ID to update
 * @param {string} data.email - User email
 * @param {string} data.text_inputted - Freeform text to parse
 * @returns {Promise<Object>} - Parsing result with extracted data
 */
async function parseProfileWithAI(data) {
  if (!data.user_id) {
    console.warn('[AiSignupMarketReport] Skipping profile parsing - no user_id');
    return null;
  }

  if (!data.text_inputted) {
    console.warn('[AiSignupMarketReport] Skipping profile parsing - no text_inputted');
    return null;
  }

  console.log('[AiSignupMarketReport] ========== PARSE PROFILE REQUEST ==========');
  console.log('[AiSignupMarketReport] User ID:', data.user_id);
  console.log('[AiSignupMarketReport] Email:', data.email);
  console.log('[AiSignupMarketReport] Text length:', data.text_inputted.length);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qcfifybkaddcoimjroca.supabase.co';
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/bubble-proxy`;

  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'parse_profile',
        payload: {
          user_id: data.user_id,
          email: data.email,
          text_inputted: data.text_inputted,
        },
      }),
    });

    console.log('[AiSignupMarketReport] Parse response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AiSignupMarketReport] Parse error response:', errorText);
      throw new Error(`Failed to parse profile: ${response.status}`);
    }

    const result = await response.json();
    console.log('[AiSignupMarketReport] Parse result:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('[AiSignupMarketReport] Parse profile error:', error);
    throw error;
  }
}

// ============ LOTTIE ANIMATION COMPONENT ============

function LottieAnimation({ src, loop = true, autoplay = true, className = '' }) {
  const [animationData, setAnimationData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadAnimationData = async () => {
      try {
        console.log('[LottieAnimation] Loading animation from:', src);
        const response = await fetch(src);

        // Check if this is a .lottie file (dotLottie format) which is a ZIP container
        if (src.endsWith('.lottie')) {
          console.warn('[LottieAnimation] .lottie format detected - this needs special handling');
          // For now, skip .lottie files - they need @lottiefiles/dotlottie-react
          if (isMounted) {
            setError('Unsupported .lottie format');
          }
          return;
        }

        const data = await response.json();
        console.log('[LottieAnimation] Animation loaded successfully');

        if (isMounted) {
          setAnimationData(data);
        }
      } catch (error) {
        console.error('[LottieAnimation] Failed to load Lottie animation:', error);
        console.error('[LottieAnimation] URL:', src);
        if (isMounted) {
          setError(error.message);
        }
      }
    };

    loadAnimationData();

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (error) {
    console.warn('[LottieAnimation] Rendering placeholder due to error:', error);
    return <div className={className} style={{ minHeight: '200px' }} />;
  }

  if (!animationData) {
    return <div className={className} style={{ minHeight: '200px' }} />;
  }

  return (
    <Lottie
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={className}
    />
  );
}

// ============ SUB-COMPONENTS ============

const PARSING_LOTTIE_URL = 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1722533720265x199451206376484160/Animation%20-%201722533570126.json';
// Use a JSON lottie instead of .lottie format (which requires special handling)
const LOADING_LOTTIE_URL = 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1722533720265x199451206376484160/Animation%20-%201722533570126.json';
const SUCCESS_LOTTIE_URL = 'https://50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io/f1745939792891x394981453861459140/Report.json';

// Topic definitions for freeform input detection
const FREEFORM_TOPICS = [
  {
    id: 'schedule',
    label: 'Schedule',
    patterns: [
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/i,
      /\b(weekday|weekend|weekly|daily|monthly)s?\b/i,
      /\b(morning|afternoon|evening|night)s?\b/i,
      /\b(schedule|timing|hours?|days?|time|weeks?)\b/i,
      /\b(\d+\s*(am|pm|days?|weeks?|months?))\b/i,
    ],
  },
  {
    id: 'patterns',
    label: 'Patterns',
    patterns: [
      /\b(every|recurring|regular|repeat|routine)\b/i,
      /\b(alternating|rotating|flexible|fixed)\b/i,
      /\b(once|twice|three times)\s+(a|per)\s+(week|month)\b/i,
      /\b(pattern|frequency|interval)\b/i,
    ],
  },
  {
    id: 'commute',
    label: 'Commute',
    patterns: [
      /\b(commute|commuting|travel|traveling)\b/i,
      /\b(subway|metro|train|bus|drive|driving)\b/i,
      /\b(office|work|job|workplace)\b/i,
      /\b(remote|hybrid|in-?person)\b/i,
      /\b(transit|transportation)\b/i,
    ],
  },
  {
    id: 'location',
    label: 'Location',
    patterns: [
      /\b(manhattan|brooklyn|queens|bronx|staten island)\b/i,
      /\b(midtown|downtown|uptown|village|heights)\b/i,
      /\b(near|close to|walking distance|neighborhood)\b/i,
      /\b(area|location|place|spot|zone)\b/i,
      /\b(east side|west side|upper|lower)\b/i,
      /\b(new york|nyc|ny|the city)\b/i,
    ],
  },
  {
    id: 'needs',
    label: 'Needs',
    patterns: [
      /\b(need|require|want|looking for|must have)\b/i,
      /\b(quiet|peaceful|private|furnished|unfurnished)\b/i,
      /\b(pet|dog|cat|animal)\b/i,
      /\b(laundry|kitchen|bathroom|bedroom)\b/i,
      /\b(wifi|internet|utilities|amenities)\b/i,
    ],
  },
  {
    id: 'background',
    label: 'About You',
    patterns: [
      /\b(i am|i'm|my name|myself)\b/i,
      /\b(student|professional|nurse|doctor|teacher|engineer)\b/i,
      /\b(work at|working at|employed|job at)\b/i,
      /\b(years? old|age|background|bio)\b/i,
      /\b(relocating|moving|new to|visiting)\b/i,
    ],
  },
  {
    id: 'storage',
    label: 'Storage',
    patterns: [
      /\b(storage|store|closet|space for)\b/i,
      /\b(luggage|bags?|boxes?|belongings)\b/i,
      /\b(bring|keep|leave|store)\b/i,
      /\b(furniture|stuff|things|items)\b/i,
    ],
  },
];

// Implement topic detection from user query
const detectTopicFromQuery = (query) => {
  const lowerQuery = query.toLowerCase();

  // Topic patterns
  const topicPatterns = {
    pricing: /price|cost|rent|budget|afford|cheap|expensive/i,
    neighborhood: /neighborhood|area|location|where|live/i,
    amenities: /amenity|feature|gym|pool|parking|laundry/i,
    commute: /commute|transit|subway|bus|train|walk/i,
    safety: /safe|crime|security|family/i,
    comparison: /compare|vs|versus|better|difference/i
  };

  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(lowerQuery)) {
      return topic;
    }
  }

  return 'general';
};

function detectTopics(text) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const detectedTopics = [];

  for (const topic of FREEFORM_TOPICS) {
    const isDetected = topic.patterns.some(pattern => pattern.test(text));
    if (isDetected) {
      detectedTopics.push(topic.id);
    }
  }

  return detectedTopics;
}

function TopicIndicators({ detectedTopics }) {
  return (
    <div className="topic-indicators">
      {FREEFORM_TOPICS.map((topic) => {
        const isDetected = detectedTopics.includes(topic.id);
        return (
          <span
            key={topic.id}
            className={`topic-chip ${isDetected ? 'topic-detected' : ''}`}
          >
            {isDetected && <span className="topic-checkmark">✓</span>}
            {topic.label}
          </span>
        );
      })}
    </div>
  );
}

function FreeformInput({ value, onChange }) {
  const detectedTopics = detectTopics(value);

  return (
    <div className="freeform-container">
      <div className="freeform-header">
        <p className="freeform-instruction">
          Describe your unique logistics needs in your own words
        </p>
      </div>

      <textarea
        className="freeform-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`ex.
I need a quiet space near downtown, weekly from Monday to Friday, I commute to the city on a weekly basis.

Send to (415) 555-5555 and guest@mail.com`}
        rows={8}
        aria-label="Market research description"
      />

      <TopicIndicators detectedTopics={detectedTopics} />

      <div className="info-banner">
        <div className="info-banner-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" fill="#31135D" />
            <text x="12" y="16" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
          </svg>
        </div>
        <span className="info-banner-text">Include your email and phone number for faster processing</span>
      </div>
    </div>
  );
}

function ContactForm({ email, phone, onEmailChange, onPhoneChange }) {
  return (
    <div className="contact-container">
      <h3 className="contact-heading">Where do we send the report?</h3>

      <div className="contact-form-group">
        <label className="contact-label" htmlFor="email-input">
          Your email <span className="contact-required">*</span>
        </label>
        <input
          id="email-input"
          type="email"
          className="contact-input"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="your.email@example.com"
          required
          aria-required="true"
        />
      </div>

      <div className="contact-form-group">
        <label className="contact-label" htmlFor="phone-input">
          Phone number (optional)
        </label>
        <input
          id="phone-input"
          type="tel"
          className="contact-input"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="(415) 555-5555"
        />
      </div>

      <p className="contact-disclaimer">
        We'll send your personalized market research report to this email address.
      </p>
    </div>
  );
}

function ParsingStage() {
  return (
    <div className="parsing-container">
      <div className="parsing-lottie-wrapper">
        <LottieAnimation
          src={PARSING_LOTTIE_URL}
          loop={true}
          autoplay={true}
          className="parsing-lottie"
        />
        {/* Fallback spinner shown while Lottie loads or if it fails */}
        <div className="loading-spinner-fallback" />
      </div>
      <h3 className="parsing-message">Analyzing your request...</h3>
      <p className="parsing-sub-message">Please wait while we extract the information</p>
    </div>
  );
}

function LoadingStage({ message }) {
  return (
    <div className="loading-container">
      <div className="loading-lottie-wrapper">
        <LottieAnimation
          src={LOADING_LOTTIE_URL}
          loop={true}
          autoplay={true}
          className="loading-lottie"
        />
        {/* Fallback spinner shown while Lottie loads or if it fails */}
        <div className="loading-spinner-fallback" />
      </div>
      <h3 className="loading-message">{message}</h3>
      <p className="loading-sub-message">This will only take a moment...</p>
    </div>
  );
}

function FinalMessage({ message, isAsync = false }) {
  return (
    <div className="final-container">
      <div className="final-lottie-wrapper">
        <LottieAnimation
          src={SUCCESS_LOTTIE_URL}
          loop={true}
          autoplay={true}
          className="final-lottie"
        />
      </div>
      <h3 className="final-title">Success!</h3>
      <p className="final-message">{message}</p>
      {isAsync ? (
        <p className="final-sub-message">
          We're analyzing your preferences in the background. Your personalized market research report will be ready by tomorrow morning!
        </p>
      ) : (
        <p className="final-sub-message">
          Check your inbox for the comprehensive market research report.
        </p>
      )}
    </div>
  );
}

function EmailExistsMessage({ email, onLoginClick }) {
  return (
    <div className="final-container">
      <div className="final-lottie-wrapper" style={{ opacity: 0.7 }}>
        <LottieAnimation
          src={LOADING_LOTTIE_URL}
          loop={true}
          autoplay={true}
          className="final-lottie"
        />
      </div>
      <h3 className="final-title">Account Already Exists</h3>
      <p className="final-message">
        An account with <strong>{email}</strong> already exists.
      </p>
      <p className="final-sub-message">
        Please log in to continue with your market research request.
      </p>
      <button
        type="button"
        className="nav-next-button"
        onClick={onLoginClick}
        style={{ marginTop: '1rem' }}
      >
        Log In
      </button>
    </div>
  );
}

function NavigationButtons({ showBack, onBack, onNext, nextLabel, isLoading = false }) {
  return (
    <div className="nav-container">
      {showBack && (
        <button
          type="button"
          className="nav-back-button"
          onClick={onBack}
          disabled={isLoading}
          aria-label="Go back"
        >
          ← Back
        </button>
      )}
      <button
        type="button"
        className="nav-next-button"
        onClick={onNext}
        disabled={isLoading}
        aria-label={nextLabel}
      >
        {isLoading ? (
          <>
            <span className="nav-spinner" />
            Processing...
          </>
        ) : (
          nextLabel
        )}
      </button>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export default function AiSignupMarketReport({ isOpen, onClose, onSubmit }) {
  // Toast notifications (with fallback rendering when no ToastProvider)
  const { toasts, showToast, removeToast } = useToast();

  const [state, setState] = useState({
    currentSection: 'freeform',
    formData: {},
    emailCertainty: null,
    isLoading: false,
    error: null,
    emailAlreadyExists: false,
    existingEmail: null,
    isAsyncProcessing: false,
  });

  // Ref to track toast timeout for cleanup
  const robotsToastTimeoutRef = useRef(null);

  const goToSection = useCallback((section) => {
    setState(prev => ({ ...prev, currentSection: section }));
  }, []);

  const updateFormData = useCallback((data) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  const setError = useCallback((error) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const setLoading = useCallback((isLoading) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const setEmailCertainty = useCallback((certainty) => {
    setState(prev => ({ ...prev, emailCertainty: certainty }));
  }, []);

  const handleNext = useCallback(async () => {
    const { formData } = state;

    if (state.currentSection === 'freeform') {
      goToSection('parsing');

      await new Promise(resolve => setTimeout(resolve, 1500));

      const extractedEmail = extractEmail(formData.marketResearchText || '');
      const extractedPhone = extractPhone(formData.marketResearchText || '');
      const correctedEmail = extractedEmail ? autoCorrectEmail(extractedEmail) : '';
      const emailCertainty = correctedEmail ? checkEmailCertainty(correctedEmail) : 'uncertain';

      // Extract name from text (for user account creation)
      const extractedNameFromText = extractName(formData.marketResearchText || '', correctedEmail);

      const emailWasCorrected = extractedEmail !== correctedEmail;
      const phoneIsComplete = extractedPhone ? /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(extractedPhone) : false;

      const updatedFormData = {
        ...formData,
        email: correctedEmail || formData.email || '',
        phone: extractedPhone || formData.phone || '',
        name: extractedNameFromText || formData.name || '', // Store extracted name
      };

      const shouldAutoSubmit =
        correctedEmail &&
        extractedPhone &&
        emailCertainty === 'certain' &&
        !emailWasCorrected &&
        phoneIsComplete;

      if (shouldAutoSubmit) {
        setEmailCertainty('yes');

        // Show initial toast
        showToast({
          title: 'Thank you!',
          content: 'Creating your account...',
          type: 'info',
          duration: 3000
        });

        // Show second toast after a delay
        robotsToastTimeoutRef.current = setTimeout(() => {
          showToast({
            title: 'Almost there!',
            content: 'Our robots are still working...',
            type: 'info',
            duration: 3000
          });
        }, 1500);

        try {
          const result = await submitSignup({
            email: correctedEmail,
            phone: extractedPhone,
            marketResearchText: formData.marketResearchText,
            name: extractedNameFromText, // Pass extracted name
            timestamp: new Date().toISOString(),
          });

          // Clear the timeout
          if (robotsToastTimeoutRef.current) {
            clearTimeout(robotsToastTimeoutRef.current);
          }

          // Check if email already exists
          if (result.emailAlreadyExists) {
            showToast({
              title: 'Account Exists',
              content: 'Please log in to continue.',
              type: 'info',
              duration: 4000
            });

            setState(prev => ({
              ...prev,
              currentSection: 'emailExists',
              emailAlreadyExists: true,
              existingEmail: correctedEmail,
              formData: updatedFormData,
            }));
            return;
          }

          // Show success toast
          showToast({
            title: 'Welcome to Split Lease!',
            content: 'Your account has been created successfully.',
            type: 'success',
            duration: 4000
          });

          setState(prev => ({
            ...prev,
            currentSection: 'final',
            isAsyncProcessing: result.isAsync || false,
          }));
        } catch (error) {
          // Clear the timeout
          if (robotsToastTimeoutRef.current) {
            clearTimeout(robotsToastTimeoutRef.current);
          }

          showToast({
            title: 'Signup Issue',
            content: error instanceof Error ? error.message : 'Please try again.',
            type: 'error',
            duration: 5000
          });

          setError(error instanceof Error ? error.message : 'Signup failed. Please try again.');
          setState(prev => ({
            ...prev,
            formData: updatedFormData,
            currentSection: 'contact',
          }));
        }
        return;
      }

      setState(prev => ({
        ...prev,
        formData: updatedFormData,
        currentSection: 'contact',
        emailCertainty: emailCertainty === 'uncertain' ? 'no' : null,
      }));
    }
  }, [state, goToSection, setEmailCertainty, setError, showToast]);

  const handleBack = useCallback(() => {
    if (state.currentSection === 'contact') {
      goToSection('freeform');
    } else if (state.currentSection === 'final') {
      goToSection('contact');
    }
  }, [state.currentSection, goToSection]);

  const handleSubmit = useCallback(async () => {
    const { formData } = state;

    if (!formData.email) {
      setError('Email is required');
      return;
    }

    if (!formData.marketResearchText) {
      setError('Please describe your market research needs');
      return;
    }

    setLoading(true);
    goToSection('loading');

    // Show initial toast
    showToast({
      title: 'Thank you!',
      content: 'Creating your account...',
      type: 'info',
      duration: 3000
    });

    // Show second toast after a delay
    robotsToastTimeoutRef.current = setTimeout(() => {
      showToast({
        title: 'Almost there!',
        content: 'Our robots are still working...',
        type: 'info',
        duration: 3000
      });
    }, 1500);

    try {
      const result = await submitSignup({
        email: formData.email,
        phone: formData.phone,
        marketResearchText: formData.marketResearchText,
        name: formData.name, // Pass the extracted name
        timestamp: new Date().toISOString(),
      });

      // Clear the timeout
      if (robotsToastTimeoutRef.current) {
        clearTimeout(robotsToastTimeoutRef.current);
      }

      // Check if email already exists
      if (result.emailAlreadyExists) {
        showToast({
          title: 'Account Exists',
          content: 'Please log in to continue.',
          type: 'info',
          duration: 4000
        });

        setState(prev => ({
          ...prev,
          currentSection: 'emailExists',
          emailAlreadyExists: true,
          existingEmail: formData.email,
          isLoading: false,
        }));
        return;
      }

      // Show success toast
      showToast({
        title: 'Welcome to Split Lease!',
        content: 'Your account has been created successfully.',
        type: 'success',
        duration: 4000
      });

      setTimeout(() => {
        setState(prev => ({
          ...prev,
          currentSection: 'final',
          isLoading: false,
          isAsyncProcessing: result.isAsync || false,
        }));
      }, 1500);
    } catch (error) {
      // Clear the timeout
      if (robotsToastTimeoutRef.current) {
        clearTimeout(robotsToastTimeoutRef.current);
      }

      showToast({
        title: 'Signup Issue',
        content: error instanceof Error ? error.message : 'Please try again.',
        type: 'error',
        duration: 5000
      });

      setError(error instanceof Error ? error.message : 'Signup failed. Please try again.');
      goToSection('contact');
    }
  }, [state, goToSection, setError, setLoading, showToast]);

  const resetFlow = useCallback(() => {
    setState({
      currentSection: 'freeform',
      formData: {},
      emailCertainty: null,
      isLoading: false,
      error: null,
      emailAlreadyExists: false,
      existingEmail: null,
      isAsyncProcessing: false,
    });
  }, []);

  // Handle login click for existing email users
  const handleLoginClick = useCallback(() => {
    // Close this modal and trigger the login modal in Header
    onClose();
    // Dispatch custom event to open login modal
    window.dispatchEvent(new CustomEvent('openLoginModal', {
      detail: { email: state.existingEmail }
    }));
  }, [onClose, state.existingEmail]);

  const getButtonText = useCallback(() => {
    const { formData } = state;

    if (state.currentSection === 'freeform') {
      const extractedEmail = extractEmail(formData.marketResearchText || '');
      const extractedPhone = extractPhone(formData.marketResearchText || '');
      const correctedEmail = extractedEmail ? autoCorrectEmail(extractedEmail) : '';
      const emailCertainty = correctedEmail ? checkEmailCertainty(correctedEmail) : 'uncertain';

      const emailWasCorrected = extractedEmail !== correctedEmail;
      const phoneIsComplete = extractedPhone ? /^\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/.test(extractedPhone) : false;

      const isPerfect = correctedEmail && extractedPhone && emailCertainty === 'certain' && !emailWasCorrected && phoneIsComplete;

      if (isPerfect) return 'Submit';
      return 'Next';
    }

    if (state.currentSection === 'contact') return 'Submit';
    return 'Next';
  }, [state]);

  // Reset flow when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetFlow();
    }
  }, [isOpen, resetFlow]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Auto-close modal and reload page after success (to show logged-in state)
  useEffect(() => {
    if (state.currentSection === 'final' && isOpen) {
      const autoCloseTimer = setTimeout(() => {
        onClose();
        // Short delay before reload to allow toast to be visible
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }, 3500); // 3.5 seconds to read success message

      return () => clearTimeout(autoCloseTimer);
    }
  }, [state.currentSection, isOpen, onClose]);

  // Cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (robotsToastTimeoutRef.current) {
        clearTimeout(robotsToastTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const showNavigation = state.currentSection !== 'final' &&
                        state.currentSection !== 'loading' &&
                        state.currentSection !== 'parsing' &&
                        state.currentSection !== 'emailExists';

  return (
    <div
      className="ai-signup-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="ai-signup-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile grab handle */}
        <div className="modal-grab-handle" aria-hidden="true" />

        {/* Header */}
        <div className="ai-signup-header">
          <div className="ai-signup-icon-wrapper">
            <svg
              className="ai-signup-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <h2 id="modal-title" className="ai-signup-title">
            <span className="title-desktop">Market Research for Lodging, Storage, Transport, Restaurants and more</span>
            <span className="title-mobile">Market Research</span>
          </h2>
          <button
            className="ai-signup-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content Sections */}
        <div className="ai-signup-content">
          {state.currentSection === 'freeform' && (
            <FreeformInput
              value={state.formData.marketResearchText || ''}
              onChange={(text) => updateFormData({ marketResearchText: text })}
            />
          )}

          {state.currentSection === 'contact' && (
            <ContactForm
              email={state.formData.email || ''}
              phone={state.formData.phone || ''}
              onEmailChange={(email) => updateFormData({ email })}
              onPhoneChange={(phone) => updateFormData({ phone })}
            />
          )}

          {state.currentSection === 'parsing' && <ParsingStage />}
          {state.currentSection === 'loading' && <LoadingStage message="We are processing your request" />}
          {state.currentSection === 'emailExists' && (
            <EmailExistsMessage
              email={state.existingEmail}
              onLoginClick={handleLoginClick}
            />
          )}
          {state.currentSection === 'final' && (
            <FinalMessage
              message="Your account has been created successfully!"
              isAsync={state.isAsyncProcessing}
            />
          )}
        </div>

        {/* Error Display */}
        {state.error && (
          <div className="ai-signup-error" role="alert">
            <strong>Error:</strong> {state.error}
          </div>
        )}

        {/* Navigation Buttons */}
        {showNavigation && (
          <NavigationButtons
            showBack={state.currentSection === 'contact'}
            onBack={handleBack}
            onNext={state.currentSection === 'contact' ? handleSubmit : handleNext}
            nextLabel={getButtonText()}
            isLoading={state.isLoading}
          />
        )}

        {/* Final close button */}
        {state.currentSection === 'final' && (
          <div className="ai-signup-final-button-wrapper">
            <button
              className="ai-signup-final-close-button"
              onClick={() => { window.location.reload(); }}
            >
              Close
            </button>
          </div>
        )}
      </div>

      <style>{`
        /* ============================================
           POPUP REPLICATION PROTOCOL - Compliant CSS
           ============================================ */

        /* Overlay and Modal - Core Architecture (Section 1) */
        .ai-signup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .ai-signup-modal {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 600px;
          max-height: 92vh; /* Protocol: 92vh max-height */
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        /* Mobile grab handle - hidden on desktop */
        .modal-grab-handle {
          display: none;
        }

        /* Header - Component Spec Section 4A */
        .ai-signup-header {
          flex-shrink: 0; /* Protocol: fixed header */
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px; /* Protocol: reduced from 24px */
          border-bottom: 1px solid #E7E0EC;
        }

        .ai-signup-icon-wrapper {
          flex-shrink: 0;
        }

        .ai-signup-icon {
          width: 24px; /* Protocol: 24px desktop */
          height: 24px;
          color: #31135D; /* Protocol: Primary Purple */
        }

        .ai-signup-title {
          flex: 1;
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
          line-height: 1.4;
        }

        /* Responsive title - desktop vs mobile */
        .title-desktop { display: inline; }
        .title-mobile { display: none; }

        .ai-signup-close-button {
          flex-shrink: 0;
          background: none;
          border: none;
          color: #31135D; /* Protocol: Primary Purple */
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .ai-signup-close-button:hover {
          background: #F7F2FA; /* Protocol: Light Purple Background */
        }

        .ai-signup-close-button svg {
          width: 32px; /* Protocol: 32x32 close icon */
          height: 32px;
        }

        /* Content - Scrollable body */
        .ai-signup-content {
          flex-grow: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch; /* Protocol: smooth mobile scroll */
          padding: 16px; /* Protocol: standardized spacing */
          min-height: 300px;
        }

        /* Error - Using Emergency Red outlined only */
        .ai-signup-error {
          margin: 0 16px 16px;
          padding: 12px 16px;
          background: white; /* Protocol: white/transparent bg for danger */
          border: 1px solid #DC3545; /* Protocol: Emergency Red outlined */
          border-radius: 8px;
          color: #DC3545;
          font-size: 14px;
        }

        /* Freeform Input */
        .freeform-container {
          display: flex;
          flex-direction: column;
          gap: 8px; /* Protocol: 8px section gaps */
        }

        .freeform-header {
          margin-bottom: 8px;
        }

        .freeform-instruction {
          margin: 0;
          font-size: 15px;
          color: #49454F;
          line-height: 1.6;
        }

        .freeform-textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #E7E0EC;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          resize: vertical;
          min-height: 180px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .freeform-textarea:focus {
          outline: none;
          border-color: #31135D;
          box-shadow: 0 0 0 3px rgba(49, 19, 93, 0.1);
        }

        /* Topic Indicators - NO GREEN (Section 2) */
        .topic-indicators {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 0;
        }

        .topic-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 500;
          color: #49454F; /* Protocol: Ghost text color */
          background: #F7F2FA; /* Protocol: Light Purple Background */
          border: 1px solid #E7E0EC;
          border-radius: 16px;
          transition: all 0.3s ease;
        }

        .topic-chip.topic-detected {
          color: #31135D; /* Protocol: Primary Purple */
          background: #F7F2FA; /* Protocol: Light Purple Background */
          border-color: #5B5FCF; /* Protocol: Positive/Action Purple */
        }

        .topic-checkmark {
          font-weight: 700;
          color: #5B5FCF; /* Protocol: Positive/Action Purple - NO GREEN */
        }

        /* Info Banner - Component Spec Section 4C */
        .info-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #F7F2FA; /* Protocol: Light Purple Background */
          border: 1px solid #E7E0EC;
          border-radius: 8px;
          margin-top: 8px;
        }

        .info-banner-icon {
          flex-shrink: 0;
          width: 24px;
          height: 24px;
        }

        .info-banner-icon svg {
          width: 24px;
          height: 24px;
        }

        .info-banner-text {
          font-size: 14px;
          color: #49454F;
          line-height: 1.4;
        }

        /* Contact Form */
        .contact-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .contact-heading {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
        }

        .contact-form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .contact-label {
          font-size: 14px;
          font-weight: 600;
          color: #31135D;
        }

        .contact-required {
          color: #DC3545; /* Protocol: Emergency Red */
        }

        .contact-input {
          padding: 10px 14px;
          border: 1px solid #E7E0EC;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .contact-input:focus {
          outline: none;
          border-color: #31135D;
          box-shadow: 0 0 0 3px rgba(49, 19, 93, 0.1);
        }

        .contact-disclaimer {
          margin: 0;
          font-size: 14px;
          color: #49454F;
          line-height: 1.5;
        }

        /* Parsing Stage */
        .parsing-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          text-align: center;
        }

        .parsing-lottie-wrapper {
          width: 200px;
          height: 200px;
          margin-bottom: 24px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .parsing-message {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #31135D;
        }

        .parsing-sub-message {
          margin: 0;
          font-size: 14px;
          color: #49454F;
        }

        /* Loading Stage */
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          text-align: center;
        }

        .loading-lottie-wrapper {
          width: 200px;
          height: 200px;
          margin-bottom: 24px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-message {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: #31135D;
        }

        .loading-sub-message {
          margin: 0;
          font-size: 14px;
          color: #49454F;
        }

        /* Loading Spinner Fallback */
        .loading-spinner-fallback {
          position: absolute;
          width: 60px;
          height: 60px;
          border: 4px solid #E7E0EC;
          border-top-color: #31135D;
          border-radius: 50%;
          animation: spinner-rotate 1s linear infinite;
          z-index: 0;
        }

        .parsing-lottie-wrapper > div:first-child:not(:empty) ~ .loading-spinner-fallback,
        .loading-lottie-wrapper > div:first-child:not(:empty) ~ .loading-spinner-fallback {
          display: none;
        }

        @keyframes spinner-rotate {
          to { transform: rotate(360deg); }
        }

        /* Final Message */
        .final-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          text-align: center;
        }

        .final-lottie-wrapper {
          width: 200px;
          height: 200px;
          margin-bottom: 24px;
        }

        .final-title {
          margin: 0 0 12px 0;
          font-size: 24px;
          font-weight: 700;
          color: #31135D;
        }

        .final-message {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 500;
          color: #1a202c;
        }

        .final-sub-message {
          margin: 0;
          font-size: 14px;
          color: #49454F;
        }

        /* Navigation Buttons - Footer (Section 4B) */
        .nav-container {
          flex-shrink: 0; /* Protocol: fixed footer */
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px; /* Protocol: equal to header */
          border-top: 1px solid #E7E0EC;
        }

        .nav-back-button,
        .nav-next-button {
          padding: 12px 24px;
          border-radius: 100px; /* Protocol: pill-shaped buttons */
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Back button - Ghost style (Section 4B) */
        .nav-back-button {
          background: transparent;
          border: 1px solid #E7E0EC;
          color: #49454F;
        }

        .nav-back-button:hover:not(:disabled) {
          background: #F7F2FA;
          border-color: #31135D;
          color: #31135D;
        }

        /* Next/Submit button - Primary style (Section 4B) */
        .nav-next-button {
          background: #31135D; /* Protocol: Primary Purple */
          color: white;
          border: none;
        }

        .nav-next-button:hover:not(:disabled) {
          background: #6D31C2; /* Protocol: Secondary Purple for hover */
        }

        .nav-back-button:disabled,
        .nav-next-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Final Button */
        .ai-signup-final-button-wrapper {
          flex-shrink: 0;
          padding: 16px;
          border-top: 1px solid #E7E0EC;
          display: flex;
          justify-content: center;
        }

        .ai-signup-final-close-button {
          padding: 12px 32px;
          background: #31135D;
          color: white;
          border: none;
          border-radius: 100px; /* Protocol: pill-shaped */
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .ai-signup-final-close-button:hover {
          background: #6D31C2;
        }

        /* ============================================
           Mobile Bottom-Sheet Mode (Section 1)
           ============================================ */
        @media (max-width: 480px) {
          .ai-signup-overlay {
            align-items: flex-end; /* Protocol: bottom-sheet positioning */
            padding: 0;
          }

          .ai-signup-modal {
            border-radius: 24px 24px 0 0; /* Protocol: top corners only */
            max-width: 100%;
            max-height: 92vh;
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); /* Protocol: slide-up animation */
          }

          /* Mobile grab handle - visible on mobile */
          .modal-grab-handle {
            display: block;
            width: 36px; /* Protocol: 36x4px */
            height: 4px;
            background: #E7E0EC;
            border-radius: 2px;
            margin: 8px auto 0;
            flex-shrink: 0;
          }

          /* Mobile header adjustments */
          .ai-signup-header {
            padding: 12px 16px;
            gap: 12px;
          }

          .ai-signup-icon {
            width: 20px; /* Protocol: 20px mobile */
            height: 20px;
          }

          .ai-signup-title {
            font-size: 18px; /* Protocol: 18px */
            font-weight: 400; /* Protocol: weight 400, NOT bold */
          }

          /* Show short title on mobile */
          .title-desktop { display: none; }
          .title-mobile { display: inline; }

          /* Mobile close button - larger touch target */
          .ai-signup-close-button {
            width: 36px;
            height: 36px;
          }

          .ai-signup-close-button svg {
            width: 36px;
            height: 36px;
            stroke-width: 2.5;
          }

          /* Mobile content */
          .ai-signup-content {
            padding: 16px;
          }

          /* Mobile footer - extra bottom padding for safe area */
          .nav-container {
            padding: 12px 16px 20px; /* Protocol: 12px top, 20px bottom */
          }

          .ai-signup-final-button-wrapper {
            padding: 12px 16px 20px;
          }

          /* Smaller textarea on mobile */
          .freeform-textarea {
            min-height: 150px;
          }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        /* Tablet breakpoint */
        @media (min-width: 481px) and (max-width: 640px) {
          .ai-signup-modal {
            max-width: 100%;
            margin: 0 16px;
          }

          .ai-signup-title {
            font-size: 16px;
          }
        }
      `}</style>

      {/* Toast notifications (rendered here as fallback when no ToastProvider) */}
      {toasts && toasts.length > 0 && <Toast toasts={toasts} onRemove={removeToast} />}
    </div>
  );
}
