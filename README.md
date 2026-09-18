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
git clone https://github.com/sergii/slice.git
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
