"use server";

import { revalidatePath } from "next/cache";

export type ReservationActionState = {
  ok: boolean;
  message: string;
  reservationId?: string;
};

type ReserveSeatPayload = {
  eventId: string;
  fullName: string;
  email: string;
  seats: number;
  notes?: string;
};

type JsonResponseBody = {
  error?: string;
  message?: string;
  reservationId?: string;
};

function asString(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

async function readJsonSafe(response: Response): Promise<JsonResponseBody | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function reserveSeatAction(
  eventId: string,
  _prevState: ReservationActionState,
  formData: FormData
): Promise<ReservationActionState> {
  const functionUrl = process.env.AZURE_FUNCTION_RESERVE_URL;
  const functionKey = process.env.AZURE_FUNCTION_KEY;

  if (!functionUrl) {
    return {
      ok: false,
      message: "Server configuration missing: AZURE_FUNCTION_RESERVE_URL",
    };
  }

  const fullName = asString(formData.get("fullName"));
  const email = asString(formData.get("email"));
  const notes = asString(formData.get("notes"));
  const seatsRaw = asString(formData.get("seats"));
  const seats = Number.parseInt(seatsRaw || "1", 10);

  if (!eventId) return { ok: false, message: "Event ID is required." };
  if (!fullName) return { ok: false, message: "Full name is required." };
  if (!email) return { ok: false, message: "Email is required." };
  if (!Number.isFinite(seats) || seats < 1) {
    return { ok: false, message: "Seats must be a number greater than 0." };
  }

  const payload: ReserveSeatPayload = {
    eventId,
    fullName,
    email,
    seats,
    notes: notes || undefined,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (functionKey) {
    headers["x-functions-key"] = functionKey;
  }

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const body = await readJsonSafe(response);

    if (!response.ok) {
      if (body?.error || body?.message) {
        return {
          ok: false,
          message: body.error || body.message || "Unknown error",
        };
      }

      console.error(
        "[reserveSeatAction] Upstream function returned non-JSON error.",
        { status: response.status, statusText: response.statusText }
      );

      if (response.status === 401) {
        return {
          ok: false,
          message:
            "Authentication failed when contacting the reservation service. Check that the function key secret has been deployed.",
        };
      }
      if (response.status === 404) {
        return {
          ok: false,
          message:
            "Reservation service endpoint not found. Verify that the function has been deployed.",
        };
      }

      return {
        ok: false,
        message: `Reservation service returned HTTP ${response.status}.`,
      };
    }

    revalidatePath("/events");
    revalidatePath("/events/" + eventId);

    return {
      ok: true,
      message: body?.message || "Reservation confirmed.",
      reservationId: body?.reservationId,
    };
  } catch {
    return {
      ok: false,
      message: "Network error while calling reservation service.",
    };
  }
}