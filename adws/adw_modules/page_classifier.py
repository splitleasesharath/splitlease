"""
Page Classifier - Maps pages to authentication requirements and MCP sessions

This module reads the route registry and classifies each page based on:
1. Authentication requirement (public, host, guest, shared)
2. Required Playwright MCP session (playwright-host, playwright-guest, or None)
3. Dynamic route parameters (e.g., :id, :userId)

Used by adw_parity_check.py to determine which MCP session to use for each page comparison.
"""

from typing import Dict, List, Optional, Literal
from dataclasses import dataclass


AuthType = Literal["public", "host", "guest", "shared"]
McpSession = Literal["playwright-host", "playwright-guest"]


@dataclass
class PageClassification:
    """Classification of a page for parity checking"""

    path: str
    file: str
    auth_type: AuthType
    mcp_session: Optional[McpSession]
    has_dynamic_segment: bool
    dynamic_pattern: Optional[str] = None
    test_id: Optional[str] = None
    deprecated: bool = False
    dev_only: bool = False


# =============================================================================
# PAGE AUTHENTICATION MATRIX
# =============================================================================
# This matrix defines which pages require which authentication sessions.
# Based on routes.config.js and domain knowledge of host vs guest pages.

# Host-Only Pages (require playwright-host MCP session)
HOST_PAGES = {
    "/host-proposals",
    "/self-listing",
    "/listing-dashboard",
    "/host-overview",
    "/preview-split-lease",
}

# Guest-Only Pages (require playwright-guest MCP session)
GUEST_PAGES = {
    "/guest-proposals",
    "/favorite-listings",
    "/rental-application",  # deprecated but still guest-only
}

# Shared Protected Pages (can use either session, we prefer playwright-host)
SHARED_PROTECTED_PAGES = {
    "/account-profile",
    "/messages",
}


def classify_page(route: Dict) -> PageClassification:
    """
    Classify a single route from routes.config.js

    Args:
        route: Dictionary with keys: path, file, protected, hasDynamicSegment, etc.

    Returns:
        PageClassification with auth_type and mcp_session
    """
    path = route['path']
    is_protected = route.get('protected', False)
    has_dynamic = route.get('hasDynamicSegment', False)
    dynamic_pattern = route.get('dynamicPattern')
    deprecated = route.get('deprecated', False)
    dev_only = route.get('devOnly', False)

    # Determine auth type and MCP session
    if path in HOST_PAGES:
        auth_type = "host"
        mcp_session = "playwright-host"
    elif path in GUEST_PAGES:
        auth_type = "guest"
        mcp_session = "playwright-guest"
    elif path in SHARED_PROTECTED_PAGES:
        auth_type = "shared"
        mcp_session = "playwright-host"  # Prefer host session for shared pages
    elif is_protected:
        # Fallback: Any other protected page defaults to host
        auth_type = "host"
        mcp_session = "playwright-host"
    else:
        # Public page
        auth_type = "public"
        mcp_session = None

    return PageClassification(
        path=path,
        file=route['file'],
        auth_type=auth_type,
        mcp_session=mcp_session,
        has_dynamic_segment=has_dynamic,
        dynamic_pattern=dynamic_pattern,
        deprecated=deprecated,
        dev_only=dev_only
    )


def get_all_page_classifications(routes: List[Dict]) -> List[PageClassification]:
    """
    Classify all routes from routes.config.js

    Args:
        routes: List of route dictionaries from routes.config.js

    Returns:
        List of PageClassification objects
    """
    return [classify_page(route) for route in routes]


def filter_pages_for_parity_check(
    classifications: List[PageClassification],
    include_dev_only: bool = False,
    include_deprecated: bool = False
) -> List[PageClassification]:
    """
    Filter pages that should be included in parity checking

    Args:
        classifications: All page classifications
        include_dev_only: Whether to include devOnly pages (default: False)
        include_deprecated: Whether to include deprecated pages (default: False)

    Returns:
        Filtered list of pages to check
    """
    filtered = []

    for page in classifications:
        # Skip dev-only pages unless explicitly included
        if page.dev_only and not include_dev_only:
            continue

        # Skip deprecated pages unless explicitly included
        if page.deprecated and not include_deprecated:
            continue

        # Skip internal/dev utility pages
        if page.path.startswith('/_'):
            continue

        filtered.append(page)

    return filtered


def group_pages_by_auth_type(
    classifications: List[PageClassification]
) -> Dict[AuthType, List[PageClassification]]:
    """
    Group pages by authentication type for batch processing

    Args:
        classifications: List of page classifications

    Returns:
        Dictionary mapping auth_type to list of pages
    """
    groups: Dict[AuthType, List[PageClassification]] = {
        "public": [],
        "host": [],
        "guest": [],
        "shared": []
    }

    for page in classifications:
        groups[page.auth_type].append(page)

    return groups


# =============================================================================
# TEST IDs FOR DYNAMIC ROUTES
# =============================================================================
# Known good IDs for testing dynamic routes like /view-split-lease/:id

TEST_IDS = {
    # Listing IDs
    "listing_id": "test-listing-123",  # TODO: Replace with real ID from Supabase

    # User IDs
    "user_id_host": "test-host-uuid",  # TODO: Replace with real host user ID
    "user_id_guest": "test-guest-uuid",  # TODO: Replace with real guest user ID

    # Help Center Categories
    "help_center_category": "guests",  # Known category: guests, hosts, etc.
}


def resolve_dynamic_route(page: PageClassification) -> str:
    """
    Resolve a dynamic route pattern to a concrete URL for testing

    Args:
        page: PageClassification with dynamic segment

    Returns:
        Concrete URL with test IDs substituted

    Examples:
        /view-split-lease/:id -> /view-split-lease/test-listing-123
        /account-profile/:userId -> /account-profile/test-host-uuid
    """
    if not page.has_dynamic_segment or not page.dynamic_pattern:
        return page.path

    url = page.dynamic_pattern

    # Substitute known test IDs
    if ":id" in url:
        url = url.replace(":id", TEST_IDS["listing_id"])

    if ":userId" in url:
        # Use appropriate user ID based on page type
        if page.auth_type == "guest":
            url = url.replace(":userId", TEST_IDS["user_id_guest"])
        else:
            url = url.replace(":userId", TEST_IDS["user_id_host"])

    if ":category" in url:
        url = url.replace(":category", TEST_IDS["help_center_category"])

    return url


def get_summary_stats(classifications: List[PageClassification]) -> Dict:
    """
    Get summary statistics for page classifications

    Args:
        classifications: List of page classifications

    Returns:
        Dictionary with summary stats
    """
    groups = group_pages_by_auth_type(classifications)

    return {
        "total_pages": len(classifications),
        "public_pages": len(groups["public"]),
        "host_pages": len(groups["host"]),
        "guest_pages": len(groups["guest"]),
        "shared_pages": len(groups["shared"]),
        "protected_pages": len(groups["host"]) + len(groups["guest"]) + len(groups["shared"]),
        "dynamic_routes": len([p for p in classifications if p.has_dynamic_segment]),
        "deprecated_pages": len([p for p in classifications if p.deprecated]),
        "dev_only_pages": len([p for p in classifications if p.dev_only]),
    }
