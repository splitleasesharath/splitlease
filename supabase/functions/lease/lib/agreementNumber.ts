/**
 * Agreement Number Generator for Lease Edge Function
 * Split Lease - Supabase Edge Functions
 *
 * Generates lease agreement numbers in the format: SL-XXXXX
 * Based on the Bubble.io workflow logic for lease numbering.
 */

/**
 * Generate agreement number in format: SL-XXXXX
 * Where XXXXX is zero-padded based on lease count
 *
 * From Bubble workflow:
 * - numberOfZeros = count < 10 ? 4 : count < 100 ? 3 : 2
 * - This ensures proper padding as lease count grows
 *
 * Examples:
 * - Lease #1  -> SL-00001 (4 zeros)
 * - Lease #10 -> SL-00010 (3 zeros)
 * - Lease #100 -> SL-0100 (2 zeros)
 * - Lease #1000 -> SL-1000 (no additional zeros)
 *
 * @param leaseCount - Current count of existing leases (0-indexed)
 * @param numberOfZeros - Override for zero padding (optional)
 * @returns Agreement number string
 */
export function generateAgreementNumber(
  leaseCount: number,
  numberOfZeros?: number
): string {
  // Calculate zeros based on current count if not provided
  const zeros = numberOfZeros ?? calculateNumberOfZeros(leaseCount);

  // New lease number is count + 1 (1-indexed)
  const leaseNumber = leaseCount + 1;

  // Pad with zeros to ensure minimum length
  // If zeros = 4, total length should be at least 5 digits
  const padded = String(leaseNumber).padStart(zeros + 1, '0');

  return `SL-${padded}`;
}

/**
 * Calculate the number of leading zeros based on lease count
 * This matches the Bubble.io workflow logic exactly
 *
 * @param count - Current lease count
 * @returns Number of leading zeros to use
 */
export function calculateNumberOfZeros(count: number): number {
  if (count < 10) {
    return 4; // Results in SL-0000X (5 digits total)
  }
  if (count < 100) {
    return 3; // Results in SL-000XX (5 digits total)
  }
  if (count < 1000) {
    return 2; // Results in SL-00XXX (5 digits total)
  }
  // For 1000+, let the number grow naturally
  return 1;
}

/**
 * Validate an agreement number format
 *
 * @param agreementNumber - Agreement number to validate
 * @returns True if valid format
 */
export function isValidAgreementNumber(agreementNumber: string): boolean {
  // Format: SL-XXXXX where X is a digit
  const pattern = /^SL-\d{4,}$/;
  return pattern.test(agreementNumber);
}

/**
 * Parse lease number from agreement number
 *
 * @param agreementNumber - Agreement number (e.g., "SL-00123")
 * @returns Numeric lease number (e.g., 123)
 */
export function parseLeaseNumber(agreementNumber: string): number {
  if (!isValidAgreementNumber(agreementNumber)) {
    throw new Error(`Invalid agreement number format: ${agreementNumber}`);
  }

  const numericPart = agreementNumber.replace('SL-', '');
  return parseInt(numericPart, 10);
}
