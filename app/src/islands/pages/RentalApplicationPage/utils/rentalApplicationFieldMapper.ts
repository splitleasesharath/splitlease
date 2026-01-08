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
  // File URL fields
  'proof of employment': string | null;
  'alternate guarantee': string | null;
  'credit score': string | null;
  'State ID - Front': string | null;
  'State ID - Back': string | null;
  'government ID': string | null;
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
 * Normalize employment status to match frontend dropdown values
 * Database may store "Full-time", "Part-time", etc. but frontend expects lowercase kebab-case
 */
function normalizeEmploymentStatus(value: string | null | undefined): string {
  if (!value) return '';

  // Normalize to lowercase and handle common variations
  const normalized = value.toLowerCase().trim();

  // Map known values to expected dropdown values
  const statusMap: Record<string, string> = {
    'full-time': 'full-time',
    'full time': 'full-time',
    'fulltime': 'full-time',
    'part-time': 'part-time',
    'part time': 'part-time',
    'parttime': 'part-time',
    'business-owner': 'business-owner',
    'business owner': 'business-owner',
    'self-employed': 'business-owner',
    'selfemployed': 'business-owner',
    'intern': 'intern',
    'student': 'student',
    'unemployed': 'unemployed',
    'other': 'other',
  };

  return statusMap[normalized] || normalized;
}

/**
 * Map database record to form data
 *
 * @param dbRecord - The raw database record from rentalapplication table
 * @param fallbackEmail - Optional fallback email (e.g., from user table) if rental app email is empty
 */
export function mapDatabaseToFormData(
  dbRecord: Record<string, unknown>,
  fallbackEmail?: string
): {
  formData: Partial<RentalApplicationFormData>;
  occupants: Occupant[];
} {
  const db = dbRecord as unknown as DatabaseRentalApplication;

  // Normalize employment status for dropdown matching
  const employmentStatus = normalizeEmploymentStatus(db['employment status']);

  // Determine monthly income based on employment status
  let monthlyIncome = '';
  let monthlyIncomeSelf = '';

  if (employmentStatus === 'full-time' || employmentStatus === 'part-time' || employmentStatus === 'intern') {
    monthlyIncome = numberToString(db['Monthly Income']);
  } else if (employmentStatus === 'business-owner') {
    monthlyIncomeSelf = numberToString(db['Monthly Income']);
  }

  const formData: Partial<RentalApplicationFormData> = {
    // Personal Information
    fullName: db.name || '',
    dob: db.DOB || '',
    email: db.email || fallbackEmail || '',
    phone: db['phone number'] || '',

    // Current Address
    currentAddress: extractAddress(db['permanent address']),
    apartmentUnit: db['apartment number'] || '',
    lengthResided: db['length resided'] || '',
    renting: booleanToYesNo(db.renting),

    // Employment Information (normalized to match dropdown values)
    employmentStatus: employmentStatus,

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

    // File URLs
    proofOfEmploymentUrl: db['proof of employment'] || '',
    alternateGuaranteeUrl: db['alternate guarantee'] || '',
    creditScoreUrl: db['credit score'] || '',
    stateIdFrontUrl: db['State ID - Front'] || '',
    stateIdBackUrl: db['State ID - Back'] || '',
    governmentIdUrl: db['government ID'] || '',
  };

  // Parse occupants
  const occupants: Occupant[] = Array.isArray(db['occupants list'])
    ? db['occupants list']
    : [];

  return { formData, occupants };
}
