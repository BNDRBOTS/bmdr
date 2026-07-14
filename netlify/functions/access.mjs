import {
  normalizeEmail,
  purchaseIsEligible,
  readCookie,
  signToken,
  verifyToken
} from "./_shared/auth.mjs";

const COOKIE_NAME = "bmdr_access";
const DEFAULT_TTL_HOURS = 168;
const MAX_TTL_HOURS = 720;
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map();

function env(name) {
  return globalThis.Netlify?.env?.get(name) || "";
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders
    }
  });
}

function requestIsSameOrigin(request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin && origin !== url.origin) return false;
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return false;
  return true;
}

function contentLengthIsAllowed(request) {
  const length = Number.parseInt(request.headers.get("content-length") || "0", 10);
  return !Number.isFinite(length) || length <= 4096;
}

function isRateLimited(ip) {
  const now = Date.now();
  for (const [key, value] of attempts) {
    if (now - value.startedAt > WINDOW_MS) attempts.delete(key);
  }

  const key = ip || "unknown";
  const current = attempts.get(key);
  if (!current) {
    attempts.set(key, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

function clearRateLimit(ip) {
  attempts.delete(ip || "unknown");
}

function ttlSeconds() {
  const configured = Number.parseInt(env("BMDR_SESSION_TTL_HOURS"), 10);
  const hours = Number.isFinite(configured) && configured > 0
    ? Math.min(configured, MAX_TTL_HOURS)
    : DEFAULT_TTL_HOURS;
  return hours * 60 * 60;
}

function sessionCookie(token, request, maxAge) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
    "Priority=High"
  ].join("; ") + secure;
}

async function verifyWithGumroad(email, licenseKey, productPermalink) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const body = new URLSearchParams({
      product_permalink: productPermalink,
      license_key: licenseKey,
      increment_uses_count: "false"
    });

    const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`Gumroad returned HTTP ${response.status}`);
    const result = await response.json();
    return Boolean(result?.success && purchaseIsEligible(result.purchase, email));
  } finally {
    clearTimeout(timeout);
  }
}

export default async function access(request, context) {
  if (!requestIsSameOrigin(request)) {
    return json({ error: "Request origin rejected." }, 403);
  }

  const secret = env("BMDR_SESSION_SECRET");
  if (secret.length < 32) {
    return json({ error: "Purchase enforcement is not configured." }, 503);
  }

  if (request.method === "GET") {
    const token = readCookie(request.headers.get("cookie"), COOKIE_NAME);
    const payload = await verifyToken(token, secret);
    return json({
      authorized: Boolean(payload),
      expiresAt: payload?.exp || null
    });
  }

  if (request.method === "DELETE") {
    return json(
      { authorized: false },
      200,
      { "set-cookie": sessionCookie("", request, 0) }
    );
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, { allow: "GET, POST, DELETE" });
  }

  if (!contentLengthIsAllowed(request)) {
    return json({ error: "Request body too large." }, 413);
  }

  if (isRateLimited(context.ip)) {
    return json(
      { error: "Too many verification attempts. Try again later." },
      429,
      { "retry-after": "600" }
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const email = normalizeEmail(input?.email);
  const licenseKey = String(input?.licenseKey || "").trim();
  const productPermalink = env("GUMROAD_PRODUCT_PERMALINK") || "bemdr";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) {
    return json({ error: "Enter the email used for purchase." }, 400);
  }
  if (licenseKey.length < 8 || licenseKey.length > 200) {
    return json({ error: "Enter the Gumroad license key." }, 400);
  }

  try {
    const authorized = await verifyWithGumroad(email, licenseKey, productPermalink);
    if (!authorized) {
      return json({ error: "Purchase could not be verified." }, 401);
    }

    clearRateLimit(context.ip);
    const maxAge = ttlSeconds();
    const token = await signToken(
      { v: 1, exp: Date.now() + maxAge * 1000 },
      secret
    );

    return json(
      { authorized: true, expiresIn: maxAge },
      200,
      { "set-cookie": sessionCookie(token, request, maxAge) }
    );
  } catch (error) {
    console.error("BMDR purchase verification unavailable", {
      requestId: context.requestId,
      message: error instanceof Error ? error.message : String(error)
    });
    return json({ error: "Verification is temporarily unavailable." }, 503);
  }
}

export const config = {
  path: "/api/access",
  method: ["GET", "POST", "DELETE"]
};
