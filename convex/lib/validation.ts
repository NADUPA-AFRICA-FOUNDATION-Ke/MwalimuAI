import { ConvexError } from "convex/values";

export function requireNonEmpty(value: string, field: string, maxLength: number) {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new ConvexError({
      code: "INVALID_ARGUMENT",
      message: `${field} must be between 1 and ${maxLength} characters`,
    });
  }
  return normalized;
}

export function requireArrayLimit<T>(values: T[], field: string, maxLength: number) {
  if (values.length > maxLength) {
    throw new ConvexError({
      code: "INVALID_ARGUMENT",
      message: `${field} cannot contain more than ${maxLength} items`,
    });
  }
}

export function requireIntegerRange(value: number, field: string, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ConvexError({
      code: "INVALID_ARGUMENT",
      message: `${field} must be an integer between ${min} and ${max}`,
    });
  }
}

export function requireDateKey(value: string, field = "date") {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(`${normalized}T00:00:00Z`))) {
    throw new ConvexError({
      code: "INVALID_ARGUMENT",
      message: `${field} must use YYYY-MM-DD format`,
    });
  }
  return normalized;
}

export function boundedLimit(value: number | undefined, fallback: number, maximum: number) {
  const limit = value ?? fallback;
  requireIntegerRange(limit, "limit", 1, maximum);
  return limit;
}
