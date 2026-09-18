#!/usr/bin/env node
import { Command, CommanderError } from 'commander';
import pc from 'picocolors';
import { getDocumentMetrics, launchBrowser, type DocumentMetrics } from './browser.js';
import { findBoundary } from './boundary.js';
import { captureLayout } from './capture.js';
import { detectHorizontalOverflow } from './detect/overflow.js';
import { writeResults } from './report.js';
import { buildStableSelector, makePageUniquenessCheck } from './selector.js';
import { installStabilization, stabilizeViewport } from './stabilize.js';
import type { BoundaryResult, Issue, LayoutNode, SliceResults, ViewportResult } from './types.js';

const DEFAULT_WIDTHS = [320, 375, 390, 430, 768, 1024, 1280, 1440];
const DEFAULT_HEIGHT = 900;
const DEFAULT_WAIT_MS = 300;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_OUT_DIR = '.slice';

interface CliOptions {
  widths: string;
  height: string;
  out: string;
  json: boolean;
  boundary: boolean;
  timeout: string;
  wait: string;
}

interface BoundaryDisplay {
  result: BoundaryResult;
  rangeStart: number;
  rangeEnd: number;
}

class SliceCliError extends Error {}

function parsePositiveInteger(value: string, name: string, allowZero = false): number {
  const parsed = Number(value);
  const valid = Number.isInteger(parsed) && (allowZero ? parsed >= 0 : parsed > 0);

  if (!valid) {
    throw new SliceCliError(
      `${name} must be ${allowZero ? 'a non-negative' : 'a positive'} integer`,
    );
  }

  return parsed;
}

function parseWidths(value: string): number[] {
  const widths = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parsePositiveInteger(part, '--widths'));

  if (widths.length === 0) {
    throw new SliceCliError('--widths must contain at least one width');
  }

  return [...new Set(widths)];
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function renderTable(
  url: string,
  viewports: ViewportResult[],
  boundaries: BoundaryDisplay[],
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

  if (boundaries.length > 0) {
    process.stdout.write('\n  Boundaries\n');

    for (const boundary of boundaries) {
      const { result } = boundary;
      const low = Math.min(boundary.rangeStart, boundary.rangeEnd);
      const high = Math.max(boundary.rangeStart, boundary.rangeEnd);
      process.stdout.write(
        `    ${result.issueId}  breaks at ${result.boundary}px  (${result.probesUsed} probes, range ${low}-${high})\n`,
      );
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

async function captureIssuesAtWidth(
  width: number,
  height: number,
  waitMs: number,
  runtime: Awaited<ReturnType<typeof launchBrowser>>,
  issueIds: Map<string, string>,
): Promise<Issue[]> {
  await stabilizeViewport(runtime.page, width, height, waitMs);
  const metrics = await getDocumentMetrics(runtime.page);
  if (metrics.scrollWidth <= metrics.clientWidth) return [];

  const nodes = await captureLayout(runtime.cdp);
  return enrichIssues(
    (selector) =>
      runtime.page.evaluate((value) => document.querySelectorAll(value).length, selector),
    nodes,
    width,
    height,
    metrics,
    issueIds,
  );
}

async function runSlice(url: string, options: CliOptions): Promise<number> {
  const widths = parseWidths(options.widths);
  const height = parsePositiveInteger(options.height, '--height');
  const timeout = parsePositiveInteger(options.timeout, '--timeout');
  const waitMs = parsePositiveInteger(options.wait, '--wait', true);
  const startedAt = Date.now();

  const runtime = await launchBrowser({
    width: widths[0] ?? 320,
    height,
  });

  const viewports: ViewportResult[] = [];
  const issueIds = new Map<string, string>();

  try {
    await installStabilization(runtime.context);
    await runtime.page.goto(url, { timeout });

    for (const width of widths) {
      const issues = await captureIssuesAtWidth(width, height, waitMs, runtime, issueIds);

      viewports.push({
        width,
        height,
        status: issues.length > 0 ? 'fail' : 'pass',
        issues,
      });
    }

    const boundaries: BoundaryResult[] = [];
    const boundaryDisplays: BoundaryDisplay[] = [];

    if (options.boundary) {
      for (let index = 0; index < viewports.length - 1; index += 1) {
        const current = viewports[index];
        const next = viewports[index + 1];
        if (!current || !next || current.status === next.status) continue;

        const passWidth = current.status === 'pass' ? current.width : next.width;
        const failWidth = current.status === 'fail' ? current.width : next.width;

        const search = await findBoundary(
          async (width) => {
            await stabilizeViewport(runtime.page, width, height, waitMs);
            const metrics = await getDocumentMetrics(runtime.page);
            return metrics.scrollWidth > metrics.clientWidth;
          },
          passWidth,
          failWidth,
        );

        const issuesAtBoundary = await captureIssuesAtWidth(
          search.firstBadWidth,
          height,
          waitMs,
          runtime,
          issueIds,
        );

        const fallbackIssues = current.status === 'fail' ? current.issues : next.issues;
        const issueIdsAtBoundary = [
          ...new Set(
            (issuesAtBoundary.length > 0 ? issuesAtBoundary : fallbackIssues).map(
              (issue) => issue.id,
            ),
          ),
        ];

        for (const issueId of issueIdsAtBoundary) {
          const result: BoundaryResult = {
            issueId,
            boundary: search.boundary,
            lastGoodWidth: search.lastGoodWidth,
            firstBadWidth: search.firstBadWidth,
            probesUsed: search.probesUsed,
          };

          boundaries.push(result);
          boundaryDisplays.push({
            result,
            rangeStart: current.width,
            rangeEnd: next.width,
          });
        }
      }
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
      boundaries,
    };

    const outputPath = await writeResults(options.out, results);

    if (options.json) {
      process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
    } else {
      renderTable(url, viewports, boundaryDisplays, outputPath, durationMs);
    }

    return failed > 0 ? 1 : 0;
  } finally {
    await runtime.browser.close();
  }
}

const program = new Command();

program
  .name('slice')
  .description('Deterministic responsive QA for coding agents')
  .argument('<url>', 'page URL to inspect')
  .option('--widths <list>', 'viewport widths separated by commas', DEFAULT_WIDTHS.join(','))
  .option('--height <n>', 'viewport height', String(DEFAULT_HEIGHT))
  .option('--out <dir>', 'artifact output directory', DEFAULT_OUT_DIR)
  .option('--json', 'print JSON to stdout instead of the table', false)
  .option('--no-boundary', 'skip binary boundary search')
  .option('--timeout <ms>', 'page load timeout', String(DEFAULT_TIMEOUT_MS))
  .option('--wait <ms>', 'delay after resize', String(DEFAULT_WAIT_MS))
  .exitOverride()
  .action(async (url: string, options: CliOptions) => {
    process.exitCode = await runSlice(url, options);
  });

try {
  await program.parseAsync();
} catch (error) {
  if (error instanceof CommanderError && error.exitCode === 0) {
    process.exitCode = 0;
  } else {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Slice: ${message}\n`);
    process.exitCode = 2;
  }
}
