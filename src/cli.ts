import { Command } from 'commander';
import pc from 'picocolors';
import {
  getDocumentMetrics,
  hasHorizontalDocumentOverflow,
  launchBrowser,
} from './browser.js';
import { captureLayout } from './capture.js';
import { detectHorizontalOverflow } from './detect/overflow.js';
import {
  buildStableSelector,
  makePageUniquenessCheck,
} from './selector.js';
import { installStabilization, stabilizeViewport } from './stabilize.js';
import type { Issue, LayoutNode } from './types.js';

const DEFAULT_WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const DEFAULT_HEIGHT = 900;
const DEFAULT_WAIT_MS = 300;

interface ViewportRun {
  width: number;
  issues: Issue[];
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function renderTable(url: string, runs: ViewportRun[]): void {
  const colors = pc.createColors(Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);

  process.stdout.write(`\n  Slice · ${url}\n\n`);

  for (const run of runs) {
    const width = String(run.width).padEnd(6, ' ');

    if (run.issues.length === 0) {
      process.stdout.write(`  ${width}${colors.green('PASS')}\n`);
      continue;
    }

    const [first, ...rest] = run.issues;
    const firstText = `${truncate(first.selector, 60)} overflows ${first.side} by ${first.overflowPx}px`;
    process.stdout.write(`  ${width}${colors.red('FAIL')}  ${firstText}\n`);

    for (const issue of rest) {
      const text = `${truncate(issue.selector, 60)} overflows ${issue.side} by ${issue.overflowPx}px`;
      process.stdout.write(`        ${text}\n`);
    }
  }

  const failures = runs.filter((run) => run.issues.length > 0).length;
  process.stdout.write(`\n  ${failures} failures in ${runs.length} viewports\n\n`);
}

async function enrichIssues(
  pageEvaluate: (selector: string) => Promise<number>,
  nodes: LayoutNode[],
  viewportWidth: number,
): Promise<Issue[]> {
  const detected = detectHorizontalOverflow(nodes, {
    width: viewportWidth,
    height: DEFAULT_HEIGHT,
  });
  const byIndex = new Map(nodes.map((node) => [node.index, node]));
  const isUnique = makePageUniquenessCheck(pageEvaluate);
  const issues: Issue[] = [];

  for (const finding of detected) {
    const node = byIndex.get(finding.nodeIndex);
    if (!node) continue;

    const selector = await buildStableSelector(node, nodes, isUnique);
    issues.push({
      type: 'horizontal-overflow',
      selector,
      overflowPx: finding.overflowPx,
      side: finding.side,
      bbox: finding.bbox,
      tagName: finding.tagName,
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
    const runtime = await launchBrowser({
      width: DEFAULT_WIDTHS[0] ?? 320,
      height: DEFAULT_HEIGHT,
    });

    const runs: ViewportRun[] = [];

    try {
      await installStabilization(runtime.context);
      await runtime.page.goto(url, { timeout: 30_000 });

      for (const width of DEFAULT_WIDTHS) {
        await stabilizeViewport(runtime.page, width, DEFAULT_HEIGHT, DEFAULT_WAIT_MS);

        if (!await hasHorizontalDocumentOverflow(runtime.page)) {
          runs.push({ width, issues: [] });
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
        );

        // A positive document gate can still be intentional after conservative filtering.
        runs.push({ width, issues });
      }

      renderTable(url, runs);
    } finally {
      await runtime.browser.close();
    }
  });

await program.parseAsync();
