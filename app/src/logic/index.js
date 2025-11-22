/**
 * Logic Core - Main Index
 * Central export point for all Logic Core functions.
 *
 * Architecture:
 * - CALCULATORS: Pure math functions (same input = same output)
 * - RULES: Boolean predicates (enforce business rules)
 * - PROCESSORS: Data transformation ("Truth" layer, NO FALLBACK)
 * - WORKFLOWS: Orchestration (compose multiple functions)
 *
 * Principles:
 * - No React dependencies
 * - No JSX allowed
 * - No fallback patterns (||, ??, try-catch silencing)
 * - Named parameters for clarity
 * - Strict type checking
 * - Descriptive error messages
 * - 100% unit testable
 */

// Re-export all pillars
export * from './calculators/index.js'
export * from './rules/index.js'
export * from './processors/index.js'
export * from './workflows/index.js'
