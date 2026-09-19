# Design Backlog

This document preserves valuable future directions that are **not current roadmap commitments**.

Moving an item here means "remember and revisit with evidence", not "build next".

## Platform expansion

### React Native adapter spike

- Status: candidate
- Trigger: structural web model and at least one cross-platform-safe geometry detector are stable.
- Goal: normalize a real simulator-rendered React Native screen into the internal Surface IR and run an existing detector without rewriting its core algorithm.
- Success criterion: one real RN layout regression is found using shared analysis logic.
- Avoid: broad RN SDK/product support before this proof.

### Capacitor native verification

- Status: deferred
- Start with the ordinary browser/WebView path.
- Add native/simulator capture only for failures that cannot be reproduced through the web build, such as safe-area, keyboard, or WebView-specific behavior.

### Native iOS / Android adapters

- Status: research-needed
- Prefer XCUITest/accessibility and Android accessibility/UI automation primitives.
- Do not build proprietary device-control infrastructure.

## Analysis capabilities

### Element protrusion

- Status: candidate
- Detect a child extending meaningfully beyond a parent boundary.
- Strong candidate for the first new structural detector after the ReDeCheck baseline.

### Small-range layout anomaly

- Status: research-needed
- Detect short-lived relationship states between stable neighboring ranges.
- Validate thresholds on benchmark data rather than copying ReDeCheck's historical threshold.

### Wrapping transition detector

- Status: research-needed
- Track row/column membership changes across viewport intervals.
- Must distinguish legitimate responsive reflow from anomalous single-element wrapping.

### Structural base-vs-head comparison

- Status: candidate
- Compare two internal surface/relationship representations and report meaningful layout changes without requiring pixel baselines.

### Pixel/screenshot verification

- Status: deferred
- Candidate libraries: pixelmatch, ODiff.
- Only add after structural benchmark data identifies false-positive classes where visual verification materially improves precision.
- Must remain demand-driven and add zero screenshot cost when disabled.

### Accessibility adapter

- Status: candidate
- Reuse axe-core and platform accessibility semantics where possible.
- Viewportable should add visual-layout checks around accessibility, not attempt to become a replacement accessibility standard.

## Interchange and integration

### SARIF reporter

- Status: candidate
- Evaluate mapping canonical Viewportable findings to SARIF rule IDs, locations, fingerprints, and custom properties.
- Keep Viewportable JSON as the richer source format if SARIF cannot express all render-state evidence.

### MCP server

- Status: candidate
- Expose high-level tools such as `scan`, `compare`, `explain`, and `reproduce`.
- Use MCP input/output schemas rather than inventing a Viewportable-specific agent transport.

### Public API

- Status: deferred
- Stabilize semantic `ScanRequest` and `ScanResult` contracts before offering a network API.
- Internal Surface IR is explicitly not the public API.

### GitHub App

- Status: deferred
- The App should add orchestration, shared policy, managed configuration, or interaction that a plain GitHub Action cannot provide.
- User runners continue to provide compute.

## Performance

### Spatial index

- Status: research-needed
- Benchmark RBush or another spatial index when generic collision/proximity analysis makes pairwise geometry measurably expensive.
- Do not add it merely because it is theoretically better than O(n^2).

### Capability execution planner

- Status: candidate
- Union capability requirements across enabled analyzers.
- Capture each expensive evidence class once per render.
- Screenshot/ARIA/text-range capture remains lazy.

## Product surface

### Locale and pseudo-localization matrix

- Status: candidate
- Support browser locale, query params, cookies, headers, paths, storage, and authenticated state.
- Add pseudo-expansion and pseudo-RTL after deterministic layout findings are stable.

### Multi-page / changed-scope scanning

- Status: candidate
- Exact URLs, route lists, sitemap, constrained crawl, and changed-route impact mapping.
- Efficiency is part of product value, not only CI optimization.
