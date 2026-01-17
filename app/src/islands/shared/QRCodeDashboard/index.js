/**
 * QRCodeDashboard - Main Export File
 *
 * Export all components, services, hooks, and utilities.
 */

// Main Component
export { default as QRCodeDashboard } from './QRCodeDashboard.jsx';
export { default } from './QRCodeDashboard.jsx';

// Logic Hook
export { useQRCodeDashboardLogic } from './useQRCodeDashboardLogic.js';

// Service Layer
export { default as qrCodeDashboardService } from './qrCodeDashboardService.js';
export {
  fetchQRCodes,
  fetchHouseManual,
  createQRCode,
  updateQRCode,
  deleteQRCode,
  deleteMultipleQRCodes,
  adaptQRCodeFromDB,
  adaptQRCodeToDB,
  adaptHouseManualFromDB
} from './qrCodeDashboardService.js';

// Configuration
export {
  QR_CODE_USE_CASES,
  getUseCaseById,
  getUseCaseByName,
  getUseCasesByCategory,
  getCategories
} from './qrCodeUseCases.js';

// Sub-components
export { QRCodeCard, QRCodeGrid, QRCodeForm, PrintPreview } from './components/index.js';
