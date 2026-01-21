"""
Page Classifier - Maps pages to authentication requirements and MCP sessions

This module provides a complete registry of all pages with:
1. Authentication requirement (public, host, guest, shared)
2. Dual MCP session mapping for concurrent LIVE vs DEV comparison
3. Dynamic route parameters (e.g., :id, :userId)

Used by adw_parity_check.py to determine which MCP sessions to use for each page.

MCP Session Architecture:
- playwright-host-live: Host auth session for split.lease
- playwright-host-dev: Host auth session for localhost:8010
- playwright-guest-live: Guest auth session for split.lease
- playwright-guest-dev: Guest auth session for localhost:8010
"""

from typing import Dict, List, Optional, Literal, Tuple
from dataclasses import dataclass


AuthType = Literal["public", "host", "guest", "shared"]
McpSession = Literal[
    "playwright-host-live",
    "playwright-host-dev",
    "playwright-guest-live",
    "playwright-guest-dev"
]


@dataclass
class PageInfo:
    """Complete page information for concurrent parity checking"""

    path: str
    file: str
    auth_type: AuthType
    mcp_live: Optional[McpSession]   # MCP session for LIVE (split.lease)
    mcp_dev: Optional[McpSession]    # MCP session for DEV (localhost:8010)
    has_dynamic_segment: bool = False
    dynamic_pattern: Optional[str] = None
    test_id: Optional[str] = None
    deprecated: bool = False
    dev_only: bool = False
    description: str = ""


# =============================================================================
# COMPLETE PAGE REGISTRY
# =============================================================================
# Derived from app/src/routes.config.js - ALL pages with auth requirements

# -----------------------------------------------------------------------------
# PUBLIC PAGES - No authentication required, no MCP session needed
# -----------------------------------------------------------------------------
PUBLIC_PAGES: Dict[str, PageInfo] = {
    "/": PageInfo(
        path="/", file="home.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Homepage"
    ),
    "/browse-listings": PageInfo(
        path="/browse-listings", file="browse-listings.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Browse all listings"
    ),
    "/view-split-lease": PageInfo(
        path="/view-split-lease", file="view-split-lease.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        has_dynamic_segment=True, dynamic_pattern="/view-split-lease/:id",
        description="View single listing"
    ),
    "/how-split-lease-works": PageInfo(
        path="/how-split-lease-works", file="how-split-lease-works.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="How it works page"
    ),
    "/help-center": PageInfo(
        path="/help-center", file="help-center.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Help center home"
    ),
    "/help-center-category": PageInfo(
        path="/help-center-category", file="help-center-category.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        has_dynamic_segment=True, dynamic_pattern="/help-center/:category",
        description="Help center category"
    ),
    "/login": PageInfo(
        path="/login", file="login.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Login page"
    ),
    "/signup": PageInfo(
        path="/signup", file="signup.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Signup page"
    ),
    "/forgot-password": PageInfo(
        path="/forgot-password", file="forgot-password.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Password reset request"
    ),
    "/reset-password": PageInfo(
        path="/reset-password", file="reset-password.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Password reset form"
    ),
    "/verification-sent": PageInfo(
        path="/verification-sent", file="verification-sent.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Email verification sent"
    ),
    "/terms-of-use": PageInfo(
        path="/terms-of-use", file="terms-of-use.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Terms of use"
    ),
    "/privacy-policy": PageInfo(
        path="/privacy-policy", file="privacy-policy.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Privacy policy"
    ),
}

# -----------------------------------------------------------------------------
# HOST-ONLY PAGES - Require host authentication
# -----------------------------------------------------------------------------
HOST_PAGES: Dict[str, PageInfo] = {
    "/host-overview": PageInfo(
        path="/host-overview", file="host-overview.html", auth_type="host",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        description="Host dashboard overview"
    ),
    "/host-proposals": PageInfo(
        path="/host-proposals", file="host-proposals.html", auth_type="host",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        description="Host proposals list"
    ),
    "/self-listing": PageInfo(
        path="/self-listing", file="self-listing.html", auth_type="host",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        description="Self-listing form"
    ),
    "/listing-dashboard": PageInfo(
        path="/listing-dashboard", file="listing-dashboard.html", auth_type="host",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        description="Listing management dashboard"
    ),
    "/preview-split-lease": PageInfo(
        path="/preview-split-lease", file="preview-split-lease.html", auth_type="host",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        has_dynamic_segment=True, dynamic_pattern="/preview-split-lease/:id",
        description="Preview listing before publish"
    ),
    "/edit-listing": PageInfo(
        path="/edit-listing", file="edit-listing.html", auth_type="host",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        has_dynamic_segment=True, dynamic_pattern="/edit-listing/:id",
        description="Edit existing listing"
    ),
}

# -----------------------------------------------------------------------------
# GUEST-ONLY PAGES - Require guest authentication
# -----------------------------------------------------------------------------
GUEST_PAGES: Dict[str, PageInfo] = {
    "/guest-proposals": PageInfo(
        path="/guest-proposals", file="guest-proposals.html", auth_type="guest",
        mcp_live="playwright-guest-live", mcp_dev="playwright-guest-dev",
        description="Guest proposals list"
    ),
    "/favorite-listings": PageInfo(
        path="/favorite-listings", file="favorite-listings.html", auth_type="guest",
        mcp_live="playwright-guest-live", mcp_dev="playwright-guest-dev",
        description="Guest favorites"
    ),
    "/rental-application": PageInfo(
        path="/rental-application", file="rental-application.html", auth_type="guest",
        mcp_live="playwright-guest-live", mcp_dev="playwright-guest-dev",
        deprecated=True,
        description="Rental application (deprecated)"
    ),
}

# -----------------------------------------------------------------------------
# SHARED PROTECTED PAGES - Can use either auth, prefer host for consistency
# -----------------------------------------------------------------------------
SHARED_PAGES: Dict[str, PageInfo] = {
    "/account-profile": PageInfo(
        path="/account-profile", file="account-profile.html", auth_type="shared",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        has_dynamic_segment=True, dynamic_pattern="/account-profile/:userId",
        description="User profile (own or other)"
    ),
    "/messages": PageInfo(
        path="/messages", file="messages.html", auth_type="shared",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        description="Messages inbox"
    ),
    "/proposal": PageInfo(
        path="/proposal", file="proposal.html", auth_type="shared",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        has_dynamic_segment=True, dynamic_pattern="/proposal/:id",
        description="Single proposal view"
    ),
}

# -----------------------------------------------------------------------------
# DEV-ONLY PAGES - Only available in development
# -----------------------------------------------------------------------------
DEV_ONLY_PAGES: Dict[str, PageInfo] = {
    "/_dev-route-registry": PageInfo(
        path="/_dev-route-registry", file="_dev-route-registry.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        dev_only=True,
        description="Route registry debug page"
    ),
}


# =============================================================================
# ALL PAGES COMBINED REGISTRY
# =============================================================================
ALL_PAGES: Dict[str, PageInfo] = {
    **PUBLIC_PAGES,
    **HOST_PAGES,
    **GUEST_PAGES,
    **SHARED_PAGES,
    **DEV_ONLY_PAGES,
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_page_info(path: str) -> Optional[PageInfo]:
    """Get PageInfo for a specific path"""
    return ALL_PAGES.get(path)


def get_mcp_sessions_for_page(path: str) -> Tuple[Optional[McpSession], Optional[McpSession]]:
    """
    Get the MCP session pair for concurrent LIVE vs DEV comparison.

    Args:
        path: Page path (e.g., "/host-proposals")

    Returns:
        Tuple of (live_session, dev_session) - either can be None for public pages
    """
    page = ALL_PAGES.get(path)
    if not page:
        return (None, None)
    return (page.mcp_live, page.mcp_dev)


def get_page_auth_type(path: str) -> str:
    """Get the auth type for a page path.

    Args:
        path: URL path (e.g., "/host-proposals") or file path

    Returns:
        Auth type string: "public", "host", "guest", or "shared"
    """
    # Try direct lookup first
    page = ALL_PAGES.get(path)
    if page:
        return page.auth_type

    # Try converting file path to URL path
    url_path = file_path_to_url_path(path)
    if url_path:
        page = ALL_PAGES.get(url_path)
        if page:
            return page.auth_type

    return "public"  # Default to public for unknown pages


def file_path_to_url_path(file_path: str) -> Optional[str]:
    """Convert a component file path to its URL path.

    Handles common naming patterns:
    - src/islands/pages/HostProposalsPage.jsx → /host-proposals
    - src/islands/pages/GuestProposalsPage.jsx → /guest-proposals
    - src/islands/pages/HostProposalsPage/index.jsx → /host-proposals
    - src/islands/pages/HomePage.jsx → /

    Args:
        file_path: File path like "src/islands/pages/HostProposalsPage.jsx"

    Returns:
        URL path like "/host-proposals", or None if not a page file
    """
    import re

    # Normalize path separators
    normalized = file_path.replace('\\', '/')

    # Check if this is a page file
    if '/pages/' not in normalized:
        return None

    # Extract everything after /pages/
    pages_idx = normalized.rfind('/pages/')
    after_pages = normalized[pages_idx + 7:]  # len('/pages/') = 7
    parts = after_pages.split('/')

    # Determine the page name based on path structure
    if len(parts) == 1:
        # Direct page file: pages/HostProposalsPage.jsx
        filename = parts[0]
        name = re.sub(r'\.(jsx?|tsx?)$', '', filename)
    elif len(parts) >= 2:
        filename = parts[-1]
        filename_without_ext = re.sub(r'\.(jsx?|tsx?)$', '', filename)

        # Check if it's an index file or matching directory name
        if filename_without_ext.lower() == 'index':
            # Directory-based page: pages/HostProposalsPage/index.jsx
            name = parts[0]  # Use directory name
        elif filename_without_ext == parts[0]:
            # Matching filename: pages/HostProposalsPage/HostProposalsPage.jsx
            name = parts[0]
        else:
            # Sub-component: pages/HostProposalsPage/InfoGrid.jsx
            # Not a page entry point, but still return something for logging
            name = filename_without_ext
    else:
        return None

    # Remove common suffixes
    name = re.sub(r'Page$', '', name)

    # Convert PascalCase to kebab-case
    # e.g., HostProposals → host-proposals
    kebab = re.sub(r'([a-z])([A-Z])', r'\1-\2', name).lower()

    # Special case: 'home' maps to '/'
    if kebab == 'home':
        return '/'

    # Add leading slash
    url_path = f"/{kebab}"

    # Check if this URL path exists in our registry
    if url_path in ALL_PAGES:
        return url_path

    # Try some common variations
    variations = [
        url_path,
        url_path.replace('-page', ''),
        f"/{name.lower()}",
    ]

    for variant in variations:
        if variant in ALL_PAGES:
            return variant

    # If still not found, return the computed path anyway
    # (may be useful for logging)
    return url_path


def get_page_info_by_file_path(file_path: str) -> Optional[PageInfo]:
    """Get PageInfo by looking up a component file path.

    Args:
        file_path: File path like "src/islands/pages/HostProposalsPage.jsx"

    Returns:
        PageInfo if found, None otherwise
    """
    url_path = file_path_to_url_path(file_path)
    if url_path:
        return ALL_PAGES.get(url_path)
    return None


def get_pages_by_auth_type(auth_type: AuthType) -> List[PageInfo]:
    """Get all pages requiring a specific auth type"""
    return [p for p in ALL_PAGES.values() if p.auth_type == auth_type]


def get_pages_for_mcp_session(mcp_session: McpSession) -> List[PageInfo]:
    """Get all pages that use a specific MCP session (live or dev)"""
    return [
        p for p in ALL_PAGES.values()
        if p.mcp_live == mcp_session or p.mcp_dev == mcp_session
    ]


def get_checkable_pages(
    include_dev_only: bool = False,
    include_deprecated: bool = False
) -> List[PageInfo]:
    """
    Get all pages suitable for parity checking.

    Args:
        include_dev_only: Include dev-only pages (default: False)
        include_deprecated: Include deprecated pages (default: False)

    Returns:
        List of PageInfo objects to check
    """
    pages = []
    for page in ALL_PAGES.values():
        if page.dev_only and not include_dev_only:
            continue
        if page.deprecated and not include_deprecated:
            continue
        pages.append(page)
    return pages


def group_pages_for_concurrent_check() -> Dict[str, List[PageInfo]]:
    """
    Group pages by MCP session pair for efficient concurrent checking.

    Returns:
        Dictionary with keys like "host", "guest", "public" mapping to page lists
    """
    return {
        "public": [p for p in ALL_PAGES.values() if p.auth_type == "public"],
        "host": [p for p in ALL_PAGES.values() if p.auth_type in ("host", "shared")],
        "guest": [p for p in ALL_PAGES.values() if p.auth_type == "guest"],
    }


# =============================================================================
# TEST IDs FOR DYNAMIC ROUTES
# =============================================================================
TEST_IDS = {
    # Listing ID - Used for: /view-split-lease/:id, /preview-split-lease/:id, /edit-listing/:id
    "listing_id": "1705678660579x984500774015074300",

    # Help Center Categories - Static
    "help_center_category": "guests",
}


def resolve_dynamic_route(page: PageInfo) -> str:
    """
    Resolve a dynamic route pattern to a concrete URL for testing.

    Args:
        page: PageInfo with dynamic segment

    Returns:
        Concrete URL with test IDs substituted
    """
    if not page.has_dynamic_segment or not page.dynamic_pattern:
        return page.path

    url = page.dynamic_pattern

    # Substitute known test IDs
    if ":id" in url:
        url = url.replace(":id", TEST_IDS["listing_id"])

    if ":category" in url:
        url = url.replace(":category", TEST_IDS["help_center_category"])

    return url


# =============================================================================
# SUMMARY STATISTICS
# =============================================================================

def get_summary_stats() -> Dict:
    """Get summary statistics for the page registry"""
    checkable = get_checkable_pages()

    return {
        "total_pages": len(ALL_PAGES),
        "checkable_pages": len(checkable),
        "public_pages": len(PUBLIC_PAGES),
        "host_pages": len(HOST_PAGES),
        "guest_pages": len(GUEST_PAGES),
        "shared_pages": len(SHARED_PAGES),
        "dev_only_pages": len(DEV_ONLY_PAGES),
        "dynamic_routes": len([p for p in ALL_PAGES.values() if p.has_dynamic_segment]),
        "deprecated_pages": len([p for p in ALL_PAGES.values() if p.deprecated]),
    }


# =============================================================================
# VISUAL REGRESSION PAGE SELECTION
# =============================================================================

# Core pages to always check during visual regression (smoke test set)
# These are the most important pages that exercise key user flows
SMOKE_TEST_PAGES: List[str] = [
    "/",                    # Homepage - public entry point
    "/browse-listings",     # Listing discovery - public
    "/host-proposals",      # Host workflow - host auth
    "/guest-proposals",     # Guest workflow - guest auth
    "/listing-dashboard",   # Host listing management - host auth
]


def get_visual_check_pages(
    auth_types: Optional[List[str]] = None,
    smoke_test_only: bool = False,
    include_dynamic: bool = False,
    include_deprecated: bool = False
) -> List[PageInfo]:
    """
    Get pages for visual regression testing.

    This is the PRIMARY function for selecting which pages to visually test.
    It replaces the complex _trace_to_pages dependency walking approach with
    a simple registry-based selection.

    Args:
        auth_types: Filter by auth types (e.g., ["public", "host"]).
                   If None, returns pages of all auth types.
        smoke_test_only: If True, only return the core smoke test pages.
        include_dynamic: If True, include pages with dynamic route params.
                        Dynamic pages require test IDs to be resolved.
        include_deprecated: If True, include deprecated pages.

    Returns:
        List of PageInfo objects suitable for visual testing.

    Example usage:
        # Get all public pages
        pages = get_visual_check_pages(auth_types=["public"])

        # Get smoke test set (fastest)
        pages = get_visual_check_pages(smoke_test_only=True)

        # Get all host + guest pages
        pages = get_visual_check_pages(auth_types=["host", "guest"])

        # Get everything checkable
        pages = get_visual_check_pages(include_dynamic=True)
    """
    if smoke_test_only:
        # Return only the smoke test pages
        return [
            ALL_PAGES[path] for path in SMOKE_TEST_PAGES
            if path in ALL_PAGES
        ]

    pages = []
    for page in ALL_PAGES.values():
        # Skip dev-only pages always
        if page.dev_only:
            continue

        # Skip deprecated unless requested
        if page.deprecated and not include_deprecated:
            continue

        # Skip dynamic routes unless requested
        if page.has_dynamic_segment and not include_dynamic:
            continue

        # Filter by auth type if specified
        if auth_types and page.auth_type not in auth_types:
            continue

        pages.append(page)

    return pages


def get_pages_grouped_by_auth() -> Dict[str, List[PageInfo]]:
    """
    Get visual check pages grouped by authentication requirement.

    This is useful for running visual checks in batches based on
    which MCP session can access them.

    Returns:
        Dict with keys "public", "host", "guest" mapping to page lists.
        "shared" pages are included in "host" (we use host auth for them).
    """
    checkable = get_visual_check_pages()

    return {
        "public": [p for p in checkable if p.auth_type == "public"],
        "host": [p for p in checkable if p.auth_type in ("host", "shared")],
        "guest": [p for p in checkable if p.auth_type == "guest"],
    }


# =============================================================================
# CONVENIENCE: Print registry summary
# =============================================================================

if __name__ == "__main__":
    stats = get_summary_stats()
    print("=" * 60)
    print("PAGE REGISTRY SUMMARY")
    print("=" * 60)
    for key, value in stats.items():
        print(f"  {key.replace('_', ' ').title()}: {value}")
    print("=" * 60)

    print("\nPAGES BY AUTH TYPE:")
    groups = group_pages_for_concurrent_check()
    for group_name, pages in groups.items():
        print(f"\n  {group_name.upper()} ({len(pages)} pages):")
        for page in pages:
            print(f"    - {page.path}")
