const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
}

function constantTimeEqual(left, right) {
  if (!(left instanceof Uint8Array) || !(right instanceof Uint8Array)) return false;
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export function readCookie(cookieHeader, name) {
  const prefix = `${name}=`;
  for (const part of String(cookieHeader || "").split(";")) {
    const value = part.trim();
    if (value.startsWith(prefix)) return value.slice(prefix.length);
  }
  return "";
}

export async function signToken(payload, secret) {
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(encodedPayload, secret));
  return `${encodedPayload}.${signature}`;
}

export async function verifyToken(token, secret, now = Date.now()) {
  if (!token || !secret) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  let suppliedSignature;
  try {
    suppliedSignature = base64UrlToBytes(parts[1]);
  } catch {
    return null;
  }

  const expectedSignature = await hmac(parts[0], secret);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(decoder.decode(base64UrlToBytes(parts[0])));
    if (payload?.v !== 1) return null;
    if (!Number.isFinite(payload?.exp) || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function purchaseIsEligible(purchase, submittedEmail) {
  if (!purchase || typeof purchase !== "object") return false;
  if (normalizeEmail(purchase.email) !== normalizeEmail(submittedEmail)) return false;

  return !(
    purchase.refunded ||
    purchase.disputed ||
    purchase.chargebacked ||
    purchase.license_disabled ||
    purchase.subscription_ended_at
  );
}
