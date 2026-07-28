"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.badRequest = badRequest;
exports.notFound = notFound;
exports.conflict = conflict;
exports.serverError = serverError;
function json(status, body, extra) {
    return {
        status,
        jsonBody: body,
        headers: { "Content-Type": "application/json" },
        ...extra,
    };
}
function ok(status, body) {
    return json(status, body);
}
function badRequest(message) {
    return json(400, { error: message });
}
function notFound(message) {
    return json(404, { error: message });
}
function conflict(message, detail) {
    return json(409, { error: message, ...detail });
}
function serverError(message) {
    return json(500, { error: message });
}
