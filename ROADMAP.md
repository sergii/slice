# Standalone v0.1 Roadmap

Slice v0.1 is a deterministic responsive QA CLI for coding agents. This roadmap intentionally excludes desktop UI, Viewportable integration, Figma, screenshot diffing, and AI-based visual judgment.

## Current foundation

- Chromium-based deterministic scan of one URL across configured viewport widths.
- Stable machine-readable report in `.slice/results.json`.
- Exit codes: 0 clean, 1 findings, 2 scanner/setup failure.
- Horizontal overflow detection with deepest-element evidence.
- Overflow root-cause grouping.
- Conservative CSS diagnosis and source attribution for pixel `min-width` constraints.
- Fixed-element collision detection.
- Fixed-content occlusion detection using paint-order evidence.
- Application readiness gating with `--ready-selector`.
- Exact boundary search for simple horizontal-overflow transitions.
- Unit, integration, smoke, demo, and Responsively demo harnesses.
- Real-project validation on Openings, including removal of scrollable-content false positives and discovery of a real 768px fixed-content occlusion.

## Finish line for v0.1.0

v0.1.0 is done when Slice can be installed, configured, run locally or in CI, produce stable actionable findings on real applications, and distinguish product findings from scanner/setup failure without manual interpretation.

## Phase 1 - Correct per-issue boundaries

Generalize boundary search from page-level horizontal overflow to concrete stable issues.

Acceptance criteria:

- Compare issue identity between adjacent sampled widths.
- Find the exact transition for each issue independently.
- Support:
  - `horizontal-overflow`
  - `fixed-element-collision`
  - `fixed-content-occlusion`
- Do not lose a new issue when another issue already exists at both sample widths.
- Preserve deterministic issue IDs and JSON output.
- Add integration fixtures with overlapping issue ranges.

## Phase 2 - Real-project noise control

Add explicit configuration and suppression so real applications can adopt Slice without weakening detectors.

Acceptance criteria:

- Project config file for widths, height, timeout, wait, ready selector, and output directory.
- Deterministic ignore/suppression rules by issue type and selectors.
- Suppressions remain visible in machine-readable output or summary.
- No hidden heuristic allowlists.
- CLI flags override config values.

## Phase 3 - Diagnosis coverage

Extend conservative CSS diagnosis only where attribution is deterministic.

Priority rules:

1. fixed pixel `width` wider than available space
2. `min-width`
3. non-wrapping flex/grid constraints where the computed cause is unambiguous
4. `white-space: nowrap` when it directly explains the measured overflow

Do not emit a source/cause claim when multiple declarations or inaccessible stylesheets make attribution ambiguous.

## Phase 4 - CI surface

Ship first-class CI usage without coupling Slice to another product.

Acceptance criteria:

- GitHub Action or documented action wrapper.
- Fail-fast execution.
- Cancel superseded runs.
- Upload `.slice/results.json` as an artifact.
- Clear job summary with failing widths, issue type, selector, and exact boundary.
- Same scanner engine and report schema as local CLI.

## Phase 5 - Package and release hygiene

Before publishing v0.1.0:

- Remove stale repository references after the move to `viewportable/slice`.
- Add repository/homepage/bugs metadata.
- Choose and add an explicit license.
- Decide the publishable npm package name/scope.
- Add changelog/release notes.
- Validate packed contents.
- Tag `v0.1.0` only after CI is green.

## Phase 6 - Real-project acceptance

Run the release candidate against Openings again.

Required acceptance:

- Previously filtered scrollable-content cases stay clean.
- The known 768px occlusion is detected in the broken state.
- Per-issue boundary search reports its exact transition.
- The fixed state returns clean for the same viewport/config set.
- Two consecutive runs are identical apart from timestamp and duration.

## Deferred until after v0.1

These are intentionally not part of the standalone v0.1 finish line:

- Electron/Desktop viewport board
- Viewportable product integration
- Figma overlay/reference comparison
- screenshot or visual-regression diffing
- AI-based issue detection or diagnosis
- MCP/agent orchestration beyond consuming the existing CLI/JSON contract
- multi-page crawling
- generic overlapping-flow-element detection

## Execution order

1. Per-issue boundaries.
2. Config + suppressions.
3. Diagnosis expansion.
4. GitHub Action.
5. Release/package hygiene.
6. Openings release-candidate acceptance.
7. Tag v0.1.0.
