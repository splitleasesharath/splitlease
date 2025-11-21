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

- Currently uses simulated upload API - replace with actual Supabase storage integration
- File validation happens on client side before upload
- Preview images are generated using FileReader API
- Modal overlays use z-index 1000 and 2000 to ensure proper layering

## API Integration

To integrate with Supabase storage, replace the simulated upload in `handleUpload()` with:

```javascript
// Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('listing-photos')
  .upload(`${listingId}/${Date.now()}-${fileData.file.name}`, fileData.file);
```

## Repository

Original component source: https://github.com/splitleasesharath/submit-listing-photos.git
