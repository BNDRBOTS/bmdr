import test from "node:test";
import assert from "node:assert/strict";
import {
  purchaseIsEligible,
  readCookie,
  signToken,
  verifyToken
} from "../netlify/functions/_shared/auth.mjs";

const secret = "0123456789abcdef0123456789abcdef";

test("signed access sessions verify and tampering fails closed", async () => {
  const now = 1_700_000_000_000;
  const token = await signToken({ v: 1, exp: now + 60_000 }, secret);
  assert.deepEqual(await verifyToken(token, secret, now), { v: 1, exp: now + 60_000 });
  assert.equal(await verifyToken(`${token}x`, secret, now), null);
  assert.equal(await verifyToken(await signToken({ v: 1, exp: now - 1 }, secret), secret, now), null);
});

test("purchase eligibility requires the matching email and an eligible purchase", () => {
  const purchase = { email: "buyer@example.com" };
  assert.equal(purchaseIsEligible(purchase, "BUYER@example.com"), true);
  for (const state of ["refunded", "disputed", "chargebacked", "license_disabled"]) {
    assert.equal(purchaseIsEligible({ ...purchase, [state]: true }, purchase.email), false);
  }
  assert.equal(purchaseIsEligible({ ...purchase, subscription_ended_at: "2026-07-01" }, purchase.email), false);
  assert.equal(purchaseIsEligible(purchase, "other@example.com"), false);
});

test("cookie parsing returns only the requested cookie", () => {
  assert.equal(readCookie("a=1; bmdr_access=token.value; c=3", "bmdr_access"), "token.value");
  assert.equal(readCookie("a=1", "bmdr_access"), "");
});
