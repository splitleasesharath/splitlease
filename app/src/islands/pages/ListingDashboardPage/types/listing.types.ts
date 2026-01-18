// Option Set Types
export interface RentalType {
  id: string;
  display: string;
}

export interface PreferredGender {
  id: string;
  display: string;
}

export interface TypeOfSpace {
  id: string;
  label: string;
}

export interface ParkingType {
  id: string;
  label: string;
}

export interface KitchenType {
  id: string;
  display: string;
}

export interface PhotoType {
  id: string;
  name: string;
}

// Nested Data Types
export interface Location {
  id: string;
  address: string;
  hoodsDisplay: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}

export interface Features {
  id: string;
  typeOfSpace: TypeOfSpace;
  parkingType: ParkingType;
  kitchenType: KitchenType;
  qtyGuests: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
}

export interface Photo {
  id: string;
  listingId: string;
  photoType: PhotoType;
  isCoverPhoto: boolean;
  imageUrl: string;
  orderIndex: number;
  createdAt: Date;
}

export interface Video {
  id: string;
  listingId: string;
  videoUrl: string;
  videoType: string;
  createdAt: Date;
}

export interface Amenity {
  id: string;
  name: string;
  category: 'in_unit' | 'building';
  icon?: string;
}

export interface SafetyFeature {
  id: string;
  name: string;
  icon?: string;
}

export interface BlockedDate {
  id: string;
  listingId: string;
  blockedDate: Date;
  status: 'restricted_weekly' | 'blocked_manually' | 'available';
  createdAt: Date;
}

export interface HouseManual {
  id: string;
  listingId: string;
}

export interface HostRestrictions {
  id: string;
  guidelines: string;
}

// Main Listing Type
export interface Listing {
  id: string;
  location: Location;
  features: Features;
  rentalType: RentalType;
  preferredGender: PreferredGender;
  houseManual?: HouseManual;
  hostRestrictions?: HostRestrictions;
  isOnline: boolean;
  activeSince: Date;
  monthlyHostRate: number;
  damageDeposit: number;
  cleaningCost: number;
  minimumNights: number;
  maximumNights: number;
  idealLeaseMonthsMin: number;
  idealLeaseMonthsMax: number;
  idealLeaseWeeksMin: number;
  idealLeaseWeeksMax: number;
  earliestRentDate: Date;
  checkInTime: string;
  checkOutTime: string;
  description: string;
  descriptionNeighborhood: string;
  createdAt: Date;
  updatedAt: Date;

  // Related data
  photos: Photo[];
  videos: Video[];
  amenities: Amenity[];
  safetyFeatures: SafetyFeature[];
  blockedDates: BlockedDate[];
}

// Count Types for Badges
export interface ListingCounts {
  proposals: number;
  virtualMeetings: number;
  leases: number;
}

// Tab Navigation
export type TabType = 'preview' | 'manage' | 'proposals' | 'virtual-meetings' | 'leases';
