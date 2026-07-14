import test from "node:test";
import assert from "node:assert/strict";
import access from "../netlify/functions/access.mjs";
import { readCookie, verifyToken } from "../netlify/functions/_shared/auth.mjs";

const SECRET = "0123456789abcdef0123456789abcdef";
const originalFetch = globalThis.fetch;
const originalNetlify = globalThis.Netlify;

function configure(values = {}) {
  globalThis.Netlify = {
    env: {
      get(name) {
        return {
          BMDR_SESSION_SECRET: SECRET,
          GUMROAD_PRODUCT_PERMALINK: "bemdr",
          BMDR_SESSION_TTL_HOURS: "168",
          ...values
        }[name] || "";
      }
    }
  };
}

function request(method, body, headers = {}) {
  return new Request("https://example.com/api/access", {
    method,
    headers: {
      origin: "https://example.com",
      "sec-fetch-site": "same-origin",
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.Netlify = originalNetlify;
});

test("valid Gumroad verification creates a signed HttpOnly session", { concurrency: false }, async () => {
  configure();
  let submitted;
  globalThis.fetch = async (url, options) => {
    submitted = { url, options, body: Object.fromEntries(options.body.entries()) };
    return Response.json({ success: true, purchase: { email: "buyer@example.com" } });
  };

  const response = await access(
    request("POST", { email: "BUYER@example.com", licenseKey: "valid-license-key" }),
    { ip: "198.51.100.1", requestId: "test-valid" }
  );

  assert.equal(response.status, 200);
  assert.equal(submitted.url, "https://api.gumroad.com/v2/licenses/verify");
  assert.deepEqual(submitted.body, {
    product_permalink: "bemdr",
    license_key: "valid-license-key",
    increment_uses_count: "false"
  });

  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /bmdr_access=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  const token = readCookie(cookie, "bmdr_access");
  assert.ok(await verifyToken(token, SECRET));
});

test("invalid, refunded, and unavailable verifications fail with the correct status", { concurrency: false }, async () => {
  configure();

  globalThis.fetch = async () => Response.json({ success: false }, { status: 404 });
  let response = await access(request("POST", { email: "buyer@example.com", licenseKey: "invalid-key" }), { ip: "198.51.100.2" });
  assert.equal(response.status, 401);

  globalThis.fetch = async () => Response.json({ success: true, purchase: { email: "buyer@example.com", refunded: true } });
  response = await access(request("POST", { email: "buyer@example.com", licenseKey: "refunded-key" }), { ip: "198.51.100.3" });
  assert.equal(response.status, 401);

  globalThis.fetch = async () => Response.json({ error: "down" }, { status: 503 });
  response = await access(request("POST", { email: "buyer@example.com", licenseKey: "service-down" }), { ip: "198.51.100.4", requestId: "test-down" });
  assert.equal(response.status, 503);
});

test("status, origin checks, and clearing access fail safely", { concurrency: false }, async () => {
  configure();
  let response = await access(request("GET"), { ip: "198.51.100.5" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authorized: false, expiresAt: null });

  response = await access(new Request("https://example.com/api/access", {
    method: "GET",
    headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" }
  }), {});
  assert.equal(response.status, 403);

  configure({ BMDR_SESSION_SECRET: "" });
  response = await access(request("DELETE"), {});
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});
