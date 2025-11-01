/**
 * Test data factories for homepage components
 * Provides realistic mock data for unit and integration tests
 */

import { faker } from '@faker-js/faker';

export interface Listing {
  id: string;
  title: string;
  location: string;
  bedrooms: number;
  bathrooms: number;
  pricePerNight: number;
  imageUrl: string;
  availableDays: number[];
  rating?: number;
  reviewCount?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  isAuthenticated: boolean;
}

export interface ScheduleSelection {
  days: number[];
  checkIn?: string;
  checkOut?: string;
}

/**
 * Creates a mock listing with realistic data
 * @param overrides - Optional property overrides
 * @returns Mock listing object
 */
export function createMockListing(overrides?: Partial<Listing>): Listing {
  const bedrooms = overrides?.bedrooms ?? faker.number.int({ min: 0, max: 3 });

  return {
    id: faker.string.uuid(),
    title: faker.location.streetAddress(),
    location: `${faker.location.city()}, NY`,
    bedrooms,
    bathrooms: faker.number.int({ min: 1, max: 2 }),
    pricePerNight: faker.number.int({ min: 100, max: 400 }),
    imageUrl: faker.image.urlLoremFlickr({ category: 'apartment', width: 800, height: 600 }),
    availableDays: Array.from({ length: 7 }, (_, i) => i),
    rating: faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 }),
    reviewCount: faker.number.int({ min: 5, max: 150 }),
    ...overrides,
  };
}

/**
 * Creates multiple mock listings
 * @param count - Number of listings to create
 * @returns Array of mock listings
 */
export function createMockListings(count: number = 5): Listing[] {
  return Array.from({ length: count }, () => createMockListing());
}

/**
 * Creates a mock user
 * @param overrides - Optional property overrides
 * @returns Mock user object
 */
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    isAuthenticated: true,
    ...overrides,
  };
}

/**
 * Creates a mock schedule selection
 * @param days - Array of day indices (0-6)
 * @returns Mock schedule selection
 */
export function createScheduleSelection(days: number[] = [1, 2, 3, 4]): ScheduleSelection {
  return {
    days,
    checkIn: days.length > 0 ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][days[0]] : undefined,
    checkOut: days.length > 0 ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][days[days.length - 1]] : undefined,
  };
}

/**
 * Creates a mock listing with zero bedrooms (Studio)
 */
export function createStudioListing(overrides?: Partial<Listing>): Listing {
  return createMockListing({
    bedrooms: 0,
    ...overrides,
  });
}

/**
 * Creates weekend schedule (Friday, Saturday, Sunday)
 */
export function createWeekendSchedule(): ScheduleSelection {
  return createScheduleSelection([5, 6, 0]);
}

/**
 * Creates weeknight schedule (Monday-Thursday)
 */
export function createWeeknightSchedule(): ScheduleSelection {
  return createScheduleSelection([1, 2, 3, 4]);
}
