/**
 * Prepare Listing Submission
 *
 * Transforms local form data into the format expected by Bubble API
 * for creating or updating a listing via Edge Functions.
 */

import type { ListingFormData, NightlyPricing } from '../types/listing.types';

/**
 * Bubble listing field names and their expected types
 * Based on Bubble.io schema for the listing table
 */
interface BubbleListingPayload {
  // Basic Info
  Name: string;
  'Type of Space': string;
  Bedrooms: number;
  Beds: number;
  Bathrooms: number;
  'Type of Kitchen': string;
  'Type of Parking': string;

  // Address
  Address: string;
  'Street Number': string;
  Street: string;
  City: string;
  State: string;
  Zip: string;
  Neighborhood: string;
  Latitude: number | null;
  Longitude: number | null;

  // Amenities (comma-separated lists for Bubble)
  'Amenities Inside Unit': string[];
  'Amenities Outside Unit': string[];

  // Descriptions
  'Description of Lodging': string;
  'Neighborhood Description': string;

  // Lease Style
  'Rental Type': string;
  'Available Nights': string[]; // For nightly: ['sunday', 'monday', etc.]
  'Weekly Pattern': string;

  // Pricing
  'Damage Deposit': number;
  'Maintenance Fee': number;
  'Monthly Compensation': number | null;
  'Weekly Compensation': number | null;
  'Price 1 night selected': number | null;
  'Price 2 nights selected': number | null;
  'Price 3 nights selected': number | null;
  'Price 4 nights selected': number | null;
  'Price 5 nights selected': number | null;
  'Nightly Decay Rate': number | null;

  // Rules
  'Cancellation Policy': string;
  'Preferred Gender': string;
  'Number of Guests': number;
  'Check-In Time': string;
  'Check-Out Time': string;
  'Ideal Min Duration': number;
  'Ideal Max Duration': number;
  'House Rules': string[];
  'Blocked Dates': string[]; // ISO date strings

  // Safety & Review
  'Safety Features': string[];
  'Square Footage': number | null;
  'First Day Available': string;
  'Previous Reviews Link': string;
  'Optional Notes': string;

  // Status
  Status: string;
  'Is Draft': boolean;
}

/**
 * Transform available nights object to array of day names
 */
function transformAvailableNights(
  nights: ListingFormData['leaseStyles']['availableNights']
): string[] {
  if (!nights) return [];

  const result: string[] = [];
  if (nights.sunday) result.push('sunday');
  if (nights.monday) result.push('monday');
  if (nights.tuesday) result.push('tuesday');
  if (nights.wednesday) result.push('wednesday');
  if (nights.thursday) result.push('thursday');
  if (nights.friday) result.push('friday');
  if (nights.saturday) result.push('saturday');

  return result;
}

/**
 * Calculate nightly prices based on decay rate
 */
function calculateNightlyPrices(nightlyPricing: NightlyPricing | undefined): {
  price1: number | null;
  price2: number | null;
  price3: number | null;
  price4: number | null;
  price5: number | null;
} {
  if (!nightlyPricing || !nightlyPricing.oneNightPrice) {
    return { price1: null, price2: null, price3: null, price4: null, price5: null };
  }

  const { oneNightPrice, calculatedRates } = nightlyPricing;

  return {
    price1: oneNightPrice,
    price2: calculatedRates?.cumulativeNight2 ?? null,
    price3: calculatedRates?.cumulativeNight3 ?? null,
    price4: calculatedRates?.cumulativeNight4 ?? null,
    price5: calculatedRates?.cumulativeNight5 ?? null,
  };
}

/**
 * Transform blocked dates to ISO strings
 */
function transformBlockedDates(dates: Date[]): string[] {
  return dates.map((date) => {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
    return String(date);
  });
}

/**
 * Main transformation function
 *
 * Converts local ListingFormData to Bubble API payload format
 */
export function prepareListingSubmission(formData: ListingFormData): BubbleListingPayload {
  const { spaceSnapshot, features, leaseStyles, pricing, rules, review } = formData;

  // Calculate nightly prices if applicable
  const nightlyPrices = calculateNightlyPrices(pricing.nightlyPricing);

  const payload: BubbleListingPayload = {
    // Basic Info
    Name: spaceSnapshot.listingName,
    'Type of Space': spaceSnapshot.typeOfSpace,
    Bedrooms: spaceSnapshot.bedrooms,
    Beds: spaceSnapshot.beds,
    Bathrooms: spaceSnapshot.bathrooms,
    'Type of Kitchen': spaceSnapshot.typeOfKitchen,
    'Type of Parking': spaceSnapshot.typeOfParking,

    // Address
    Address: spaceSnapshot.address.fullAddress,
    'Street Number': spaceSnapshot.address.number,
    Street: spaceSnapshot.address.street,
    City: spaceSnapshot.address.city,
    State: spaceSnapshot.address.state,
    Zip: spaceSnapshot.address.zip,
    Neighborhood: spaceSnapshot.address.neighborhood,
    Latitude: spaceSnapshot.address.latitude ?? null,
    Longitude: spaceSnapshot.address.longitude ?? null,

    // Amenities
    'Amenities Inside Unit': features.amenitiesInsideUnit,
    'Amenities Outside Unit': features.amenitiesOutsideUnit,

    // Descriptions
    'Description of Lodging': features.descriptionOfLodging,
    'Neighborhood Description': features.neighborhoodDescription,

    // Lease Style
    'Rental Type': leaseStyles.rentalType,
    'Available Nights': transformAvailableNights(leaseStyles.availableNights),
    'Weekly Pattern': leaseStyles.weeklyPattern ?? '',

    // Pricing
    'Damage Deposit': pricing.damageDeposit,
    'Maintenance Fee': pricing.maintenanceFee,
    'Monthly Compensation': pricing.monthlyCompensation ?? null,
    'Weekly Compensation': pricing.weeklyCompensation ?? null,
    'Price 1 night selected': nightlyPrices.price1,
    'Price 2 nights selected': nightlyPrices.price2,
    'Price 3 nights selected': nightlyPrices.price3,
    'Price 4 nights selected': nightlyPrices.price4,
    'Price 5 nights selected': nightlyPrices.price5,
    'Nightly Decay Rate': pricing.nightlyPricing?.decayPerNight ?? null,

    // Rules
    'Cancellation Policy': rules.cancellationPolicy,
    'Preferred Gender': rules.preferredGender,
    'Number of Guests': rules.numberOfGuests,
    'Check-In Time': rules.checkInTime,
    'Check-Out Time': rules.checkOutTime,
    'Ideal Min Duration': rules.idealMinDuration,
    'Ideal Max Duration': rules.idealMaxDuration,
    'House Rules': rules.houseRules,
    'Blocked Dates': transformBlockedDates(rules.blockedDates),

    // Safety & Review
    'Safety Features': review.safetyFeatures ?? [],
    'Square Footage': review.squareFootage ?? null,
    'First Day Available': review.firstDayAvailable ?? '',
    'Previous Reviews Link': review.previousReviewsLink ?? '',
    'Optional Notes': review.optionalNotes ?? '',

    // Status
    Status: 'Pending Review',
    'Is Draft': false,
  };

  console.log('📤 Prepared Bubble submission payload:', payload);
  return payload;
}

/**
 * Prepare a draft save payload (subset of fields)
 */
export function prepareDraftPayload(
  formData: ListingFormData
): Partial<BubbleListingPayload> & { 'Is Draft': boolean } {
  const fullPayload = prepareListingSubmission(formData);

  return {
    ...fullPayload,
    Status: 'Draft',
    'Is Draft': true,
  };
}

/**
 * Get photo upload payload
 *
 * Photos are typically uploaded separately before the listing submission.
 * This prepares the photo metadata for association with the listing.
 */
export function preparePhotoPayload(
  formData: ListingFormData
): { photos: Array<{ url: string; caption: string; order: number }> } {
  return {
    photos: formData.photos.photos.map((photo, index) => ({
      url: photo.url,
      caption: photo.caption ?? '',
      order: photo.displayOrder ?? index,
    })),
  };
}

/**
 * Validate that the payload meets Bubble API requirements
 */
export function validateBubblePayload(
  payload: BubbleListingPayload
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!payload.Name) errors.push('Name is required');
  if (!payload['Type of Space']) errors.push('Type of Space is required');
  if (!payload.Address) errors.push('Address is required');
  if (!payload['Rental Type']) errors.push('Rental Type is required');

  // Pricing validation based on rental type
  if (payload['Rental Type'] === 'Monthly' && !payload['Monthly Compensation']) {
    errors.push('Monthly Compensation is required for Monthly rentals');
  }
  if (payload['Rental Type'] === 'Weekly' && !payload['Weekly Compensation']) {
    errors.push('Weekly Compensation is required for Weekly rentals');
  }
  if (payload['Rental Type'] === 'Nightly' && !payload['Price 1 night selected']) {
    errors.push('Nightly pricing is required for Nightly rentals');
  }

  // Damage deposit minimum
  if (payload['Damage Deposit'] < 500) {
    errors.push('Damage Deposit must be at least $500');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export type { BubbleListingPayload };
