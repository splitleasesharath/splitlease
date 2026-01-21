"""
Page Classifier - Maps pages to authentication requirements and MCP sessions

This module provides a complete registry of all pages with:
1. Authentication requirement (public, host, guest, shared)
2. Dual MCP session mapping for concurrent LIVE vs DEV comparison
3. Dynamic route parameters (e.g., :id)

IMPORTANT: This registry is derived from app/src/routes.config.js
Any changes to routes should be reflected here.

Used by visual_regression.py to determine which MCP sessions to use for each page.

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
# COMPLETE PAGE REGISTRY (from routes.config.js)
# =============================================================================

# -----------------------------------------------------------------------------
# PUBLIC PAGES - No authentication required, no MCP session needed
# -----------------------------------------------------------------------------
PUBLIC_PAGES: Dict[str, PageInfo] = {
    "/": PageInfo(
        path="/", file="index.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Homepage"
    ),
    "/search": PageInfo(
        path="/search", file="search.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Listing search page"
    ),
    "/view-split-lease": PageInfo(
        path="/view-split-lease", file="view-split-lease.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        has_dynamic_segment=True, dynamic_pattern="/view-split-lease/:id",
        description="View listing details"
    ),
    "/help-center": PageInfo(
        path="/help-center", file="help-center.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Help center home"
    ),
    "/help-center/:category": PageInfo(
        path="/help-center/:category", file="help-center-category.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        has_dynamic_segment=True, dynamic_pattern="/help-center/:category",
        description="Help center category"
    ),
    "/faq": PageInfo(
        path="/faq", file="faq.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="FAQ page"
    ),
    "/policies": PageInfo(
        path="/policies", file="policies.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Policies page (terms, privacy)"
    ),
    "/list-with-us": PageInfo(
        path="/list-with-us", file="list-with-us.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Host landing page"
    ),
    "/list-with-us-v2": PageInfo(
        path="/list-with-us-v2", file="list-with-us-v2.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Host landing page v2"
    ),
    "/why-split-lease": PageInfo(
        path="/why-split-lease", file="why-split-lease.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Marketing - why split lease"
    ),
    "/careers": PageInfo(
        path="/careers", file="careers.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Careers page"
    ),
    "/about-us": PageInfo(
        path="/about-us", file="about-us.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="About us page"
    ),
    "/host-guarantee": PageInfo(
        path="/host-guarantee", file="host-guarantee.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Host guarantee info"
    ),
    "/referral": PageInfo(
        path="/referral", file="referral.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Referral program"
    ),
    "/guest-success": PageInfo(
        path="/guest-success", file="guest-success.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Guest success confirmation"
    ),
    "/host-success": PageInfo(
        path="/host-success", file="host-success.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Host success confirmation"
    ),
    "/reset-password": PageInfo(
        path="/reset-password", file="reset-password.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Password reset form"
    ),
    "/auth/verify": PageInfo(
        path="/auth/verify", file="auth-verify.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Email verification callback"
    ),
    "/404": PageInfo(
        path="/404", file="404.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="Error page"
    ),
    "/self-listing-v2": PageInfo(
        path="/self-listing-v2", file="self-listing-v2.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        description="New self-listing form (public)"
    ),
}

# -----------------------------------------------------------------------------
# HOST-ONLY PAGES - Require host authentication
# -----------------------------------------------------------------------------
HOST_PAGES: Dict[str, PageInfo] = {
    "/preview-split-lease": PageInfo(
        path="/preview-split-lease", file="preview-split-lease.html", auth_type="host",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        has_dynamic_segment=True, dynamic_pattern="/preview-split-lease/:id",
        description="Preview listing before publish"
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
    "/host-overview": PageInfo(
        path="/host-overview", file="host-overview.html", auth_type="host",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        description="Host dashboard overview"
    ),
    "/house-manual": PageInfo(
        path="/house-manual", file="house-manual.html", auth_type="host",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        description="House manual page"
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
        description="User profile page"
    ),
    "/messages": PageInfo(
        path="/messages", file="messages.html", auth_type="shared",
        mcp_live="playwright-host-live", mcp_dev="playwright-host-dev",
        description="Messages inbox"
    ),
}

# -----------------------------------------------------------------------------
# DEV-ONLY PAGES - Skip for visual regression
# -----------------------------------------------------------------------------
DEV_ONLY_PAGES: Dict[str, PageInfo] = {
    "/index-dev": PageInfo(
        path="/index-dev", file="index-dev.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        dev_only=True,
        description="Development homepage"
    ),
    "/_internal-test": PageInfo(
        path="/_internal-test", file="_internal-test.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        dev_only=True,
        description="Internal test page"
    ),
    "/_internal/create-suggested-proposal": PageInfo(
        path="/_internal/create-suggested-proposal", file="create-suggested-proposal.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        dev_only=True,
        description="Internal proposal creation"
    ),
    "/_email-sms-unit": PageInfo(
        path="/_email-sms-unit", file="_email-sms-unit.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        dev_only=True,
        description="Email/SMS testing"
    ),
    "/referral-demo": PageInfo(
        path="/referral-demo", file="referral-demo.html", auth_type="public",
        mcp_live=None, mcp_dev=None,
        dev_only=True,
        description="Referral demo page"
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
# TEST IDs FOR DYNAMIC ROUTES
# =============================================================================
TEST_IDS = {
    # Listing ID - Used for: /view-split-lease/:id, /preview-split-lease/:id
    "listing_id": "1705678660579x984500774015074300",

    # Help Center Category
    "help_center_category": "knowledge-base",
}


# =============================================================================
# SMOKE TEST PAGES - Core pages for quick validation
# =============================================================================
SMOKE_TEST_PAGES: List[str] = [
    "/",                    # Homepage - public entry point
    "/search",              # Listing search - public
    "/host-proposals",      # Host workflow - host auth
    "/guest-proposals",     # Guest workflow - guest auth
    "/listing-dashboard",   # Host listing management - host auth
]


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
        "public": [p for p in ALL_PAGES.values() if p.auth_type == "public" and not p.dev_only],
        "host": [p for p in ALL_PAGES.values() if p.auth_type in ("host", "shared") and not p.dev_only],
        "guest": [p for p in ALL_PAGES.values() if p.auth_type == "guest" and not p.dev_only],
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
# VISUAL REGRESSION PAGE SELECTION
# =============================================================================

def get_visual_check_pages(
    auth_types: Optional[List[str]] = None,
    smoke_test_only: bool = False,
    include_dynamic: bool = True,  # Changed to True by default
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
            dynamic_marker = " [DYNAMIC]" if page.has_dynamic_segment else ""
            print(f"    - {page.path}{dynamic_marker}")

    print("\n\nDYNAMIC ROUTE RESOLUTION:")
    for page in ALL_PAGES.values():
        if page.has_dynamic_segment:
            resolved = resolve_dynamic_route(page)
            print(f"  {page.path} -> {resolved}")
