# BMDR Version 7 — Upload Instructions

## Exact source accepted

This package is locked to:

- Repository: `BNDRBOTS/bmdr`
- Version 7 commit: `f5b0b8605b9a879e4dc4683218f33bd621aa467a`
- Original files: `README.md`, `app.html`, `bmdr.html`, `index.html`, `site.css`, `site.js`

The build calculates each file's canonical Git blob SHA. Any missing, edited, mixed-version, or wrong-branch file stops the build before `dist/` is produced.

## Upload

1. Open the **Version 7 branch**, not `main`.
2. Extract `BMDR_V7_LOCKED_UPLOAD.zip`.
3. Upload the **contents** of `UPLOAD_TO_VERSION_7_ROOT/` into the Version 7 repository root.
4. Do not overwrite the six existing Version 7 source files. This package is additive.
5. Configure Netlify to build from that branch.

## Netlify environment variables

Set:

```text
BMDR_SESSION_SECRET=<random secret at least 32 characters>
GUMROAD_PRODUCT_PERMALINK=bemdr
GUMROAD_PRODUCT_URL=https://bndrllc.gumroad.com/l/bemdr
BMDR_SESSION_TTL_HOURS=168
```

Enable license keys for the BMDR Gumroad product.

## Build behavior

`npm run build`:

1. Verifies all six exact Version 7 Git blob hashes.
2. Copies the marketing site into `dist/`.
3. Applies deterministic, assertion-checked pricing, privacy, and legal-link changes to the copied `index.html`.
4. Adds access, terms, privacy, refunds, and support pages.
5. Excludes `app.html` and `bmdr.html` from the public static output.
6. Bundles the verified Version 7 `app.html` privately with the protected Netlify function.
7. Serves `/app.html` and `/bmdr.html` only after server-side Gumroad verification.

The original Version 7 files are not rewritten by the build.

## Validation

Run:

```bash
npm test
npm run verify
npm run build
```

A successful build prints the pinned commit and confirms that protected app files were not emitted into `dist/`.

## Important repository visibility limit

The deployment gate prevents unauthorized delivery from the deployed BMDR site. It cannot hide source that is already stored in a public GitHub repository or its history. For actual source confidentiality, use a private repository or deploy from a private/local source package. Client-side hiding, minification, and obfuscation are not purchase enforcement.
