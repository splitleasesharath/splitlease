import { Listing, ListingCounts } from '../types/listing.types';

export const mockListing: Listing = {
  id: '1',
  location: {
    id: 'loc1',
    address: '123 Main Street, Apt 4B',
    hoodsDisplay: 'Downtown',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    zipCode: '10001',
    latitude: 40.7128,
    longitude: -74.006,
  },
  features: {
    id: 'feat1',
    typeOfSpace: {
      id: 'ts1',
      label: 'Entire Place',
    },
    parkingType: {
      id: 'pt1',
      label: 'Street Parking',
    },
    kitchenType: {
      id: 'kt1',
      display: 'Full Kitchen',
    },
    qtyGuests: 4,
    bedrooms: 2,
    bathrooms: 1.5,
    squareFootage: 850,
  },
  rentalType: {
    id: 'rt1',
    display: 'Monthly',
  },
  preferredGender: {
    id: 'pg1',
    display: 'Any',
  },
  isOnline: true,
  activeSince: new Date('2024-01-15'),
  monthlyHostRate: 2500,
  damageDeposit: 1000,
  cleaningCost: 150,
  minimumNights: 30,
  maximumNights: 365,
  idealLeaseMonthsMin: 3,
  idealLeaseMonthsMax: 12,
  idealLeaseWeeksMin: 12,
  idealLeaseWeeksMax: 52,
  earliestRentDate: new Date('2024-12-01'),
  checkInTime: '15:00',
  checkOutTime: '11:00',
  description:
    'Beautiful 2-bedroom apartment in the heart of downtown. Features include hardwood floors, stainless steel appliances, and lots of natural light. Close to public transportation, restaurants, and shops.',
  descriptionNeighborhood:
    'Downtown is a vibrant neighborhood with easy access to everything the city has to offer. Great restaurants, nightlife, and cultural attractions are all within walking distance.',
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-11-20'),
  photos: [
    {
      id: 'p1',
      listingId: '1',
      photoType: { id: 'pt1', name: 'Living Room' },
      isCoverPhoto: true,
      imageUrl: '/images/living-room.jpg',
      orderIndex: 0,
      createdAt: new Date('2024-01-10'),
    },
  ],
  videos: [],
  amenities: [
    { id: 'a1', name: 'WiFi', category: 'in_unit', icon: 'wifi' },
    { id: 'a2', name: 'Air Conditioning', category: 'in_unit', icon: 'ac' },
    { id: 'a3', name: 'Heating', category: 'in_unit', icon: 'heat' },
    { id: 'a4', name: 'Washer/Dryer', category: 'in_unit', icon: 'washer' },
    { id: 'a5', name: 'Gym', category: 'building', icon: 'gym' },
    { id: 'a6', name: 'Pool', category: 'building', icon: 'pool' },
  ],
  safetyFeatures: [
    { id: 'sf1', name: 'Smoke Detector', icon: 'smoke' },
    { id: 'sf2', name: 'Carbon Monoxide Detector', icon: 'co' },
    { id: 'sf3', name: 'Fire Extinguisher', icon: 'fire' },
    { id: 'sf4', name: 'First Aid Kit', icon: 'medical' },
  ],
  blockedDates: [],
};

export const mockCounts: ListingCounts = {
  proposals: 3,
  virtualMeetings: 2,
  leases: 1,
};
