/**
 * Edit Listing Details - Constants
 * Predefined lists based on Bubble.io documentation for amenities, rules, and safety features
 */

export const IN_UNIT_AMENITIES = [
  'Air Conditioned', 'Bedding', 'Blackout Curtains/Blinds', 'Closet',
  'Coffee Maker', 'Computer', 'Dedicated Workspace', 'Dishwasher',
  'Dryer', 'Espresso Machine', 'Fireplace', 'Garbage Disposal',
  'Hair Dryer', 'Hangers', 'Iron/Ironing Board', 'Locked Door',
  'Locked Storage', 'Patio/Backyard', 'Portable Fans', 'Premium TV',
  'Printer', 'Private bathroom', 'Self Check In', 'Shared Storage',
  'Towels and Linens', 'TV', 'Washer', 'WiFi'
];

export const BUILDING_AMENITIES = [
  'BBQ Grill', 'Bike Storage', 'Common Outdoor Space', 'Courtyard',
  'Dog park', 'Doorman', 'Dry Cleaning', 'Elevator',
  'Gated', 'Gym', 'Hot Tub', 'Indoor Swimming Pool',
  'Laundromat Nearby', 'Laundry Room', 'Lounge', 'Mail Room',
  'Outdoor Swimming Pool', 'Package Room'
];

export const HOUSE_RULES = [
  'Clear Common Areas', 'Conserve Water', "Don't Move Furniture",
  'Flush Toilet Paper ONLY', 'Lock Doors', 'Maximum Occupancy',
  'No Access On Off Days', 'No Candles', 'No Drinking', 'No Drugs',
  'No Entertaining', 'No Food in Bedroom', 'No Food In Sink',
  'No Guests', 'No Opening Windows', 'No Overnight Guests',
  'No Package Delivery', 'No Parties', 'No Pets', 'No Shoes Inside',
  'No Smoking Inside', 'No Smoking Outside', 'No Strong Scented Foods',
  'Not Suitable for Children', 'Off Limit Areas',
  'Pay to Use Washer and Dryer', 'Quiet Hours', 'Recycle',
  'Take Out Trash', 'Wash Your Dishes'
];

export const SAFETY_FEATURES = [
  'Carbon Monoxide Detector', 'Fire Extinguisher', 'Fire Sprinklers',
  'First Aid Kit', 'Lock on Bedroom Door', 'Smoke Detector'
];

export const COMMON_RULES = ['Quiet Hours', 'No Smoking Inside', 'No Pets', 'Lock Doors', 'Take Out Trash'];

export const COMMON_SAFETY_FEATURES = ['Smoke Detector', 'Carbon Monoxide Detector', 'Fire Extinguisher'];

export const SPACE_TYPES = [
  { value: 'Private Room', label: 'Private Room' },
  { value: 'Entire place', label: 'Entire place' },
  { value: 'Shared room', label: 'Shared room' }
];

export const KITCHEN_TYPES = [
  { value: 'Full Kitchen', label: 'Full Kitchen' },
  { value: 'Kitchenette', label: 'Kitchenette' },
  { value: 'No Kitchen', label: 'No Kitchen' },
  { value: 'Kitchen Not Accessible', label: 'Kitchen Not Accessible' }
];

export const STORAGE_TYPES = [
  { value: 'In the room', label: 'In the room' },
  { value: 'In a locked closet', label: 'In a locked closet' },
  { value: 'In a suitcase', label: 'In a suitcase' }
];

export const PARKING_OPTIONS = [
  { value: 'Street Parking', label: 'Street Parking' },
  { value: 'No Parking', label: 'No Parking' },
  { value: 'Off-Street Parking', label: 'Off-Street Parking' },
  { value: 'Attached Garage', label: 'Attached Garage' },
  { value: 'Detached Garage', label: 'Detached Garage' },
  { value: 'Nearby Parking Structure', label: 'Nearby Parking Structure' }
];

export const CANCELLATION_POLICIES = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Flexible', label: 'Flexible' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Strict', label: 'Strict' }
];

export const BEDROOM_OPTIONS = [
  { value: 0, label: 'Studio' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' }
];

export const BED_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export const BATHROOM_OPTIONS = [1, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6];

export const GUEST_OPTIONS = [1, 2, 3, 4, 5, 6];

export const NEIGHBORHOOD_TEMPLATE = 'Located in a vibrant neighborhood with easy access to public transportation, restaurants, cafes, and local shops. The area is known for its friendly community atmosphere and walkability.';
