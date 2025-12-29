import { ObjectId } from 'mongodb';
import { ApiError } from '@/shared/middleware/index.js';
import { ErrorCodes } from '@/shared/types/index.js';

/**
 * Validate and require a string parameter
 * Throws ApiError if the value is undefined or empty
 */
export function requireParam(value: string | undefined, name: string): string {
  if (!value) {
    throw new ApiError(ErrorCodes.VALIDATION_ERROR, `${name} is required`, 400);
  }
  return value;
}

/**
 * Convert a string to ObjectId with validation
 * Throws ApiError if the ID format is invalid
 */
export function toObjectId(id: string, fieldName = 'id'): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(ErrorCodes.VALIDATION_ERROR, `Invalid ${fieldName} format`, 400);
  }
  return new ObjectId(id);
}
