/**
 * MSW Request Handlers
 *
 * Mock API handlers for testing. These intercept network requests
 * and return mock responses, allowing tests to run without a backend.
 *
 * See: https://mswjs.io/docs/basics/request-handler
 */

import { http, HttpResponse } from 'msw';
import { createMockListings } from '../factories/homepage';

// Mock API base URL
const API_BASE = 'http://localhost:3000/api';

export const handlers = [
  // Homepage popular listings endpoint
  http.get(`${API_BASE}/v1/listings/popular`, () => {
    const listings = createMockListings(6);
    return HttpResponse.json({
      success: true,
      data: { listings },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
    });
  }),

  // Search listings endpoint
  http.get(`${API_BASE}/listings/search`, ({ request }) => {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const listings = createMockListings(limit);

    return HttpResponse.json({
      success: true,
      data: {
        results: listings.map(listing => ({
          id: listing.id,
          title: listing.title,
          location: {
            city: listing.location.split(',')[0],
            state: 'NY',
            country: 'USA',
          },
          price: listing.pricePerNight,
          availableFrom: '2024-01-01',
          availableTo: '2024-12-31',
        })),
        total: listings.length,
        page: 1,
        limit,
      },
    });
  }),

  // Example: Mock get listing by ID
  http.get(`${API_BASE}/listings/:id`, ({ params }) => {
    const { id } = params;

    return HttpResponse.json({
      success: true,
      data: {
        id,
        title: 'Cozy 2BR in Downtown',
        description: 'Beautiful apartment in the heart of the city',
        location: {
          address: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          country: 'USA',
          zipCode: '94102',
        },
        price: 2500,
        availableFrom: '2024-01-01',
        availableTo: '2024-12-31',
        bedrooms: 2,
        bathrooms: 1,
        amenities: ['wifi', 'parking', 'laundry'],
        images: [
          {
            id: 'img1',
            url: 'https://example.com/image1.jpg',
            alt: 'Living room',
          },
        ],
        host: {
          id: 'host1',
          name: 'John Doe',
          avatar: 'https://example.com/avatar.jpg',
        },
      },
    });
  }),

  // Example: Mock API error
  http.get(`${API_BASE}/listings/error`, () => {
    return HttpResponse.json(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Listing not found',
        },
      },
      { status: 404 }
    );
  }),
];
