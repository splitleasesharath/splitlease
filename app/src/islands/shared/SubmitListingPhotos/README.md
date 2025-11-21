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

### Bubble Workflow

The component calls the existing Bubble API workflow: `listing_photos_section_in_code`

**Endpoint:** `https://app.split.lease/api/1.1/wf/listing_photos_section_in_code`

**Method:** POST

**API Parameters:**
- `Listing_id` (text, querystring) - The ID of the listing
- `Photos` (image, list/array, querystring) - Array of image files to upload

**Workflow Actions:**
1. Makes changes to Listing - Search for the listing by `Listing_id`
2. Schedule API Workflow: `create-each-listing-photo` (handles individual photo creation)
3. Schedule API Workflow: `l2-submit-listing` (finalizes listing submission)

**FormData Structure:**
```javascript
formData.append('Listing_id', listingId);
uploadedFiles.forEach((fileData) => {
  formData.append('Photos', fileData.file);
});
```

### Environment Variables

Requires `VITE_BUBBLE_API_KEY` to be set in `.env` file (already configured).

## Repository

Original component source: https://github.com/splitleasesharath/submit-listing-photos.git
