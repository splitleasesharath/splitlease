#!/usr/bin/env python3
r"""
Google Drive Link Generator
Takes local Google Drive file paths and returns shareable Drive URLs.

Usage:
    python get_drive_link.py "C:\Users\Split Lease\My Drive\path\to\file.md"

Requirements:
    pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
"""

import os
import sys
import json
import pickle
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete token.pickle
SCOPES = ['https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/drive.file']

# Configuration - use shared credentials from central location
SCRIPT_DIR = Path(__file__).parent
CLAUDE_DIR = SCRIPT_DIR.parent.parent  # .claude directory
GOOGLE_TOOLS_DIR = CLAUDE_DIR / 'google-drive-tools'
TOKEN_FILE = GOOGLE_TOOLS_DIR / 'token.pickle'
CREDENTIALS_FILE = GOOGLE_TOOLS_DIR / 'credentials.json'


def authenticate():
    """Authenticate with Google Drive API and return service object."""
    creds = None

    # Load existing token
    if TOKEN_FILE.exists():
        with open(TOKEN_FILE, 'rb') as token:
            creds = pickle.load(token)

    # If no valid credentials, authenticate
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDENTIALS_FILE.exists():
                print(f"ERROR: {CREDENTIALS_FILE} not found!", file=sys.stderr)
                print("\nTo get credentials.json:", file=sys.stderr)
                print("1. Go to https://console.cloud.google.com/", file=sys.stderr)
                print("2. Create a project or select existing", file=sys.stderr)
                print("3. Enable Google Drive API", file=sys.stderr)
                print("4. Create OAuth 2.0 credentials (Desktop app)", file=sys.stderr)
                print("5. Download JSON and save as credentials.json", file=sys.stderr)
                sys.exit(1)

            flow = InstalledAppFlow.from_client_secrets_file(
                str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)

        # Save credentials for next run
        with open(TOKEN_FILE, 'wb') as token:
            pickle.dump(creds, token)

    return build('drive', 'v3', credentials=creds)


def extract_filename_from_path(file_path):
    """Extract just the filename from full path."""
    return Path(file_path).name


def find_file_by_name(service, filename):
    """Search for file by name in Google Drive and return file ID."""
    try:
        # Search for file by name
        query = f"name = '{filename}' and trashed = false"
        results = service.files().list(
            q=query,
            spaces='drive',
            fields='files(id, name, webViewLink, modifiedTime)',
            orderBy='modifiedTime desc',
            pageSize=10
        ).execute()

        files = results.get('files', [])

        if not files:
            return None

        # Return the most recently modified file
        return files[0]

    except HttpError as error:
        print(f"ERROR: Google Drive API error: {error}", file=sys.stderr)
        return None


def get_shareable_link(service, file_id):
    """Get shareable link for file."""
    try:
        # Get file info including web view link
        file = service.files().get(
            fileId=file_id,
            fields='webViewLink'
        ).execute()

        # Return web view link (always available)
        return file.get('webViewLink')

    except HttpError as error:
        print(f"ERROR: Could not get file link: {error}", file=sys.stderr)
        return None


def get_drive_link(file_path):
    """Main function: Convert local file path to Google Drive shareable URL."""
    if not os.path.exists(file_path):
        print(f"ERROR: File does not exist: {file_path}", file=sys.stderr)
        return None

    # Extract filename
    filename = extract_filename_from_path(file_path)

    # Authenticate
    try:
        service = authenticate()
    except Exception as e:
        print(f"ERROR: Authentication failed: {e}", file=sys.stderr)
        return None

    # Find file in Drive
    file_info = find_file_by_name(service, filename)

    if not file_info:
        print(f"ERROR: File '{filename}' not found in Google Drive", file=sys.stderr)
        print("TIP: Make sure the file is synced to Google Drive", file=sys.stderr)
        return None

    file_id = file_info['id']

    # Get shareable link
    link = get_shareable_link(service, file_id)

    return link


def main():
    """CLI entry point."""
    if len(sys.argv) < 2:
        print("Usage: python get_drive_link.py <file_path>", file=sys.stderr)
        print("\nExample:", file=sys.stderr)
        print('  python get_drive_link.py "C:\\Users\\Split Lease\\My Drive\\file.md"', file=sys.stderr)
        sys.exit(1)

    file_path = sys.argv[1]

    # Get Drive link
    link = get_drive_link(file_path)

    if link:
        # Output just the link (clean output for scripting)
        print(link)
        return 0
    else:
        return 1


if __name__ == '__main__':
    sys.exit(main())
