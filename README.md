# BMDR

BMDR is a mobile-first browser app for self-guided bilateral stimulation. It combines a moving visual anchor, optional left-right audio, adjustable pacing, two movement patterns, and four visual palettes.

## Included

- BMDR marketing website
- Full bilateral-stimulation practice app
- Gumroad purchase verification
- Protected hosted app access
- Downloadable offline app source
- Terms, privacy, refunds, and support pages
- Netlify deployment configuration

## App controls

- Visual pace: 0.2–3.0 Hz
- Anchor size: 20–150 px
- Gentle Sway and Infinite Flow
- Teal, pink, purple, and white palettes
- Optional linked or independent audio pacing
- Automatic pause when the page is hidden

## Build

Requires Node.js 20 or newer.

```bash
npm test
npm run build
```

Netlify publishes `dist` and serves `/app.html` and `/bmdr.html` through the protected function.

## Environment

```env
BMDR_SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters
GUMROAD_PRODUCT_PERMALINK=bemdr
BMDR_SESSION_TTL_HOURS=168
```

Gumroad license keys must be enabled for the product.

## Important

BMDR is a self-guided wellness tool. It is not EMDR therapy, psychotherapy, medical treatment, a medical device, crisis care, or a replacement for a qualified professional.

## Ownership

BMDR is proprietary software owned by BNDR LLC.

© 2026 BNDR LLC. All rights reserved.
