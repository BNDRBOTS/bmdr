# BMDR

A browser-based mindful reprocessing interface combining bilateral visual movement, optional stereo audio movement, adjustable pacing, and a mobile-first session workspace.

BMDR is implemented as a self-contained static web application. The complete application currently lives in one `index.html` file and runs entirely in the browser without a backend, build system, database, account system, or package installation.

> **Implementation note:** The page title and primary interface use **BMDR**. The footer and current Gumroad product slug use **BEMDR**.

---

## Overview

BMDR presents a focused visual and audio session environment built around a moving circular visual anchor.

The application includes:

* A landing screen with BNDR LLC branding
* A Gumroad purchase link
* Direct entry into the personal-practice workspace
* A full-screen animated visual anchor
* Linear and figure-eight-style movement patterns
* Adjustable visual pacing
* Adjustable visual-anchor size
* Optional synthesized stereo audio
* Linked or independently adjustable visual and audio rhythms
* Four visual color options
* Play, pause, audio, exit, and settings controls
* A mobile-oriented bottom-sheet settings interface

All animation, interaction, sound generation, and state management are handled by an inline JavaScript `Engine` object.

---

## Current Repository Structure

```text
bmdr/
├── index.html
└── README.md
```

### `index.html`

Contains the entire application:

* Document structure
* Landing interface
* Workspace interface
* Settings interface
* CSS and visual styling
* Canvas rendering
* Application state
* Event handling
* Web Audio synthesis
* Gumroad integration link

### `README.md`

Project documentation.

---

## Technology

BMDR uses browser-native functionality and externally hosted frontend dependencies.

### Core browser APIs

* HTML5
* CSS
* JavaScript
* Canvas 2D
* Web Audio API
* `requestAnimationFrame`
* Device-pixel-ratio-aware rendering

### External dependencies

Loaded directly from CDNs:

* [Tailwind CSS](https://cdn.tailwindcss.com)
* [Lucide](https://unpkg.com/lucide@latest)
* [Gumroad JavaScript](https://js.gumroad.com/2.0/js/gumroad.js)
* Google Fonts

  * Syncopate
  * Inter

The BNDR LLC logo is also loaded from an externally hosted Railway asset URL.

There is no `package.json`, dependency installation step, bundler, framework, compiled output, or lockfile.

---

## Application Flow

### 1. Landing screen

The initial screen displays:

* BMDR branding
* A BNDR LLC logo linking to `http://bndrllc.com`
* “Mindful Integration” messaging
* An **Unlock Full Practice** Gumroad button
* A **Begin Personal Practice** button

The Gumroad button currently links to:

```text
https://bndrllc.gumroad.com/l/bemdr
```

The **Begin Personal Practice** button directly opens the workspace.

### Current commerce behavior

The repository does not currently contain:

* Gumroad license verification
* Purchase-state verification
* User authentication
* Account creation
* Session-based entitlement checks
* Server-side payment validation
* Protected application routes
* A locked premium feature layer

The Gumroad control is a purchase link. Access to the workspace is not technically conditioned on a completed purchase.

---

## Session Workspace

Opening the workspace automatically starts the visual movement.

The workspace contains:

* A full-screen Canvas rendering layer
* A central play/pause control
* A session-status indicator
* An audio enable/disable control
* A workspace exit control
* A session-adjustments button
* A full-screen tap target for play and pause

### Session states

The status indicator uses two visible states:

* **Flowing** — movement is active
* **Stillness** — movement is paused

When active, the central play/pause control fades to reduce visual obstruction. Tapping the session area restores control by toggling the session state.

Leaving the workspace pauses the animation and returns to the landing screen.

---

## Visual Rendering

The visual anchor is drawn through an HTML Canvas element.

### Background

The application uses a fixed diagonal split background:

* Light gray on the left
* Black on the right

### Visual anchor

The moving anchor is a circular form with:

* A configurable radius
* A configurable glow color
* A white inner circle
* Different rendering behavior over each background half

When the anchor is on the light half:

* Its main fill is black
* Its selected color is used as a border and glow

When the anchor is on the dark half:

* Its main fill uses the selected color
* The selected color also supplies the glow

### High-density display handling

The Canvas dimensions are multiplied by `window.devicePixelRatio` and then scaled back into CSS-space coordinates to improve rendering on high-density screens.

The Canvas is recalculated when the browser viewport changes size.

---

## Movement Patterns

BMDR currently provides two movement modes.

### Gentle Sway

Internal value:

```text
linear
```

The anchor moves horizontally from side to side across the viewport.

Its horizontal position is calculated from a sine wave.

### Infinite Flow

Internal value:

```text
lissajous
```

The anchor combines:

* Horizontal sine movement
* Vertical sine movement at twice the horizontal phase rate

This creates a continuous figure-eight-style path.

---

## Session Adjustments

The settings interface opens as a mobile-oriented bottom sheet using dynamic viewport height.

### Visual Pace

Default:

```text
1.2
```

Range:

```text
0.2–3.0
```

Increment:

```text
0.1
```

This value controls progression through the visual movement calculation.

### Audio Pace

Default:

```text
1.2
```

Range:

```text
0.2–3.0
```

Increment:

```text
0.1
```

The audio-pace control becomes visually active when visual and audio rhythms are unlinked.

Changing the audio-pace slider while rhythms are linked automatically attempts to disable synchronization before applying the independent value.

### Link Rhythms

Enabled by default.

When enabled:

* Audio movement follows the visual anchor’s horizontal position
* Audio pace is set to the visual pace
* Audio phase is aligned with visual phase
* The independent audio control is visually reduced

When disabled:

* Audio pacing advances independently
* The audio-pace slider becomes visually active
* Stereo movement follows its own sine calculation

### Visual Anchor Size

Default:

```text
60
```

Range:

```text
20–150
```

Increment:

```text
5
```

This value is used as the rendered anchor radius.

### Color palette

Available values:

```text
#00ffcc
#ff0055
#7000ff
#ffffff
```

The selected color affects:

* Anchor fill or border
* Anchor glow
* Active status text
* Active audio-control glow

The default color is:

```text
#00ffcc
```

---

## Audio System

Audio is disabled by default and must be enabled through the workspace audio control.

BMDR generates audio locally through the Web Audio API. It does not load an audio recording or stream audio from a server.

### Audio graph

The current audio system creates:

* A triangle-wave sub oscillator
* A sine-wave harmonic oscillator
* A harmonic gain stage
* A core mix gain
* Separate left and right gain nodes
* A two-channel merger
* A dynamics compressor
* A master output gain

### Frequencies

Internal base frequency:

```text
87 Hz
```

Generated oscillator frequencies:

```text
Triangle oscillator: 43.5 Hz
Sine oscillator: 174 Hz
```

### Stereo movement

The source audio is routed through independent left and right gain nodes.

The gain balance moves between channels according to either:

* The current horizontal visual-anchor position, when synchronization is enabled
* An independent audio sine value, when synchronization is disabled

At the movement extremes, the calculation can place the signal fully into one channel and remove it from the other.

### Output behavior

When enabled during an active session:

* The audio context is created if necessary
* The context is resumed if suspended
* Master volume ramps upward over approximately 1.5 seconds

When the session is paused:

* Master volume ramps downward over approximately 0.3 seconds

When audio is disabled:

* Master volume ramps downward over approximately 0.1 seconds

### Dynamics processing

The compressor is configured with:

```text
Threshold: -24 dB
Knee: 10
Ratio: 12:1
Attack: 0.003 seconds
Release: 0.25 seconds
```

If Web Audio initialization fails, the application disables audio and restores the muted audio-control state.

---

## State Management

Application state exists only in browser memory.

The primary state groups are:

### System state

```javascript
{
  active: false,
  sheetOpen: false,
  audioEnabled: false,
  syncRates: true,
  mode: "idle"
}
```

### Session parameters

```javascript
{
  hz: 1.2,
  audioHz: 1.2,
  mass: 60,
  path: "linear",
  color: "#00ffcc",
  time: 0,
  audioTime: 0
}
```

### Graphics state

Tracks:

* Canvas
* Rendering context
* Viewport dimensions
* Animation-frame request
* Normalized horizontal position

### Audio state

Tracks:

* Audio context
* Master gain
* Compressor
* Channel merger
* Left and right gain nodes
* Base frequency
* Initialization status

Settings are not written to:

* `localStorage`
* `sessionStorage`
* Cookies
* A database
* A remote API

Reloading the page resets the application to its source defaults.

---

## Running Locally

No installation or build is required.

### Option 1: Open the file directly

Open `index.html` in a modern browser.

External network access is still required for the CDN scripts, fonts, Gumroad integration, and hosted logo.

### Option 2: Run a local static server

From the repository directory:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

### Clone and run

```bash
git clone https://github.com/BNDRBOTS/bmdr.git
cd bmdr
python3 -m http.server 8080
```

---

## Deployment

BMDR can be deployed as a static site.

### Required deployment settings

```text
Build command: none
Publish directory: repository root
Entry file: index.html
```

Compatible static-hosting approaches include:

* GitHub Pages
* Netlify
* Vercel
* Cloudflare Pages
* Railway static hosting
* Traditional web hosting
* Any server capable of serving static HTML

No provider-specific deployment configuration is currently included in the repository.

---

## Browser Requirements

A compatible browser should support:

* Canvas 2D
* Web Audio API
* CSS backdrop filters
* CSS dynamic viewport units
* JavaScript modules are not required
* `requestAnimationFrame`
* Pointer or touch interaction

Because the application loads dependencies from external CDNs, offline execution is not currently supported.

Browser autoplay restrictions may require direct user interaction before synthesized audio can begin.

---

## Customization

All configuration is contained in `index.html`.

### Gumroad product

Replace the Gumroad URL on the `gumroad-button` anchor:

```html
<a
  class="gumroad-button"
  href="https://bndrllc.gumroad.com/l/bemdr"
  data-gumroad-single-item="true"
>
```

Changing this URL does not add purchase verification or application locking.

### BNDR LLC link

Update the header link:

```html
<a href="http://bndrllc.com">
```

### Logo asset

Replace the externally hosted image URL in the header `<img>` element.

### Landing content

Edit:

* BMDR heading
* “Mindful Integration” heading
* Supporting description
* Purchase-button label
* Personal-practice label
* Footer text

### Default session values

Edit `Engine.params`:

```javascript
params: {
  hz: 1.2,
  audioHz: 1.2,
  mass: 60,
  path: "linear",
  color: "#00ffcc",
  time: 0,
  audioTime: 0
}
```

Matching slider defaults should also be updated in the HTML controls.

### Audio frequency

Edit:

```javascript
baseFreq: 87
```

The current oscillators derive their frequencies from this value.

### Colors

Update:

* Color-control button values
* The `--accent-glow` CSS variable
* The default `Engine.params.color`
* Any corresponding hardcoded Tailwind classes

---

## Network and Privacy Behavior

The application does not currently implement:

* User accounts
* User-profile storage
* Session recording
* Uploaded data
* Form submission
* Analytics
* Advertising trackers
* Custom API requests
* Backend communication
* Database writes

The page does make normal browser requests to third-party services for:

* Tailwind CSS
* Lucide
* Google Fonts
* Gumroad JavaScript
* The BNDR LLC logo asset

Selecting the Gumroad button navigates into Gumroad’s purchase flow.

Audio synthesis and animation occur locally in the browser.

---

## Current Scope and Limitations

The current source does not include:

* A backend
* Authentication
* Authorization
* Gumroad entitlement verification
* License-key validation
* Payment webhooks
* Protected premium features
* User accounts
* Saved presets
* Session history
* Timers
* Guided instructions
* Clinician controls
* Medical records
* Progress tracking
* Analytics
* Offline support
* A service worker
* PWA metadata
* Automated tests
* Continuous integration
* Linting configuration
* Build validation
* Error reporting
* Deployment configuration
* An open-source license

The application is a static browser interface rather than a medical-device platform, clinical record system, or verified treatment-delivery system. The current source also does not display a medical disclaimer or emergency-use notice.

---

## Naming Consistency

The current source contains multiple related names:

* Browser title: `BMDR | Mindful Reprocessing`
* Main header: `BMDR`
* Footer: `BEMDR`
* Gumroad slug: `bemdr`
* Earlier repository history used `B-EMDR`

This README uses **BMDR** as the primary project name because that is the name displayed in the current page title and main interface.

---

## License

No `LICENSE` file is currently included.

The interface footer contains:

```text
© 2026 BNDR LLC // BEMDR
```

Absent an explicit license, the repository does not grant open-source reuse, modification, or redistribution rights.

---

## Ownership

**BNDR LLC**

Website:

```text
http://bndrllc.com
```
