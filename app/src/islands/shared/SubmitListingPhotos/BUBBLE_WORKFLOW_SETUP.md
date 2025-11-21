# Bubble Workflow Setup Guide for SubmitListingPhotos

This guide explains how to set up the Bubble API workflow to handle bulk photo uploads for listings.

## Overview

The `SubmitListingPhotos` component uploads multiple images in a single API call to Bubble, which then creates individual "Listing - Photo" records with proper sort ordering.

## Workflow Configuration

### Step 1: Create the API Workflow

1. Open your Bubble editor at `app.split.lease`
2. Navigate to **Plugins** tab → **API Connector** or **API** tab → **Backend workflows**
3. Click **New API workflow**
4. Configure the workflow:
   - **Name:** `create-listing-photos-bulk`
   - **Method:** POST
   - **Expose as public API:** Yes (or require authentication)
   - **Run as:** Current user (if authenticated) or ignore privacy rules

### Step 2: Define Parameters

Add the following parameters to the workflow:

| Parameter Name | Type | Required | Description |
|---------------|------|----------|-------------|
| `listing_id` | text | Yes | The unique ID of the listing |
| `photos` | list of images | Yes | Array of image files to upload |
| `user_id` | text | No | Optional user ID for authorization |

### Step 3: Add Workflow Actions

#### Action 1: Get the Listing

- **Action type:** Data (Things) → Do a search for
- **Type:** Listing
- **Constraints:**
  - `_id` = `listing_id` (from parameters)
- **Result:** Get first item
- **Save result as:** `Listing`

#### Action 2: Create Listing Photos

**Option A: Using "Create a list of things" (Recommended)**

- **Action type:** Data (Things) → Create a list of things
- **Type:** Listing - Photo
- **Create list from:** `photos` parameter
- **For each item configure:**
  - Photo: `Current item`
  - Listing: `Result of Action 1` (the Listing)
  - Sort Order: `Current item's #` (this gives you 1, 2, 3, etc.)
  - Created Date: `Current date/time`
  - Modified Date: `Current date/time`
  - (Add any other required fields from your schema)

**Option B: Using "API Workflow on a list" (Alternative)**

If "Create a list of things" doesn't work well with images:

1. Create a separate backend workflow called `create-single-listing-photo`
   - Parameters: `listing_id`, `photo` (image), `sort_order` (number)
   - Action: Create a thing → Listing - Photo
     - Photo: `photo` parameter
     - Listing: Do a search for Listing where `_id` = `listing_id`
     - Sort Order: `sort_order` parameter

2. In main workflow, use:
   - **Action type:** Plugins → Schedule API Workflow on a list
   - **API Workflow:** `create-single-listing-photo`
   - **List:** `photos` parameter
   - **Parameters:**
     - listing_id: `listing_id` parameter
     - photo: `Current item`
     - sort_order: `Current item's #`

#### Action 3: Return Response

- **Action type:** Plugins → Return data from API
- **Return data:**
  ```json
  {
    "status": "success",
    "count": photos:count,
    "listing_id": listing_id,
    "message": "Photos uploaded successfully"
  }
  ```

### Step 4: Handle Errors (Optional)

Add error handling:

1. **Action type:** Plugins → Return data from API
2. **Only when:** `Result of Action 1 is empty`
3. **Return data:**
  ```json
  {
    "status": "error",
    "message": "Listing not found",
    "listing_id": listing_id
  }
  ```

### Step 5: Configure API Settings

1. Go to **Settings** → **API** tab
2. Ensure **Enable Data API** is checked
3. Note your **API Token** (should match `VITE_BUBBLE_API_KEY` in .env)
4. Under **API Workflows**, find your new workflow
5. Copy the endpoint URL (should be):
   ```
   https://app.split.lease/api/1.1/wf/create-listing-photos-bulk
   ```

## Testing the Workflow

### Using Bubble's Built-in Test

1. In the workflow editor, click **Test** or **Detect data**
2. Provide test values:
   - `listing_id`: Use an actual listing ID from your database
   - `photos`: Upload 2-3 test images
3. Click **Initialize call**
4. Check results and any errors

### Using Postman or cURL

```bash
curl -X POST https://app.split.lease/api/1.1/wf/create-listing-photos-bulk \
  -H "Authorization: Bearer YOUR_BUBBLE_API_KEY" \
  -F "listing_id=1234567890123x456789012345678" \
  -F "photos=@/path/to/photo1.jpg" \
  -F "photos=@/path/to/photo2.jpg"
```

### Using the React Component

1. Integrate the component into a page:
```jsx
import SubmitListingPhotos from '../islands/shared/SubmitListingPhotos';

function ListingPage({ listingId }) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <>
      <button onClick={() => setShowUpload(true)}>
        Upload Photos
      </button>

      {showUpload && (
        <SubmitListingPhotos
          listingId={listingId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => {
            console.log('Upload successful!');
            // Refresh listing data
          }}
        />
      )}
    </>
  );
}
```

2. Open the modal and test uploading

## Troubleshooting

### Issue: "API key not configured"

**Solution:** Ensure `VITE_BUBBLE_API_KEY` is set in your `.env` file

### Issue: "Listing not found"

**Solution:** Verify the `listing_id` parameter matches an existing listing's `_id` field

### Issue: Photos not appearing in correct order

**Solution:**
- Check that Sort Order field is being set to `Current item's #`
- Verify "Listing - Photo" has a numeric Sort Order field

### Issue: "Failed to upload images"

**Solutions:**
1. Check browser console for detailed error messages
2. Verify Bubble workflow is published and accessible
3. Confirm API token is correct
4. Check Bubble logs for backend errors

### Issue: FormData not sending correctly

**Solution:** Bubble expects images as separate form fields with the same name:
```javascript
// Correct
formData.append('photos', file1);
formData.append('photos', file2);

// Incorrect
formData.append('photos[0]', file1);
formData.append('photos[1]', file2);
```

## Data Structure Reference

### Listing - Photo Data Type

Expected fields:
- `Photo` (image) - The uploaded image file
- `Listing` (Listing) - Reference to parent listing
- `Sort Order` (number) - Display order (1, 2, 3, etc.)
- `Created Date` (date) - When photo was uploaded
- `Modified Date` (date) - Last modification time
- *(Add any additional fields your schema requires)*

### API Response Format

**Success Response:**
```json
{
  "status": "success",
  "count": 5,
  "listing_id": "1234567890123x456789012345678",
  "message": "Photos uploaded successfully"
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Listing not found",
  "listing_id": "1234567890123x456789012345678"
}
```

## Security Considerations

1. **Authentication:** Consider requiring user authentication for the workflow
2. **Authorization:** Verify the user owns the listing before allowing uploads
3. **Rate Limiting:** Add Bubble rate limits to prevent abuse
4. **File Size:** Set maximum file size limits in Bubble (e.g., 10MB per image)
5. **File Type Validation:** Bubble automatically validates image types

## Next Steps

After setting up the workflow:

1. Test with small batches (2-3 images) first
2. Monitor Bubble logs for any errors
3. Verify photos appear correctly in your listings
4. Test with maximum allowed photos (20)
5. Integrate component into your listing management pages

## Support

If you encounter issues:
- Check Bubble server logs in your editor
- Review browser console for client-side errors
- Verify API token permissions
- Contact Bubble support for platform-specific issues
