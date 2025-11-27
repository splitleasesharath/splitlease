# Bubble Workflow: `listing_full_submission_in_code`

## Overview

This workflow receives all listing form data from the frontend self-listing page and:
1. Updates an existing listing with all submitted fields
2. Attaches the user (host) to the listing
3. Sets the listing status to "Pending Review"

**Called by**: Edge Function `bubble-proxy` → `submit_listing` action
**Authentication**: User must be logged in (has just signed up or was already logged in)

---

## Workflow Parameters

The workflow should receive the following parameters. All parameter names use **snake_case**.

### Identifiers (REQUIRED)

| Parameter | Type | Description |
|-----------|------|-------------|
| `listing_id` | **text** | The Bubble unique ID of the existing listing to update |
| `user_email` | **text** | Email of the user (from signup or existing user) |
| `user_unique_id` | **text** (optional) | Bubble user unique ID from signup response |

### Basic Info

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `name` | text | Listing name | "Cozy Brooklyn Studio" |
| `type_of_space` | text | Space type | "Private Room", "Entire Place", "Shared Room" |
| `bedrooms` | number | Number of bedrooms | 2 |
| `beds` | number | Number of beds | 2 |
| `bathrooms` | number | Number of bathrooms | 1.5 |
| `type_of_kitchen` | text | Kitchen type | "Full Kitchen", "Kitchenette", "No Kitchen", "Kitchen Not Accessible" |
| `type_of_parking` | text | Parking type | "Street Parking", "No Parking", "Off-Street Parking", "Attached Garage", "Detached Garage", "Nearby Parking Structure" |

### Address

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `address` | text | Full formatted address | "123 Main St, Brooklyn, NY 11201" |
| `street_number` | text | Street number | "123" |
| `street` | text | Street name | "Main St" |
| `city` | text | City | "Brooklyn" |
| `state` | text | State | "NY" |
| `zip` | text | ZIP code | "11201" |
| `neighborhood` | text | Neighborhood name | "Williamsburg" |
| `latitude` | number (nullable) | GPS latitude | 40.7128 |
| `longitude` | number (nullable) | GPS longitude | -73.9855 |

### Amenities (Lists)

| Parameter | Type | Description |
|-----------|------|-------------|
| `amenities_inside_unit` | **list of texts** | Amenities inside the unit |
| `amenities_outside_unit` | **list of texts** | Amenities outside/building |

**Amenities Inside Unit Options:**
- Air Conditioned, Bedding, Closet, Coffee Maker, Dedicated Workspace, Dishwasher, Dryer, Fireplace, Hair Dryer, Hangers, Iron/Ironing Board, Locked Door, Patio/Backyard, TV, Washer, WiFi, Microwave, Refrigerator, Oven/Stove, Kitchen Utensils, Dishes & Silverware, Cooking Basics, Cable TV, Heating, Hot Water, Essentials, Private Entrance, Lockbox

**Amenities Outside Unit Options:**
- BBQ Grill, Bike Storage, Common Outdoor Space, Doorman, Elevator, Gym, Hot Tub, Pool (Indoor), Pool (Outdoor), Laundry Room, Wheelchair Accessible, Free Parking, Paid Parking, EV Charger, Security Cameras, Smoke Alarm, Carbon Monoxide Alarm, Fire Extinguisher, First Aid Kit, Pets Allowed, Pet Friendly Common Areas, 24-Hour Security, Concierge, Package Receiving

### Descriptions

| Parameter | Type | Description |
|-----------|------|-------------|
| `description_of_lodging` | text | Description of the space |
| `neighborhood_description` | text | Description of the neighborhood |

### Lease Style

| Parameter | Type | Description | Options |
|-----------|------|-------------|---------|
| `rental_type` | text | Type of rental | "Nightly", "Weekly", "Monthly" |
| `available_nights` | **list of texts** | Available nights for nightly rentals | ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] |
| `weekly_pattern` | text | Weekly rental pattern | "One week on, one week off", "Two weeks on, two weeks off", "One week on, three weeks off" |

### Pricing

| Parameter | Type | Description | Notes |
|-----------|------|-------------|-------|
| `damage_deposit` | number | Required damage deposit | Minimum $500 |
| `maintenance_fee` | number | Monthly maintenance/cleaning fee | |
| `monthly_compensation` | number (nullable) | Monthly rent | Required if rental_type = "Monthly" |
| `weekly_compensation` | number (nullable) | Weekly rent | Required if rental_type = "Weekly" |
| `price_1_night` | number (nullable) | Price for 1 night | Required if rental_type = "Nightly" |
| `price_2_nights` | number (nullable) | Cumulative price for 2 nights | |
| `price_3_nights` | number (nullable) | Cumulative price for 3 nights | |
| `price_4_nights` | number (nullable) | Cumulative price for 4 nights | |
| `price_5_nights` | number (nullable) | Cumulative price for 5 nights | |
| `nightly_decay_rate` | number (nullable) | Discount rate per additional night | 0.700 to 1.000 (renamed from "decay") |

### Rules

| Parameter | Type | Description | Options/Notes |
|-----------|------|-------------|---------------|
| `cancellation_policy` | text | Cancellation policy | "Standard", "Additional Host Restrictions" |
| `preferred_gender` | text | Guest gender preference | "Male", "Female", "Other/Non Defined", "No Preference" |
| `number_of_guests` | number | Maximum guests allowed | |
| `check_in_time` | text | Check-in time | "2:00 PM" format |
| `check_out_time` | text | Check-out time | "11:00 AM" format |
| `ideal_min_duration` | number | Minimum ideal stay (months) | |
| `ideal_max_duration` | number | Maximum ideal stay (months) | |
| `house_rules` | **list of texts** | Selected house rules | |
| `blocked_dates` | **list of texts** | Blocked dates (ISO format) | "2025-01-15" format |

**House Rules Options:**
- Clear Common Areas, Conserve Water, Don't Move Furniture, Flush Toilet Paper ONLY, Lock Doors, Maximum Occupancy, No Access On Off Days, No Candles, No Drinking, No Drugs, No Entertaining, No Food in Bedroom, No Guests, No Overnight Guests, No Package Delivery, No Parties, No Pets, No Shoes Inside, No Smoking Inside, No Smoking Outside, Quiet Hours, Not Suitable for Children, Off Limit Areas, Recycle, Take Out Trash, Wash Your Dishes, Respect Neighbors, No Loud Music, Clean Up After Yourself, Turn Off Lights

### Safety & Review (Optional Fields)

| Parameter | Type | Description |
|-----------|------|-------------|
| `safety_features` | **list of texts** | Selected safety features |
| `square_footage` | number (nullable) | Square footage of the space |
| `first_day_available` | text | First available date | "2025-02-01" format |
| `previous_reviews_link` | text | URL to previous reviews |
| `optional_notes` | text | Additional notes from host |

**Safety Features Options:**
- Smoke Alarm, Carbon Monoxide Alarm, Fire Extinguisher, First Aid Kit, Security Cameras, Deadbolt Lock, Emergency Exit, Well-lit Entrance, Window Locks, Motion Sensor Lights

### Status

| Parameter | Type | Description | Value |
|-----------|------|-------------|-------|
| `status` | text | Listing status | "Pending Review" (set by workflow) |
| `is_draft` | yes/no | Is this a draft | `no` (set by workflow) |

---

## Workflow Steps

### Step 1: Find User by Email
```
Search for Users:
  Email = user_email
```
OR use `user_unique_id` if provided to directly reference the user.

### Step 2: Make Changes to Listing
```
Make changes to thing:
  Thing to change: Search for Listings (unique id = listing_id)

  Fields to update:
    Name = name
    Type of Space = type_of_space
    Bedrooms = bedrooms
    Beds = beds
    Bathrooms = bathrooms
    Type of Kitchen = type_of_kitchen
    Type of Parking = type_of_parking
    Address = address
    Street Number = street_number
    Street = street
    City = city
    State = state
    Zip = zip
    Neighborhood = neighborhood
    Latitude = latitude
    Longitude = longitude
    Amenities Inside Unit = amenities_inside_unit
    Amenities Outside Unit = amenities_outside_unit
    Description of Lodging = description_of_lodging
    Neighborhood Description = neighborhood_description
    Rental Type = rental_type
    Available Nights = available_nights
    Weekly Pattern = weekly_pattern
    Damage Deposit = damage_deposit
    Maintenance Fee = maintenance_fee
    Monthly Compensation = monthly_compensation
    Weekly Compensation = weekly_compensation
    Price 1 night selected = price_1_night
    Price 2 nights selected = price_2_nights
    Price 3 nights selected = price_3_nights
    Price 4 nights selected = price_4_nights
    Price 5 nights selected = price_5_nights
    Nightly Decay Rate = nightly_decay_rate
    Cancellation Policy = cancellation_policy
    Preferred Gender = preferred_gender
    Number of Guests = number_of_guests
    Check-In Time = check_in_time
    Check-Out Time = check_out_time
    Ideal Min Duration = ideal_min_duration
    Ideal Max Duration = ideal_max_duration
    House Rules = house_rules
    Blocked Dates = blocked_dates
    Safety Features = safety_features
    Square Footage = square_footage
    First Day Available = first_day_available
    Previous Reviews Link = previous_reviews_link
    Optional Notes = optional_notes
    Status = "Pending Review"
    Is Draft = no

    // ATTACH USER
    Creator = Result of Step 1 (or user by user_unique_id)
```

### Step 3: Return Result (Optional)
The Edge Function fetches the listing data separately via Data API, so no return value is strictly needed. However, you can return the listing unique_id for confirmation.

---

## Bubble Field Mapping Reference

| Frontend Field | Bubble Field Name |
|----------------|-------------------|
| `Name` | `Name` |
| `Type of Space` | `Type of Space` |
| `Bedrooms` | `Bedrooms` |
| `Beds` | `Beds` |
| `Bathrooms` | `Bathrooms` |
| `Type of Kitchen` | `Type of Kitchen` |
| `Type of Parking` | `Type of Parking` |
| `Address` | `Address` |
| `Street Number` | `Street Number` |
| `Street` | `Street` |
| `City` | `City` |
| `State` | `State` |
| `Zip` | `Zip` |
| `Neighborhood` | `Neighborhood` |
| `Latitude` | `Latitude` |
| `Longitude` | `Longitude` |
| `Amenities Inside Unit` | `Amenities Inside Unit` |
| `Amenities Outside Unit` | `Amenities Outside Unit` |
| `Description of Lodging` | `Description of Lodging` |
| `Neighborhood Description` | `Neighborhood Description` |
| `Rental Type` | `Rental Type` |
| `Available Nights` | `Available Nights` |
| `Weekly Pattern` | `Weekly Pattern` |
| `Damage Deposit` | `Damage Deposit` |
| `Maintenance Fee` | `Maintenance Fee` |
| `Monthly Compensation` | `Monthly Compensation` |
| `Weekly Compensation` | `Weekly Compensation` |
| `Price 1 night selected` | `Price 1 night selected` |
| `Price 2 nights selected` | `Price 2 nights selected` |
| `Price 3 nights selected` | `Price 3 nights selected` |
| `Price 4 nights selected` | `Price 4 nights selected` |
| `Price 5 nights selected` | `Price 5 nights selected` |
| `Nightly Decay Rate` | `Nightly Decay Rate` |
| `Cancellation Policy` | `Cancellation Policy` |
| `Preferred Gender` | `Preferred Gender` |
| `Number of Guests` | `Number of Guests` |
| `Check-In Time` | `Check-In Time` |
| `Check-Out Time` | `Check-Out Time` |
| `Ideal Min Duration` | `Ideal Min Duration` |
| `Ideal Max Duration` | `Ideal Max Duration` |
| `House Rules` | `House Rules` |
| `Blocked Dates` | `Blocked Dates` |
| `Safety Features` | `Safety Features` |
| `Square Footage` | `Square Footage` |
| `First Day Available` | `First Day Available` |
| `Previous Reviews Link` | `Previous Reviews Link` |
| `Optional Notes` | `Optional Notes` |
| `Status` | `Status` |
| `Is Draft` | `Is Draft` |
| `Creator` | `Creator` (User reference) |

---

## API Endpoint Configuration

In Bubble's Workflow API settings, enable this workflow as an API endpoint:

- **Workflow name**: `listing_full_submission_in_code`
- **Expose as API workflow**: Yes
- **Parameter types**: Use the types specified above
- **Ignore privacy rules**: Consider enabling for server-to-server calls (Edge Function uses API key)

---

## Testing

To test this workflow, call the Edge Function with:

```javascript
const { data, error } = await supabase.functions.invoke('bubble-proxy', {
  body: {
    action: 'submit_listing',
    payload: {
      listing_id: 'your-listing-id',
      user_email: 'host@example.com',
      user_unique_id: 'bubble-user-id', // optional
      listing_data: {
        // Full BubbleListingPayload from prepareListingSubmission()
      }
    }
  }
});
```

---

## Notes

1. **User attachment**: The workflow attaches the user to the listing via the `Creator` field. Use either `user_email` to search for the user or `user_unique_id` if provided directly from signup.

2. **Existing listing**: This workflow assumes the listing already exists (created in Section 1 via `listing_creation_in_code`). It updates the existing listing rather than creating a new one.

3. **Status flow**: Status is set to "Pending Review" on submission. Split Lease team reviews before publishing.

4. **Photos**: Photos are handled separately via the `upload_photos` action. This workflow only updates text/number fields.
