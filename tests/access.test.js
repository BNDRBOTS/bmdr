import test from 'node:test';
import assert from 'node:assert/strict';
import { purchaseIsEligible, signToken, verifyToken } from '../netlify/functions/access.js';
import { verifyAccessToken } from '../netlify/edge-functions/purchase-gate.js';

const secret = 'test-secret-that-is-at-least-thirty-two-characters';

test('serverless and edge token verification agree', () => {
  const payload = { v: 1, exp: Date.now() + 60_000 };
  const token = signToken(payload, secret);

  assert.deepEqual(verifyToken(token, secret), payload);
  assert.deepEqual(verifyAccessToken(token, secret), payload);
});

test('tampered and expired tokens are rejected', () => {
  const valid = signToken({ v: 1, exp: Date.now() + 60_000 }, secret);
  const tampered = `${valid.slice(0, -1)}x`;
  const expired = signToken({ v: 1, exp: Date.now() - 1 }, secret);

  assert.equal(verifyToken(tampered, secret), null);
  assert.equal(verifyAccessToken(tampered, secret), null);
  assert.equal(verifyToken(expired, secret), null);
  assert.equal(verifyAccessToken(expired, secret), null);
});

test('purchase eligibility requires matching email and active purchase state', () => {
  const purchase = {
    email: 'buyer@example.com',
    refunded: false,
    disputed: false,
    chargebacked: false,
    license_disabled: false,
    subscription_ended_at: null,
  };

  assert.equal(purchaseIsEligible(purchase, 'BUYER@example.com'), true);
  assert.equal(purchaseIsEligible({ ...purchase, refunded: true }, 'buyer@example.com'), false);
  assert.equal(purchaseIsEligible({ ...purchase, chargebacked: true }, 'buyer@example.com'), false);
  assert.equal(purchaseIsEligible(purchase, 'other@example.com'), false);
});
