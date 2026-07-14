import test from "node:test";
import assert from "node:assert/strict";
import protectedApp from "../netlify/functions/protected-app.mjs";
import { signToken } from "../netlify/functions/_shared/auth.mjs";

const SECRET = "0123456789abcdef0123456789abcdef";
const originalNetlify = globalThis.Netlify;

test.beforeEach(() => {
  globalThis.Netlify = { env: { get: (name) => name === "BMDR_SESSION_SECRET" ? SECRET : "" } };
});

test.afterEach(() => {
  globalThis.Netlify = originalNetlify;
});

test("unauthorized requests are redirected to purchase verification", async () => {
  const response = await protectedApp(new Request("https://example.com/app.html"));
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "https://example.com/access.html?return=%2Fapp.html");
});

test("authorized requests receive the private BMDR application", async () => {
  const token = await signToken({ v: 1, exp: Date.now() + 60_000 }, SECRET);
  const response = await protectedApp(new Request("https://example.com/app.html", {
    headers: { cookie: `bmdr_access=${token}` }
  }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  const html = await response.text();
  assert.match(html, /BMDR \| Mindful Reprocessing/);
  assert.match(html, /Begin Practice/);
  assert.match(html, /Gentle Sway/);
});
