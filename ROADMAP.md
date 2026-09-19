# Standalone v0.1 Roadmap

Slice v0.1 is a deterministic responsive QA CLI for coding agents. Desktop UI, Viewportable integration, Figma, screenshot diffing, AI visual judgment, multi-page crawling, and generic flow-overlap detection remain explicitly out of scope for v0.1.

## Release finish line

v0.1.0 is done when Slice can be installed, configured, run locally or in CI, produce stable actionable findings on real applications, distinguish product findings from scanner/setup failures, and reproduce its release-candidate results deterministically.

## Phase 1 - Per-issue boundaries - Complete

- Stable issue identity across adjacent sampled widths.
- Independent exact transition search per issue.
- Supported issue types:
  - `horizontal-overflow`
  - `fixed-element-collision`
  - `fixed-content-occlusion`
- Regression coverage for overlapping issue ranges where an existing issue must not hide a new one.

Merged as `b4607a2`.

## Phase 2 - Config and suppressions - Complete

- Automatic `slice.config.json` loading.
- Explicit `--config` path.
- CLI-over-config precedence.
- Exact detector-specific suppressions.
- Suppressed findings remain available in `viewports[].suppressedIssues`.
- Suppressed findings do not affect active status, boundary search, or exit code 1.

Merged as `cf63583`.

## Phase 3 - Deterministic diagnosis expansion - Complete for v0.1

- Pixel `min-width` diagnosis.
- Authored fixed pixel `width` diagnosis.
- Unique stylesheet source attribution required for fixed-width claims.
- Ambiguous or inaccessible source attribution does not produce a guessed cause.

Merged as `96f469c`.

Further flex/grid and `white-space: nowrap` diagnosis rules are deferred until they can meet the same attribution standard.

## Phase 4 - GitHub Action - Complete

- Composite action using the same CLI and report schema.
- Job summary.
- `.slice/results.json` artifact upload.
- Exit-code preservation.
- Copy-ready workflow with `cancel-in-progress: true`.
- End-to-end CI smoke using `uses: ./`.

Merged as `6b719cf`.

## Phase 5 - Package and release hygiene - In progress

Completed:

- Repository references moved to `viewportable/slice`.
- Repository/homepage/bugs package metadata.
- Explicit `AGPL-3.0-only` license.
- Full `LICENSE` file.
- `CHANGELOG.md` for v0.1.0.
- npm package identity fixed as `@viewportable/slice`.
- CLI binary remains `slice`.
- Accidental npm publication blocked with `"private": true` until release.
- Openings Golden Acceptance harness prepared around the real historical regression.
- One-command `preflight:rc` release gate.
- Release-layout validation for package identity and composite Action runtime files.
- Tagged release validation that requires immutable Action references.
- Tag-driven GitHub Release workflow with full verification and a package inspection artifact.
- npm publishing remains explicitly out of the RC workflow.

Remaining before the first RC:

- Execute the local Golden Acceptance / `preflight:rc`.
- Bump to `0.1.0-rc.1`, finalize release notes, and pin Action docs to the immutable RC tag.
- Tag only after the release commit is green.

npm scope ownership/permissions are required only before a future npm publication, not for the GitHub RC.

## Phase 6 - Real-project acceptance - Harness ready, execution remaining

Run `npm run golden:openings` against the local current Openings checkout.

Required acceptance:

- Previously filtered scrollable-content cases stay clean.
- The known 768px fixed-content occlusion is detected in the broken state.
- Per-issue boundary search reports its exact transition.
- The fixed state returns clean for the same viewport/config set.
- Two consecutive runs are identical apart from timestamp and duration.

## Deferred until after v0.1

- Electron/Desktop viewport board.
- Viewportable product integration.
- Figma overlay/reference comparison.
- Screenshot or visual-regression diffing.
- AI-based issue detection or diagnosis.
- MCP/agent orchestration beyond consuming the existing CLI/JSON contract.
- Multi-page crawling.
- Generic overlapping-flow-element detection.
