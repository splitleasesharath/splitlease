/**
 * Self-Listing Page Type Definitions
 * Based on Bubble.io self-listing page schema
 */

// Rental Type Options
export type RentalType = 'Nightly' | 'Weekly' | 'Monthly';

// Lease Style Options
export type LeaseStyle = 'traditional' | 'flex' | 'subsidy';

// Space Type Options
export type SpaceType = 'Private Room' | 'Entire Place' | 'Shared Room';

// Kitchen Type Options
export type KitchenType = 'Full Kitchen' | 'Kitchenette' | 'No Kitchen' | 'Kitchen Not Accessible';

// Parking Type Options
export type ParkingType =
  | 'Street Parking'
  | 'No Parking'
  | 'Off-Street Parking'
  | 'Attached Garage'
  | 'Detached Garage'
  | 'Nearby Parking Structure';

// Gender Preference Options
export type GenderPreference = 'Male' | 'Female' | 'Other/Non Defined' | 'No Preference';

// Cancellation Policy Options
export type CancellationPolicy = 'Standard' | 'Additional Host Restrictions';

// Weekly Pattern Options
export type WeeklyPattern =
  | 'One week on, one week off'
  | 'Two weeks on, two weeks off'
  | 'One week on, three weeks off';

// Address Information
export interface AddressData {
  fullAddress: string;
  number: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  neighborhood: string;
  latitude?: number;
  longitude?: number;
  validated: boolean;
}

// Space Snapshot (Section 1)
export interface SpaceSnapshot {
  listingName: string;
  typeOfSpace: SpaceType | '';
  bedrooms: number;
  typeOfKitchen: KitchenType | '';
  beds: number;
  typeOfParking: ParkingType | '';
  bathrooms: number;
  address: AddressData;
}

// Amenities and Features (Section 2)
export interface Features {
  amenitiesInsideUnit: string[];
  amenitiesOutsideUnit: string[];
  descriptionOfLodging: string;
  neighborhoodDescription: string;
}

// Lease Styles Configuration (Section 3)
export interface LeaseStylesConfig {
  rentalType: RentalType;
  // For Nightly
  availableNights?: {
    sunday: boolean;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
  };
  // For Weekly
  weeklyPattern?: WeeklyPattern | '';
  // For Monthly
  subsidyAgreement?: boolean;
}

// Nightly Pricing Details
export interface NightlyPricing {
  oneNightPrice: number;
  decayPerNight: number; // 0.700 to 1.000
  fiveNightTotal: number;
  calculatedRates: {
    night1: number;
    night2: number;
    night3: number;
    night4: number;
    night5: number;
    cumulativeNight2: number;
    cumulativeNight3: number;
    cumulativeNight4: number;
    cumulativeNight5: number;
  };
}

// Pricing (Section 4)
export interface Pricing {
  // Common fields
  damageDeposit: number;
  maintenanceFee: number; // Monthly maintenance/cleaning fee

  // Rental type specific
  monthlyCompensation?: number;
  weeklyCompensation?: number;
  nightlyPricing?: NightlyPricing;
}

// House Rules and Policies (Section 5)
export interface Rules {
  cancellationPolicy: CancellationPolicy | '';
  preferredGender: GenderPreference;
  numberOfGuests: number;
  checkInTime: string;
  checkOutTime: string;
  idealMinDuration: number; // months
  idealMaxDuration: number; // months
  houseRules: string[];
  blockedDates: Date[];
}

// Photo Information (Section 6)
export interface PhotoData {
  id: string;
  url: string;
  file?: File;
  caption?: string;
  displayOrder: number;
}

export interface Photos {
  photos: PhotoData[];
  minRequired: number;
}

// Safety Feature Options
export const SAFETY_FEATURES: string[] = [
  'Smoke Alarm',
  'Carbon Monoxide Alarm',
  'Fire Extinguisher',
  'First Aid Kit',
  'Security Cameras',
  'Deadbolt Lock',
  'Emergency Exit',
  'Well-lit Entrance',
  'Window Locks',
  'Motion Sensor Lights'
];

// Review Data (Section 7)
export interface ReviewData {
  optionalNotes?: string;
  agreedToTerms: boolean;
  // Optional additional fields
  safetyFeatures?: string[];
  squareFootage?: number;
  firstDayAvailable?: string;
  previousReviewsLink?: string;
}

// Complete Listing Data
export interface ListingFormData {
  id?: string;
  userId?: string;
  spaceSnapshot: SpaceSnapshot;
  features: Features;
  leaseStyles: LeaseStylesConfig;
  pricing: Pricing;
  rules: Rules;
  photos: Photos;
  review: ReviewData;

  // Status fields
  currentSection: number;
  completedSections: number[];
  isDraft: boolean;
  isSubmitted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Validation Error Type
export interface ValidationError {
  field: string;
  message: string;
  section: number;
}

// Section Status
export interface SectionStatus {
  sectionNumber: number;
  isComplete: boolean;
  hasErrors: boolean;
  errorCount: number;
}

// Form State
export interface FormState {
  data: ListingFormData;
  currentSection: number;
  errors: ValidationError[];
  isLoading: boolean;
  isSaving: boolean;
}

// Option Sets (for dropdowns)
export const AMENITIES_INSIDE: string[] = [
  'Air Conditioned',
  'Bedding',
  'Closet',
  'Coffee Maker',
  'Dedicated Workspace',
  'Dishwasher',
  'Dryer',
  'Fireplace',
  'Hair Dryer',
  'Hangers',
  'Iron/Ironing Board',
  'Locked Door',
  'Patio/Backyard',
  'TV',
  'Washer',
  'WiFi',
  'Microwave',
  'Refrigerator',
  'Oven/Stove',
  'Kitchen Utensils',
  'Dishes & Silverware',
  'Cooking Basics',
  'Cable TV',
  'Heating',
  'Hot Water',
  'Essentials',
  'Private Entrance',
  'Lockbox'
];

export const AMENITIES_OUTSIDE: string[] = [
  'BBQ Grill',
  'Bike Storage',
  'Common Outdoor Space',
  'Doorman',
  'Elevator',
  'Gym',
  'Hot Tub',
  'Pool (Indoor)',
  'Pool (Outdoor)',
  'Laundry Room',
  'Wheelchair Accessible',
  'Free Parking',
  'Paid Parking',
  'EV Charger',
  'Security Cameras',
  'Smoke Alarm',
  'Carbon Monoxide Alarm',
  'Fire Extinguisher',
  'First Aid Kit',
  'Pets Allowed',
  'Pet Friendly Common Areas',
  '24-Hour Security',
  'Concierge',
  'Package Receiving'
];

export const HOUSE_RULES: string[] = [
  'Clear Common Areas',
  'Conserve Water',
  "Don't Move Furniture",
  'Flush Toilet Paper ONLY',
  'Lock Doors',
  'Maximum Occupancy',
  'No Access On Off Days',
  'No Candles',
  'No Drinking',
  'No Drugs',
  'No Entertaining',
  'No Food in Bedroom',
  'No Guests',
  'No Overnight Guests',
  'No Package Delivery',
  'No Parties',
  'No Pets',
  'No Shoes Inside',
  'No Smoking Inside',
  'No Smoking Outside',
  'Quiet Hours',
  'Not Suitable for Children',
  'Off Limit Areas',
  'Recycle',
  'Take Out Trash',
  'Wash Your Dishes',
  'Respect Neighbors',
  'No Loud Music',
  'Clean Up After Yourself',
  'Turn Off Lights'
];

// Default/Initial Values
export const DEFAULT_LISTING_DATA: ListingFormData = {
  spaceSnapshot: {
    listingName: '',
    typeOfSpace: '',
    bedrooms: 2,
    typeOfKitchen: '',
    beds: 2,
    typeOfParking: '',
    bathrooms: 2.5,
    address: {
      fullAddress: '',
      number: '',
      street: '',
      city: '',
      state: '',
      zip: '',
      neighborhood: '',
      validated: false
    }
  },
  features: {
    amenitiesInsideUnit: [],
    amenitiesOutsideUnit: [],
    descriptionOfLodging: '',
    neighborhoodDescription: ''
  },
  leaseStyles: {
    rentalType: 'Monthly',
    subsidyAgreement: false
  },
  pricing: {
    damageDeposit: 500,
    maintenanceFee: 0
  },
  rules: {
    cancellationPolicy: '',
    preferredGender: 'No Preference',
    numberOfGuests: 2,
    checkInTime: '2:00 PM',
    checkOutTime: '11:00 AM',
    idealMinDuration: 2,
    idealMaxDuration: 6,
    houseRules: [],
    blockedDates: []
  },
  photos: {
    photos: [],
    minRequired: 3
  },
  review: {
    agreedToTerms: false,
    safetyFeatures: [],
    squareFootage: undefined,
    firstDayAvailable: '',
    previousReviewsLink: ''
  },
  currentSection: 1,
  completedSections: [],
  isDraft: true,
  isSubmitted: false
};
