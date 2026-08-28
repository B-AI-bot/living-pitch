const CAL_ORIGIN = "https://cal.welcometotheaijungle.com";
const PRIMARY_SLOTS_PATH = "/api/trpc/public/slots.getSchedule";
// Cal.com's current booking frontend routes this public query through the
// endpoint router. Use it only when the specified legacy target returns 404.
const FALLBACK_SLOTS_PATH = "/api/trpc/slots/getSchedule";
const BOOK_PATH = "/api/book/event";
const HOUR_MS = 60 * 60 * 1000;
const NONCE_TTL_MS = 10 * 60 * 1000;
const bookingAttempts = new Map();
const consumedBookingNonces = new Map();

class BoundaryError extends Error {}
class UpstreamError extends Error {}
class RateLimitError extends Error {}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function jsonResponse(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(secret) {
  if (typeof secret !== "string" || secret.length < 16) throw new BoundaryError("BOOKING_NONCE_SECRET is not configured.");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signNonce(payload, secret) {
  const encodedPayload = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(encodedPayload));
  return `${encodedPayload}.${base64Url(new Uint8Array(signature))}`;
}

async function issueBookingNonce(start, secret, now) {
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  return signNonce({ start, expiresAt: now.getTime() + NONCE_TTL_MS, id: base64Url(random) }, secret);
}

function cleanupConsumedNonces(now) {
  for (const [nonce, expiresAt] of consumedBookingNonces) {
    if (expiresAt <= now.getTime()) consumedBookingNonces.delete(nonce);
  }
}

async function consumeBookingNonce(nonce, start, secret, now) {
  cleanupConsumedNonces(now);
  if (consumedBookingNonces.has(nonce)) throw new BoundaryError("This booking nonce has already been used.");
  const parts = typeof nonce === "string" ? nonce.split(".") : [];
  if (parts.length !== 2) throw new BoundaryError("A valid booking nonce from /slots is required.");
  let payload;
  let signature;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlBytes(parts[0])));
    signature = base64UrlBytes(parts[1]);
  } catch {
    throw new BoundaryError("A valid booking nonce from /slots is required.");
  }
  const validSignature = await crypto.subtle.verify("HMAC", await hmacKey(secret), signature, new TextEncoder().encode(parts[0]));
  if (!validSignature || !isRecord(payload) || payload.start !== start || typeof payload.expiresAt !== "number" || payload.expiresAt <= now.getTime() || typeof payload.id !== "string") {
    throw new BoundaryError("This booking nonce is invalid or expired.");
  }
  consumedBookingNonces.set(nonce, payload.expiresAt);
}

function slotsInput(now, days) {
  return {
    json: {
      isTeamEvent: false,
      usernameList: ["loic"],
      eventTypeSlug: "assessment",
      startTime: now.toISOString(),
      endTime: new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
      timeZone: "UTC",
    },
  };
}

export function buildSlotsRequestUrls(now, days) {
  const input = encodeURIComponent(JSON.stringify(slotsInput(now, days)));
  return {
    primary: `${CAL_ORIGIN}${PRIMARY_SLOTS_PATH}?input=${input}`,
    fallback: `${CAL_ORIGIN}${FALLBACK_SLOTS_PATH}?input=${input}`,
  };
}

function slotContainer(payload) {
  if (!isRecord(payload)) throw new BoundaryError("Cal.com returned an invalid availability response.");
  const result = payload.result;
  if (!isRecord(result)) throw new BoundaryError("Cal.com returned an invalid availability response.");
  const data = result.data;
  if (!isRecord(data)) throw new BoundaryError("Cal.com returned an invalid availability response.");
  const json = data.json;
  if (!isRecord(json) || !isRecord(json.slots)) {
    throw new BoundaryError("Cal.com returned an invalid availability response.");
  }
  return json.slots;
}

export function parseCalSlots(payload) {
  const starts = [];
  for (const entries of Object.values(slotContainer(payload))) {
    if (!Array.isArray(entries)) throw new BoundaryError("Cal.com returned an invalid availability response.");
    for (const entry of entries) {
      if (!isRecord(entry)) throw new BoundaryError("Cal.com returned an invalid availability response.");
      const start = typeof entry.time === "string" ? entry.time : entry.start;
      if (!isIsoDate(start)) throw new BoundaryError("Cal.com returned an invalid availability response.");
      starts.push(start);
    }
  }
  return {
    slots: [...new Set(starts)].sort().map((start) => ({ start })),
  };
}

function parseDays(url) {
  const raw = url.searchParams.get("days") ?? "7";
  const days = Number(raw);
  if (!Number.isInteger(days) || days < 1 || days > 14) {
    throw new BoundaryError("days must be a whole number from 1 to 14.");
  }
  return days;
}

async function readExternalJson(response, label) {
  try {
    return await response.json();
  } catch {
    throw new UpstreamError(`${label} returned a non-JSON response.`);
  }
}

async function availableSlots(runtime, now, days) {
  const urls = buildSlotsRequestUrls(now, days);
  const primary = await runtime.fetch(urls.primary, { headers: { Accept: "application/json" } });
  if (primary.ok) return parseCalSlots(await readExternalJson(primary, "Cal.com availability"));
  if (primary.status !== 404) {
    throw new UpstreamError(`Cal.com availability failed with status ${primary.status}.`);
  }

  const fallback = await runtime.fetch(urls.fallback, { headers: { Accept: "application/json" } });
  if (!fallback.ok) {
    throw new UpstreamError(`Cal.com availability fallback failed with status ${fallback.status}.`);
  }
  return parseCalSlots(await readExternalJson(fallback, "Cal.com availability fallback"));
}

function parseBookingInput(value) {
  if (!isRecord(value)) throw new BoundaryError("Booking details must be a JSON object.");
  const { start, nonce, name, email, notes } = value;
  if (!isIsoDate(start)) throw new BoundaryError("start must be an ISO timestamp.");
  if (typeof nonce !== "string" || nonce.length === 0) throw new BoundaryError("nonce is required. Use one returned by /api/cal/slots.");
  if (typeof name !== "string" || name.trim().length === 0 || name.length > 160) {
    throw new BoundaryError("name is required and must be 160 characters or fewer.");
  }
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new BoundaryError("email must be a valid email address.");
  }
  if (typeof notes !== "string" || notes.length > 2000) {
    throw new BoundaryError("notes must be a string of 2000 characters or fewer.");
  }
  return { start, nonce, name: name.trim(), email: email.trim(), notes: notes.trim() };
}

export function buildBookingPayload(input) {
  return {
    start: input.start,
    eventTypeId: 7,
    eventTypeSlug: "assessment",
    timeZone: "UTC",
    language: "en",
    user: "loic",
    metadata: { source: "living-pitch" },
    responses: {
      name: input.name,
      email: input.email,
      notes: input.notes,
      topic: "Leverage Assessment",
      location: { value: "integrations:google:meet", optionValue: "" },
    },
  };
}

function hasBookingIdentifier(value) {
  for (const key of ["uid", "bookingUid", "id", "bookingId"]) {
    const identifier = value[key];
    if (typeof identifier === "string" && identifier.trim().length > 0) return true;
    if (typeof identifier === "number" && Number.isInteger(identifier) && identifier > 0) return true;
  }
  return false;
}

function isExplicitBookingFailure(value) {
  if ("error" in value || value.success === false) return true;
  return typeof value.status === "string" && ["error", "failed", "failure"].includes(value.status.toLowerCase());
}

export function parseCalBooking(payload) {
  if (!isRecord(payload) || isExplicitBookingFailure(payload)) {
    throw new UpstreamError("Cal.com returned an invalid booking response.");
  }
  const candidates = [payload, payload.booking, payload.data, payload.result].filter(isRecord);
  if (candidates.some(isExplicitBookingFailure) || !candidates.some(hasBookingIdentifier)) {
    throw new UpstreamError("Cal.com returned an invalid booking response.");
  }
}

function enforceBookingRateLimit(request, now) {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const cutoff = now.getTime() - HOUR_MS;
  for (const [key, timestamps] of bookingAttempts) {
    const active = timestamps.filter((timestamp) => timestamp > cutoff);
    if (active.length === 0) bookingAttempts.delete(key);
    else bookingAttempts.set(key, active);
  }
  const recent = (bookingAttempts.get(ip) ?? []).filter((timestamp) => timestamp > cutoff);
  if (recent.length === 0) bookingAttempts.delete(ip);
  if (recent.length >= 3) throw new RateLimitError("Booking limit reached. Try again in one hour.");
  recent.push(now.getTime());
  bookingAttempts.set(ip, recent);
}

async function parseRequestJson(request) {
  try {
    return await request.json();
  } catch {
    throw new BoundaryError("Request body must be valid JSON.");
  }
}

async function bookAssessment(request, runtime, now) {
  const input = parseBookingInput(await parseRequestJson(request));
  enforceBookingRateLimit(request, now);
  const currentSlots = await availableSlots(runtime, now, 7);
  if (!currentSlots.slots.some((slot) => slot.start === input.start)) {
    throw new BoundaryError("That slot is no longer available. Choose a fresh slot from /api/cal/slots.");
  }
  await consumeBookingNonce(input.nonce, input.start, runtime.bookingNonceSecret, now);
  const upstream = await runtime.fetch(`${CAL_ORIGIN}${BOOK_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(buildBookingPayload(input)),
  });
  if (!upstream.ok) throw new UpstreamError(`Cal.com booking failed with status ${upstream.status}.`);
  const response = await readExternalJson(upstream, "Cal.com booking");
  parseCalBooking(response);
  return { status: "booked", start: input.start };
}

export async function handleCalRequest(request, runtime = {
  fetch: (input, init) => fetch(input, init),
  now: () => new Date(),
}) {
  const url = new URL(request.url);
  try {
    if (url.pathname === "/api/cal/slots" && request.method === "GET") {
      const now = runtime.now();
      const result = await availableSlots(runtime, now, parseDays(url));
      const slots = await Promise.all(result.slots.map(async (slot) => ({
        start: slot.start,
        nonce: await issueBookingNonce(slot.start, runtime.bookingNonceSecret, now),
      })));
      return jsonResponse({ slots });
    }
    if (url.pathname === "/api/cal/book" && request.method === "POST") {
      return jsonResponse(await bookAssessment(request, runtime, runtime.now()));
    }
    return jsonResponse({ error: "Not found." }, 404);
  } catch (error) {
    if (error instanceof BoundaryError) return jsonResponse({ error: error.message }, 400);
    if (error instanceof RateLimitError) return jsonResponse({ error: error.message }, 429);
    if (error instanceof UpstreamError) return jsonResponse({ error: error.message }, 502);
    return jsonResponse({ error: "Unexpected booking service error." }, 500);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/cal/")) return handleCalRequest(request, {
      fetch: (input, init) => fetch(input, init),
      now: () => new Date(),
      bookingNonceSecret: env.BOOKING_NONCE_SECRET,
    });

    // The ledger changes with every mutation. Routing through the worker avoids
    // Cloudflare serving an old static response from cache.
    if (url.pathname === "/mutations.json") {
      const asset = await env.ASSETS.fetch(new Request(new URL("/mutations.json", url.origin)));
      const headers = new Headers(asset.headers);
      headers.set("Cache-Control", "no-store");
      headers.delete("ETag");
      return new Response(asset.body, { status: asset.status, headers });
    }
    return env.ASSETS.fetch(request);
  },
};
