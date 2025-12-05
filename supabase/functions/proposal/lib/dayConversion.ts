/**
 * Day Index Conversion Utilities
 * Split Lease - Supabase Edge Functions
 *
 * CRITICAL: Day index conversion between Bubble.io and JavaScript
 *
 * | System     | Sun | Mon | Tue | Wed | Thu | Fri | Sat |
 * |------------|-----|-----|-----|-----|-----|-----|-----|
 * | JavaScript | 0   | 1   | 2   | 3   | 4   | 5   | 6   |
 * | Bubble API | 1   | 2   | 3   | 4   | 5   | 6   | 7   |
 *
 * Always convert at system boundaries:
 * - FROM Bubble (API input) → adaptDaysFromBubble()
 * - TO Bubble (database storage) → use Bubble format directly
 */

/**
 * Convert day indices from Bubble format (1-7) to JavaScript format (0-6)
 * Use when READING days from Bubble API or database
 */
export function adaptDaysFromBubble(bubbleDays: number[]): number[] {
  return bubbleDays.map((d) => d - 1);
}

/**
 * Convert day indices from JavaScript format (0-6) to Bubble format (1-7)
 * Use when calculating with JS Date objects then storing
 */
export function adaptDaysToBubble(jsDays: number[]): number[] {
  return jsDays.map((d) => d + 1);
}

/**
 * Convert night indices from Bubble format (1-7) to JavaScript format (0-6)
 */
export function adaptNightsFromBubble(bubbleNights: number[]): number[] {
  return bubbleNights.map((n) => n - 1);
}

/**
 * Convert night indices from JavaScript format (0-6) to Bubble format (1-7)
 */
export function adaptNightsToBubble(jsNights: number[]): number[] {
  return jsNights.map((n) => n + 1);
}

/**
 * Validate that day indices are in correct range for the specified source
 * @param days Array of day indices to validate
 * @param source 'bubble' (1-7) or 'js' (0-6)
 * @returns true if all indices are valid
 */
export function validateDayIndices(
  days: number[],
  source: "bubble" | "js"
): boolean {
  if (!Array.isArray(days)) return false;

  const min = source === "bubble" ? 1 : 0;
  const max = source === "bubble" ? 7 : 6;

  return days.every((d) => Number.isInteger(d) && d >= min && d <= max);
}

/**
 * Validate that night indices are in correct range for the specified source
 * @param nights Array of night indices to validate
 * @param source 'bubble' (1-7) or 'js' (0-6)
 * @returns true if all indices are valid
 */
export function validateNightIndices(
  nights: number[],
  source: "bubble" | "js"
): boolean {
  return validateDayIndices(nights, source); // Same validation logic
}

/**
 * Get day name from Bubble index (1-7)
 */
export function getDayNameFromBubbleIndex(bubbleIndex: number): string {
  const dayNames = [
    "Sunday", // 1
    "Monday", // 2
    "Tuesday", // 3
    "Wednesday", // 4
    "Thursday", // 5
    "Friday", // 6
    "Saturday", // 7
  ];
  return dayNames[bubbleIndex - 1] || "Unknown";
}

/**
 * Get night name from Bubble index (1-7)
 */
export function getNightNameFromBubbleIndex(bubbleIndex: number): string {
  const nightNames = [
    "Sunday Night", // 1
    "Monday Night", // 2
    "Tuesday Night", // 3
    "Wednesday Night", // 4
    "Thursday Night", // 5
    "Friday Night", // 6
    "Saturday Night", // 7
  ];
  return nightNames[bubbleIndex - 1] || "Unknown";
}

/**
 * Convert Bubble day index to short name for display
 */
export function getDayShortName(bubbleIndex: number): string {
  const shortNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return shortNames[bubbleIndex - 1] || "???";
}

/**
 * Format array of Bubble day indices as readable string
 * Example: [2, 3, 4, 5, 6] → "Mon, Tue, Wed, Thu, Fri"
 */
export function formatDaysForDisplay(bubbleDays: number[]): string {
  return bubbleDays.map(getDayShortName).join(", ");
}
