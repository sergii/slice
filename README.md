# Slice

Slice is a deterministic responsive QA CLI for coding agents. It loads one page once in Chromium, checks a set of viewport widths, detects horizontal overflow without screenshots or AI, attributes each failure to the deepest offending element, and writes a machine-readable report to `.slice/results.json`.

```bash
npx slice http://localhost:3000
```

```text
  Slice · http://localhost:3000

  320   PASS
  375   PASS
  390   FAIL  nav.main-nav > ul.nav-links overflows right by 18px
  430   PASS
  768   FAIL  .hero-grid overflows right by 24px
  1024  PASS
  1280  PASS
  1440  PASS

  Boundaries
    issue-1  breaks at 712px  (9 probes, range 430-768)

  2 failures in 8 viewports · 3.4s
  .slice/results.json
```

```json
{
  "version": 1,
  "url": "http://localhost:3000",
  "summary": {
    "viewportsChecked": 8,
    "passed": 6,
    "failed": 2,
    "totalIssues": 2,
    "durationMs": 3412
  },
  "viewports": [
    {
      "width": 390,
      "height": 900,
      "status": "fail",
      "issues": [
        {
          "id": "issue-1",
          "type": "horizontal-overflow",
          "severity": "error",
          "selector": "nav.main-nav > ul.nav-links",
          "side": "right",
          "overflowPx": 18
        }
      ]
    }
  ]
}
```

## Five-minute local demo

The first demo is intentionally framework-neutral. Slice consumes a URL, so a static page exercises the same browser/CDP path as Rails, React, or Next.js without adding another framework to debug.

```bash
git clone https://github.com/viewportable/slice.git
cd slice
npm ci
npm run demo
```

The demo scans a small standalone pricing site twice: first with an intentional responsive overflow, then with the CSS fix. JSON reports are kept at:

```text
.slice/demo/broken/results.json
.slice/demo/fixed/results.json
```

To see the bug in a browser:

```bash
npm run demo:serve
```

Open `http://127.0.0.1:4173/broken.html`, resize below roughly 744px, and compare it with `/fixed.html`. From a second terminal you can run the production CLI against the live demo:

```bash
npm run demo:scan
```

## Visual demo with Responsively

Slice and Responsively can inspect the exact same local URL. Responsively provides the visual multi-device view; Slice provides deterministic evidence for the same page: failing widths, CSS selector, overflow pixels, and the exact breakpoint boundary.

Install and launch Responsively App once. On macOS:

```bash
brew install --cask responsively
```

Then run:

```bash
npm run demo:visual
```

The command prefers `http://127.0.0.1:4173`. If that port is already occupied, it automatically selects a free local port, prints the chosen URL, opens `broken.html` in Responsively through its `responsively://` protocol, and scans that exact same URL with Slice. The server remains running until you press Ctrl-C.

The key comparison is:

```text
Responsively                   Slice
visual overflow                horizontal-overflow
narrow device previews    <=>  failing widths
wide preview is clean     <=>  768 / 1024 PASS
transition point           <=>  exact boundary
visible element            <=>  CSS selector + overflowPx
```

Open `http://127.0.0.1:4173/fixed.html` in Responsively to compare the corrected version. Slice writes the broken-page evidence to `.slice/demo-responsively/results.json`.

For the exact boundary experiment, Slice also scans `742`, `743`, and `744` pixels. A ready-to-import Responsively backup lives at:

```text
examples/responsively/slice-boundary-suite.json
```

Import it from Responsively's device/suite manager, then activate **Slice Boundary 742-744**. This gives three side-by-side previews around the same boundary that Slice reports. With the shared 1px overflow tolerance, the golden result is `742 FAIL / 743 PASS / 744 PASS`, and the reported boundary is `742px` - the last bad width when moving from wide to narrow.


This intentionally exposes an important current product limitation too: a human may perceive one overflowing pricing grid while the current deepest-element detector can report several leaf elements that share the same breakpoint. That is useful evidence for the next root-cause grouping slice.

### Grouped root causes

Slice keeps the deepest overflowing elements as raw evidence, but groups repeated manifestations under a shared overflowing grid or flex layout root when that attribution is deterministic. For the built-in pricing demo, the human-visible problem and machine result now converge:

```text
390   FAIL  section.plan-grid overflows right ... · affected elements
430   FAIL  section.plan-grid overflows right ... · affected elements
768   PASS

Root causes
  root-1  section.plan-grid · breaks at 742px
```

The JSON report preserves every leaf issue in `viewports[].issues`, links grouped leaves with `rootCauseId`, and exposes the aggregate in top-level `rootCauses[]`.

### Deterministic CSS diagnosis

For grouped layout roots, Slice can explain a conservative CSS cause without AI. The first rule is a pixel `min-width` constraint that is wider than the available viewport space. When exactly one accessible matching stylesheet declaration sets that computed value, Slice also records its stylesheet and selector.

```text
390   FAIL  section.plan-grid overflows right by 348px | 8 affected elements
      reason: min-width: 720px | 720px wide vs 372px available

Root causes
  root-1  section.plan-grid | breaks at 742px | 8 evidence selectors
          reason: min-width: 720px
          source: .broken .plan-grid @ http://127.0.0.1:4173/styles.css
          likely fix: remove or constrain min-width, or let the layout reflow
```

Source attribution is intentionally conservative: ambiguous or inaccessible stylesheet matches produce no source claim rather than a guess.

### Application readiness

For SPAs or authenticated/local harnesses, require a visible element that proves the intended application state mounted before Slice scans it:

```sh
slice http://127.0.0.1:4173 --ready-selector 'main[data-app-ready]'
```

If the selector does not become visible within `--timeout`, Slice exits with code `2` and does not write a partial report. This prevents a login, error, or loading shell from being mistaken for a clean application scan.

### Fixed-element collision detector

Slice also reports deterministic collisions between independent visible `position: fixed` elements. It ignores full-viewport backdrops, ancestor/descendant fixed pairs, `aria-hidden` subtrees, and overlaps of 1px or less.

```text
390   FAIL  button.target-profile overlaps button.role-shapes | 80x40px
```

Collision issues are stored as `type: "fixed-element-collision"` with both stable selectors, both bounding boxes, overlap width/height/area, and z-index evidence. Exact breakpoint search currently remains specific to horizontal overflow.

### Fixed-content occlusion detector

Slice reports a fixed element when it paints above and meaningfully covers a visible enabled interactive target from another DOM branch. The rule is intentionally conservative: the target must be actionable, the fixed element must accept pointer events, overlap must exceed the 1px tolerance, and at least 20% of the target's visible area must be covered.

```text
390   FAIL  button.target-profile covers button.apply | 63% (100x48px)
```

Occlusion issues are stored as `type: "fixed-content-occlusion"` with the occluder and target selectors, both bounding boxes, overlap area, target coverage percentage, z-index values, and DOMSnapshot paint-order evidence. Fixed-vs-fixed overlaps remain the responsibility of `fixed-element-collision`.

## Local modernization lab

Use Node.js 24 for development. The repository includes a `.node-version` file so version managers can select it automatically.

```bash
git pull
npm ci
npm run lab
```

`npm ci` installs the locked dependencies and Playwright Chromium. The lab then runs the same layers as CI:

1. Oxfmt formatting check.
2. Oxlint static analysis.
3. TypeScript typecheck.
4. Pure unit tests.
5. tsdown production build.
6. npm package validation.
7. Browser integration tests.
8. Real CLI smoke scenarios against local fixtures.

The final smoke phase is intentionally visible. It runs a clean page, a fixed-width overflow page, and the breakpoint fixture that must resolve to exactly 712px.

For the fastest agent feedback without Chromium, run:

```bash
npm run check:fast
```

To run only the visible product smoke after a successful build:

```bash
npm run smoke
```
