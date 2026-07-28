"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNonEmptyString = isNonEmptyString;
exports.isPositiveInt = isPositiveInt;
exports.validateReserveSeatPayload = validateReserveSeatPayload;
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
function isPositiveInt(value) {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
}
function validateReserveSeatPayload(payload) {
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
