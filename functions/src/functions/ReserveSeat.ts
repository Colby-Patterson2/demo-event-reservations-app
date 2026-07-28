import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";
import { getReservationsContainer } from "../services/cosmosClient";
import type {
  EventInventory,
  ReservationRecord,
  ReserveSeatRequest,
} from "../models/reservation";
import { validateReserveSeatPayload } from "../lib/validation";
import { badRequest, conflict, notFound, ok, serverError } from "../lib/http";

async function reserveSeatHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const correlationId = context.invocationId;

  let payload: Partial<ReserveSeatRequest>;
  try {
    payload = (await request.json()) as Partial<ReserveSeatRequest>;
  } catch {
    context.warn(`[${correlationId}] Invalid JSON body`);
    return badRequest("Request body must be valid JSON.");
  }

  const validationError = validateReserveSeatPayload(payload);
  if (validationError) {
    return badRequest(validationError);
  }

  const eventId = payload.eventId!.trim();
  const seats = payload.seats!;
  const container = getReservationsContainer();
  const inventoryId = `event-${eventId}`;

  const inventoryRead = await container
    .item(inventoryId, eventId)
    .read<EventInventory>();

  if (!inventoryRead.resource) {
    return notFound("Event inventory not found.");
  }

  const inventory = inventoryRead.resource;
  context.trace(
    `[${correlationId}] Event ${eventId}: available=${inventory.availableSeats}/${inventory.totalSeats}, requested=${seats}`,
  );

  if (inventory.availableSeats < seats) {
    return conflict(
      `Only ${inventory.availableSeats} seat(s) remaining.`,
      { availableSeats: inventory.availableSeats },
    );
  }

  const now = new Date().toISOString();

  try {
    await container.item(inventoryId, eventId).patch(
      [
        { op: "incr", path: "/availableSeats", value: -seats } as const,
        { op: "set", path: "/updatedAt", value: now } as const,
      ],
      {
        accessCondition: {
          type: "IfMatch",
          condition: inventoryRead.etag,
        },
      },
    );
  } catch (patchErr: unknown) {
    if (
      patchErr &&
      typeof patchErr === "object" &&
      "code" in patchErr &&
      (patchErr as Record<string, unknown>).code === 412
    ) {
      context.warn(
        `[${correlationId}] Optimistic concurrency conflict for event ${eventId}`,
      );
      return conflict("Seats were taken by another request. Please retry.");
    }
    throw patchErr;
  }

  const reservationId = crypto.randomUUID();
  const reservation: ReservationRecord = {
    id: reservationId,
    type: "reservation",
    eventId,
    fullName: payload.fullName!.trim(),
    email: payload.email!.trim().toLowerCase(),
    seats,
    notes: payload.notes?.trim() || undefined,
    createdAt: now,
  };

  try {
    await container.items.create(reservation);
  } catch (createErr) {
    context.error(
      `[${correlationId}] Reservation insert failed, rolling back seat count`,
      createErr,
    );

    await container.item(inventoryId, eventId).patch([
      { op: "incr", path: "/availableSeats", value: seats } as const,
      { op: "set", path: "/updatedAt", value: new Date().toISOString() } as const,
    ]);

    return serverError("Reservation could not be completed. Please try again.");
  }

  context.trace(
    `[${correlationId}] Reservation ${reservationId} created: ${seats} seat(s) for event ${eventId}`,
  );

  return ok(201, {
    message: "Reservation created.",
    reservationId,
    eventId,
    seatsReserved: seats,
    remainingSeats: inventory.availableSeats - seats,
  });
}

app.http("ReserveSeat", {
  methods: ["POST"],
  authLevel: "function",
  route: "reserve-seat",
  handler: reserveSeatHandler,
});
