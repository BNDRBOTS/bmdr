import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'bmdr_access';

function safeEqual(left, right) {
  const encoder = new TextEncoder();
  const a = encoder.encode(String(left));
  const b = encoder.encode(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = value;
  }
  return cookies;
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

export function verifyAccessToken(token, secret, now = Date.now()) {
  if (!token || !secret) return null;
  const [encoded, suppliedSignature, extra] = String(token).split('.');
  if (!encoded || !suppliedSignature || extra) return null;

  const expectedSignature = createHmac('sha256', secret).update(encoded).digest('base64url');
  if (!safeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(encoded));
    if (payload?.v !== 1 || !Number.isFinite(payload?.exp) || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

function securityHeaders(headers = new Headers()) {
  headers.set('cache-control', 'no-store, max-age=0');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('x-frame-options', 'DENY');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  return headers;
}

function gatePage(productUrl, configurationError = false) {
  const heading = configurationError ? 'Access Setup Required' : 'Purchase Verification';
  const copy = configurationError
    ? 'The app owner must configure the deployment secret before BMDR can open.'
    : 'Purchase BMDR, then enter the email and license key issued by Gumroad.';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <title>BMDR | ${heading}</title>
  <style>
    :root { color-scheme: dark; --accent: #00ffcc; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px; background: linear-gradient(105deg,#e8e8e8 0 50%,#000 50% 100%); font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    main { width: min(100%, 430px); padding: 32px; border-radius: 28px; background: rgba(255,255,255,.82); color: #050505; backdrop-filter: blur(24px); box-shadow: 0 30px 80px rgba(0,0,0,.35); }
    h1 { margin: 0 0 10px; font-size: 24px; letter-spacing: .08em; text-transform: uppercase; }
    p { margin: 0 0 22px; line-height: 1.5; color: rgba(0,0,0,.68); }
    a, button { width: 100%; min-height: 52px; border: 0; border-radius: 999px; display: grid; place-items: center; font: 800 12px/1 system-ui,sans-serif; letter-spacing: .12em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
    a { margin-bottom: 20px; background: #000; color: #fff; }
    form { display: grid; gap: 12px; }
    label { display: grid; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    input { width: 100%; min-height: 48px; border: 1px solid rgba(0,0,0,.18); border-radius: 14px; padding: 0 14px; background: rgba(255,255,255,.9); color: #000; font: 500 16px system-ui,sans-serif; }
    button { margin-top: 4px; background: #111; color: var(--accent); }
    button:disabled { opacity: .55; cursor: wait; }
    #message { min-height: 20px; margin: 4px 0 0; font-size: 13px; color: #9d1231; }
    small { display: block; margin-top: 20px; color: rgba(0,0,0,.5); line-height: 1.45; }
  </style>
</head>
<body>
  <main>
    <h1>${heading}</h1>
    <p>${copy}</p>
    ${configurationError ? '' : `<a href="${productUrl}" target="_blank" rel="noopener noreferrer">Purchase BMDR</a>
    <form id="license-form">
      <label>Purchase email<input id="email" name="email" type="email" autocomplete="email" required></label>
      <label>License key<input id="license" name="license" type="text" autocomplete="off" spellcheck="false" required></label>
      <button id="submit" type="submit">Verify and Open</button>
      <p id="message" role="status" aria-live="polite"></p>
    </form>`}
    <small>BMDR is a wellness tool and is not a substitute for medical or mental-health care. Stop use if the visual or audio movement causes discomfort.</small>
  </main>
  ${configurationError ? '' : `<script>
    const form = document.getElementById('license-form');
    const submit = document.getElementById('submit');
    const message = document.getElementById('message');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      submit.disabled = true;
      message.textContent = 'Verifying purchase…';
      try {
        const response = await fetch('/api/access', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: document.getElementById('email').value,
            licenseKey: document.getElementById('license').value
          })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.authorized) throw new Error(data.error || 'Purchase could not be verified.');
        location.reload();
      } catch (error) {
        message.textContent = error.message || 'Purchase could not be verified.';
        submit.disabled = false;
      }
    });
  </script>`}
</body>
</html>`;
}

export default async function handler(request, context) {
  const url = new URL(request.url);
  if ((url.pathname !== '/' && url.pathname !== '/index.html') || !['GET', 'HEAD'].includes(request.method)) {
    return context.next();
  }

  const secret = globalThis.Netlify?.env?.get('BMDR_SESSION_SECRET');
  const productUrl = globalThis.Netlify?.env?.get('GUMROAD_PRODUCT_URL') || 'https://bndrllc.gumroad.com/l/bemdr';

  if (!secret || secret.length < 32) {
    return new Response(request.method === 'HEAD' ? null : gatePage(productUrl, true), {
      status: 503,
      headers: securityHeaders(new Headers({ 'content-type': 'text/html; charset=utf-8' })),
    });
  }

  const token = parseCookies(request.headers.get('cookie'))[COOKIE_NAME];
  if (!verifyAccessToken(token, secret)) {
    return new Response(request.method === 'HEAD' ? null : gatePage(productUrl), {
      status: 200,
      headers: securityHeaders(new Headers({
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
      })),
    });
  }

  const response = await context.next();
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: securityHeaders(new Headers(response.headers)),
  });
}

export const config = {
  path: '/*',
  onError: 'fail',
};
