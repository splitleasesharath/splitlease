/**
 * MSW (Mock Service Worker) request handlers
 * Defines mock API responses for testing
 */

import { http, HttpResponse } from 'msw';
import { API_BASE_PATH } from '../../api/config';
import {
  createMockListing,
  createMockListings,
  createMockUser,
  createMockBooking,
  createMockProposal,
} from '../factories';

/**
 * API request handlers
 */
export const handlers = [
  // Auth endpoints
  http.post(`${API_BASE_PATH}/auth/login`, async () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        user: createMockUser({ role: 'guest' }),
      },
    });
  }),

  http.post(`${API_BASE_PATH}/auth/register`, async () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        user: createMockUser({ role: 'guest', verified: false }),
      },
    });
  }),

  http.post(`${API_BASE_PATH}/auth/logout`, async () => {
    return HttpResponse.json({ success: true });
  }),

  // User endpoints
  http.get(`${API_BASE_PATH}/users/me`, async () => {
    return HttpResponse.json({
      success: true,
      data: createMockUser(),
    });
  }),

  http.get(`${API_BASE_PATH}/users/:id`, async ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createMockUser({ id: params.id as string }),
    });
  }),

  http.put(`${API_BASE_PATH}/users/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: createMockUser({ id: params.id as string, ...body }),
    });
  }),

  // Listing endpoints
  http.get(`${API_BASE_PATH}/listings/search`, async ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    const listings = createMockListings(pageSize, { status: 'active' });

    return HttpResponse.json({
      success: true,
      data: {
        items: listings,
        pagination: {
          page,
          pageSize,
          totalPages: 5,
          totalItems: 100,
          hasNext: page < 5,
          hasPrev: page > 1,
        },
      },
    });
  }),

  http.get(`${API_BASE_PATH}/listings/:id`, async ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createMockListing({ id: params.id as string, status: 'active' }),
    });
  }),

  http.post(`${API_BASE_PATH}/listings`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: createMockListing({ ...body, status: 'draft' }),
    });
  }),

  http.put(`${API_BASE_PATH}/listings/:id`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: createMockListing({ id: params.id as string, ...body }),
    });
  }),

  http.delete(`${API_BASE_PATH}/listings/:id`, async () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE_PATH}/listings/my-listings`, async ({ request }) => {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    const listings = createMockListings(5);

    return HttpResponse.json({
      success: true,
      data: {
        items: listings,
        pagination: {
          page,
          pageSize,
          totalPages: 1,
          totalItems: 5,
          hasNext: false,
          hasPrev: false,
        },
      },
    });
  }),

  // Booking endpoints
  http.post(`${API_BASE_PATH}/bookings`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: createMockBooking({ ...body, status: 'pending' }),
    });
  }),

  http.get(`${API_BASE_PATH}/bookings/:id`, async ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createMockBooking({ id: params.id as string }),
    });
  }),

  http.post(`${API_BASE_PATH}/bookings/:id/cancel`, async ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createMockBooking({ id: params.id as string, status: 'cancelled' }),
    });
  }),

  http.get(`${API_BASE_PATH}/bookings/my-bookings`, async () => {
    const bookings = [
      createMockBooking({ status: 'confirmed' }),
      createMockBooking({ status: 'pending' }),
    ];

    return HttpResponse.json({
      success: true,
      data: {
        items: bookings,
        pagination: {
          page: 1,
          pageSize: 20,
          totalPages: 1,
          totalItems: 2,
          hasNext: false,
          hasPrev: false,
        },
      },
    });
  }),

  // Proposal endpoints
  http.post(`${API_BASE_PATH}/proposals`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: createMockProposal({ ...body, status: 'pending' }),
    });
  }),

  http.get(`${API_BASE_PATH}/proposals/:id`, async ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createMockProposal({ id: params.id as string }),
    });
  }),

  http.post(`${API_BASE_PATH}/proposals/:id/accept`, async ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createMockProposal({ id: params.id as string, status: 'accepted' }),
    });
  }),

  http.post(`${API_BASE_PATH}/proposals/:id/reject`, async ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: createMockProposal({ id: params.id as string, status: 'rejected' }),
    });
  }),
];
