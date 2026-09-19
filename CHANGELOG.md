# Changelog

All notable changes to Slice are documented here.

## 0.1.0 - Unreleased

### Added

- Deterministic responsive scans across configured viewport widths.
- Stable machine-readable `.slice/results.json` reports and exit codes for clean, findings, and scanner/setup failure.
- Horizontal overflow detection with deepest-element evidence and root-cause grouping.
- Exact per-issue breakpoint search for horizontal overflow, fixed-element collisions, and fixed-content occlusions.
- Conservative CSS diagnosis for pixel `min-width` and uniquely attributable authored fixed pixel `width`.
- Fixed-element collision detection.
- Fixed-content occlusion detection using paint-order evidence.
- Application readiness gating with `--ready-selector`.
- `slice.config.json` project configuration with CLI-over-config precedence.
- Deterministic detector-specific suppressions that retain suppressed evidence in JSON.
- Composite GitHub Action with job summary, artifact upload, and the same scanner/report contract as the CLI.
- Demo and Responsively harnesses plus end-to-end CI coverage.

### Changed

- Repository references now point to `viewportable/slice`.
- Package metadata now declares repository, homepage, issue tracker, and AGPL licensing.

### License

- GNU Affero General Public License v3.0 only (`AGPL-3.0-only`).
