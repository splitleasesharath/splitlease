# Google Drive Tools Setup

This directory contains shared Google Drive API credentials used by the goodbye-skill and other tools.

## Required Files (Not in Git)

These files are gitignored and must be set up locally:

### 1. `credentials.json`

OAuth 2.0 credentials from Google Cloud Console.

**How to get it:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Drive API
4. Go to "APIs & Services" > "Credentials"
5. Create "OAuth 2.0 Client ID" (Application type: Desktop app)
6. Download the JSON file
7. Save it as `.claude/google-drive-tools/credentials.json`

### 2. `token.pickle`

Cached authentication token (auto-generated on first run).

**How it's created:**
- Automatically generated when you first run `get_drive_link.py`
- Opens a browser for one-time authentication
- Cached for future use (no browser needed for subsequent runs)
- Expires after ~6 months of inactivity, auto-refreshes when used

## First-Time Setup

1. **Get credentials.json** (follow steps above)
2. **Test authentication:**
   ```bash
   python .claude/skills/goodbye-skill/get_drive_link.py "path/to/test/file.md"
   ```
3. **Authenticate in browser** (opens automatically)
4. **token.pickle created** - You're ready!

## Security

- **Never commit** `credentials.json` or `token.pickle` to git
- Both files are in `.gitignore`
- Share credentials securely (1Password, encrypted transfer, etc.)
- Regenerate credentials if compromised

## Troubleshooting

### "File not found: credentials.json"
- Make sure you downloaded and saved the credentials file in the correct location

### "Authentication failed"
- Delete `token.pickle` and re-authenticate
- Check that credentials.json is valid and not expired

### Token expired
- Token auto-refreshes when used
- If refresh fails, delete `token.pickle` and re-authenticate

## File Structure

```
.claude/google-drive-tools/
├── .gitignore           # Ignores sensitive files
├── README.md            # This file
├── credentials.json     # ❌ NOT in git - OAuth credentials
└── token.pickle         # ❌ NOT in git - Cached auth token
```

---

**Version:** 1.0
**Last Updated:** 2026-01-07
