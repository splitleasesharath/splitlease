#!/usr/bin/env python3
"""
Update all help center article HTML files to use a consistent header
that matches the main Split Lease site.
"""

import os
import re
from pathlib import Path

# The new header HTML that matches the main site
NEW_HEADER = '''    <!-- Header - Matches main Split Lease site -->
    <header class="sl-main-header">
        <div class="sl-header-container">
            <a href="/" class="sl-logo">
                <img src="https://d1muf25xaso8hp.cloudfront.net/https%3A%2F%2F50bf0464e4735aabad1cc8848a0e8b8a.cdn.bubble.io%2Ff1587601671931x294112149689599100%2Fsplit%2520lease%2520purple%2520circle.png?w=48&h=48&auto=enhance&dpr=1&q=100&fit=max" alt="Split Lease" class="sl-logo-img">
                <span class="sl-logo-text">Split Lease</span>
            </a>
            <nav class="sl-nav">
                <a href="/search" class="sl-nav-link">Explore Rentals</a>
                <a href="/help-center" class="sl-nav-link sl-nav-active">Help Center</a>
                <a href="/" class="sl-nav-btn">Sign In</a>
            </nav>
        </div>
    </header>'''

# CSS to add to the style.css file for the new header
HEADER_CSS = '''
/* ===================================
   MAIN SITE HEADER (for article pages)
   =================================== */
.sl-main-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #31135d;
  z-index: 1000;
  height: 70px;
  display: flex;
  align-items: center;
}

.sl-header-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sl-logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  gap: 10px;
}

.sl-logo-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.sl-logo-text {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.sl-nav {
  display: flex;
  align-items: center;
  gap: 24px;
}

.sl-nav-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  transition: color 0.2s;
}

.sl-nav-link:hover {
  color: white;
}

.sl-nav-link.sl-nav-active {
  color: white;
}

.sl-nav-btn {
  background: white;
  color: #31135d;
  padding: 10px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}

.sl-nav-btn:hover {
  background: #f0f0f0;
  transform: translateY(-1px);
}

/* Adjust body padding for fixed header */
body {
  padding-top: 70px;
}

/* Hide old header */
.header {
  display: none !important;
}

@media (max-width: 768px) {
  .sl-nav-link {
    display: none;
  }

  .sl-header-container {
    padding: 0 16px;
  }
}
'''

def update_html_file(filepath):
    """Update a single HTML file with the new header."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already updated
    if 'sl-main-header' in content:
        print(f"  Skipping (already updated): {filepath}")
        return False

    # Find the old header and replace it
    # The old header is between <!-- Header --> and <!-- Breadcrumb -->
    old_header_pattern = r'<!-- Header -->.*?</header>'

    if re.search(old_header_pattern, content, re.DOTALL):
        # Insert new header right after <body>
        content = content.replace('<body>\n', f'<body>\n{NEW_HEADER}\n')

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Updated: {filepath}")
        return True
    else:
        print(f"  No header found: {filepath}")
        return False

def update_css_file(css_path):
    """Add the header CSS to the style.css file."""
    with open(css_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if already updated
    if '.sl-main-header' in content:
        print(f"  CSS already updated: {css_path}")
        return False

    # Append the new CSS
    content += HEADER_CSS

    with open(css_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  Updated CSS: {css_path}")
    return True

def main():
    articles_dir = Path(r"C:\Users\Split Lease\My Drive\!Agent Context and Tools\SL21\Split Lease\app\public\help-center-articles")

    # Update CSS first
    css_file = articles_dir / "css" / "style.css"
    if css_file.exists():
        update_css_file(css_file)

    # Find and update all HTML files
    html_files = list(articles_dir.rglob("*.html"))
    print(f"\nFound {len(html_files)} HTML files")

    updated = 0
    for html_file in html_files:
        if update_html_file(html_file):
            updated += 1

    print(f"\nUpdated {updated} files")

if __name__ == "__main__":
    main()
