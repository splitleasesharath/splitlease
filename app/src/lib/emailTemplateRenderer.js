/**
 * Email Template Renderer
 * Generates HTML email previews matching the SendGrid "General Email Template 4"
 *
 * This client-side renderer allows previewing emails before sending,
 * using the same template structure as the server-side SendGrid templates.
 */

/**
 * Render the "General Email Template 4" with provided variables
 *
 * @param {Object} params - Template parameters
 * @param {string} params.subject - Email subject (used in <title>)
 * @param {string} params.title - Main heading
 * @param {string} params.bodytext1 - First paragraph
 * @param {string} params.bodytext2 - Second paragraph
 * @param {string} params.button_url - CTA button URL
 * @param {string} params.button_text - CTA button label
 * @param {string} params.logourl - Logo image URL
 * @param {string} params.preheadertext - Hidden preheader text
 * @param {string} [params.warningmessage] - Optional warning banner HTML
 * @param {string} [params.banner] - Optional banner HTML
 * @returns {string} Complete HTML email string
 */
export function renderGeneralEmailTemplate({
  subject = 'Message from Split Lease',
  title = '',
  bodytext1 = '',
  bodytext2 = '',
  button_url = 'https://splitlease.com',
  button_text = 'Visit Site',
  logourl = 'https://splitlease.com/assets/images/split-lease-logo.png',
  preheadertext = '',
  warningmessage = '',
  banner = '',
}) {
  // Escape HTML entities for safe rendering
  const escapeHtml = (str) => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(subject)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style type="text/css">
    body { margin:0; padding:0; background:#f4f4f6; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
    img { border:0; height:auto; line-height:100%; outline:none; text-decoration:none; display:block; }
    a { text-decoration:none; }
    .font-sans { font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 620px) {
      .container { width:100% !important; }
      .px-24 { padding-left:24px !important; padding-right:24px !important; }
      .stack { display:block !important; width:100% !important; }
    }
  </style>
</head>
<body class="font-sans" style="background:#f4f4f6;">
  <!-- Hidden preheader -->
  <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
    ${escapeHtml(preheadertext)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" class="container" style="background:#ffffff; border-radius:12px; box-shadow:0 2px 12px rgba(0,0,0,0.05); overflow:hidden;">

          <!-- Header with Logo + Text -->
          <tr style="background:#4b2fa2;">
            <td align="center" style="padding:20px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-right:10px;">
                    <img src="${escapeHtml(logourl)}" alt="Split Lease Logo" width="36" height="36" />
                  </td>
                  <td align="center" style="font-size:18px; font-weight:600; color:#ffffff; font-family:'Inter', sans-serif; letter-spacing:0.2px;">
                    Split Lease
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${warningmessage ? `
          <!-- Warning Message Banner -->
          <tr>
            <td align="center" style="padding:16px 40px; background:#FEF3C7;">
              ${warningmessage}
            </td>
          </tr>
          ` : ''}

          ${banner ? `
          <!-- Banner -->
          <tr>
            <td align="center" style="padding:0;">
              ${banner}
            </td>
          </tr>
          ` : ''}

          <!-- Message -->
          <tr>
            <td align="left" style="padding:36px 40px 28px 40px;">

              <h1 style="margin:0; font-size:20px; font-weight:600; color:#1a1a1a; line-height:1.5;">
                ${escapeHtml(title)}
              </h1>
              <p style="margin:16px 0 20px 0; font-size:15px; line-height:1.6; color:#444;">
                ${escapeHtml(bodytext1)}
              </p>

              <p style="margin:16px 0 20px 0; font-size:15px; line-height:1.6; color:#444;">
                ${escapeHtml(bodytext2)}
              </p>
              <div style="text-align:center; margin:24px 0;">
                <a href="${escapeHtml(button_url)}" target="_blank" style="display:inline-block; background:#4b2fa2; color:#ffffff; font-size:15px; font-weight:500; padding:12px 28px; border-radius:6px;">
                  ${escapeHtml(button_text)}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px; font-size:12px; color:#999; line-height:1.6; background:#fafafa;">
              — The Split Lease Team<br/>
              Split Lease · Greater New York Area
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate plain text version of the email
 * Used for email clients that don't support HTML
 *
 * @param {Object} params - Same parameters as renderGeneralEmailTemplate
 * @returns {string} Plain text email content
 */
export function renderGeneralEmailPlainText({
  title = '',
  bodytext1 = '',
  bodytext2 = '',
  button_url = 'https://splitlease.com',
  button_text = 'Visit Site',
}) {
  return `${title}

${bodytext1}

${bodytext2}

${button_text}: ${button_url}

— The Split Lease Team
Split Lease · Greater New York Area
`;
}
