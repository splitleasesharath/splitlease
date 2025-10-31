/**
 * Core Domain Models
 *
 * TypeScript interfaces and Zod schemas for SplitLease domain entities.
 * Each model includes both a TypeScript interface (for compile-time type checking)
 * and a Zod schema (for runtime validation).
 */

import { z } from 'zod';

// ============================================================================
// Location Types
// ============================================================================

export const LocationSchema = z.object({
  address: z.string().optional(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  zipCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type Location = z.infer<typeof LocationSchema>;

// ============================================================================
// Amenity Types
// ============================================================================

export const AmenitySchema = z.enum([
  'wifi',
  'parking',
  'laundry',
  'gym',
  'pool',
  'ac',
  'heating',
  'dishwasher',
  'tv',
  'workspace',
  'kitchen',
  'petsAllowed',
  'smoking',
  'wheelchair',
  'elevator',
  'securitySystem',
]);

export type Amenity = z.infer<typeof AmenitySchema>;

// ============================================================================
// Image Types
// ============================================================================

export const ImageSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  alt: z.string(),
  caption: z.string().optional(),
  order: z.number().optional(),
});

export type Image = z.infer<typeof ImageSchema>;

// ============================================================================
// User Types
// ============================================================================

export const UserRoleSchema = z.enum(['guest', 'host', 'admin']);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  role: UserRoleSchema,
  verified: z.boolean().default(false),
  bio: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type User = z.infer<typeof UserSchema>;

// ============================================================================
// SplitLease Listing Types
// ============================================================================

export const ListingStatusSchema = z.enum([
  'draft',
  'active',
  'inactive',
  'archived',
]);

export type ListingStatus = z.infer<typeof ListingStatusSchema>;

export const SplitLeaseSchema = z.object({
  id: z.string(),
  title: z.string().min(10).max(200),
  description: z.string().min(50),
  location: LocationSchema,
  price: z.number().positive(),
  priceFrequency: z.enum(['monthly', 'weekly', 'daily']).default('monthly'),
  availableFrom: z.string().datetime(),
  availableTo: z.string().datetime(),
  bedrooms: z.number().int().positive(),
  bathrooms: z.number().positive(),
  squareFeet: z.number().positive().optional(),
  maxOccupants: z.number().int().positive().optional(),
  amenities: z.array(AmenitySchema),
  images: z.array(ImageSchema).min(1),
  hostId: z.string(),
  host: UserSchema.optional(),
  status: ListingStatusSchema.default('draft'),
  minimumStay: z.number().int().positive().optional(),
  maximumStay: z.number().int().positive().optional(),
  rules: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  viewCount: z.number().int().default(0),
  featured: z.boolean().default(false),
});

export type SplitLease = z.infer<typeof SplitLeaseSchema>;

// ============================================================================
// Booking Types
// ============================================================================

export const BookingStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'rejected',
]);

export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const BookingSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  listing: SplitLeaseSchema.optional(),
  guestId: z.string(),
  guest: UserSchema.optional(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  guests: z.number().int().positive(),
  totalPrice: z.number().positive(),
  status: BookingStatusSchema.default('pending'),
  specialRequests: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  cancellationReason: z.string().optional(),
});

export type Booking = z.infer<typeof BookingSchema>;

// ============================================================================
// Review Types
// ============================================================================

export const ReviewSchema = z.object({
  id: z.string(),
  bookingId: z.string(),
  listingId: z.string(),
  authorId: z.string(),
  author: UserSchema.optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

export type Review = z.infer<typeof ReviewSchema>;

// ============================================================================
// Message Types
// ============================================================================

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  senderId: z.string(),
  sender: UserSchema.optional(),
  recipientId: z.string(),
  recipient: UserSchema.optional(),
  content: z.string().min(1).max(2000),
  read: z.boolean().default(false),
  createdAt: z.string().datetime(),
});

export type Message = z.infer<typeof MessageSchema>;

// ============================================================================
// Search Filter Types
// ============================================================================

export const SearchFiltersSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().positive().optional(),
  amenities: z.array(AmenitySchema).optional(),
  availableFrom: z.string().datetime().optional(),
  availableTo: z.string().datetime().optional(),
  sortBy: z
    .enum(['price', 'date', 'rating', 'relevance'])
    .default('relevance')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
});

export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
