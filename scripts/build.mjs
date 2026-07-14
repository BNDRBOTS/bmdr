import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DIST = join(ROOT, "dist");
const PRIVATE_APP = join(ROOT, "netlify", "functions", "_private", "app.html");

export const SOURCE_COMMIT = "f5b0b8605b9a879e4dc4683218f33bd621aa467a";
export const EXPECTED_BLOBS = Object.freeze({
  "README.md": "2f0fa21cf35830111d404ce534acd93f3c2f59b1",
  "app.html": "720768f8c3fb0ebbb212f4170a9e80e6de4c3995",
  "bmdr.html": "720768f8c3fb0ebbb212f4170a9e80e6de4c3995",
  "index.html": "84e5c45e43800468a0b30de1d90fcdd8e4c0fb7f",
  "site.css": "d68c81482349f9ec4f224cf38db9762d056d8d1c",
  "site.js": "40926e3d41fa11d5f85612e80846565609eda8fa"
});

export function gitBlobSha(content) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return createHash("sha1")
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest("hex");
}

export function replaceOnce(source, target, replacement, label) {
  const first = source.indexOf(target);
  if (first === -1) throw new Error(`Patch target missing: ${label}`);
  if (source.indexOf(target, first + target.length) !== -1) {
    throw new Error(`Patch target is ambiguous: ${label}`);
  }
  return source.slice(0, first) + replacement + source.slice(first + target.length);
}

export function replaceBounded(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start);
  if (startIndex === -1) throw new Error(`Patch start missing: ${label}`);
  const endIndex = source.indexOf(end, startIndex);
  if (endIndex === -1) throw new Error(`Patch end missing: ${label}`);
  if (source.indexOf(start, startIndex + start.length) !== -1) {
    throw new Error(`Patch start is ambiguous: ${label}`);
  }
  return source.slice(0, startIndex) + replacement + source.slice(endIndex + end.length);
}

export function patchIndex(original) {
  let html = original;

  html = replaceOnce(
    html,
    "Free in your browser, or one purchase to own the file.",
    "Purchase once to unlock browser access and the downloadable offline file.",
    "meta description pricing"
  );

  html = replaceOnce(
    html,
    "No account, no tracking, no noise. Free in your browser, or one purchase to own the file.",
    "No subscription and no session tracking. One purchase unlocks browser access and the downloadable offline file.",
    "Open Graph pricing"
  );

  html = replaceOnce(
    html,
`      "offers": [
        {
          "@type": "Offer",
          "name": "Personal practice",
          "price": "0",
          "priceCurrency": "USD",
          "url": "https://bndrllc.com/bmdr#/app",
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "name": "Full practice — own the file",
          "url": "https://bndrllc.gumroad.com/l/bemdr",
          "availability": "https://schema.org/InStock"
        }
      ],`,
`      "offers": [
        {
          "@type": "Offer",
          "name": "BMDR — browser access and downloadable offline file",
          "url": "https://bndrllc.gumroad.com/l/bemdr",
          "availability": "https://schema.org/InStock"
        }
      ],`,
    "structured-data offers"
  );

  html = replaceOnce(
    html,
    "Everything happens on your device. There’s no login, no sync, and no server waiting on the other end. Close the tab and the session is gone.",
    "Session activity stays on your device. Purchase verification occurs only when access is unlocked; the session itself is not uploaded or synchronized. Close the tab and the session is gone.",
    "privacy architecture card"
  );

  html = replaceOnce(
    html,
    "Nothing, because there isn’t any. No account, no analytics, no tracking pixels. Your session runs on your device and ends there. There is nothing to delete because nothing was kept.",
    "Your session activity stays on your device and is not uploaded. To unlock access, the purchase email and Gumroad license key are sent to the verification endpoint and Gumroad; a signed access cookie is then stored in your browser. BMDR does not add analytics or advertising trackers.",
    "structured-data privacy answer"
  );

  html = replaceOnce(
    html,
    "<p>Nothing, because there isn’t any. No account, no analytics, no tracking pixels. Your session runs on your device and ends there. There is nothing to delete because nothing was kept.</p>",
    "<p>Your session activity stays on your device and is not uploaded. Access verification sends the purchase email and Gumroad license key to the verification endpoint and Gumroad, then stores a signed access cookie. BMDR adds no analytics or advertising trackers.</p>",
    "visible privacy answer"
  );

  const pricingStart = '      <div class="price-grid">';
  const pricingEnd = '      <p class="price-note" data-reveal>Not sure yet? Start free. The practice space opens instantly, and the unlock will still be here when you’re ready.</p>';
  const pricingReplacement = `      <div class="price-grid">
        <div class="price-card glass-l track" data-reveal>
          <span class="tier">BMDR access</span>
          <div class="amount">One purchase</div>
          <p class="under">Browser access plus the downloadable offline file.</p>
          <ul class="tick">
            <li>The complete practice space</li>
            <li>Full 0.2–3.0 Hz pace range</li>
            <li>Both flow patterns and all four palettes</li>
            <li>Bilateral audio built around the 87 Hz core</li>
            <li>No subscription or recurring billing</li>
          </ul>
          <a class="btn btn-solid mag" href="https://bndrllc.gumroad.com/l/bemdr" target="_blank" rel="noopener noreferrer"><span class="mag-in">Purchase on Gumroad ↗</span></a>
        </div>
        <div class="price-card glass-d track" data-reveal>
          <span class="tier">Already purchased?</span>
          <div class="amount">Unlock access</div>
          <p class="under">Use the purchase email and license key from the Gumroad receipt.</p>
          <ul class="tick">
            <li>Server-side Gumroad verification</li>
            <li>Refunded, disputed, chargebacked, or disabled licenses are rejected</li>
            <li>Signed, expiring HttpOnly access session</li>
            <li>No password or BMDR account required</li>
          </ul>
          <a class="btn mag" style="background:#fff;color:#0a0a0a" href="#/app"><span class="mag-in">Verify and open BMDR</span></a>
        </div>
      </div>
      <p class="price-note" data-reveal>The app route remains locked until Gumroad verifies the matching purchase email and license key.</p>`;
  html = replaceBounded(
    html,
    pricingStart,
    pricingEnd,
    pricingReplacement,
    "pricing section"
  );

  html = replaceOnce(
    html,
`  <span>
    <a href="https://bndrllc.com" target="_blank" rel="noopener noreferrer">BNDR LLC</a>
    &nbsp;·&nbsp;
    <a href="https://bndrllc.gumroad.com/l/bemdr" target="_blank" rel="noopener noreferrer">Gumroad</a>
  </span>`,
`  <span>
    <a href="https://bndrllc.com" target="_blank" rel="noopener noreferrer">BNDR LLC</a>
    &nbsp;·&nbsp;
    <a href="https://bndrllc.gumroad.com/l/bemdr" target="_blank" rel="noopener noreferrer">Gumroad</a>
    &nbsp;·&nbsp;
    <a href="/terms.html">Terms</a>
    &nbsp;·&nbsp;
    <a href="/privacy.html">Privacy</a>
    &nbsp;·&nbsp;
    <a href="/refunds.html">Refunds</a>
    &nbsp;·&nbsp;
    <a href="/support.html">Support</a>
  </span>`,
    "footer legal links"
  );

  const forbiddenVisibleNames = [">BEMDR<", ">B-EMDR<"];
  for (const value of forbiddenVisibleNames) {
    if (html.includes(value)) throw new Error(`Brand regression detected: ${value}`);
  }

  for (const required of [
    "/terms.html",
    "/privacy.html",
    "/refunds.html",
    "/support.html",
    "The app route remains locked"
  ]) {
    if (!html.includes(required)) throw new Error(`Required output missing: ${required}`);
  }

  return html;
}

export async function verifyPinnedSources(root = ROOT) {
  const failures = [];
  for (const [file, expected] of Object.entries(EXPECTED_BLOBS)) {
    const path = join(root, file);
    if (!existsSync(path)) {
      failures.push(`${file}: missing`);
      continue;
    }
    const bytes = await readFile(path);
    const actual = gitBlobSha(bytes);
    if (actual !== expected) failures.push(`${file}: expected ${expected}, received ${actual}`);
  }

  if (failures.length) {
    throw new Error(
      [
        `BMDR source lock failed. This overlay only accepts Version 7 commit ${SOURCE_COMMIT}.`,
        ...failures.map((failure) => `- ${failure}`),
        "No deploy output was produced."
      ].join("\n")
    );
  }
}

async function copyExtraFiles() {
  const extraRoot = join(ROOT, "public-extra");
  for (const file of [
    "access.html",
    "legal.css",
    "privacy.html",
    "refunds.html",
    "support.html",
    "terms.html"
  ]) {
    await cp(join(extraRoot, file), join(DIST, file));
  }
}

async function build() {
  await verifyPinnedSources();

  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await mkdir(dirname(PRIVATE_APP), { recursive: true });

  await cp(join(ROOT, "site.css"), join(DIST, "site.css"));
  await cp(join(ROOT, "site.js"), join(DIST, "site.js"));

  const index = await readFile(join(ROOT, "index.html"), "utf8");
  await writeFile(join(DIST, "index.html"), patchIndex(index), "utf8");

  // The application source is intentionally excluded from the static publish
  // directory. It is bundled privately with the protected server function.
  await cp(join(ROOT, "app.html"), PRIVATE_APP);

  await copyExtraFiles();

  const manifest = {
    product: "BMDR",
    sourceCommit: SOURCE_COMMIT,
    sourceBlobs: EXPECTED_BLOBS,
    staticAppSourcePublished: false,
    protectedRoutes: ["/app.html", "/bmdr.html"],
    legalPages: ["/terms.html", "/privacy.html", "/refunds.html", "/support.html"]
  };
  await writeFile(
    join(DIST, "build-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  for (const forbidden of ["app.html", "bmdr.html"]) {
    if (existsSync(join(DIST, forbidden))) {
      throw new Error(`Protected source leaked into static output: dist/${forbidden}`);
    }
  }

  console.log(`BMDR Version 7 verified and built from ${SOURCE_COMMIT}.`);
  console.log("Protected app source was excluded from dist and bundled with the access function.");
}

async function main() {
  if (process.argv.includes("--check")) {
    await verifyPinnedSources();
    console.log(`BMDR Version 7 source lock passed: ${SOURCE_COMMIT}`);
    return;
  }
  await build();
}

const invokedDirectly = process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
