import type { HttpResponseInit } from "@azure/functions";

function json(
  status: number,
  body: unknown,
  extra?: Record<string, unknown>,
): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: { "Content-Type": "application/json" },
    ...extra,
  };
}

export function ok(status: number, body: unknown): HttpResponseInit {
  return json(status, body);
}

export function badRequest(message: string): HttpResponseInit {
  return json(400, { error: message });
}

export function notFound(message: string): HttpResponseInit {
  return json(404, { error: message });
}

export function conflict(
  message: string,
  detail?: Record<string, unknown>,
): HttpResponseInit {
  return json(409, { error: message, ...detail });
}

export function serverError(message: string): HttpResponseInit {
  return json(500, { error: message });
}
