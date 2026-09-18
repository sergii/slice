import { Command } from 'commander';
import pc from 'picocolors';
import {
  getDocumentMetrics,
  hasHorizontalDocumentOverflow,
  launchBrowser,
  type DocumentMetrics,
} from './browser.js';
import { captureLayout } from './capture.js';
import { detectHorizontalOverflow } from './detect/overflow.js';
import { writeResults } from './report.js';
import {
  buildStableSelector,
  makePageUniquenessCheck,
} from './selector.js';
import { installStabilization, stabilizeViewport } from './stabilize.js';
import type {
  Issue,
  LayoutNode,
  SliceResults,
  ViewportResult,
} from './types.js';

const DEFAULT_WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const DEFAULT_HEIGHT = 900;
const DEFAULT_WAIT_MS = 300;
const DEFAULT_OUT_DIR = '.slice';

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function renderTable(
  url: string,
  viewports: ViewportResult[],
  outputPath: string,
  durationMs: number,
): void {
  const colors = pc.createColors(Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);

  process.stdout.write(`\n  Slice · ${url}\n\n`);

  for (const viewport of viewports) {
    const width = String(viewport.width).padEnd(6, ' ');

    if (viewport.status === 'pass') {
      process.stdout.write(`  ${width}${colors.green('PASS')}\n`);
      continue;
    }

    const [first, ...rest] = viewport.issues;
    if (!first) {
      process.stdout.write(`  ${width}${colors.red('FAIL')}\n`);
      continue;
    }

    const firstText = `${truncate(first.selector, 60)} overflows ${first.side} by ${first.overflowPx}px`;
    process.stdout.write(`  ${width}${colors.red('FAIL')}  ${firstText}\n`);

    for (const issue of rest) {
      const text = `${truncate(issue.selector, 60)} overflows ${issue.side} by ${issue.overflowPx}px`;
      process.stdout.write(`        ${text}\n`);
    }
  }

  const failures = viewports.filter((viewport) => viewport.status === 'fail').length;
  process.stdout.write(
    `\n  ${failures} failures in ${viewports.length} viewports · ${(durationMs / 1000).toFixed(1)}s\n`,
  );
  process.stdout.write(`  ${outputPath}\n\n`);
}

function issueKey(selector: string, side: 'right' | 'left'): string {
  return `horizontal-overflow|${side}|${selector}`;
}

async function enrichIssues(
  pageEvaluate: (selector: string) => Promise<number>,
  nodes: LayoutNode[],
  viewportWidth: number,
  viewportHeight: number,
  metrics: DocumentMetrics,
  issueIds: Map<string, string>,
): Promise<Issue[]> {
  const detected = detectHorizontalOverflow(nodes, {
    width: viewportWidth,
    height: viewportHeight,
  });
  const byIndex = new Map(nodes.map((node) => [node.index, node]));
  const isUnique = makePageUniquenessCheck(pageEvaluate);
  const issues: Issue[] = [];

  for (const finding of detected) {
    const node = byIndex.get(finding.nodeIndex);
    if (!node) continue;

    const selector = await buildStableSelector(node, nodes, isUnique);
    const key = issueKey(selector, finding.side);
    let id = issueIds.get(key);

    if (!id) {
      id = `issue-${issueIds.size + 1}`;
      issueIds.set(key, id);
    }

    issues.push({
      id,
      type: 'horizontal-overflow',
      severity: 'error',
      selector,
      tagName: finding.tagName,
      side: finding.side,
      overflowPx: finding.overflowPx,
      bbox: finding.bbox,
      viewportWidth,
      evidence: {
        documentScrollWidth: metrics.scrollWidth,
        documentClientWidth: metrics.clientWidth,
        elementRight: node.rect.x + node.rect.width,
        computedStyles: {
          display: node.styles.display ?? '',
          position: node.styles.position ?? '',
          'overflow-x': node.styles['overflow-x'] ?? '',
        },
        nearestScrollableAncestor: null,
      },
    });
  }

  return issues;
}

const program = new Command();

program
  .name('slice')
  .description('Deterministic responsive QA for coding agents')
  .argument('<url>', 'page URL to inspect')
  .action(async (url: string) => {
    const startedAt = Date.now();
    const runtime = await launchBrowser({
      width: DEFAULT_WIDTHS[0] ?? 320,
      height: DEFAULT_HEIGHT,
    });

    const viewports: ViewportResult[] = [];
    const issueIds = new Map<string, string>();

    try {
      await installStabilization(runtime.context);
      await runtime.page.goto(url, { timeout: 30_000 });

      for (const width of DEFAULT_WIDTHS) {
        await stabilizeViewport(runtime.page, width, DEFAULT_HEIGHT, DEFAULT_WAIT_MS);
        const metrics = await getDocumentMetrics(runtime.page);

        if (!await hasHorizontalDocumentOverflow(runtime.page)) {
          viewports.push({
            width,
            height: DEFAULT_HEIGHT,
            status: 'pass',
            issues: [],
          });
          continue;
        }

        const nodes = await captureLayout(runtime.cdp);
        const issues = await enrichIssues(
          (selector) => runtime.page.evaluate(
            (value) => document.querySelectorAll(value).length,
            selector,
          ),
          nodes,
          width,
          DEFAULT_HEIGHT,
          metrics,
          issueIds,
        );

        viewports.push({
          width,
          height: DEFAULT_HEIGHT,
          status: issues.length > 0 ? 'fail' : 'pass',
          issues,
        });
      }

      const durationMs = Date.now() - startedAt;
      const failed = viewports.filter((viewport) => viewport.status === 'fail').length;
      const results: SliceResults = {
        version: 1,
        url,
        timestamp: new Date().toISOString(),
        userAgent: `Chromium/${runtime.browser.version()}`,
        summary: {
          viewportsChecked: viewports.length,
          passed: viewports.length - failed,
          failed,
          totalIssues: viewports.reduce((sum, viewport) => sum + viewport.issues.length, 0),
          durationMs,
        },
        viewports,
        boundaries: [],
      };

      const outputPath = await writeResults(DEFAULT_OUT_DIR, results);
      renderTable(url, viewports, outputPath, durationMs);
    } finally {
      await runtime.browser.close();
    }
  });

await program.parseAsync();
