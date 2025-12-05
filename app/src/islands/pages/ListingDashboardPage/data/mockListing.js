/**
 * Mock listing data matching the Bubble listing dashboard structure
 * Based on: https://app.split.lease/version-live/listing-dashboard/1743790812920x538927313033625600
 */

export const mockListing = {
  id: '1743790812920x538927313033625600',

  // Property Info
  title: 'Sunny, Spacious One-Bedroom Apartment with Modern Finishes and City Views in Downtown Harlem, Featuring Doorman, Laundry Room, and Common Outdoor Space',
  description: 'Sunny and spacious two-bedroom haven nestled in the vibrant heart of downtown! This stunning apartment boasts an open-concept living area, graced with large windows that provide breathtaking views of the city skyline. Relish a cozy ambiance accentuated by modern finishes and elegant hardwood floors. Picture yourself sipping your morning coffee on the private balcony, overlooking the serene and beautifully landscaped courtyard. This gem is an opportunity not to be missed! Schedule a viewing today...',
  descriptionNeighborhood: 'Nestled within a vibrant community, this neighborhood offers a delightful blend of urban convenience and suburban serenity. Tree-lined streets provide a picturesque backdrop, while well-maintained sidewalks invite leisurely strolls and outdoor activities. The local parks serve as green oases, featuring playgrounds, walking trails, and picnic areas, making them ideal for family outings or a peaceful retreat. Residents enjoy access to a variety of amenities, including trendy cafes, gourmet restaurants, and boutique shops.',

  // Location
  location: {
    id: 'loc1',
    address: '157 E 115th St, New York, NY 10029, USA',
    hoodsDisplay: 'East Harlem',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    zipCode: '10029',
    latitude: 40.7982,
    longitude: -73.9428,
  },

  // Status
  status: 'In Split Lease Review', // 'Online', 'Offline', 'In Review', 'In Split Lease Review'
  isOnline: false,
  createdAt: new Date('2025-04-04'),
  activeSince: new Date('2025-04-04'),
  updatedAt: new Date('2025-12-04'),

  // Property Details
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
      display: 'Kitchenette',
    },
    storageType: {
      id: 'st1',
      label: 'In a locked closet',
    },
    qtyGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    squareFootage: 200,
  },

  // Amenities - In-unit
  inUnitAmenities: [
    { id: 'a1', name: 'Air Conditioned', icon: 'snowflake' },
    { id: 'a2', name: 'Closet', icon: 'archive' },
    { id: 'a3', name: 'Hangers', icon: 'hanger' },
    { id: 'a4', name: 'Towels and Linens', icon: 'towel' },
    { id: 'a5', name: 'TV', icon: 'tv' },
    { id: 'a6', name: 'WiFi', icon: 'wifi' },
  ],

  // Amenities - Building/Neighborhood
  buildingAmenities: [
    { id: 'b1', name: 'Doorman', icon: 'user-shield' },
    { id: 'b2', name: 'Laundry Room', icon: 'washing-machine' },
    { id: 'b3', name: 'Package Room', icon: 'package' },
    { id: 'b4', name: 'Elevator', icon: 'elevator' },
    { id: 'b5', name: 'Common Outdoor Space', icon: 'tree' },
    { id: 'b6', name: 'Bike Storage', icon: 'bike' },
  ],

  // Safety Features
  safetyFeatures: [
    { id: 'sf1', name: 'Smoke Detector', icon: 'smoke' },
    { id: 'sf2', name: 'Carbon Monoxide Detector', icon: 'alert-circle' },
    { id: 'sf3', name: 'First Aid Kit', icon: 'first-aid' },
    { id: 'sf4', name: 'Fire Sprinklers', icon: 'droplet' },
    { id: 'sf5', name: 'Lock on Bedroom Door', icon: 'lock' },
    { id: 'sf6', name: 'Fire Extinguisher', icon: 'fire-extinguisher' },
  ],

  // House Rules
  houseRules: [
    { id: 'hr1', name: 'Take Out Trash', icon: 'trash' },
    { id: 'hr2', name: 'No Food In Sink', icon: 'utensils-crossed' },
    { id: 'hr3', name: 'Lock Doors', icon: 'lock' },
    { id: 'hr4', name: 'Wash Your Dishes', icon: 'dishes' },
    { id: 'hr5', name: 'No Smoking Inside', icon: 'cigarette-off' },
    { id: 'hr6', name: 'No Candles', icon: 'flame-off' },
  ],

  // Guest Preferences
  preferredGender: {
    id: 'pg1',
    display: 'Female',
  },
  maxGuests: 2,

  // Pricing and Lease Style
  leaseStyle: 'Nightly',
  nightsPerWeekMin: 2,
  nightsPerWeekMax: 7,
  availableDays: [0, 1, 2, 3, 4, 5, 6], // All days available (0=Sun, 6=Sat)
  nightsAvailable: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], // Night IDs for HostScheduleSelector

  pricing: {
    2: 350,  // $350/night * 2 = $700/week
    3: 175,  // $175/night * 3 = $525/week
    4: 175,  // $175/night * 4 = $700/week
    5: 175,  // $175/night * 5 = $875/week
    6: 175,  // $175/night * 6 = $1,050/week
    7: 175,  // $175/night * 7 = $1,225/week
  },

  weeklyCompensation: {
    2: 700,
    3: 525,
    4: 700,
    5: 875,
    6: 1050,
    7: 1225,
  },

  damageDeposit: 500,
  maintenanceFee: 250,

  // Availability
  leaseTermMin: 6,   // weeks
  leaseTermMax: 52,  // weeks
  earliestAvailableDate: new Date('2025-12-05'),
  checkInTime: '1:00 pm',
  checkOutTime: '1:00 pm',
  blockedDates: [],

  // Cancellation Policy
  cancellationPolicy: 'Standard', // 'Standard', 'Additional Host Restrictions'

  // Photos
  photos: [
    {
      id: 'p1',
      url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
      isCover: true,
      photoType: 'Living Room',
    },
    {
      id: 'p2',
      url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
      isCover: false,
      photoType: 'Bedroom',
    },
    {
      id: 'p3',
      url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
      isCover: false,
      photoType: 'Bathroom',
    },
    {
      id: 'p4',
      url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
      isCover: false,
      photoType: 'Kitchen',
    },
    {
      id: 'p5',
      url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400',
      isCover: false,
      photoType: 'Living Room',
    },
    {
      id: 'p6',
      url: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=400',
      isCover: false,
      photoType: 'Bedroom',
    },
  ],

  // Virtual Tour
  virtualTourUrl: null,
};

export const mockCounts = {
  proposals: 3,
  virtualMeetings: 1,
  leases: 0,
  notifications: 3,
};
