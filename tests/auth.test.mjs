import test from "node:test";
import assert from "node:assert/strict";
import {
  purchaseIsEligible,
  readCookie,
  signToken,
  verifyToken
} from "../netlify/functions/_shared/auth.mjs";

const secret = "0123456789abcdef0123456789abcdef";

test("signed access token verifies before expiration", async () => {
  const now = 1_700_000_000_000;
  const token = await signToken({ v: 1, exp: now + 60_000 }, secret);
  const payload = await verifyToken(token, secret, now);
  assert.equal(payload.v, 1);
  assert.equal(payload.exp, now + 60_000);
});

test("expired and tampered tokens fail closed", async () => {
  const now = 1_700_000_000_000;
  const expired = await signToken({ v: 1, exp: now - 1 }, secret);
  assert.equal(await verifyToken(expired, secret, now), null);

  const valid = await signToken({ v: 1, exp: now + 60_000 }, secret);
  assert.equal(await verifyToken(`${valid}x`, secret, now), null);
});

test("purchase eligibility enforces email and negative states", () => {
  const valid = { email: "buyer@example.com" };
  assert.equal(purchaseIsEligible(valid, "BUYER@example.com"), true);
  assert.equal(purchaseIsEligible({ ...valid, refunded: true }, "buyer@example.com"), false);
  assert.equal(purchaseIsEligible({ ...valid, disputed: true }, "buyer@example.com"), false);
  assert.equal(purchaseIsEligible({ ...valid, chargebacked: true }, "buyer@example.com"), false);
  assert.equal(purchaseIsEligible({ ...valid, license_disabled: true }, "buyer@example.com"), false);
  assert.equal(purchaseIsEligible(valid, "other@example.com"), false);
});

test("cookie parser returns only the requested cookie", () => {
  assert.equal(readCookie("a=1; bmdr_access=token.value; c=3", "bmdr_access"), "token.value");
  assert.equal(readCookie("a=1", "bmdr_access"), "");
});
