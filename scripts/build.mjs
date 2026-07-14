import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DIST = join(ROOT, "dist");
const PUBLIC = join(ROOT, "public");
const PRIVATE_APP = join(ROOT, "netlify", "functions", "_private", "app.html");

export async function build() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
  await mkdir(dirname(PRIVATE_APP), { recursive: true });

  for (const file of ["index.html", "site.css", "site.js"]) {
    await cp(join(ROOT, file), join(DIST, file));
  }

  for (const entry of await readdir(PUBLIC, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    await cp(join(PUBLIC, entry.name), join(DIST, entry.name));
  }

  // The hosted app is bundled with the protected function, not published as a static file.
  await cp(join(ROOT, "app.html"), PRIVATE_APP);

  const published = new Set(await readdir(DIST));
  for (const protectedName of ["app.html", "bmdr.html"]) {
    if (published.has(protectedName)) {
      throw new Error(`Protected app was written to dist/${protectedName}`);
    }
  }

  console.log("BMDR V8 build complete.");
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (invokedDirectly) {
  build().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
