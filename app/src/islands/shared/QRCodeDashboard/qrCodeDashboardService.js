/**
 * QR Code Dashboard Service Layer
 *
 * Handles CRUD operations for QR codes via Supabase.
 * Includes data adapters for converting between DB and component models.
 */

import { supabase } from '../../../lib/supabase.js';
import { getUseCaseByName } from './qrCodeUseCases.js';

// ============================================================================
// DATA ADAPTERS
// ============================================================================

/**
 * Adapt a QR code row from database format to component model.
 * Database uses space-separated column names like "Long URL", "Use Case".
 *
 * @param {object} row - Raw database row from qrcodes table
 * @returns {object} Component-friendly QR code object
 */
export const adaptQRCodeFromDB = (row) => {
  if (!row) return null;

  const useCaseName = row['Use Case'] || '';
  const useCase = getUseCaseByName(useCaseName);

  return {
    id: row._id,
    title: useCaseName || 'Untitled',
    content: row['Long URL'] || '',
    shortUrl: row['Short URL'] || null,
    qrImageUrl: row['QR Image'] || null,
    useCaseId: useCase?.id || 'custom',
    useCaseName: useCaseName,
    houseManualId: row['House Manual'] || null,
    hostId: row['Host'] || null,
    guestId: row['Guest'] || null,
    createdAt: row['Created Date'] ? new Date(row['Created Date']) : null,
    updatedAt: row['Modified Date'] ? new Date(row['Modified Date']) : null,
    isScanned: row['QR codes scanned?'] || false
  };
};

/**
 * Adapt a QR code from component model to database format for create/update.
 *
 * @param {object} qrCode - Component QR code object
 * @param {string} houseManualId - House manual ID (foreign key)
 * @param {string} hostId - Host user ID
 * @returns {object} Database-ready row object
 */
export const adaptQRCodeToDB = (qrCode, houseManualId, hostId) => {
  const dbRow = {
    'Use Case': qrCode.useCaseName || qrCode.title,
    'Long URL': qrCode.content,
    'House Manual': houseManualId,
    'Modified Date': new Date().toISOString()
  };

  // Only include Host if provided
  if (hostId) {
    dbRow['Host'] = hostId;
  }

  return dbRow;
};

/**
 * Adapt house manual row from database format.
 *
 * @param {object} row - Raw database row from housemanual table
 * @returns {object} Component-friendly house manual object
 */
export const adaptHouseManualFromDB = (row) => {
  if (!row) return null;

  return {
    id: row._id,
    name: row['House manual Name'] || 'Untitled Manual',
    listingId: row['Listing'] || null,
    hostId: row['Host'] || null,
    qrCodes: row['QR Codes'] || [],
    createdAt: row['Created Date'] ? new Date(row['Created Date']) : null,
    updatedAt: row['Modified Date'] ? new Date(row['Modified Date']) : null
  };
};

// ============================================================================
// SERVICE METHODS
// ============================================================================

/**
 * Fetch all QR codes for a specific house manual.
 *
 * @param {string} houseManualId - House manual ID
 * @returns {Promise<{status: string, data?: Array, message?: string}>}
 */
export async function fetchQRCodes(houseManualId) {
  try {
    if (!houseManualId) {
      throw new Error('House manual ID is required');
    }

    const { data, error } = await supabase
      .from('qrcodes')
      .select('*')
      .eq('House Manual', houseManualId)
      .order('Created Date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch QR codes: ${error.message}`);
    }

    const qrCodes = (data || []).map(adaptQRCodeFromDB);

    return {
      status: 'success',
      data: qrCodes
    };
  } catch (error) {
    console.error('QRCodeDashboardService.fetchQRCodes:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch a house manual by ID.
 *
 * @param {string} houseManualId - House manual ID
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function fetchHouseManual(houseManualId) {
  try {
    if (!houseManualId) {
      throw new Error('House manual ID is required');
    }

    const { data, error } = await supabase
      .from('housemanual')
      .select('_id, "House manual Name", "Listing", "Host", "QR Codes", "Created Date", "Modified Date"')
      .eq('_id', houseManualId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch house manual: ${error.message}`);
    }

    return {
      status: 'success',
      data: adaptHouseManualFromDB(data)
    };
  } catch (error) {
    console.error('QRCodeDashboardService.fetchHouseManual:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Create a new QR code.
 *
 * @param {object} qrCode - QR code data (useCaseName, content)
 * @param {string} houseManualId - House manual ID
 * @param {string} hostId - Host user ID
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function createQRCode(qrCode, houseManualId, hostId) {
  try {
    if (!qrCode || !houseManualId) {
      throw new Error('QR code data and house manual ID are required');
    }

    const row = adaptQRCodeToDB(qrCode, houseManualId, hostId);
    row['Created Date'] = new Date().toISOString();
    row['Created By'] = hostId || null;

    const { data, error } = await supabase
      .from('qrcodes')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create QR code: ${error.message}`);
    }

    return {
      status: 'success',
      data: adaptQRCodeFromDB(data)
    };
  } catch (error) {
    console.error('QRCodeDashboardService.createQRCode:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update an existing QR code.
 *
 * @param {string} qrCodeId - QR code ID to update
 * @param {object} updates - Fields to update (useCaseName, content)
 * @returns {Promise<{status: string, data?: object, message?: string}>}
 */
export async function updateQRCode(qrCodeId, updates) {
  try {
    if (!qrCodeId) {
      throw new Error('QR code ID is required');
    }

    const dbUpdates = {
      'Modified Date': new Date().toISOString()
    };

    if (updates.useCaseName !== undefined) {
      dbUpdates['Use Case'] = updates.useCaseName;
    }

    if (updates.content !== undefined) {
      dbUpdates['Long URL'] = updates.content;
    }

    const { data, error } = await supabase
      .from('qrcodes')
      .update(dbUpdates)
      .eq('_id', qrCodeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update QR code: ${error.message}`);
    }

    return {
      status: 'success',
      data: adaptQRCodeFromDB(data)
    };
  } catch (error) {
    console.error('QRCodeDashboardService.updateQRCode:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a QR code.
 *
 * @param {string} qrCodeId - QR code ID to delete
 * @returns {Promise<{status: string, message?: string}>}
 */
export async function deleteQRCode(qrCodeId) {
  try {
    if (!qrCodeId) {
      throw new Error('QR code ID is required');
    }

    const { error } = await supabase
      .from('qrcodes')
      .delete()
      .eq('_id', qrCodeId);

    if (error) {
      throw new Error(`Failed to delete QR code: ${error.message}`);
    }

    return {
      status: 'success'
    };
  } catch (error) {
    console.error('QRCodeDashboardService.deleteQRCode:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete multiple QR codes.
 *
 * @param {Array<string>} qrCodeIds - Array of QR code IDs to delete
 * @returns {Promise<{status: string, deletedCount?: number, message?: string}>}
 */
export async function deleteMultipleQRCodes(qrCodeIds) {
  try {
    if (!qrCodeIds || qrCodeIds.length === 0) {
      throw new Error('At least one QR code ID is required');
    }

    const { error } = await supabase
      .from('qrcodes')
      .delete()
      .in('_id', qrCodeIds);

    if (error) {
      throw new Error(`Failed to delete QR codes: ${error.message}`);
    }

    return {
      status: 'success',
      deletedCount: qrCodeIds.length
    };
  } catch (error) {
    console.error('QRCodeDashboardService.deleteMultipleQRCodes:', error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export as service object
export const qrCodeDashboardService = {
  // Data adapters
  adaptQRCodeFromDB,
  adaptQRCodeToDB,
  adaptHouseManualFromDB,

  // CRUD operations
  fetchQRCodes,
  fetchHouseManual,
  createQRCode,
  updateQRCode,
  deleteQRCode,
  deleteMultipleQRCodes
};

export default qrCodeDashboardService;
