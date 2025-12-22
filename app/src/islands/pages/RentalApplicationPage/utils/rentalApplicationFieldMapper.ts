/**
 * Rental Application Field Mapper
 *
 * Transforms database field names to form field names.
 * Handles type conversions (boolean to 'yes'/'no', jsonb extraction, etc.)
 */

import type { RentalApplicationFormData, Occupant } from '../store/rentalApplicationLocalStore';

/**
 * Database record type (from rentalapplication table)
 */
interface DatabaseRentalApplication {
  _id: string;
  name: string;
  email: string;
  DOB: string | null;
  'phone number': string | null;
  'permanent address': { address: string } | null;
  'apartment number': string | null;
  'length resided': string | null;
  renting: boolean;
  'employment status': string | null;
  'employer name': string | null;
  'employer phone number': string | null;
  'job title': string | null;
  'Monthly Income': number | null;
  'business legal name': string | null;
  'year business was created?': number | null;
  'state business registered': string | null;
  'occupants list': Occupant[] | null;
  pets: boolean;
  smoking: boolean;
  parking: boolean;
  references: string[] | null;
  signature: string | null;
  'signature (text)': string | null;
  submitted: boolean;
  'percentage % done': number | null;
}

/**
 * Convert boolean to 'yes'/'no'/'' string for form dropdowns
 */
function booleanToYesNo(value: boolean | null | undefined): string {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return '';
}

/**
 * Safely convert number to string
 */
function numberToString(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Extract address string from JSONB address object
 */
function extractAddress(value: { address: string } | null | undefined): string {
  if (!value || typeof value !== 'object') return '';
  return value.address || '';
}

/**
 * Extract first reference from references array
 */
function extractFirstReference(value: string[] | null | undefined): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  return value[0] || '';
}

/**
 * Map database record to form data
 */
export function mapDatabaseToFormData(
  dbRecord: Record<string, unknown>
): {
  formData: Partial<RentalApplicationFormData>;
  occupants: Occupant[];
} {
  const db = dbRecord as unknown as DatabaseRentalApplication;

  // Determine monthly income based on employment status
  let monthlyIncome = '';
  let monthlyIncomeSelf = '';

  if (db['employment status'] === 'full-time' || db['employment status'] === 'part-time') {
    monthlyIncome = numberToString(db['Monthly Income']);
  } else if (db['employment status'] === 'business-owner' || db['employment status'] === 'self-employed') {
    monthlyIncomeSelf = numberToString(db['Monthly Income']);
  }

  const formData: Partial<RentalApplicationFormData> = {
    // Personal Information
    fullName: db.name || '',
    dob: db.DOB || '',
    email: db.email || '',
    phone: db['phone number'] || '',

    // Current Address
    currentAddress: extractAddress(db['permanent address']),
    apartmentUnit: db['apartment number'] || '',
    lengthResided: db['length resided'] || '',
    renting: booleanToYesNo(db.renting),

    // Employment Information
    employmentStatus: db['employment status'] || '',

    // Employed fields
    employerName: db['employer name'] || '',
    employerPhone: db['employer phone number'] || '',
    jobTitle: db['job title'] || '',
    monthlyIncome: monthlyIncome,

    // Self-employed fields
    businessName: db['business legal name'] || '',
    businessYear: numberToString(db['year business was created?']),
    businessState: db['state business registered'] || '',
    monthlyIncomeSelf: monthlyIncomeSelf,

    // Special requirements
    hasPets: booleanToYesNo(db.pets),
    isSmoker: booleanToYesNo(db.smoking),
    needsParking: booleanToYesNo(db.parking),

    // References
    references: extractFirstReference(db.references),

    // Signature - prefer signature (text) if available
    signature: db['signature (text)'] || db.signature || '',
  };

  // Parse occupants
  const occupants: Occupant[] = Array.isArray(db['occupants list'])
    ? db['occupants list']
    : [];

  return { formData, occupants };
}
