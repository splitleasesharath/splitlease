/**
 * @fileoverview Password strength calculation utility
 * Analyzes password strength and provides feedback
 */

import type { PasswordStrength, PasswordStrengthResult } from '../SignupLogin.types';

/**
 * Calculates password strength based on multiple criteria
 * @param password - The password to analyze
 * @returns Password strength result with score and feedback
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      strength: 'weak',
      score: 0,
      feedback: ['Password is required'],
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password)) score += 1;

  // Penalty for common patterns
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111)
    /^(password|123456|qwerty)/i, // Common passwords
    /^[0-9]+$/, // Only numbers
    /^[a-z]+$/i, // Only letters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score -= 1;
    }
  }

  // Ensure score is in valid range
  score = Math.max(0, Math.min(score, 10));

  // Determine strength level
  let strength: PasswordStrength;
  if (score <= 3) {
    strength = 'weak';
    feedback.push('Consider a longer password with more variety');
  } else if (score <= 6) {
    strength = 'medium';
    feedback.push('Good password, but could be stronger');
  } else {
    strength = 'strong';
    feedback.push('Excellent password strength!');
  }

  return {
    strength,
    score,
    feedback,
  };
}
