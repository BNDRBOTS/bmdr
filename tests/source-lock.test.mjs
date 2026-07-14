import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { EXPECTED_BLOBS, patchIndex, verifyPinnedSources } from "../scripts/build.mjs";
import { readFile } from "node:fs/promises";

const root = resolve(".");
const sourcePresent = Object.keys(EXPECTED_BLOBS).every((file) => existsSync(join(root, file)));

test("exact Version 7 source lock passes", { skip: !sourcePresent }, async () => {
  await verifyPinnedSources(root);
});

test("Version 7 index patch is deterministic and complete", { skip: !sourcePresent }, async () => {
  const original = await readFile(join(root, "index.html"), "utf8");
  const patched = patchIndex(original);
  assert.match(patched, /The app route remains locked/u);
  assert.match(patched, /\/privacy\.html/u);
  assert.doesNotMatch(patched, /Start free/u);
});
