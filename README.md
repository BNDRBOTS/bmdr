# BMDR

BMDR is a mobile-first browser application for self-guided bilateral stimulation. It combines a moving visual anchor, optional left-right audio movement, adjustable pacing, selectable flow patterns, and a focused full-screen practice environment.

The current Version 7 deployment includes:

- The original BMDR marketing site and practice application
- Server-side Gumroad purchase verification
- Protected access to the BMDR application
- Signed, expiring browser sessions
- Terms, privacy, refund, support, and purchase-recovery pages
- Regression locking against the exact Version 7 source snapshot
- Netlify deployment configuration and automated validation

BMDR is created and maintained by **BNDR LLC**.

---

## Product Scope

BMDR is a self-guided wellness practice tool.

It is not:

- EMDR therapy
- Psychotherapy
- Medical treatment
- A medical device
- Crisis care
- A replacement for a licensed clinician

The application borrows the steady left-right rhythm used in bilateral stimulation and provides a private, browser-based practice space.

---

## Core Experience

The BMDR practice space includes:

- Full-screen visual bilateral movement
- Adjustable pace from `0.2` to `3.0`
- Adjustable anchor size from `20` to `150` pixels
- Two movement patterns:
  - Gentle Sway
  - Infinite Flow
- Four visual palettes:
  - `#00FFCC`
  - `#FF0055`
  - `#7000FF`
  - `#FFFFFF`
- Optional bilateral audio
- Linked or independent visual and audio pacing
- Play and pause controls
- Mobile-first settings sheet
- Automatic pause when the page is hidden
- Screen-reader labels and status announcements
- Reduced-motion support
- Safe-area support for modern mobile devices

---

## Audio System

BMDR generates audio locally through the Web Audio API.

The current audio design uses:

- Triangle oscillator at `43.5 Hz`
- Reference core at `87 Hz`
- Sine harmonic at `174 Hz`
- Left and right gain channels
- Stereo movement synchronized to the visual anchor
- Optional independent audio pacing
- Dynamics compression
- Gradual fade-in and fade-out behavior

Audio is optional. Browser autoplay rules require direct user interaction before audio can begin.

Headphones provide the clearest left-right movement.

---

## Repository Structure

```text
.
├── README.md
├── app.html
├── bmdr.html
├── index.html
├── site.css
├── site.js
├── package.json
├── netlify.toml
├── SOURCE_LOCK.json
├── UPLOAD_INSTRUCTIONS.md
├── WRONG_MAIN_CHANGES.md
├── .env.example
├── public-extra/
│   ├── access.html
│   ├── legal.css
│   ├── privacy.html
│   ├── refunds.html
│   ├── support.html
│   └── terms.html
├── scripts/
│   └── build.mjs
├── tests/
│   ├── auth.test.mjs
│   ├── build-helpers.test.mjs
│   └── source-lock.test.mjs
└── netlify/
    └── functions/
        ├── access.mjs
        ├── protected-app.mjs
        ├── _private/
        │   └── app.html
        └── _shared/
            └── auth.mjs
```

---

## Application Files

### `index.html`

The BMDR marketing site.

It includes:

- Product overview
- Method explanation
- Feature demonstrations
- Pricing and purchase flow
- FAQ
- Embedded application route
- Terms, privacy, refunds, and support links

The build process creates the deployable copy of this file and applies deterministic Version 7 changes without rewriting the original source file.

### `app.html`

The primary BMDR practice application.

This file contains:

- Application layout
- Visual rendering engine
- Audio engine
- Practice controls
- Accessibility behavior
- Responsive styles
- Mobile safe-area handling

The deployed static site does not publish this file directly.

During the build, the verified Version 7 application is copied into the private Netlify function bundle and served only after successful purchase verification.

### `bmdr.html`

Version 7 contains the same application source as `app.html`.

The deployed `/bmdr.html` route is protected by the same authorization system as `/app.html`.

### `site.css`

Contains the BMDR marketing-site design system, responsive layout, navigation, feature demonstrations, pricing, FAQ, and application-shell styling.

### `site.js`

Contains the marketing-site runtime:

- Hash routing
- Scroll behavior
- Reveal animations
- Magnetic interactions
- Card glow tracking
- FAQ accordion
- Feature demonstrations
- Hero Canvas animation
- Application iframe mounting
- Reduced-motion handling

---

## Purchase Enforcement

BMDR browser access is protected through server-side Gumroad verification.

### Verification flow

1. The purchaser opens `/access.html`.
2. The purchaser enters:
   - The email used for purchase
   - The Gumroad license key
3. The browser sends those values to `/api/access`.
4. The Netlify function verifies the license with Gumroad.
5. The submitted email must match the purchase email.
6. The purchase must remain eligible.
7. A signed, expiring `HttpOnly` cookie is issued.
8. The purchaser is redirected to the protected BMDR application.

### Rejected purchase states

Access is rejected when the Gumroad purchase is marked as:

- Refunded
- Disputed
- Chargebacked
- License disabled
- Subscription ended

### Session cookie

Successful verification creates:

```text
bmdr_access
```

The cookie is:

- Signed with HMAC-SHA256
- `HttpOnly`
- `SameSite=Strict`
- `Secure` on HTTPS
- Expiring
- Limited to the BMDR site
- Free of the purchase email and license key

The default session duration is seven days.

The maximum configured duration is thirty days.

### Protected application delivery

The public static deployment does not include:

```text
dist/app.html
dist/bmdr.html
```

The protected Netlify function serves the application source only after validating the signed access cookie.

Unauthorized requests are redirected to:

```text
/access.html
```

---

## Security Controls

The deployment includes:

- Server-side Gumroad verification
- Signed authorization sessions
- Constant-time signature comparison
- Expiration validation
- Same-origin request enforcement
- Request-size limits
- Verification-attempt throttling
- Gumroad request timeout
- No-store responses for access endpoints
- No-store responses for protected application HTML
- Security headers
- Content Security Policy
- Frame restrictions
- Referrer policy
- Permission restrictions
- No license keys in page URLs
- No license keys in browser storage
- No purchase email or license-key logging in application code
- Fail-closed behavior when required secrets are absent

Client-side hiding is not used as purchase enforcement.

---

## Privacy

BMDR session activity runs locally in the browser.

The application does not upload:

- Visual pace
- Audio pace
- Selected color
- Selected movement pattern
- Session duration
- Session content
- Personal reflections
- Clinical information

Purchase verification sends the following to the BMDR verification endpoint and Gumroad:

- Purchase email
- Gumroad license key

After verification, the browser stores only the signed access cookie.

The deployment adds no:

- Analytics
- Advertising pixels
- Behavioral tracking
- User profiles
- Session recording
- Data brokerage

Standard infrastructure logs may still be created by Netlify, Gumroad, Railway, Google Fonts, or other hosting providers according to their own systems and policies.

See:

```text
/privacy.html
```

---

## Legal and Support Pages

The deployment includes:

### Terms

```text
/terms.html
```

Covers:

- Personal-use license
- Purchase verification
- Safe use
- No clinical relationship
- Intellectual property
- Availability
- Disclaimers
- Liability limits

### Privacy

```text
/privacy.html
```

Covers:

- Local session activity
- Purchase verification data
- Access cookie
- Hosting logs
- External services
- Analytics and advertising
- Retention and requests

### Refunds

```text
/refunds.html
```

Covers:

- Digital-product purchase policy
- Duplicate or incorrect charges
- Material technical failure
- Required request information
- Access removal after refund or dispute
- Mandatory consumer rights

### Support

```text
/support.html
```

Covers:

- Purchase recovery
- License-key errors
- Audio behavior
- Browser compatibility
- Sign-out and reset
- Contact guidance

### Access Recovery

```text
/access.html
```

Allows existing purchasers to:

- Verify access
- Re-enter purchase credentials
- Open the protected application
- Clear the current device session
- Reach purchase, legal, and support pages

---

## Version 7 Source Lock

The deployment overlay is locked to the exact Version 7 source snapshot:

```text
Repository: BNDRBOTS/bmdr
Commit: f5b0b8605b9a879e4dc4683218f33bd621aa467a
```

The build verifies the canonical Git blob SHA for:

- `README.md`
- `app.html`
- `bmdr.html`
- `index.html`
- `site.css`
- `site.js`

The build fails before creating deploy output when:

- A required Version 7 file is missing
- A file was edited
- Files came from different versions
- The overlay was added to the wrong source snapshot
- The expected patch target is missing
- A patch target appears more than once
- Protected application files leak into the public output

This prevents the deployment overlay from silently applying to an unverified codebase.

---

## Build Process

Requirements:

```text
Node.js 20 or newer
```

Install dependencies:

```bash
npm install
```

Verify the Version 7 source files:

```bash
npm run verify
```

Run automated tests:

```bash
npm test
```

Create the deployable output:

```bash
npm run build
```

The build performs these operations:

1. Verifies all Version 7 source hashes.
2. Deletes any previous `dist/` output.
3. Copies `site.css` and `site.js`.
4. Creates the deployable marketing-site `index.html`.
5. Applies exact, assertion-checked pricing and privacy corrections.
6. Adds terms, privacy, refunds, support, and access pages.
7. Copies the original Version 7 application into the private function bundle.
8. Refuses to publish `app.html` or `bmdr.html` statically.
9. Creates `dist/build-manifest.json`.
10. Stops immediately on any regression-lock failure.

The original Version 7 application files remain unchanged.

---

## Environment Variables

Create the following Netlify environment variables:

```env
BMDR_SESSION_SECRET=replace-with-a-random-secret-at-least-32-characters
GUMROAD_PRODUCT_PERMALINK=bemdr
GUMROAD_PRODUCT_URL=https://bndrllc.gumroad.com/l/bemdr
BMDR_SESSION_TTL_HOURS=168
```

### `BMDR_SESSION_SECRET`

Required.

Used to sign and verify access-session cookies.

Requirements:

- At least 32 characters
- Random
- Private
- Never committed to the repository

### `GUMROAD_PRODUCT_PERMALINK`

Current value:

```text
bemdr
```

This is the Gumroad product URL slug.

The external Gumroad slug may remain `bemdr`; the visible product brand throughout the BMDR site remains **BMDR**.

### `GUMROAD_PRODUCT_URL`

Current purchase URL:

```text
https://bndrllc.gumroad.com/l/bemdr
```

### `BMDR_SESSION_TTL_HOURS`

Default:

```text
168
```

Equivalent to seven days.

Maximum:

```text
720
```

Equivalent to thirty days.

---

## Gumroad Configuration

The Gumroad product must have license keys enabled.

The purchaser must receive:

- A purchase receipt
- A license key
- A purchase email associated with the license

The access endpoint verifies using Gumroad's license-verification API.

The purchase link is:

```text
https://bndrllc.gumroad.com/l/bemdr
```

---

## Netlify Deployment

The included `netlify.toml` configures:

```text
Build command: node scripts/build.mjs
Publish directory: dist
Functions directory: netlify/functions
```

The protected application file is bundled through:

```toml
[functions]
included_files = ["netlify/functions/_private/app.html"]
```

Deploy from the Version 7 branch containing:

- The six original Version 7 files
- The additive enforcement and legal overlay
- The required Netlify environment variables

A deployment without a valid `BMDR_SESSION_SECRET` fails closed and does not grant application access.

---

## Testing

The repository includes tests for:

- Valid signed sessions
- Expired sessions
- Tampered sessions
- Gumroad purchase eligibility
- Refunded purchases
- Disputed purchases
- Chargebacked purchases
- Disabled licenses
- Purchase-email matching
- Cookie parsing
- Git blob hashing
- Deterministic patch helpers
- Missing patch targets
- Ambiguous patch targets
- Exact Version 7 source validation
- Final build-output requirements

Run:

```bash
npm test
npm run verify
npm run build
```

---

## Mobile-First Behavior

BMDR is designed for mobile use first.

The application includes:

- Responsive full-screen layout
- Touch-sized controls
- Dynamic viewport handling
- iPhone safe-area support
- Mobile bottom-sheet controls
- Tap-to-pause behavior
- Mobile browser status-bar metadata
- Home-screen application metadata
- Responsive desktop behavior

The marketing site also includes mobile navigation and responsive content layouts.

---

## Accessibility

Version 7 includes:

- Semantic navigation
- Skip link
- Visible keyboard focus states
- Labeled range controls
- Screen-reader status output
- Accessible FAQ controls
- `aria-expanded` state
- Reduced-motion support
- Keyboard-accessible buttons and links
- Sufficient touch target sizing
- Automatic session pause when the page becomes hidden

---

## Browser Requirements

BMDR requires a modern browser supporting:

- JavaScript
- Canvas 2D
- Web Audio API
- CSS custom properties
- CSS backdrop filters
- Cookies
- `requestAnimationFrame`
- Modern responsive CSS

Expected browsers include current versions of:

- Chrome
- Safari
- Firefox
- Edge

Private-browsing rules or blocked cookies may require purchase verification on each visit.

---

## Offline Use

The purchased downloadable application file can operate locally after required assets are available.

The protected hosted application requires a successful online Gumroad verification to establish browser access.

The current application references externally hosted Google Fonts and a BNDR LLC image. The application remains functional with fallback fonts when Google Fonts are unavailable, but complete visual parity may depend on those external resources.

---

## Public Repository Limitation

Purchase enforcement protects delivery from the deployed BMDR website.

It cannot make application source confidential when the source already exists in:

- A public GitHub repository
- Public Git history
- Public branches
- Previously distributed files

Actual source confidentiality requires:

- A private repository
- A private deployment source
- Removal of sensitive source from public history
- Server-side functionality that is never shipped to the browser

Minification, obfuscation, hidden buttons, and client-side checks are not equivalent to access enforcement.

---

## Brand

The visible product name is:

```text
BMDR
```

Full title:

```text
BMDR | Mindful Reprocessing
```

Publisher:

```text
BNDR LLC
```

Website:

```text
https://bndrllc.com
```

Purchase page:

```text
https://bndrllc.gumroad.com/l/bemdr
```

The Gumroad URL slug does not change the visible BMDR product brand.

---

## License

BMDR is proprietary software owned by BNDR LLC.

A purchase grants personal-use rights under the BMDR Terms of Use.

No open-source license is granted.

See:

```text
/terms.html
```

---

## Copyright

```text
© 2026 BNDR LLC. All rights reserved.
```
⬇️
