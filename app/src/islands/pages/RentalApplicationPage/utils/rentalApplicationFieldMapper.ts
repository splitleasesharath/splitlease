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
 * Database may store "Full-time Employee", "Part-time", etc. but frontend expects lowercase kebab-case
 */
function normalizeEmploymentStatus(value: string | null | undefined): string {
  if (!value) return '';

  // Normalize to lowercase and handle common variations
  const normalized = value.toLowerCase().trim();

  // Map known values to expected dropdown values
  const statusMap: Record<string, string> = {
    // Full-time variations (including Bubble's "Full-time Employee")
    'full-time': 'full-time',
    'full time': 'full-time',
    'fulltime': 'full-time',
    'full-time employee': 'full-time',
    'full time employee': 'full-time',
    // Part-time variations
    'part-time': 'part-time',
    'part time': 'part-time',
    'parttime': 'part-time',
    'part-time employee': 'part-time',
    'part time employee': 'part-time',
    // Business owner variations
    'business-owner': 'business-owner',
    'business owner': 'business-owner',
    'self-employed': 'business-owner',
    'selfemployed': 'business-owner',
    // Other statuses
    'intern': 'intern',
    'student': 'student',
    'unemployed': 'unemployed',
    'other': 'other',
  };

  return statusMap[normalized] || normalized;
}

/**
 * Normalize DOB from ISO datetime to date-only format (YYYY-MM-DD)
 * Database may store "1996-01-05T05:00:00.000Z" but form expects "1996-01-05"
 */
function normalizeDOB(value: string | null | undefined): string {
  if (!value) return '';
  // If it contains 'T', extract just the date portion
  if (value.includes('T')) {
    return value.split('T')[0];
  }
  return value;
}

/**
 * Extract address string from JSONB address object
 * Handles both parsed object and string (from database JSON)
 */
function extractAddressRobust(value: unknown): string {
  if (!value) return '';

  // If it's a string, try to parse it as JSON
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'address' in parsed) {
        return parsed.address || '';
      }
    } catch {
      // Not JSON, return as-is if it looks like an address
      return value;
    }
  }

  // If it's already an object
  if (typeof value === 'object' && value !== null && 'address' in value) {
    return (value as { address: string }).address || '';
  }

  return '';
}

/**
 * Normalize length resided to match dropdown values
 * Dropdown options: 'less-than-1-year', '1-2-years', '2-5-years', '5-plus-years'
 * Database may store "3 years", "1 year", etc.
 */
function normalizeLengthResided(value: string | null | undefined): string {
  if (!value) return '';

  const normalized = value.toLowerCase().trim();

  // Direct matches first
  const directMap: Record<string, string> = {
    'less-than-1-year': 'less-than-1-year',
    '1-2-years': '1-2-years',
    '2-5-years': '2-5-years',
    '5-plus-years': '5-plus-years',
  };

  if (directMap[normalized]) {
    return directMap[normalized];
  }

  // Parse numeric values and map to ranges
  // Extract number from strings like "3 years", "1 year", etc.
  const numMatch = normalized.match(/(\d+)/);
  if (numMatch) {
    const years = parseInt(numMatch[1], 10);
    if (years < 1) return 'less-than-1-year';
    if (years >= 1 && years < 2) return '1-2-years';
    if (years >= 2 && years < 5) return '2-5-years';
    if (years >= 5) return '5-plus-years';
  }

  // Text-based matches
  if (normalized.includes('less than') || normalized.includes('< 1')) {
    return 'less-than-1-year';
  }
  if (normalized.includes('5+') || normalized.includes('more than 5') || normalized.includes('5 plus')) {
    return '5-plus-years';
  }

  return value;
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
    dob: normalizeDOB(db.DOB),
    email: db.email || fallbackEmail || '',
    phone: db['phone number'] || '',

    // Current Address (use robust extractor for JSONB that may come as string)
    currentAddress: extractAddressRobust(db['permanent address']),
    apartmentUnit: db['apartment number'] || '',
    lengthResided: normalizeLengthResided(db['length resided']),
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

  // Parse occupants - handle both array and stringified array
  let occupants: Occupant[] = [];
  if (Array.isArray(db['occupants list'])) {
    occupants = db['occupants list'];
  } else if (typeof db['occupants list'] === 'string') {
    try {
      const parsed = JSON.parse(db['occupants list']);
      if (Array.isArray(parsed)) {
        // Bubble stores occupant IDs as strings, not full objects
        // For now, we'll treat these as empty since we don't have the actual data
        occupants = [];
      }
    } catch {
      occupants = [];
    }
  }

  // Calculate completed steps based on filled fields
  const completedSteps = calculateCompletedSteps(formData, occupants, employmentStatus);

  // Determine last step - if submitted, user has completed all steps
  const lastStep = db.submitted ? 7 : findLastCompletedStep(completedSteps);

  return { formData, occupants, completedSteps, lastStep };
}

/**
 * Step field requirements (mirrors STEP_FIELDS in useRentalApplicationWizardLogic)
 */
const STEP_FIELDS: Record<number, string[]> = {
  1: ['fullName', 'dob', 'email', 'phone'],           // Personal Info
  2: ['currentAddress', 'lengthResided', 'renting'],   // Address
  3: [],                                                // Occupants (optional)
  4: ['employmentStatus'],                              // Employment
  5: [],                                                // Requirements (optional)
  6: [],                                                // Documents (optional)
  7: ['signature'],                                     // Review & Sign
};

/**
 * Conditional required fields based on employment status
 */
const CONDITIONAL_REQUIRED_FIELDS: Record<string, string[]> = {
  'full-time': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'part-time': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'intern': ['employerName', 'employerPhone', 'jobTitle', 'monthlyIncome'],
  'business-owner': ['businessName', 'businessYear', 'businessState'],
};

/**
 * Check if a step is complete based on form data
 */
function isStepComplete(
  stepNumber: number,
  formData: Partial<RentalApplicationFormData>,
  occupants: Occupant[],
  employmentStatus: string
): boolean {
  let stepFields = [...STEP_FIELDS[stepNumber]];

  // Add conditional employment fields for step 4
  if (stepNumber === 4 && employmentStatus) {
    const conditionalFields = CONDITIONAL_REQUIRED_FIELDS[employmentStatus] || [];
    stepFields = [...stepFields, ...conditionalFields];
  }

  // Optional steps (3, 5, 6) are considered complete if we have any related data
  if (stepNumber === 3) {
    // Occupants step - complete if we have occupants or explicitly no occupants
    return true; // Always allow progression, occupants are optional
  }

  if (stepNumber === 5) {
    // Requirements step - complete if any requirement field has a value
    const hasAnyRequirement =
      formData.hasPets !== '' ||
      formData.isSmoker !== '' ||
      formData.needsParking !== '';
    return hasAnyRequirement || true; // Optional, so always complete
  }

  if (stepNumber === 6) {
    // Documents step - complete if any document is uploaded
    const hasAnyDocument =
      !!formData.proofOfEmploymentUrl ||
      !!formData.alternateGuaranteeUrl ||
      !!formData.creditScoreUrl ||
      !!formData.stateIdFrontUrl ||
      !!formData.stateIdBackUrl ||
      !!formData.governmentIdUrl;
    return hasAnyDocument || true; // Optional, so always complete
  }

  // If no required fields for this step, it's complete
  if (stepFields.length === 0) {
    return true;
  }

  // Check all required fields have values
  return stepFields.every(field => {
    const value = formData[field as keyof RentalApplicationFormData];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Calculate which steps are complete based on form data
 */
function calculateCompletedSteps(
  formData: Partial<RentalApplicationFormData>,
  occupants: Occupant[],
  employmentStatus: string
): number[] {
  const completed: number[] = [];

  for (let step = 1; step <= 7; step++) {
    if (isStepComplete(step, formData, occupants, employmentStatus)) {
      completed.push(step);
    }
  }

  return completed;
}

/**
 * Find the last completed step (for initial navigation)
 */
function findLastCompletedStep(completedSteps: number[]): number {
  if (completedSteps.length === 0) return 1;
  return Math.max(...completedSteps);
}
