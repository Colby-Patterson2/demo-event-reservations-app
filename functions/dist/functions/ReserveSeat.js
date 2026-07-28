"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const cosmosClient_1 = require("../services/cosmosClient");
const validation_1 = require("../lib/validation");
const http_1 = require("../lib/http");
async function reserveSeatHandler(request, context) {
    const correlationId = context.invocationId;
    let payload;
    try {
        payload = (await request.json());
    }
    catch {
        context.warn(`[${correlationId}] Invalid JSON body`);
        return (0, http_1.badRequest)("Request body must be valid JSON.");
    }
    const validationError = (0, validation_1.validateReserveSeatPayload)(payload);
    if (validationError) {
        return (0, http_1.badRequest)(validationError);
    }
    const eventId = payload.eventId.trim();
    const seats = payload.seats;
    const container = (0, cosmosClient_1.getReservationsContainer)();
    const inventoryId = `event-${eventId}`;
    const inventoryRead = await container
        .item(inventoryId, eventId)
        .read();
    if (!inventoryRead.resource) {
        return (0, http_1.notFound)("Event inventory not found.");
    }
    const inventory = inventoryRead.resource;
    context.trace(`[${correlationId}] Event ${eventId}: available=${inventory.availableSeats}/${inventory.totalSeats}, requested=${seats}`);
    if (inventory.availableSeats < seats) {
        return (0, http_1.conflict)(`Only ${inventory.availableSeats} seat(s) remaining.`, { availableSeats: inventory.availableSeats });
    }
    const now = new Date().toISOString();
    try {
        await container.item(inventoryId, eventId).patch([
            { op: "incr", path: "/availableSeats", value: -seats },
            { op: "set", path: "/updatedAt", value: now },
        ], {
            accessCondition: {
                type: "IfMatch",
                condition: inventoryRead.etag,
            },
        });
    }
    catch (patchErr) {
        if (patchErr &&
            typeof patchErr === "object" &&
            "code" in patchErr &&
            patchErr.code === 412) {
            context.warn(`[${correlationId}] Optimistic concurrency conflict for event ${eventId}`);
            return (0, http_1.conflict)("Seats were taken by another request. Please retry.");
        }
        throw patchErr;
    }
    const reservationId = crypto.randomUUID();
    const reservation = {
        id: reservationId,
        type: "reservation",
        eventId,
        fullName: payload.fullName.trim(),
        email: payload.email.trim().toLowerCase(),
        seats,
        notes: payload.notes?.trim() || undefined,
        createdAt: now,
    };
    try {
        await container.items.create(reservation);
    }
    catch (createErr) {
        context.error(`[${correlationId}] Reservation insert failed, rolling back seat count`, createErr);
        await container.item(inventoryId, eventId).patch([
            { op: "incr", path: "/availableSeats", value: seats },
            { op: "set", path: "/updatedAt", value: new Date().toISOString() },
        ]);
        return (0, http_1.serverError)("Reservation could not be completed. Please try again.");
    }
    context.trace(`[${correlationId}] Reservation ${reservationId} created: ${seats} seat(s) for event ${eventId}`);
    return (0, http_1.ok)(201, {
        message: "Reservation created.",
        reservationId,
        eventId,
        seatsReserved: seats,
        remainingSeats: inventory.availableSeats - seats,
    });
}
functions_1.app.http("ReserveSeat", {
    methods: ["POST"],
    authLevel: "function",
    route: "reserve-seat",
    handler: reserveSeatHandler,
});
