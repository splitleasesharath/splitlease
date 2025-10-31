/**
 * Domain models with Zod schemas for runtime validation
 * These models represent the core business entities of the SplitLease marketplace
 */

import { z } from 'zod';

/**
 * Schedule pattern for when a property is available
 */
export const SchedulePatternSchema = z.object({
  weeknights: z.boolean().default(false),
  weekends: z.boolean().default(false),
  customDays: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday, 6 = Saturday
});

export type SchedulePattern = z.infer<typeof SchedulePatternSchema>;

/**
 * Property listing in the marketplace
 */
export const ListingSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string().default('USA'),
  }),
  pricePerNight: z.number().positive(),
  schedule: SchedulePatternSchema,
  amenities: z.array(z.string()),
  images: z.array(
    z.object({
      url: z.string().url(),
      alt: z.string(),
      isPrimary: z.boolean().default(false),
    })
  ),
  bedrooms: z.number().int().positive(),
  bathrooms: z.number().positive(),
  maxGuests: z.number().int().positive(),
  ownerId: z.string().uuid(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Listing = z.infer<typeof ListingSchema>;

/**
 * User account in the system
 */
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  role: z.enum(['guest', 'owner', 'admin']),
  verified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Booking/reservation for a listing
 */
export const BookingSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  guestId: z.string().uuid(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  totalPrice: z.number().positive(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  guestCount: z.number().int().positive(),
  specialRequests: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Booking = z.infer<typeof BookingSchema>;

/**
 * Proposal/offer for a listing
 */
export const ProposalSchema = z.object({
  id: z.string().uuid(),
  listingId: z.string().uuid(),
  guestId: z.string().uuid(),
  proposedPrice: z.number().positive(),
  proposedSchedule: SchedulePatternSchema,
  message: z.string().max(1000).optional(),
  status: z.enum(['pending', 'accepted', 'rejected', 'countered']),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Proposal = z.infer<typeof ProposalSchema>;

/**
 * Review/rating for a listing or user
 */
export const ReviewSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  revieweeId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(2000).optional(),
  type: z.enum(['listing', 'guest', 'owner']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Review = z.infer<typeof ReviewSchema>;

/**
 * Search filters for listings
 */
export const SearchFiltersSchema = z.object({
  location: z.string().optional(),
  checkIn: z.string().datetime().optional(),
  checkOut: z.string().datetime().optional(),
  guests: z.number().int().positive().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
  schedulePattern: SchedulePatternSchema.optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
