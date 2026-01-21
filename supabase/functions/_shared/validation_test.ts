/**
 * Unit tests for validation utilities
 * Split Lease - Supabase Edge Functions
 *
 * Tests cover:
 * - validateEmail() - email format validation
 * - validatePhone() - US phone number validation
 * - validatePhoneE164() - E.164 format validation
 * - validateRequired() - single field presence validation
 * - validateRequiredFields() - multiple fields presence validation
 * - validateAction() - action whitelist validation
 */

import { assertEquals, assertThrows } from 'jsr:@std/assert';
import {
  validateEmail,
  validatePhone,
  validatePhoneE164,
  validateRequired,
  validateRequiredFields,
  validateAction,
} from './validation.ts';
import { ValidationError } from './errors.ts';

// ─────────────────────────────────────────────────────────────
// Email Validation Tests
// ─────────────────────────────────────────────────────────────

Deno.test('validateEmail() accepts valid email', () => {
  // Should not throw
  validateEmail('user@example.com');
});

Deno.test('validateEmail() accepts email with subdomain', () => {
  validateEmail('user@mail.example.com');
});

Deno.test('validateEmail() accepts email with plus sign', () => {
  validateEmail('user+tag@example.com');
});

Deno.test('validateEmail() accepts email with dots in local part', () => {
  validateEmail('first.last@example.com');
});

Deno.test('validateEmail() accepts email with numbers', () => {
  validateEmail('user123@example123.com');
});

Deno.test('validateEmail() accepts email with hyphen in domain', () => {
  validateEmail('user@my-domain.com');
});

Deno.test('validateEmail() rejects missing @ symbol', () => {
  assertThrows(
    () => validateEmail('userexample.com'),
    ValidationError,
    'Invalid email format'
  );
});

Deno.test('validateEmail() rejects missing domain', () => {
  assertThrows(
    () => validateEmail('user@'),
    ValidationError,
    'Invalid email format'
  );
});

Deno.test('validateEmail() rejects missing local part', () => {
  assertThrows(
    () => validateEmail('@example.com'),
    ValidationError,
    'Invalid email format'
  );
});

Deno.test('validateEmail() rejects empty string', () => {
  assertThrows(
    () => validateEmail(''),
    ValidationError,
    'Invalid email format'
  );
});

Deno.test('validateEmail() rejects missing TLD', () => {
  assertThrows(
    () => validateEmail('user@example'),
    ValidationError,
    'Invalid email format'
  );
});

Deno.test('validateEmail() rejects spaces', () => {
  assertThrows(
    () => validateEmail('user @example.com'),
    ValidationError,
    'Invalid email format'
  );
});

// ─────────────────────────────────────────────────────────────
// Phone Validation Tests
// ─────────────────────────────────────────────────────────────

Deno.test('validatePhone() accepts empty string (optional)', () => {
  // Should not throw - phone is optional
  validatePhone('');
});

Deno.test('validatePhone() accepts 10-digit phone', () => {
  validatePhone('5551234567');
});

Deno.test('validatePhone() accepts phone with parentheses', () => {
  validatePhone('(555)123-4567');
});

Deno.test('validatePhone() accepts phone with dashes', () => {
  validatePhone('555-123-4567');
});

Deno.test('validatePhone() accepts phone with dots', () => {
  validatePhone('555.123.4567');
});

Deno.test('validatePhone() accepts phone with spaces', () => {
  validatePhone('555 123 4567');
});

Deno.test('validatePhone() rejects too few digits', () => {
  assertThrows(
    () => validatePhone('555123'),
    ValidationError,
    'Invalid phone format'
  );
});

Deno.test('validatePhone() rejects too many digits', () => {
  assertThrows(
    () => validatePhone('555123456789'),
    ValidationError,
    'Invalid phone format'
  );
});

Deno.test('validatePhone() rejects letters', () => {
  assertThrows(
    () => validatePhone('555-ABC-4567'),
    ValidationError,
    'Invalid phone format'
  );
});

// ─────────────────────────────────────────────────────────────
// E.164 Phone Validation Tests
// ─────────────────────────────────────────────────────────────

Deno.test('validatePhoneE164() accepts valid US E.164 format', () => {
  validatePhoneE164('+15551234567');
});

Deno.test('validatePhoneE164() accepts valid international E.164 format', () => {
  validatePhoneE164('+442071234567'); // UK
  validatePhoneE164('+61412345678'); // Australia
});

Deno.test('validatePhoneE164() rejects missing plus sign', () => {
  assertThrows(
    () => validatePhoneE164('15551234567'),
    ValidationError,
    'must be in E.164 format'
  );
});

Deno.test('validatePhoneE164() rejects too short', () => {
  assertThrows(
    () => validatePhoneE164('+1555'),
    ValidationError,
    'must be in E.164 format'
  );
});

Deno.test('validatePhoneE164() rejects too long', () => {
  assertThrows(
    () => validatePhoneE164('+1555123456789012345'),
    ValidationError,
    'must be in E.164 format'
  );
});

Deno.test('validatePhoneE164() rejects leading zero after plus', () => {
  assertThrows(
    () => validatePhoneE164('+0123456789'),
    ValidationError,
    'must be in E.164 format'
  );
});

Deno.test('validatePhoneE164() uses custom field name in error', () => {
  assertThrows(
    () => validatePhoneE164('invalid', 'mobile_number'),
    ValidationError,
    'mobile_number must be in E.164 format'
  );
});

// ─────────────────────────────────────────────────────────────
// Required Field Validation Tests
// ─────────────────────────────────────────────────────────────

Deno.test('validateRequired() passes with valid string', () => {
  validateRequired('hello', 'name');
});

Deno.test('validateRequired() passes with number', () => {
  validateRequired(42, 'age');
});

Deno.test('validateRequired() passes with zero', () => {
  validateRequired(0, 'count');
});

Deno.test('validateRequired() passes with false', () => {
  validateRequired(false, 'isActive');
});

Deno.test('validateRequired() passes with object', () => {
  validateRequired({ key: 'value' }, 'data');
});

Deno.test('validateRequired() passes with array', () => {
  validateRequired([1, 2, 3], 'items');
});

Deno.test('validateRequired() throws on undefined', () => {
  assertThrows(
    () => validateRequired(undefined, 'field'),
    ValidationError,
    'field is required'
  );
});

Deno.test('validateRequired() throws on null', () => {
  assertThrows(
    () => validateRequired(null, 'field'),
    ValidationError,
    'field is required'
  );
});

Deno.test('validateRequired() throws on empty string', () => {
  assertThrows(
    () => validateRequired('', 'field'),
    ValidationError,
    'field is required'
  );
});

// ─────────────────────────────────────────────────────────────
// Required Fields (Multiple) Validation Tests
// ─────────────────────────────────────────────────────────────

Deno.test('validateRequiredFields() passes with all fields present', () => {
  const payload = { email: 'test@example.com', password: 'secret' };
  validateRequiredFields(payload, ['email', 'password']);
});

Deno.test('validateRequiredFields() passes with extra fields', () => {
  const payload = { email: 'test@example.com', password: 'secret', name: 'Test' };
  validateRequiredFields(payload, ['email', 'password']);
});

Deno.test('validateRequiredFields() throws on missing field', () => {
  const payload = { email: 'test@example.com' };
  assertThrows(
    () => validateRequiredFields(payload, ['email', 'password']),
    ValidationError,
    'Missing required field: password'
  );
});

Deno.test('validateRequiredFields() throws on null field', () => {
  const payload = { email: 'test@example.com', password: null };
  assertThrows(
    () => validateRequiredFields(payload, ['email', 'password']),
    ValidationError,
    'Missing required field: password'
  );
});

Deno.test('validateRequiredFields() throws on undefined field', () => {
  const payload = { email: 'test@example.com', password: undefined };
  assertThrows(
    () => validateRequiredFields(payload, ['email', 'password']),
    ValidationError,
    'Missing required field: password'
  );
});

Deno.test('validateRequiredFields() throws on empty string field', () => {
  const payload = { email: 'test@example.com', password: '' };
  assertThrows(
    () => validateRequiredFields(payload, ['email', 'password']),
    ValidationError,
    'Missing required field: password'
  );
});

Deno.test('validateRequiredFields() throws on first missing field', () => {
  const payload = { email: 'test@example.com' };
  assertThrows(
    () => validateRequiredFields(payload, ['password', 'name', 'age']),
    ValidationError,
    'Missing required field: password'
  );
});

Deno.test('validateRequiredFields() passes with empty required fields array', () => {
  const payload = { email: 'test@example.com' };
  validateRequiredFields(payload, []);
});

// ─────────────────────────────────────────────────────────────
// Action Validation Tests
// ─────────────────────────────────────────────────────────────

Deno.test('validateAction() passes for allowed action', () => {
  validateAction('login', ['login', 'signup', 'logout']);
});

Deno.test('validateAction() passes for any allowed action', () => {
  const allowed = ['create', 'update', 'delete', 'get'];
  validateAction('create', allowed);
  validateAction('update', allowed);
  validateAction('delete', allowed);
  validateAction('get', allowed);
});

Deno.test('validateAction() throws for unknown action', () => {
  assertThrows(
    () => validateAction('hack', ['login', 'signup', 'logout']),
    ValidationError,
    'Unknown action: hack'
  );
});

Deno.test('validateAction() includes allowed actions in error message', () => {
  assertThrows(
    () => validateAction('invalid', ['create', 'read']),
    ValidationError,
    'Allowed actions: create, read'
  );
});

Deno.test('validateAction() is case sensitive', () => {
  assertThrows(
    () => validateAction('LOGIN', ['login', 'signup']),
    ValidationError,
    'Unknown action: LOGIN'
  );
});

Deno.test('validateAction() throws for empty action', () => {
  assertThrows(
    () => validateAction('', ['login', 'signup']),
    ValidationError,
    'Unknown action:'
  );
});
