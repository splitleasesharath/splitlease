/**
 * Analytics tracking utilities
 * Provides a consistent interface for tracking user events and page views
 */

import { ANALYTICS_EVENTS } from './constants';

/**
 * Analytics event properties
 */
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Analytics provider interface
 */
export interface AnalyticsProvider {
  track(event: string, properties?: Record<string, unknown>): void;
  page(name: string, properties?: Record<string, unknown>): void;
  identify(userId: string, traits?: Record<string, unknown>): void;
}

/**
 * Internal event queue for batching
 */
let eventQueue: AnalyticsEvent[] = [];

/**
 * Check if analytics is enabled (based on user consent or environment)
 */
function isAnalyticsEnabled(): boolean {
  // In development, analytics is disabled by default
  if (import.meta.env?.DEV) {
    return false;
  }

  // Check for user consent (placeholder - implement based on your consent mechanism)
  const consent = localStorage.getItem('analytics_consent');
  return consent === 'true';
}

/**
 * Track an event
 * @param eventName - Event name
 * @param properties - Event properties
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (!isAnalyticsEnabled()) {
    console.log('[Analytics] Event (disabled):', eventName, properties);
    return;
  }

  const event: AnalyticsEvent = {
    name: eventName,
    properties,
    timestamp: Date.now(),
  };

  // Add to queue
  eventQueue.push(event);

  // Send to analytics provider (placeholder - implement based on your provider)
  console.log('[Analytics] Event:', eventName, properties);

  // Example: Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, properties);
  }
}

/**
 * Track page view
 * @param pageName - Page name or path
 * @param properties - Additional properties
 */
export function trackPageView(pageName: string, properties?: Record<string, unknown>): void {
  trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, {
    page: pageName,
    ...properties,
  });
}

/**
 * Track listing view
 * @param listingId - Listing ID
 * @param properties - Additional properties
 */
export function trackListingView(listingId: string, properties?: Record<string, unknown>): void {
  trackEvent(ANALYTICS_EVENTS.LISTING_VIEW, {
    listingId,
    ...properties,
  });
}

/**
 * Track listing search
 * @param filters - Search filters
 */
export function trackListingSearch(filters: Record<string, unknown>): void {
  trackEvent(ANALYTICS_EVENTS.LISTING_SEARCH, {
    filters,
  });
}

/**
 * Track booking initiated
 * @param listingId - Listing ID
 * @param properties - Additional properties
 */
export function trackBookingInitiated(
  listingId: string,
  properties?: Record<string, unknown>
): void {
  trackEvent(ANALYTICS_EVENTS.BOOKING_INITIATED, {
    listingId,
    ...properties,
  });
}

/**
 * Track booking completed
 * @param bookingId - Booking ID
 * @param properties - Additional properties
 */
export function trackBookingCompleted(
  bookingId: string,
  properties?: Record<string, unknown>
): void {
  trackEvent(ANALYTICS_EVENTS.BOOKING_COMPLETED, {
    bookingId,
    ...properties,
  });
}

/**
 * Track proposal submitted
 * @param listingId - Listing ID
 * @param properties - Additional properties
 */
export function trackProposalSubmitted(
  listingId: string,
  properties?: Record<string, unknown>
): void {
  trackEvent(ANALYTICS_EVENTS.PROPOSAL_SUBMITTED, {
    listingId,
    ...properties,
  });
}

/**
 * Track user registration
 * @param userId - User ID
 * @param properties - Additional properties
 */
export function trackUserRegistered(userId: string, properties?: Record<string, unknown>): void {
  trackEvent(ANALYTICS_EVENTS.USER_REGISTERED, {
    userId,
    ...properties,
  });
}

/**
 * Track user login
 * @param userId - User ID
 * @param properties - Additional properties
 */
export function trackUserLogin(userId: string, properties?: Record<string, unknown>): void {
  trackEvent(ANALYTICS_EVENTS.USER_LOGIN, {
    userId,
    ...properties,
  });
}

/**
 * Track error
 * @param error - Error object or message
 * @param context - Error context
 */
export function trackError(error: Error | string, context?: Record<string, unknown>): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  trackEvent(ANALYTICS_EVENTS.ERROR_OCCURRED, {
    error: errorMessage,
    stack: errorStack,
    ...context,
  });
}

/**
 * Identify user for analytics
 * @param userId - User ID
 * @param traits - User traits
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (!isAnalyticsEnabled()) {
    console.log('[Analytics] Identify (disabled):', userId, traits);
    return;
  }

  console.log('[Analytics] Identify:', userId, traits);

  // Example: Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
      user_id: userId,
      ...traits,
    });
  }
}

/**
 * Get queued events (useful for debugging or manual sending)
 * @returns Array of queued events
 */
export function getQueuedEvents(): AnalyticsEvent[] {
  return [...eventQueue];
}

/**
 * Clear event queue
 */
export function clearEventQueue(): void {
  eventQueue = [];
}

/**
 * Enable analytics (set user consent)
 */
export function enableAnalytics(): void {
  localStorage.setItem('analytics_consent', 'true');
}

/**
 * Disable analytics (revoke user consent)
 */
export function disableAnalytics(): void {
  localStorage.setItem('analytics_consent', 'false');
  clearEventQueue();
}
