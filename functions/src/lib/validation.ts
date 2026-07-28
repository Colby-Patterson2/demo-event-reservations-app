import type { ReserveSeatRequest } from "../models/reservation";

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function validateReserveSeatPayload(
  payload: Partial<ReserveSeatRequest>,
): string | null {
  if (!isNonEmptyString(payload.eventId)) {
    return "eventId is required.";
  }
  if (!isNonEmptyString(payload.fullName)) {
    return "fullName is required.";
  }
  if (!isNonEmptyString(payload.email)) {
    return "email is required.";
  }
  if (!isPositiveInt(payload.seats)) {
    return "seats must be a positive integer.";
  }
  return null;
}
