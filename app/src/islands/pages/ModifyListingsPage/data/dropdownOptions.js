/**
 * Dropdown Options for Modify Listings Admin Tool
 * Static data for form select fields
 */

export const spaceTypes = [
  { value: 'Private Room', label: 'Private Room' },
  { value: 'Entire Place', label: 'Entire Place' },
  { value: 'Shared Room', label: 'Shared Room' }
];

export const bedrooms = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1 Bedroom' },
  { value: 2, label: '2 Bedrooms' },
  { value: 3, label: '3 Bedrooms' },
  { value: 4, label: '4 Bedrooms' },
  { value: 5, label: '5+ Bedrooms' }
];

export const beds = [
  { value: 1, label: '1 Bed' },
  { value: 2, label: '2 Beds' },
  { value: 3, label: '3 Beds' },
  { value: 4, label: '4 Beds' },
  { value: 5, label: '5 Beds' },
  { value: 6, label: '6+ Beds' }
];

export const bathrooms = [
  { value: 0.5, label: '0.5 Bathroom' },
  { value: 1, label: '1 Bathroom' },
  { value: 1.5, label: '1.5 Bathrooms' },
  { value: 2, label: '2 Bathrooms' },
  { value: 2.5, label: '2.5 Bathrooms' },
  { value: 3, label: '3 Bathrooms' },
  { value: 3.5, label: '3.5 Bathrooms' },
  { value: 4, label: '4+ Bathrooms' }
];

export const kitchenTypes = [
  { value: 'Full Kitchen', label: 'Full Kitchen' },
  { value: 'Kitchenette', label: 'Kitchenette' },
  { value: 'Shared Kitchen', label: 'Shared Kitchen' },
  { value: 'No Kitchen', label: 'No Kitchen' }
];

export const parkingTypes = [
  { value: 'Street Parking', label: 'Street Parking' },
  { value: 'No Parking', label: 'No Parking' },
  { value: 'Off-Street Parking', label: 'Off-Street Parking' },
  { value: 'Attached Garage', label: 'Attached Garage' },
  { value: 'Detached Garage', label: 'Detached Garage' },
  { value: 'Nearby Parking Structure', label: 'Nearby Parking Structure' }
];

export const cancellationPolicies = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Additional Host Restrictions', label: 'Additional Host Restrictions' },
  { value: 'Prior to First-Time Arrival', label: 'Prior to First-Time Arrival' },
  { value: 'After First-Time Arrival', label: 'After First-Time Arrival' }
];

export const genderOptions = [
  { value: 'No Preference', label: 'No Preference' },
  { value: 'Male Only', label: 'Male Only' },
  { value: 'Female Only', label: 'Female Only' }
];

export const photoTypes = [
  { value: 'living_room', label: 'Living Room' },
  { value: 'bedroom', label: 'Bedroom' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'bathroom', label: 'Bathroom' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'amenity', label: 'Amenity' },
  { value: 'other', label: 'Other' }
];

export const usStates = [
  { value: 'Alabama', label: 'Alabama' },
  { value: 'Alaska', label: 'Alaska' },
  { value: 'Arizona', label: 'Arizona' },
  { value: 'Arkansas', label: 'Arkansas' },
  { value: 'California', label: 'California' },
  { value: 'Colorado', label: 'Colorado' },
  { value: 'Connecticut', label: 'Connecticut' },
  { value: 'Delaware', label: 'Delaware' },
  { value: 'Florida', label: 'Florida' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Hawaii', label: 'Hawaii' },
  { value: 'Idaho', label: 'Idaho' },
  { value: 'Illinois', label: 'Illinois' },
  { value: 'Indiana', label: 'Indiana' },
  { value: 'Iowa', label: 'Iowa' },
  { value: 'Kansas', label: 'Kansas' },
  { value: 'Kentucky', label: 'Kentucky' },
  { value: 'Louisiana', label: 'Louisiana' },
  { value: 'Maine', label: 'Maine' },
  { value: 'Maryland', label: 'Maryland' },
  { value: 'Massachusetts', label: 'Massachusetts' },
  { value: 'Michigan', label: 'Michigan' },
  { value: 'Minnesota', label: 'Minnesota' },
  { value: 'Mississippi', label: 'Mississippi' },
  { value: 'Missouri', label: 'Missouri' },
  { value: 'Montana', label: 'Montana' },
  { value: 'Nebraska', label: 'Nebraska' },
  { value: 'Nevada', label: 'Nevada' },
  { value: 'New Hampshire', label: 'New Hampshire' },
  { value: 'New Jersey', label: 'New Jersey' },
  { value: 'New Mexico', label: 'New Mexico' },
  { value: 'New York', label: 'New York' },
  { value: 'North Carolina', label: 'North Carolina' },
  { value: 'North Dakota', label: 'North Dakota' },
  { value: 'Ohio', label: 'Ohio' },
  { value: 'Oklahoma', label: 'Oklahoma' },
  { value: 'Oregon', label: 'Oregon' },
  { value: 'Pennsylvania', label: 'Pennsylvania' },
  { value: 'Rhode Island', label: 'Rhode Island' },
  { value: 'South Carolina', label: 'South Carolina' },
  { value: 'South Dakota', label: 'South Dakota' },
  { value: 'Tennessee', label: 'Tennessee' },
  { value: 'Texas', label: 'Texas' },
  { value: 'Utah', label: 'Utah' },
  { value: 'Vermont', label: 'Vermont' },
  { value: 'Virginia', label: 'Virginia' },
  { value: 'Washington', label: 'Washington' },
  { value: 'West Virginia', label: 'West Virginia' },
  { value: 'Wisconsin', label: 'Wisconsin' },
  { value: 'Wyoming', label: 'Wyoming' },
  { value: 'District of Columbia', label: 'District of Columbia' }
];

export const checkInTimes = [
  { value: '12:00 PM', label: '12:00 PM (Noon)' },
  { value: '1:00 PM', label: '1:00 PM' },
  { value: '2:00 PM', label: '2:00 PM' },
  { value: '3:00 PM', label: '3:00 PM' },
  { value: '4:00 PM', label: '4:00 PM' },
  { value: '5:00 PM', label: '5:00 PM' },
  { value: '6:00 PM', label: '6:00 PM' },
  { value: 'Flexible', label: 'Flexible' }
];

export const checkOutTimes = [
  { value: '8:00 AM', label: '8:00 AM' },
  { value: '9:00 AM', label: '9:00 AM' },
  { value: '10:00 AM', label: '10:00 AM' },
  { value: '11:00 AM', label: '11:00 AM' },
  { value: '12:00 PM', label: '12:00 PM (Noon)' },
  { value: 'Flexible', label: 'Flexible' }
];

export const rentalTypes = [
  { value: 'Nightly', label: 'Nightly' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' }
];

export const weeklyPatterns = [
  { value: 'Every week', label: 'Every week' },
  { value: 'Every other week', label: 'Every other week' },
  { value: 'First week of month', label: 'First week of month' },
  { value: 'Last week of month', label: 'Last week of month' }
];

export const guestCounts = [
  { value: 1, label: '1 Guest' },
  { value: 2, label: '2 Guests' },
  { value: 3, label: '3 Guests' },
  { value: 4, label: '4 Guests' },
  { value: 5, label: '5 Guests' },
  { value: 6, label: '6 Guests' },
  { value: 7, label: '7 Guests' },
  { value: 8, label: '8 Guests' },
  { value: 9, label: '9 Guests' },
  { value: 10, label: '10 Guests' },
  { value: 15, label: '15 Guests' },
  { value: 20, label: '20 Guests' }
];

export const durationMonths = [
  { value: 1, label: '1 Month' },
  { value: 2, label: '2 Months' },
  { value: 3, label: '3 Months' },
  { value: 4, label: '4 Months' },
  { value: 5, label: '5 Months' },
  { value: 6, label: '6 Months' },
  { value: 7, label: '7 Months' },
  { value: 8, label: '8 Months' },
  { value: 9, label: '9 Months' },
  { value: 10, label: '10 Months' },
  { value: 11, label: '11 Months' },
  { value: 12, label: '12 Months' }
];

export const storageOptions = [
  { value: 'In the room', label: 'In the room' },
  { value: 'In a locked closet', label: 'In a locked closet' },
  { value: 'In a suitcase', label: 'In a suitcase' }
];
