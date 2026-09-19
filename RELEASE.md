# v0.1.0 Release Checklist

## Product

- [x] Per-issue responsive boundaries.
- [x] Horizontal overflow detector.
- [x] Fixed-element collision detector.
- [x] Fixed-content occlusion detector.
- [x] Conservative root-cause diagnosis.
- [x] Project config.
- [x] Deterministic suppressions.
- [x] Stable machine-readable report.
- [x] Exit codes 0 / 1 / 2.
- [x] GitHub Action surface.
- [x] Job summary and report artifact.

## Package

- [x] Repository metadata.
- [x] Homepage metadata.
- [x] Issue tracker metadata.
- [x] AGPL-3.0-only license metadata.
- [x] Full LICENSE.
- [x] Changelog.
- [x] Final npm package identity: `@viewportable/slice`.
- [x] CLI executable identity remains `slice`.
- [x] Accidental publication blocked with `"private": true`.
- [ ] Confirm npm `@viewportable` scope permissions.
- [ ] Remove `"private": true` only for an explicitly approved publish.
- [ ] Final npm pack validation after publication safety is removed.

## Acceptance

- [x] Golden harness prepared around historical broken ref `27bc8c0d...`.
- [ ] Openings broken-state golden run.
- [ ] Exact 768px occlusion transition confirmed on Openings.
- [ ] Openings fixed-state clean run.
- [ ] Consecutive-run determinism confirmed.

## Release

- [ ] CI green on release commit.
- [ ] Changelog date finalized.
- [ ] GitHub release notes prepared.
- [ ] Tag `v0.1.0`.
