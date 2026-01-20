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
