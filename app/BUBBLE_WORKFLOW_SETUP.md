# Bubble Workflow Configuration

## Workflow: `listing_creation_in_code`

This document explains how the Bubble backend workflow `listing_creation_in_code` should be configured to work with the CreateDuplicateListingModal component.

## Required Configuration

### Input Parameters

The workflow receives the following parameters from the frontend:

1. **`listing_name`** (text, required)
   - The title/name of the listing to create
   - Example: "Cozy Downtown Apartment"

2. **`user_email`** (text, optional)
   - The email address of the logged-in user
   - Only sent if the user is authenticated
   - Example: "user@example.com"

### Return Value

**CRITICAL:** The workflow MUST return the created listing's ID in one of these formats:

#### Option 1 (Recommended): Return in nested response
```json
{
  "status": "success",
  "response": {
    "listing_id": "1234567890abcdef"
  }
}
```

#### Option 2: Return directly
```json
{
  "listing_id": "1234567890abcdef"
}
```

#### Option 3: Use "id" instead of "listing_id"
```json
{
  "response": {
    "id": "1234567890abcdef"
  }
}
```

### Workflow Logic

The Bubble workflow should:

1. **Create a new listing** in the `zat_listings` table with:
   - Name = `listing_name` parameter
   - active = false (inactive by default)
   - Default Extension Setting = false
   - Damage Deposit = 500
   - Features - Qty Beds = 1
   - If `user_email` is provided:
     - Look up the user by email
     - Set Host/Landlord, HOST name, Host email accordingly
   - If `user_email` is NOT provided:
     - Leave host fields empty (guest listing)

2. **Return the listing ID** using one of the formats above

3. **Update profile completeness** (if user is logged in):
   - Check if this is the user's first listing
   - Update tasksCompleted to include 'listing'

## Frontend Integration

After the workflow completes successfully, the frontend will:

1. Extract the listing ID from the response
2. Close the modal
3. Show success toast
4. Redirect to: `/self-listing.html?listing_id={listing_id}`

## Error Handling

If the workflow does not return a listing ID in any of the supported formats, the frontend will display an error:

> "Bubble workflow did not return a listing ID. Please check the workflow configuration to ensure it returns 'listing_id' or 'id' in the response."

## Testing

To test the workflow:

1. Open the browser console (F12)
2. Click "List With Us" in the header
3. Enter a listing name
4. Click "Create New"
5. Check the console logs for:
   - `[Bubble API] Full workflow response:` - Shows the complete response
   - `[Bubble API] Response keys:` - Shows the top-level keys
   - `[Bubble API] Nested response:` - Shows nested response if exists
   - `📋 Extracted listing ID:` - Shows the ID that was extracted

## Current Issue

Based on the logs, the workflow is currently returning:

```json
{
  "status": "success",
  "response": {}
}
```

The `response` object is **empty**, which means the workflow is not configured to return the listing ID. Please update the Bubble workflow to include the listing ID in the return value as described above.
