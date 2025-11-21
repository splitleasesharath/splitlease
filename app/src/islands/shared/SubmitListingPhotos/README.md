# SubmitListingPhotos Component

Reusable shared island component for uploading photos to listings. Converted from Bubble.io element to match Split Lease architecture.

## Features

- Drag and drop image upload
- Multiple file selection
- Image preview with thumbnails
- Delete confirmation modal
- File type validation (jpeg, jpg, gif, png)
- Maximum 20 files limit
- Responsive design
- Loading states during upload

## Usage

```jsx
import SubmitListingPhotos from '../islands/shared/SubmitListingPhotos';

function MyComponent() {
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleSuccess = () => {
    console.log('Photos uploaded successfully!');
    // Refresh listing or perform other actions
  };

  return (
    <>
      <button onClick={() => setShowUploadModal(true)}>
        Upload Photos
      </button>

      {showUploadModal && (
        <SubmitListingPhotos
          listingId="your-listing-id"
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `listingId` | string | Yes | The ID of the listing to upload photos to |
| `onClose` | function | Yes | Callback function when modal is closed |
| `onSuccess` | function | No | Callback function when upload succeeds |

## Sub-components

- **DeletePhotoModal**: Confirmation dialog for deleting photos from preview

## Implementation Notes

- Integrated with Bubble API workflow for photo uploads
- File validation happens on client side before upload
- Preview images are generated using FileReader API
- Modal overlays use z-index 1000 and 2000 to ensure proper layering
- Uses FormData to send multiple images in a single request

## API Integration

### Bubble Workflow Setup

The component calls the Bubble API workflow: `create-listing-photos-bulk`

**Endpoint:** `https://app.split.lease/api/1.1/wf/create-listing-photos-bulk`

**Required Bubble Workflow Parameters:**
- `listing_id` (text) - The ID of the listing
- `photos` (list of images) - Array of image files

**Expected Bubble Workflow Steps:**
1. Get Listing by `listing_id`
2. Loop through `photos` list
3. For each photo, create a "Listing - Photo" entry with:
   - Photo = Current photo
   - Listing = Listing from step 1
   - Sort Order = Current index
   - Any other required fields

**Response Format:**
```json
{
  "status": "success",
  "count": 5,
  "message": "Photos uploaded successfully"
}
```

### Environment Variables

Requires `VITE_BUBBLE_API_KEY` to be set in `.env` file (already configured).

## Repository

Original component source: https://github.com/splitleasesharath/submit-listing-photos.git
