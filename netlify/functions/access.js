import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'bmdr_access';
const DEFAULT_TTL_HOURS = 168;
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;
const attempts = new Map();

function getEnv(name) {
  return globalThis.Netlify?.env?.get(name);
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...headers,
    },
  });
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLicense(value) {
  return String(value || '').trim();
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signToken(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyToken(token, secret, now = Date.now()) {
  if (!token || !secret) return null;
  const [encoded, suppliedSignature, extra] = String(token).split('.');
  if (!encoded || !suppliedSignature || extra) return null;

  const expectedSignature = createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!safeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (payload?.v !== 1 || !Number.isFinite(payload?.exp) || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function purchaseIsEligible(purchase, submittedEmail) {
  if (!purchase || typeof purchase !== 'object') return false;

  const purchaseEmail = normalizeEmail(purchase.email);
  if (!purchaseEmail || purchaseEmail !== normalizeEmail(submittedEmail)) return false;

  return !(
    purchase.refunded ||
    purchase.disputed ||
    purchase.chargebacked ||
    purchase.license_disabled ||
    purchase.subscription_ended_at
  );
}

function rateLimit(ip) {
  const now = Date.now();

  for (const [key, value] of attempts) {
    if (now - value.startedAt > WINDOW_MS) attempts.delete(key);
  }

  const key = ip || 'unknown';
  const current = attempts.get(key);
  if (!current || now - current.startedAt > WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > MAX_ATTEMPTS;
}

function clearRateLimit(ip) {
  attempts.delete(ip || 'unknown');
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

function sessionTtlSeconds() {
  const configured = Number.parseInt(getEnv('BMDR_SESSION_TTL_HOURS') || '', 10);
  const hours = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TTL_HOURS;
  return Math.min(hours, 24 * 30) * 60 * 60;
}

function sessionCookie(token, request, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

async function verifyWithGumroad({ email, licenseKey, productPermalink }) {
  const body = new URLSearchParams({
    product_permalink: productPermalink,
    license_key: licenseKey,
    increment_uses_count: 'false',
  });

  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Gumroad verification returned ${response.status}`);

  const data = await response.json();
  return Boolean(data?.success && purchaseIsEligible(data.purchase, email));
}

export default async function handler(request, context) {
  if (!sameOrigin(request)) return json({ error: 'Request origin rejected.' }, 403);

  const secret = getEnv('BMDR_SESSION_SECRET');
  const productPermalink = getEnv('GUMROAD_PRODUCT_PERMALINK') || 'bemdr';

  if (!secret || secret.length < 32) {
    return json({ error: 'Purchase enforcement is not configured.' }, 503);
  }

  if (request.method === 'DELETE') {
    return json(
      { authorized: false },
      200,
      { 'set-cookie': sessionCookie('', request, 0) },
    );
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, { allow: 'POST, DELETE' });
  }

  if (rateLimit(context.ip)) {
    return json({ error: 'Too many attempts. Try again later.' }, 429, { 'retry-after': '600' });
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const email = normalizeEmail(input?.email);
  const licenseKey = normalizeLicense(input?.licenseKey);

  if (!/^\S+@\S+\.\S+$/.test(email) || licenseKey.length < 8 || licenseKey.length > 200) {
    return json({ error: 'Enter the purchase email and license key.' }, 400);
  }

  try {
    const authorized = await verifyWithGumroad({ email, licenseKey, productPermalink });
    if (!authorized) return json({ error: 'Purchase could not be verified.' }, 401);

    clearRateLimit(context.ip);

    const ttlSeconds = sessionTtlSeconds();
    const token = signToken(
      {
        v: 1,
        exp: Date.now() + ttlSeconds * 1000,
      },
      secret,
    );

    return json(
      { authorized: true, expiresIn: ttlSeconds },
      200,
      { 'set-cookie': sessionCookie(token, request, ttlSeconds) },
    );
  } catch (error) {
    console.error('BMDR license verification failed', {
      requestId: context.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
    return json({ error: 'Verification service is temporarily unavailable.' }, 503);
  }
}

export const config = {
  path: '/api/access',
  method: ['POST', 'DELETE'],
};
