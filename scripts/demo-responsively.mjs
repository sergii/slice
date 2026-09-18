import { spawn } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDemoServer, startDemoServer } from './demo-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cliPath = path.join(root, 'dist', 'cli.mjs');
const outDir = path.join(root, '.slice', 'demo-responsively');
const widths = '320,390,430,768,1024';
const shouldOpenResponsively = !process.argv.includes('--no-open');
const shouldExitAfterScan = process.argv.includes('--once');

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, options);
    child.once('error', () => resolve(127));
    child.once('close', (code) => resolve(code ?? 1));
  });
}

async function openResponsively(url) {
  const deepLink = 'responsively://' + url;
  let command;
  let args;

  if (process.platform === 'darwin') {
    command = 'open';
    args = [deepLink];
  } else if (process.platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', deepLink];
  } else {
    command = 'xdg-open';
    args = [deepLink];
  }

  const code = await run(command, args, { stdio: 'ignore' });

  if (code !== 0) {
    process.stdout.write(
      '\nCould not open the Responsively protocol automatically.\n' +
        'Open this URL manually in Responsively:\n' +
        '  ' +
        url +
        '\n',
    );
  }
}

async function runSlice(url) {
  return run(process.execPath, [cliPath, url, '--widths', widths, '--wait', '0', '--out', outDir], {
    cwd: root,
    env: process.env,
    stdio: 'inherit',
  });
}

function unique(values) {
  return [...new Set(values)];
}

await rm(outDir, { recursive: true, force: true });

const { server, baseUrl } = await startDemoServer(4173);
const brokenUrl = baseUrl + '/broken.html';
const fixedUrl = baseUrl + '/fixed.html';

try {
  process.stdout.write(
    '\n========================================\n' +
      ' Slice + Responsively visual demo\n' +
      '========================================\n\n' +
      'Both tools will inspect the same page:\n' +
      '  ' +
      brokenUrl +
      '\n\n' +
      'Responsively = visual evidence across device previews\n' +
      'Slice         = deterministic selector, overflow px and exact boundary\n',
  );

  if (shouldOpenResponsively) {
    process.stdout.write('\nOpening the broken page in Responsively...\n');
    await openResponsively(brokenUrl);
  }

  process.stdout.write('\nScanning the same URL with Slice...\n');
  const exitCode = await runSlice(brokenUrl);

  if (exitCode !== 1) {
    throw new Error('The intentionally broken demo page was expected to exit with code 1');
  }

  const report = JSON.parse(await readFile(path.join(outDir, 'results.json'), 'utf8'));
  const boundaries = unique(report.boundaries.map((boundary) => boundary.boundary)).sort(
    (a, b) => a - b,
  );

  process.stdout.write(
    '\nVisual correlation\n' +
      '  Same URL:     ' +
      brokenUrl +
      '\n' +
      '  Failing at:   ' +
      report.viewports
        .filter((viewport) => viewport.status === 'fail')
        .map((viewport) => viewport.width + 'px')
        .join(', ') +
      '\n' +
      '  Passing at:   ' +
      report.viewports
        .filter((viewport) => viewport.status === 'pass')
        .map((viewport) => viewport.width + 'px')
        .join(', ') +
      '\n' +
      '  Boundary:     ' +
      boundaries.map((boundary) => boundary + 'px').join(', ') +
      '\n' +
      '  Slice report: .slice/demo-responsively/results.json\n\n' +
      'In Responsively, compare a narrow preview with a 768px+ preview.\n' +
      'The pricing row should visibly run past the right edge below the reported boundary.\n\n' +
      'Fixed comparison:\n' +
      '  ' +
      fixedUrl +
      '\n',
  );

  if (shouldExitAfterScan) {
    await closeDemoServer(server);
  } else {
    process.stdout.write(
      '\nThe demo server stays alive so Responsively can keep rendering it.\n' +
        'Press Ctrl-C when finished.\n',
    );

    await new Promise((resolve) => {
      const stop = async () => {
        process.removeListener('SIGINT', stop);
        process.removeListener('SIGTERM', stop);
        await closeDemoServer(server);
        resolve();
      };

      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
    });
  }
} catch (error) {
  await closeDemoServer(server);
  throw error;
}
