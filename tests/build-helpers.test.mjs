import test from "node:test";
import assert from "node:assert/strict";
import { gitBlobSha, replaceBounded, replaceOnce } from "../scripts/build.mjs";

test("Git blob SHA matches the canonical Git calculation", () => {
  assert.equal(
    gitBlobSha("test\n"),
    "9daeafb9864cf43055ae93beb0afd6c7d144bfa4"
  );
});

test("replaceOnce rejects missing and ambiguous targets", () => {
  assert.equal(replaceOnce("abc", "b", "B", "sample"), "aBc");
  assert.throws(() => replaceOnce("abc", "x", "X", "sample"), /missing/u);
  assert.throws(() => replaceOnce("aba", "a", "A", "sample"), /ambiguous/u);
});

test("replaceBounded replaces exactly one bounded region", () => {
  assert.equal(
    replaceBounded("before<start>inside<end>after", "<start>", "<end>", "new", "sample"),
    "beforenewafter"
  );
});
