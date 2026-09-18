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
