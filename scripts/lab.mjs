import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = path.join(root, 'test', 'fixtures');
const cliPath = path.join(root, 'dist', 'cli.mjs');

function startServer() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (request, response) => {
      const fixture = path.basename(request.url ?? '/clean.html');

      try {
        const html = await readFile(path.join(fixturesDir, fixture));
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(html);
      } catch {
        response.writeHead(404);
        response.end('Not found');
      }
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        reject(new Error('Lab fixture server did not bind'));
        return;
      }

      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function runCli(url, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cliPath, url, ...args], {
      cwd: root,
      env: process.env,
      stdio: 'inherit',
    });

    child.on('close', (code) => resolve(code));
  });
}

async function runScenario(baseUrl, scenario) {
  const out = await mkdtemp(path.join(tmpdir(), 'slice-lab-'));

  try {
    process.stdout.write(`\n=== ${scenario.name} ===\n`);
    const code = await runCli(`${baseUrl}/${scenario.fixture}`, [...scenario.args, '--out', out]);

    if (code !== scenario.expectedExit) {
      throw new Error(
        `${scenario.name}: expected exit ${scenario.expectedExit}, received ${String(code)}`,
      );
    }

    const report = JSON.parse(await readFile(path.join(out, 'results.json'), 'utf8'));
    scenario.assert(report);
  } finally {
    await rm(out, { recursive: true, force: true });
  }
}

const scenarios = [
  {
    name: 'Clean page passes',
    fixture: 'clean.html',
    args: ['--widths', '320,390', '--wait', '0', '--no-boundary'],
    expectedExit: 0,
    assert(report) {
      if (report.summary.failed !== 0 || report.summary.totalIssues !== 0) {
        throw new Error('Clean fixture unexpectedly reported overflow');
      }
    },
  },
  {
    name: 'Fixed-width overflow is detected',
    fixture: 'fixed-width.html',
    args: ['--widths', '320', '--wait', '0', '--no-boundary'],
    expectedExit: 1,
    assert(report) {
      if (report.summary.failed !== 1 || report.summary.totalIssues < 1) {
        throw new Error('Fixed-width fixture did not report the expected overflow');
      }
    },
  },
  {
    name: 'Exact breakpoint is found',
    fixture: 'boundary.html',
    args: ['--widths', '700,720', '--wait', '0'],
    expectedExit: 1,
    assert(report) {
      if (report.boundaries[0]?.boundary !== 712) {
        throw new Error(
          `Boundary fixture expected 712px, received ${String(report.boundaries[0]?.boundary)}`,
        );
      }
    },
  },
];

const { server, baseUrl } = await startServer();

try {
  for (const scenario of scenarios) {
    await runScenario(baseUrl, scenario);
  }

  process.stdout.write('\nSlice lab PASS\n');
} finally {
  await closeServer(server);
}
