import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, 'fixtures');
const cliPath = path.resolve(here, '../dist/cli.mjs');

let server: Server;
let baseUrl: string;
let tempDirs: string[] = [];

async function startFixtureServer(): Promise<{ server: Server; baseUrl: string }> {
  const instance = createServer(async (request, response) => {
    const fixture = path.basename(request.url ?? '/clean.html');
    const filePath = path.join(fixturesDir, fixture);

    try {
      const html = await readFile(filePath);
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  await new Promise<void>((resolve) => instance.listen(0, '127.0.0.1', resolve));
  const address = instance.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server did not bind');

  return {
    server: instance,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function makeOutDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'slice-test-'));
  tempDirs.push(dir);
  return dir;
}

async function runCli(
  fixture: string,
  args: string[],
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, `${baseUrl}/${fixture}`, ...args], {
      env: { ...process.env, NO_COLOR: '1' },
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

beforeEach(async () => {
  const started = await startFixtureServer();
  server = started.server;
  baseUrl = started.baseUrl;
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs = [];
});

describe('slice CLI', () => {
  it('returns exit 0 and empty issues for a clean page', async () => {
    const out = await makeOutDir();
    const result = await runCli('clean.html', [
      '--widths',
      '320,390',
      '--wait',
      '0',
      '--no-boundary',
      '--out',
      out,
    ]);

    expect(result.code).toBe(0);
    const report = JSON.parse(await readFile(path.join(out, 'results.json'), 'utf8'));
    expect(
      report.viewports.every((viewport: { issues: unknown[] }) => viewport.issues.length === 0),
    ).toBe(true);
  });

  it('attributes nested overflow to exactly one deepest element', async () => {
    const out = await makeOutDir();
    const result = await runCli('nested.html', [
      '--widths',
      '390',
      '--wait',
      '0',
      '--no-boundary',
      '--out',
      out,
    ]);

    expect(result.code).toBe(1);
    const report = JSON.parse(await readFile(path.join(out, 'results.json'), 'utf8'));
    expect(report.viewports[0].issues).toHaveLength(1);
    expect(report.viewports[0].issues[0].selector).toContain('culprit');
  });

  it('finds the exact 712px boundary', async () => {
    const out = await makeOutDir();
    const result = await runCli('boundary.html', [
      '--widths',
      '700,720',
      '--wait',
      '0',
      '--out',
      out,
    ]);

    expect(result.code).toBe(1);
    const report = JSON.parse(await readFile(path.join(out, 'results.json'), 'utf8'));
    expect(report.boundaries[0].boundary).toBe(712);
  });

  it('groups sibling manifestations under one layout root cause', async () => {
    const out = await makeOutDir();
    const result = await runCli('grouped-grid.html', [
      '--widths',
      '390',
      '--wait',
      '0',
      '--no-boundary',
      '--out',
      out,
    ]);

    expect(result.code).toBe(1);
    const report = JSON.parse(await readFile(path.join(out, 'results.json'), 'utf8'));

    expect(report.rootCauses).toHaveLength(1);
    expect(report.rootCauses[0].selector).toBe('section.grid');
    expect(report.rootCauses[0].issueIds.length).toBeGreaterThanOrEqual(2);
    expect(report.summary.rootCauseGroups).toBe(1);
    expect(report.rootCauses[0].diagnosis).toMatchObject({
      kind: 'min-width-constraint',
      property: 'min-width',
      value: '700px',
      source: {
        stylesheet: null,
        selector: 'section.grid',
        property: 'min-width',
        value: '700px',
      },
    });
    expect(report.rootCauses[0].observations[0]).toMatchObject({
      computedWidthPx: 700,
      availableWidthPx: 390,
    });
    expect(
      report.viewports[0].issues.every(
        (issue: { rootCauseId?: string }) => issue.rootCauseId === report.rootCauses[0].id,
      ),
    ).toBe(true);
    expect(result.stdout).toContain('section.grid');
    expect(result.stdout).toContain('affected elements');
    expect(result.stdout).toContain('reason: min-width: 700px');
    expect(result.stdout).toContain('source: section.grid @ <inline stylesheet>');
    expect(result.stdout).not.toContain('Â');
  });

  it('is deterministic apart from timestamp and durationMs', async () => {
    const firstOut = await makeOutDir();
    const secondOut = await makeOutDir();

    await runCli('fixed-width.html', [
      '--widths',
      '390',
      '--wait',
      '0',
      '--no-boundary',
      '--out',
      firstOut,
    ]);
    await runCli('fixed-width.html', [
      '--widths',
      '390',
      '--wait',
      '0',
      '--no-boundary',
      '--out',
      secondOut,
    ]);

    const first = JSON.parse(await readFile(path.join(firstOut, 'results.json'), 'utf8'));
    const second = JSON.parse(await readFile(path.join(secondOut, 'results.json'), 'utf8'));
    first.timestamp = '<timestamp>';
    second.timestamp = '<timestamp>';
    first.summary.durationMs = 0;
    second.summary.durationMs = 0;

    expect(first).toEqual(second);
  });

  it('does not write a partial report when navigation fails', async () => {
    const out = await makeOutDir();
    const result = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
      const child = spawn(process.execPath, [
        cliPath,
        'http://127.0.0.1:1',
        '--timeout',
        '250',
        '--out',
        out,
      ]);

      let stderr = '';
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('close', (code) => resolve({ code, stderr }));
    });

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('Slice:');
    await expect(readFile(path.join(out, 'results.json'), 'utf8')).rejects.toThrow('ENOENT');
  });
});
