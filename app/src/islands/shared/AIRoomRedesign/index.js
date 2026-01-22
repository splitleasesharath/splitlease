/**
 * AI Room Redesign Component Exports
 *
 * Usage:
 * ```jsx
 * import { AIRoomRedesign } from '../islands/shared/AIRoomRedesign';
 *
 * function MyPage() {
 *   const [isOpen, setIsOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setIsOpen(true)}>Redesign Room</button>
 *
 *       <AIRoomRedesign
 *         isOpen={isOpen}
 *         onClose={() => setIsOpen(false)}
 *         onRedesignComplete={(imageUrl) => {
 *           console.log('Redesigned image:', imageUrl);
 *         }}
 *         defaultPhotoType="living-room"
 *       />
 *     </>
 *   );
 * }
 * ```
 */

// Main component
export { AIRoomRedesign } from './AIRoomRedesign';

// Sub-components (for advanced customization)
export { FileUploader } from './FileUploader';
export { RoomStyleSelector } from './RoomStyleSelector';
export { PhotoTypeDropdown } from './PhotoTypeDropdown';
export { LoadingOverlay } from './LoadingOverlay';
export { ResultImageOverlay } from './ResultImageOverlay';

// Hooks
export { useFileUpload } from './useFileUpload';
export { useRoomRedesign } from './useRoomRedesign';

// Data
export { defaultRoomStyles, photoTypeOptions } from './roomStyles';

// Utilities
export {
  fileToBase64,
  fileToDataUrl,
  validateFileSize,
  validateFileType,
  formatFileSize,
  downloadImage,
  base64ToBlob,
} from './fileUtils';
