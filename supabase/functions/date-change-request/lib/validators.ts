/**
 * Date Change Request Validators
 * Split Lease - Supabase Edge Functions
 */

import { ValidationError } from "../../_shared/errors.ts";
import {
  CreateDateChangeRequestInput,
  GetDateChangeRequestsInput,
  AcceptRequestInput,
  DeclineRequestInput,
  CancelRequestInput,
  GetThrottleStatusInput,
  RequestType,
} from "./types.ts";

const VALID_REQUEST_TYPES: ReadonlySet<RequestType> = new Set(['adding', 'removing', 'swapping']);

/**
 * Validate create date change request input
 */
export function validateCreateInput(input: CreateDateChangeRequestInput): void {
  if (!input.leaseId || typeof input.leaseId !== 'string') {
    throw new ValidationError('leaseId is required and must be a string');
  }

  if (!input.typeOfRequest || !VALID_REQUEST_TYPES.has(input.typeOfRequest)) {
    throw new ValidationError(`typeOfRequest must be one of: ${[...VALID_REQUEST_TYPES].join(', ')}`);
  }

  // Validate dates based on request type
  if (input.typeOfRequest === 'adding' && !input.dateAdded) {
    throw new ValidationError('dateAdded is required for adding requests');
  }

  if (input.typeOfRequest === 'removing' && !input.dateRemoved) {
    throw new ValidationError('dateRemoved is required for removing requests');
  }

  if (input.typeOfRequest === 'swapping' && (!input.dateAdded || !input.dateRemoved)) {
    throw new ValidationError('Both dateAdded and dateRemoved are required for swapping requests');
  }

  if (!input.requestedById || typeof input.requestedById !== 'string') {
    throw new ValidationError('requestedById is required and must be a string');
  }

  if (!input.receiverId || typeof input.receiverId !== 'string') {
    throw new ValidationError('receiverId is required and must be a string');
  }

  // Validate price if provided
  if (input.priceRate !== undefined && (typeof input.priceRate !== 'number' || input.priceRate < 0)) {
    throw new ValidationError('priceRate must be a non-negative number');
  }

  if (input.percentageOfRegular !== undefined && (typeof input.percentageOfRegular !== 'number' || input.percentageOfRegular < 0 || input.percentageOfRegular > 200)) {
    throw new ValidationError('percentageOfRegular must be a number between 0 and 200');
  }
}

/**
 * Validate get date change requests input
 */
export function validateGetInput(input: GetDateChangeRequestsInput): void {
  if (!input.leaseId || typeof input.leaseId !== 'string') {
    throw new ValidationError('leaseId is required and must be a string');
  }
}

/**
 * Validate accept request input
 */
export function validateAcceptInput(input: AcceptRequestInput): void {
  if (!input.requestId || typeof input.requestId !== 'string') {
    throw new ValidationError('requestId is required and must be a string');
  }

  if (input.message !== undefined && typeof input.message !== 'string') {
    throw new ValidationError('message must be a string');
  }
}

/**
 * Validate decline request input
 */
export function validateDeclineInput(input: DeclineRequestInput): void {
  if (!input.requestId || typeof input.requestId !== 'string') {
    throw new ValidationError('requestId is required and must be a string');
  }

  if (input.reason !== undefined && typeof input.reason !== 'string') {
    throw new ValidationError('reason must be a string');
  }
}

/**
 * Validate cancel request input
 */
export function validateCancelInput(input: CancelRequestInput): void {
  if (!input.requestId || typeof input.requestId !== 'string') {
    throw new ValidationError('requestId is required and must be a string');
  }
}

/**
 * Validate get throttle status input
 */
export function validateThrottleStatusInput(input: GetThrottleStatusInput): void {
  if (!input.userId || typeof input.userId !== 'string') {
    throw new ValidationError('userId is required and must be a string');
  }
}
