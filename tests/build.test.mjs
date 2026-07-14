import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

async function text(path) {
  return readFile(resolve(root, path), "utf8");
}

test("build publishes the site and legal pages but not the app source", async () => {
  for (const path of [
    "dist/index.html", "dist/site.css", "dist/site.js", "dist/access.html",
    "dist/terms.html", "dist/privacy.html", "dist/refunds.html", "dist/support.html",
    "dist/legal.css", "netlify/functions/_private/app.html"
  ]) {
    assert.ok((await stat(resolve(root, path))).isFile(), `${path} missing`);
  }
  assert.equal(existsSync(resolve(root, "dist/app.html")), false);
  assert.equal(existsSync(resolve(root, "dist/bmdr.html")), false);
});

test("V8 contains paid access language, legal links, and the preserved app controls", async () => {
  const index = await text("dist/index.html");
  const site = await text("dist/site.js");
  const app = await text("netlify/functions/_private/app.html");

  assert.match(index, /One purchase\.<br>No subscription\./);
  assert.match(index, /Verify and open BMDR/);
  assert.match(index, /\/terms\.html/);
  assert.doesNotMatch(index, /Start free|>Free<|Begin personal practice|"price": "0"/);
  assert.match(site, /src='\/app\.html'/);

  for (const value of [
    "Visual Pace", "Audio Pace", "Visual Anchor Size", "Gentle Sway",
    "Infinite Flow", "#00ffcc", "#ff0055", "#7000ff", "#ffffff",
    "AudioContext", "visibilitychange", "Begin Practice"
  ]) {
    assert.ok(app.includes(value), `app behavior missing: ${value}`);
  }
  assert.equal(await text("app.html"), await text("bmdr.html"));
});

test("shipping and source-lock artifacts are absent", async () => {
  for (const path of [
    "SOURCE_LOCK.json", "UPLOAD_INSTRUCTIONS.md", "README_FIRST.txt",
    "ARTIFACT_MANIFEST.json", "VALIDATION_REPORT.txt", "WRONG_MAIN_CHANGES.md",
    "UPLOAD_TO_VERSION_7_ROOT"
  ]) {
    assert.equal(existsSync(resolve(root, path)), false, `${path} should not exist`);
  }
  const readme = await text("README.md");
  const buildScript = await text("scripts/build.mjs");
  assert.ok(readme.split("\n").length < 100);
  assert.doesNotMatch(readme, /source lock|commit hash|upload instructions/i);
  assert.doesNotMatch(buildScript, /README|source lock|blob sha|commit hash/i);
});
