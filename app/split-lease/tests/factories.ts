/**
 * Test data factories using Faker
 * Provides functions to generate realistic test data
 */

import { faker } from '@faker-js/faker';
import type { Listing, User, Booking, Proposal, Review, SchedulePattern } from '../types/models';

/**
 * Generate a mock schedule pattern
 */
export function createMockSchedulePattern(
  overrides?: Partial<SchedulePattern>
): SchedulePattern {
  return {
    weeknights: faker.datatype.boolean(),
    weekends: faker.datatype.boolean(),
    customDays: faker.helpers.maybe(() =>
      faker.helpers.arrayElements([0, 1, 2, 3, 4, 5, 6], { min: 1, max: 7 })
    ),
    ...overrides,
  };
}

/**
 * Generate a mock listing
 */
export function createMockListing(overrides?: Partial<Listing>): Listing {
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.paragraphs(2),
    address: {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: 'USA',
    },
    pricePerNight: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
    schedule: createMockSchedulePattern(),
    amenities: faker.helpers.arrayElements(
      ['WiFi', 'Kitchen', 'Washer', 'Dryer', 'Pool', 'Parking'],
      { min: 2, max: 6 }
    ),
    images: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, (_, i) => ({
      url: faker.image.urlLoremFlickr({ category: 'house' }),
      alt: `Property image ${i + 1}`,
      isPrimary: i === 0,
    })),
    bedrooms: faker.number.int({ min: 1, max: 5 }),
    bathrooms: faker.number.float({ min: 1, max: 4, multipleOf: 0.5 }),
    maxGuests: faker.number.int({ min: 1, max: 10 }),
    ownerId: faker.string.uuid(),
    status: faker.helpers.arrayElement(['draft', 'active', 'inactive', 'archived'] as const),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Generate a mock user
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    avatar: faker.image.avatar(),
    role: faker.helpers.arrayElement(['guest', 'owner', 'admin'] as const),
    verified: faker.datatype.boolean(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Generate a mock booking
 */
export function createMockBooking(overrides?: Partial<Booking>): Booking {
  const checkIn = faker.date.future();
  const checkOut = faker.date.soon({ days: 7, refDate: checkIn });

  return {
    id: faker.string.uuid(),
    listingId: faker.string.uuid(),
    guestId: faker.string.uuid(),
    checkIn: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    totalPrice: parseFloat(faker.commerce.price({ min: 200, max: 2000 })),
    status: faker.helpers.arrayElement(['pending', 'confirmed', 'cancelled', 'completed'] as const),
    guestCount: faker.number.int({ min: 1, max: 8 }),
    specialRequests: faker.helpers.maybe(() => faker.lorem.sentence()),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Generate a mock proposal
 */
export function createMockProposal(overrides?: Partial<Proposal>): Proposal {
  return {
    id: faker.string.uuid(),
    listingId: faker.string.uuid(),
    guestId: faker.string.uuid(),
    proposedPrice: parseFloat(faker.commerce.price({ min: 50, max: 500 })),
    proposedSchedule: createMockSchedulePattern(),
    message: faker.helpers.maybe(() => faker.lorem.paragraph()),
    status: faker.helpers.arrayElement(['pending', 'accepted', 'rejected', 'countered'] as const),
    expiresAt: faker.date.future().toISOString(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Generate a mock review
 */
export function createMockReview(overrides?: Partial<Review>): Review {
  return {
    id: faker.string.uuid(),
    bookingId: faker.string.uuid(),
    reviewerId: faker.string.uuid(),
    revieweeId: faker.string.uuid(),
    rating: faker.number.int({ min: 1, max: 5 }),
    comment: faker.helpers.maybe(() => faker.lorem.paragraph()),
    type: faker.helpers.arrayElement(['listing', 'guest', 'owner'] as const),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

/**
 * Generate multiple mock listings
 */
export function createMockListings(count: number, overrides?: Partial<Listing>): Listing[] {
  return Array.from({ length: count }, () => createMockListing(overrides));
}

/**
 * Generate multiple mock users
 */
export function createMockUsers(count: number, overrides?: Partial<User>): User[] {
  return Array.from({ length: count }, () => createMockUser(overrides));
}

/**
 * Generate multiple mock bookings
 */
export function createMockBookings(count: number, overrides?: Partial<Booking>): Booking[] {
  return Array.from({ length: count }, () => createMockBooking(overrides));
}

/**
 * Generate multiple mock proposals
 */
export function createMockProposals(count: number, overrides?: Partial<Proposal>): Proposal[] {
  return Array.from({ length: count }, () => createMockProposal(overrides));
}

/**
 * Generate multiple mock reviews
 */
export function createMockReviews(count: number, overrides?: Partial<Review>): Review[] {
  return Array.from({ length: count }, () => createMockReview(overrides));
}
