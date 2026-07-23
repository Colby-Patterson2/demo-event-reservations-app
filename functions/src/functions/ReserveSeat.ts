import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { getReservationsContainer } from "../services/cosmosClient";
import {
  EventInventory,
  ReservationRecord,
  ReserveSeatRequest,
} from "../models/reservation";

function json(status: number, body: unknown): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: {
      "Content-Type": "application/json",
    },
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function inventoryDocId(eventId: string): string {
  return "event-" + eventId;
}

export async function reserveSeat(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const payload = (await request.json()) as Partial<ReserveSeatRequest>;

    if (!isNonEmptyString(payload.eventId)) {
      return json(400, { error: "eventId is required." });
    }
    if (!isNonEmptyString(payload.fullName)) {
      return json(400, { error: "fullName is required." });
    }
    if (!isNonEmptyString(payload.email)) {
      return json(400, { error: "email is required." });
    }
    if (!isPositiveInt(payload.seats)) {
      return json(400, { error: "seats must be a positive integer." });
    }

    const eventId = payload.eventId.trim();
    const seats = payload.seats;
    const container = getReservationsContainer();
    const inventoryId = inventoryDocId(eventId);

    const inventoryRead = await container
      .item(inventoryId, eventId)
      .read<EventInventory>();

    if (!inventoryRead.resource) {
      return json(404, { error: "Event inventory not found for eventId." });
    }

    const inventory = inventoryRead.resource;

    if (inventory.availableSeats < seats) {
      return json(409, {
        error: "Not enough seats available.",
        availableSeats: inventory.availableSeats,
      });
    }

    const now = new Date().toISOString();

    try {
      await container.item(inventoryId, eventId).patch(
        [
          { op: "incr", path: "/availableSeats", value: -seats },
          { op: "set", path: "/updatedAt", value: now },
        ],
        ({
          filterPredicate: "FROM c WHERE c.availableSeats >= " + seats,
        } as any)
      );
    } catch {
      return json(409, {
        error: "Seats were taken by another request. Please retry.",
      });
    }

    const reservationId = crypto.randomUUID();
    const reservation: ReservationRecord = {
      id: reservationId,
      type: "reservation",
      eventId,
      fullName: payload.fullName.trim(),
      email: payload.email.trim().toLowerCase(),
      seats,
      notes:
        typeof payload.notes === "string" && payload.notes.trim()
          ? payload.notes.trim()
          : undefined,
      createdAt: now,
    };

    try {
      await container.items.create(reservation);
    } catch (createErr) {
      context.error("Reservation insert failed. Compensating seat rollback.", createErr);

      await container.item(inventoryId, eventId).patch([
        { op: "incr", path: "/availableSeats", value: seats },
        { op: "set", path: "/updatedAt", value: new Date().toISOString() },
      ]);

      return json(500, {
        error: "Reservation could not be completed. Please try again.",
      });
    }

    return json(201, {
      message: "Reservation created.",
      reservationId,
      eventId,
      seatsReserved: seats,
      remainingSeats: inventory.availableSeats - seats,
    });
  } catch (err) {
    context.error("Unhandled ReserveSeat error", err);
    return json(500, { error: "Internal server error." });
  }
}

app.http("ReserveSeat", {
  methods: ["POST"],
  authLevel: "function",
  route: "reserve-seat",
  handler: reserveSeat,
});
